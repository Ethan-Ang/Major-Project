import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const pageSource = fs.readFileSync(
  new URL("../frontend/404.html", import.meta.url),
  "utf8"
);
const cssSource = fs.readFileSync(
  new URL("../frontend/css/products.css", import.meta.url),
  "utf8"
);

function declarationsFor(source, selector, startAt = 0) {
  const selectorAt = source.indexOf(`${selector} {`, startAt);
  assert.notEqual(selectorAt, -1, `${selector} rule must exist`);
  const openAt = source.indexOf("{", selectorAt);
  const closeAt = source.indexOf("}", openAt);
  assert.notEqual(closeAt, -1, `${selector} rule must close`);
  return source.slice(openAt + 1, closeAt);
}

test("404 page allows the shared flex layout to balance desktop whitespace", () => {
  assert.doesNotMatch(
    pageSource,
    /<style\b[\s\S]*?\.nf-help\s*\{/i,
    "404.html must not override the shared helpful-section flex distribution"
  );

  const sectionStart = cssSource.indexOf("/* ─── 404 Page");
  assert.notEqual(sectionStart, -1, "shared 404 CSS section must exist");

  const mainRule = declarationsFor(cssSource, ".nf-body main", sectionStart);
  assert.match(mainRule, /\bflex:\s*1\s*;/);
  assert.match(mainRule, /\bdisplay:\s*flex\s*;/);
  assert.match(mainRule, /\bflex-direction:\s*column\s*;/);

  const helpRule = declarationsFor(cssSource, ".nf-help", sectionStart);
  assert.match(helpRule, /\bflex:\s*1\s*;/);
  assert.match(helpRule, /\bdisplay:\s*flex\s*;/);
  assert.match(helpRule, /\bflex-direction:\s*column\s*;/);
  assert.match(helpRule, /\bjustify-content:\s*center\s*;/);
});

test("404 mobile layout keeps natural document flow", () => {
  const sectionStart = cssSource.indexOf("/* ─── 404 Page");
  const mobileStart = cssSource.indexOf("@media (max-width: 640px)", sectionStart);
  assert.notEqual(mobileStart, -1, "404 mobile media query must exist");

  const mobileHelpRule = declarationsFor(cssSource, ".nf-help", mobileStart);
  assert.match(mobileHelpRule, /\bflex:\s*0\s+0\s+auto\s*;/);
  assert.match(mobileHelpRule, /\bjustify-content:\s*flex-start\s*;/);
  assert.match(
    mobileHelpRule,
    /\bpadding:\s*1\.5rem\s+1\.25rem\s+2rem\s*;/
  );
});

test("404 recovery content and destinations remain intact", () => {
  for (const requiredCopy of [
    "404 &ndash; Page Not Found",
    "We can&rsquo;t find the page you&rsquo;re looking for",
    "Helpful places to go",
    "Browse Products",
    "Contact Yee Lim",
    "About Yee Lim",
  ]) {
    assert.ok(
      pageSource.includes(requiredCopy),
      `404 page must preserve: ${requiredCopy}`
    );
  }

  assert.match(pageSource, /class="page-hero nf-hero"/);
  assert.match(pageSource, /class="page-hero-img"/);
  assert.match(pageSource, /class="search-bar nf-search"/);
  assert.match(pageSource, /href="\/products"/);
  assert.match(pageSource, /href="\/contact"/);
  assert.match(pageSource, /href="\/about"/);
});
