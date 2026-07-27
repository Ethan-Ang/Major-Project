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

test("checked filter rows stay plain while the checkbox carries selection", () => {
  const checkedRules = rulesFor(".filter-group label:has(input:checked)");
  const hoverRules = rulesFor(".filter-group label:hover:has(input:checked)");
  const backgroundValues = rules => rules.flatMap(rule =>
    ["background", "background-color"].flatMap(property =>
      property in rule.declarations ? [rule.declarations[property]] : []
    )
  );
  const checkedBackgrounds = backgroundValues(checkedRules);
  const hoverBackgrounds = backgroundValues(hoverRules);
  assert.ok(
    checkedBackgrounds.length > 0,
    "checked row must declare a background or background-color"
  );
  assert.ok(
    checkedBackgrounds.every(value => value === "transparent"),
    `checked row backgrounds must all be transparent; found: ${checkedBackgrounds.join(", ")}`
  );
  assert.ok(
    hoverBackgrounds.length > 0,
    "hovered checked row must declare a background or background-color"
  );
  assert.ok(
    hoverBackgrounds.every(value => value === "transparent"),
    `hovered checked row backgrounds must all be transparent; found: ${hoverBackgrounds.join(", ")}`
  );
});

test("all compare-product remove controls share option A", () => {
  const shared = findRule([".cmp-slot-x", ".csel-x", ".compare-col-x"]);
  assert.ok(shared, "one shared remove-control rule must exist");
  assert.equal(shared.declarations.width, "44px");
  assert.equal(shared.declarations.height, "44px");
  assert.equal(shared.declarations["border-radius"], "6px");
  assert.equal(shared.declarations.background, "var(--card)");
  assert.equal(shared.declarations.border, "1px solid var(--border)");
  assert.equal(shared.declarations.color, "var(--red)");

  const icons = findRule([
    ".cmp-slot-x svg",
    ".csel-x svg",
    ".compare-col-x svg",
  ]);
  assert.ok(icons, "remove icons must share one geometry rule");
  assert.equal(icons.declarations.width, "14px");
  assert.equal(icons.declarations.height, "14px");
  assert.equal(icons.declarations["stroke-width"], "1.8");

  const hover = findRule([
    ".cmp-slot-x:hover",
    ".csel-x:hover",
    ".compare-col-x:hover",
  ]);
  assert.ok(hover, "remove controls must share one hover rule");
  assert.equal(hover.declarations.background, "var(--red-tint)");
  assert.equal(hover.declarations["border-color"], "var(--red-tint-bdr)");
});
