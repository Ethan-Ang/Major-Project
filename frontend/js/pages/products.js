// ─── State ──────────────────────────────────────────────────────
let activeFilters  = { productTypes: [], brands: [], industries: [], surfaces: [] };
let currentResults = [];
let initialLoadDone = false;

// ─── Init ────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  renderSkeleton();

  try {
    await loadProductsFromBackend();
  } catch (err) {
    // Defensive only: loadProductsFromBackend() falls back to the bundled
    // demo catalogue instead of throwing, so this branch should not be
    // reachable in normal operation. The real offline UX is the fallback.
    console.error(err);
    document.getElementById("productGrid").innerHTML = `
      <div class="empty-state">
        <h3>Products are temporarily unavailable</h3>
        <p>Please refresh the page in a moment, or contact Yee Lim directly and our team will assist you.</p>
        <a class="btn btn-outline" href="/contact">Contact Yee Lim</a>
      </div>`;
    document.getElementById("resultCount").textContent = "0 products";
    return;
  }

  readStateFromURL();
  if (typeof enhanceCustomSelect === "function") {
    enhanceCustomSelect(document.getElementById("sortSelect"));
    // Same polished dropdown for the mobile filter bar's sort control, so the
    // phone view matches desktop instead of showing the raw OS select.
    enhanceCustomSelect(document.getElementById("mobileSortSelect"));
  }
  buildFilterCheckboxes();
  renderTrustStats();
  applyFilterGroupDefaults();
  applyStateToCheckboxes();
  updateBasketCount();
  if (typeof renderCompareTray === "function") renderCompareTray();
  // Also refresh the mobile compare tab/sheet now that PRODUCTS has loaded, so
  // items persisted from a previous visit render instead of showing empty.
  if (typeof renderCompareMobile === "function") renderCompareMobile();

  requestAnimationFrame(() => {
    applyFilters({ skipUrlWrite: true });
    initialLoadDone = true;
    updateFilterScrollFade();
    // Arriving from a footer/brand deep-link (e.g. ?brand=Deer™ Brand) should
    // land the visitor on the filtered results, not the top hero/search. A plain
    // /products visit (no filter params) still opens at the hero as before.
    const usp = new URLSearchParams(location.search);
    if (usp.has("brand") || usp.has("industry") || usp.has("surface") || usp.has("type")) {
      scrollToCatalogue();
    }
  });

  // Keep the filter-list edge fades correct as the viewport (and therefore the
  // capped sidebar height) changes.
  window.addEventListener("resize", updateFilterScrollFade);

  // Live filtering while typing (does NOT scroll the page).
  document.getElementById("searchInput").addEventListener("input", () => applyFilters());

  // Intentional submit (Enter key) applies the search and scrolls to results.
  document.getElementById("searchInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitHeroSearch();
    }
  });
});

// ─── Hero search submit ───────────────────────────────────────────
// Called by the hero Search button and the Enter key. Applies the current
// search/filters as usual, then smoothly scrolls down to the catalogue so the
// user sees the matching results (or the "no results" state) without having to
// scroll manually. Typing alone never triggers this — only an explicit submit.
function submitHeroSearch() {
  applyFilters();
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

window.addEventListener("compareUpdated", syncCompareButtons);

// ─── URL state ──────────────────────────────────────────────────
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

  activeFilters.productTypes = params.get("type")     ? params.get("type").split("|")     : [];
  activeFilters.brands       = params.get("brand")    ? params.get("brand").split("|")    : [];
  activeFilters.industries   = params.get("industry") ? params.get("industry").split("|") : [];
  activeFilters.surfaces     = params.get("surface")  ? params.get("surface").split("|")  : [];
}

