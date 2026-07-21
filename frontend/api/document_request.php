<?php
// api/document_request.php  (CLIENT-003)
// Public gate: a visitor submits their details to download an SDS/TDS. We record
// the request (document_downloads — admin-only, never emailed) and issue a single-
// use token; the browser then fetches api/download_document.php?t=<token>. The
// document's real URL is never exposed. Mirrors the enquiries.php spam guards.

require_once __DIR__ . '/db.php';   // sets JSON header + $pdo + ylRate* helpers

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) $data = [];

// Spam guard 1 — honeypot (the same hidden "website" field enquiries uses).
if (trim($data['website'] ?? '') !== '') {
    echo json_encode(['success' => true]); // pretend success; issue nothing
    exit;
}

// Spam guard 2 — per-IP rate limit.
$windowSeconds = 3600;
$max = 30;
$bucket = 'docreq_' . ($_SERVER['REMOTE_ADDR'] ?? '0');
if (ylRateRecentCount($bucket, $windowSeconds) >= $max) {
    http_response_code(429);
    header('Retry-After: ' . ylRateRetryAfter($bucket, $windowSeconds, $max));
    echo json_encode(['message' => 'Too many requests. Please try again later.']);
    exit;
}

$productId = (int) ($data['productId'] ?? 0);
$docType   = strtolower(trim($data['docType'] ?? ''));
$name      = trim($data['name'] ?? '');
$email     = trim($data['email'] ?? '');
$company   = trim($data['company'] ?? '');
$phone     = trim($data['phone'] ?? '');

if (!in_array($docType, ['sds', 'tds'], true)) {
    http_response_code(400);
    echo json_encode(['message' => 'Invalid document type.']);
    exit;
}
if ($name === '' || $email === '' || $company === '') {
    http_response_code(400);
    echo json_encode(['message' => 'Please provide your name, email and company.']);
    exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['message' => 'Please enter a valid email address.']);
    exit;
}
if (mb_strlen($name) > 255 || mb_strlen($email) > 255 || mb_strlen($company) > 255 || mb_strlen($phone) > 50) {
    http_response_code(400);
    echo json_encode(['message' => 'One of the fields is too long.']);
    exit;
}

// The product must exist AND actually have the requested document on file.
$stmt = $pdo->prepare(
    "SELECT p.name AS product_name
     FROM products p
     JOIN product_documents d ON d.product_id = p.id AND UPPER(d.document_type) = ?
     WHERE p.id = ?
     LIMIT 1"
);
$stmt->execute([strtoupper($docType), $productId]);
$product = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$product) {
    http_response_code(404);
    echo json_encode(['message' => 'That document is not available.']);
    exit;
}

// Count the hit only past validation, so bad input can't burn the limit.
ylRateAdd($bucket, $windowSeconds);

try {
    $pdo->beginTransaction();

    $ins = $pdo->prepare(
        "INSERT INTO document_downloads
         (product_id, product_name, doc_type, visitor_name, visitor_email, visitor_company, visitor_phone, notice_version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $ins->execute([
        $productId, $product['product_name'], $docType,
        $name, $email, $company, ($phone !== '' ? $phone : null), 'v1',
    ]);
    $downloadId = (int) $pdo->lastInsertId();

    $token     = bin2hex(random_bytes(32));               // 64 hex chars, unguessable
    $expiresAt = date('Y-m-d H:i:s', time() + 900);       // 15 minutes
    $tin = $pdo->prepare(
        "INSERT INTO download_tokens (token, download_id, product_id, doc_type, expires_at)
         VALUES (?, ?, ?, ?, ?)"
    );
    $tin->execute([$token, $downloadId, $productId, $docType, $expiresAt]);

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('document_request.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['message' => 'Something went wrong. Please try again.']);
    exit;
}

echo json_encode([
    'success'     => true,
    'downloadUrl' => 'api/download_document.php?t=' . $token,
]);
