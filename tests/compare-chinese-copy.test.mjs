import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { assertAssetAtLeast } from "./helpers/asset-version.mjs";
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
  compareHint: "Select at least 2 products to compare",
  selectHint: "Add {count} more product to start comparing.",
  clearAll: "Clear all",
  swipe: "Swipe to compare all {count} products",
  rotateTitle: "Rotate for the full comparison",
  rotateBody:
    "Turn your phone to landscape to see the products side by side with more room and the full controls. You can still swipe the table in portrait.",
  gotIt: "Got it",
  closeHint: "Dismiss",
  remove: "Remove {product} from comparison",
  notSpecified: "Not specified",
  emptyTitle: "Compare products side by side",
  emptyBody:
    "Add two or three products to compare their key specifications in one table.",
  emptyTitleOne: "One more product to compare",
  emptyBodyOne:
    "You have 1 of the 2 products needed. Add another and the comparison table appears here.",
  emptyNote: "Up to 3 products at a time.",
  emptyPreview: "What you will compare",
  addProducts: "Add Products",
  browseCatalogue: "Browse Catalogue",
  productLabel: "Product",
  disclaimer:
    "Product information is provided for general guidance only. Contact Yee Lim for full technical details.",
  caption:
    "Side-by-side comparison of {count} products. Each column is a product; each row is a specification.",
};

const chineseCopy = {
  heading: "待对比产品",
  add: "添加产品",
  search: "搜索或浏览",
  compareNow: "立即对比",
  compareHint: "请至少选择 2 款产品进行对比",
  selectHint: "再添加 {count} 款产品即可开始对比。",
  clearAll: "清除全部",
  swipe: "滑动查看全部 {count} 款产品",
  rotateTitle: "横屏查看完整对比",
  rotateBody:
    "请将手机旋转至横屏，以便并排查看产品及完整控制项。竖屏下仍可滑动表格。",
  gotIt: "知道了",
  closeHint: "关闭提示",
  remove: "从对比中移除 {product}",
  notSpecified: "未提供",
  emptyTitle: "并排对比产品",
  emptyBody: "添加 2 至 3 款产品，即可在同一张表格中对照关键规格。",
  emptyTitleOne: "还差一款产品即可开始对比",
  emptyBodyOne: "已选择 1 款，至少需要 2 款。再添加一款，对比表格即会显示在此处。",
  emptyNote: "每次最多对比 3 款产品。",
  emptyPreview: "可对比的内容",
  addProducts: "添加产品",
  browseCatalogue: "浏览产品目录",
  productLabel: "产品",
  disclaimer: "产品信息仅供一般参考。如需完整技术资料，请联系 Yee Lim。",
  caption: "{count} 款产品并排对比。每一列为一款产品，每一行为一项规格。",
};

const compareCopyIntegrations = [
  {
    key: "emptyTitle",
    fragment: "const title = one ? copy.emptyTitleOne : copy.emptyTitle;",
    mutationTarget: "copy.emptyTitle;",
  },
  {
    key: "emptyTitleOne",
    fragment: "const title = one ? copy.emptyTitleOne : copy.emptyTitle;",
    mutationTarget: "copy.emptyTitleOne",
  },
  {
    key: "emptyBody",
    fragment: "const body  = one ? copy.emptyBodyOne : copy.emptyBody;",
    mutationTarget: "copy.emptyBody;",
  },
  {
    key: "emptyBodyOne",
    fragment: "const body  = one ? copy.emptyBodyOne : copy.emptyBody;",
    mutationTarget: "copy.emptyBodyOne",
  },
  {
    key: "emptyNote",
    fragment: '<p class="cmp-empty-note">${copy.emptyNote}</p>',
    mutationTarget: "${copy.emptyNote}",
  },
  {
    key: "emptyPreview",
    fragment: '<p class="cmp-empty-preview-cap">${copy.emptyPreview}</p>',
    mutationTarget: "${copy.emptyPreview}",
  },
  {
    key: "addProducts",
    fragment:
      'onclick="ylCompareAddMore()">${copy.addProducts}</button>',
    mutationTarget: "${copy.addProducts}",
  },
  {
    key: "browseCatalogue",
    fragment:
      '<a href="/products" class="btn btn-outline">${copy.browseCatalogue}</a>',
    mutationTarget: "${copy.browseCatalogue}",
  },
  {
    key: "productLabel",
    fragment:
      '<td class="compare-row-label compare-corner">${copy.productLabel}</td>',
    mutationTarget: "${copy.productLabel}",
  },
];

function assertCompareCopyIntegrated(source) {
  for (const { key, fragment } of compareCopyIntegrations) {
    assert.ok(
      source.includes(fragment),
      `${key} must be interpolated from comparePageCopy at its render site`
    );
  }
}

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

// The under-two panel's zero state opens the picker in place. It must never go
// back to sending the visitor to /products: that meant leaving the comparison
// to come back to it, and the picker is the same one the add slot opens.
test("the zero-product CTA opens the shared picker, it does not navigate away", () => {
  assert.ok(
    comparePageSource.includes(
      'onclick="ylCompareAddMore()">${copy.addProducts}</button>'
    ),
    "the zero-product CTA must be a button wired to the shared picker"
  );
  assert.ok(
    !/class="btn btn-primary">\$\{copy\.\w+\}<\/a>/.test(comparePageSource),
    "the zero-product CTA must not be a link to another page"
  );
});

test("under-two and table-corner render sites cannot regress to hardcoded copy", () => {
  assertCompareCopyIntegrated(comparePageSource);

  for (const { key, fragment, mutationTarget } of compareCopyIntegrations) {
    const mutation = comparePageSource.replace(
      fragment,
      fragment.replace(mutationTarget, englishCopy[key])
    );
    assert.notEqual(
      mutation,
      comparePageSource,
      `${key} mutation fixture must alter the source`
    );
    assert.throws(
      () => assertCompareCopyIntegrated(mutation),
      /must be interpolated from comparePageCopy/,
      `${key} guard must reject hardcoded integration`
    );
  }
});

test("compare.html requests the localized compare-page asset version", () => {
  // v20 is the version that shipped the localized copy; anything later is fine.
  assertAssetAtLeast(compareHtml, "/js/pages/compare-page.js", 20, "compare.html");
});
