<?php
require_once "db.php";
require_once "auth.php";

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
        "id"        => strval($row["id"]),
        "reference" => enquiryReference($row["id"], $row["created_at"] ?? null),
        "name"      => $row["name"],
        "company"   => $row["company"],
        "email"     => $row["email"],
        "phone"     => $row["phone"],
        "message"   => $row["message"],
        "products"  => decodeJsonField($row["products"]),
        "date"      => $row["created_at"],
        "replied"   => intval($row["replied"]) === 1,
    ];
}

/* Human-friendly reference, derived from the row id + creation year.
   Stable and needs no schema change, e.g. YL-2026-0042. */
function enquiryReference($id, $createdAt = null) {
    $year = $createdAt ? date("Y", strtotime($createdAt)) : date("Y");
    return "YL-" . $year . "-" . str_pad((string)$id, 4, "0", STR_PAD_LEFT);
}

function siteBaseUrl() {
    if (defined("SITE_URL") && SITE_URL !== "") return rtrim(SITE_URL, "/");
    $scheme = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off") ? "https" : "http";
    $host   = $_SERVER["HTTP_HOST"] ?? "localhost";
    return $scheme . "://" . $host;
}

/* Strip CR/LF so user-supplied values can't inject extra mail headers. */
function mailHeaderSafe($s) {
    return trim(str_replace(["\r", "\n", "%0a", "%0d", "%0A", "%0D"], "", (string)$s));
}

/* Shared best-effort sender. Returns true/false; never throws.
   Sets a matching From and an envelope sender (-f) so the message aligns
   with SPF for the site's own domain — the main lever for staying out of
   spam. For full deliverability also publish SPF + DKIM DNS for that domain
   (see config.example.php). */
function ylSendMail($to, $subject, $body, $replyName = "", $replyEmail = "") {
    $fromAddr = (defined("ENQUIRY_FROM") && ENQUIRY_FROM !== "")
        ? ENQUIRY_FROM
        : ("no-reply@" . ($_SERVER["SERVER_NAME"] ?? "localhost"));
    $fromAddr = mailHeaderSafe($fromAddr);

    $headers  = "From: Yee Lim Adhesives <" . $fromAddr . ">\r\n";
    if (mailHeaderSafe($replyEmail) !== "") {
        $headers .= "Reply-To: " . mailHeaderSafe($replyName) . " <" . mailHeaderSafe($replyEmail) . ">\r\n";
    }
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

    // The 5th arg sets the envelope-from (Return-Path), improving SPF
    // alignment. Some hosts disable it; the @ swallows any warning and the
    // message still sends with the default envelope sender.
    return @mail(mailHeaderSafe($to), mailHeaderSafe($subject), $body, $headers, "-f" . $fromAddr);
}

/* The enquiry-notification recipient: the Site Settings value when an admin has
   set one, else the ENQUIRY_NOTIFY_TO constant from config.php. Tolerates the
   site_settings table not existing yet (falls back to the constant). */
function enquiryRecipient() {
    global $pdo;
    $fallback = defined("ENQUIRY_NOTIFY_TO") ? ENQUIRY_NOTIFY_TO : "";
    try {
        $stmt = $pdo->prepare("SELECT setting_value FROM site_settings WHERE setting_key = 'enquiry_recipient' LIMIT 1");
        $stmt->execute();
        $val = trim((string) $stmt->fetchColumn());
        return $val !== "" ? $val : $fallback;
    } catch (Throwable $e) {
        return $fallback;
    }
}

/* One canonical phrase for "this enquiry has no products attached", used by
   both emails. Attaching products is OPTIONAL, so this is a normal, complete
   enquiry — the wording says so plainly rather than leaving a bare "-" that
   reads like a form that failed to submit properly. */
function noProductsLabel() {
    return "None - General enquiry";
}

