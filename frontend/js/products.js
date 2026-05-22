// ─── State ──────────────────────────────────────────────────────
let activeFilters  = { brands: [], industries: [], surfaces: [] };
let currentResults = PRODUCTS;

// ─── Init ────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  buildFilterCheckboxes();
  renderGrid(PRODUCTS);
  updateBasketCount();
  document.getElementById("searchInput").addEventListener("input", applyFilters);
});

window.addEventListener("compareUpdated", syncCompareButtons);

// ─── Build filter sidebar checkboxes from data ───────────────────
function buildFilterCheckboxes() {
  buildCheckboxGroup("brandFilters", BRANDS, "brand");
  buildCheckboxGroup("industryFilters", INDUSTRIES, "industry");
  buildCheckboxGroup("surfaceFilters", SURFACES, "surface");
}

function buildCheckboxGroup(containerId, items, type) {
  const container = document.getElementById(containerId);
  container.innerHTML = items.map(item => `
    <label>
      <input type="checkbox" value="${item}" data-type="${type}" onchange="applyFilters()">
      ${item}
    </label>
  `).join("");
}

// ─── Apply search + filters + sort ───────────────────────────────
function applyFilters() {
  const query = document.getElementById("searchInput").value.toLowerCase().trim();
  const sortVal = document.getElementById("sortSelect").value;

  activeFilters = { brands: [], industries: [], surfaces: [] };
  document.querySelectorAll(".filter-sidebar input[type=checkbox]:checked").forEach(cb => {
    const type = cb.dataset.type;
    if (type === "brand") activeFilters.brands.push(cb.value);
    if (type === "industry") activeFilters.industries.push(cb.value);
    if (type === "surface") activeFilters.surfaces.push(cb.value);
  });

  let results = PRODUCTS.filter(p => {
    const matchesQuery = !query ||
      p.name.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query) ||
      p.shortDescription.toLowerCase().includes(query) ||
      p.industries.some(i => i.toLowerCase().includes(query)) ||
      p.surfaces.some(s => s.toLowerCase().includes(query));

    const matchesBrand = activeFilters.brands.length === 0 ||
      activeFilters.brands.includes(p.brand);

    const matchesIndustry = activeFilters.industries.length === 0 ||
      p.industries.some(i => activeFilters.industries.includes(i));

    const matchesSurface = activeFilters.surfaces.length === 0 ||
      p.surfaces.some(s => activeFilters.surfaces.includes(s));

    return matchesQuery && matchesBrand && matchesIndustry && matchesSurface;
  });

  if (sortVal === "az") results.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortVal === "za") results.sort((a, b) => b.name.localeCompare(a.name));
  else if (sortVal === "brand") results.sort((a, b) => a.brand.localeCompare(b.brand));

  renderFilterChips();
  renderGrid(results);
}

function clearFilters() {
  document.querySelectorAll(".filter-sidebar input[type=checkbox]").forEach(cb => cb.checked = false);
  document.getElementById("searchInput").value = "";
  document.getElementById("sortSelect").value = "default";
  activeFilters = { brands: [], industries: [], surfaces: [] };
  renderFilterChips();
  renderGrid(PRODUCTS);
}

// ─── Active filter chips ──────────────────────────────────────────
function renderFilterChips() {
  const container = document.getElementById("activeChips");
  const chips = [];

  const query = document.getElementById("searchInput").value.trim();
  if (query) {
    chips.push(`<button class="filter-chip" onclick="clearSearch()">Search: "${query}" &times;</button>`);
  }

  activeFilters.brands.forEach(b => {
    chips.push(`<button class="filter-chip" onclick="removeFilter('brand','${b.replace(/'/g,"\\'")}')">Brand: ${b} &times;</button>`);
  });
  activeFilters.industries.forEach(i => {
    chips.push(`<button class="filter-chip" onclick="removeFilter('industry','${i.replace(/'/g,"\\'")}')">Industry: ${i} &times;</button>`);
  });
  activeFilters.surfaces.forEach(s => {
    chips.push(`<button class="filter-chip" onclick="removeFilter('surface','${s.replace(/'/g,"\\'")}')">Surface: ${s} &times;</button>`);
  });

  if (chips.length > 1) {
    chips.push(`<button class="filter-chip filter-chip-clear" onclick="clearFilters()">Clear all &times;</button>`);
  }

  container.innerHTML = chips.join("");
  container.style.marginBottom = chips.length ? "1rem" : "0";
}

function clearSearch() {
  document.getElementById("searchInput").value = "";
  applyFilters();
}

