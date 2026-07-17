// ─── State ──────────────────────────────────────────────────────
let activeFilters  = { productTypes: [], brands: [], industries: [], surfaces: [] };
let currentResults = [];
let initialLoadDone = false;

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
      grid.innerHTML = `
        <div class="empty-state">
          <h3>Products are temporarily unavailable</h3>
          <p>Please refresh the page in a moment, or contact Yee Lim directly and our team will assist you.</p>
          <a class="btn btn-outline" href="/contact">Contact Yee Lim</a>
        </div>`;
      const rc = document.getElementById("resultCount");
      if (rc) rc.textContent = "0 products";
      return;
    }
  }

  readStateFromURL();
  if (typeof enhanceCustomSelect === "function") {
    enhanceCustomSelect(document.getElementById("sortSelect"));
    // Same polished dropdown for the mobile filter bar's sort control, so the
    // phone view matches desktop instead of showing the raw OS select.
    enhanceCustomSelect(document.getElementById("mobileSortSelect"));
  }
  buildFilterCheckboxes();
  applyFilterGroupDefaults();
  applyStateToCheckboxes();
  syncShowMore(); // URL-restored checks must not hide behind "Show more"
  updateBasketCount();
  if (typeof renderCompareTray === "function") renderCompareTray();
  initSearchTypeahead();

  requestAnimationFrame(() => {
    applyFilters({ skipUrlWrite: true });
    initialLoadDone = true;
    updateFilterScrollFade();
    initStickyToolbar();
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
    window.addEventListener("compareUpdated", syncCompareButtons);
    window.addEventListener("basketUpdated", () => {
      if (document.getElementById("productGrid")) applyFilters({ skipUrlWrite: true });
    });
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
  if (opts.push) {
    if (changed) history.pushState({ ylFilters: true, ylCommitted: true }, "", newUrl);
    else history.replaceState(Object.assign({}, cur, { ylFilters: true, ylCommitted: true }), "", newUrl);
  } else if (cur.ylCommitted && changed) {
    history.pushState({ ylFilters: true }, "", newUrl);
  } else {
    history.replaceState(Object.assign({}, cur, { ylFilters: true }), "", newUrl);
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
        <span class="filter-label-text">${item}</span>
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
        ${expanded ? "Show less" : `Show more (${rest.length})`}</button>`;
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
  btn.textContent = expand ? "Show less" : `Show more (${more.querySelectorAll("label").length})`;
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
    const matchesQuery = !query ||
      ylSearchNorm(p.name).includes(query) ||
      ylSearchNorm(p.brand).includes(query) ||
      ylSearchNorm(brandDisplay(p.brand)).includes(query) ||
      ylSearchNorm(productType(p)).includes(query) ||
      ylSearchNorm(p.shortDescription).includes(query) ||
      p.industries.some(i => ylSearchNorm(i).includes(query)) ||
      p.surfaces.some(s => ylSearchNorm(s).includes(query));

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

  if (sortVal === "az")    results.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortVal === "za") results.sort((a, b) => b.name.localeCompare(a.name));
  else if (sortVal === "brand") results.sort((a, b) => a.brand.localeCompare(b.brand));

  renderFilterChips();
  renderGrid(results);

  if (!opts.skipUrlWrite) writeStateToURL({ push: !!opts.pushHistory });
  updateClearVisibility();
  updateFilterGroupBadges();
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
    if (totalActive === 1) headTotal.textContent = "1 filter active";
    else if (totalActive > 1) headTotal.textContent = `${totalActive} filters active`;
    else headTotal.textContent = "";
    headTotal.hidden = totalActive === 0;
  }
}

function updateClearVisibility() {
  const any = activeFilters.productTypes.length || activeFilters.brands.length ||
              activeFilters.industries.length || activeFilters.surfaces.length ||
              document.getElementById("searchInput").value.trim();
  const btn = document.querySelector(".filter-clear");
  if (btn) btn.style.display = any ? "block" : "none";
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
    const safe  = escapeHTML(value);            // safe as both text and quoted attr
    const jsVal = value.replace(/'/g, "\\'");   // safe inside the single-quoted onclick
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
          `<span class="active-filter-label">Active filters:</span>` +
          `<div class="active-filter-pills">${chips.join("")}</div>` +
          `<button class="active-filter-clear" onclick="clearFilters()">Clear all</button>` +
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
  if (products.length < totalCount) {
    countEl.innerHTML = `<strong>${products.length}</strong> <span class="rc-of">of ${totalCount} </span>${countNoun} found`;
  } else {
    countEl.innerHTML = `<strong>${products.length}</strong> ${countNoun} found`;
  }

  const applyBtn = document.getElementById("drawerApplyBtn");
  if (applyBtn) applyBtn.textContent = `Show ${products.length} result${products.length !== 1 ? "s" : ""}`;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon" aria-hidden="true">&#9783;</div>
        <h3>No products match those filters</h3>
        <p>Try removing a filter or clearing your search, or describe your job to the Product Advisor.</p>
        <div class="empty-state-actions">
          <button class="btn btn-outline" onclick="clearFilters()">Clear all filters</button>
          <button class="btn btn-outline" onclick="if(window.openProductAdvisor)openProductAdvisor()">Ask the Product Advisor</button>
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
function bestForText(p) {
  if (p.industries && p.industries.length) return p.industries.slice(0, 2).join(", ");
  if (p.surfaces && p.surfaces.length)     return p.surfaces.slice(0, 2).join(", ");
  if (p.brand === "Others & Accessories" || p.category === "Others") return "Accessory";
  if (p.category) return p.category;
  return "General Adhesive Use";
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

// Official brand marks (real assets only). Accessories have no brand mark and
// fall back to a plain text tag.
const BRAND_LOGOS = {
  "Deer™ Brand":     "/images/logos/Deer.png",
  "Horsemen™ Brand": "/images/logos/Horsemen.png",
  "Premier™ Brand":  "/images/logos/Premier.png",
  "Rhino™ Brand":    "/images/logos/Rhino.png",
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

  const primaryApps = escapeHTML(bestForText(p));
  const worksOn = p.surfaces && p.surfaces.length ? escapeHTML(p.surfaces.slice(0, 3).join(", ")) : "";

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
    : `<span class="pcard-brand-text">${isAccessory ? "ACCESSORY" : brandLabel}</span>`;

  const code = productCodeFromName(p);
  const subtype = productSubtype(p);

  const compareTitle = compareDisabled
    ? "Comparison full: remove one to add another"
    : inCompare ? "Remove from comparison" : "Add to compare";

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
          Compare
        </button>
      </div>
      <div class="${imageClass}">
        <a class="product-card-image-link" href="${detailHref}" tabindex="-1" aria-hidden="true">${imageContent}</a>
      </div>
      <div class="product-card-body">
        ${code ? `<span class="pcard-code">${escapeHTML(code)}</span>` : ""}
        <h3><a class="product-card-title-link" href="${detailHref}">${escapeHTML(p.name)}</a></h3>
        <p class="pcard-subtype">${escapeHTML(subtype)}</p>
        <div class="pcard-rows">
          <div class="card-application">
            <span class="card-application-ic" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="3" x2="12" y2="7"/><line x1="12" y1="17" x2="12" y2="21"/></svg></span>
            <span class="card-application-label">Best for</span>
            <span class="card-application-val">${primaryApps}</span>
          </div>
          ${worksOn ? `
          <div class="card-application card-workson">
            <span class="card-application-ic" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 8.5 12 15 2 8.5 12 2"/><polyline points="2 13 12 19.5 22 13"/></svg></span>
            <span class="card-application-label">Works on</span>
            <span class="card-application-val">${worksOn}</span>
          </div>` : `<div class="card-workson-spacer" aria-hidden="true"></div>`}
        </div>
        <div class="product-card-actions">
          <button
            class="btn btn-primary pcard-enq${inBasket ? " btn-added" : ""}"
            aria-pressed="${inBasket ? "true" : "false"}"
            onclick="toggleBasket('${p.id}', '${ylTxt(p.name)}')"
            aria-label="${inBasket ? "Remove from Product Enquiry" : "Add to Product Enquiry"}">
            ${inBasket
              ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>In Enquiry</span>`
              : `Add to Enquiry <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="12" x2="12" y2="18"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`}
          </button>
          <a href="${detailHref}" class="btn btn-outline pcard-view">View details
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
        </div>
      </div>
    </article>`;
}

function brandSlug(brand) {
  return brand.replace(/[^a-z]/gi, "").toLowerCase();
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
  willOpen ? openFilterDrawerA11y(el) : closeFilterDrawerA11y(el);
}

function closeFilterDrawer() {
  const el = document.getElementById("filterSidebar");
  el.classList.remove("open");
  closeFilterDrawerA11y(el);
}

// Focus handling applies only in drawer mode (mobile). On desktop the sidebar is
// always visible and is not a modal, so we leave it untouched.
function openFilterDrawerA11y(el) {
  if (window.innerWidth > 640) return;
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  // Show the backdrop and lock the page scroll behind the bottom sheet.
  const bd = document.getElementById("filterBackdrop");
  if (bd) bd.classList.add("show");
  lockBodyScroll();
  if (typeof ylFocusTrap === "function") {
    filterDrawerRelease = ylFocusTrap(el, { onEscape: closeFilterDrawer });
  }
}

function closeFilterDrawerA11y(el) {
  el.removeAttribute("aria-modal");
  el.removeAttribute("role");
  const bd = document.getElementById("filterBackdrop");
  if (bd) bd.classList.remove("show");
  unlockBodyScroll();
  if (filterDrawerRelease) { filterDrawerRelease(); filterDrawerRelease = null; }
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

// Default filter-group state: expanded on desktop, collapsed inside the ≤900
// drawer (so the drawer opens short and each section is tapped open as needed).
function applyFilterGroupDefaults() {
  const drawer = window.innerWidth <= 900;
  document.querySelectorAll(".filter-sidebar .filter-group").forEach(group => {
    group.classList.toggle("open", !drawer);
    const bar = group.querySelector(".filter-group-bar");
    if (bar) bar.setAttribute("aria-expanded", (!drawer).toString());
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
function initSearchTypeahead() {
  const input = document.getElementById("searchInput");
  const panel = document.getElementById("searchTypeahead");
  if (!input || !panel) return;

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
    const name = norm(p.name);
    const brand = norm(brandName(p)), raw = norm(p.brand || "");
    if (name === q) return -1;
    if (name.startsWith(q)) return 0;
    if (name.includes(q)) return 1;
    if (brand.startsWith(q) || raw.startsWith(q)) return 2;
    if (brand.includes(q) || raw.includes(q)) return 3;
    if (norm(productType(p)).includes(q)) return 4;
    if ((p.industries || []).some(i => norm(i).includes(q))) return 5;
    if ((p.surfaces || []).some(s => norm(s).includes(q))) return 6;
    if (norm(p.shortDescription).includes(q)) return 7;
    return Infinity;
  }

  // 0 exact label, 1 prefix, 2 contains, 3 reviewed synonym, Infinity no match.
  function scoreFilter(label, q, syn) {
    const l = norm(label);
    if (l === q) return 0;
    if (l.startsWith(q)) return 1;
    if (l.includes(q)) return 2;
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
      { group: "Brands",        type: "brand",       labels: brandList,     counts: count(p => [p.brand]) },
      { group: "Product Types", type: "producttype", labels: PRODUCT_TYPES, counts: count(p => [productType(p)]) },
      { group: "Industries",    type: "industry",    labels: INDUSTRIES,    counts: count(p => p.industries || []) },
      { group: "Surfaces",      type: "surface",     labels: SURFACES,      counts: count(p => p.surfaces || []) },
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

  // The panel is position:fixed, so glue it to the search bar's current rect.
  function reposition() {
    const anchor = input.closest(".search-bar") || input;
    const r = anchor.getBoundingClientRect();
    panel.style.left = `${Math.round(r.left)}px`;
    panel.style.top = `${Math.round(r.bottom + 6)}px`;
    panel.style.width = `${Math.round(r.width)}px`;
    // Controlled height (locked ReBond fix): capped at 420px so the panel can
    // never sprawl over the filters/sort/grid; still shrinks to fit the space
    // below the bar (keyboard/safe-area aware) and scrolls internally.
    panel.style.maxHeight = `${Math.min(420, Math.max(180, Math.round(window.innerHeight - r.bottom - 18)))}px`;
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
    if (item.kind === "product") return "Products";
    if (item.kind === "filter") return item.group;
    return null; // viewall / advisor rows carry no section header
  }

  function render() {
    if (!items.length) {
      // A7: honest empty state + one helpful action (still a real option row).
      items = [{ kind: "advisor" }];
      panel.innerHTML = `
        <li class="search-typeahead-empty" role="presentation">No direct matches. Press Enter to search the full catalogue.</li>
        <li class="search-typeahead-row st-row-action" role="option" id="st-opt-0" aria-selected="false">Ask the Product Advisor</li>`;
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
              aria-label="${escapeHTML(p.name)}, product">
            ${img}
            <span class="st-main">
              <span class="st-name">${highlightMatch(p.name, lastQuery)}</span>
              <span class="st-brand">${highlightMatch(brandName(p), lastQuery)} &middot; ${escapeHTML(productType(p))}</span>
            </span>
          </li>`;
      } else if (item.kind === "filter") {
        const singular = { "Brands": "Brand", "Product Types": "Product Type", "Industries": "Industry", "Surfaces": "Surface" }[item.group] || item.group;
        html += `
          <li class="search-typeahead-row st-row-filter" role="option" id="st-opt-${i}" ${sel}
              aria-label="${escapeHTML(item.label)}, ${escapeHTML(singular)} filter, ${item.count} product${item.count !== 1 ? "s" : ""}">
            <span class="st-name">${highlightMatch(item.label, lastQuery)}</span>
            <span class="st-count">${item.count} product${item.count !== 1 ? "s" : ""}</span>
          </li>`;
      } else if (item.kind === "viewall") {
        html += `
          <li class="search-typeahead-row st-row-action" role="option" id="st-opt-${i}" ${sel}>
            View all ${item.total} matching products
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
      window.announce(`${item.label} filter applied. ${rc ? rc.textContent : ""}`.trim());
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
    if (q.length < 1) { items = []; lastQuery = ""; close(); return; }
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
    // Keep the fixed panel glued to the search bar while it is open.
    window.addEventListener("scroll", () => {
      const t = window.__ylTypeahead;
      if (t && t.isOpen()) t.reposition();
    }, true);
    window.addEventListener("resize", () => {
      const t = window.__ylTypeahead;
      if (t && t.isOpen()) t.reposition();
    });
  });
}
