import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const comparePagePath = new URL(
  "../frontend/js/pages/compare-page.js",
  import.meta.url
);
const compareHtmlPath = new URL("../frontend/compare.html", import.meta.url);
const comparePageSource = fs.readFileSync(comparePagePath, "utf8");
const compareHtml = fs.readFileSync(compareHtmlPath, "utf8");

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

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const englishCopy = {
  heading: "Products to compare",
  add: "Add a product",
  search: "Search or browse",
  compareNow: "Compare now",
  clearAll: "Clear all",
  swipe: "Swipe to compare all {count} products",
  rotateTitle: "Rotate for the full comparison",
  rotateBody:
    "Turn your phone to landscape to see the products side by side with more room and the full controls. You can still swipe the table in portrait.",
  gotIt: "Got it",
  closeHint: "Dismiss",
  remove: "Remove {product} from comparison",
  notSpecified: "Not specified",
  disclaimer:
    "Product information is provided for general guidance only. Contact Yee Lim for full technical details.",
};

const chineseCopy = {
  heading: "待对比产品",
  add: "添加产品",
  search: "搜索或浏览",
  compareNow: "立即对比",
  clearAll: "清除全部",
  swipe: "滑动查看全部 {count} 款产品",
  rotateTitle: "横屏查看完整对比",
  rotateBody:
    "请将手机旋转至横屏，以便并排查看产品及完整控制项。竖屏下仍可滑动表格。",
  gotIt: "知道了",
  closeHint: "关闭提示",
  remove: "从对比中移除 {product}",
  notSpecified: "未提供",
  disclaimer: "产品信息仅供一般参考。如需完整技术资料，请联系 Yee Lim。",
};

test("comparePageCopy returns the exact English and Simplified-Chinese copy", () => {
  const comparePageCopy = extractNamedFunction(
    comparePageSource,
    "comparePageCopy"
  );

  assert.deepEqual(plain(comparePageCopy("en")), englishCopy);
  assert.deepEqual(plain(comparePageCopy("zh")), chineseCopy);
  assert.deepEqual(
    plain(comparePageCopy("unsupported")),
    englishCopy,
    "unsupported languages must retain the current English copy"
  );
});

test("compare-page copy safely formats count and named placeholders", () => {
  const comparePageCopy = extractNamedFunction(
    comparePageSource,
    "comparePageCopy"
  );
  const formatComparePageCopy = extractNamedFunction(
    comparePageSource,
    "formatComparePageCopy"
  );

  assert.equal(
    formatComparePageCopy(comparePageCopy("en").swipe, 3),
    "Swipe to compare all 3 products"
  );
  assert.equal(
    formatComparePageCopy(comparePageCopy("zh").swipe, 2),
    "滑动查看全部 2 款产品"
  );
  assert.equal(
    formatComparePageCopy(comparePageCopy("en").remove, {
      product: "YL-200 $&",
    }),
    "Remove YL-200 $& from comparison"
  );
  assert.equal(
    formatComparePageCopy(comparePageCopy("zh").remove, {
      product: "YL-200",
    }),
    "从对比中移除 YL-200"
  );
  assert.equal(
    formatComparePageCopy("Keep {missing}", { product: "YL-200" }),
    "Keep {missing}",
    "unknown placeholders must remain intact"
  );
});

test("compare.html requests the localized compare-page asset version", () => {
  assert.match(
    compareHtml,
    /src="\/js\/pages\/compare-page\.js\?v=20"/,
    "compare.html must request compare-page.js v20"
  );
  assert.doesNotMatch(compareHtml, /compare-page\.js\?v=19/);
});
