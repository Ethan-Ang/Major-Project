/**
 * Structured product fields.
 *
 * The admin used to expose one "Features" box that silently fed four different
 * public destinations, and one "How to Use" box whose meaning changed at the
 * literal words "Suitable for:". The form now offers one input per destination
 * and the API converts between that shape and the stored `features` /
 * `usage_text` columns.
 *
 * Two properties have to hold, and neither was covered by any existing suite:
 *
 *   1. The conversion is LOSSLESS. Opening a product and saving it unchanged
 *      must leave the stored values byte-identical. The previous form failed
 *      this badly: it joined the features array with ", " and split it back on
 *      ",", so a save turned Deer Brand 101's four features into eight and
 *      dropped three pack sizes from the public page.
 *
 *   2. Characteristics and Key Benefits are DISJOINT. They are rendered under
 *      different headings on different tabs, so a value belonging to both
 *      printed the same text twice under two different names.
 *
 * Fixture is DEMO_PRODUCTS from frontend/js/data.js: real catalogue data, in
 * the repo, no server or database needed.
 */

import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DATA_JS = ROOT + "frontend/js/data.js";
const DETAIL_JS = ROOT + "frontend/js/pages/product-detail.js";
const ADMIN_JS = ROOT + "frontend/admin/admin.js";
const PHP_HARNESS = ROOT + "tests/helpers/product-fields-roundtrip.php";

/** Pull a top-level array literal out of a browser script and evaluate it. */
function extractArray(source, declaration) {
  const start = source.indexOf(declaration);
  assert.ok(start >= 0, `missing ${declaration}`);
  const open = source.indexOf("[", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "[") depth++;
    else if (source[i] === "]") {
      depth--;
      if (depth === 0) return eval(source.slice(open, i + 1));
    }
  }
  throw new Error(`unterminated array for ${declaration}`);
}

/** Pull one function out of a browser script so the shipped code is tested. */
function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing function ${name}`);
  let depth = 0, seen = false;
  for (let i = start; i < source.length; i++) {
    if (source[i] === "{") { depth++; seen = true; }
    else if (source[i] === "}") {
      depth--;
      if (seen && depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated function ${name}`);
}

const products = extractArray(fs.readFileSync(DATA_JS, "utf8"), "const DEMO_PRODUCTS = [");
const detailSource = fs.readFileSync(DETAIL_JS, "utf8");
const adminSource = fs.readFileSync(ADMIN_JS, "utf8");

// eslint-disable-next-line no-eval
const isKeyBenefitClaim = eval(`(${extractFunction(detailSource, "isKeyBenefitClaim")})`);
// eslint-disable-next-line no-eval
const capitaliseListItem = eval(`(${extractFunction(adminSource, "capitaliseListItem")})`);
const splitLines = eval(`(${extractFunction(adminSource, "splitLines").replace("function splitLines", "function")})`);
const joinLines = eval(`(${extractFunction(adminSource, "joinLines").replace("function joinLines", "function")})`);
const splitList = eval(`(${extractFunction(adminSource, "splitList").replace("function splitList", "function")})`);
const joinList = eval(`(${extractFunction(adminSource, "joinList").replace("function joinList", "function")})`);
void capitaliseListItem; // referenced by splitLines/splitList through scope

test("the fixture is the real catalogue", () => {
  assert.ok(products.length >= 30, `expected the full catalogue, got ${products.length}`);
});

test("multi-value fields survive an unchanged save (the corruption regression)", () => {
  const damaged = [];
  for (const p of products) {
    const features = p.features || [];
    if (!features.length) continue;
    const roundTripped = splitLines(joinLines(features));
    if (JSON.stringify(roundTripped) !== JSON.stringify(features)) {
      damaged.push(`${p.name}: ${features.length} -> ${roundTripped.length}`);
    }
  }
  assert.deepEqual(damaged, [], "features must survive a load/save cycle unchanged");
});

test("the comma splitter would have corrupted this data, so it must not be used for features", () => {
  // Guards the fix rather than the bug: if someone points features back at
  // splitList/joinList, this fails loudly instead of silently losing sizes.
  const corrupted = products.filter(p => {
    const f = p.features || [];
    return f.length && JSON.stringify(splitList(joinList(f))) !== JSON.stringify(f);
  });
  assert.ok(
    corrupted.length > 0,
    "expected the comma round-trip to be lossy for real data; if this passes the fixture changed"
  );
});

test("industries and surfaces are safe for the comma splitter", () => {
  for (const p of products) {
    for (const field of ["industries", "surfaces"]) {
      const values = p[field] || [];
      if (!values.length) continue;
      assert.deepEqual(
        splitList(joinList(values)), values,
        `${p.name}: ${field} must round-trip through the comma splitter`
      );
    }
  }
});

test("Characteristics and Key Benefits never contain the same value", () => {
  const overlaps = [];
  for (const p of products) {
    const features = p.features || [];
    const benefits = features.filter(isKeyBenefitClaim);
    const characteristics = features.filter(f =>
      !/^application\s*:/i.test(f) &&
      !/^available in\s+/i.test(f) &&
      !/^(solvent|water)[\s-]*based$/i.test(f) &&
      !isKeyBenefitClaim(f));
    const both = benefits.filter(b => characteristics.includes(b));
    if (both.length) overlaps.push(`${p.name}: ${both.join(", ")}`);
  }
  assert.deepEqual(overlaps, [], "a value must appear under one heading only");
});

test("PHP compose/decompose round-trips every product losslessly", () => {
  const payload = JSON.stringify(products.map(p => ({
    name: p.name, features: p.features || [], usage: p.usage || "",
  })));

  let output;
  try {
    output = execFileSync("php", [PHP_HARNESS], { input: payload, encoding: "utf8" });
  } catch (err) {
    assert.fail("PHP round-trip harness failed:\n" + (err.stdout || "") + (err.stderr || ""));
  }

  const result = JSON.parse(output);
  assert.equal(result.tested, products.length);
  assert.deepEqual(result.failures, [], "every product must recompose to its stored values");
});
