<?php
// api/download_document.php  (CLIENT-003)
// Streams an SDS/TDS PDF in exchange for a valid single-use token issued by
// document_request.php. The file's real path is resolved server-side from
// product_documents and never exposed; direct access to the file on disk is
// additionally blocked by uploads/.htaccess so the gate cannot be bypassed.

require_once __DIR__ . '/db.php';   // sets JSON content-type + $pdo (overridden on success)

function docFail($code, $message) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(['message' => $message]);
    exit;
}

$token = $_GET['t'] ?? '';
if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
    docFail(400, 'Invalid download link.');
}

$stmt = $pdo->prepare("SELECT product_id, doc_type, expires_at, used_at FROM download_tokens WHERE token = ?");
$stmt->execute([$token]);
$tok = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$tok) {
    docFail(404, 'This download link is not valid.');
}
if ($tok['used_at'] !== null) {
    docFail(410, 'This download link has already been used. Please request the document again.');
}
if (strtotime($tok['expires_at']) < time()) {
    docFail(410, 'This download link has expired. Please request the document again.');
}

// Resolve the file from product_documents (server-side; never from user input).
$dstmt = $pdo->prepare(
    "SELECT file_path, original_name FROM product_documents
     WHERE product_id = ? AND UPPER(document_type) = ?
     ORDER BY uploaded_at DESC LIMIT 1"
);
$dstmt->execute([(int) $tok['product_id'], strtoupper($tok['doc_type'])]);
$doc = $dstmt->fetch(PDO::FETCH_ASSOC);
if (!$doc) {
    docFail(404, 'The document is no longer available.');
}

// Path-safety: the resolved file must sit inside the uploads directory.
$base = realpath(dirname(__DIR__) . '/uploads');
$path = realpath(dirname(__DIR__) . $doc['file_path']);
if ($base === false || $path === false || strpos($path, $base . DIRECTORY_SEPARATOR) !== 0 || !is_file($path)) {
    docFail(404, 'The document file could not be found.');
}

// Mark the token used BEFORE streaming, so one token can never serve twice.
$pdo->prepare("UPDATE download_tokens SET used_at = NOW() WHERE token = ?")->execute([$token]);

// Clean, safe download filename.
$safeName = preg_replace('/[^A-Za-z0-9._-]+/', '_', (string) ($doc['original_name'] ?: 'document.pdf'));
if (!preg_match('/\.pdf$/i', $safeName)) $safeName .= '.pdf';

header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="' . $safeName . '"');
header('Content-Length: ' . filesize($path));
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store');
readfile($path);
exit;
