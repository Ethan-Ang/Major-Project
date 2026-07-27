import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const productsPath = new URL("../frontend/js/pages/products.js", import.meta.url);
const productsSource = fs.readFileSync(productsPath, "utf8");

function extractNamedFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const open = source.indexOf("{", start);
  let depth = 0;

  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) {
      return source.slice(start, index + 1);
    }
  }

  throw new Error(`Could not parse ${name}`);
}

function extractNamedFunction(source, name) {
  return vm.runInNewContext(`(${extractNamedFunctionSource(source, name)})`);
}

function assertFilterBadgeIntegration(source) {
  const updateSource = extractNamedFunctionSource(
    source,
    "updateFilterGroupBadges"
  );

  assert.match(
    updateSource,
    /headTotal\.textContent\s*=\s*formatActiveFilterSummary\(\s*totalActive\s*,\s*window\.ylLang\s*\)\s*;/,
    "updateFilterGroupBadges must pass window.ylLang to the summary formatter"
  );
  assert.match(
    updateSource,
    /headTotal\.hidden\s*=\s*totalActive\s*===\s*0\s*;/,
    "updateFilterGroupBadges must hide the summary only when totalActive is zero"
  );
}

test("active filter summary uses the catalogue language", () => {
  const formatActiveFilterSummary = extractNamedFunction(
    productsSource,
    "formatActiveFilterSummary"
  );

  assert.equal(formatActiveFilterSummary(0, "en"), "");
  assert.equal(formatActiveFilterSummary(1, "en"), "1 filter active");
  assert.equal(formatActiveFilterSummary(2, "en"), "2 filters active");
  assert.equal(formatActiveFilterSummary(0, "zh"), "");
  assert.equal(formatActiveFilterSummary(1, "zh"), "已选 1 项");
  assert.equal(formatActiveFilterSummary(2, "zh"), "已选 2 项");
});

test("filter badge updater wires language and zero-count visibility", () => {
  assertFilterBadgeIntegration(productsSource);
});

test("filter badge integration guard rejects either wiring mutation", () => {
  const wrongLanguageSource = productsSource.replace(
    "formatActiveFilterSummary(totalActive, window.ylLang)",
    'formatActiveFilterSummary(totalActive, "en")'
  );
  assert.notEqual(
    wrongLanguageSource,
    productsSource,
    "language mutation must alter the source fixture"
  );
  assert.throws(
    () => assertFilterBadgeIntegration(wrongLanguageSource),
    /must pass window\.ylLang/
  );

  const wrongHiddenSource = productsSource.replace(
    "headTotal.hidden = totalActive === 0;",
    "headTotal.hidden = totalActive < 1;"
  );
  assert.notEqual(
    wrongHiddenSource,
    productsSource,
    "hidden-state mutation must alter the source fixture"
  );
  assert.throws(
    () => assertFilterBadgeIntegration(wrongHiddenSource),
    /must hide the summary only when totalActive is zero/
  );
});

for (const page of [
  "products.html",
  "product-detail.html",
  "compare.html",
  "enquiry.html",
  "contact.html",
]) {
  test(`${page} requests products.js v49`, () => {
    const html = fs.readFileSync(
      new URL(`../frontend/${page}`, import.meta.url),
      "utf8"
    );
    assert.match(
      html,
      /src="\/js\/pages\/products\.js\?v=49"/,
      `${page} must request products.js v49`
    );
    assert.doesNotMatch(
      html,
      /src="\/js\/pages\/products\.js\?v=48"/,
      `${page} must not request stale products.js v48`
    );
  });
}
