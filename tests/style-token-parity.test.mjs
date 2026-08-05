// Home and About have their own stylesheet but must not have their own design
// system. styles.css mirrors the token block from css/products.css; this fails
// if the two ever disagree, which is the only way the seam can come back.
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(`../frontend/${p}`, import.meta.url), "utf8");
const products = read("css/products.css");
const styles = read("styles.css");

function tokens(css) {
  // Comments must go FIRST. products.css explains why --error is not --red, and
  // that prose contains a literal "--red:" which otherwise parses as a token
  // whose value runs to the end of the sentence.
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const root = /:root\s*\{([\s\S]*?)\n\}/.exec(clean);
  assert.ok(root, "no :root block found");
  const out = new Map();
  for (const m of root[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    // Collapse spacing so `rgba(32, 30, 24, .05)` and `rgba(32,30,24,.05)`
    // compare equal. We are guarding the design, not the formatting.
    out.set(m[1], m[2].trim().toLowerCase().replace(/\s+/g, ""));
  }
  return out;
}

const canonical = tokens(products);
const mirrored = tokens(styles);

test("every token Home/About mirrors has the same value in products.css", () => {
  // styles.css only needs the subset it uses, and may add its own layout-only
  // tokens (--shell, --gutter). But any name shared with products.css has to
  // carry the identical value.
  const drift = [];
  for (const [name, value] of mirrored) {
    if (!canonical.has(name)) continue;
    if (canonical.get(name) !== value) {
      drift.push(`${name}: styles.css=${value}  products.css=${canonical.get(name)}`);
    }
  }
  assert.deepEqual(drift, [], `design tokens have drifted:\n  ${drift.join("\n  ")}`);
});

test("the tokens Home/About actually need are all mirrored", () => {
  const needed = ["--red", "--ink", "--bg", "--card", "--border", "--text", "--muted", "--radius"];
  const missing = needed.filter((n) => !mirrored.has(n));
  assert.deepEqual(missing, [], `styles.css is missing: ${missing.join(", ")}`);
});

test("no off-system colours are left in styles.css", () => {
  // The old palette: #c62828/#d32f2f/#a81f1f reds that are not the brand red,
  // the #1f2937/#111827 navies, and the cool greys.
  const banned = ["#c62828", "#d32f2f", "#a81f1f", "#8b0000", "#7a0f0f",
                  "#1f2937", "#111827", "#6b7280", "#9ca3af", "#4b5563",
                  "#d1d5db", "#f3f4f6", "#f8f9fa", "#e5e7eb"];
  const body = styles.replace(/\/\*[\s\S]*?\*\//g, "");   // comments name them on purpose
  const found = banned.filter((c) => body.toLowerCase().includes(c));
  assert.deepEqual(found, [], `off-system colours still present: ${found.join(", ")}`);
});

test("no invalid bare grid track values", () => {
  // `repeat(4, 1)` and `minmax(260px, 1)` are invalid: the whole declaration is
  // dropped, which is why the stats band and Why Choose used to render as a
  // single stacked column.
  const body = styles.replace(/\/\*[\s\S]*?\*\//g, "");
  const bad = [];
  for (const m of body.matchAll(/grid-template-columns\s*:\s*([^;]+);/g)) {
    const v = m[1].trim();
    if (/repeat\(\s*\d+\s*,\s*\d+\s*\)/.test(v) ||
        /minmax\([^)]*,\s*\d+\s*\)/.test(v) ||
        /^\d+(\s+\d+)*$/.test(v)) bad.push(v);
  }
  assert.deepEqual(bad, [], `invalid track values (missing fr): ${bad.join(" | ")}`);
});

test("styles.css only styles selectors Home/About actually use", () => {
  const pages = read("index.html") + read("about.html");
  const body = styles.replace(/\/\*[\s\S]*?\*\//g, "");
  // Top-level class selectors this stylesheet defines.
  const defined = new Set();
  for (const m of body.matchAll(/^\.([a-z][a-z0-9-]*)/gim)) defined.add(m[1]);
  const orphans = [...defined].filter((c) => !pages.includes(`"${c}"`) && !pages.includes(`${c} `) && !pages.includes(` ${c}"`));
  assert.deepEqual(orphans, [],
    `styles.css carries rules for classes neither page uses: ${orphans.join(", ")}`);
});
