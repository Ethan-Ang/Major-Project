<?php
require_once "db.php";
require_once "auth.php";

/* ─────────────────────────────────────────────────────────────
   Analytics aggregator (admin-only, Feature 2). GET returns:
     topProducts   — most-viewed products, last 30 days
     viewsTrend    — daily view counts, last 14 days
     categoryViews — views grouped by product category, last 30 days
     conversion    — 30d views vs enquiries + a simple rate
   Tolerates the product_views table not existing yet (returns zeros).
   ───────────────────────────────────────────────────────────── */

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    http_response_code(405);
    echo json_encode(["message" => "Method not allowed."]);
    exit;
}
requireAdmin($pdo);

try {
    // Most-viewed products, last 30 days.
    $top = $pdo->query("
        SELECT p.id, p.name, p.category, COUNT(pv.id) AS views
        FROM product_views pv JOIN products p ON p.id = pv.product_id
        WHERE pv.viewed_at >= (NOW() - INTERVAL 30 DAY)
        GROUP BY p.id, p.name, p.category
        ORDER BY views DESC LIMIT 8
    ")->fetchAll(PDO::FETCH_ASSOC);

    // Daily view counts for the last 14 days (client fills the gaps).
    $trend = $pdo->query("
        SELECT DATE(viewed_at) AS d, COUNT(*) AS views
        FROM product_views WHERE viewed_at >= (NOW() - INTERVAL 14 DAY)
        GROUP BY DATE(viewed_at) ORDER BY d ASC
    ")->fetchAll(PDO::FETCH_ASSOC);

    // Views grouped by category (30d).
    $byCat = $pdo->query("
        SELECT p.category, COUNT(pv.id) AS views
        FROM product_views pv JOIN products p ON p.id = pv.product_id
        WHERE pv.viewed_at >= (NOW() - INTERVAL 30 DAY)
        GROUP BY p.category ORDER BY views DESC
    ")->fetchAll(PDO::FETCH_ASSOC);

    $totalViews = (int) $pdo->query("SELECT COUNT(*) FROM product_views WHERE viewed_at >= (NOW() - INTERVAL 30 DAY)")->fetchColumn();
    $totalEnq   = (int) $pdo->query("SELECT COUNT(*) FROM enquiries WHERE created_at >= (NOW() - INTERVAL 30 DAY)")->fetchColumn();

    echo json_encode([
        "topProducts"   => array_map(function ($r) {
            return ["id" => (int)$r["id"], "name" => $r["name"], "category" => $r["category"], "views" => (int)$r["views"]];
        }, $top),
        "viewsTrend"    => array_map(function ($r) {
            return ["date" => $r["d"], "views" => (int)$r["views"]];
        }, $trend),
        "categoryViews" => array_map(function ($r) {
            return ["category" => $r["category"], "views" => (int)$r["views"]];
        }, $byCat),
        "conversion"    => [
            "views"     => $totalViews,
            "enquiries" => $totalEnq,
            "rate"      => $totalViews ? round(($totalEnq / $totalViews) * 100, 1) : 0,
        ],
    ]);
} catch (PDOException $e) {
    // Most likely the product_views table has not been created yet on this host.
    error_log("analytics.php: " . $e->getMessage());
    echo json_encode([
        "topProducts"   => [],
        "viewsTrend"    => [],
        "categoryViews" => [],
        "conversion"    => ["views" => 0, "enquiries" => 0, "rate" => 0],
        "note"          => "Analytics tables not initialised.",
    ]);
}
