<?php
require_once "db.php";
require_once "auth.php";

function decodeJsonField($value) {
    $decoded = json_decode($value ?? "[]", true);
    return is_array($decoded) ? $decoded : [];
}

function formatProduct($row, $flags = []) {
    return [
        "id" => strval($row["id"]),
        "_id" => strval($row["id"]),
        "mongo_id" => $row["mongo_id"],
        "name" => $row["name"],
        "brand" => $row["brand"],
        "category" => $row["category"],
        "productType" => $row["product_type"] ?? "",
        "shortDescription" => $row["short_description"],
        "fullDescription" => $row["full_description"],
        "usage" => $row["usage_text"],
        "imageUrl" => $row["image_url"],
        "images" => decodeJsonField($row["images"]),
        "sdsUrl" => $row["sds_url"] ?? "",
        "tdsUrl" => $row["tds_url"] ?? "",
        "hasSds" => !empty($flags["sds"]),
        "hasTds" => !empty($flags["tds"]),
        "status" => $row["status"],
        "industries" => decodeJsonField($row["industries"]),
        "surfaces" => decodeJsonField($row["surfaces"]),
        "features" => decodeJsonField($row["features"]),
        "createdAt" => $row["created_at"],
        "updatedAt" => $row["updated_at"]
    ];
}

