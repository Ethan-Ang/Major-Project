<?php
header("Content-Type: application/json");

require_once __DIR__ . "/config.php";

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
        "message" => "Database connection failed"
    ]);
    exit;
}
?>
