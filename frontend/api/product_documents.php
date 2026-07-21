<?php

header('Content-Type: application/json');

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

// Admin-only: exposes document file paths, so it must not be publicly readable
// (that would let visitors bypass the download gate). CLIENT-003.
requireAdmin($pdo);

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Method not allowed'
        ]);
        exit;
    }

    $productId = isset($_GET['product_id'])
        ? (int) $_GET['product_id']
        : 0;

    if ($productId <= 0) {
        throw new Exception('Invalid product ID');
    }

    $stmt = $pdo->prepare(
        'SELECT
            id,
            product_id,
            document_type,
            original_name,
            file_path,
            file_size,
            uploaded_at
        FROM product_documents
        WHERE product_id = ?
        ORDER BY document_type ASC, uploaded_at DESC'
    );

    $stmt->execute([$productId]);

    echo json_encode([
        'success' => true,
        'documents' => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ]);
} catch (Throwable $error) {
    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' => $error->getMessage()
    ]);
}