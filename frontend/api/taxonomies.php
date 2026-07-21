<?php
// api/taxonomies.php  (CLIENT-005)
// Managed catalogue filter values: Product Types, Brands, Industries, Surfaces.
//
//   GET                       public   -> active terms per group (for the sidebar)
//   GET ?scope=admin          admin    -> ALL terms incl. archived + usage counts
//   POST                      admin    -> add a term
//   PUT|PATCH ?id=<id>        admin    -> rename / reorder / archive / logo / visibility
//   DELETE ?id=<id>          admin    -> delete an UNUSED term (in-use -> 409)
//
// Model: products keep storing their display strings; this table DEFINES the
// allowed values. Renaming a term rewrites the matching product strings inside
// one transaction, so the catalogue never silently loses a filter value.
//
// Prerequisites: 2026-07-21_taxonomy_terms.sql and
// 2026-07-21_products_product_type.sql must both be applied first.

require_once "db.php";
require_once "auth.php";

$method  = $_SERVER["REQUEST_METHOD"];
$GROUPS  = ["product_type", "brand", "industry", "surface"];

// Mirror of js/pages/products.js ylSlug so admin-created slugs match the public
// URL scheme (lowercase, drop (TM)/(R), non-alphanumerics -> a single hyphen).
function taxSlug($s) {
    $s = mb_strtolower(trim((string) $s));
    $s = str_replace(["™", "®"], "", $s);
    $s = preg_replace('/[^a-z0-9]+/u', "-", $s);
    return trim($s, "-");
}

function taxDecodeJson($value) {
    $decoded = json_decode($value ?? "[]", true);
    return is_array($decoded) ? $decoded : [];
}

// Read + decode the JSON request body (POST/PATCH). Each API file defines its
// own copy (products.php has the same helper); it is not in a shared include.
function getJsonInput() {
    $data = json_decode(file_get_contents("php://input"), true);
    return is_array($data) ? $data : [];
}

// Shape a term row for admin responses (list + create + update).
function taxFormatRow($t, $usageCount = 0) {
    return [
        "id"            => (int) $t["id"],
        "groupKey"      => $t["group_key"],
        "label"         => $t["label"],
        "slug"          => $t["slug"],
        "logoUrl"       => $t["logo_url"],
        "logoAlt"       => $t["logo_alt"],
        "sortOrder"     => (int) $t["sort_order"],
        "publicVisible" => (int) $t["public_visible"] === 1,
        "archived"      => (int) $t["archived"] === 1,
        "usageCount"    => (int) $usageCount,
    ];
}

// Count products referencing each term value, per group. Computed in PHP over
// the (small) catalogue so it needs no JSON_TABLE (portable across MySQL versions).
function taxUsageMaps($pdo) {
    $maps = ["product_type" => [], "brand" => [], "industry" => [], "surface" => []];
    $stmt = $pdo->query("SELECT brand, product_type, industries, surfaces FROM products");
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $p) {
        $brand = $p["brand"] ?? "";
        if ($brand !== "") $maps["brand"][$brand] = ($maps["brand"][$brand] ?? 0) + 1;
        $ptype = $p["product_type"] ?? "";
        if ($ptype !== "") $maps["product_type"][$ptype] = ($maps["product_type"][$ptype] ?? 0) + 1;
        foreach (taxDecodeJson($p["industries"]) as $v) {
            if ($v !== "") $maps["industry"][$v] = ($maps["industry"][$v] ?? 0) + 1;
        }
        foreach (taxDecodeJson($p["surfaces"]) as $v) {
            if ($v !== "") $maps["surface"][$v] = ($maps["surface"][$v] ?? 0) + 1;
        }
    }
    return $maps;
}

// Count products referencing one specific term value.
function taxUsageCount($pdo, $group, $label) {
    if ($group === "brand") {
        $s = $pdo->prepare("SELECT COUNT(*) FROM products WHERE brand = ?");
    } elseif ($group === "product_type") {
        $s = $pdo->prepare("SELECT COUNT(*) FROM products WHERE product_type = ?");
    } elseif ($group === "industry") {
        $s = $pdo->prepare("SELECT COUNT(*) FROM products WHERE JSON_CONTAINS(industries, JSON_QUOTE(?))");
    } else {
        $s = $pdo->prepare("SELECT COUNT(*) FROM products WHERE JSON_CONTAINS(surfaces, JSON_QUOTE(?))");
    }
    $s->execute([$label]);
    return (int) $s->fetchColumn();
}

