<?php
// Shared admin authentication for the API.
//
// Reuses the token system issued by login.php (the admin_tokens table) and
// validates it the same way me.php does. Include this in any endpoint that
// must be admin-only, then call requireAdmin($pdo) at the top of the
// protected branch. On any failure it sends a 401 JSON response and exits,
// so the handler below it never runs without a valid session.

if (!function_exists("getBearerToken")) {
    function getBearerToken() {
        $authHeader = "";
        if (function_exists("getallheaders")) {
            $headers    = getallheaders();
            $authHeader = $headers["Authorization"] ?? $headers["authorization"] ?? "";
        }
        if (!$authHeader && isset($_SERVER["HTTP_AUTHORIZATION"])) {
            $authHeader = $_SERVER["HTTP_AUTHORIZATION"];
        }
        if (preg_match('/Bearer\s+(\S+)/', $authHeader, $matches)) {
            return $matches[1];
        }
        return null;
    }
}

// Validates the Bearer token against admin_tokens + admins (incl. expiry).
// Returns the admin row on success; otherwise responds 401 and exits.
function requireAdmin($pdo) {
    $token = getBearerToken();

    if (!$token) {
        http_response_code(401);
        echo json_encode(["message" => "Authentication required."]);
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
    } catch (PDOException $e) {
        error_log("auth.php requireAdmin: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["message" => "Something went wrong. Please try again later."]);
        exit;
    }

    if (!$admin) {
        http_response_code(401);
        echo json_encode(["message" => "Invalid or expired session. Please sign in again."]);
        exit;
    }

    if (strtotime($admin["expires_at"]) < time()) {
        $del = $pdo->prepare("DELETE FROM admin_tokens WHERE token = ?");
        $del->execute([$token]);
        http_response_code(401);
        echo json_encode(["message" => "Invalid or expired session. Please sign in again."]);
        exit;
    }

    return $admin;
}