function writeStateToURL() {
  const params = new URLSearchParams();
  const search = document.getElementById("searchInput").value.trim();
  const sort   = document.getElementById("sortSelect").value;

  if (search) params.set("q", search);
  if (sort && sort !== "default") params.set("sort", sort);
  if (activeFilters.productTypes.length) params.set("type",  activeFilters.productTypes.join("|"));
  if (activeFilters.brands.length)     params.set("brand",    activeFilters.brands.join("|"));
  if (activeFilters.industries.length) params.set("industry", activeFilters.industries.join("|"));
  if (activeFilters.surfaces.length)   params.set("surface",  activeFilters.surfaces.join("|"));

  const queryStr = params.toString();
  const newUrl   = queryStr ? `${location.pathname}?${queryStr}` : location.pathname;
  history.replaceState(null, "", newUrl);
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

  const rows = items.map(item => {
    const count = counts[item] || 0;
    const disabled = count === 0 ? "disabled" : "";
    return `
      <label class="${disabled ? 'is-empty' : ''}">
        <input type="checkbox" value="${item}" data-type="${type}" onchange="applyFilters()" ${disabled}>
        <span class="filter-label-text">${item}</span>
        <span class="filter-count">${count}</span>
      </label>
    `;
  }).join("");
  // Single wrapper so the group can collapse smoothly via grid-template-rows.
  container.innerHTML = `<div class="fg-rows">${rows}</div>`;
}

// Trust-strip stats derived from the real catalogue (never hardcoded), so the
// product + industry counts always match what's actually loaded.
function renderTrustStats() {
  const productEl  = document.getElementById("trustProductCount");
  const industryEl = document.getElementById("trustIndustryCount");
  if (productEl) productEl.textContent = PRODUCTS.length;
  if (industryEl) {
    const industries = new Set();
    PRODUCTS.forEach(p => (p.industries || []).forEach(i => industries.add(i)));
    industryEl.textContent = industries.size;
  }
}

// Apply a single brand filter (from the hero "Our ranges" rows) and jump to the
// catalogue, so the hero brand chips act as same-page filters.
function filterByBrand(brand) {
  document.querySelectorAll(".filter-sidebar input[type=checkbox]").forEach(cb => {
    cb.checked = (cb.dataset.type === "brand" && cb.value === brand);
  });
  const search = document.getElementById("searchInput");
  if (search) search.value = "";
  applyFilters();
  scrollToCatalogue();
}

// Highlight the hero "Our ranges" chip matching the active brand filter so it
// stays lit while that brand is filtered. Runs through applyFilters(), so it
// also covers brand state restored from the URL on load and brands toggled from
// the sidebar.
function syncBrandRows() {
  document.querySelectorAll(".range-chip").forEach(chip => {
    chip.classList.toggle("active", activeFilters.brands.includes(chip.dataset.brand));
  });
}

// ─── Apply search + filters + sort ───────────────────────────────
function applyFilters(opts = {}) {
  const query   = document.getElementById("searchInput").value.toLowerCase().trim();
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
      p.name.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query) ||
      brandDisplay(p.brand).toLowerCase().includes(query) ||
      productType(p).toLowerCase().includes(query) ||
      p.shortDescription.toLowerCase().includes(query) ||
      p.industries.some(i => i.toLowerCase().includes(query)) ||
      p.surfaces.some(s => s.toLowerCase().includes(query));

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

  if (!opts.skipUrlWrite) writeStateToURL();
  updateClearVisibility();
  updateFilterGroupBadges();
  syncBrandRows();
}

function updateFilterGroupBadges() {
  let totalActive = 0;

  document.querySelectorAll(".filter-sidebar .filter-group").forEach(group => {
    const badge   = group.querySelector(".filter-group-badge");
    const checked = group.querySelectorAll("input[type=checkbox]:checked").length;
    totalActive  += checked;
    if (badge) {
      // Show the applied-count pill whenever the section has ≥1 active filter,
      // so users can see what's applied even while the section is collapsed.
      badge.textContent   = checked || "";
      badge.style.display = checked > 0 ? "inline-flex" : "none";
    }
  });

  // Mobile filter bar total count badge
  const mobileCount = document.getElementById("mobileFilterCount");
  if (mobileCount) {
    mobileCount.textContent   = totalActive || "";
    mobileCount.style.display = totalActive > 0 ? "inline-flex" : "none";
  }
}

