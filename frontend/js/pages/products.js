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
        <a class="btn btn-outline" href="contact.html">Contact Yee Lim</a>
      </div>`;
    document.getElementById("resultCount").textContent = "0 products";
    return;
  }

  readStateFromURL();
  if (typeof enhanceCustomSelect === "function") {
    enhanceCustomSelect(document.getElementById("sortSelect"));
  }
  buildFilterCheckboxes();
  renderApplications();
  applyStateToCheckboxes();
  updateBasketCount();
  if (typeof renderCompareTray === "function") renderCompareTray();

  requestAnimationFrame(() => {
    applyFilters({ skipUrlWrite: true });
    initialLoadDone = true;
  });

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

  container.innerHTML = items.map(item => {
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
}

// ─── Browse by Application (solution tiles) ──────────────────────
// Friendly B2B labels mapped 1:1 to real industries in data.js so every
// tile filters real products — no dead ends.
const APPLICATIONS = [
  { label: "Woodworking & Carpentry", industry: "Carpentry",  blurb: "Joinery, panels &amp; timber bonding",
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>` },
  { label: "Flooring", industry: "Flooring", blurb: "Carpet, vinyl, laminate &amp; turf",
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>` },
  { label: "Packaging", industry: "Packaging", blurb: "Cartons, labels &amp; sealing",
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 9.4 7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>` },
  { label: "Furniture & Upholstery", industry: "Upholstery", blurb: "Foam, fabric &amp; leather lamination",
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>` },
  { label: "Marine", industry: "Marine", blurb: "Water-resistant industrial bonding",
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>` },
  { label: "Automotive", industry: "Automotive", blurb: "Trim, insulation &amp; assembly",
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>` },
];

function renderApplications() {
  const grid = document.getElementById("applicationGrid");
  if (!grid) return;

  const counts = {};
  PRODUCTS.forEach(p => p.industries.forEach(i => { counts[i] = (counts[i] || 0) + 1; }));

  grid.innerHTML = APPLICATIONS.map(app => {
    const n = counts[app.industry] || 0;
    const plural = n === 1 ? "" : "s";
    return `
      <button class="application-card" type="button" data-industry="${app.industry}"
        onclick="filterByIndustry('${app.industry}')"
        aria-label="Browse ${app.label.replace(/&amp;/g, 'and')} adhesives, ${n} product${plural}">
        <span class="application-icon" aria-hidden="true">${app.icon}</span>
        <span class="application-text">
          <span class="application-label">${app.label}</span>
          <span class="application-blurb">${app.blurb}</span>
        </span>
        <span class="application-count">${n}<span>product${plural}</span></span>
      </button>`;
  }).join("");
}

// Apply a single industry filter and jump to the catalogue
function filterByIndustry(industry) {
  document.querySelectorAll(".filter-sidebar input[type=checkbox]").forEach(cb => {
    cb.checked = (cb.dataset.type === "industry" && cb.value === industry);
  });
  const search = document.getElementById("searchInput");
  if (search) search.value = "";
  applyFilters();
  scrollToCatalogue();
}

// Highlight the application tile matching the active industry filter
function syncApplicationCards() {
  document.querySelectorAll(".application-card").forEach(card => {
    card.classList.toggle("active", activeFilters.industries.includes(card.dataset.industry));
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
    const matchesQuery = !query ||
      p.name.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query) ||
      brandDisplay(p.brand).toLowerCase().includes(query) ||
      productType(p).toLowerCase().includes(query) ||
      p.shortDescription.toLowerCase().includes(query) ||
      p.industries.some(i => i.toLowerCase().includes(query)) ||
      p.surfaces.some(s => s.toLowerCase().includes(query)) ||
      p.features.some(f => f.toLowerCase().includes(query));

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
  syncApplicationCards();
}

function updateFilterGroupBadges() {
  document.querySelectorAll(".filter-sidebar .filter-group").forEach(group => {
    const heading = group.querySelector("h3");
    if (!heading) return;
    const existing = heading.querySelector(".filter-group-badge");
    if (existing) existing.remove();
    const checked = group.querySelectorAll("input[type=checkbox]:checked").length;
    if (checked > 0) {
      const badge = document.createElement("span");
      badge.className = "filter-group-badge";
      badge.textContent = checked;
      heading.appendChild(badge);
    }
  });
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
  activeFilters = { productTypes: [], brands: [], industries: [], surfaces: [] };
  renderFilterChips();
  renderGrid(PRODUCTS);
  writeStateToURL();
  updateClearVisibility();
  updateFilterGroupBadges();
  syncApplicationCards();
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

function productCardHTML(p) {
  const basket   = getBasket();
  const inBasket = basket.includes(p.id);
  const inCompare       = isInCompare(p.id);
  const compareListFull = getCompareList().length >= COMPARE_MAX;
  const compareDisabled = !inCompare && compareListFull;

  const isUnavailable = p.status === "Unavailable";
  const primaryApps = bestForText(p);
  const surfaceTags = p.surfaces.slice(0, 3).map(s => `<span class="product-tag">${s}</span>`).join("");

  const hasRealImage = p.images && p.images.length > 0;
  const brandLabel = p.brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase();
  const imageContent = hasRealImage
    ? `<img src="${p.images[0]}" alt="${p.name}" loading="lazy" onerror="ylImageFallback(this,'${brandLabel}')">`
    : `<div class="no-image-mark" aria-hidden="true">${brandLabel}</div>`;
  const imageClass = hasRealImage ? "product-card-image" : "product-card-image no-image";
  const detailHref = `product-detail.html?id=${encodeURIComponent(p.id)}`;

  const compareTitle = compareDisabled
    ? "Comparison full — remove one to add another"
    : inCompare ? "Remove from comparison" : "Add to compare";

  return `
    <article class="product-card${isUnavailable ? " is-unavailable" : ""}" data-brand="${brandSlug(p.brand)}">
      <div class="${imageClass}">
        <a class="product-card-image-link" href="${detailHref}" tabindex="-1" aria-hidden="true">${imageContent}</a>
        ${isUnavailable ? `<span class="card-status-badge" aria-label="Availability: Currently Unavailable"><span class="card-status-dot" aria-hidden="true"></span>Currently Unavailable</span>` : ""}
        <button
          class="card-compare-btn${inCompare ? " in-compare" : ""}"
          data-product-id="${p.id}" onclick="event.stopPropagation();toggleCompare('${p.id}')"
          ${compareDisabled ? "disabled" : ""}
          title="${compareTitle}"
          aria-label="${compareTitle}">
          ${inCompare
            ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
            : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`}
          <span>${inCompare ? "In compare" : "Compare"}</span>
        </button>
      </div>
      <div class="product-card-body">
        <span class="brand-badge">${brandDisplay(p.brand)}</span>
        <h3><a class="product-card-title-link" href="${detailHref}">${p.name}</a></h3>
        ${primaryApps ? `<div class="card-application"><span class="card-application-label">Best for</span><span>${primaryApps}</span></div>` : ""}
        <p>${p.shortDescription}</p>
        ${surfaceTags ? `<div class="product-tags" aria-label="Suitable surfaces">${surfaceTags}</div>` : ""}
        <div class="product-card-actions">
          <a href="${detailHref}" class="btn btn-primary">View Details</a>
          <button
            class="btn btn-outline ${inBasket ? "btn-added" : ""}"
            aria-pressed="${inBasket ? "true" : "false"}"
            onclick="toggleBasket('${p.id}')">
            ${inBasket
              ? `<span class="enq-label-full">In Product Enquiry</span><span class="enq-label-short">In Enquiry</span>`
              : (isUnavailable ? "Enquire About Availability" : "Add to Product Enquiry")}
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
      ? "Comparison full — remove one to add another"
      : inCompare ? "Remove from comparison" : "Add to compare";
    btn.setAttribute("aria-label", btn.title);
    btn.innerHTML = (inCompare
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`)
      + `<span>${inCompare ? "In compare" : "Compare"}</span>`;
  });
}

// ─── Filter sidebar toggle ────────────────────────────────────────
function toggleFilterSidebar() {
  document.getElementById("filterSidebar").classList.toggle("open");
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
