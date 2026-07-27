import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const cssPath = new URL("../frontend/css/products.css", import.meta.url);
const navPath = new URL("../frontend/js/widgets/navbar.js", import.meta.url);
const css = fs.readFileSync(cssPath, "utf8");
const navSource = fs.readFileSync(navPath, "utf8");

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

function cssRules(source) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  for (const match of clean.matchAll(pattern)) {
    const selectors = match[1].split(",").map(value => value.trim());
    const declarations = Object.fromEntries(
      match[2].split(";").map(value => value.trim()).filter(Boolean).map(value => {
        const colon = value.indexOf(":");
        return [value.slice(0, colon).trim(), value.slice(colon + 1).trim()];
      })
    );
    rules.push({ selectors, declarations });
  }
  return rules;
}

function findRule(requiredSelectors) {
  const required = [...requiredSelectors].sort();
  return cssRules(css).find(rule => {
    const actual = [...rule.selectors].sort();
    return actual.length === required.length && actual.every((selector, index) => selector === required[index]);
  });
}

function rulesFor(selector) {
  return cssRules(css).filter(rule => rule.selectors.includes(selector));
}

test("Products nav is active only on the catalogue route", () => {
  const isActivePage = extractNamedFunction(navSource, "isActivePage");
  assert.equal(isActivePage("products", "products"), true);
  assert.equal(isActivePage("products", "product-detail"), false);
  assert.equal(isActivePage("products", "compare"), false);
  assert.equal(isActivePage("home", "index"), true);
});
