<?php
require_once "db.php";

function decodeJsonField($value) {
    $decoded = json_decode($value ?? "[]", true);
    return is_array($decoded) ? $decoded : [];
}

function formatProduct($row) {
    return [
        "id" => strval($row["id"]),
        "_id" => strval($row["id"]),
        "mongo_id" => $row["mongo_id"],
        "name" => $row["name"],
        "brand" => $row["brand"],
        "category" => $row["category"],
        "shortDescription" => $row["short_description"],
        "fullDescription" => $row["full_description"],
        "usage" => $row["usage_text"],
        "imageUrl" => $row["image_url"],
        "images" => decodeJsonField($row["images"]),
        "status" => $row["status"],
        "industries" => decodeJsonField($row["industries"]),
        "surfaces" => decodeJsonField($row["surfaces"]),
        "features" => decodeJsonField($row["features"]),
        "createdAt" => $row["created_at"],
        "updatedAt" => $row["updated_at"]
    ];
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

            echo json_encode(formatProduct($row));
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

        $products = array_map("formatProduct", $stmt->fetchAll(PDO::FETCH_ASSOC));

        echo json_encode($products);
        exit;
    }

    // ─── POST: Add new product ─────────────────────────────────────
    if ($method === "POST") {
        $data = getJsonInput();

        $name = trim($data["name"] ?? "");
        $brand = $data["brand"] ?? "Deer™ Brand";
        $category = $data["category"] ?? "Industrial";
        $shortDescription = trim($data["shortDescription"] ?? "");
        $fullDescription = trim($data["fullDescription"] ?? "");
        $usage = trim($data["usage"] ?? "");
        $imageUrl = trim($data["imageUrl"] ?? "");
        $images = jsonList($data["images"] ?? []);
        $status = $data["status"] ?? "Available";
        $industries = jsonList($data["industries"] ?? []);
        $surfaces = jsonList($data["surfaces"] ?? []);
        $features = jsonList($data["features"] ?? []);

        if ($name === "" || $shortDescription === "") {
            http_response_code(400);
            echo json_encode(["message" => "Product name and short description are required."]);
            exit;
        }

        $stmt = $pdo->prepare("
            INSERT INTO products (
                name, brand, category, short_description, full_description,
                usage_text, image_url, images, status, industries, surfaces, features
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $name,
            $brand,
            $category,
            $shortDescription,
            $fullDescription,
            $usage,
            $imageUrl,
            $images,
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

    // ─── PUT: Update product ───────────────────────────────────────
    if ($method === "PUT") {
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
        $shortDescription = trim($data["shortDescription"] ?? $existing["short_description"]);
        $fullDescription = trim($data["fullDescription"] ?? $existing["full_description"]);
        $usage = trim($data["usage"] ?? $existing["usage_text"]);
        $imageUrl = trim($data["imageUrl"] ?? $existing["image_url"]);
        $images = array_key_exists("images", $data) ? jsonList($data["images"]) : $existing["images"];
        $status = $data["status"] ?? $existing["status"];
        $industries = array_key_exists("industries", $data) ? jsonList($data["industries"]) : $existing["industries"];
        $surfaces = array_key_exists("surfaces", $data) ? jsonList($data["surfaces"]) : $existing["surfaces"];
        $features = array_key_exists("features", $data) ? jsonList($data["features"]) : $existing["features"];

        if ($name === "" || $shortDescription === "") {
            http_response_code(400);
            echo json_encode(["message" => "Product name and short description are required."]);
            exit;
        }

        $stmt = $pdo->prepare("
            UPDATE products
            SET
                name = ?,
                brand = ?,
                category = ?,
                short_description = ?,
                full_description = ?,
                usage_text = ?,
                image_url = ?,
                images = ?,
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
            $shortDescription,
            $fullDescription,
            $usage,
            $imageUrl,
            $images,
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

    // ─── DELETE: Delete product ────────────────────────────────────
    if ($method === "DELETE") {
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

        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        $stmt->execute([$id]);

        echo json_encode(["message" => "Product deleted successfully."]);
        exit;
    }

    // ─── Unsupported method ────────────────────────────────────────
    http_response_code(405);
    echo json_encode(["message" => "Method not allowed."]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "message" => "Database error.",
        "error" => $e->getMessage()
    ]);
}
?>