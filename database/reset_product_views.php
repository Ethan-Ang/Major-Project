<?php
/**
 * Product Analytics retention: archive and clear the `product_views` table.
 *
 * Yee Lim keep one row per product-detail view (api/track_view.php). That table
 * only grows, so the dashboard's "last 30 days" chart gets slower and the data
 * accumulates indefinitely. This trims it on a schedule, e.g. once a year.
 *
 * It ALWAYS writes a CSV archive before deleting anything, so a wipe is
 * recoverable. Nothing else reads or writes `product_views`, so clearing it
 * affects only the Product Analytics page and the dashboard card.
 *
 * USAGE (CLI only; it refuses to run over the web):
 *
 *   php database/reset_product_views.php                  # dry run, changes nothing
 *   php database/reset_product_views.php --apply          # archive, then delete everything
 *   php database/reset_product_views.php --apply --older-than=365
 *                                                         # keep the last 365 days
 *   php database/reset_product_views.php --apply --no-archive
 *                                                         # skip the CSV (not advised)
 *
 * Dry run is the default on purpose: running it with no arguments tells you what
 * WOULD happen and deletes nothing.
 *
 * cPanel Cron Jobs, 1st of January at 03:00 each year:
 *   0 3 1 1 * /usr/local/bin/php /home/USERNAME/database/reset_product_views.php --apply
 * (Check the PHP path under cPanel > Cron Jobs, and use the absolute path to
 * this file. Put the script OUTSIDE public_html so it is never web-reachable.)
 */

if (PHP_SAPI !== "cli") {
    http_response_code(404);
    exit;
}

// The repo keeps the API under frontend/api/, but the live cPanel account is
// chrooted to the web root, where the same file sits at api/config.php with no
// frontend/ level at all. Try both rather than assuming a layout, and say which
// one was used so a cron log makes the failure obvious if neither is found.
$root = dirname(__DIR__);
$configCandidates = [
    $root . "/frontend/api/config.php",  // repo / local checkout
    $root . "/api/config.php",           // live web root
    __DIR__ . "/../api/config.php",      // script sitting beside api/
];
$configPath = null;
foreach ($configCandidates as $candidate) {
    if (is_file($candidate)) { $configPath = $candidate; break; }
}
if ($configPath === null) {
    fwrite(STDERR, "Could not find config.php. Looked in:\n  " . implode("\n  ", $configCandidates) . "\n");
    exit(1);
}
require $configPath;

// ─── Arguments ────────────────────────────────────────────────────
$apply     = in_array("--apply", $argv, true);
$noArchive = in_array("--no-archive", $argv, true);

$olderThan = null;
foreach ($argv as $arg) {
    if (preg_match('/^--older-than=(\d+)$/', $arg, $m)) {
        $olderThan = (int) $m[1];
    }
}

$archiveDir = $root . "/database/analytics_archive";

echo "Product Analytics retention\n";
echo "  mode      : " . ($apply ? "APPLY (will delete)" : "dry run (no changes)") . "\n";
echo "  scope     : " . ($olderThan === null
    ? "every recorded view"
    : "views older than {$olderThan} day(s)") . "\n";
echo "  archive   : " . ($noArchive ? "skipped" : $archiveDir) . "\n\n";

$pdo = new PDO(
    "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4",
    DB_USER, DB_PASS,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

// The table is created by a migration; say so plainly rather than fataling.
$exists = $pdo->query("SHOW TABLES LIKE 'product_views'")->fetchColumn();
if (!$exists) {
    echo "Table `product_views` does not exist. Nothing to do.\n";
    exit(0);
}

$where  = $olderThan === null ? "" : " WHERE viewed_at < (NOW() - INTERVAL ? DAY)";
$params = $olderThan === null ? [] : [$olderThan];

$countStmt = $pdo->prepare("SELECT COUNT(*) FROM product_views" . $where);
$countStmt->execute($params);
$affected = (int) $countStmt->fetchColumn();

$total = (int) $pdo->query("SELECT COUNT(*) FROM product_views")->fetchColumn();
$range = $pdo->query("SELECT MIN(viewed_at) AS a, MAX(viewed_at) AS b FROM product_views")
             ->fetch(PDO::FETCH_ASSOC);

echo "  rows in table   : {$total}\n";
echo "  rows in scope   : {$affected}\n";
echo "  date range      : " . ($range["a"] ?: "n/a") . "  ->  " . ($range["b"] ?: "n/a") . "\n";
echo "  rows kept       : " . ($total - $affected) . "\n\n";

if ($affected === 0) {
    echo "Nothing matches. No changes made.\n";
    exit(0);
}

if (!$apply) {
    echo "Dry run only. Re-run with --apply to archive and delete these rows.\n";
    exit(0);
}

// ─── Archive first ────────────────────────────────────────────────
if (!$noArchive) {
    if (!is_dir($archiveDir) && !mkdir($archiveDir, 0775, true) && !is_dir($archiveDir)) {
        fwrite(STDERR, "Could not create {$archiveDir}. Aborting without deleting.\n");
        exit(1);
    }

    $file = $archiveDir . "/product_views_" . date("Y-m-d_His") . ".csv";
    $out  = fopen($file, "w");
    if (!$out) {
        fwrite(STDERR, "Could not open {$file} for writing. Aborting without deleting.\n");
        exit(1);
    }

    fputcsv($out, ["id", "product_id", "product_name", "session_hash", "viewed_at"]);

    // Join the name in so the archive stays readable after a product is renamed
    // or deleted. Streamed rather than fetchAll, so a large table cannot exhaust
    // memory mid-archive and leave a truncated file behind.
    $sel = $pdo->prepare("
        SELECT v.id, v.product_id, p.name AS product_name, v.session_hash, v.viewed_at
        FROM product_views v
        LEFT JOIN products p ON p.id = v.product_id
        " . ($olderThan === null ? "" : "WHERE v.viewed_at < (NOW() - INTERVAL ? DAY)") . "
        ORDER BY v.id
    ");
    $sel->execute($params);

    $written = 0;
    while ($row = $sel->fetch(PDO::FETCH_ASSOC)) {
        fputcsv($out, [
            $row["id"], $row["product_id"], $row["product_name"],
            $row["session_hash"], $row["viewed_at"],
        ]);
        $written++;
    }
    fclose($out);

    if ($written !== $affected) {
        fwrite(STDERR, "Archived {$written} rows but expected {$affected}. Aborting without deleting.\n");
        exit(1);
    }
    echo "  archived {$written} row(s) -> {$file}\n";
}

// ─── Delete ───────────────────────────────────────────────────────
$del = $pdo->prepare("DELETE FROM product_views" . $where);
$del->execute($params);
$deleted = $del->rowCount();

$remaining = (int) $pdo->query("SELECT COUNT(*) FROM product_views")->fetchColumn();

// A full wipe resets the auto-increment so ids start at 1 again. Only safe when
// the table is genuinely empty; a partial trim keeps its numbering.
if ($remaining === 0) {
    $pdo->exec("ALTER TABLE product_views AUTO_INCREMENT = 1");
    echo "  table emptied, id counter reset\n";
}

echo "  deleted {$deleted} row(s), {$remaining} remaining\n";
echo "\nDone.\n";
