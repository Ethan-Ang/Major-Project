<?php
require_once "db.php";

function getBearerToken() {
    $headers = getallheaders();

    $authHeader = $headers["Authorization"] ?? $headers["authorization"] ?? "";

    if (!$authHeader && isset($_SERVER["HTTP_AUTHORIZATION"])) {
        $authHeader = $_SERVER["HTTP_AUTHORIZATION"];
    }

    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        return $matches[1];
    }

    return null;
}

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    http_response_code(405);
    echo json_encode(["message" => "Method not allowed."]);
    exit;
}

$token = getBearerToken();

if (!$token) {
    http_response_code(401);
    echo json_encode(["message" => "No token provided."]);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT admins.id, admins.username, admin_tokens.expires_at
        FROM admin_tokens
        INNER JOIN admins ON admin_tokens.admin_id = admins.id
        WHERE admin_tokens.token = ?
        LIMIT 1
    ");

    $stmt->execute([$token]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$admin) {
        http_response_code(401);
        echo json_encode(["message" => "Invalid token."]);
        exit;
    }

    if (strtotime($admin["expires_at"]) < time()) {
        $stmt = $pdo->prepare("DELETE FROM admin_tokens WHERE token = ?");
        $stmt->execute([$token]);

        http_response_code(401);
        echo json_encode(["message" => "Token expired."]);
        exit;
    }

    echo json_encode([
        "admin" => [
            "id" => strval($admin["id"]),
            "username" => $admin["username"]
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "message" => "Failed to verify admin.",
        "error" => $e->getMessage()
    ]);
}
?>