function updateClearVisibility() {
  const btn = document.querySelector(".filter-clear");
  if (!btn) return;
  const any = activeFilters.productTypes.length || activeFilters.brands.length ||
              activeFilters.industries.length || activeFilters.surfaces.length ||
              document.getElementById("searchInput").value.trim();
  btn.style.display = any ? "block" : "none";
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
  syncBrandRows();
}

// ─── Active filter chips ──────────────────────────────────────────
function renderFilterChips() {
  const container = document.getElementById("activeChips");
  const chips = [];

  const query = document.getElementById("searchInput").value.trim();
  if (query) {
    chips.push(`<button class="filter-chip" onclick="clearSearch()">Search: "${escapeHTML(query)}" &times;</button>`);
  }

  activeFilters.productTypes.forEach(t => {
    chips.push(`<button class="filter-chip" onclick="removeFilter('producttype','${t.replace(/'/g,"\\'")}')">${t} &times;</button>`);
  });
  activeFilters.brands.forEach(b => {
    chips.push(`<button class="filter-chip" onclick="removeFilter('brand','${b.replace(/'/g,"\\'")}')">${b} &times;</button>`);
  });
  activeFilters.industries.forEach(i => {
    chips.push(`<button class="filter-chip" onclick="removeFilter('industry','${i.replace(/'/g,"\\'")}')">${i} &times;</button>`);
  });
  activeFilters.surfaces.forEach(s => {
    chips.push(`<button class="filter-chip" onclick="removeFilter('surface','${s.replace(/'/g,"\\'")}')">${s} &times;</button>`);
  });

  if (chips.length > 1) {
    chips.push(`<button class="filter-chip filter-chip-clear" onclick="clearFilters()">Clear all &times;</button>`);
  }

  container.innerHTML = chips.join("");
  container.style.marginBottom = chips.length ? "1rem" : "0";
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

  countEl.textContent = `${products.length} product${products.length !== 1 ? "s" : ""}`;

  const applyBtn = document.getElementById("drawerApplyBtn");
  if (applyBtn) applyBtn.textContent = `Show ${products.length} result${products.length !== 1 ? "s" : ""}`;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon" aria-hidden="true">&#9783;</div>
        <h3>No products match those filters</h3>
        <p>Try removing a filter or clearing your search.</p>
        <button class="btn btn-outline" onclick="clearFilters()">Clear all filters</button>
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

function productCardHTML(p) {
  const basket   = getBasket();
  const inBasket = basket.includes(p.id);
  const inCompare       = isInCompare(p.id);
  const compareListFull = getCompareList().length >= COMPARE_MAX;
  const compareDisabled = !inCompare && compareListFull;

  const isUnavailable = p.status === "Unavailable";
  const primaryApps = escapeHTML(bestForText(p));
  const surfaceTags = p.surfaces.slice(0, 2).map(s => `<span class="product-tag">${escapeHTML(s)}</span>`).join("");

  const hasRealImage = p.images && p.images.length > 0;
  const brandLabel = escapeHTML(p.brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase());
  const imageContent = hasRealImage
    ? `<img src="${encodeURI(p.images[0])}" alt="${escapeHTML(p.name)}" loading="lazy" onerror="ylImageFallback(this,'${brandLabel}')">`
    : `<div class="no-image-mark" aria-hidden="true">${brandLabel}</div>`;
  const imageClass = hasRealImage ? "product-card-image" : "product-card-image no-image";
  const detailHref = `/product-detail?id=${encodeURIComponent(p.id)}`;

  // Card meta: short model code (from the name) + real availability status.
  const isAccessory = /accessor/i.test(p.brand) || /accessor/i.test(p.category || "");
  const brandTag = isAccessory ? "ACCESSORY" : brandLabel;
  const code = productCodeFromName(p);
  const codeLabel = code ? `<span class="pcard-code">No. ${escapeHTML(code)}</span>` : "";

  const compareTitle = compareDisabled
    ? "Comparison full: remove one to add another"
    : inCompare ? "Remove from comparison" : "Add to compare";

  return `
    <article class="product-card${isUnavailable ? " is-unavailable" : ""}" data-brand="${brandSlug(p.brand)}">
      <div class="${imageClass}">
        <a class="product-card-image-link" href="${detailHref}" tabindex="-1" aria-hidden="true">${imageContent}</a>
        <span class="pcard-brand-tag${isAccessory ? " is-accessory" : ""}" aria-hidden="true">${brandTag}</span>
        <button
          class="card-compare-btn${inCompare ? " in-compare" : ""}"
          data-product-id="${p.id}" onclick="event.stopPropagation();toggleCompare('${p.id}')"
          ${compareDisabled ? "disabled" : ""}
          title="${compareTitle}"
          aria-label="${compareTitle}">
          ${inCompare
            ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><polyline points="8 12 11 15 16 9"/></svg>`
            : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>`}
          <span>Compare</span>
        </button>
        <button
          class="pcard-add${inBasket ? ' added' : ''}"
          onclick="event.stopPropagation();toggleBasket('${p.id}')"
          title="${inBasket ? 'Remove from Enquiry' : 'Add to Enquiry'}"
          aria-label="${inBasket ? 'Remove from Enquiry' : 'Add to Enquiry'}">
          ${inBasket
            ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
            : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`}
        </button>
      </div>
      <div class="product-card-body">
        <span class="pcard-meta">
          ${codeLabel}
          <span class="pcard-avail${isUnavailable ? " is-unavail" : ""}"><span class="pcard-dot" aria-hidden="true"></span>${isUnavailable ? "Enquire to order" : "Available"}</span>
        </span>
        <h3><a class="product-card-title-link" href="${detailHref}">${escapeHTML(p.name)}</a></h3>
        ${primaryApps ? `<div class="card-application"><span class="card-application-label">Best for</span><span class="card-application-val">${primaryApps}</span></div>` : ""}
        <p>${escapeHTML(p.shortDescription)}</p>
        ${surfaceTags ? `<div class="product-tags" aria-label="Suitable surfaces">${surfaceTags}</div>` : ""}
        <div class="product-card-actions">
          <button
            class="btn btn-primary pcard-enq${inBasket ? " btn-added" : ""}"
            aria-pressed="${inBasket ? "true" : "false"}"
            onclick="toggleBasket('${p.id}')"
            aria-label="${inBasket ? "Remove from Product Enquiry" : "Add to Product Enquiry"}">
            ${inBasket
              ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span class="enq-label-full">In Enquiry</span><span class="enq-label-short">Added</span>`
              : `+ Enquiry`}
          </button>
          <a href="${detailHref}" class="btn btn-outline pcard-view">View</a>
        </div>
        <div class="pcard-cmp-row">
          <button
            class="pcard-cmp${inCompare ? ' on' : ''}"
            data-product-id="${p.id}"
            onclick="event.stopPropagation();toggleCompare('${p.id}')"
            ${compareDisabled ? 'disabled' : ''}
            aria-label="${compareTitle}">
            <span class="pcard-cb">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
            Compare
          </button>
        </div>
      </div>
    </article>`;
}

function brandSlug(brand) {
  return brand.replace(/[^a-z]/gi, "").toLowerCase();
}

// ─── Sync compare button states without rebuilding the grid ──────
function syncCompareButtons() {
  const list = getCompareList();
  const full = list.length >= COMPARE_MAX;

  document.querySelectorAll(".product-card").forEach(card => {
    const btn = card.querySelector(".card-compare-btn");
    if (!btn) return;
    const id = btn.dataset.productId;
    if (!id) return;
    const inCompare = list.includes(id);
    const disabled  = !inCompare && full;

    btn.className = `card-compare-btn${inCompare ? " in-compare" : ""}`;
    btn.disabled  = disabled;
    btn.title     = disabled
      ? "Comparison full: remove one to add another"
      : inCompare ? "Remove from comparison" : "Add to compare";
    btn.setAttribute("aria-label", btn.title);
    btn.innerHTML = (inCompare
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><polyline points="8 12 11 15 16 9"/></svg>`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>`)
      + `<span>Compare</span>`;
  });

  // Sync mobile compare checkboxes (.pcard-cmp)
  document.querySelectorAll(".pcard-cmp[data-product-id]").forEach(btn => {
    const id      = btn.dataset.productId;
    const inCmp   = list.includes(id);
    const dis     = !inCmp && full;
    btn.className = `pcard-cmp${inCmp ? " on" : ""}`;
    btn.disabled  = dis;
    btn.setAttribute("aria-label", dis
      ? "Comparison full: remove one to add another"
      : inCmp ? "Remove from comparison" : "Add to compare");
  });
}

// ─── Filter sidebar toggle ────────────────────────────────────────
let filterDrawerRelease = null;

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
  if (typeof ylFocusTrap === "function") {
    filterDrawerRelease = ylFocusTrap(el, { onEscape: closeFilterDrawer });
  }
}