function removeFilter(type, value) {
  const cb = document.querySelector(
    `.filter-sidebar input[data-type="${type}"][value="${value}"]`
  );
  if (cb) { cb.checked = false; }
  applyFilters();
}

// ─── Render product grid ──────────────────────────────────────────
function renderGrid(products) {
  currentResults = products;
  const grid = document.getElementById("productGrid");
  const countEl = document.getElementById("resultCount");

  countEl.textContent = `${products.length} product${products.length !== 1 ? "s" : ""} found`;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>No products found</h3>
        <p>Try adjusting your search or filters.</p>
      </div>`;
    return;
  }

  grid.innerHTML = products.map(p => productCardHTML(p)).join("");

  grid.querySelectorAll(".product-card").forEach((card, i) => {
    card.classList.add("animate");
    card.style.animationDelay = `${i * 0.05}s`;
  });
}

function productCardHTML(p) {
  const basket = getBasket();
  const inBasket = basket.includes(p.id);
  const inCompare       = isInCompare(p.id);
  const compareListFull = getCompareList().length >= COMPARE_MAX;
  const compareDisabled = !inCompare && compareListFull;
  const compareBtnClass = `btn-compare-card${inCompare ? " in-compare" : ""}`;
  const compareBtnText  = inCompare ? "&#10003; In Compare" : "+ Compare";
  const industryTags = p.industries.slice(0, 2).map(i => `<span class="product-tag">${i}</span>`).join("");

  const brandSlug = p.brand.replace(/[^a-z]/gi, "").toLowerCase();
  const imageHtml = `
    <img
      src="${p.imageUrl}"
      alt="${p.name}"
      onerror="this.parentElement.classList.add('no-image');this.remove();this.parentElement.innerHTML+='<div class=no-image-icon>&#128247;</div><div class=no-image-label>${brandSlug}</div>'"
    >`;

  return `
    <div class="product-card">
      <div class="product-card-image">${imageHtml}</div>
      <div class="product-card-body">
        <span class="brand-badge">${p.brand}</span>
        <h3>${p.name}</h3>
        <p>${p.shortDescription}</p>
        <div class="product-tags">${industryTags}</div>
        <div class="product-card-actions">
          <a href="product-detail.html?id=${p.id}" class="btn btn-outline">View Details</a>
          <button
            class="btn btn-primary ${inBasket ? "btn-added" : ""}"
            onclick="toggleBasket(${p.id})"
          >${inBasket ? "&#10003; Added" : "Add to Enquiry"}</button>
        </div>
        <button
          class="${compareBtnClass}"
          onclick="toggleCompare(${p.id})"
          ${compareDisabled ? `disabled title="Remove a product to add another"` : ""}
          aria-pressed="${inCompare}">
          ${compareBtnText}
        </button>
      </div>
    </div>`;
}

// ─── Sync compare button states without rebuilding the grid ──────
function syncCompareButtons() {
  const list = getCompareList();
  const full = list.length >= COMPARE_MAX;
  document.querySelectorAll(".product-card").forEach(card => {
    const btn = card.querySelector(".btn-compare-card");
    if (!btn) return;
    const match = (btn.getAttribute("onclick") || "").match(/toggleCompare\((\d+)\)/);
    if (!match) return;
    const id        = parseInt(match[1], 10);
    const inCompare = list.includes(id);
    btn.className   = `btn-compare-card${inCompare ? " in-compare" : ""}`;
    btn.innerHTML   = inCompare ? "&#10003; In Compare" : "+ Compare";
    btn.disabled    = !inCompare && full;
    btn.title       = (!inCompare && full) ? "Remove a product to add another" : "";
    btn.setAttribute("aria-pressed", String(inCompare));
  });
}

// ─── Filter sidebar toggle ────────────────────────────────────────
function toggleFilterSidebar() {
  document.getElementById("filterSidebar").classList.toggle("open");
}

// ─── Enquiry basket (localStorage) ───────────────────────────────
function getBasket() {
  return JSON.parse(localStorage.getItem("enquiryBasket") || "[]");
}

function saveBasket(basket) {
  localStorage.setItem("enquiryBasket", JSON.stringify(basket));
  updateBasketCount();
}

function toggleBasket(productId) {
  const basket = getBasket();
  const idx = basket.indexOf(productId);

  if (idx === -1) {
    basket.push(productId);
    showToast("Added to enquiry basket");
  } else {
    basket.splice(idx, 1);
    showToast("Removed from basket");
  }

  saveBasket(basket);
  applyFilters();
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
