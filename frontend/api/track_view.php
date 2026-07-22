<?php
require_once "db.php";

/* ─────────────────────────────────────────────────────────────
   Product-view tracker (analytics, Feature 2).
   POST { product_id, session }  → records one view, returns 204.
   Public and best-effort: it never returns data and never lets a
   failure affect the page. Guards:
     - valid, existing product only
     - per-IP rate cap (abuse guard, invisible to real users)
     - per-session+product+day dedupe (a refresh loop can't inflate)
     - skips logged-in admins (our own QA views must not count)
   ───────────────────────────────────────────────────────────── */

if ($_SERVER["REQUEST_METHOD"] !== "POST") { http_response_code(405); exit; }

// Don't count our own admin views (Authorization header present).
$hasAuth = !empty($_SERVER["HTTP_AUTHORIZATION"]);
if (!$hasAuth && function_exists("getallheaders")) {
    $h = getallheaders();
    if (!empty($h["Authorization"]) || !empty($h["authorization"])) $hasAuth = true;
}
if ($hasAuth) { http_response_code(204); exit; }

$raw  = file_get_contents("php://input");
$data = json_decode($raw, true);
$productId = is_array($data) ? intval($data["product_id"] ?? 0) : 0;
$session   = is_array($data) ? substr(preg_replace('/[^a-f0-9]/i', '', (string)($data["session"] ?? "")), 0, 64) : "";
if ($productId < 1) { http_response_code(204); exit; }

try {
    // Rate cap: max 60 view-pings per IP per minute.
    $bucket = "pv_" . ($_SERVER["REMOTE_ADDR"] ?? "0");
    if (ylRateRecentCount($bucket, 60) >= 60) { http_response_code(204); exit; }

    // Confirm the product exists (avoids junk rows for random ids).
    $chk = $pdo->prepare("SELECT 1 FROM products WHERE id = ? LIMIT 1");
    $chk->execute([$productId]);
    if (!$chk->fetchColumn()) { http_response_code(204); exit; }

    // Per session+product+day dedupe key, so refreshes don't inflate counts.
    $dayKey = $session !== "" ? hash("sha256", $session . "|" . $productId . "|" . date("Y-m-d")) : null;
    if ($dayKey !== null) {
        $dup = $pdo->prepare("SELECT 1 FROM product_views WHERE product_id = ? AND session_hash = ? AND viewed_at >= (NOW() - INTERVAL 1 DAY) LIMIT 1");
        $dup->execute([$productId, $dayKey]);
        if ($dup->fetchColumn()) { http_response_code(204); exit; }
    }

    $ins = $pdo->prepare("INSERT INTO product_views (product_id, session_hash) VALUES (?, ?)");
    $ins->execute([$productId, $dayKey]);
    ylRateAdd($bucket, 120);
    http_response_code(204);
} catch (Throwable $e) {
    error_log("track_view.php: " . $e->getMessage());
    http_response_code(204); // never surface tracking errors to the page
}
