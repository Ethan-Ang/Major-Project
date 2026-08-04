// ─── State ──────────────────────────────────────────────────────
let activeFilters  = { productTypes: [], brands: [], industries: [], surfaces: [] };
let currentResults = [];
let initialLoadDone = false;
let bondFinderState = {
  active: false,
  materialOne: "",
  materialTwo: "",
  industry: "",
  method: "",
  productIds: [],
  scores: {},
  reasons: {}
};

// ─── Catalogue return state (for Product Detail's "Back to Products") ──
// Every part of the catalogue view that matters — free-text query, sort order
// and all four filter groups — already lives in the URL (see writeStateToURL),
// so remembering the URL plus the scroll offset is enough to put a visitor back
// exactly where they were. This is written when LEAVING the products page and
// read once, on request, by the back link. It deliberately does not rely on
// history.back(): after an in-place SPA visit document.referrer still names
// whatever document was originally loaded, so "go back" could land on Home,
// Google or another site entirely.
const YL_RETURN_KEY = "ylCatalogueReturn";
const YL_RETURN_FLAG = "ylCatalogueRestore";

function ylOnProductsPage() {
  return /\/products(\.html)?$/.test(location.pathname);
}

function ylSaveCatalogueReturn() {
  if (!ylOnProductsPage()) return;
  try {
    sessionStorage.setItem(YL_RETURN_KEY, JSON.stringify({
      url: location.pathname + location.search,
      y: Math.round(window.scrollY || window.pageYOffset || 0)
    }));
  } catch (e) { /* private mode: the back link falls back to plain /products */ }
}

// Read by product-detail.js / compare-page.js to build a real href.
window.ylCatalogueReturn = function () {
  try {
    const raw = sessionStorage.getItem(YL_RETURN_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    // Only ever trust a same-site products path from our own storage.
    if (!saved || typeof saved.url !== "string" || !/^\/products(\?|$)/.test(saved.url)) return null;
    return saved;
  } catch (e) { return null; }
};

// The back link sets this immediately before navigating, so a plain visit to
// /products still opens at the top of the page as it always has — only an
// explicit "Back to Products" restores the remembered scroll offset.
window.ylRequestCatalogueRestore = function () {
  try { sessionStorage.setItem(YL_RETURN_FLAG, "1"); } catch (e) {}
};

// Scroll back to a remembered offset. The target is always clamped to the
// document so a shorter result set can never strand the visitor past the end of
// the page — but the clamp must not be applied to a document that is still
// growing. Straight after the grid renders, card images have not settled and the
// page can measure far shorter than its final height, which would clamp a deep
// offset down to near the top. So the scroll is re-applied for a few frames while
// the document is still too short to reach the target, then stops. Bounded by a
// ~20-frame budget, and it gives up immediately once the target is reachable.
function ylRestoreCatalogueScroll(y) {
  let tries = 0;
  const step = () => {
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, Math.min(y, max));
    if (max < y && ++tries < 20) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function ylConsumeCatalogueRestore() {
  try {
    if (sessionStorage.getItem(YL_RETURN_FLAG) !== "1") return null;
    sessionStorage.removeItem(YL_RETURN_FLAG);
    const saved = window.ylCatalogueReturn();
    return saved && typeof saved.y === "number" ? saved.y : null;
  } catch (e) { return null; }
}

// ─── Init ────────────────────────────────────────────────────────
// Re-runnable across Swup page swaps: registered via ylReady (runs on initial
// load and on every swap) and self-selecting — it bails immediately when the
// products page's grid is not present. The catalogue fetch is reused for the
// session, so returning to this page via a swap renders instantly.
async function initProductsPage() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;
  initialLoadDone = false;

  if (!PRODUCTS || !PRODUCTS.length) {
    renderSkeleton();
    try {
      await loadProductsFromBackend();
    } catch (err) {
      // Defensive only: loadProductsFromBackend() falls back to the bundled
      // demo catalogue instead of throwing, so this branch should not be
      // reachable in normal operation. The real offline UX is the fallback.
      console.error(err);
      grid.innerHTML = (window.ylLang === "zh") ? `
        <div class="empty-state">
          <h3>产品暂时无法显示</h3>
          <p>请稍后刷新页面，或直接联系 Yee Lim，我们的团队将为您提供协助。</p>
          <a class="btn btn-outline" href="/contact">联系 Yee Lim</a>
        </div>` : `
        <div class="empty-state">
          <h3>Products are temporarily unavailable</h3>
          <p>Please refresh the page in a moment, or contact Yee Lim directly and our team will assist you.</p>
          <a class="btn btn-outline" href="/contact">Contact Yee Lim</a>
        </div>`;
      const rc = document.getElementById("resultCount");
      if (rc) rc.textContent = (window.ylLang === "zh") ? "0 款产品" : "0 products";
      return;
    }
  }

  // CLIENT-005: pull the admin-managed filter lists before parsing the URL or
  // building the sidebar (both read the taxonomy arrays). Runs once; on failure
  // the bundled arrays stay in place so the page still works.
  await loadTaxonomiesFromBackend();

  readStateFromURL();
  if (typeof enhanceCustomSelect === "function") {
    enhanceCustomSelect(document.getElementById("sortSelect"));
    // Same polished dropdown for the mobile filter bar's sort control, so the
    // phone view matches desktop instead of showing the raw OS select.
    enhanceCustomSelect(document.getElementById("mobileSortSelect"));
  }
  buildFilterCheckboxes();
  applyStateToCheckboxes();
  applyFilterGroupDefaults();
  syncShowMore(); // URL-restored checks must not hide behind "Show more"
  updateBasketCount();
  if (typeof renderCompareTray === "function") renderCompareTray();
  initSearchTypeahead();
  initBondFinder();

  // Set before the render so a restored scroll offset is not overwritten by the
  // deep-link scroll below (arriving via "Back to Products" is not a deep link).
  const restoreY = ylConsumeCatalogueRestore();

  requestAnimationFrame(() => {
    applyFilters({ skipUrlWrite: true });
    initialLoadDone = true;
    updateFilterScrollFade();
    initStickyToolbar();
    if (restoreY !== null) {
      ylRestoreCatalogueScroll(restoreY);
      return;
    }
    // Arriving from a footer/brand deep-link (e.g. ?brand=Deer™ Brand) should
    // land the visitor on the filtered results, not the top hero/search. A plain
    // /products visit (no filter params) still opens at the hero as before.
    const usp = new URLSearchParams(location.search);
    if (usp.has("brand") || usp.has("industry") || usp.has("surface") || usp.has("type")) {
      scrollToCatalogue();
    }
  });

  // Live filtering while typing (does NOT scroll the page). Bound to the fresh
  // search input, which is replaced on each swap, so these do not stack.
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => applyFilters());
    // Intentional submit (Enter key) applies the search and scrolls to results.
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitHeroSearch();
      }
    });
  }

  // Window-level listeners: registered a single time for the app's lifetime so
  // they never stack when the products page is re-entered via a swap. Each one
  // no-ops safely when the products DOM is absent.
  ylOnce("products:windowListeners", () => {
    window.addEventListener("resize", updateFilterScrollFade);
    const filterMobileQuery = window.matchMedia("(max-width: 640px)");
    const reconcileFilterMode = (event) => {
      const sidebar = document.getElementById("filterSidebar");
      if (event.matches) {
        if (sidebar && sidebar.classList.contains("open")) openFilterDrawerA11y(sidebar);
        return;
      }
      if (sidebar && sidebar.classList.contains("open")) closeFilterDrawer(false);
      else document.body.classList.remove("filter-drawer-open");
    };
    if (typeof filterMobileQuery.addEventListener === "function") {
      filterMobileQuery.addEventListener("change", reconcileFilterMode);
    } else if (typeof filterMobileQuery.addListener === "function") {
      filterMobileQuery.addListener(reconcileFilterMode);
    }
    document.addEventListener("swup:visit:start", ylCleanupFilterDrawer);
    // Snapshot the catalogue view as the visitor leaves it, for both navigation
    // modes: swup:visit:start fires on an in-place SPA visit (tapping a card),
    // pagehide covers a full document unload (direct link, reload, back/forward
    // cache eviction). Both read the live URL + scroll offset at that instant.
    document.addEventListener("swup:visit:start", ylSaveCatalogueReturn);
    window.addEventListener("pagehide", ylSaveCatalogueReturn);
    window.addEventListener("compareUpdated", syncCompareButtons);
    // Update the affected buttons in place — never re-render the whole grid
    // for a basket change (the full re-render re-ran every card's entrance
    // animation, which read as a page reload and could drop images briefly).
    window.addEventListener("basketUpdated", syncEnquiryButtons);
    // Back/forward across pushed filter states (A10). Swup skips popstate for
    // non-swup entries, so these are ours to restore. If a filter entry is
    // reached while another page's DOM is showing (Back from a swup-visited
    // detail page), reload so the products page renders with that state.
    window.addEventListener("popstate", () => {
      if (!/\/products(\.html)?$/.test(location.pathname)) return;
      const grid = document.getElementById("productGrid");
      if (!grid) { location.reload(); return; }
      readStateFromURL();
      applyStateToCheckboxes();
      if (typeof syncShowMore === "function") syncShowMore();
      const si = document.getElementById("searchInput");
      if (si && !new URLSearchParams(location.search).get("q")) si.value = "";
      applyFilters({ skipUrlWrite: true });
    });
  });
}
ylReady(initProductsPage);

// ─── Yee Lim Bond Finder V3 ─────────────────────────────────────
// Uses live products and admin-managed taxonomies. Two surface matches are
// required for a direct recommendation; industry and method refine the ranking.
function bondText(en, zh) {
  return window.ylLang === "zh" ? zh : en;
}

function bondDisplayTerm(value) {
  return window.ylTerm ? window.ylTerm(value) : value;
}

function bondEscape(value) {
  return escapeHTML(String(value == null ? "" : value));
}