// Rewrite the matching product strings when a term is renamed. Single-value
// columns are a straight UPDATE; JSON arrays are rewritten in PHP (small set).
// $group is internal (never user input), so interpolating the column is safe.
function taxRenameProductValues($pdo, $group, $old, $new) {
    if ($old === $new) return;
    if ($group === "brand") {
        $pdo->prepare("UPDATE products SET brand = ? WHERE brand = ?")->execute([$new, $old]);
        return;
    }
    if ($group === "product_type") {
        $pdo->prepare("UPDATE products SET product_type = ? WHERE product_type = ?")->execute([$new, $old]);
        return;
    }
    $col = $group === "industry" ? "industries" : "surfaces";
    $sel = $pdo->prepare("SELECT id, $col AS arr FROM products WHERE JSON_CONTAINS($col, JSON_QUOTE(?))");
    $sel->execute([$old]);
    $upd = $pdo->prepare("UPDATE products SET $col = ? WHERE id = ?");
    foreach ($sel->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $arr = json_decode($r["arr"] ?? "[]", true);
        if (!is_array($arr)) continue;
        $arr = array_values(array_unique(array_map(function ($v) use ($old, $new) {
            return $v === $old ? $new : $v;
        }, $arr)));
        $upd->execute([json_encode($arr), $r["id"]]);
    }
}

function taxFetchTerm($pdo, $id) {
    $s = $pdo->prepare("SELECT * FROM taxonomy_terms WHERE id = ?");
    $s->execute([$id]);
    return $s->fetch(PDO::FETCH_ASSOC);
}

// ── GET ─────────────────────────────────────────────────────────────────────
if ($method === "GET") {
    $scope = $_GET["scope"] ?? "public";

    if ($scope === "admin") {
        requireAdmin($pdo);
        $usage = taxUsageMaps($pdo);
        $stmt  = $pdo->query("SELECT * FROM taxonomy_terms ORDER BY group_key, sort_order, label");
        $out   = ["product_type" => [], "brand" => [], "industry" => [], "surface" => []];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $t) {
            $g = $t["group_key"];
            if (!isset($out[$g])) continue;
            $out[$g][] = taxFormatRow($t, $usage[$g][$t["label"]] ?? 0);
        }
        echo json_encode($out);
        exit;
    }

    // public: non-archived terms only, minimal fields for the sidebar
    $stmt = $pdo->query("SELECT group_key, label, slug, logo_url, logo_alt, public_visible
                         FROM taxonomy_terms WHERE archived = 0
                         ORDER BY group_key, sort_order, label");
    $out = ["product_type" => [], "brand" => [], "industry" => [], "surface" => []];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $t) {
        $g = $t["group_key"];
        if (!isset($out[$g])) continue;
        $out[$g][] = [
            "label"   => $t["label"],
            "slug"    => $t["slug"],
            "logoUrl" => $t["logo_url"],
            "logoAlt" => $t["logo_alt"],
            "public"  => (int) $t["public_visible"] === 1,
        ];
    }
    echo json_encode($out);
    exit;
}

