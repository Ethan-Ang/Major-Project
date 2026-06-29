<?php
// Production error handling: never leak paths or stack traces to the client.
// Errors are still written to the server log so problems remain diagnosable.
ini_set("display_errors", "0");
ini_set("log_errors", "1");
error_reporting(E_ALL);

header("Content-Type: application/json");

require_once __DIR__ . "/config.php";

/* ─────────────────────────────────────────────────────────────
   Shared, file-based rate limiting (no extra dependencies).
   Mirrors the invisible per-IP limiter used for enquiries. Used by
   login.php (failed-login throttle) and advisor.php (LLM cost guard).
   Buckets live in the system temp dir, keyed by a hashed name.
   ───────────────────────────────────────────────────────────── */

function ylRateFile($bucket) {
    return sys_get_temp_dir() . "/yl_rl_" . md5((string)$bucket);
}

// Count hits for a bucket inside the window. Does NOT record a hit.
function ylRateRecentCount($bucket, $windowSeconds) {
    try {
        $file = ylRateFile($bucket);
        if (!is_file($file)) return 0;
        $now  = time();
        $hits = json_decode((string) @file_get_contents($file), true);
        if (!is_array($hits)) return 0;
        $hits = array_filter($hits, function ($t) use ($now, $windowSeconds) {
            return is_numeric($t) && ($now - $t) < $windowSeconds;
        });
        return count($hits);
    } catch (Throwable $e) {
        return 0; // a limiter failure must never block a legitimate request
    }
}

// Record one hit for a bucket, pruning anything older than $keepSeconds.
function ylRateAdd($bucket, $keepSeconds = 3600) {
    try {
        $file = ylRateFile($bucket);
        $now  = time();
        $hits = is_file($file) ? json_decode((string) @file_get_contents($file), true) : [];
        if (!is_array($hits)) $hits = [];
        $hits = array_values(array_filter($hits, function ($t) use ($now, $keepSeconds) {
            return is_numeric($t) && ($now - $t) < $keepSeconds;
        }));
        $hits[] = $now;
        @file_put_contents($file, json_encode($hits), LOCK_EX);
    } catch (Throwable $e) {
        // ignore: never let the limiter break the request
    }
}

// Clear a bucket, e.g. after a successful login so good users are not throttled.
function ylRateClear($bucket) {
    try { @unlink(ylRateFile($bucket)); } catch (Throwable $e) {}
}

// Seconds until the bucket's count drops below $max (when a lockout clears).
// Returns 0 if it is not currently at/over the limit. Computed from the stored
// timestamps so it never over- or under-states the real remaining time: the
// (n - max)-th oldest hit must age out of the window for the count to fall to
// max - 1, so the lockout clears at that hit's time + window.
function ylRateRetryAfter($bucket, $windowSeconds, $max) {
    try {
        $file = ylRateFile($bucket);
        if (!is_file($file)) return 0;
        $now  = time();
        $hits = json_decode((string) @file_get_contents($file), true);
        if (!is_array($hits)) return 0;
        $hits = array_values(array_filter($hits, function ($t) use ($now, $windowSeconds) {
            return is_numeric($t) && ($now - $t) < $windowSeconds;
        }));
        $n = count($hits);
        if ($n < $max) return 0;
        sort($hits, SORT_NUMERIC);
        $clearsAt  = $hits[$n - $max] + $windowSeconds;
        $remaining = $clearsAt - $now;
        return $remaining > 0 ? (int) ceil($remaining) : 0;
    } catch (Throwable $e) {
        return 0;
    }
}

try {
    $port = defined("DB_PORT") ? DB_PORT : 3306;
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";port=" . $port . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS
    );

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "message" => "Something went wrong on our end. Please try again shortly."
    ]);
    exit;
}
?>
