/**
 * Optional, manual, live check of the configured model. NOT part of the default
 * suite: `node --test tests/` ignores it because the filename is not *.test.mjs.
 *
 * It spends real tokens, so it only runs when you ask for it and only when a key
 * is present in the environment:
 *
 *   LLM_PROVIDER=gemini LLM_API_KEY=... node tests/product-advisor-live-provider.manual.mjs
 *
 * It sends one neutral catalogue question, uses no customer data, submits no
 * enquiry, and touches no database. It prints whether the call connected,
 * whether the reply matched the schema and whether it survived catalogue
 * validation. It never prints the key or the request headers.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const advisorAiPath = fileURLToPath(
  new URL("../frontend/api/advisor_ai.php", import.meta.url)
);

const backend = (process.env.LLM_PROVIDER || "").trim();
const apiKey = (process.env.LLM_API_KEY || "").trim();
const model = (process.env.LLM_MODEL || "").trim();
const baseUrl = (process.env.LLM_BASE_URL || "").trim();

if (!backend || !apiKey) {
  console.log(
    "SKIPPED: set LLM_PROVIDER and LLM_API_KEY to run the live check. " +
      "Nothing was sent and no tokens were spent."
  );
  process.exit(0);
}

const catalogue = [
  {
    id: 14,
    name: "Deer Brand PVA",
    brand: "Deer Brand",
    category: "Industrial",
    short_description: "A water-based PVAC adhesive used for wood-to-wood bonding.",
    usage_text: "Apply by brush or roll. Suitable for: Wood to wood bonding; Paper; Cloth.",
    industries: ["Carpentry"],
    surfaces: ["Paper", "Wallpaper", "Wood"],
    features: ["Water-based", "Application: Brush or Roll"],
    status: "Available",
  },
  {
    id: 3,
    name: "Deer Brand 212",
    brand: "Deer Brand",
    category: "Industrial",
    short_description: "A heavy-duty solvent-based adhesive for tiles, stones and metals.",
    usage_text: "Apply by brush or roll. Suitable for: Tile bonding; Metal bonding.",
    industries: ["Flooring"],
    surfaces: ["Metal", "Stone Ceramics", "Tiles"],
    features: ["Solvent-based", "Water resistant"],
    status: "Available",
  },
];

const driver = `
$payload = json_decode(base64_decode($argv[1] ?? ""), true);
require_once $payload["aiPath"];

$runner = advisorAiRunner([
    "backend" => $payload["backend"],
    "apiKey"  => $payload["apiKey"],
    "model"   => $payload["model"],
    "baseUrl" => $payload["baseUrl"],
]);

$started = microtime(true);
$result = $runner([
    "messages" => [["role" => "user", "content" => $payload["prompt"]]],
    "language" => $payload["language"],
    "query" => $payload["prompt"],
    "intent" => "product_recommendation",
    "products" => $payload["products"],
    "documentFlags" => [],
]);

echo json_encode([
    "attempted" => $result !== false,
    "validated" => is_array($result),
    "elapsedMs" => (int) round((microtime(true) - $started) * 1000),
    "result" => is_array($result) ? $result : null,
    "status" => advisorAiStatus([
        "backend" => $payload["backend"],
        "apiKey"  => $payload["apiKey"],
        "model"   => $payload["model"],
    ]),
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
`;

function run(language, prompt) {
  const payload = {
    aiPath: advisorAiPath,
    backend,
    apiKey,
    model,
    baseUrl,
    language,
    prompt,
    products: catalogue,
  };

  const result = spawnSync(
    "php",
    ["-r", driver, Buffer.from(JSON.stringify(payload), "utf8").toString("base64")],
    { encoding: "utf8", maxBuffer: 4 * 1024 * 1024, windowsHide: true }
  );

  if (result.status !== 0) {
    // stderr can carry a logged failure reason, but never the key.
    return { error: (result.stderr || "").replace(apiKey, "[redacted]").trim() };
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    return { error: "PHP produced unreadable output" };
  }
}

const cases = [
  ["en", "I need an adhesive for bonding wood to wood on a cabinet door."],
  ["zh", "我需要一款用于木材与木材粘合的胶水。"],
];

let failures = 0;
for (const [language, prompt] of cases) {
  const outcome = run(language, prompt);
  console.log(`\n--- ${language} ---`);

  if (outcome.error) {
    console.log(`FAIL  could not run: ${outcome.error}`);
    failures += 1;
    continue;
  }

  console.log(`backend       : ${outcome.status.backend}`);
  console.log(`model         : ${outcome.status.model}`);
  console.log(`key present   : ${outcome.status.hasKey ? "yes" : "no"}`);
  console.log(`request made  : ${outcome.attempted ? "yes" : "no"}`);
  console.log(`elapsed       : ${outcome.elapsedMs} ms`);
  console.log(`schema + validation: ${outcome.validated ? "PASSED" : "FAILED"}`);

  if (!outcome.validated) {
    console.log("The reply did not connect, did not match the schema, or did not");
    console.log("survive catalogue validation. See the server log for the reason.");
    failures += 1;
    continue;
  }

  const ids = outcome.result.recommendations.map((item) => item.id);
  console.log(`grounded ids  : ${ids.length ? ids.join(", ") : "(none, clarification)"}`);
  console.log(`intent        : ${outcome.result.intent}`);
  console.log(`reply         : ${outcome.result.message}`);

  const leaked = JSON.stringify(outcome.result).includes(apiKey);
  console.log(`key leaked    : ${leaked ? "YES - INVESTIGATE" : "no"}`);
  if (leaked) failures += 1;
}

console.log(`\n${failures === 0 ? "All live checks passed." : `${failures} live check(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