function closeFilterDrawerA11y(el) {
  el.removeAttribute("aria-modal");
  el.removeAttribute("role");
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
    el.classList.toggle("has-overflow", el.scrollHeight > el.clientHeight + 1);
  });
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

// ─── Product enquiry selection (localStorage) ────────────────────
function getBasket() {
  return JSON.parse(localStorage.getItem("enquiryBasket") || "[]");
}

function saveBasket(basket) {
  localStorage.setItem("enquiryBasket", JSON.stringify(basket));
  updateBasketCount();
  // Notify the shared navbar so the enquiry count (badge + mobile indicator +
  // drawer count) updates immediately, the same way product-detail.js and
  // enquiry.html do. Without this the card add updated text but not visibility.
  window.dispatchEvent(new Event("basketUpdated"));
}

function toggleBasket(productId) {
  const basket = getBasket();
  const idx = basket.indexOf(productId);

  if (idx === -1) {
    basket.push(productId);
    showToast("Added to your product enquiry");
  } else {
    basket.splice(idx, 1);
    showToast("Removed from your product enquiry");
  }

  saveBasket(basket);
  // Re-render so the changed card reflects its state but keep filters & URL stable
  applyFilters({ skipUrlWrite: true });
}

function updateBasketCount() {
  const el = document.getElementById("basketCount");
  if (el) el.textContent = getBasket().length;
}