function initBondFinder() {
  const first = document.getElementById("bondMaterialOne");
  const second = document.getElementById("bondMaterialTwo");
  const industry = document.getElementById("bondIndustry");
  const method = document.getElementById("bondMethod");
  const submit = document.getElementById("bondFinderSubmit");
  const clear = document.getElementById("bondFinderClear");
  if (!first || !second || !industry || !method || !submit || !clear) return;

  const selected = {
    first: bondFinderState.materialOne,
    second: bondFinderState.materialTwo,
    industry: bondFinderState.industry,
    method: bondFinderState.method
  };

  const surfaceOptions = ['<option value="">' +
    bondEscape(bondText("Select a surface", "请选择表面")) + '</option>']
    .concat((SURFACES || []).map(surface =>
      `<option value="${bondEscape(surface)}">${bondEscape(bondDisplayTerm(surface))}</option>`
    )).join("");
  first.innerHTML = surfaceOptions;
  second.innerHTML = surfaceOptions;

  industry.innerHTML = ['<option value="">' +
    bondEscape(bondText("No preference", "不限")) + '</option>']
    .concat((INDUSTRIES || []).map(item =>
      `<option value="${bondEscape(item)}">${bondEscape(bondDisplayTerm(item))}</option>`
    )).join("");

  const methodLabels = {
    Spray: "喷涂", Brush: "刷涂", Roll: "滚涂",
    Scrape: "刮涂", Dip: "浸涂", Injection: "注入"
  };
  method.innerHTML = ['<option value="">' +
    bondEscape(bondText("No preference", "不限")) + '</option>']
    .concat(Object.keys(methodLabels).map(item =>
      `<option value="${item}">${bondEscape(bondText(item, methodLabels[item]))}</option>`
    )).join("");

  first.value = (SURFACES || []).includes(selected.first) ? selected.first : "";
  second.value = (SURFACES || []).includes(selected.second) ? selected.second : "";
  industry.value = (INDUSTRIES || []).includes(selected.industry) ? selected.industry : "";
  method.value = selected.method || "";

  [first, second, industry, method].forEach(select => {
    if (typeof enhanceCustomSelect === "function") enhanceCustomSelect(select);
    if (typeof refreshCustomSelect === "function") refreshCustomSelect(select);
  });

  submit.addEventListener("click", runBondFinder);
  clear.addEventListener("click", resetBondFinder);

  if (bondFinderState.active && first.value && second.value) {
    updateBondFinderResult();
  } else if (bondFinderState.active) {
    resetBondFinder({ render: false });
  }
}

function bondNormal(value) {
  return String(value || "").trim().toLowerCase()
    .replace(/[™®]/g, "").replace(/\s+/g, " ");
}

function productHasBondSurface(product, surface) {
  const wanted = bondNormal(surface);
  return !!wanted && Array.isArray(product.surfaces) &&
    product.surfaces.some(item => bondNormal(item) === wanted);
}

function productHasBondIndustry(product, industry) {
  const wanted = bondNormal(industry);
  return !!wanted && Array.isArray(product.industries) &&
    product.industries.some(item => bondNormal(item) === wanted);
}

function productHasBondMethod(product, method) {
  const wanted = bondNormal(method);
  if (!wanted) return false;
  return (product.features || []).some(feature => {
    const text = bondNormal(feature);
    if (!text.includes("application")) return false;
    const applicationPart = text.split(":").slice(1).join(":") || text;
    return applicationPart.split(/[,/]| or /).some(part => bondNormal(part) === wanted);
  });
}

function isAvailableBondAdhesive(product) {
  if (bondNormal(product.status) !== "available") return false;

  const typeLabel = productType(product);
  const typeSlug = typeof taxonomySlug === "function"
    ? taxonomySlug("product_type", typeLabel)
    : ylSlug(typeLabel);

  // The original immutable taxonomy slug remains "adhesives" after label renames.
  if (typeSlug === "adhesives") return true;

  // Safe fallback for legacy/demo data when taxonomy metadata is unavailable.
  if (/spray|accessor|equipment/.test(typeSlug)) return false;
  if (bondNormal(product.brand) === "others & accessories") return false;
  if (bondNormal(product.category) === "others") return false;
  return /adhesive/.test(typeSlug);
}

function scoreBondFinderProduct(product, answers) {
  let score = 0;
  let possible = 60;
  const reasons = [];

  const firstMatch = productHasBondSurface(product, answers.materialOne);
  const secondMatch = productHasBondSurface(product, answers.materialTwo);

  if (firstMatch) {
    score += 30;
    reasons.push(bondText(
      `Suitable for ${answers.materialOne}`,
      `适用于${bondDisplayTerm(answers.materialOne)}`
    ));
  }
  if (secondMatch) {
    score += 30;
    reasons.push(bondText(
      `Suitable for ${answers.materialTwo}`,
      `适用于${bondDisplayTerm(answers.materialTwo)}`
    ));
  }

  if (answers.industry) {
    possible += 20;
    if (productHasBondIndustry(product, answers.industry)) {
      score += 20;
      reasons.push(bondText(
        `Used in ${answers.industry}`,
        `适用于${bondDisplayTerm(answers.industry)}行业`
      ));
    }
  }

  if (answers.method) {
    possible += 10;
    if (productHasBondMethod(product, answers.method)) {
      score += 10;
      reasons.push(bondText(
        `Supports ${answers.method.toLowerCase()} application`,
        `支持${bondDisplayTerm(answers.method)}施工`
      ));
    }
  }

  return {
    score,
    percent: possible ? Math.round((score / possible) * 100) : 0,
    reasons,
    bothSurfaces: firstMatch && secondMatch
  };
}

function getBondFinderMatches(answers) {
  const ranked = PRODUCTS
    .filter(isAvailableBondAdhesive)
    .map(product => ({ product, match: scoreBondFinderProduct(product, answers) }))
    .filter(item => item.match.score > 0)
    .sort((a, b) =>
      Number(b.match.bothSurfaces) - Number(a.match.bothSurfaces) ||
      b.match.percent - a.match.percent ||
      b.match.score - a.match.score ||
      a.product.name.localeCompare(b.product.name)
    );

  const direct = ranked.filter(item => item.match.bothSurfaces);
  return direct.length ? direct : ranked;
}

function bondFinderMatchLabel(percent, bothSurfaces) {
  if (bothSurfaces && percent >= 80) {
    return bondText("Strong catalogue match", "高度匹配");
  }
  if (bothSurfaces) return bondText("Good catalogue match", "良好匹配");
  return bondText("Related product", "相关产品");
}

function runBondFinder() {
  const first = document.getElementById("bondMaterialOne");
  const second = document.getElementById("bondMaterialTwo");
  const industry = document.getElementById("bondIndustry");
  const method = document.getElementById("bondMethod");
  const result = document.getElementById("bondFinderResult");
  const title = document.getElementById("bondFinderResultTitle");
  const text = document.getElementById("bondFinderResultText");
  if (!first || !second || !industry || !method || !result || !title || !text) return;

  if (!first.value || !second.value) {
    result.hidden = false;
    result.classList.add("is-warning");
    title.textContent = bondText("Select both surfaces", "请选择两种表面");
    text.textContent = bondText(
      "Choose the first and second surface before searching.",
      "搜索前，请先选择第一种和第二种表面。"
    );
    first.focus();
    return;
  }

  const answers = {
    materialOne: first.value,
    materialTwo: second.value,
    industry: industry.value,
    method: method.value
  };
  const ranked = getBondFinderMatches(answers);
  const scores = {};
  const reasons = {};

  ranked.forEach(item => {
    const id = String(item.product.id);
    scores[id] = {
      percent: item.match.percent,
      bothSurfaces: item.match.bothSurfaces,
      label: bondFinderMatchLabel(item.match.percent, item.match.bothSurfaces)
    };
    reasons[id] = item.match.reasons;
  });

  bondFinderState = {
    active: true,
    ...answers,
    productIds: ranked.map(item => String(item.product.id)),
    scores,
    reasons
  };

  updateBondFinderResult();
  applyFilters({ skipUrlWrite: true });
  scrollToCatalogue();
}

function buildBondFinderWhatsAppLink() {
  const wa = document.getElementById("bondFinderWhatsapp");
  if (!wa || !bondFinderState.active) return;

  const names = bondFinderState.productIds.slice(0, 3).map(id => {
    const p = PRODUCTS.find(product => String(product.id) === String(id));
    return p ? `- ${p.name}` : "";
  }).filter(Boolean);

  const lines = window.ylLang === "zh" ? [
    "您好 Yee Lim，我使用了粘合方案查找器。",
    "",
    `表面 1：${bondDisplayTerm(bondFinderState.materialOne)}`,
    `表面 2：${bondDisplayTerm(bondFinderState.materialTwo)}`,
    `行业：${bondFinderState.industry ? bondDisplayTerm(bondFinderState.industry) : "不限"}`,
    `施工方法：${bondFinderState.method || "不限"}`,
    "",
    "推荐产品：",
    ...(names.length ? names : ["- 暂无记录匹配"]),
    "",
    "请问可以帮我确认哪一款产品最合适吗？"
  ] : [
    "Hello Yee Lim, I used the Bond Finder.",
    "",
    `Surface 1: ${bondFinderState.materialOne}`,
    `Surface 2: ${bondFinderState.materialTwo}`,
    `Industry: ${bondFinderState.industry || "No preference"}`,
    `Application method: ${bondFinderState.method || "No preference"}`,
    "",
    "Recommended products:",
    ...(names.length ? names : ["- No recorded match"]),
    "",
    "Could you confirm which product is most suitable?"
  ];

  wa.href = `https://wa.me/6588755786?text=${encodeURIComponent(lines.join("\n"))}`;
}

function updateBondFinderResult() {
  const result = document.getElementById("bondFinderResult");
  const title = document.getElementById("bondFinderResultTitle");
  const text = document.getElementById("bondFinderResultText");
  if (!result || !title || !text || !bondFinderState.active) return;

  // Remove deleted/unavailable products from a recommendation restored in-memory.
  bondFinderState.productIds = bondFinderState.productIds.filter(id => {
    const product = PRODUCTS.find(item => String(item.id) === String(id));
    return product && isAvailableBondAdhesive(product);
  });

  const count = bondFinderState.productIds.length;
  const pairEn = `${bondFinderState.materialOne} + ${bondFinderState.materialTwo}`;
  const pairZh = `${bondDisplayTerm(bondFinderState.materialOne)} + ${bondDisplayTerm(bondFinderState.materialTwo)}`;
  const hasDirect = bondFinderState.productIds.some(id =>
    bondFinderState.scores[id] && bondFinderState.scores[id].bothSurfaces
  );

  result.hidden = false;
  result.classList.toggle("is-warning", !hasDirect);

  if (hasDirect) {
    title.textContent = window.ylLang === "zh"
      ? `${pairZh} 找到 ${count} 项排序匹配`
      : `${count} ranked ${count === 1 ? "match" : "matches"} for ${pairEn}`;
    text.textContent = bondText(
      "Products are ordered by surface, industry and application-method fit. Each card explains why it was recommended.",
      "产品按表面、行业及施工方法的匹配程度排序。每张产品卡都会说明推荐原因。"
    );
  } else if (count) {
    title.textContent = bondText(
      `No direct two-surface match for ${pairEn}`,
      `${pairZh} 暂无直接双表面匹配`
    );
    text.textContent = window.ylLang === "zh"
      ? `现显示 ${count} 款相关产品。它们至少匹配一种所选表面，使用前需要技术确认。`
      : `${count} related ${count === 1 ? "product is" : "products are"} shown. These match at least one selected surface and require technical confirmation.`;
  } else {
    title.textContent = bondText(
      `No recorded match for ${pairEn}`,
      `${pairZh} 暂无记录匹配`
    );
    text.innerHTML = window.ylLang === "zh"
      ? '目前有货的胶粘剂中没有符合所选目录标签的产品。请<a href="/contact">联系 Yee Lim 获取技术建议</a>。'
      : 'No currently available adhesive matches the selected catalogue tags. <a href="/contact">Contact Yee Lim for technical advice</a>.';
  }

  buildBondFinderWhatsAppLink();
}

