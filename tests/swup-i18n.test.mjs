import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { assertAssetAtLeast } from "./helpers/asset-version.mjs";
import vm from "node:vm";

const publicConsumers = [
  "products.html",
  "product-detail.html",
  "compare.html",
  "enquiry.html",
  "contact.html",
];
const transitionsPath = new URL(
  "../frontend/js/widgets/page-transitions.js",
  import.meta.url
);
const transitionsSource = fs.readFileSync(transitionsPath, "utf8");

function consumerHtml(page) {
  return fs.readFileSync(
    new URL(`../frontend/${page}`, import.meta.url),
    "utf8"
  );
}

function extractNamedFunction(source, name, context) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) {
      return vm.runInNewContext(
        `(${source.slice(start, index + 1)})`,
        context
      );
    }
  }
  throw new Error(`Could not parse ${name}`);
}

function runAfterSwap(swupRoot) {
  const calls = [];
  const documentStub = {
    getElementById(id) {
      if (id === "swup") return swupRoot;
      if (id === "compareTray") return {};
      return null;
    },
    body: {
      classList: { remove() {} },
      style: {},
    },
    documentElement: {
      style: { removeProperty() {} },
    },
  };
  const context = {
    window: {
      ylApplyI18n(root) {
        calls.push({ name: "i18n", root });
      },
      ylRunReady() {
        calls.push({ name: "ready" });
      },
    },
    document: documentStub,
    location: { href: "https://example.test/product-detail" },
    pathOf() {
      return "/product-detail";
    },
    updateNavActive() {
      calls.push({ name: "nav" });
    },
    restoreScroll() {
      calls.push({ name: "scroll" });
    },
  };

  const afterSwap = extractNamedFunction(
    transitionsSource,
    "afterSwap",
    context
  );
  afterSwap();
  return { calls, documentStub };
}

test("all public Swup consumers request compare-page.js v20 or later", () => {
  for (const page of publicConsumers) {
    assertAssetAtLeast(consumerHtml(page), "/js/pages/compare-page.js", 20, page);
  }
});

test("all public Swup consumers request compare.js v22 or later", () => {
  for (const page of publicConsumers) {
    assertAssetAtLeast(consumerHtml(page), "/js/widgets/compare.js", 22, page);
  }
});

test("afterSwap reapplies static i18n before ready callbacks", () => {
  // SCOPE CHANGE (LANG-003): this used to assert i18n was applied to the #swup
  // container only. That was wrong once language could change without a page
  // reload — the navbar and footer are injected OUTSIDE the swap container, so
  // a #swup-scoped pass left them in the previous language. afterSwap now
  // translates the whole document; re-applying to already-correct elements is
  // a no-op, and it is the only scope that reaches the persistent shell.
  const swupRoot = { id: "swup" };
  const withRoot = runAfterSwap(swupRoot);
  assert.deepEqual(
    withRoot.calls.map(call => call.name),
    ["i18n", "ready", "nav", "scroll"]
  );
  assert.equal(
    withRoot.calls[0].root,
    withRoot.documentStub,
    "i18n must be applied document-wide so the persistent navbar/footer retranslate"
  );

  const withoutRoot = runAfterSwap(null);
  assert.deepEqual(
    withoutRoot.calls.map(call => call.name),
    ["i18n", "ready", "nav", "scroll"]
  );
  assert.equal(
    withoutRoot.calls[0].root,
    withoutRoot.documentStub,
    "…and still document when #swup is unavailable"
  );
});

test("all public Swup consumers request page-transitions.js v6 or later", () => {
  for (const page of publicConsumers) {
    assertAssetAtLeast(consumerHtml(page), "/js/widgets/page-transitions.js", 6, page);
  }
});
