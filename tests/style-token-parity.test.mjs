// Home and About no longer have their own stylesheet. Their rules live in
// css/products.css scoped to .yl-static, because Swup never swaps <head>: any
// page loading a DIFFERENT stylesheet set renders unstyled the moment you
// arrive there by client-side navigation instead of a full load.
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(`../frontend/${p}`, import.meta.url), "utf8");
const products = read("css/products.css");

const PAGES = ["index.html", "about.html", "products.html", "product-detail.html",
               "compare.html", "enquiry.html", "contact.html", "404.html"];

function sheets(html) {
  return [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="(\/[^"]+)"/g)]
    .map((m) => m[1])
    .filter((h) => !h.startsWith("http"));
}

// Which pages Swup actually handles, read from the widget rather than repeated
// here, so adding a route to the SPA cannot silently escape this check.
const transitions = read("js/widgets/page-transitions.js");
const participating = JSON.parse(
  /PARTICIPATING\s*=\s*(\[[^\]]*\])/.exec(transitions)[1].replace(/'/g, '"'));

test("every Swup-handled page loads an identical set of local stylesheets", () => {
  // This is the invariant the Home/About bug violated. Swup swaps #swup only,
  // so the stylesheets from the FIRST page view are the only ones in effect.
  const swupPages = PAGES.filter((p) => participating.includes("/" + p.replace(/\.html$/, "").replace(/^index$/, "")));
  assert.ok(swupPages.length >= 7, `expected the SPA family, got ${swupPages.join(", ")}`);
  const bySheet = new Map();
  for (const p of swupPages) bySheet.set(p, sheets(read(p)).sort().join(" | "));
  const distinct = new Set(bySheet.values());
  assert.equal(distinct.size, 1,
    "pages disagree on stylesheets, so client-side navigation between them will render unstyled:\n  " +
    [...bySheet].map(([p, s]) => `${p.padEnd(20)} ${s}`).join("\n  "));
});

test("404 may carry an extra stylesheet only because Swup does not handle it", () => {
  // A full load always fetches the right <head>, so a non-participating page is
  // free to add its own sheet. If 404 ever joins the SPA this must be revisited.
  assert.ok(!participating.includes("/404"),
    "404 now participates in Swup, so 404.css must be loaded by every page too");
  assert.match(read("404.html"), /css\/404\.css/);
});

test("Home and About no longer load a separate styles.css", () => {
  for (const p of PAGES) {
    assert.doesNotMatch(read(p), /href="\/styles\.css/, `${p} still links the retired styles.css`);
  }
  assert.equal(fs.existsSync(new URL("../frontend/styles.css", import.meta.url)), false,
    "frontend/styles.css should be gone: its rules moved into products.css");
});

test("both static pages carry the .yl-static scope on <main>", () => {
  for (const p of ["index.html", "about.html"]) {
    assert.match(read(p), /<main id="mainContent" class="yl-static"/,
      `${p}: without this class none of the scoped rules apply`);
  }
  // and no product page may claim it, or the Home rules would leak in.
  for (const p of PAGES.filter((x) => !["index.html", "about.html"].includes(x))) {
    assert.doesNotMatch(read(p), /yl-static/, `${p} must not use the static-page scope`);
  }
});

test("every Home/About rule is scoped, so none of it reaches the product pages", () => {
  const block = products.slice(products.indexOf("/* =====\n"), products.length);
  const start = products.indexOf(".yl-static {");
  assert.ok(start > 0, "the scoped block is missing from products.css");
  const scoped = products.slice(start);
  const unscoped = [];
  for (const m of scoped.matchAll(/^(\.[a-z][^{]*)\{/gim)) {
    const sel = m[1].trim();
    // Every comma-separated part must mention the scope.
    for (const part of sel.split(",")) {
      if (part.trim() && !part.includes(".yl-static")) unscoped.push(part.trim());
    }
  }
  assert.deepEqual(unscoped, [],
    `these selectors would apply site-wide: ${unscoped.join(" | ")}`);
  void block;
});

test("the four shared class names are explicitly re-specified under the scope", () => {
  // .btn, .product-card, .product-card-image and .product-card-body mean
  // different things on the two sides. The scoped rule is one class more
  // specific and wins, but only for properties it actually sets, so the
  // catalogue's contained images and two-line clamped titles need resetting.
  const scoped = products.slice(products.indexOf(".yl-static {"));
  assert.match(scoped, /\.yl-static \.product-card-image img \{[^}]*object-fit:\s*cover/,
    "category photos must fill the well, not inherit the catalogue's contained treatment");
  assert.match(scoped, /\.yl-static \.product-card-image img \{[^}]*padding:\s*0/,
    "must reset the catalogue image padding");
  assert.match(scoped, /\.yl-static \.product-card-body h3 \{[^}]*-webkit-line-clamp:\s*none/,
    "category titles are one line and must not inherit the two-line clamp");
  assert.match(scoped, /\.yl-static \.product-card-body h3 \{[^}]*min-height:\s*0/,
    "must reset the reserved two-line title height");
});

test("no off-system colours in the scoped block", () => {
  const scoped = products.slice(products.indexOf(".yl-static {")).replace(/\/\*[\s\S]*?\*\//g, "");
  const banned = ["#c62828", "#d32f2f", "#a81f1f", "#8b0000", "#7a0f0f",
                  "#1f2937", "#111827", "#6b7280", "#9ca3af", "#4b5563",
                  "#d1d5db", "#f3f4f6", "#f8f9fa", "#e5e7eb"];
  const found = banned.filter((c) => scoped.toLowerCase().includes(c));
  assert.deepEqual(found, [], `off-system colours: ${found.join(", ")}`);
});

test("no invalid bare grid track values", () => {
  // `repeat(4, 1)` and `minmax(260px, 1)` are invalid: the browser drops the
  // whole declaration, which is why the stats band and Why Choose used to
  // render as a single stacked column.
  const scoped = products.slice(products.indexOf(".yl-static {")).replace(/\/\*[\s\S]*?\*\//g, "");
  const bad = [];
  for (const m of scoped.matchAll(/grid-template-columns\s*:\s*([^;]+);/g)) {
    const v = m[1].trim();
    if (/repeat\(\s*\d+\s*,\s*\d+\s*\)/.test(v) || /minmax\([^)]*,\s*\d+\s*\)/.test(v)) bad.push(v);
  }
  assert.deepEqual(bad, [], `invalid track values (missing fr): ${bad.join(" | ")}`);
});