function bondFinderExplanationHTML(product) {
  if (!bondFinderState.active) return "";
  const id = String(product.id);
  const meta = bondFinderState.scores[id];
  const reasons = bondFinderState.reasons[id] || [];
  if (!meta) return "";

  return `
    <div class="bond-match-box">
      <div class="bond-match-head">
        <span class="bond-match-label">${bondEscape(meta.label)}</span>
        <strong>${meta.percent}%</strong>
      </div>
      <ul>${reasons.slice(0, 4).map(reason => `<li>${bondEscape(reason)}</li>`).join("")}</ul>
    </div>`;
}

function resetBondFinder(opts = {}) {
  bondFinderState = {
    active: false,
    materialOne: "",
    materialTwo: "",
    industry: "",
    method: "",
    productIds: [],
    scores: {},
    reasons: {}
  };

  ["bondMaterialOne", "bondMaterialTwo", "bondIndustry", "bondMethod"].forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    select.value = "";
    if (typeof refreshCustomSelect === "function") refreshCustomSelect(select);
  });

  const result = document.getElementById("bondFinderResult");
  if (result) {
    result.hidden = true;
    result.classList.remove("is-warning");
  }

  if (opts.render !== false && document.getElementById("productGrid")) {
    applyFilters({ skipUrlWrite: true });
  }
}

// ─── Hero search submit ───────────────────────────────────────────
// Called by the hero Search button and the Enter key. Applies the current
// search/filters as usual, then smoothly scrolls down to the catalogue so the
// user sees the matching results (or the "no results" state) without having to
// scroll manually. Typing alone never triggers this — only an explicit submit.
function submitHeroSearch() {
  applyFilters({ pushHistory: true }); // an explicit submit is a committed state (A10)
  scrollToCatalogue();
}

// Scroll to the catalogue results, accounting for the sticky navbar so the
// "Full Adhesive Range" heading is not hidden underneath it.
function scrollToCatalogue() {
  const target = document.getElementById("catalogue");
  if (!target) return;
  const nav = document.querySelector(".nav");
  const offset = (nav ? nav.offsetHeight : 0) + 8;
  const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
}

// ─── URL state ──────────────────────────────────────────────────
// FBL-001: footer/nav deep-links use stable slugs (?brand=deer) that must not
// depend on trademark symbols, punctuation, or case. Both slug and full
// display-name URLs resolve to the canonical checkbox value; unknown tokens
// pass through unchanged (harmlessly matching nothing).
const BRAND_SLUGS = {
  deer:     "Deer™ Brand",
  horsemen: "Horsemen™ Brand",
  premier:  "Premier™ Brand",
  rhino:    "Rhino™ Brand",
};
function canonicalBrand(token) {
  const key = String(token).toLowerCase().replace(/™|®/g, "").replace(/\s*brand\s*$/i, "").trim();
  return BRAND_SLUGS[key] || canonicalValue(BRANDS, token);
}

// Shared search-text normalisation, used by BOTH the free-text grid matching
// (applyFilters) and the typeahead suggestions so the two can never disagree:
// lowercase, ™/® optional, hyphens/dashes folded to spaces ("spray-guns" ==
// "spray guns"), whitespace runs collapsed. Other punctuation stays literal.
// URL slugs deliberately do NOT use this — they go through ylSlug below.
function ylSearchNorm(s) {
  return String(s || "").toLowerCase().replace(/[™®]/g, "")
    .replace(/[-‐-―]/g, " ").replace(/\s+/g, " ").trim();
}

// ─── Search matching (word-prefix, not naive substring) ───────────
// Real product search matches the START of a word, not any letter anywhere:
// "a" must not match "brand", but "pre" should match "Premier". A query is only
// active at 2+ non-space characters, so a lone letter never dumps the catalogue.
function ylWords(s) { return ylSearchNorm(s).split(" ").filter(Boolean); }

// Words that make up a product's searchable text. In SHORT mode (a single-letter
// query) only the NAME and BRAND count, so one letter jumps to a product/brand
// initial ("s" -> Spray Gun, "d" -> Deer) instead of matching the generic word
// "Adhesives" that appears on every product. 2+ letters search every field.
function ylProductWords(p, shortMode) {
  const fields = shortMode
    ? [p.name, p.brand, brandDisplay(p.brand)]
    : [p.name, p.brand, brandDisplay(p.brand), productType(p),
       p.shortDescription, (p.industries || []).join(" "), (p.surfaces || []).join(" ")];
  return ylWords(fields.join(" "));
}

// Every query token must be a PREFIX of some word (AND across tokens), so
// "wood glue" needs a word starting with each of "wood" and "glue".
function ylPrefixMatch(words, query) {
  const toks = ylSearchNorm(query).split(" ").filter(Boolean);
  if (!toks.length) return true;
  return toks.every(t => words.some(w => w.startsWith(t)));
}

// True when a query is a single real character (name/brand-initial mode).
function ylShortQuery(query) {
  return ylSearchNorm(query).replace(/\s+/g, "").length < 2;
}