/* Best-effort notification to the sales team. Returns true/false; never throws. */
function notifySalesTeam($enq, $replyToken, $reference) {
    $to = enquiryRecipient();
    if ($to === "") {
        return false; // not configured (e.g. local dev) — silently skip
    }

    $hasProducts = is_array($enq["products"]) && count($enq["products"]) > 0;
    $products    = $hasProducts ? implode(", ", $enq["products"]) : noProductsLabel();
    $repliedLink = siteBaseUrl() . "/api/enquiries.php?action=replied&id=" . $enq["id"] . "&token=" . $replyToken;
    $subject     = "New enquiry " . $reference . " from " . $enq["name"]
                 . ($enq["company"] ? " (" . $enq["company"] . ")" : "");

    $lines = [
        "You have a new enquiry from the Yee Lim website.",
        "",
        "Reference: " . $reference,
        "",
        "Name:     " . $enq["name"],
        "Company:  " . ($enq["company"] ?: "-"),
        "Email:    " . $enq["email"],
        "Phone:    " . ($enq["phone"] ?: "-"),
        "Selected products: " . $products,
        "",
        "Message:",
        ($enq["message"] ?: "(none)"),
        "",
        "To reply: just reply to this email, or write to " . $enq["email"] . ".",
        "",
        "===========================================",
        "DID YOU REPLY? Click here to mark this enquiry as done",
        "so it clears from your New list in the admin inbox:",
        "",
        "  >>  " . $repliedLink,
        "===========================================",
    ];

    // Reply-To the customer so a one-tap reply reaches them directly.
    return ylSendMail($to, $subject, implode("\n", $lines), $enq["name"], $enq["email"]);
}

/* Best-effort acknowledgement to the customer, with their reference and the
   products they asked about. Replies route to the sales inbox (when set), so
   a customer reply still lands with the team. Returns true/false; never throws. */
function confirmToCustomer($enq, $reference) {
    $to = trim($enq["email"] ?? "");
    if ($to === "") return false;

    $hasProducts = is_array($enq["products"]) && count($enq["products"]) > 0;

    $salesInbox = enquiryRecipient();

    $subject = "We received your enquiry (" . $reference . ") - Yee Lim Adhesives";
    $lines = [
        "Hi " . $enq["name"] . ",",
        "",
        "Thank you for your enquiry. Our team will review it and get back to you",
        "within 1-2 business days.",
        "",
        "Your reference: " . $reference,
        "",
        // A general enquiry is a complete enquiry: no empty heading, no dangling
        // list, and nothing suggesting the customer left something out.
        ($hasProducts
            ? "Products you asked about:\n  - " . implode("\n  - ", $enq["products"])
            : "You did not attach any products, so we have logged this as a general enquiry."),
        "",
        ($enq["message"] ? "Your message:\n" . $enq["message"] . "\n" : ""),
        "If you need to add anything, just reply to this email.",
        "",
        "Yee Lim Adhesives Industries",
    ];

    return ylSendMail($to, $subject, implode("\n", $lines), "Yee Lim Adhesives", $salesInbox);
}

/* Lightweight, file-based rate limit. Invisible to real users (no CAPTCHA):
   allows $max submissions per $windowSeconds per client IP, then returns 429
   with the real remaining time (same helpers + phrasing as the login limiter).
   The shared helpers swallow their own failures, so the limiter can never block
   a legitimate enquiry. */
