/**
 * Guards the Enquiry page against the old implementation coming back.
 *
 * Investigation (2026-08-05): the legacy page was reported as appearing
 * intermittently. It is not present in any served artefact -- not in the repo,
 * not in the live HTML, and not in the live enquiry.js. What remains is the
 * risk of it being reintroduced, plus the structural properties that make the
 * page correct with zero products. Both are asserted here.
 *
 * The legacy markers are taken from the reported symptoms: a "Product Enquiry"
 * page title, "No products selected yet", a shopping-cart icon, a solid-red
 * Browse Products primary CTA, and a form that disappears when nothing is
 * attached.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const FRONTEND_DIR = fileURLToPath(new URL("../frontend", import.meta.url));
const enquiryHtml = fs.readFileSync(path.join(FRONTEND_DIR, "enquiry.html"), "utf8");
const enquiryJs = fs.readFileSync(path.join(FRONTEND_DIR, "js/pages/enquiry.js"), "utf8");
const i18nJs = fs.readFileSync(path.join(FRONTEND_DIR, "js/i18n.js"), "utf8");

/** Strips HTML comments, so an explanatory note is not read as page copy. */
function visibleMarkup(source) {
  return source.replace(/<!--[\s\S]*?-->/g, " ");
}

/** Strips // and /* *\/ comments, so a note about the old design is allowed. */
function executableJs(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}

const LEGACY_STRINGS = [
  "No products selected yet",
  "Browse the catalogue and add adhesives",
  "Review your selected products",
];

test("no legacy Enquiry copy survives in the shipped page or its controller", () => {
  for (const legacy of LEGACY_STRINGS) {
    assert.ok(!visibleMarkup(enquiryHtml).includes(legacy), `enquiry.html still contains "${legacy}"`);
    assert.ok(!executableJs(enquiryJs).includes(legacy), `enquiry.js still contains "${legacy}"`);
    assert.ok(!i18nJs.includes(legacy), `i18n.js still contains "${legacy}"`);
  }
});

test("the page never titles itself Product Enquiry", () => {
  // The eyebrow deliberately reads "Enquiry": products are an optional
  // attachment, so naming the page after them was the old framing.
  assert.ok(
    !visibleMarkup(enquiryHtml).includes("Product Enquiry"),
    "enquiry.html must not render the string Product Enquiry"
  );
});

test("the empty state carries the approved copy and the document icon", () => {
  assert.match(enquiryJs, /enquiry\.empty_title/, "the empty title must be translated");
  assert.match(enquiryJs, /No products selected/);
  assert.match(enquiryJs, /basket-empty-icon/);
  // The document outline (a page with a folded corner), not a cart.
  assert.match(enquiryJs, /<path d="M14 2H6a2 2 0 0 0-2 2v16/, "the empty state must use the document icon");
  assert.ok(
    !/shopping-cart|<circle[^>]*cx="9"[^>]*cy="21"/.test(executableJs(enquiryJs)),
    "the shopping-cart icon must not return"
  );
});

test("both empty-state actions stay secondary, never a solid-red primary", () => {
  const emptyState = /basket-empty-actions[\s\S]{0,700}?<\/div>/.exec(enquiryJs);
  assert.ok(emptyState, "the empty state actions block must exist");
  const block = emptyState[0];
  assert.match(block, /class="enquiry-quiet-btn"[\s\S]*class="enquiry-quiet-btn"/,
    "both actions must use the quiet (outlined) treatment");
  assert.ok(!/btn-primary|btn-red|class="[^"]*\bprimary\b/.test(block),
    "neither empty-state action may be a primary red CTA");
});

test("Browse products points at the canonical internal route", () => {
  assert.match(enquiryJs, /href="\/products"/, "Browse products must use the clean /products route");
  assert.ok(!/href="\/products\.html"/.test(enquiryJs), "it must not use the .html URL that redirects");
});

test("the details form lives in the document, not behind a product check", () => {
  // The form is static markup so removing the last product cannot unmount it
  // and lose whatever the visitor has typed. renderBasket() only ever writes to
  // #basketList.
  const markup = visibleMarkup(enquiryHtml);
  assert.match(markup, /id="eName"/);
  assert.match(markup, /id="eCompany"/);
  assert.match(markup, /id="eEmail"/);
  assert.match(markup, /id="eMessage"/);
  assert.match(markup, /enquiry\.your_details/);
});

test("rendering the basket only ever replaces the basket list", () => {
  const renderBasket = /function renderBasket\(\)[\s\S]*?\n}/.exec(enquiryJs);
  assert.ok(renderBasket, "renderBasket must exist");
  const targets = [...renderBasket[0].matchAll(/(\w+)\.innerHTML\s*=/g)].map((m) => m[1]);
  assert.ok(targets.length > 0, "renderBasket must write markup somewhere");
  for (const target of targets) {
    assert.equal(target, "list", `renderBasket must not overwrite ${target}; only the basket list`);
  }
});

test("an empty basket still submits, and sends an empty attachment list", () => {
  assert.match(
    enquiryJs,
    /productIds/,
    "the payload must carry the (possibly empty) product id list"
  );
  assert.ok(
    !/if\s*\(\s*(?:ids|products)\.length\s*===?\s*0\s*\)\s*\{[^}]*return[^}]*\}\s*(?:\/\/[^\n]*\n\s*)*submit/i.test(enquiryJs),
    "submission must not be blocked when nothing is attached"
  );
});

test("exactly one Enquiry document and one controller are shipped", () => {
  const enquiryDocuments = fs.readdirSync(FRONTEND_DIR)
    .filter((name) => /enquiry/i.test(name) && name.endsWith(".html"));
  assert.deepEqual(enquiryDocuments, ["enquiry.html"],
    "a second Enquiry document would give the old page a way back");

  const controllers = fs.readdirSync(path.join(FRONTEND_DIR, "js/pages"))
    .filter((name) => /enquiry/i.test(name));
  assert.deepEqual(controllers, ["enquiry.js"]);
});

test("no service worker or Cache Storage can serve a stale Enquiry page", () => {
  // A service worker is the one layer that could survive a deploy and keep
  // handing back old markup. There is none, and there must not be one.
  for (const file of fs.readdirSync(FRONTEND_DIR).filter((name) => name.endsWith(".html"))) {
    const source = fs.readFileSync(path.join(FRONTEND_DIR, file), "utf8");
    assert.ok(
      !/serviceWorker\s*\.\s*register|caches\s*\.\s*open/.test(source),
      `${file} must not register a service worker or open a cache`
    );
  }
});