// ── POST: add a term (admin) ────────────────────────────────────────────────
if ($method === "POST") {
    requireAdmin($pdo);
    $data  = getJsonInput();
    $group = $data["groupKey"] ?? $data["group_key"] ?? "";
    $label = trim($data["label"] ?? "");

    if (!in_array($group, $GROUPS, true)) {
        http_response_code(400);
        echo json_encode(["message" => "Unknown filter group."]);
        exit;
    }
    if ($label === "") {
        http_response_code(400);
        echo json_encode(["message" => "A name is required."]);
        exit;
    }
    if (mb_strlen($label) > 120) {
        http_response_code(400);
        echo json_encode(["message" => "Name is too long (max 120 characters)."]);
        exit;
    }

    $slug = taxSlug($data["slug"] ?? $label);
    if ($slug === "") $slug = $group . "-" . substr(bin2hex(random_bytes(4)), 0, 8);

    $publicVisible = array_key_exists("publicVisible", $data) ? (int) (bool) $data["publicVisible"] : 1;
    $logoUrl = isset($data["logoUrl"]) && trim($data["logoUrl"]) !== "" ? trim($data["logoUrl"]) : null;
    $logoAlt = isset($data["logoAlt"]) && trim($data["logoAlt"]) !== "" ? trim($data["logoAlt"]) : null;

    $s = $pdo->prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM taxonomy_terms WHERE group_key = ?");
    $s->execute([$group]);
    $sortOrder = (int) $s->fetchColumn();

    try {
        $ins = $pdo->prepare("INSERT INTO taxonomy_terms
            (group_key, label, slug, logo_url, logo_alt, sort_order, public_visible, archived)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)");
        $ins->execute([$group, $label, $slug, $logoUrl, $logoAlt, $sortOrder, $publicVisible]);
    } catch (PDOException $e) {
        if ($e->getCode() === "23000") {
            http_response_code(409);
            echo json_encode(["message" => "That name or slug already exists in this group."]);
            exit;
        }
        error_log("taxonomies.php POST: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["message" => "Something went wrong. Please try again later."]);
        exit;
    }

    $row = taxFetchTerm($pdo, (int) $pdo->lastInsertId());
    http_response_code(201);
    echo json_encode(taxFormatRow($row, 0));
    exit;
}

// ── PUT / PATCH: rename / reorder / archive / logo / visibility (admin) ──────
if ($method === "PUT" || $method === "PATCH") {
    requireAdmin($pdo);
    $id   = (int) ($_GET["id"] ?? 0);
    $data = getJsonInput();

    if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "A term id is required."]);
        exit;
    }
    $cur = taxFetchTerm($pdo, $id);
    if (!$cur) {
        http_response_code(404);
        echo json_encode(["message" => "Filter value not found."]);
        exit;
    }
    $group = $cur["group_key"];

    // Slug is deliberately immutable after creation (keeps public URLs stable).
    $newLabel = array_key_exists("label", $data) ? trim($data["label"]) : $cur["label"];
    if ($newLabel === "") {
        http_response_code(400);
        echo json_encode(["message" => "A name is required."]);
        exit;
    }
    if (mb_strlen($newLabel) > 120) {
        http_response_code(400);
        echo json_encode(["message" => "Name is too long (max 120 characters)."]);
        exit;
    }
    $newSort     = array_key_exists("sortOrder", $data) ? (int) $data["sortOrder"] : (int) $cur["sort_order"];
    $newPublic   = array_key_exists("publicVisible", $data) ? (int) (bool) $data["publicVisible"] : (int) $cur["public_visible"];
    $newArchived = array_key_exists("archived", $data) ? (int) (bool) $data["archived"] : (int) $cur["archived"];
    $newLogoUrl  = array_key_exists("logoUrl", $data) ? (trim($data["logoUrl"]) !== "" ? trim($data["logoUrl"]) : null) : $cur["logo_url"];
    $newLogoAlt  = array_key_exists("logoAlt", $data) ? (trim($data["logoAlt"]) !== "" ? trim($data["logoAlt"]) : null) : $cur["logo_alt"];
    $labelChanged = ($newLabel !== $cur["label"]);

    $pdo->beginTransaction();
    try {
        $upd = $pdo->prepare("UPDATE taxonomy_terms
            SET label = ?, sort_order = ?, public_visible = ?, archived = ?, logo_url = ?, logo_alt = ?
            WHERE id = ?");
        $upd->execute([$newLabel, $newSort, $newPublic, $newArchived, $newLogoUrl, $newLogoAlt, $id]);
        if ($labelChanged) {
            taxRenameProductValues($pdo, $group, $cur["label"], $newLabel);
        }
        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();
        if ($e->getCode() === "23000") {
            http_response_code(409);
            echo json_encode(["message" => "Another value in this group already uses that name."]);
            exit;
        }
        error_log("taxonomies.php PATCH: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["message" => "Something went wrong. Please try again later."]);
        exit;
    }

    $row = taxFetchTerm($pdo, $id);
    echo json_encode(taxFormatRow($row, taxUsageCount($pdo, $group, $row["label"])));
    exit;
}

// ── DELETE: remove an unused term (admin) ───────────────────────────────────
if ($method === "DELETE") {
    requireAdmin($pdo);
    $id = (int) ($_GET["id"] ?? 0);
    if (!$id) {
        http_response_code(400);
        echo json_encode(["message" => "A term id is required."]);
        exit;
    }
    $cur = taxFetchTerm($pdo, $id);
    if (!$cur) {
        http_response_code(404);
        echo json_encode(["message" => "Filter value not found."]);
        exit;
    }

    $count = taxUsageCount($pdo, $cur["group_key"], $cur["label"]);
    if ($count > 0) {
        http_response_code(409);
        echo json_encode([
            "message"    => "\"{$cur['label']}\" is used by {$count} product(s). Archive it instead, or reassign those products first.",
            "usageCount" => $count,
        ]);
        exit;
    }

    $pdo->prepare("DELETE FROM taxonomy_terms WHERE id = ?")->execute([$id]);
    echo json_encode(["success" => true]);
    exit;
}

http_response_code(405);
echo json_encode(["message" => "Method not allowed."]);