// Which products have an SDS / TDS on file (from product_documents). Used to set
// the public hasSds/hasTds flags WITHOUT exposing the document URLs. Tolerates
// the product_documents table being absent.
function productDocFlagsMap($pdo, $onlyId = null) {
    $map = [];
    try {
        if ($onlyId !== null) {
            $stmt = $pdo->prepare("SELECT DISTINCT product_id, UPPER(document_type) AS dt FROM product_documents WHERE product_id = ? AND document_type IN ('SDS','TDS')");
            $stmt->execute([(int) $onlyId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $rows = $pdo->query("SELECT DISTINCT product_id, UPPER(document_type) AS dt FROM product_documents WHERE document_type IN ('SDS','TDS')")->fetchAll(PDO::FETCH_ASSOC);
        }
        foreach ($rows as $r) {
            $pid = (int) $r["product_id"];
            if (!isset($map[$pid])) $map[$pid] = ["sds" => false, "tds" => false];
            if ($r["dt"] === "SDS") $map[$pid]["sds"] = true;
            elseif ($r["dt"] === "TDS") $map[$pid]["tds"] = true;
        }
    } catch (Throwable $e) { /* table absent -> no flags */ }
    return $map;
}

function getJsonInput() {
    $raw = file_get_contents("php://input");
    $data = json_decode($raw, true);

    if (!is_array($data)) {
        return [];
    }

    return $data;
}

function jsonList($value) {
    if (is_array($value)) {
        return json_encode($value);
    }

    return json_encode([]);
}

// Recursively remove a directory and its contents. Used when a product is
// deleted, to clean up its uploaded images + documents. (Synced from live,
// where the teammate added product image/document uploads.)
function deleteDirectoryRecursive($directory) {
    if (!is_dir($directory)) {
        return;
    }
    $items = scandir($directory);
    if ($items === false) {
        return;
    }
    foreach ($items as $item) {
        if ($item === "." || $item === "..") {
            continue;
        }
        $path = $directory . DIRECTORY_SEPARATOR . $item;
        if (is_dir($path)) {
            deleteDirectoryRecursive($path);
        } elseif (is_file($path)) {
            unlink($path);
        }
    }
    rmdir($directory);
}

$method = $_SERVER["REQUEST_METHOD"];
$id = $_GET["id"] ?? null;

try {

    // ─── GET: Load all products or one product ─────────────────────
    if ($method === "GET") {

        if ($id) {
            $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$row) {
                http_response_code(404);
                echo json_encode(["message" => "Product not found"]);
                exit;
            }

            $flags = productDocFlagsMap($pdo, $id)[(int) $id] ?? [];
            echo json_encode(formatProduct($row, $flags));
            exit;
        }

        $search = $_GET["search"] ?? "";
        $category = $_GET["category"] ?? "";
        $brand = $_GET["brand"] ?? "";
        $industry = $_GET["industry"] ?? "";
        $surface = $_GET["surface"] ?? "";

        $sql = "SELECT * FROM products WHERE 1=1";
        $params = [];

        if ($search !== "") {
            $sql .= " AND (
                name LIKE ? OR brand LIKE ? OR category LIKE ?
                OR short_description LIKE ? OR full_description LIKE ?
                OR usage_text LIKE ? OR industries LIKE ?
                OR surfaces LIKE ? OR features LIKE ?
            )";

            $like = "%" . $search . "%";
            array_push($params, $like, $like, $like, $like, $like, $like, $like, $like, $like);
        }

        if ($category !== "" && $category !== "All") {
            $sql .= " AND category = ?";
            $params[] = $category;
        }

        if ($brand !== "" && $brand !== "All") {
            $sql .= " AND brand = ?";
            $params[] = $brand;
        }

        if ($industry !== "" && $industry !== "All") {
            $sql .= " AND industries LIKE ?";
            $params[] = "%" . $industry . "%";
        }

        if ($surface !== "" && $surface !== "All") {
            $sql .= " AND surfaces LIKE ?";
            $params[] = "%" . $surface . "%";
        }

        $sql .= " ORDER BY created_at DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        $docFlags = productDocFlagsMap($pdo);
        $products = array_map(
            fn($r) => formatProduct($r, $docFlags[(int) $r["id"]] ?? []),
            $stmt->fetchAll(PDO::FETCH_ASSOC)
        );

        echo json_encode($products);
        exit;
    }

    // ─── POST: Add new product (admin only) ────────────────────────
    if ($method === "POST") {
        requireAdmin($pdo);
        $data = getJsonInput();

        $name = trim($data["name"] ?? "");
        $brand = $data["brand"] ?? "Deer™ Brand";
        $category = $data["category"] ?? "Industrial";
        $productType = trim($data["productType"] ?? $data["product_type"] ?? "");
        if ($productType === "") {
            $productType = ($brand === "Others & Accessories" || $category === "Others")
                ? "Spray Guns & Accessories" : "Adhesives";
        }
        $shortDescription = trim($data["shortDescription"] ?? "");
        $fullDescription = trim($data["fullDescription"] ?? "");
        $usage = trim($data["usage"] ?? "");
        $imageUrl = trim($data["imageUrl"] ?? "");
        $images = jsonList($data["images"] ?? []);
        $sdsUrl = trim($data["sdsUrl"] ?? $data["sds_url"] ?? "");
        $tdsUrl = trim($data["tdsUrl"] ?? $data["tds_url"] ?? "");
        $status = $data["status"] ?? "Available";
        $industries = jsonList($data["industries"] ?? []);
        $surfaces = jsonList($data["surfaces"] ?? []);
        $features = jsonList($data["features"] ?? []);

        if ($name === "" || $shortDescription === "") {
            http_response_code(400);
            echo json_encode(["message" => "Product name and short description are required."]);
            exit;
        }
        if (mb_strlen($name) > 200 || mb_strlen($shortDescription) > 5000) {
            http_response_code(400);
            echo json_encode(["message" => "Product name (max 200 characters) or short description (max 5000) is too long."]);
            exit;
        }

        $stmt = $pdo->prepare("
            INSERT INTO products (
                name, brand, category, product_type, short_description, full_description,
                usage_text, image_url, images, sds_url, tds_url, status, industries, surfaces, features
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $name,
            $brand,
            $category,
            $productType,
            $shortDescription,
            $fullDescription,
            $usage,
            $imageUrl,
            $images,
            $sdsUrl !== "" ? $sdsUrl : null,
            $tdsUrl !== "" ? $tdsUrl : null,
            $status,
            $industries,
            $surfaces,
            $features
        ]);

        $newId = $pdo->lastInsertId();

        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$newId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        http_response_code(201);
        echo json_encode(formatProduct($row));
        exit;
    }

    // ─── PUT: Update product (admin only) ──────────────────────────
    if ($method === "PUT") {
        requireAdmin($pdo);
        if (!$id) {
            http_response_code(400);
            echo json_encode(["message" => "Product ID is required."]);
            exit;
        }

        $data = getJsonInput();

        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            http_response_code(404);
            echo json_encode(["message" => "Product not found."]);
            exit;
        }

        $name = trim($data["name"] ?? $existing["name"]);
        $brand = $data["brand"] ?? $existing["brand"];
        $category = $data["category"] ?? $existing["category"];
        $productType = array_key_exists("productType", $data) ? trim($data["productType"])
                     : (array_key_exists("product_type", $data) ? trim($data["product_type"]) : $existing["product_type"]);
        $shortDescription = trim($data["shortDescription"] ?? $existing["short_description"]);
        $fullDescription = trim($data["fullDescription"] ?? $existing["full_description"]);
        $usage = trim($data["usage"] ?? $existing["usage_text"]);
        $imageUrl = trim($data["imageUrl"] ?? $existing["image_url"]);
        $images = array_key_exists("images", $data) ? jsonList($data["images"]) : $existing["images"];
        $sdsUrl = array_key_exists("sdsUrl", $data) ? trim($data["sdsUrl"])
                : (array_key_exists("sds_url", $data) ? trim($data["sds_url"]) : $existing["sds_url"]);
        $tdsUrl = array_key_exists("tdsUrl", $data) ? trim($data["tdsUrl"])
                : (array_key_exists("tds_url", $data) ? trim($data["tds_url"]) : $existing["tds_url"]);
        $status = $data["status"] ?? $existing["status"];
        $industries = array_key_exists("industries", $data) ? jsonList($data["industries"]) : $existing["industries"];
        $surfaces = array_key_exists("surfaces", $data) ? jsonList($data["surfaces"]) : $existing["surfaces"];
        $features = array_key_exists("features", $data) ? jsonList($data["features"]) : $existing["features"];

        if ($name === "" || $shortDescription === "") {
            http_response_code(400);
            echo json_encode(["message" => "Product name and short description are required."]);
            exit;
        }
        if (mb_strlen($name) > 200 || mb_strlen($shortDescription) > 5000) {
            http_response_code(400);
            echo json_encode(["message" => "Product name (max 200 characters) or short description (max 5000) is too long."]);
            exit;
        }

        $stmt = $pdo->prepare("
            UPDATE products
            SET
                name = ?,
                brand = ?,
                category = ?,
                product_type = ?,
                short_description = ?,
                full_description = ?,
                usage_text = ?,
                image_url = ?,
                images = ?,
                sds_url = ?,
                tds_url = ?,
                status = ?,
                industries = ?,
                surfaces = ?,
                features = ?
            WHERE id = ?
        ");

        $stmt->execute([
            $name,
            $brand,
            $category,
            $productType,
            $shortDescription,
            $fullDescription,
            $usage,
            $imageUrl,
            $images,
            $sdsUrl !== "" ? $sdsUrl : null,
            $tdsUrl !== "" ? $tdsUrl : null,
            $status,
            $industries,
            $surfaces,
            $features,
            $id
        ]);

        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode(formatProduct($row));
        exit;
    }

    // ─── DELETE: Delete product (admin only) ───────────────────────
    if ($method === "DELETE") {
        requireAdmin($pdo);
        if (!$id) {
            http_response_code(400);
            echo json_encode(["message" => "Product ID is required."]);
            exit;
        }

        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            http_response_code(404);
            echo json_encode(["message" => "Product not found."]);
            exit;
        }

        // Remove the product's uploaded files (images + documents) after the row
        // is deleted. The product_documents FK cascade removes their DB rows.
        $productUploadDirectory = dirname(__DIR__) . "/uploads/products/product-" . (int) $id;

        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        $stmt->execute([$id]);

        if (is_dir($productUploadDirectory)) {
            deleteDirectoryRecursive($productUploadDirectory);
        }

        echo json_encode(["message" => "Product deleted successfully."]);
        exit;
    }

    // ─── Unsupported method ────────────────────────────────────────
    http_response_code(405);
    echo json_encode(["message" => "Method not allowed."]);

} catch (PDOException $e) {
    error_log("products.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["message" => "Something went wrong. Please try again later."]);
}
?>