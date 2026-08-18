<?php
/**
 * Structured product fields (Plan C).
 *
 * The catalogue historically stored two overloaded strings:
 *
 *   features    a JSON array mixing four different kinds of value, told apart
 *               only by magic prefixes: "Application: ...", "Available in ...",
 *               "Solvent-based", and everything else.
 *   usage_text  one string whose meaning changes at the literal words
 *               "Suitable for:", with the list after it delimited by semicolons.
 *
 * Both are now mirrored into real columns. These helpers convert between the two
 * shapes so the legacy columns can be kept byte-identical to what they have
 * always held. That is deliberate and load-bearing: the product advisor
 * (api/advisor_ai.php) and the Ava chatbot read `features` / `usage_text` as a
 * flat bag of words, and the search LIKE clauses in api/products.php read them
 * too. They are never dropped and never emptied.
 *
 * The rules below mirror js/pages/product-detail.js exactly. Change one, change
 * both, or the round trip stops being lossless.
 */

/** A value the admin may leave as a placeholder ("x", "-", "n/a") is not real. */
function pfIsMeaningful($value)
{
    $t = trim((string) $value);
    if ($t === "") return false;
    return !preg_match('/^(x+|-+|n\/?a|nil|none|tbc|tbd|\.)$/i', $t);
}

/** Mirrors deriveKeyBenefits() in product-detail.js. */
function pfIsKeyBenefit($feature)
{
    $f = trim((string) $feature);
    if ($f === "") return false;
    if (preg_match('/^application\s*:/i', $f)) return false;
    if (preg_match('/^available in\s+/i', $f)) return false;
    if (preg_match('/^(solvent|water)[\s-]*based$/i', $f)) return false;
    if (preg_match('/^(liquid|paste|gel|aerosol|powder|cream|semi[-\s]?solid|solid)\b/i', $f)) return false;
    if (preg_match('/^[\d\s.\/-]+\s*(kg|g|ml|l|litre|liter|us\s*gal(?:lon)?|gal(?:lon)?|oz|lb)s?$/i', $f)) return false;
    if (preg_match('/^(yellow|white|clear|amber|black|red|blue|green|brown|grey|gray|beige|transparent|off[-\s]?white|cream|natural|colou?rless)$/i', $f)) return false;
    return true;
}

/** Mirrors splitSuitableUses() in product-detail.js. Never fabricates items. */
function pfSplitSuitableUses($raw)
{
    $text = preg_replace('/[.\s]+$/u', "", trim((string) $raw));
    if ($text === "" || $text === null) return [];

    $parts = preg_split('/\s*[;•·|\n]+\s*/u', $text);
    $parts = array_values(array_filter(array_map(function ($s) {
        return preg_replace('/\.$/', "", trim($s));
    }, $parts), function ($s) { return $s !== ""; }));
    if (count($parts) >= 2) return $parts;

    // A clean comma list: 3+ commas and every segment short. Prose that merely
    // contains a comma must not be split, or the page invents product claims.
    if (substr_count($text, ",") >= 2) {
        $cs = array_values(array_filter(array_map("trim", explode(",", $text)),
            function ($s) { return $s !== ""; }));
        $allShort = true;
        foreach ($cs as $s) { if (mb_strlen($s) > 34) { $allShort = false; break; } }
        if (count($cs) >= 2 && $allShort) return $cs;
    }
    return [$text];
}

/**
 * Legacy columns -> structured fields.
 *
 * @param array  $features   the stored features array
 * @param string $usageText  the stored usage_text
 */
function pfDecompose($features, $usageText)
{
    $baseType = "";
    $applicationMethod = "";
    $availableSizes = "";
    $characteristics = [];
    $keyBenefits = [];

    foreach ((array) $features as $raw) {
        $f = trim((string) $raw);
        if ($f === "") continue;

        if (preg_match('/^application\s*:\s*(.+)$/i', $f, $m)) {
            if ($applicationMethod === "") $applicationMethod = trim($m[1]);
            continue;
        }
        if (preg_match('/^available in\s+(.+)$/i', $f, $m)) {
            if ($availableSizes === "") $availableSizes = trim($m[1]);
            continue;
        }
        if (preg_match('/^(solvent|water)[\s-]*based$/i', $f)) {
            if ($baseType === "") $baseType = $f;
            continue;
        }
        // Everything else is a characteristic (physical form, colour) or a real
        // claim. The same filter the detail page uses decides which, so the two
        // lists are disjoint instead of one being a superset of the other. That
        // is what stops a value printing twice under two different headings.
        if (pfIsKeyBenefit($f)) $keyBenefits[] = $f;
        else $characteristics[] = $f;
    }

    $usage = (string) $usageText;
    $howToUse = trim($usage);
    $suitableUses = [];
    if (preg_match('/suitable for\s*:\s*/i', $usage, $m, PREG_OFFSET_CAPTURE)) {
        $at = $m[0][1];
        $howToUse = trim(substr($usage, 0, $at));
        $suitableUses = pfSplitSuitableUses(substr($usage, $at + strlen($m[0][0])));
    }

    return [
        "base_type"          => $baseType,
        "application_method" => $applicationMethod,
        "available_sizes"    => $availableSizes,
        "characteristics"    => $characteristics,
        "key_benefits"       => $keyBenefits,
        "how_to_use"         => $howToUse,
        "suitable_uses"      => $suitableUses,
    ];
}

/**
 * Structured fields -> legacy columns.
 *
 * Ordering matches how the catalogue has always been written (base, application
 * method, characteristics, sizes, then claims) so recomposing an untouched
 * product reproduces its stored `features` array exactly.
 */
function pfCompose($fields)
{
    $features = [];

    $base = trim((string) ($fields["base_type"] ?? ""));
    if ($base !== "") $features[] = $base;

    $method = trim((string) ($fields["application_method"] ?? ""));
    if ($method !== "") $features[] = "Application: " . $method;

    foreach ((array) ($fields["characteristics"] ?? []) as $c) {
        $c = trim((string) $c);
        if ($c !== "") $features[] = $c;
    }

    $sizes = trim((string) ($fields["available_sizes"] ?? ""));
    if ($sizes !== "") $features[] = "Available in " . $sizes;

    foreach ((array) ($fields["key_benefits"] ?? []) as $b) {
        $b = trim((string) $b);
        if ($b !== "") $features[] = $b;
    }

    $howToUse = trim((string) ($fields["how_to_use"] ?? ""));
    $uses = [];
    foreach ((array) ($fields["suitable_uses"] ?? []) as $u) {
        $u = trim((string) $u);
        if ($u !== "") $uses[] = $u;
    }

    $usageText = $howToUse;
    if (count($uses)) {
        $tail = "Suitable for: " . implode("; ", $uses) . ".";
        $usageText = $howToUse === "" ? $tail : rtrim($howToUse) . " " . $tail;
    }

    return ["features" => $features, "usage_text" => $usageText];
}
