import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const comparePath = new URL("../frontend/js/widgets/compare.js", import.meta.url);
const compareSource = fs.readFileSync(comparePath, "utf8");

function extractNamedFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const open = source.indexOf("{", start);
  let depth = 0;

  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }

  throw new Error(`Could not parse ${name}`);
}

function extractNamedFunction(source, name) {
  return vm.runInNewContext(`(${extractNamedFunctionSource(source, name)})`);
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const englishCopy = {
  eyebrow: "Compare Products",
  title: "Add a product to compare",
  closeAria: "Close product picker",
  sourceAria: "Product source",
  recentTab: "Recently viewed",
  allTab: "All products",
  searchLabel: "Search products to compare",
  searchPlaceholder: "Search by name, brand or keyword…",
  loading: "Loading products…",
  selectedCount: "{count} of {max} selected",
  recentEmptyTitle: "No recently viewed products",
  recentEmptyBody:
    "Products you open will appear here for quick comparison.",
  browseAll: "Browse all products",
  noSearchResults: "No products match your search.",
  noProducts: "No products available.",
  add: "Add",
  added: "Added",
  removeAria: "Remove {product} from comparison",
  addAria: "Add {product} to comparison",
  fullAria: "Comparison full: remove one to add another",
  limitMessage: "Maximum of 3 products selected. Remove one to choose another.",
};

const chineseCopy = {
  eyebrow: "产品对比",
  title: "添加产品进行对比",
  closeAria: "关闭产品选择器",
  sourceAria: "产品来源",
  recentTab: "最近浏览",
  allTab: "所有产品",
  searchLabel: "搜索要对比的产品",
  searchPlaceholder: "按名称、品牌或关键词搜索……",
  loading: "正在加载产品……",
  selectedCount: "已选择 {count}／{max} 款产品",
  recentEmptyTitle: "暂无最近浏览的产品",
  recentEmptyBody: "您浏览过的产品将显示在此处，便于快速对比。",
  browseAll: "浏览所有产品",
  noSearchResults: "没有符合搜索条件的产品。",
  noProducts: "暂无可用产品。",
  add: "添加",
  added: "已添加",
  removeAria: "从对比中移除 {product}",
  addAria: "将 {product} 添加至对比",
  fullAria: "对比列表已满：请先移除一款产品再添加",
  limitMessage: "最多可选择 3 款产品。请先移除一款，再选择其他产品。",
};

test("comparePickerCopy preserves English and supplies professional Simplified Chinese", () => {
  const comparePickerCopy = extractNamedFunction(
    compareSource,
    "comparePickerCopy"
  );

  assert.deepEqual(plain(comparePickerCopy("en")), englishCopy);
  assert.deepEqual(plain(comparePickerCopy("zh")), chineseCopy);
  assert.deepEqual(
    plain(comparePickerCopy("unsupported")),
    englishCopy,
    "unsupported languages must keep the current English picker copy"
  );
});

test("compare picker formatter safely handles count and named replacements", () => {
  const comparePickerCopy = extractNamedFunction(
    compareSource,
    "comparePickerCopy"
  );
  const formatComparePickerCopy = extractNamedFunction(
    compareSource,
    "formatComparePickerCopy"
  );

  assert.equal(
    formatComparePickerCopy(comparePickerCopy("en").selectedCount, {
      count: 2,
      max: 3,
    }),
    "2 of 3 selected"
  );
  assert.equal(
    formatComparePickerCopy(comparePickerCopy("zh").selectedCount, {
      count: 2,
      max: 3,
    }),
    "已选择 2／3 款产品"
  );
  assert.equal(
    formatComparePickerCopy(comparePickerCopy("en").addAria, {
      product: "YL-200 $&",
    }),
    "Add YL-200 $& to comparison"
  );
  assert.equal(
    formatComparePickerCopy("Keep {missing}", { product: "YL-200" }),
    "Keep {missing}",
    "unknown placeholders must remain intact"
  );
});

test("picker panel and list render every localized copy surface", () => {
  const openSource = extractNamedFunctionSource(
    compareSource,
    "openComparePicker"
  );
  const listSource = extractNamedFunctionSource(
    compareSource,
    "renderComparePickerList"
  );

  assert.match(
    openSource,
    /const copy = comparePickerCopy\(window\.ylLang\);/
  );
  for (const key of [
    "eyebrow",
    "title",
    "closeAria",
    "sourceAria",
    "recentTab",
    "allTab",
    "searchLabel",
    "searchPlaceholder",
    "loading",
  ]) {
    assert.ok(
      openSource.includes(`copy.${key}`),
      `openComparePicker must render copy.${key}`
    );
  }

  assert.match(
    listSource,
    /const copy = comparePickerCopy\(window\.ylLang\);/
  );
  for (const key of [
    "selectedCount",
    "recentEmptyTitle",
    "recentEmptyBody",
    "browseAll",
    "noSearchResults",
    "noProducts",
    "add",
    "added",
    "removeAria",
    "addAria",
    "fullAria",
    "limitMessage",
  ]) {
    assert.ok(
      listSource.includes(`copy.${key}`),
      `renderComparePickerList must render copy.${key}`
    );
  }

  assert.match(
    listSource,
    /formatComparePickerCopy\(copy\.selectedCount,\s*\{\s*count:\s*compare\.length,\s*max:\s*COMPARE_MAX\s*\}\)/
  );
  assert.match(
    listSource,
    /formatComparePickerCopy\(copy\.removeAria,\s*\{\s*product:\s*name\s*\}\)/
  );
  assert.match(
    listSource,
    /formatComparePickerCopy\(copy\.addAria,\s*\{\s*product:\s*name\s*\}\)/
  );
});

test("picker localizes subtype and keeps dynamic attributes out of inline JavaScript", () => {
  const listSource = extractNamedFunctionSource(
    compareSource,
    "renderComparePickerList"
  );

  assert.match(
    listSource,
    /ylEscapeHtml\(window\.ylTerm\s*\?\s*window\.ylTerm\(subtype\(p\)\)\s*:\s*subtype\(p\)\)/
  );
  assert.ok(
    listSource.includes('onclick="ylCmpPickerAdd(this.dataset.productId)"'),
    "picker actions must read the escaped product id from data-product-id"
  );
  assert.doesNotMatch(
    listSource,
    /onclick="ylCmpPickerAdd\('\$\{p\.id\}'\)"/,
    "raw product ids must not be interpolated into inline JavaScript"
  );
});
