<?php
/**
 * Yee Lim Product Advisor HTTP adapter.
 *
 * Request:  POST JSON { "language": "en|zh", "messages": [...] }
 * Response: structured, plain-text catalogue guidance from advisor_logic.php.
 *
 * advisor_logic.php answers every commercial, safety and document question by
 * itself. When a model is configured in config.php, advisor_ai.php is allowed to
 * rephrase only the remaining product questions, and only after its output has
 * been validated back against the catalogue. Nothing in this file talks to the
 * network; it wires the two together and handles HTTP.
 */

ini_set("display_errors", "0");
ini_set("log_errors", "1");
error_reporting(E_ALL);

require_once __DIR__ . "/advisor_logic.php";

function advisorEmitJsonResponse(array $envelope): void
{
    $status = (int) ($envelope["status"] ?? 500);
    $headers = is_array($envelope["headers"] ?? null)
        ? $envelope["headers"]
        : [];
    $body = is_array($envelope["body"] ?? null)
        ? $envelope["body"]
        : advisorBuildHttpErrorResponse("server_error", "en", 500)["body"];

    http_response_code($status);
    header("Content-Type: application/json; charset=utf-8");
    foreach ($headers as $name => $value) {
        if (!is_string($name)
            || preg_match('/^[A-Za-z0-9-]+$/', $name) !== 1
            || (!is_string($value) && !is_numeric($value))) {
            continue;
        }
        $value = str_replace(["\r", "\n"], "", (string) $value);
        header($name . ": " . $value);
    }

    $encoded = json_encode(
        $body,
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
    );
    if (!is_string($encoded)) {
        http_response_code(500);
        $fallback = advisorBuildHttpErrorResponse("server_error", "en", 500)["body"];
        $encoded = json_encode(
            $fallback,
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
        );
    }
    echo is_string($encoded) ? $encoded : '{"message":"Product Advisor unavailable."}';
}

function advisorRateFile(string $bucket): string
{
    return sys_get_temp_dir() . "/yl_rl_" . md5($bucket);
}

function advisorRateConsume(string $bucket, int $windowSeconds, int $maximum): array
{
    $handle = @fopen(advisorRateFile($bucket), "c+");
    if ($handle === false) {
        return ["allowed" => true, "retryAfter" => 0];
    }
    $locked = false;
    try {
        if (!flock($handle, LOCK_EX)) {
            return ["allowed" => true, "retryAfter" => 0];
        }
        $locked = true;
        rewind($handle);
        $hits = json_decode((string) stream_get_contents($handle), true);
        if (!is_array($hits)) {
            $hits = [];
        }
        $now = time();
        $hits = array_values(array_filter($hits, static function ($timestamp) use ($now, $windowSeconds) {
            return is_numeric($timestamp) && ($now - (int) $timestamp) < $windowSeconds;
        }));
        sort($hits, SORT_NUMERIC);

        if (count($hits) >= $maximum) {
            $allowed = false;
            $retryAfter = max(1, (int) $hits[count($hits) - $maximum] + $windowSeconds - $now);
        } else {
            $allowed = true;
            $retryAfter = 0;
            $hits[] = $now;
        }

        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, json_encode($hits));
        fflush($handle);
        return ["allowed" => $allowed, "retryAfter" => $retryAfter];
    } catch (Throwable $rateError) {
        return ["allowed" => true, "retryAfter" => 0];
    } finally {
        if ($locked) {
            flock($handle, LOCK_UN);
        }
        fclose($handle);
    }
}

if (defined("ADVISOR_LIBRARY_ONLY") && ADVISOR_LIBRARY_ONLY) {
    return;
}

$method = (string) ($_SERVER["REQUEST_METHOD"] ?? "");
$rawBody = file_get_contents("php://input", false, null, 0, 16 * 1024 + 1);
if (!is_string($rawBody)) {
    $rawBody = "";
}
$parsed = advisorParseHttpRequest($method, $rawBody);

if (empty($parsed["ok"])) {
    advisorEmitJsonResponse(advisorBuildHttpErrorResponse(
        (string) ($parsed["error"]["code"] ?? "invalid_request"),
        (string) ($parsed["language"] ?? "en"),
        (int) ($parsed["status"] ?? 400),
        is_array($parsed["headers"] ?? null) ? $parsed["headers"] : []
    ));
    exit;
}

$rateBucket = "advisor_" . ($_SERVER["REMOTE_ADDR"] ?? "0");
$rateResult = advisorRateConsume($rateBucket, 600, 30);
if (empty($rateResult["allowed"])) {
    advisorEmitJsonResponse(advisorBuildHttpErrorResponse(
        "rate_limited",
        $parsed["language"],
        429,
        ["Retry-After" => (string) max(1, (int) ($rateResult["retryAfter"] ?? 1))]
    ));
    exit;
}

require_once __DIR__ . "/config.php";

try {
    $databasePort = defined("DB_PORT") ? DB_PORT : 3306;
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";port=" . $databasePort . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $databaseError) {
    error_log("Product Advisor database connection failed.");
    advisorEmitJsonResponse(advisorBuildHttpErrorResponse(
        "server_error",
        $parsed["language"],
        503
    ));
    exit;
}

$products = [];
$documentFlags = [];
try {
    $productStatement = $pdo->query(
        "SELECT id, name, brand, category, short_description, usage_text,
                industries, surfaces, features, status
         FROM products"
    );
    $products = $productStatement->fetchAll(PDO::FETCH_ASSOC);

    try {
        $documentStatement = $pdo->query(
            "SELECT product_id, document_type
             FROM product_documents
             WHERE document_type IN ('SDS', 'TDS')"
        );
        foreach ($documentStatement->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $productId = (int) ($row["product_id"] ?? 0);
            $documentType = strtoupper((string) ($row["document_type"] ?? ""));
            if ($productId < 1 || ($documentType !== "SDS" && $documentType !== "TDS")) {
                continue;
            }
            if (!isset($documentFlags[$productId])) {
                $documentFlags[$productId] = ["sds" => false, "tds" => false];
            }
            $documentFlags[$productId][strtolower($documentType)] = true;
        }
    } catch (Throwable $documentError) {
        $documentFlags = [];
    }
} catch (Throwable $catalogueError) {
    error_log("Product Advisor catalogue read failed.");
    advisorEmitJsonResponse(advisorBuildHttpErrorResponse(
        "server_error",
        $parsed["language"],
        500
    ));
    exit;
}

// Loaded only once the request is known to be valid and the catalogue is in
// hand. Returns a no-op when config.php carries no key, which leaves the
// Advisor purely deterministic.
require_once __DIR__ . "/advisor_ai.php";
$assistant = advisorAiStatus()["enabled"] ? advisorAiRunner() : null;

try {
    $body = advisorBuildResponse(
        $parsed["messages"],
        $parsed["language"],
        $products,
        $documentFlags,
        $assistant
    );
    advisorEmitJsonResponse(["status" => 200, "headers" => [], "body" => $body]);
} catch (Throwable $responseError) {
    error_log("Product Advisor response construction failed.");
    advisorEmitJsonResponse(advisorBuildHttpErrorResponse(
        "server_error",
        $parsed["language"],
        500
    ));
}
?>
