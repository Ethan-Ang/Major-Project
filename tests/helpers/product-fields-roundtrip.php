<?php
/**
 * Round-trip harness for api/product_fields.php.
 *
 * Reads products as JSON on stdin ([{name, features, usage}, ...]), decomposes
 * each into the structured fields the admin form edits, recomposes the legacy
 * `features` / `usage_text` values from them, and reports any product that does
 * not come back byte-identical.
 *
 * Exits 0 when every product round-trips losslessly. Used by
 * tests/product-fields.test.mjs.
 */

require dirname(__DIR__, 2) . "/frontend/api/product_fields.php";

$products = json_decode(stream_get_contents(STDIN), true);
if (!is_array($products)) {
    fwrite(STDERR, "expected a JSON array on stdin\n");
    exit(2);
}

$failures = [];

foreach ($products as $p) {
    $name = (string) ($p["name"] ?? "?");
    $features = array_values((array) ($p["features"] ?? []));
    $usage = trim((string) ($p["usage"] ?? ""));

    $fields = pfDecompose($features, $usage);
    $back = pfCompose($fields);

    if (json_encode($back["features"]) !== json_encode($features)) {
        $failures[] = "features $name\n    stored: " . json_encode($features)
                    . "\n    rebuilt: " . json_encode($back["features"]);
    }
    if ($back["usage_text"] !== $usage) {
        $failures[] = "usage $name\n    stored: " . json_encode($usage)
                    . "\n    rebuilt: " . json_encode($back["usage_text"]);
    }

    // Characteristics and Key Benefits must be disjoint, or a value prints
    // twice on the product page under two different headings.
    $both = array_intersect($fields["characteristics"], $fields["key_benefits"]);
    if (count($both)) {
        $failures[] = "overlap $name -> " . json_encode(array_values($both));
    }
}

echo json_encode([
    "tested" => count($products),
    "failures" => $failures,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";

exit(count($failures) === 0 ? 0 : 1);
