// Home and About are teammate-owned. We add data-i18n so they can be
// translated, but the ENGLISH must remain exactly theirs.
//
// The engine restores English FROM THE DICTIONARY, not from the markup. So if
// the dictionary's `en` value ever drifts from the words on the page, the first
// visitor who switches language and back silently rewrites their copy. That is
// the single most damaging way this integration can fail, and it fails quietly.
//
// This asserts the two are identical, in both directions.
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const root = new URL("../frontend/", import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), "utf8");
// Assertions about what a page LINKS TO or LOADS must read markup, not prose:
// these files carry comments that quote the very markup they replaced.
const markup = (p) => read(p).replace(/<!--[\s\S]*?-->/g, "");
const src = read("js/i18n.js");

// Pull every home.*/about.* en value out of the dictionary.
const dict = new Map();
const entry = /^\s*"((?:home|about)\.[a-z0-9_]+)":\s*\{(.*)$/gm;
let m;
while ((m = entry.exec(src))) {
  const en = /en:\s*"((?:[^"\\]|\\.)*)"/.exec(m[2]);
  if (en) dict.set(m[1], en[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
}

const norm = (s) => s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

function keyedElements(html) {
  return [...html.matchAll(/data-i18n(?:-html)?="((?:home|about)\.[a-z0-9_]+)"[^>]*>([\s\S]*?)<\//g)]
    .map(([, key, raw]) => ({ key, text: norm(raw) }));
}

test("html-carrying values are limited to safe formatting tags", () => {
  // data-i18n-html writes innerHTML. Values come only from the static
  // dictionary in this repo — never from a user, a URL or the API — but the
  // allowlist keeps it that way by construction.
  const ALLOWED = /^(br|strong|em|b|i|span)$/;
  const offenders = [];
  for (const [key, en] of dict) {
    for (const tag of [...en.matchAll(/<\s*\/?\s*([a-z0-9-]+)/gi)].map(m => m[1].toLowerCase())) {
      if (!ALLOWED.test(tag)) offenders.push(`${key}: <${tag}>`);
    }
  }
  assert.deepEqual(offenders, [], `disallowed markup in dictionary values: ${offenders.join(", ")}`);

  // and any key whose value carries markup MUST be applied with -html, or the
  // tags would be shown to the visitor as literal text by textContent.
  const needsHtml = [...dict].filter(([, en]) => /<[a-z]/i.test(en)).map(([k]) => k);
  for (const page of ["index.html", "about.html"]) {
    const html = read(page);
    for (const key of needsHtml) {
      if (!html.includes(`"${key}"`)) continue;
      assert.match(html, new RegExp(`data-i18n-html="${key.replace(".", "\\.")}"`),
        `${key} contains markup, so it must use data-i18n-html not data-i18n`);
    }
  }
});

test("the dictionary carries a key for every translated element on Home/About", () => {
  const missing = [];
  for (const page of ["index.html", "about.html"]) {
    for (const { key } of keyedElements(read(page))) {
      if (!dict.has(key)) missing.push(`${page}: ${key}`);
    }
  }
  assert.deepEqual(missing, [], `markup references undefined keys:\n  ${missing.join("\n  ")}`);
});

test("dictionary English matches the teammate's copy character-for-character", () => {
  const drift = [];
  let checked = 0;
  for (const page of ["index.html", "about.html"]) {
    for (const { key, text } of keyedElements(read(page))) {
      if (!dict.has(key)) continue;
      checked += 1;
      const want = norm(dict.get(key));
      if (text !== want) {
        drift.push(`${key}\n     page: ${text}\n     dict: ${want}`);
      }
    }
  }
  assert.ok(checked > 45, `only ${checked} keyed elements found — did the markup change shape?`);
  assert.deepEqual(drift, [],
    `the dictionary would REWRITE their copy on a language round-trip:\n  ${drift.join("\n  ")}`);
});

test("every Home/About key supplies Chinese too", () => {
  const noZh = [];
  for (const [key] of dict) {
    const line = new RegExp(`"${key.replace(".", "\\.")}":\\s*\\{(.*)`).exec(src);
    if (!line || !/zh:\s*"/.test(line[1])) noZh.push(key);
  }
  assert.deepEqual(noZh, [], `missing zh: ${noZh.join(", ")}`);
});

test("figures, brand names and the attributed quote carry no key", () => {
  const home = read("index.html");
  const about = read("about.html");
  // Statistics are numerals — identical in every language.
  for (const stat of ["50+", "500+", "1000+", "SG"]) {
    const re = new RegExp(`<h2[^>]*>\\s*${stat.replace("+", "\\+")}\\s*</h2>`);
    const tag = re.exec(home);
    assert.ok(tag, `Home should still show the ${stat} statistic`);
    assert.doesNotMatch(tag[0], /data-i18n/, `${stat} is a figure and must not be translated`);
  }
  // Brand names are proper nouns.
  for (const brand of ["DEER", "HORSEMEN", "RHINO"]) {
    const re = new RegExp(`<h3[^>]*>${brand}\\s*</h3>`);
    const tag = re.exec(home);
    if (tag) assert.doesNotMatch(tag[0], /data-i18n/, `${brand} is a proper noun`);
  }
  // An attributed quotation is not ours to translate.
  assert.match(about, /<h2>“Quality is not an act, it is a habit\.”<\/h2>/);
  assert.match(about, /<p>— Aristotle<\/p>/);
});

test("their body content and structure are untouched", () => {
  const home = read("index.html");
  const about = read("about.html");
  // Section count is the layout fingerprint.
  assert.equal((home.match(/<section/g) || []).length, 7, "Home section count changed");
  assert.equal((about.match(/<section/g) || []).length, 6, "About section count changed");
  // Their images must all still be referenced.
  for (const img of ["plastics-acrylics.jpg", "laminates.jpg", "flooring.jpg", "packaging.jpg",
                     "DeerBrand_YeeLimAdhesivesIndustries.jpg"]) {
    assert.ok(home.includes(img), `Home lost image ${img}`);
  }
  for (const img of ["OldYeeLim.jpg", "quality (1).png", "trust (1).png", "lightbulb.png"]) {
    assert.ok(about.includes(img), `About lost image ${img}`);
  }
  // Their newest copy, verbatim.
  assert.ok(home.includes("Engineered Adhesives."));
  assert.ok(home.includes("Bond Finder"));
  assert.ok(about.includes("Originally operating as a shoe factory"));
  assert.ok(about.includes("over 20,000 square feet of production space"));
});

test("the shared shell is present and the broken links are gone", () => {
  for (const page of ["index.html", "about.html"]) {
    const html = markup(page);
    assert.equal((html.match(/id="swup"/g) || []).length, 1, `${page}: one #swup`);
    assert.match(html, /<main id="mainContent"[^>]* tabindex="-1">/, page);
    assert.equal((html.match(/class="skip-link/g) || []).length, 1, page);
    assert.equal((html.match(/<link rel="icon"/g) || []).length, 3, `${page}: favicon set`);
    assert.match(html, /rel="canonical" href="https:\/\/yeelimadhesives\.com/, page);
    assert.doesNotMatch(html, /href="(products|contact|contact-us)\.html"/,
      `${page}: .html links 301-redirect and defeat Swup`);
    assert.doesNotMatch(html, /www\.yeelimadhesives\.com/, `${page}: non-www is canonical`);
  }
  // One stylesheet, one version. Requesting it at two ?v= values had the edge
  // serving one page a stale copy.
  const v = (p) => /css\/products\.css\?v=(\d+)/.exec(markup(p))[1];
  assert.equal(v("index.html"), v("about.html"));
  // Both pages load the SHARED stylesheet now. Keeping a separate styles.css
  // was incompatible with Swup, which swaps #swup and never touches <head>.
  for (const page of ["index.html", "about.html"]) {
    assert.match(markup(page), /css\/products\.css/, `${page} loads the shared stylesheet`);
    assert.match(markup(page), /class="yl-static"/, `${page} carries the scope its rules need`);
  }
});

test("About's footer anchors point at real sections", () => {
  // The Company column used to link #heritage and #quality -- names the About
  // page never used as headings. It now links the sections that are really
  // there. Rather than pinning specific IDs, every /about#fragment the footer
  // emits must resolve to an element that exists on the page, so the two can
  // never drift apart again.
  const about = read("about.html");
  const footer = read("js/widgets/footer.js");

  const fragments = [...footer.matchAll(/href="\/about#([A-Za-z0-9_-]+)"/g)].map((m) => m[1]);
  assert.ok(fragments.length > 0, "the footer must deep-link into About");

  for (const fragment of new Set(fragments)) {
    assert.match(
      about,
      new RegExp(`<section[^>]*\\sid="${fragment}"`),
      `the footer links /about#${fragment} but no section carries that id`
    );
  }

  // The two the Company column is specified to offer.
  assert.ok(fragments.includes("mission"), "Our Mission must deep-link to #mission");
  assert.ok(fragments.includes("values"), "Our Values must deep-link to #values");

  // The IDs sit on the sections whose headings they name.
  assert.match(about, /<section class="mission-section" id="mission">/);
  assert.match(about, /<section class="values-section" id="values">/);
});
