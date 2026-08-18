<?php
/**
 * Plan C, Phases 1 and 2: add the structured product columns and backfill them
 * from the legacy `features` / `usage_text` values.
 *
 * CLI only. Idempotent: existing columns are left alone, and the backfill is
 * derived entirely from the legacy columns, which it never modifies. Running it
 * twice is a no-op.
 *
 *   php database/apply_product_fields.php            # schema + backfill + verify
 *   php database/apply_product_fields.php --verify   # verify only, no writes
 *
 * See docs/superpowers/plans/2026-08-18-product-fields-restructure-plan.md
 */

if (PHP_SAPI !== "cli") { http_response_code(404); exit; }

$root = dirname(__DIR__);
require $root . "/frontend/api/config.php";
require $root . "/frontend/api/product_fields.php";

$verifyOnly = in_array("--verify", $argv, true);

$pdo = new PDO(
    "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4",
    DB_USER, DB_PASS,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$columns = [
    "base_type"          => "VARCHAR(32)  NULL AFTER product_type",
    "application_method" => "VARCHAR(255) NULL AFTER base_type",
    "available_sizes"    => "VARCHAR(255) NULL AFTER application_method",
    "characteristics"    => "JSON         NULL AFTER features",
    "key_benefits"       => "JSON         NULL AFTER characteristics",
    "how_to_use"         => "TEXT         NULL AFTER usage_text",
    "suitable_uses"      => "JSON         NULL AFTER how_to_use",
];

// ─── Phase 1: schema ──────────────────────────────────────────────
$existing = [];
foreach ($pdo->query("SHOW COLUMNS FROM products")->fetchAll(PDO::FETCH_ASSOC) as $c) {
    $existing[$c["Field"]] = true;
}

$added = [];
foreach ($columns as $name => $ddl) {
    if (isset($existing[$name])) continue;
    if ($verifyOnly) { echo "MISSING COLUMN: $name\n"; continue; }
    $pdo->exec("ALTER TABLE products ADD COLUMN `$name` $ddl");
    $added[] = $name;
}
echo $verifyOnly
    ? "schema check done\n"
    : "columns added: " . ($added ? implode(", ", $added) : "none (already present)") . "\n";

if ($verifyOnly && count(array_diff(array_keys($columns), array_keys($existing)))) {
    echo "run without --verify to add them\n";
    exit(1);
}

// ─── Phase 2: backfill ────────────────────────────────────────────
$rows = $pdo->query("SELECT id, name, features, usage_text FROM products ORDER BY id")
            ->fetchAll(PDO::FETCH_ASSOC);

$update = $pdo->prepare("
    UPDATE products SET
        base_type = ?, application_method = ?, available_sizes = ?,
        characteristics = ?, key_benefits = ?, how_to_use = ?, suitable_uses = ?
    WHERE id = ?
");

$written = 0;
$failures = [];

foreach ($rows as $row) {
    $features = json_decode($row["features"] ?? "[]", true);
    if (!is_array($features)) $features = [];
    $usage = (string) ($row["usage_text"] ?? "");

    $f = pfDecompose($features, $usage);

    // Never write a backfill that would not recompose to what is already stored.
    $back = pfCompose($f);
    if (json_encode($back["features"]) !== json_encode(array_values($features))
        || $back["usage_text"] !== trim($usage)) {
        $failures[] = "#" . $row["id"] . " " . $row["name"];
        continue;
    }

    if (!$verifyOnly) {
        $update->execute([
            $f["base_type"] !== "" ? $f["base_type"] : null,
            $f["application_method"] !== "" ? $f["application_method"] : null,
            $f["available_sizes"] !== "" ? $f["available_sizes"] : null,
            json_encode($f["characteristics"], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            json_encode($f["key_benefits"], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            $f["how_to_use"] !== "" ? $f["how_to_use"] : null,
            json_encode($f["suitable_uses"], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            $row["id"],
        ]);
        $written++;
    }
}

echo "products examined : " . count($rows) . "\n";
echo ($verifyOnly ? "would write       : " : "rows backfilled   : ")
     . ($verifyOnly ? (count($rows) - count($failures)) : $written) . "\n";
echo "recompose failures: " . count($failures)
     . ($failures ? " -> " . implode(", ", $failures) : "") . "\n";

// ─── Verification: the legacy columns must be untouched and reproducible ──
$check = $pdo->query("
    SELECT id, name, features, usage_text, base_type, application_method, available_sizes,
           characteristics, key_benefits, how_to_use, suitable_uses
    FROM products ORDER BY id
")->fetchAll(PDO::FETCH_ASSOC);

$bad = [];
foreach ($check as $row) {
    $stored = json_decode($row["features"] ?? "[]", true);
    if (!is_array($stored)) $stored = [];

    $back = pfCompose([
        "base_type"          => $row["base_type"],
        "application_method" => $row["application_method"],
        "available_sizes"    => $row["available_sizes"],
        "characteristics"    => json_decode($row["characteristics"] ?? "[]", true) ?: [],
        "key_benefits"       => json_decode($row["key_benefits"] ?? "[]", true) ?: [],
        "how_to_use"         => $row["how_to_use"],
        "suitable_uses"      => json_decode($row["suitable_uses"] ?? "[]", true) ?: [],
    ]);

    if (json_encode($back["features"]) !== json_encode(array_values($stored))
        || $back["usage_text"] !== trim((string) $row["usage_text"])) {
        $bad[] = "#" . $row["id"] . " " . $row["name"];
    }
}

echo "columns recompose to legacy: " . (count($check) - count($bad)) . "/" . count($check)
     . ($bad ? "  MISMATCH: " . implode(", ", $bad) : "  OK") . "\n";

exit(count($bad) === 0 && count($failures) === 0 ? 0 : 1);
