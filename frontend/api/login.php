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

try {
    $stmt = $pdo->prepare("SELECT * FROM admins WHERE username = ?");
    $stmt->execute([$username]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$admin || !password_verify($password, $admin["password_hash"])) {
        http_response_code(401);
        echo json_encode(["message" => "Invalid username or password."]);
        exit;
    }

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