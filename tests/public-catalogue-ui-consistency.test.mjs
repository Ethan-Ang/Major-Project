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

  const selectionCard = findRule([".csel-card"]);
  assert.ok(selectionCard, "selection card base rule must exist");
  assert.equal(
    selectionCard.declarations.padding,
    "0.6rem 3.35rem 0.6rem 0.6rem"
  );

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

  const active = findRule([
    ".cmp-slot-x:active",
    ".csel-x:active",
    ".compare-col-x:active",
  ]);
  assert.ok(active, "remove controls must share one active rule");
  assert.equal(active.declarations.color, "var(--red)");
  assert.equal(active.declarations.background, "var(--red-tint)");
  assert.equal(active.declarations["border-color"], "var(--red-tint-bdr)");

  const focusSelectors = [
    ".cmp-slot-x:focus-visible",
    ".csel-x:focus-visible",
    ".compare-col-x:focus-visible",
  ];
  const focus = cssRules(css).find(rule =>
    focusSelectors.every(selector => rule.selectors.includes(selector))
  );
  assert.ok(focus, "remove controls must share one focus group");
  assert.equal(focus.declarations.outline, "2px solid var(--red)");
  assert.equal(focus.declarations["outline-offset"], "2px");
});

test("desktop compare trigger stays language-neutral and centered", () => {
  const trigger = findRule([".compare-tray-trigger"]);
  assert.ok(trigger, "compare tray trigger base rule must exist");
  assert.equal(trigger.declarations["justify-content"], "center");

  const count = findRule([".compare-tray-trigger #compareTrayCount"]);
  assert.ok(count, "compare tray count base rule must exist");
  assert.equal(count.declarations["margin-left"], "0");

  const isLanguageSpecificCompareSelector = selector =>
    (selector.includes("[lang") || selector.includes(":lang(")) &&
    (
      selector.includes("compare-tray-trigger") ||
      selector.includes("compareTrayCount")
    );
  assert.equal(
    isLanguageSpecificCompareSelector('[lang="zh"] .compare-tray-trigger'),
    true,
    "guard must detect a synthetic [lang] compare offset"
  );
  assert.equal(
    isLanguageSpecificCompareSelector(":lang(zh) #compareTrayCount"),
    true,
    "guard must detect a synthetic :lang() compare offset"
  );
  const languageSpecificRules = cssRules(css).filter(rule =>
    rule.selectors.some(isLanguageSpecificCompareSelector)
  );
  assert.deepEqual(
    languageSpecificRules.map(rule => rule.selectors),
    [],
    "compare alignment must not use language-specific CSS rules"
  );

  const sideTab = findRule([
    ".compare-tray:not(.is-expanded) .compare-tray-trigger",
  ]);
  assert.ok(sideTab, "collapsed phone side-tab rule must exist");
  assert.equal(sideTab.declarations["writing-mode"], "vertical-rl");
  assert.equal(sideTab.declarations["justify-content"], "center");

  const sideTabCount = findRule([
    ".compare-tray:not(.is-expanded) .compare-tray-trigger #compareTrayCount",
  ]);
  assert.ok(sideTabCount, "collapsed phone count rule must exist");
  assert.equal(sideTabCount.declarations.margin, "0");
});

test("sort label remains legible in both languages", () => {
  const [sortLabel] = rulesFor(".grid-sort-label");
  assert.ok(sortLabel, "sort label rule must exist");
  assert.equal(sortLabel.declarations["font-weight"], "600");
  assert.equal(sortLabel.declarations.color, "var(--muted)");
});

test("catalogue pages request the corrected asset versions", () => {
  for (const page of [
    "products.html",
    "product-detail.html",
    "compare.html",
    "enquiry.html",
    "contact.html",
  ]) {
    const html = fs.readFileSync(
      new URL(`../frontend/${page}`, import.meta.url),
      "utf8"
    );
    assert.match(
      html,
      /href="\/css\/products\.css\?v=97"/,
      `${page} must request products.css v97`
    );
    assert.match(
      html,
      /src="\/js\/widgets\/navbar\.js\?v=23"/,
      `${page} must request navbar.js v23`
    );
  }
});
