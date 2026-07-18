<?php
header("Content-Type: application/json");

$productId = $_POST["product_id"] ?? "";

if ($productId === "") {
    echo json_encode([
        "success" => false,
        "message" => "Missing product ID."
    ]);
    exit;
}

$safeProductId = preg_replace("/[^a-zA-Z0-9_-]/", "", $productId);

$baseDir = __DIR__ . "/../uploads/products/product-" . $safeProductId;
$baseUrl = "/uploads/products/product-" . $safeProductId;

if (!is_dir($baseDir)) {
    mkdir($baseDir, 0755, true);
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