// Canonical slug for URL state (SEARCH-001 A10): lowercase, ™/® dropped,
// non-alphanumerics collapse to "-". "Lift & Escalator" → "lift-escalator".
function ylSlug(s) {
  return String(s || "").toLowerCase().replace(/[™®]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Resolve a URL token (slug OR legacy display value, any case) back to the
// canonical display value from a known list. Unknown tokens pass through
// unchanged and harmlessly match nothing.
function canonicalValue(list, token) {
  const t = ylSlug(token);
  return (list || []).find(v => ylSlug(v) === t) || token;
}

function readStateFromURL() {
  const params = new URLSearchParams(window.location.search);
  const searchInput = document.getElementById("searchInput");
  const sortSelect  = document.getElementById("sortSelect");

  if (params.get("q")) searchInput.value = params.get("q");
  if (params.get("sort") && sortSelect) {
    sortSelect.value = params.get("sort");
    if (typeof refreshCustomSelect === "function") refreshCustomSelect(sortSelect);
    const mobileSortSelect = document.getElementById("mobileSortSelect");
    if (mobileSortSelect) mobileSortSelect.value = params.get("sort");
  }

  activeFilters.productTypes = params.get("type")     ? params.get("type").split("|").map(t => canonicalValue(PRODUCT_TYPES, t)) : [];
  activeFilters.brands       = params.get("brand")    ? params.get("brand").split("|").map(canonicalBrand) : [];
  activeFilters.industries   = params.get("industry") ? params.get("industry").split("|").map(t => canonicalValue(INDUSTRIES, t)) : [];
  activeFilters.surfaces     = params.get("surface")  ? params.get("surface").split("|").map(t => canonicalValue(SURFACES, t)) : [];
}

function writeStateToURL(opts = {}) {
  const params = new URLSearchParams();
  const search = document.getElementById("searchInput").value.trim();
  const sort   = document.getElementById("sortSelect").value;

  // URLs carry canonical slugs (brand=deer, industry=flooring) — stable across
  // trademark symbols, case and punctuation. readStateFromURL resolves them
  // (and legacy display-value URLs) back to display labels.
  const brandSlug = b => {
    const short = Object.keys(BRAND_SLUGS).find(k => BRAND_SLUGS[k] === b);
    return short || ylSlug(b);
  };
  if (search) params.set("q", search);
  if (sort && sort !== "default") params.set("sort", sort);
  if (activeFilters.productTypes.length) params.set("type",  activeFilters.productTypes.map(ylSlug).join("|"));
  if (activeFilters.brands.length)     params.set("brand",    activeFilters.brands.map(brandSlug).join("|"));
  if (activeFilters.industries.length) params.set("industry", activeFilters.industries.map(ylSlug).join("|"));
  if (activeFilters.surfaces.length)   params.set("surface",  activeFilters.surfaces.map(ylSlug).join("|"));

  const queryStr = params.toString();
  const newUrl   = queryStr ? `${location.pathname}?${queryStr}` : location.pathname;
  // Typing/checkbox tweaks replace the current entry (no history spam); a
  // committed selection (suggestion chosen, explicit search submit) pushes one,
  // so Back steps through meaningful states (A10). A committed entry is never
  // clobbered by later typing: the first scratch write after a commit branches
  // to a new entry instead of replacing it. Existing state props are preserved
  // on replace so a Swup-owned entry keeps its `source` marker.
  const cur = history.state || {};
  const changed = location.search !== (queryStr ? `?${queryStr}` : "");
  // HIST-001: Swup stores the entry's own address in history.state.url and, on
  // popstate, navigates to `state.url ?? location.href`. Carrying a Swup state
  // object forward unchanged therefore pinned the entry to the bare "/products"
  // it was created with, so Back out of a filtered catalogue silently dropped
  // every filter. Any state we write now also restates the address it belongs
  // to, keeping Swup's record and the visible URL the same thing.
  const keep = extra => Object.assign({}, cur, { url: newUrl }, extra);
  if (opts.push) {
    if (changed) history.pushState({ ylFilters: true, ylCommitted: true }, "", newUrl);
    else history.replaceState(keep({ ylFilters: true, ylCommitted: true }), "", newUrl);
  } else if (cur.ylCommitted && changed) {
    history.pushState({ ylFilters: true }, "", newUrl);
  } else {
    history.replaceState(keep({ ylFilters: true }), "", newUrl);
  }
}

function applyStateToCheckboxes() {
  // Called after buildFilterCheckboxes — restores checked state from activeFilters
  document.querySelectorAll(".filter-sidebar input[type=checkbox]").forEach(cb => {
    const type = cb.dataset.type;
    const val  = cb.value;
    if (type === "producttype") cb.checked = activeFilters.productTypes.includes(val);
    if (type === "brand")    cb.checked = activeFilters.brands.includes(val);
    if (type === "industry") cb.checked = activeFilters.industries.includes(val);
    if (type === "surface")  cb.checked = activeFilters.surfaces.includes(val);
  });
}

// ─── Filter checkboxes with counts ───────────────────────────────
function buildFilterCheckboxes() {
  // Brand filter shows only the four real adhesive brands. Accessories stay in
  // the catalogue and remain findable via search; they are not a brand.
  const brandList = (typeof PUBLIC_BRANDS !== "undefined") ? PUBLIC_BRANDS
    : BRANDS.filter(b => b !== "Others & Accessories");
  // Product Type is the broadest split: Adhesives vs Spray Guns & Accessories.
  // This is where the spray guns are discoverable now that they are not a brand.
  buildCheckboxGroup("productTypeFilters", PRODUCT_TYPES, "producttype", p => [productType(p)]);
  buildCheckboxGroup("brandFilters",    brandList,  "brand",    p => [p.brand]);
  buildCheckboxGroup("industryFilters", INDUSTRIES, "industry", p => p.industries);
  buildCheckboxGroup("surfaceFilters",  SURFACES,   "surface",  p => p.surfaces);
}

function buildCheckboxGroup(containerId, items, type, valueExtractor) {
  const container = document.getElementById(containerId);
  const counts = {};
  PRODUCTS.forEach(p => {
    valueExtractor(p).forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  });

  const row = item => {
    const count = counts[item] || 0;
    const disabled = count === 0 ? "disabled" : "";
    return `
      <label class="${disabled ? 'is-empty' : ''}">
        <input type="checkbox" value="${item}" data-type="${type}" onchange="applyFilters()" ${disabled}>
        <span class="filter-label-text">${window.ylTerm ? window.ylTerm(item) : item}</span>
        <span class="filter-count">${count}</span>
      </label>
    `;
  };

  // FILTER-001: long groups (Industry 12, Surface 15) buried the sidebar tail
  // below the inner scroll fold. Show the first 8, tuck the rest behind a
  // "Show more" toggle. Options are never lost: the toggle reveals all, a
  // checked hidden option force-expands (see syncShowMore), and the expansion
  // is remembered for the session.
  const VISIBLE = 8;
  let html;
  if (items.length > VISIBLE + 1) {
    const head = items.slice(0, VISIBLE).map(row).join("");
    const rest = items.slice(VISIBLE);
    const expanded = sessionStorage.getItem("ylFgMore:" + containerId) === "1";
    html = `${head}
      <div class="fg-more" ${expanded ? "" : "hidden"}>${rest.map(row).join("")}</div>
      <button type="button" class="fg-more-btn" data-container="${containerId}"
        aria-expanded="${expanded}" onclick="toggleFgMore(this)">
        ${expanded ? ylTr("products.show_less", "Show less") : `${ylTr("products.show_more", "Show more")} (${rest.length})`}</button>`;
  } else {
    html = items.map(row).join("");
  }
  // Single wrapper so the group can collapse smoothly via grid-template-rows.
  container.innerHTML = `<div class="fg-rows">${html}</div>`;
}

// Toggle a group's "Show more" region; remembered per session.
function toggleFgMore(btn) {
  const more = btn.parentElement.querySelector(".fg-more");
  if (!more) return;
  const expand = more.hidden;
  more.hidden = !expand;
  btn.setAttribute("aria-expanded", String(expand));
  btn.textContent = expand ? ylTr("products.show_less", "Show less") : `${ylTr("products.show_more", "Show more")} (${more.querySelectorAll("label").length})`;
  sessionStorage.setItem("ylFgMore:" + btn.dataset.container, expand ? "1" : "0");
  updateFilterScrollFade();
}

// A checked option must never sit inside a collapsed "Show more" region
// (FILTER-001 req 22). Called after any programmatic check (URL restore,
// typeahead selection, popstate).
function syncShowMore() {
  document.querySelectorAll(".filter-sidebar .fg-more").forEach(more => {
    if (more.hidden && more.querySelector("input:checked")) {
      const btn = more.parentElement.querySelector(".fg-more-btn");
      if (btn) toggleFgMore(btn);
    }
  });
}

// Reveal one checkbox if it is hidden behind "Show more" (typeahead selection).
function revealCheckbox(cb) {
  const more = cb.closest(".fg-more");
  if (more && more.hidden) {
    const btn = more.parentElement.querySelector(".fg-more-btn");
    if (btn) toggleFgMore(btn);
  }
}

// ─── Apply search + filters + sort ───────────────────────────────
function applyFilters(opts = {}) {
  // Same normalisation as the typeahead (ylSearchNorm), so the live grid and
  // the suggestion panel always agree — e.g. "spray-guns" matches "Spray Guns".
  const query   = ylSearchNorm(document.getElementById("searchInput").value);
  const sortVal = document.getElementById("sortSelect").value;

  activeFilters = { productTypes: [], brands: [], industries: [], surfaces: [] };
  document.querySelectorAll(".filter-sidebar input[type=checkbox]:checked").forEach(cb => {
    const type = cb.dataset.type;
    if (type === "producttype") activeFilters.productTypes.push(cb.value);
    if (type === "brand")    activeFilters.brands.push(cb.value);
    if (type === "industry") activeFilters.industries.push(cb.value);
    if (type === "surface")  activeFilters.surfaces.push(cb.value);
  });

  let results = PRODUCTS.filter(p => {
    // Note: does not match against p.features. Those are internal spec bullets
    // (e.g. "lab-tested", "Low VOC") — matching them let short, generic words
    // like "test" surface unrelated products via substrings such as "tested".
    // Word-prefix match. A single letter matches name/brand initials only; 2+
    // characters search every field. Empty query leaves the grid unfiltered.
    const matchesQuery = !query ||
      ylPrefixMatch(ylProductWords(p, ylShortQuery(query)), query);

    const matchesType = activeFilters.productTypes.length === 0 ||
      activeFilters.productTypes.includes(productType(p));

    const matchesBrand = activeFilters.brands.length === 0 ||
      activeFilters.brands.includes(p.brand);

    const matchesIndustry = activeFilters.industries.length === 0 ||
      p.industries.some(i => activeFilters.industries.includes(i));

    const matchesSurface = activeFilters.surfaces.length === 0 ||
      p.surfaces.some(s => activeFilters.surfaces.includes(s));

    return matchesQuery && matchesType && matchesBrand && matchesIndustry && matchesSurface;
  });


  if (bondFinderState.active) {
    const allowed = new Set(bondFinderState.productIds.map(String));
    results = results.filter(product => allowed.has(String(product.id)));
  }

  if (sortVal === "az")    results.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortVal === "za") results.sort((a, b) => b.name.localeCompare(a.name));
  else if (sortVal === "brand") results.sort((a, b) => a.brand.localeCompare(b.brand));

  renderFilterChips();
  renderGrid(results);

  if (!opts.skipUrlWrite) writeStateToURL({ push: !!opts.pushHistory });
  updateClearVisibility();
  updateFilterGroupBadges();
}

function formatActiveFilterSummary(totalActive, lang) {
  if (totalActive === 0) return "";
  if (lang === "zh") return `已选 ${totalActive} 项`;
  return totalActive === 1 ? "1 filter active" : `${totalActive} filters active`;
}

function updateFilterGroupBadges() {
  let totalActive = 0;

  document.querySelectorAll(".filter-sidebar .filter-group").forEach(group => {
    const badge   = group.querySelector(".filter-group-badge");
    const checked = group.querySelectorAll("input[type=checkbox]:checked").length;
    totalActive  += checked;
    if (badge) {
      badge.textContent = "";
      badge.style.display = "none";
    }
  });

  // Mobile filter bar total count badge
  const mobileCount = document.getElementById("mobileFilterCount");
  if (mobileCount) {
    mobileCount.textContent   = totalActive || "";
    mobileCount.style.display = totalActive > 0 ? "inline-flex" : "none";
  }

  // Desktop sidebar heading chip: a calmer summary of the total applied filters.
  const headTotal = document.getElementById("filterActiveTotal");
  if (headTotal) {
    headTotal.textContent = formatActiveFilterSummary(totalActive, window.ylLang);
    headTotal.hidden = totalActive === 0;
  }
}

function updateClearVisibility() {
  const any = activeFilters.productTypes.length || activeFilters.brands.length ||
              activeFilters.industries.length || activeFilters.surfaces.length ||
              document.getElementById("searchInput").value.trim();
  // Mobile count-row "Clear all" mirrors the same active state.
  const gca = document.getElementById("gridClearAll");
  if (gca) gca.hidden = !any;
}

function clearFilters() {
  document.querySelectorAll(".filter-sidebar input[type=checkbox]").forEach(cb => cb.checked = false);
  document.getElementById("searchInput").value = "";
  const sortSelect = document.getElementById("sortSelect");
  sortSelect.value = "default";
  if (typeof refreshCustomSelect === "function") refreshCustomSelect(sortSelect);
  const mobileSortSelect = document.getElementById("mobileSortSelect");
  if (mobileSortSelect) {
    mobileSortSelect.value = "default";
    if (typeof refreshCustomSelect === "function") refreshCustomSelect(mobileSortSelect);
  }
  activeFilters = { productTypes: [], brands: [], industries: [], surfaces: [] };
  renderFilterChips();
  renderGrid(PRODUCTS);
  writeStateToURL();
  updateClearVisibility();
  updateFilterGroupBadges();
}

// ─── Active filters ────────────────────────────────────────────────
// The active state is shown ONCE per breakpoint (locked final design):
// desktop renders compact chips inside the filter sidebar's "Active filters"
// block; mobile renders the same chips as a one-line summary strip above the
// grid while the filter drawer is closed. Each chip's × removes just that one.
function renderFilterChips() {
  const chips = [];

  const chip = (label, aria, onclick) =>
    `<button class="filter-chip" aria-label="${aria}" onclick="${onclick}">${label} <span aria-hidden="true">&times;</span></button>`;

  const query = document.getElementById("searchInput").value.trim();
  if (query) {
    chips.push(chip(`&ldquo;${escapeHTML(query)}&rdquo;`, "Remove search filter", "clearSearch()"));
  }

  const addChip = (type, value) => {
    const disp  = window.ylTerm ? window.ylTerm(value) : value; // Chinese label when zh
    const safe  = escapeHTML(disp);             // safe as both text and quoted attr
    const jsVal = value.replace(/'/g, "\\'");   // English value drives removeFilter
    chips.push(chip(safe, `Remove ${safe} filter`, `removeFilter('${type}','${jsVal}')`));
  };
  activeFilters.productTypes.forEach(t => addChip("producttype", t));
  activeFilters.brands.forEach(b     => addChip("brand", b));
  activeFilters.industries.forEach(i => addChip("industry", i));
  activeFilters.surfaces.forEach(s   => addChip("surface", s));

  // Desktop: the block inside the filter sidebar.
  const sidebarBlock = document.getElementById("sidebarActive");
  const sidebarChips = document.getElementById("sidebarActiveChips");
  if (sidebarBlock && sidebarChips) {
    sidebarBlock.hidden = !chips.length;
    sidebarChips.innerHTML = chips.join("");
  }

  // Mobile: compact one-line summary above the grid (drawer closed).
  const strip = document.getElementById("activeChips");
  if (strip) {
    if (!chips.length) {
      strip.hidden = true;
      strip.innerHTML = "";
    } else {
      strip.hidden = false;
      strip.innerHTML =
        `<div class="active-filter-bar-inner">` +
          `<span class="active-filter-label">${ylTr("products.active_filters", "Active filters")}:</span>` +
          `<div class="active-filter-pills">${chips.join("")}</div>` +
          `<button class="active-filter-clear" onclick="clearFilters()">${ylTr("products.clear_all", "Clear all")}</button>` +
        `</div>`;
    }
  }
}

function escapeHTML(s) {
  return s.replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
}

function clearSearch() {
  document.getElementById("searchInput").value = "";
  applyFilters();
}

function removeFilter(type, value) {
  const cb = document.querySelector(
    `.filter-sidebar input[data-type="${type}"][value="${value}"]`
  );
  if (cb) cb.checked = false;
  applyFilters();
}

// ─── Skeleton state ───────────────────────────────────────────────
function renderSkeleton() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;
  grid.innerHTML = Array.from({ length: 6 }).map(() => `
    <div class="product-card skeleton-card" aria-hidden="true">
      <div class="skeleton-img"></div>
      <div class="product-card-body">
        <div class="skeleton-line skeleton-line-short"></div>
        <div class="skeleton-line skeleton-line-title"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-line-mid"></div>
      </div>
    </div>
  `).join("");
}

// ─── Render product grid ──────────────────────────────────────────
function renderGrid(products) {
  currentResults = products;
  const grid    = document.getElementById("productGrid");
  const countEl = document.getElementById("resultCount");

  const totalCount = (typeof PRODUCTS !== "undefined" && PRODUCTS) ? PRODUCTS.length : products.length;
  const countNoun  = `product${products.length !== 1 ? "s" : ""}`;
  // Show the narrowing ("8 of 31 products") whenever filters/search reduce the
  // set, so buyers feel the effect. The "of N" span is revealed on mobile only.
  // Bold count (locked ReBond reference: "31 products found", number leading).
  if (window.ylLang === "zh") {
    countEl.innerHTML = (products.length < totalCount)
      ? `<strong>${products.length}</strong> <span class="rc-of">/ ${totalCount} </span>款产品`
      : `共 <strong>${products.length}</strong> 款产品`;
  } else if (products.length < totalCount) {
    countEl.innerHTML = `<strong>${products.length}</strong> <span class="rc-of">of ${totalCount} </span>${countNoun} found`;
  } else {
    countEl.innerHTML = `<strong>${products.length}</strong> ${countNoun} found`;
  }

  const applyBtn = document.getElementById("drawerApplyBtn");
  if (applyBtn) applyBtn.textContent = (window.ylLang === "zh")
    ? `显示 ${products.length} 款产品`
    : `Show ${products.length} product${products.length !== 1 ? "s" : ""}`;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon" aria-hidden="true">&#9783;</div>
        <h3>${ylTr("products.empty_title", "No products match those filters")}</h3>
        <p>${ylTr("products.empty_body", "Try removing a filter or clearing your search, or describe your job to the Product Advisor.")}</p>
        <div class="empty-state-actions">
          <button class="btn btn-outline" onclick="clearFilters()">${ylTr("products.empty_clear", "Clear all filters")}</button>
          <button class="btn btn-outline" onclick="if(window.openProductAdvisor)openProductAdvisor()">${ylTr("products.empty_advisor", "Ask the Product Advisor")}</button>
        </div>
      </div>`;
    return;
  }

  grid.innerHTML = products.map(p => productCardHTML(p)).join("");

  grid.querySelectorAll(".product-card").forEach((card, i) => {
    card.classList.add("animate");
    card.style.animationDelay = `${Math.min(i, 8) * 0.04}s`;
  });
}

// "Best for" line. Prefer real industry/application tags; if a product has
// none (e.g. wallpaper or acrylic adhesives that map to no industry, or the
// spray-gun accessories), fall back to surfaces, then accessory/category, so
// the card never shows a blank "Best for" area.
// "Best for" answers "what job is this product for", so only real industry or
// surface data can fill it. It used to fall back to "Accessory", the category,
// or the invented string "General Adhesive Use" — none of which are jobs. On the
// two spray guns (the only products with no industries and no surfaces) that
// rendered "Best for: Accessory", a classification sitting where a use case
// belongs, directly under the ACCESSORY chip already on the card. Returning ""
// makes the caller drop the row, exactly as the "Works on" row already does.
function bestForText(p) {
  if (p.industries && p.industries.length) return p.industries.slice(0, 2).join(", ");
  if (p.surfaces && p.surfaces.length)     return p.surfaces.slice(0, 2).join(", ");
  return "";
}

// Derive a short model code from the product name for the card meta line
// ("Deer™ Brand 101" → "101", "Horsemen™ 707S" → "707S"). Returns "" when there
// is no clean short code (e.g. accessories / long descriptive names), so the
// card just shows the availability status instead of a "No." with junk.
function productCodeFromName(p) {
  const code = String(p.name || "")
    .replace(/™/g, "")
    .replace(/\bbrand\b/gi, "")
    .replace(/^\s*(deer|horsemen|premier|rhino)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return (code && code.length <= 10 && code.toLowerCase() !== String(p.name || "").toLowerCase()) ? code : "";
}

// Official brand marks (real assets only, never redrawn). /images/logos/marks/
// holds the SAME four official emblems trimmed to their own content and centred
// on a square canvas: the originals sit on a big padded sheet at four different
// content ratios, so at card size the deer rendered as a tiny speck while the
// rhino nearly filled its box. Trimmed + squared, every brand now reads at one
// deliberate weight through a plain object-fit:contain window. Accessories have
// no official mark and fall back to a plain text tag.
const BRAND_LOGOS = {
  "Deer™ Brand":     "/images/logos/marks/Deer.png",
  "Horsemen™ Brand": "/images/logos/marks/Horsemen.png",
  "Premier™ Brand":  "/images/logos/marks/Premier.png",
  "Rhino™ Brand":    "/images/logos/marks/Rhino.png",
};

// Truthful one-line subtype under the product name, derived from real data:
// the solvent/water base feature when recorded, otherwise the product type.
function productSubtype(p) {
  if (productType(p) !== "Adhesives") return "Application Equipment";
  const base = (p.features || []).find(f => /(solvent|water)[\s-]*based/i.test(f));
  if (base) {
    const m = base.match(/(solvent|water)[\s-]*based/i);
    return m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() + "-based Adhesive";
  }
  return "Adhesive";
}

function productCardHTML(p) {
  const basket   = getBasket();
  const inBasket = basket.includes(p.id);
  const inCompare       = isInCompare(p.id);
  const compareListFull = getCompareList().length >= COMPARE_MAX;
  const compareDisabled = !inCompare && compareListFull;

  // Chinese: translate each taxonomy value in the "Best for" / "Works on" lists.
  const termList = window.ylTermList || (s => s);
  const primaryApps = escapeHTML(termList(bestForText(p)));
  const worksOn = p.surfaces && p.surfaces.length ? escapeHTML(termList(p.surfaces.slice(0, 3).join(", "))) : "";

  const hasRealImage = p.images && p.images.length > 0;
  const brandLabel = escapeHTML(p.brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase());
  const imageContent = hasRealImage
    ? `<img src="${encodeURI(p.images[0])}" alt="${escapeHTML(p.name)}" loading="lazy" onerror="ylImageFallback(this,'${brandLabel}')">`
    : `<div class="no-image-mark" aria-hidden="true">${brandLabel}</div>`;
  const imageClass = hasRealImage ? "product-card-image" : "product-card-image no-image";
  const detailHref = `/product-detail?id=${encodeURIComponent(p.id)}`;

  const isAccessory = /accessor/i.test(p.brand) || /accessor/i.test(p.category || "");
  const logo = BRAND_LOGOS[p.brand];
  // Official pictogram (CSS-cropped from its padded canvas, never redrawn)
  // beside the brand name; accessories carry a plain text tag instead.
  const brandMark = logo
    ? `<span class="pcard-brand-ic"><img src="${logo}" alt="" loading="lazy"></span><span class="pcard-brand-name">${brandLabel}</span>`
    : `<span class="pcard-brand-text">${isAccessory ? (window.ylLang === "zh" ? "配件" : "ACCESSORY") : brandLabel}</span>`;

  const subtype = productSubtype(p);

  const compareTitle = compareDisabled
    ? "Comparison full: remove one to add another"
    : inCompare ? "Remove from comparison" : "Add to compare";

  // Structure note: .pcard-main wraps the image, title and technical rows. On
  // desktop it is
  // display:contents (a no-op, so the card is the SAME head/image/body/actions
  // flex column as before); at <=640px it becomes a two-column grid (image left,
  // title right) with the technical rows spanning the full width beneath. This
  // keeps real values readable instead of squeezing them into half a card. The
  // actions live outside .product-card-body so their bottom row can also span
  // full width. This is the shared catalogue card renderer used across the grid.
  return `
    <article class="product-card${p.status === "Unavailable" ? " is-unavailable" : ""}" data-brand="${brandSlug(p.brand)}">
      <div class="pcard-head">
        <span class="pcard-brand" aria-hidden="true">${brandMark}</span>
        <button
          class="pcard-cmp${inCompare ? ' on' : ''}"
          data-product-id="${p.id}"
          onclick="event.stopPropagation();toggleCompare('${p.id}')"
          ${compareDisabled ? 'disabled' : ''}
          aria-pressed="${inCompare ? "true" : "false"}"
          aria-label="${compareTitle}">
          <span class="pcard-cb" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
          ${ylTr("common.compare", "Compare")}
        </button>
      </div>
      <div class="pcard-main">
        <div class="${imageClass}">
          <a class="product-card-image-link" href="${detailHref}" tabindex="-1" aria-hidden="true">${imageContent}</a>
        </div>
        <div class="product-card-body">
          <h3><a class="product-card-title-link" href="${detailHref}">${escapeHTML(p.name)}</a></h3>
          <p class="pcard-subtype">${escapeHTML(window.ylTerm ? window.ylTerm(subtype) : subtype)}</p>
          ${bondFinderExplanationHTML(p)}
        </div>
        <div class="pcard-rows">
          ${primaryApps ? `
          <div class="card-application">
            <span class="card-application-ic" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="3" x2="12" y2="7"/><line x1="12" y1="17" x2="12" y2="21"/></svg></span>
            <span class="card-application-label">${ylTr("common.best_for", "Best for")}</span>
            <span class="card-application-val">${primaryApps}</span>
          </div>` : `<div class="card-workson-spacer" aria-hidden="true"></div>`}
          ${worksOn ? `
          <div class="card-application card-workson">
            <span class="card-application-ic" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 8.5 12 15 2 8.5 12 2"/><polyline points="2 13 12 19.5 22 13"/></svg></span>
            <span class="card-application-label">${ylTr("common.works_on", "Works on")}</span>
            <span class="card-application-val">${worksOn}</span>
          </div>` : `<div class="card-workson-spacer" aria-hidden="true"></div>`}
        </div>
      </div>
      <div class="product-card-actions">
        <button
          type="button"
          class="btn btn-primary pcard-enq${inBasket ? " btn-added" : ""}"
          data-product-id="${p.id}"
          aria-pressed="${inBasket ? "true" : "false"}"
          onclick="toggleBasket('${p.id}', '${ylTxt(p.name)}')"
          aria-label="${inBasket ? ylTr("common.aria_remove_enquiry", "Remove from Enquiry") : ylTr("common.aria_add_enquiry", "Add to Enquiry")}">
          ${inBasket ? pcardEnqAddedHtml() : pcardEnqAddHtml()}
        </button>
        <a href="${detailHref}" class="btn btn-outline pcard-view">${ylTr("common.view_details", "View details")}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
        </a>
      </div>
    </article>`;
}

function brandSlug(brand) {
  return brand.replace(/[^a-z]/gi, "").toLowerCase();
}

// Shared enquiry-button contents (default / added), used by the card render
// AND the in-place state sync so the two can never drift apart.
// i18n helper: window.ylT returns the current-language string (English matches
// the source text, so this is a no-op visually in English).
var ylTr = function (key, fb) { return (window.ylLang === "zh" && window.ylT) ? (window.ylT(key) || fb) : fb; };
// LANG-004: these were module-level consts, so they captured whatever language
// was active the ONE time this script was evaluated. That was invisible while
// switching language did a full reload (which re-evaluated the script), but the
// switch is now a Swup visit — the script is not re-run, and the card buttons
// kept rendering in the previous language. Evaluated per render instead; the
// lookup is a plain object read, so there is nothing to cache.
function pcardEnqAddHtml() {
  return ylTr("common.add_enquiry", "Add to Enquiry");
}
function pcardEnqAddedHtml() {
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg><span>${ylTr("common.in_enquiry", "In Enquiry")}</span>`;
}

// ─── Sync enquiry button states without rebuilding the grid ────────
// Add/remove flips only the affected buttons (state, label, aria) in place:
// no grid re-render, no re-run entrance animations, no scroll jump.
function syncEnquiryButtons() {
  const basket = getBasket().map(String);
  document.querySelectorAll(".pcard-enq[data-product-id]").forEach(btn => {
    const on = basket.includes(String(btn.dataset.productId));
    const was = btn.getAttribute("aria-pressed") === "true";
    if (on === was) return;
    btn.classList.toggle("btn-added", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on
      ? ylTr("common.aria_remove_enquiry", "Remove from Enquiry")
      : ylTr("common.aria_add_enquiry", "Add to Enquiry"));
    btn.innerHTML = on ? pcardEnqAddedHtml() : pcardEnqAddHtml();
  });
}

// ─── Sync compare checkbox states without rebuilding the grid ──────
function syncCompareButtons() {
  const list = getCompareList();
  const full = list.length >= COMPARE_MAX;

  document.querySelectorAll(".pcard-cmp[data-product-id]").forEach(btn => {
    const id      = btn.dataset.productId;
    const inCmp   = list.includes(id);
    const dis     = !inCmp && full;
    btn.className = `pcard-cmp${inCmp ? " on" : ""}`;
    btn.disabled  = dis;
    btn.setAttribute("aria-pressed", inCmp ? "true" : "false");
    btn.setAttribute("aria-label", dis
      ? "Comparison full: remove one to add another"
      : inCmp ? "Remove from comparison" : "Add to compare");
  });
}

// ─── Filter sidebar toggle ────────────────────────────────────────
let filterDrawerRelease = null;
let filterDrawerScrollY = 0;
let filterDrawerLocked = false;

// Lock the page behind the full-screen filter drawer (≤640px). We use
// position:fixed + a preserved scrollY rather than overflow:hidden alone,
// because iOS Safari still rubber-bands the body under overflow:hidden. The
// exact scroll position is restored on unlock so the catalogue never jumps.
function lockBodyScroll() {
  if (filterDrawerLocked) return;
  filterDrawerScrollY = window.scrollY || window.pageYOffset || 0;
  document.body.style.position = "fixed";
  document.body.style.top = `-${filterDrawerScrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
  document.body.style.overflow = "hidden";
  filterDrawerLocked = true;
}

function unlockBodyScroll() {
  if (!filterDrawerLocked) return;
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  document.body.style.overflow = "";
  window.scrollTo(0, filterDrawerScrollY);
  filterDrawerLocked = false;
}

function toggleFilterSidebar() {
  const el = document.getElementById("filterSidebar");
  const willOpen = !el.classList.contains("open");
  el.classList.toggle("open");
  syncFilterTriggerState(willOpen);
  willOpen ? openFilterDrawerA11y(el) : closeFilterDrawerA11y(el);
  // At the tablet breakpoint the sidebar changes from display:none to an
  // in-flow panel. Recalculate its available height against the live compare
  // tray after that layout change so its last filters never sit underneath it.
  if (typeof scheduleCompareTrayHeight === "function") {
    requestAnimationFrame(scheduleCompareTrayHeight);
  }
}

function closeFilterDrawer(restoreFocus = true) {
  const el = document.getElementById("filterSidebar");
  if (!el) return;
  el.classList.remove("open");
  closeFilterDrawerA11y(el, restoreFocus);
}

function syncFilterTriggerState(open) {
  document.querySelectorAll("#filterToggle, .mfb-btn").forEach(button => {
    button.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

// Focus handling applies only in drawer mode (mobile). On desktop the sidebar is
// always visible and is not a modal, so we leave it untouched.
function openFilterDrawerA11y(el) {
  if (window.innerWidth > 640) return;
  if (document.body.classList.contains("cmp-sheet-open") &&
      typeof toggleCompareTray === "function") {
    toggleCompareTray();
  }
  syncFilterTriggerState(true);
  document.body.classList.add("filter-drawer-open");
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  // Show the backdrop and lock the page scroll behind the bottom sheet.
  const bd = document.getElementById("filterBackdrop");
  if (bd) bd.classList.add("show");
  lockBodyScroll();
  ylSetupFilterDrag(el);
  if (typeof ylFocusTrap === "function") {
    filterDrawerRelease = ylFocusTrap(el, { onEscape: closeFilterDrawer });
  }
}

// Drag-to-dismiss for the mobile filter sheet. The grab handle now does what it
// implies: dragging the header (where the handle sits) downward past a threshold
// closes the sheet; a short drag snaps back. Anchored on the non-scrolling
// header only, so it never fights the filter list's own scroll. Bound once.
function ylSetupFilterDrag(el) {
  const head = el.querySelector(".drawer-head");
  if (!head || head.dataset.dragBound === "1") return;
  head.dataset.dragBound = "1";
  let startY = null, dy = 0, settling = false;

  head.addEventListener("pointerdown", (e) => {
    if (window.innerWidth > 640) return;
    if (e.target.closest(".drawer-x")) return;   // leave the close button tappable
    startY = e.clientY; dy = 0; settling = false;
    el.style.transition = "none";
    try { head.setPointerCapture(e.pointerId); } catch (_) {}
  });
  head.addEventListener("pointermove", (e) => {
    if (startY == null) return;
    dy = Math.max(0, e.clientY - startY);        // downward only
    el.style.transform = "translateY(" + dy + "px)";
  });
  const finish = () => {
    if (startY == null || settling) { startY = null; return; }
    settling = true;
    const closing = dy > 90;
    startY = null;
    el.style.transition = "transform 0.26s cubic-bezier(0.23, 1, 0.32, 1)";
    el.style.transform = closing ? "translateY(110%)" : "";
    let done = false;
    const cleanup = () => {
      if (done) return; done = true;
      el.removeEventListener("transitionend", cleanup);
      if (closing) closeFilterDrawer();
      el.style.transition = ""; el.style.transform = "";
    };
    el.addEventListener("transitionend", cleanup);
    setTimeout(cleanup, 340);                     // fallback if transitionend is missed
  };
  head.addEventListener("pointerup", finish);
  head.addEventListener("pointercancel", finish);
}

function closeFilterDrawerA11y(el, restoreFocus = true) {
  // Clear any inline transform/transition left by a drag-to-dismiss gesture.
  el.style.transform = "";
  el.style.transition = "";
  syncFilterTriggerState(false);
  document.body.classList.remove("filter-drawer-open");
  el.removeAttribute("aria-modal");
  el.removeAttribute("role");
  const bd = document.getElementById("filterBackdrop");
  if (bd) bd.classList.remove("show");
  unlockBodyScroll();
  if (filterDrawerRelease) { filterDrawerRelease(restoreFocus); filterDrawerRelease = null; }
}

function ylCleanupFilterDrawer() {
  const el = document.getElementById("filterSidebar");
  if (el) {
    el.classList.remove("open");
    closeFilterDrawerA11y(el, false);
    return;
  }
  document.body.classList.remove("filter-drawer-open");
  unlockBodyScroll();
  if (filterDrawerRelease) { filterDrawerRelease(false); filterDrawerRelease = null; }
}

function toggleFilterGroup(btn) {
  const group = btn.closest(".filter-group");
  group.classList.toggle("open");
  btn.setAttribute("aria-expanded", group.classList.contains("open"));
  // A collapsed group shows its count badge; an expanded one hides it.
  updateFilterGroupBadges();
  // The list height changes as a section opens/closes — refresh the edge fades
  // now and again after the 180ms collapse animation settles.
  updateFilterScrollFade();
  setTimeout(updateFilterScrollFade, 200);
}

// Show the top/bottom edge fades on the filter list only when it genuinely
// scrolls (rows would otherwise hard-cut); no fade when the list fits.
function updateFilterScrollFade() {
  document.querySelectorAll(".filter-sidebar .drawer-body").forEach(el => {
    const overflowing = el.scrollHeight > el.clientHeight + 1;
    el.classList.toggle("has-overflow", overflowing);
    if (overflowing) {
      updateFilterEdgeState(el);
      if (!el._fadeScrollBound) {
        el._fadeScrollBound = true;
        el.addEventListener("scroll", () => updateFilterEdgeState(el), { passive: true });
      }
    }
  });
}

// Elevate the mobile sticky toolbar only once it actually pins under the nav, so
// at rest it sits flat in the page and only lifts (shadow) when content scrolls
// beneath it. Uses the negative-rootMargin sticky-sentinel trick on the bar
// itself. Re-bound on each products entry (SPA swaps rebuild the DOM).
let _toolbarStuckObserver = null;
function initStickyToolbar() {
  if (_toolbarStuckObserver) { _toolbarStuckObserver.disconnect(); _toolbarStuckObserver = null; }
  const toolbar = document.querySelector(".mobile-toolbar");
  if (!toolbar || !("IntersectionObserver" in window)) return;
  _toolbarStuckObserver = new IntersectionObserver(
    ([entry]) => toolbar.classList.toggle("is-stuck", entry.intersectionRatio < 1),
    { threshold: [1], rootMargin: "-61px 0px 0px 0px" }  // -61px = just under the 60px nav
  );
  _toolbarStuckObserver.observe(toolbar);
}

// Suppress the fade on whichever edge is fully in view, so the top heading and
// count aren't dimmed at rest and the last row isn't dimmed at the bottom.
function updateFilterEdgeState(el) {
  el.classList.toggle("at-top", el.scrollTop <= 1);
  el.classList.toggle("at-bottom", el.scrollTop + el.clientHeight >= el.scrollHeight - 1);
}

// Default filter-group state: expanded on desktop. In the compact filter UI,
// keep the two most-used sections and any URL-restored selections open so the sheet has
// an obvious starting point without turning into one unbroken desktop list.
function applyFilterGroupDefaults() {
  const drawer = window.innerWidth <= 900;
  document.querySelectorAll(".filter-sidebar .filter-group").forEach((group, index) => {
    const open = !drawer || index < 2 || !!group.querySelector("input[type=checkbox]:checked");
    group.classList.toggle("open", open);
    const bar = group.querySelector(".filter-group-bar");
    if (bar) bar.setAttribute("aria-expanded", open.toString());
  });
  updateFilterGroupBadges();
}

function onMobileSortChange(sel) {
  const desktop = document.getElementById("sortSelect");
  if (desktop) {
    desktop.value = sel.value;
    if (typeof refreshCustomSelect === "function") refreshCustomSelect(desktop);
  }
  applyFilters();
}

// ─── Product enquiry selection ───────────────────────────────────
// getBasket / saveBasket / toggleBasket / updateBasketCount / showToast now
// live in js/core/app.js (shared, event-driven), so a single unified bundle can
// run on every page. The products grid re-renders on the "basketUpdated" event
// (wired once in initProductsPage) instead of inside toggleBasket.

// ─── Hero search typeahead ────────────────────────────────────────
// Additive suggestion dropdown under the hero search. It does NOT change the
// existing live-filter or submit behaviour: typing still filters the catalogue
// below (separate input listener), and the Search button / a plain Enter still
// run submitHeroSearch(). This only adds quick-jump suggestions on top.
// Called from initProductsPage on each page view against the fresh search
// input. Its window/document listeners are registered once and delegate to the
// current input/panel via window.__ylTypeahead, so they never stack on swaps.
function productsSearchCopy(lang) {
  const copy = {
    en: {
      sections: {
        products: "Products",
        brands: "Brands",
        productTypes: "Product Types",
        industries: "Industries",
        surfaces: "Surfaces"
      },
      noMatches: "No direct matches. Press Enter to search the full catalogue.",
      advisor: "Ask the Product Advisor",
      productAria: "{product}, product",
      filterAria: "{label}, {type} filter, {count} {resultNoun}",
      filterApplied: "{label} filter applied. {resultCount}",
      filterTypes: {
        brand: "Brand",
        producttype: "Product Type",
        industry: "Industry",
        surface: "Surface"
      }
    },
    zh: {
      sections: {
        products: "产品",
        brands: "品牌",
        productTypes: "产品类型",
        industries: "行业",
        surfaces: "表面 / 材料"
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
        surface: "表面 / 材料"
      }
    }
  };
  return lang === "zh" ? copy.zh : copy.en;
}

function formatProductsSearchCopy(template, replacements) {
  const values = replacements !== null && typeof replacements === "object"
    ? replacements
    : {};
  return String(template).replace(/\{([a-z][a-zA-Z0-9]*)\}/g, function (match, key) {
    if (!Object.prototype.hasOwnProperty.call(values, key)) return match;
    return String(values[key] == null ? "" : values[key]);
  });
}

function initSearchTypeahead() {
  const input = document.getElementById("searchInput");
  const panel = document.getElementById("searchTypeahead");
  if (!input || !panel) return;
  const copy = productsSearchCopy(window.ylLang);

  const MAX_PRODUCTS = 5;       // top product matches lead (SEARCH-001 A6)
  const MAX_PER_FILTER = 2;     // per-group cap
  const MAX_FILTERS_TOTAL = 4;  // overall taxonomy cap so broad queries ("a")
                                // never build a page-covering panel
  let items = [];               // flat, keyboard-navigable list of options
  let highlight = -1;
  let lastQuery = "";

  const brandName = p =>
    (typeof brandDisplay === "function" ? brandDisplay(p.brand) : p.brand) || "";

  // Escape the query for use inside a RegExp so special characters are literal.
  const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Matching is done on normalised text via the shared ylSearchNorm (also used
  // by applyFilters' free-text matching, so grid and suggestions always agree):
  // lowercase, ™/® optional, hyphens folded to spaces, whitespace collapsed.
  // Other punctuation stays literal. URL slugs use ylSlug, not this.
  const norm = ylSearchNorm;

  // Reviewed synonym map (SEARCH-001 A2, documented in the QA tracker). Purely
  // navigational: each entry maps a common word to an EXISTING filter label so
  // the matching filter can be suggested. No technical equivalence implied.
  const SYNONYMS = {
    car: "Automotive", vehicle: "Automotive",
    boat: "Marine", ship: "Marine",
    timber: "Wood", cabinet: "Carpentry", sofa: "Upholstery",
  };

  // Render `text` with the matched substring wrapped in a red <mark>. Escapes
  // first, so the highlight is applied to already-safe HTML.
  function highlightMatch(text, query) {
    const safe = escapeHTML(text);
    if (!query) return safe;
    const re = new RegExp(escapeRe(escapeHTML(query)), "ig");
    return safe.replace(re, m => `<mark class="st-hit">${m}</mark>`);
  }

  // Lower score = more relevant. Name-prefix beats name-substring beats brand
  // beats type/industry/surface beats best-for description (A2 field list).
  function scoreProduct(p, q) {
    // Must match every token as a word-prefix somewhere in the product; then
    // rank by the strongest field the first token lands in (name > brand > type
    // > industry > surface > description). Word-prefix, never mid-word substring.
    if (!ylPrefixMatch(ylProductWords(p, ylShortQuery(q)), q)) return Infinity;
    const name = norm(p.name);
    const brand = norm(brandName(p)), raw = norm(p.brand || "");
    const t = q.split(" ")[0];
    const pre = w => w.startsWith(t);
    if (name === q) return -1;
    if (name.startsWith(q) || name.startsWith(t)) return 0;
    if (ylWords(name).some(pre)) return 1;
    if (brand.startsWith(t) || raw.startsWith(t)) return 2;
    if (ylWords(brand).some(pre) || ylWords(raw).some(pre)) return 3;
    if (ylWords(productType(p)).some(pre)) return 4;
    if ((p.industries || []).some(i => ylWords(i).some(pre))) return 5;
    if ((p.surfaces || []).some(s => ylWords(s).some(pre))) return 6;
    return 7;
  }

  // 0 exact label, 1 prefix, 2 contains, 3 reviewed synonym, Infinity no match.
  function scoreFilter(label, q, syn) {
    const l = norm(label);
    if (l === q) return 0;
    if (l.startsWith(q)) return 1;
    if (ylWords(l).some(w => w.startsWith(q))) return 2; // word-prefix, not substring
    if (syn && l === syn) return 3;
    return Infinity;
  }

  // Filter suggestions come from the SAME lists + live counts the sidebar is
  // built from (data.js constants + PRODUCTS), so a suggestion always has a
  // real checkbox behind it. No "Applications" group: no application filter
  // exists in the sidebar, and a suggestion must never fake a selection.
  function filterSources() {
    const count = ex => {
      const c = {};
      (PRODUCTS || []).forEach(p => ex(p).forEach(v => { c[v] = (c[v] || 0) + 1; }));
      return c;
    };
    const brandList = (typeof PUBLIC_BRANDS !== "undefined") ? PUBLIC_BRANDS
      : BRANDS.filter(b => b !== "Others & Accessories");
    return [
      { group: "brands",        type: "brand",       labels: brandList,     counts: count(p => [p.brand]) },
      { group: "productTypes",  type: "producttype", labels: PRODUCT_TYPES, counts: count(p => [productType(p)]) },
      { group: "industries",    type: "industry",    labels: INDUSTRIES,    counts: count(p => p.industries || []) },
      { group: "surfaces",      type: "surface",     labels: SURFACES,      counts: count(p => p.surfaces || []) },
    ];
  }

  function computeItems(qRaw) {
    const q = norm(qRaw);
    const syn = SYNONYMS[q] ? norm(SYNONYMS[q]) : null;

    const prods = (PRODUCTS || [])
      .map(p => ({ p, s: scoreProduct(p, q) }))
      .filter(x => x.s !== Infinity)
      .sort((a, b) => a.s - b.s); // stable: equal scores keep catalogue order

    let bestFilterScore = Infinity;
    let filterItems = [];
    filterSources().forEach((g, gi) => {
      g.labels
        .map(label => ({ label, s: scoreFilter(label, q, syn) }))
        .filter(x => x.s !== Infinity && (g.counts[x.label] || 0) > 0)
        .sort((a, b) => a.s - b.s)
        .slice(0, MAX_PER_FILTER)
        .forEach(m => {
          bestFilterScore = Math.min(bestFilterScore, m.s);
          filterItems.push({ kind: "filter", group: g.group, type: g.type, label: m.label, count: g.counts[m.label] || 0, s: m.s, gi });
        });
    });
    // Curate: keep only the best few taxonomy rows overall, then restore group
    // order so the section headers render contiguously.
    filterItems = filterItems
      .sort((a, b) => a.s - b.s || a.gi - b.gi)
      .slice(0, MAX_FILTERS_TOTAL)
      .sort((a, b) => a.gi - b.gi || a.s - b.s);

    const productItems = prods.slice(0, MAX_PRODUCTS).map(x => ({ kind: "product", p: x.p }));
    const bestProductScore = prods.length ? prods[0].s : Infinity;

    // A6 ranking: exact/prefix product names (score <= 0) always lead; an
    // exact/prefix FILTER label (score <= 1) outranks mere name-contains
    // product matches (score >= 1); otherwise products lead.
    const flat = (bestFilterScore <= 1 && bestProductScore >= 1)
      ? [...filterItems, ...productItems]
      : [...productItems, ...filterItems];

    if (prods.length > MAX_PRODUCTS) flat.push({ kind: "viewall", total: prods.length });
    return flat;
  }

  function isOpen() { return !panel.hidden; }

  // Placement is pure CSS now: the panel is an absolutely positioned child of
  // .hero-search, pinned to the search bar's bottom edge and its exact width,
  // so it can never end up over the input, over the search button or over the
  // filter/sort toolbar. This only caps the HEIGHT so the list stays inside the
  // space the visitor can actually see.
  //
  // window.innerHeight does not shrink when the iOS keyboard opens; the visual
  // viewport does. Prefer it when available (progressive enhancement) and fall
  // back to the layout viewport everywhere else. The panel scrolls internally,
  // so the last suggestion stays reachable at any cap.
  function reposition() {
    const anchor = input.closest(".search-bar") || input;
    const r = anchor.getBoundingClientRect();
    const vv = window.visualViewport;
    const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
    const space = Math.round(visibleBottom - r.bottom - 18);
    panel.style.maxHeight = `${Math.min(420, Math.max(140, space))}px`;
  }

  function open() {
    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
    // Lift the hero container while suggestions are open so the fixed panel
    // paints above later page sections.
    input.closest(".page-hero-inner")?.classList.add("st-elevate");
    reposition();
  }

  function close() {
    if (panel.hidden) return;
    panel.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    highlight = -1;
    input.closest(".page-hero-inner")?.classList.remove("st-elevate");
  }

  function sectionOf(item) {
    if (item.kind === "product") return copy.sections.products;
    if (item.kind === "filter") return copy.sections[item.group] || item.group;
    return null; // viewall / advisor rows carry no section header
  }

  function render() {
    if (!items.length) {
      // A7: honest empty state + one helpful action (still a real option row).
      items = [{ kind: "advisor" }];
      panel.innerHTML = `
        <li class="search-typeahead-empty" role="presentation">${escapeHTML(copy.noMatches)}</li>
        <li class="search-typeahead-row st-row-action" role="option" id="st-opt-0" aria-selected="false">${escapeHTML(copy.advisor)}</li>`;
      return;
    }
    let html = "", lastSection = null;
    items.forEach((item, i) => {
      const sec = sectionOf(item);
      if (sec && sec !== lastSection) {
        html += `<li class="st-group" role="presentation" aria-hidden="true">${escapeHTML(sec)}</li>`;
        lastSection = sec;
      }
      const sel = `aria-selected="${i === highlight}"`;
      if (item.kind === "product") {
        const p = item.p;
        const img = (p.images && p.images[0])
          ? `<img class="st-thumb" src="${escapeHTML(p.images[0])}" alt="" loading="lazy">`
          : `<span class="st-thumb st-thumb-ph" aria-hidden="true"></span>`;
        html += `
          <li class="search-typeahead-row" role="option" id="st-opt-${i}" ${sel}
              aria-label="${escapeHTML(formatProductsSearchCopy(copy.productAria, { product: p.name }))}">
            ${img}
            <span class="st-main">
              <span class="st-name">${highlightMatch(p.name, lastQuery)}</span>
              <span class="st-brand">${highlightMatch(brandName(p), lastQuery)} &middot; ${escapeHTML(window.ylTerm ? window.ylTerm(productType(p)) : productType(p))}</span>
            </span>
          </li>`;
      } else if (item.kind === "filter") {
        const filterType = copy.filterTypes[item.type] || item.type;
        const filterLabel = window.ylTerm ? window.ylTerm(item.label) : item.label;
        const resultNoun = item.count === 1 ? "product" : "products";
        html += `
          <li class="search-typeahead-row st-row-filter" role="option" id="st-opt-${i}" ${sel}
              aria-label="${escapeHTML(formatProductsSearchCopy(copy.filterAria, {
                label: filterLabel,
                type: filterType,
                count: item.count,
                resultNoun
              }))}">
            <span class="st-name">${highlightMatch(filterLabel, lastQuery)}</span>
            <span class="st-count">${(window.ylLang === "zh") ? `${item.count} 款产品` : `${item.count} product${item.count !== 1 ? "s" : ""}`}</span>
          </li>`;
      } else if (item.kind === "viewall") {
        html += `
          <li class="search-typeahead-row st-row-action" role="option" id="st-opt-${i}" ${sel}>
            ${(window.ylLang === "zh") ? `查看全部 ${item.total} 个匹配产品` : `View all ${item.total} matching products`}
          </li>`;
      }
    });
    panel.innerHTML = html;
  }

  function setHighlight(i) {
    if (!items.length) return;
    highlight = (i + items.length) % items.length;
    render();
    input.setAttribute("aria-activedescendant", `st-opt-${highlight}`);
    const row = panel.querySelector(`#st-opt-${highlight}`);
    if (row) row.scrollIntoView({ block: "nearest" });
  }

  // A3: a filter suggestion drives the REAL checkbox (the single source of
  // truth applyFilters() reads), so desktop sidebar, mobile drawer, pills,
  // count, grid and URL all update through the one existing pipeline.
  function selectFilterSuggestion(item) {
    const cb = [...document.querySelectorAll(`.filter-sidebar input[data-type="${item.type}"]`)]
      .find(c => c.value === item.label);
    if (cb) {
      cb.checked = true;
      if (typeof revealCheckbox === "function") revealCheckbox(cb); // never leave it hidden in "Show more"
    }
    input.value = "";   // the active-filter pill now carries the intent; a stale query would fight it
    lastQuery = "";
    close();
    applyFilters({ pushHistory: true });
    if (typeof window.announce === "function") {
      const rc = document.getElementById("resultCount");
      const appliedLabel = window.ylTerm ? window.ylTerm(item.label) : item.label;
      window.announce(
        formatProductsSearchCopy(copy.filterApplied, {
          label: appliedLabel,
          resultCount: rc ? rc.textContent : ""
        }).trim()
      );
    }
    scrollToCatalogue();
    input.focus(); // logical place to keep refining
  }

  function choose(item) {
    if (!item) return;
    if (item.kind === "product") {
      window.location.href = `/product-detail?id=${encodeURIComponent(item.p.id)}`;
    } else if (item.kind === "filter") {
      selectFilterSuggestion(item);
    } else if (item.kind === "viewall") {
      close();
      submitHeroSearch();
    } else if (item.kind === "advisor") {
      close();
      if (window.openProductAdvisor) window.openProductAdvisor();
    }
  }

  // Suggestions appear from the first character; empty input shows nothing
  // (A1: no huge empty dropdown). Runs alongside the live-filter listener.
  input.addEventListener("input", () => {
    const q = input.value.trim();
    // Suggest from the first character (a single letter matches name/brand
    // initials via scoreProduct); only an empty box shows nothing.
    if (q.replace(/\s+/g, "").length < 1) { items = []; lastQuery = ""; close(); return; }
    lastQuery = q;
    items = computeItems(q);
    highlight = -1;
    render();
    open();
  });

  // Capture phase so we can intercept before the page's own Enter handler:
  // a highlighted suggestion is chosen; a plain Enter falls through to the
  // existing free-text search (A5 — never auto-pick a suggestion).
  input.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    if (e.key === "ArrowDown") {
      if (items.length) { e.preventDefault(); e.stopImmediatePropagation(); setHighlight(highlight + 1); }
    } else if (e.key === "ArrowUp") {
      if (items.length) { e.preventDefault(); e.stopImmediatePropagation(); setHighlight(highlight - 1); }
    } else if (e.key === "Enter") {
      if (highlight >= 0 && items[highlight]) {
        e.preventDefault(); e.stopImmediatePropagation(); choose(items[highlight]);
      } else {
        close(); // let the existing handler run submitHeroSearch()
      }
    } else if (e.key === "Escape") {
      e.preventDefault(); e.stopImmediatePropagation(); close();
    }
  }, true);

  // mousedown (not click) so selection wins the race against the input's blur.
  panel.addEventListener("mousedown", (e) => {
    const row = e.target.closest(".search-typeahead-row");
    if (!row) return;
    e.preventDefault();
    const idx = parseInt((row.id || "").replace("st-opt-", ""), 10);
    if (!Number.isNaN(idx)) choose(items[idx]);
  });

  input.addEventListener("blur", () => setTimeout(close, 120));

  // Publish this page view's controller so the shared global listeners below
  // always act on the current (post-swap) input/panel, not a stale one.
  window.__ylTypeahead = { reposition, close, isOpen, input, panel };

  // Registered once for the app's lifetime; they delegate to __ylTypeahead.
  ylOnce("typeahead:global", () => {
    document.addEventListener("mousedown", (e) => {
      const t = window.__ylTypeahead;
      if (!t) return;
      if (e.target !== t.input && !t.panel.contains(e.target)) t.close();
    });
    // Re-cap the open panel's height whenever the space below the search bar
    // changes: page scroll, window resize, rotation, and — the one that matters
    // on a phone — the visual viewport shrinking as the on-screen keyboard
    // opens or closes. visualViewport is an enhancement; the resize/scroll
    // handlers already cover browsers without it.
    const recap = () => {
      const t = window.__ylTypeahead;
      if (t && t.isOpen()) t.reposition();
    };
    window.addEventListener("scroll", recap, true);
    window.addEventListener("resize", recap);
    window.addEventListener("orientationchange", recap);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", recap);
      window.visualViewport.addEventListener("scroll", recap);
    }
  });
}
