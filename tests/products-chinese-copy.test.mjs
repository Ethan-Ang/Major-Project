import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const productsPath = new URL("../frontend/js/pages/products.js", import.meta.url);
const productsHtmlPath = new URL("../frontend/products.html", import.meta.url);
const productsSource = fs.readFileSync(productsPath, "utf8");
const productsHtml = fs.readFileSync(productsHtmlPath, "utf8");

function extractNamedFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const open = source.indexOf("{", start);
  let depth = 0;

  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) {
      return vm.runInNewContext(`(${source.slice(start, index + 1)})`);
    }
  }

  throw new Error(`Could not parse ${name}`);
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

test("products catalogue requests products.js v49", () => {
  assert.match(productsHtml, /src="\/js\/pages\/products\.js\?v=49"/);
});
