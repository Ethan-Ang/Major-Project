<?php
require_once "db.php";
require_once "auth.php"; // shared getBearerToken() — single source of truth

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["message" => "Method not allowed."]);
    exit;
}

$token = getBearerToken();

if ($token) {
    try {
        $stmt = $pdo->prepare("DELETE FROM admin_tokens WHERE token = ?");
        $stmt->execute([$token]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["message" => "Logout failed."]);
        exit;
    }
}

echo json_encode(["message" => "Logout successful."]);
?>