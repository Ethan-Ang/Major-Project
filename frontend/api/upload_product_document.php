<?php

header('Content-Type: application/json');

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

requireAdmin($pdo);

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);

        echo json_encode([
            'success' => false,
            'message' => 'Method not allowed'
        ]);

        exit;
    }

    $productId = isset($_POST['product_id'])
        ? (int) $_POST['product_id']
        : 0;

    $documentType = strtoupper(
        trim($_POST['document_type'] ?? '')
    );

    if ($productId <= 0) {
        throw new Exception('Invalid product ID');
    }

    if (!in_array($documentType, ['SDS', 'TDS', 'OTHER'], true)) {
        throw new Exception('Invalid document type');
    }

    if (!isset($_FILES['document_file'])) {
        throw new Exception('No document uploaded');
    }

    $file = $_FILES['document_file'];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Document upload failed');
    }

    if (
        empty($file['tmp_name']) ||
        !is_uploaded_file($file['tmp_name'])
    ) {
        throw new Exception('Invalid uploaded document');
    }

    if ($file['size'] <= 0) {
        throw new Exception('The uploaded document is empty');
    }

    $maxSize = 10 * 1024 * 1024;

    if ($file['size'] > $maxSize) {
        throw new Exception('File must be smaller than 10 MB');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);

    if ($mimeType !== 'application/pdf') {
        throw new Exception('Only PDF documents are allowed');
    }

    $productStmt = $pdo->prepare(
        'SELECT id
         FROM products
         WHERE id = ?'
    );

    $productStmt->execute([$productId]);

    if (!$productStmt->fetch()) {
        throw new Exception('Product not found');
    }

    $uploadDirectory =
        dirname(__DIR__) .
        '/uploads/products/product-' .
        $productId .
        '/documents';

    if (!is_dir($uploadDirectory)) {
        if (!mkdir($uploadDirectory, 0755, true)) {
            throw new Exception('Unable to create upload folder');
        }
    }

    $storedName =
        strtolower($documentType) .
        '-' .
        time() .
        '-' .
        bin2hex(random_bytes(4)) .
        '.pdf';

    $destinationPath =
        $uploadDirectory .
        '/' .
        $storedName;

    if (!move_uploaded_file(
        $file['tmp_name'],
        $destinationPath
    )) {
        throw new Exception('Unable to save uploaded document');
    }

    $publicPath =
        '/uploads/products/product-' .
        $productId .
        '/documents/' .
        $storedName;

    $pdo->beginTransaction();

    try {
        /*
         * SDS and TDS are treated as one document per type.
         * Uploading a new SDS replaces the previous SDS.
         * Uploading a new TDS replaces the previous TDS.
         *
         * OTHER documents are allowed to have multiple records.
         */
        $oldDocuments = [];

        if (in_array($documentType, ['SDS', 'TDS'], true)) {
            $oldStmt = $pdo->prepare(
                'SELECT id, file_path
                 FROM product_documents
                 WHERE product_id = ?
                 AND document_type = ?'
            );

            $oldStmt->execute([
                $productId,
                $documentType
            ]);

            $oldDocuments =
                $oldStmt->fetchAll(PDO::FETCH_ASSOC);

            $deleteOldStmt = $pdo->prepare(
                'DELETE FROM product_documents
                 WHERE product_id = ?
                 AND document_type = ?'
            );

            $deleteOldStmt->execute([
                $productId,
                $documentType
            ]);
        }

        $insertStmt = $pdo->prepare(
            'INSERT INTO product_documents
            (
                product_id,
                document_type,
                original_name,
                stored_name,
                file_path,
                file_size
            )
            VALUES (?, ?, ?, ?, ?, ?)'
        );

        $insertStmt->execute([
            $productId,
            $documentType,
            basename($file['name']),
            $storedName,
            $publicPath,
            $file['size']
        ]);

        $documentId = (int) $pdo->lastInsertId();

        $pdo->commit();

        /*
         * Delete the old physical files only after the
         * database transaction succeeds.
         */
        foreach ($oldDocuments as $oldDocument) {
            $oldPhysicalPath =
                dirname(__DIR__) .
                $oldDocument['file_path'];

            if (
                is_file($oldPhysicalPath) &&
                realpath(dirname($oldPhysicalPath)) !== false
            ) {
                unlink($oldPhysicalPath);
            }
        }

        echo json_encode([
            'success' => true,
            'message' => 'Document uploaded successfully',
            'document' => [
                'id' => $documentId,
                'product_id' => $productId,
                'document_type' => $documentType,
                'original_name' => basename($file['name']),
                'stored_name' => $storedName,
                'file_path' => $publicPath,
                'file_size' => (int) $file['size']
            ]
        ]);
    } catch (Throwable $databaseError) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        if (is_file($destinationPath)) {
            unlink($destinationPath);
        }

        throw $databaseError;
    }
} catch (Throwable $error) {
    http_response_code(400);

    echo json_encode([
        'success' => false,
        'message' => $error->getMessage()
    ]);
}