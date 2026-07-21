<?php

header('Content-Type: application/json');

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

requireAdmin($pdo);

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Method not allowed'
        ]);
        exit;
    }

    $documentId = isset($_GET['id'])
        ? (int) $_GET['id']
        : 0;

    if ($documentId <= 0) {
        throw new Exception('Invalid document ID');
    }

    $stmt = $pdo->prepare(
        'SELECT file_path
        FROM product_documents
        WHERE id = ?'
    );

    $stmt->execute([$documentId]);
    $document = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$document) {
        throw new Exception('Document not found');
    }

    $physicalPath =
        dirname(__DIR__) .
        $document['file_path'];

    if (is_file($physicalPath)) {
        unlink($physicalPath);
    }

    $deleteStmt = $pdo->prepare(
        'DELETE FROM product_documents WHERE id = ?'
    );

    $deleteStmt->execute([$documentId]);

    echo json_encode([
        'success' => true,
        'message' => 'Document deleted successfully'
    ]);
} catch (Throwable $error) {
    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' => $error->getMessage()
    ]);
}