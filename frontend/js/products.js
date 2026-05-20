// ─── State ──────────────────────────────────────────────────────
let activeFilters = { brands: [], industries: [], surfaces: [] };

// ─── Init ────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  buildFilterCheckboxes();
  renderGrid(PRODUCTS);
  updateBasketCount();
  document.getElementById("searchInput").addEventListener("input", applyFilters);
});

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

// ─── Apply search + filters ───────────────────────────────────────
function applyFilters() {
  const query = document.getElementById("searchInput").value.toLowerCase().trim();

  activeFilters = { brands: [], industries: [], surfaces: [] };
  document.querySelectorAll(".filter-sidebar input[type=checkbox]:checked").forEach(cb => {
    const type = cb.dataset.type;
    if (type === "brand") activeFilters.brands.push(cb.value);
    if (type === "industry") activeFilters.industries.push(cb.value);
    if (type === "surface") activeFilters.surfaces.push(cb.value);
  });

  const results = PRODUCTS.filter(p => {
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

  renderGrid(results);
}

function clearFilters() {
  document.querySelectorAll(".filter-sidebar input[type=checkbox]").forEach(cb => cb.checked = false);
  document.getElementById("searchInput").value = "";
  activeFilters = { brands: [], industries: [], surfaces: [] };
  renderGrid(PRODUCTS);
}

// ─── Render product grid ──────────────────────────────────────────
function renderGrid(products) {
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
}

function productCardHTML(p) {
  const basket = getBasket();
  const inBasket = basket.includes(p.id);
  const industryTags = p.industries.slice(0, 2).map(i => `<span class="product-tag">${i}</span>`).join("");

  return `
    <div class="product-card">
      <div class="product-card-image">
        <img src="${p.imageUrl}" alt="${p.name}" onerror="this.parentElement.innerHTML='<span>No image</span>'">
      </div>
      <div class="product-card-body">
        <span class="brand-badge">${p.brand}</span>
        <h3>${p.name}</h3>
        <p>${p.shortDescription}</p>
        <div class="product-tags">${industryTags}</div>
        <div class="product-card-actions">
          <a href="product-detail.html?id=${p.id}" class="btn btn-outline">View Details</a>
          <button
            class="btn btn-primary ${inBasket ? "btn-added" : ""}"
            id="addBtn${p.id}"
            onclick="toggleBasket(${p.id})"
          >${inBasket ? "✓ Added" : "Add to Enquiry"}</button>
        </div>
      </div>
    </div>`;
}

// ─── Filter sidebar mobile toggle ────────────────────────────────
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