// ─── Toast ────────────────────────────────────────────────────────
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

// ─── Hero search typeahead ────────────────────────────────────────
// Additive suggestion dropdown under the hero search. It does NOT change the
// existing live-filter or submit behaviour: typing still filters the catalogue
// below (separate input listener), and the Search button / a plain Enter still
// run submitHeroSearch(). This only adds quick-jump suggestions on top.
(function initSearchTypeahead() {
  const input = document.getElementById("searchInput");
  const panel = document.getElementById("searchTypeahead");
  if (!input || !panel) return;

  const MAX = 7;
  let matches = [];
  let highlight = -1;
  let lastQuery = "";

  const brandName = p =>
    (typeof brandDisplay === "function" ? brandDisplay(p.brand) : p.brand) || "";

  // Escape the query for use inside a RegExp so special characters are literal.
  const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Render `text` with the matched substring wrapped in a red <mark>. Escapes
  // first, so the highlight is applied to already-safe HTML.
  function highlightMatch(text, query) {
    const safe = escapeHTML(text);
    if (!query) return safe;
    const re = new RegExp(escapeRe(escapeHTML(query)), "ig");
    return safe.replace(re, m => `<mark class="st-hit">${m}</mark>`);
  }

  // Lower score = more relevant. Name-prefix beats name-substring beats brand
  // beats industry/surface, so a broad query (e.g. "a") still surfaces a
  // product whose name starts with it (ASG001) instead of burying it behind
  // catalogue-order substring matches. Infinity means "no match".
  function scoreMatch(p, query) {
    const name = p.name.toLowerCase();
    const brand = brandName(p).toLowerCase();
    const raw = (p.brand || "").toLowerCase();
    if (name.startsWith(query)) return 0;
    if (name.includes(query)) return 1;
    if (brand.startsWith(query) || raw.startsWith(query)) return 2;
    if (brand.includes(query) || raw.includes(query)) return 3;
    if ((p.industries || []).some(i => i.toLowerCase().includes(query))) return 4;
    if ((p.surfaces || []).some(s => s.toLowerCase().includes(query))) return 5;
    return Infinity;
  }

  function computeMatches(q) {
    const query = q.toLowerCase();
    // Array.sort is stable, so equal-score items keep catalogue order.
    return (PRODUCTS || [])
      .map(p => ({ p, s: scoreMatch(p, query) }))
      .filter(x => x.s !== Infinity)
      .sort((a, b) => a.s - b.s)
      .slice(0, MAX)
      .map(x => x.p);
  }

  function isOpen() { return !panel.hidden; }

  // The panel is position:fixed, so glue it to the search bar's current rect.
  function reposition() {
    const anchor = input.closest(".search-bar") || input;
    const r = anchor.getBoundingClientRect();
    panel.style.left = `${Math.round(r.left)}px`;
    panel.style.top = `${Math.round(r.bottom + 6)}px`;
    panel.style.width = `${Math.round(r.width)}px`;
  }

  function open() {
    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
    reposition();
  }

  function close() {
    if (panel.hidden) return;
    panel.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    highlight = -1;
  }

  function render() {
    if (!matches.length) {
      panel.innerHTML =
        `<li class="search-typeahead-empty" role="option" aria-disabled="true">No products found — press Search to browse all</li>`;
      return;
    }
    panel.innerHTML = matches.map((p, i) => `
      <li class="search-typeahead-row" role="option" id="st-opt-${i}" data-id="${escapeHTML(String(p.id))}" aria-selected="${i === highlight}">
        <span class="st-name">${highlightMatch(p.name, lastQuery)}</span>
        <span class="st-brand">${highlightMatch(brandName(p), lastQuery)}</span>
      </li>`).join("");
  }

  function setHighlight(i) {
    if (!matches.length) return;
    highlight = (i + matches.length) % matches.length;
    render();
    input.setAttribute("aria-activedescendant", `st-opt-${highlight}`);
    const row = panel.querySelector(`#st-opt-${highlight}`);
    if (row) row.scrollIntoView({ block: "nearest" });
  }

  function go(p) {
    window.location.href = `/product-detail?id=${encodeURIComponent(p.id)}`;
  }

  // Suggestions appear from the first character. Runs alongside the existing
  // live-filter input listener, so the catalogue still filters as you type.
  input.addEventListener("input", () => {
    const q = input.value.trim();
    if (q.length < 1) { matches = []; lastQuery = ""; close(); return; }
    lastQuery = q;
    matches = computeMatches(q);
    highlight = -1;
    render();
    open();
  });

  // Capture phase so we can intercept before the page's own Enter handler:
  // a highlighted suggestion opens that product; a plain Enter falls through
  // to submitHeroSearch() (the existing behaviour).
  input.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    if (e.key === "ArrowDown") {
      if (matches.length) { e.preventDefault(); e.stopImmediatePropagation(); setHighlight(highlight + 1); }
    } else if (e.key === "ArrowUp") {
      if (matches.length) { e.preventDefault(); e.stopImmediatePropagation(); setHighlight(highlight - 1); }
    } else if (e.key === "Enter") {
      if (highlight >= 0 && matches[highlight]) {
        e.preventDefault(); e.stopImmediatePropagation(); go(matches[highlight]);
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
    const p = matches.find(m => String(m.id) === row.dataset.id);
    if (p) go(p);
  });

  input.addEventListener("blur", () => setTimeout(close, 120));
  document.addEventListener("mousedown", (e) => {
    if (e.target !== input && !panel.contains(e.target)) close();
  });

  // Keep the fixed panel glued to the search bar while it is open.
  window.addEventListener("scroll", () => { if (isOpen()) reposition(); }, true);
  window.addEventListener("resize", () => { if (isOpen()) reposition(); });
})();
