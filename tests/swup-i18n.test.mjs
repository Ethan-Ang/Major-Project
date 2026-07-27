import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
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

test("all public Swup consumers request compare-page.js v20", () => {
  for (const page of publicConsumers) {
    const html = consumerHtml(page);
    assert.match(
      html,
      /src="\/js\/pages\/compare-page\.js\?v=20"/,
      `${page} must request compare-page.js v20`
    );
    assert.doesNotMatch(
      html,
      /src="\/js\/pages\/compare-page\.js\?v=19"/,
      `${page} must not request stale compare-page.js v19`
    );
  }
});

test("afterSwap reapplies static i18n before ready callbacks", () => {
  const swupRoot = { id: "swup" };
  const withRoot = runAfterSwap(swupRoot);
  assert.deepEqual(
    withRoot.calls.map(call => call.name),
    ["i18n", "ready", "nav", "scroll"]
  );
  assert.equal(withRoot.calls[0].root, swupRoot);

  const withoutRoot = runAfterSwap(null);
  assert.deepEqual(
    withoutRoot.calls.map(call => call.name),
    ["i18n", "ready", "nav", "scroll"]
  );
  assert.equal(
    withoutRoot.calls[0].root,
    withoutRoot.documentStub,
    "afterSwap must fall back to document when #swup is unavailable"
  );
});

test("all public Swup consumers request page-transitions.js v6", () => {
  for (const page of publicConsumers) {
    const html = consumerHtml(page);
    assert.match(
      html,
      /src="\/js\/widgets\/page-transitions\.js\?v=6"/,
      `${page} must request page-transitions.js v6`
    );
    assert.doesNotMatch(
      html,
      /src="\/js\/widgets\/page-transitions\.js\?v=5"/,
      `${page} must not request stale page-transitions.js v5`
    );
  }
});