function enforceEnquiryRateLimit($max = 5, $windowSeconds = 600) {
    $bucket = "enq_" . ($_SERVER["REMOTE_ADDR"] ?? "0");
    if (ylRateRecentCount($bucket, $windowSeconds) >= $max) {
        $retryAfter = ylRateRetryAfter($bucket, $windowSeconds, $max);
        if ($retryAfter < 1) $retryAfter = 1;
        // Round UP to the next minute so we never invite a retry before the
        // window clears; show seconds when under a minute.
        if ($retryAfter >= 60) {
            $mins   = (int) ceil($retryAfter / 60);
            $phrase = "Please try again in about " . $mins . " minute" . ($mins === 1 ? "" : "s") . ".";
        } else {
            $phrase = "Please try again in about " . $retryAfter . " second" . ($retryAfter === 1 ? "" : "s") . ".";
        }
        header("Retry-After: " . $retryAfter);
        http_response_code(429);
        echo json_encode([
            "message"    => "Too many enquiries in a short time. " . $phrase,
            "retryAfter" => $retryAfter,
        ]);
        exit;
    }
    ylRateAdd($bucket, $windowSeconds);
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
            http_response_code(400); // malformed link (missing id or token)
            renderConfirmPage("Invalid link", "This link is missing information. Please open the admin inbox instead.", false);
            exit;
        }
        $stmt = $pdo->prepare("SELECT * FROM enquiries WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row || !hash_equals((string)($row["reply_token"] ?? ""), (string)$token)) {
            http_response_code(404); // unknown id or bad/unrecognised token
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

        // Spam guard 1 — honeypot: a hidden field real users never see or fill.
        // If it carries any value, treat the sender as a bot: report success
        // (so the bot moves on) but save nothing and email no one.
        if (trim($data["website"] ?? "") !== "") {
            http_response_code(201);
            echo json_encode(["message" => "Enquiry submitted successfully."]);
            exit;
        }

        // Spam guard 2 — per-IP rate limit. Emits 429 and exits if exceeded.
        // Invisible to real users (no CAPTCHA).
        enforceEnquiryRateLimit();

        $name    = trim($data["name"] ?? "");
        $company = trim($data["company"] ?? "");
        $email   = trim($data["email"] ?? "");
        $phone   = trim($data["phone"] ?? "");
        $message = trim($data["message"] ?? "");
        // Attached products are OPTIONAL. An empty array, a missing key and a
        // non-array all normalise to [] and are accepted as-is: a general
        // enquiry is a valid enquiry. Nothing here substitutes a placeholder
        // name or a fake product id to fill the gap — downstream consumers
        // (emails, admin inbox, CSV) each render the empty case explicitly.
        $rawProducts = $data["products"] ?? [];
        $products = is_array($rawProducts) ? array_values(array_filter(array_map(function ($p) {
            return is_string($p) ? trim($p) : trim(strval($p));
        }, $rawProducts))) : [];

        // Genuine customer requirements are unchanged and NOT relaxed.
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
        // Length caps: reject obviously abusive payloads before they hit the DB.
        if (mb_strlen($name) > 200 || mb_strlen($company) > 200
            || mb_strlen($email) > 254 || mb_strlen($phone) > 50
            || mb_strlen($message) > 5000 || count($products) > 100) {
            http_response_code(400);
            echo json_encode(["message" => "One or more fields are too long. Please shorten your enquiry and try again."]);
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

        // 2. Best-effort emails — must never affect the response/save.
        $emailed   = false;
        $confirmed = false;
        try { $emailed   = notifySalesTeam($enq, $replyToken, $enq["reference"]); } catch (Throwable $e) { $emailed = false; }
        try { $confirmed = confirmToCustomer($enq, $enq["reference"]); }            catch (Throwable $e) { $confirmed = false; }

        http_response_code(201);
        echo json_encode([
            "message"   => "Enquiry submitted successfully.",
            "id"        => $enq["id"],
            "reference" => $enq["reference"],
            "notified"  => $emailed,
            "confirmed" => $confirmed,
        ]);
        exit;
    }

    /* ─── GET: admin list / single (admin only) ───────────────── */
    if ($method === "GET") {
        requireAdmin($pdo);
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

    /* ─── PATCH: update replied status (admin only) ───────────── */
    if ($method === "PATCH") {
        requireAdmin($pdo);
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

    /* ─── DELETE (admin only) ─────────────────────────────────── */
    if ($method === "DELETE") {
        requireAdmin($pdo);
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
    error_log("enquiries.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["message" => "Something went wrong. Please try again later."]);
}
?>
