<?php
require_once "db.php";

function getJsonInput() {
    $raw = file_get_contents("php://input");
    $data = json_decode($raw, true);

    return is_array($data) ? $data : [];
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["message" => "Method not allowed."]);
    exit;
}

$data = getJsonInput();

$username = trim($data["username"] ?? "");
$password = $data["password"] ?? "";

if ($username === "" || $password === "") {
    http_response_code(400);
    echo json_encode(["message" => "Username and password are required."]);
    exit;
}

// Brute-force guard: throttle by client IP. Only FAILED attempts are recorded,
// and a successful login clears the bucket, so legitimate users are never locked
// out. 10 failures within 15 minutes returns 429.
$rlBucket  = "login_" . ($_SERVER["REMOTE_ADDR"] ?? "0");
$rlMax     = 10;
$rlWindow  = 15 * 60;
if (ylRateRecentCount($rlBucket, $rlWindow) >= $rlMax) {
    $retryAfter = ylRateRetryAfter($rlBucket, $rlWindow, $rlMax);
    if ($retryAfter < 1) $retryAfter = 1; // always report at least a second
    // Phrase: round UP to the next minute (so we never invite a retry before the
    // lockout has actually cleared); show seconds when under a minute.
    if ($retryAfter >= 60) {
        $mins   = (int) ceil($retryAfter / 60);
        $phrase = "Please try again in about " . $mins . " minute" . ($mins === 1 ? "" : "s") . ".";
    } else {
        $phrase = "Please try again in about " . $retryAfter . " second" . ($retryAfter === 1 ? "" : "s") . ".";
    }
    header("Retry-After: " . $retryAfter); // exact seconds, for clients
    http_response_code(429);
    echo json_encode([
        "message"    => "Too many login attempts. " . $phrase,
        "retryAfter" => $retryAfter,
    ]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT * FROM admins WHERE username = ?");
    $stmt->execute([$username]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$admin || !password_verify($password, $admin["password_hash"])) {
        ylRateAdd($rlBucket); // count only failed attempts toward the limit
        http_response_code(401);
        echo json_encode(["message" => "Invalid username or password."]);
        exit;
    }

    ylRateClear($rlBucket); // good login: reset the throttle for this IP

    // Opportunistic GC: expired tokens are already rejected at auth time, but
    // without this they linger in the table forever. Clearing them on login (a
    // rare event) keeps admin_tokens tidy. Best-effort: never block the login.
    try { $pdo->prepare("DELETE FROM admin_tokens WHERE expires_at < NOW()")->execute(); } catch (Throwable $e) {}

    $token = bin2hex(random_bytes(32));
    $expiresAt = date("Y-m-d H:i:s", time() + (24 * 60 * 60));

    $stmt = $pdo->prepare("
        INSERT INTO admin_tokens (admin_id, token, expires_at)
        VALUES (?, ?, ?)
    ");

    $stmt->execute([
        $admin["id"],
        $token,
        $expiresAt
    ]);

    echo json_encode([
        "message" => "Login successful.",
        "token" => $token,
        "admin" => [
            "id" => strval($admin["id"]),
            "username" => $admin["username"]
        ]
    ]);
} catch (PDOException $e) {
    error_log("login.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["message" => "Something went wrong. Please try again later."]);
}
?>