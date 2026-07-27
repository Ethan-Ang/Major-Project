import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const productsPath = new URL("../frontend/js/pages/products.js", import.meta.url);
const productsSource = fs.readFileSync(productsPath, "utf8");

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
  sections: {
    products: "Products",
    brands: "Brands",
    productTypes: "Product Types",
    industries: "Industries",
    surfaces: "Surfaces",
  },
  noMatches:
    "No direct matches. Press Enter to search the full catalogue.",
  advisor: "Ask the Product Advisor",
  productAria: "{product}, product",
  filterAria:
    "{label}, {type} filter, {count} {resultNoun}",
  filterApplied: "{label} filter applied. {resultCount}",
  filterTypes: {
    brand: "Brand",
    producttype: "Product Type",
    industry: "Industry",
    surface: "Surface",
  },
};

const chineseCopy = {
  sections: {
    products: "产品",
    brands: "品牌",
    productTypes: "产品类型",
    industries: "行业",
    surfaces: "表面 / 材料",
  },
  noMatches: "未找到直接匹配项。按 Enter 键搜索完整产品目录。",
  advisor: "询问产品顾问",
  productAria: "{product}，产品",
  filterAria: "{label}，{type}筛选，{count} 款产品",
  filterApplied: "已应用{label}筛选。{resultCount}",
  filterTypes: {
    brand: "品牌",
    producttype: "产品类型",
    industry: "行业",
    surface: "表面 / 材料",
  },
};

test("productsSearchCopy preserves English and supplies professional Chinese", () => {
  const productsSearchCopy = extractNamedFunction(
    productsSource,
    "productsSearchCopy"
  );

  assert.deepEqual(plain(productsSearchCopy("en")), englishCopy);
  assert.deepEqual(plain(productsSearchCopy("zh")), chineseCopy);
  assert.deepEqual(
    plain(productsSearchCopy("unsupported")),
    englishCopy,
    "unsupported languages must retain the current English copy"
  );
});

test("typeahead aria templates format named values without replacement expansion", () => {
  const formatProductsSearchCopy = extractNamedFunction(
    productsSource,
    "formatProductsSearchCopy"
  );

  assert.equal(
    formatProductsSearchCopy(englishCopy.productAria, {
      product: 'YL "Pro" & $&',
    }),
    'YL "Pro" & $&, product'
  );
  assert.equal(
    formatProductsSearchCopy(chineseCopy.filterAria, {
      label: "木材",
      type: chineseCopy.filterTypes.surface,
      count: 2,
      resultNoun: "products",
    }),
    "木材，表面 / 材料筛选，2 款产品"
  );
  assert.equal(
    formatProductsSearchCopy(englishCopy.filterApplied, {
      label: "Wood $&",
      resultCount: "8 products found",
    }),
    "Wood $& filter applied. 8 products found"
  );
  assert.equal(
    formatProductsSearchCopy(chineseCopy.filterApplied, {
      label: "木材",
      resultCount: "共 8 款产品",
    }),
    "已应用木材筛选。共 8 款产品"
  );
  assert.equal(
    formatProductsSearchCopy("Keep {missing}", { product: "YL-200" }),
    "Keep {missing}",
    "unknown placeholders must remain intact"
  );
});

test("the actual typeahead consumes localized copy and escapes dynamic aria", () => {
  const typeaheadSource = extractNamedFunctionSource(
    productsSource,
    "initSearchTypeahead"
  );

  assert.match(
    typeaheadSource,
    /const copy\s*=\s*productsSearchCopy\(window\.ylLang\)\s*;/,
    "typeahead must select copy from the active language"
  );
  assert.match(
    typeaheadSource,
    /if\s*\(item\.kind\s*===\s*"product"\)\s*return copy\.sections\.products\s*;/,
    "product section heading must use localized copy"
  );
  assert.match(
    typeaheadSource,
    /if\s*\(item\.kind\s*===\s*"filter"\)\s*return copy\.sections\[item\.group\]\s*\|\|\s*item\.group\s*;/,
    "filter section headings must use localized copy"
  );
  assert.match(
    typeaheadSource,
    /\$\{escapeHTML\(copy\.noMatches\)\}/,
    "no-match prompt must use escaped localized copy"
  );
  assert.match(
    typeaheadSource,
    /\$\{escapeHTML\(copy\.advisor\)\}/,
    "Product Advisor action must use escaped localized copy"
  );
  assert.match(
    typeaheadSource,
    /escapeHTML\(\s*formatProductsSearchCopy\(\s*copy\.productAria\s*,/,
    "product-row aria must format localized copy and escape the final value"
  );
  assert.match(
    typeaheadSource,
    /escapeHTML\(\s*formatProductsSearchCopy\(\s*copy\.filterAria\s*,/,
    "filter-row aria must format localized copy and escape the final value"
  );
  assert.match(
    typeaheadSource,
    /const filterType\s*=\s*copy\.filterTypes\[item\.type\]\s*\|\|\s*item\.type\s*;/,
    "filter-row aria must use localized filter type labels"
  );
  assert.match(
    typeaheadSource,
    /const appliedLabel\s*=\s*window\.ylTerm\s*\?\s*window\.ylTerm\(item\.label\)\s*:\s*item\.label\s*;/,
    "filter announcement must use the translated filter label"
  );
  assert.match(
    typeaheadSource,
    /window\.announce\(\s*formatProductsSearchCopy\(\s*copy\.filterApplied\s*,\s*\{[\s\S]*?label:\s*appliedLabel[\s\S]*?resultCount:\s*rc\s*\?\s*rc\.textContent\s*:\s*""[\s\S]*?\}\s*\)\.trim\(\)\s*\)\s*;/,
    "filter announcement must format localized copy with the live result count"
  );

  assert.doesNotMatch(
    typeaheadSource,
    /No direct matches\. Press Enter to search the full catalogue\./,
    "the render path must not retain a hardcoded English no-match prompt"
  );
  assert.doesNotMatch(
    typeaheadSource,
    />Ask the Product Advisor</,
    "the render path must not retain a hardcoded English advisor action"
  );
  assert.doesNotMatch(
    typeaheadSource,
    /`\$\{item\.label\} filter applied\./,
    "the interaction path must not retain a hardcoded English announcement"
  );
});

test("visible result counts and view-all behavior stay unchanged", () => {
  const typeaheadSource = extractNamedFunctionSource(
    productsSource,
    "initSearchTypeahead"
  );

  assert.match(
    typeaheadSource,
    /\$\{item\.count\} 款产品/,
    "Chinese visible filter counts must retain their current wording"
  );
  assert.match(
    typeaheadSource,
    /查看全部 \$\{item\.total\} 个匹配产品/,
    "Chinese view-all behavior must remain present"
  );
  assert.match(
    typeaheadSource,
    /View all \$\{item\.total\} matching products/,
    "English view-all behavior must remain present"
  );
});
