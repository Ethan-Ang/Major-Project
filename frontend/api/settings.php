<?php
// api/settings.php  (CLIENT-006)
// Editable site contact details.
//   GET                 public  -> whitelisted display values (email, WhatsApp, phone, address)
//   GET ?scope=admin    admin   -> all keys incl. server-only enquiry_recipient
//   PUT|PATCH           admin   -> update validated values
//
// No secrets ever live here; DB creds / SMTP / tokens stay in config.php.

require_once "db.php";
require_once "auth.php";

$method = $_SERVER["REQUEST_METHOD"];

// Public keys are returned by the unauthenticated GET. enquiry_recipient is
// admin-only and is NEVER exposed publicly (approved decision PRIV/CLIENT-006).
$PUBLIC_KEYS = ["contact_email", "whatsapp_number", "phone_display", "address_line"];
$ALL_KEYS    = array_merge($PUBLIC_KEYS, ["enquiry_recipient"]);

function getJsonInput() {
    $data = json_decode(file_get_contents("php://input"), true);
    return is_array($data) ? $data : [];
}

function settingsFetch($pdo, array $keys) {
    if (!$keys) return [];
    $in   = implode(",", array_fill(0, count($keys), "?"));
    $stmt = $pdo->prepare("SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ($in)");
    $stmt->execute(array_values($keys));
    $out = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) $out[$r["setting_key"]] = $r["setting_value"];
    return $out;
}

// Returns an error string, or null when valid. Empty is allowed for the optional
// email fields (falls back to the code/config default); WhatsApp must be digits.
function settingsValidate($key, $value) {
    $value = trim($value);
    switch ($key) {
        case "contact_email":
        case "enquiry_recipient":
            if ($value !== "" && !filter_var($value, FILTER_VALIDATE_EMAIL)) return "Enter a valid email address.";
            return null;
        case "whatsapp_number":
            if (!preg_match('/^[0-9]{8,15}$/', $value)) return "WhatsApp number must be 8-15 digits including the country code, with no spaces or +.";
            return null;
        case "phone_display":
            if ($value === "") return "A phone number is required.";
            if (mb_strlen($value) > 40) return "Phone number is too long.";
            return null;
        case "address_line":
            if ($value === "") return "An address is required.";
            if (mb_strlen($value) > 300) return "Address is too long.";
            return null;
    }
    return "Unknown setting.";
}

// ── GET ─────────────────────────────────────────────────────────────────────
if ($method === "GET") {
    $scope = $_GET["scope"] ?? "public";
    if ($scope === "admin") {
        requireAdmin($pdo);
        echo json_encode(settingsFetch($pdo, $ALL_KEYS));
        exit;
    }
    echo json_encode(settingsFetch($pdo, $PUBLIC_KEYS));
    exit;
}

// ── PUT / PATCH: update (admin) ─────────────────────────────────────────────
if ($method === "PUT" || $method === "PATCH") {
    $admin = requireAdmin($pdo);
    $data  = getJsonInput();

    $updates = [];
    foreach ($data as $k => $v) {
        if (!in_array($k, $ALL_KEYS, true)) continue;     // ignore unknown keys
        if (!is_string($v)) {
            http_response_code(400);
            echo json_encode(["message" => "Invalid value for $k.", "key" => $k]);
            exit;
        }
        $err = settingsValidate($k, $v);
        if ($err !== null) {
            http_response_code(400);
            echo json_encode(["message" => $err, "key" => $k]);
            exit;
        }
        $updates[$k] = trim($v);
    }

    if (!$updates) {
        http_response_code(400);
        echo json_encode(["message" => "No valid settings to update."]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO site_settings (setting_key, setting_value, updated_by)
                               VALUES (?, ?, ?)
                               ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)");
        foreach ($updates as $k => $v) {
            $stmt->execute([$k, $v, $admin["id"] ?? null]);
        }
    } catch (PDOException $e) {
        error_log("settings.php PATCH: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["message" => "Something went wrong. Please try again later."]);
        exit;
    }

    echo json_encode(settingsFetch($pdo, $ALL_KEYS));
    exit;
}

http_response_code(405);
echo json_encode(["message" => "Method not allowed."]);
