<?php
require_once "db.php";

/* ─────────────────────────────────────────────────────────────
   Enquiries API
   POST   (public) submit an enquiry  → save as New, then best-effort
                                         email notification (never blocks the save)
   GET    (admin)  list all enquiries newest-first
   GET    ?action=replied&id=N&token=T  (public, from the email link)
                   → one-tap "Mark as replied", no login; shows a confirmation page
   PATCH  (admin)  ?id=N  { "replied": 0|1 }  → update status
   DELETE (admin)  ?id=N

   Lead lifecycle: New (replied=0, needs a response) → Replied (replied=1).
   Shaped to match what frontend/admin/enquiries.js consumes.
   ───────────────────────────────────────────────────────────── */

function getJsonInput() {
    $raw  = file_get_contents("php://input");
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function decodeJsonField($value) {
    $decoded = json_decode($value ?? "[]", true);
    return is_array($decoded) ? $decoded : [];
}

function formatEnquiry($row) {
    return [
        "id"       => strval($row["id"]),
        "name"     => $row["name"],
        "company"  => $row["company"],
        "email"    => $row["email"],
        "phone"    => $row["phone"],
        "message"  => $row["message"],
        "products" => decodeJsonField($row["products"]),
        "date"     => $row["created_at"],
        "replied"  => intval($row["replied"]) === 1,
    ];
}

function siteBaseUrl() {
    if (defined("SITE_URL") && SITE_URL !== "") return rtrim(SITE_URL, "/");
    $scheme = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off") ? "https" : "http";
    $host   = $_SERVER["HTTP_HOST"] ?? "localhost";
    return $scheme . "://" . $host;
}

/* Best-effort email notification. Returns true/false; never throws. */
function notifySalesTeam($enq, $replyToken) {
    $to = defined("ENQUIRY_NOTIFY_TO") ? ENQUIRY_NOTIFY_TO : "";
    if ($to === "") {
        return false; // not configured (e.g. local dev) — silently skip
    }

    $products    = is_array($enq["products"]) ? implode(", ", $enq["products"]) : "";
    $repliedLink = siteBaseUrl() . "/api/enquiries.php?action=replied&id=" . $enq["id"] . "&token=" . $replyToken;
    $subject     = "New enquiry from " . $enq["name"]
                 . ($enq["company"] ? " (" . $enq["company"] . ")" : "");

    $lines = [
        "You have a new product enquiry from the Yee Lim website.",
        "",
        "Name:     " . $enq["name"],
        "Company:  " . ($enq["company"] ?: "-"),
        "Email:    " . $enq["email"],
        "Phone:    " . ($enq["phone"] ?: "-"),
        "Products: " . ($products ?: "-"),
        "",
        "Message:",
        ($enq["message"] ?: "(none)"),
        "",
        "-------------------------------------------",
        "Reply to this customer: just reply to this email, or write to " . $enq["email"],
        "Once you have responded, mark it done here so it clears from your New list:",
        $repliedLink,
        "-------------------------------------------",
    ];
    $body = implode("\n", $lines);

    $from    = defined("ENQUIRY_FROM") ? ENQUIRY_FROM : ("no-reply@" . ($_SERVER["SERVER_NAME"] ?? "localhost"));
    $headers = "From: Yee Lim Website <" . $from . ">\r\n"
             . "Reply-To: " . $enq["name"] . " <" . $enq["email"] . ">\r\n"
             . "Content-Type: text/plain; charset=UTF-8\r\n";

    return @mail($to, $subject, $body, $headers);
}

/* Small branded HTML page for the email "Mark as replied" link. */
function renderConfirmPage($title, $message, $ok = true) {
    header("Content-Type: text/html; charset=utf-8");
    $accent = $ok ? "#2e9e5b" : "#CC2929";
    $base   = siteBaseUrl();
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
       . '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
       . '<title>' . htmlspecialchars($title) . '</title>'
       . '<style>'
       . 'body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;'
       . 'background:#0e1116;color:#1b212b;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:1.5rem}'
       . '.card{background:#fff;border-radius:14px;max-width:440px;width:100%;padding:2.5rem 2rem;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4)}'
       . '.mark{width:64px;height:64px;border-radius:50%;background:' . $accent . '1a;color:' . $accent . ';'
       . 'display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;font-size:1.9rem;font-weight:700}'
       . 'h1{font-size:1.35rem;margin:0 0 .5rem}p{color:#6b7480;line-height:1.55;margin:0 0 1.5rem}'
       . 'a{display:inline-block;background:' . $accent . ';color:#fff;text-decoration:none;padding:.7rem 1.4rem;border-radius:8px;font-weight:600;font-size:.9rem}'
       . '</style></head><body><div class="card">'
       . '<div class="mark">' . ($ok ? "&#10003;" : "!") . '</div>'
       . '<h1>' . htmlspecialchars($title) . '</h1>'
       . '<p>' . htmlspecialchars($message) . '</p>'
       . '<a href="' . $base . '/admin/enquiries.html">Open the admin inbox</a>'
       . '</div></body></html>';
}

$method = $_SERVER["REQUEST_METHOD"];
$id     = $_GET["id"] ?? null;
$action = $_GET["action"] ?? null;

try {

    /* ─── Public one-tap "Mark as replied" from the notification email ─── */
    if ($method === "GET" && $action === "replied") {
        $token = $_GET["token"] ?? "";
        if (!$id || $token === "") {
            renderConfirmPage("Invalid link", "This link is missing information. Please open the admin inbox instead.", false);
            exit;
        }
        $stmt = $pdo->prepare("SELECT * FROM enquiries WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row || !hash_equals((string)($row["reply_token"] ?? ""), (string)$token)) {
            renderConfirmPage("Link not recognised", "This link is no longer valid. Please open the admin inbox to update the lead.", false);
            exit;
        }

        $upd = $pdo->prepare("UPDATE enquiries SET replied = 1 WHERE id = ?");
        $upd->execute([$id]);
        renderConfirmPage("Marked as replied", "Thanks. " . $row["name"] . "'s enquiry is now cleared from your New list.", true);
        exit;
    }

    /* ─── POST: public submit ─────────────────────────────────── */
    if ($method === "POST") {
        $data = getJsonInput();

        $name    = trim($data["name"] ?? "");
        $company = trim($data["company"] ?? "");
        $email   = trim($data["email"] ?? "");
        $phone   = trim($data["phone"] ?? "");
        $message = trim($data["message"] ?? "");
        $rawProducts = $data["products"] ?? [];
        $products = is_array($rawProducts) ? array_values(array_filter(array_map(function ($p) {
            return is_string($p) ? trim($p) : trim(strval($p));
        }, $rawProducts))) : [];

        if ($name === "" || $email === "") {
            http_response_code(400);
            echo json_encode(["message" => "Name and email are required."]);
            exit;
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(["message" => "Please enter a valid email address."]);
            exit;
        }

        $replyToken = bin2hex(random_bytes(32)); // 64 hex chars for the email link

        // 1. Save first — the system of record.
        $stmt = $pdo->prepare("
            INSERT INTO enquiries (name, company, email, phone, message, products, reply_token)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $name, $company, $email, $phone, $message, json_encode($products), $replyToken,
        ]);
        $newId = $pdo->lastInsertId();

        $stmt = $pdo->prepare("SELECT * FROM enquiries WHERE id = ?");
        $stmt->execute([$newId]);
        $enq = formatEnquiry($stmt->fetch(PDO::FETCH_ASSOC));

        // 2. Best-effort notification — must never affect the response/save.
        $emailed = false;
        try { $emailed = notifySalesTeam($enq, $replyToken); } catch (Throwable $e) { $emailed = false; }

        http_response_code(201);
        echo json_encode([
            "message"  => "Enquiry submitted successfully.",
            "id"       => $enq["id"],
            "notified" => $emailed,
        ]);
        exit;
    }

    /* ─── GET: admin list / single ────────────────────────────── */
    if ($method === "GET") {
        if ($id) {
            $stmt = $pdo->prepare("SELECT * FROM enquiries WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                http_response_code(404);
                echo json_encode(["message" => "Enquiry not found."]);
                exit;
            }
            echo json_encode(formatEnquiry($row));
            exit;
        }

        $stmt = $pdo->query("SELECT * FROM enquiries ORDER BY created_at DESC, id DESC");
        echo json_encode(array_map("formatEnquiry", $stmt->fetchAll(PDO::FETCH_ASSOC)));
        exit;
    }

    /* ─── PATCH: update replied status ────────────────────────── */
    if ($method === "PATCH") {
        if (!$id) {
            http_response_code(400);
            echo json_encode(["message" => "Enquiry ID is required."]);
            exit;
        }
        $data    = getJsonInput();
        $replied = !empty($data["replied"]) ? 1 : 0;

        $stmt = $pdo->prepare("UPDATE enquiries SET replied = ? WHERE id = ?");
        $stmt->execute([$replied, $id]);

        echo json_encode(["message" => "Updated.", "replied" => $replied === 1]);
        exit;
    }

    /* ─── DELETE ──────────────────────────────────────────────── */
    if ($method === "DELETE") {
        if (!$id) {
            http_response_code(400);
            echo json_encode(["message" => "Enquiry ID is required."]);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM enquiries WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["message" => "Enquiry deleted."]);
        exit;
    }

    http_response_code(405);
    echo json_encode(["message" => "Method not allowed."]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["message" => "Database error.", "error" => $e->getMessage()]);
}
?>
