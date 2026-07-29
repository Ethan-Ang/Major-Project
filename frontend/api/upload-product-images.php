<?php
header("Content-Type: application/json");

require_once __DIR__ . "/db.php";
require_once __DIR__ . "/auth.php";

// Admin-only, exactly like every other write endpoint. Without this an
// unauthenticated caller could write files into the uploads tree. The admin UI
// already sends the bearer token on this request, so nothing else changes.
requireAdmin($pdo);

// Integer id: safer than sanitising a string into a path, and it matches the
// column type. upload_product_document.php does the same.
$productId = isset($_POST["product_id"]) ? (int) $_POST["product_id"] : 0;

if ($productId <= 0) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Missing or invalid product ID."
    ]);
    exit;
}

// The product must exist before anything is written to disk. Without this a bad
// product_id silently leaves an orphan uploads/products/product-<id>/ folder.
// Mirrors the same guard in upload_product_document.php.
try {
    $productStmt = $pdo->prepare("SELECT id FROM products WHERE id = ?");
    $productStmt->execute([$productId]);

    if (!$productStmt->fetch()) {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "Product not found."
        ]);
        exit;
    }
} catch (PDOException $e) {
    error_log("upload-product-images.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Something went wrong. Please try again later."
    ]);
    exit;
}

$baseDir = dirname(__DIR__) . "/uploads/products/product-" . $productId;
$baseUrl = "/uploads/products/product-" . $productId;

if (!is_dir($baseDir)) {
    if (!mkdir($baseDir, 0755, true)) {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Unable to create the upload folder."
        ]);
        exit;
    }
}

$allowedTypes = [
    "image/jpeg" => "jpg",
    "image/png" => "png",
    "image/webp" => "webp"
];

function saveUploadedImage($file, $baseDir, $baseUrl, $allowedTypes, $prefix) {
    if (!isset($file["error"]) || $file["error"] === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    if ($file["error"] !== UPLOAD_ERR_OK) {
        throw new Exception("Image upload failed.");
    }

    if (empty($file["tmp_name"]) || !is_uploaded_file($file["tmp_name"])) {
        return null;
    }

    $tmpPath = $file["tmp_name"];
    $mimeType = mime_content_type($tmpPath);

    if (!isset($allowedTypes[$mimeType])) {
        throw new Exception("Only JPG, PNG and WEBP images are allowed.");
    }

    if ($file["size"] > 5 * 1024 * 1024) {
        throw new Exception("Each image must be below 5MB.");
    }

    $ext = $allowedTypes[$mimeType];
    $filename = $prefix . "-" . time() . "-" . rand(1000, 9999) . "." . $ext;
    $destination = $baseDir . "/" . $filename;

    if (!move_uploaded_file($tmpPath, $destination)) {
        throw new Exception("Failed to save uploaded image.");
    }

    return $baseUrl . "/" . $filename;
}

try {
    $mainImageUrl = null;
    $extraImageUrls = [];

    // Only save a main image when the frontend actually sends main_image.
    // Additional images are handled separately and can never become main_image here.
    if (isset($_FILES["main_image"])) {
        $mainImageUrl = saveUploadedImage(
            $_FILES["main_image"],
            $baseDir,
            $baseUrl,
            $allowedTypes,
            "main"
        );
    }

    if (isset($_FILES["extra_images"]) && is_array($_FILES["extra_images"]["name"])) {
        foreach ($_FILES["extra_images"]["name"] as $index => $name) {
            $file = [
                "name" => $_FILES["extra_images"]["name"][$index],
                "type" => $_FILES["extra_images"]["type"][$index],
                "tmp_name" => $_FILES["extra_images"]["tmp_name"][$index],
                "error" => $_FILES["extra_images"]["error"][$index],
                "size" => $_FILES["extra_images"]["size"][$index]
            ];

            $savedUrl = saveUploadedImage(
                $file,
                $baseDir,
                $baseUrl,
                $allowedTypes,
                "extra"
            );

            if ($savedUrl) {
                $extraImageUrls[] = $savedUrl;
            }
        }
    }

    echo json_encode([
        "success" => true,
        "main_image" => $mainImageUrl,
        "extra_images" => $extraImageUrls
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}
?>
