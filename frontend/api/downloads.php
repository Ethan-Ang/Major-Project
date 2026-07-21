<?php
// api/downloads.php  (CLIENT-004)
// Admin-only viewer for SDS/TDS download records captured by the gate (Phase C).
//   GET             admin -> all records, newest first
//   DELETE ?id=N    admin -> delete one
//   DELETE {ids:[]} admin -> delete selected
// This data is managed only here and is never emailed (client's explicit wish).

require_once "db.php";
require_once "auth.php";

$method = $_SERVER["REQUEST_METHOD"];

function getJsonInput() {
    $d = json_decode(file_get_contents("php://input"), true);
    return is_array($d) ? $d : [];
}

function formatDownload($r) {
    return [
        "id"          => (int) $r["id"],
        "productId"   => $r["product_id"] !== null ? (int) $r["product_id"] : null,
        "productName" => $r["product_name"],
        "docType"     => strtoupper($r["doc_type"]),   // SDS / TDS
        "name"        => $r["visitor_name"],
        "email"       => $r["visitor_email"],
        "company"     => $r["visitor_company"],
        "phone"       => $r["visitor_phone"],
        "date"        => $r["downloaded_at"],
    ];
}

if ($method === "GET") {
    requireAdmin($pdo);
    $rows = $pdo->query("SELECT * FROM document_downloads ORDER BY downloaded_at DESC, id DESC")
                ->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(array_map("formatDownload", $rows));
    exit;
}

if ($method === "DELETE") {
    requireAdmin($pdo);

    $id = isset($_GET["id"]) ? (int) $_GET["id"] : 0;
    if ($id) {
        $pdo->prepare("DELETE FROM document_downloads WHERE id = ?")->execute([$id]);
        echo json_encode(["success" => true, "deleted" => 1]);
        exit;
    }

    $data = getJsonInput();
    $ids  = isset($data["ids"]) && is_array($data["ids"])
        ? array_values(array_filter(array_map("intval", $data["ids"])))
        : [];
    if (!$ids) {
        http_response_code(400);
        echo json_encode(["message" => "No records specified."]);
        exit;
    }
    $in = implode(",", array_fill(0, count($ids), "?"));
    $pdo->prepare("DELETE FROM document_downloads WHERE id IN ($in)")->execute($ids);
    echo json_encode(["success" => true, "deleted" => count($ids)]);
    exit;
}

http_response_code(405);
echo json_encode(["message" => "Method not allowed."]);
