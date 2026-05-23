// ─── Init ────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const params  = new URLSearchParams(window.location.search);
  const id      = parseInt(params.get("id"), 10);
  const product = PRODUCTS.find(p => p.id === id);

  if (!product) {
    const grid = document.getElementById("detailPageGrid");
    if (grid) grid.innerHTML =
      "<p style='padding:3rem 1.5rem;color:var(--muted)'>Product not found. <a href='products.html' style='color:var(--red)'>Back to products</a></p>";
    return;
  }

  document.title = `${product.name} | Yee Lim Adhesives Industries`;
  const breadcrumb = document.getElementById("breadcrumbProduct");
  if (breadcrumb) breadcrumb.textContent = product.name;

  renderGallery(product);
  renderHeader(product);
  renderSpecTable(product);
  renderSidebar(product);
  renderFullDesc(product);
  renderRelated(product);
  updateBasketCount();

  window.addEventListener("compareUpdated", () => updateSidebarCompareBtn(product.id));
});

// ─── Gallery ─────────────────────────────────────────────────────
function renderGallery(product) {
  const el     = document.getElementById("detailGallery");
  if (!el) return;
  const images = (product.images && product.images.length) ? product.images : [];

  const brandLabel = product.brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase();
  const placeholderSVG = `
    <div class="gallery-placeholder" aria-label="No product image available">
      <div class="gallery-placeholder-brand" aria-hidden="true">${brandLabel}</div>
      <span>Photography coming soon</span>
    </div>`;

  const mainImgContent = images.length
    ? `<img id="galleryMainImg" src="${images[0]}" alt="${product.name}">`
    : placeholderSVG;

  const thumbsHTML = [0, 1, 2, 3].map(i => {
    const src = images[i] || "";
    const imgTag = src
      ? `<img src="${src}" alt="Product view ${i + 1}">`
      : `<span class="gallery-thumb-dot" aria-hidden="true"></span>`;
    const activeClass = i === 0 ? " active" : "";
    return `
      <button class="gallery-thumb${activeClass}"
        onclick="switchGalleryImage(${i}, this, '${src}')"
        aria-label="Product image ${i + 1}">
        ${imgTag}
      </button>`;
  }).join("");

  el.innerHTML = `
    <div class="gallery-main" id="galleryMain">${mainImgContent}</div>
    <div class="gallery-thumbs">${thumbsHTML}</div>`;
}

function switchGalleryImage(index, thumbEl, src) {
  const main = document.getElementById("galleryMain");
  if (!main) return;
  if (src) {
    main.innerHTML = `<img id="galleryMainImg" src="${src}" alt="Product image ${index + 1}">`;
  }
  document.querySelectorAll(".gallery-thumb").forEach(t => t.classList.remove("active"));
  thumbEl.classList.add("active");
}

// ─── Product Header ───────────────────────────────────────────────
function renderHeader(product) {
  const el = document.getElementById("detailHeader");
  if (!el) return;
  const availClass = product.status === "Available" ? "available" : "unavailable";
  el.innerHTML = `
    <div class="detail-product-header">
      <div class="detail-product-meta">
        <span class="brand-badge">${product.brand}</span>
        <span class="avail-badge ${availClass}" aria-label="Availability: ${product.status}">
          <span class="avail-dot" aria-hidden="true"></span>${product.status}
        </span>
      </div>
      <h1 class="detail-product-name">${product.name}</h1>
      <p class="detail-product-desc">${product.shortDescription}</p>
    </div>`;
}

// ─── Spec Table ───────────────────────────────────────────────────
function renderSpecTable(product) {
  const el = document.getElementById("detailSpecs");
  if (!el) return;
  const industryTags = product.industries.map(i => `<span class="spec-tag">${i}</span>`).join("");
  const surfaceTags  = product.surfaces.map(s => `<span class="spec-tag">${s}</span>`).join("");
  const featureItems = product.features.map(f => `<span class="spec-feature">${f}</span>`).join("");

  el.innerHTML = `
    <div class="spec-table-wrap">
      <div class="spec-table-heading">Specifications</div>
      <div class="spec-row">
        <div class="spec-key">Brand</div>
        <div class="spec-val">${product.brand}</div>
      </div>
      <div class="spec-row">
        <div class="spec-key">Category</div>
        <div class="spec-val">${product.category}</div>
      </div>
      <div class="spec-row">
        <div class="spec-key">Industries</div>
        <div class="spec-val"><div class="spec-tags">${industryTags}</div></div>
      </div>
      <div class="spec-row">
        <div class="spec-key">Surfaces</div>
        <div class="spec-val"><div class="spec-tags">${surfaceTags}</div></div>
      </div>
      <div class="spec-row">
        <div class="spec-key">Key Features</div>
        <div class="spec-val"><div class="spec-features">${featureItems}</div></div>
      </div>
    </div>`;
}

// ─── Sticky Sidebar ───────────────────────────────────────────────
function renderSidebar(product) {
  const el        = document.getElementById("detailSidebar");
  if (!el) return;
  const basket    = getBasket();
  const inBasket  = basket.includes(product.id);
  const inCompare = isInCompare(product.id);
  const availClass = product.status === "Available" ? "available" : "unavailable";
  const availLabel = product.status === "Available" ? "Available for Enquiry" : "Currently Unavailable";

  el.innerHTML = `
    <div class="sidebar-avail-bar ${availClass}" aria-label="Availability: ${product.status}">
      <span class="avail-dot" aria-hidden="true"></span>${availLabel}
    </div>
    <div class="sidebar-identity">
      <div class="sidebar-product-name">${product.name}</div>
      <div class="sidebar-brand">${product.brand}</div>
    </div>
    <div class="sidebar-actions">
      <button
        class="btn btn-primary btn-lg${inBasket ? " btn-added" : ""}"
        id="sidebarBasketBtn"
        onclick="toggleBasket(${product.id})"
        aria-pressed="${inBasket}">
        ${inBasket ? "&#10003; Added to Enquiry" : "Add to Enquiry Basket"}
      </button>
      <button
        class="btn-compare-sidebar${inCompare ? " in-compare" : ""}"
        id="sidebarCompareBtn"
        onclick="toggleCompare(${product.id})"
        aria-pressed="${inCompare}">
        ${inCompare ? "&#10003; In Comparison" : "+ Add to Compare"}
      </button>
    </div>
    <div class="sidebar-foot">
      <a href="enquiry.html" class="sidebar-enquiry-link">View Enquiry Basket &rarr;</a>
      <p class="sidebar-note">Submit an enquiry to receive pricing and lead times from our sales team.</p>
    </div>`;
}

function updateSidebarCompareBtn(productId) {
  const btn = document.getElementById("sidebarCompareBtn");
  if (!btn) return;
  const inCompare  = isInCompare(productId);
  btn.className    = `btn-compare-sidebar${inCompare ? " in-compare" : ""}`;
  btn.innerHTML    = inCompare ? "&#10003; In Comparison" : "+ Add to Compare";
  btn.setAttribute("aria-pressed", String(inCompare));
}

// ─── Full Description + Usage ─────────────────────────────────────
function renderFullDesc(product) {
  const el = document.getElementById("detailDesc");
  if (!el) return;
  el.innerHTML = `
    <h2 class="section-heading">Product Description</h2>
    <p class="detail-product-desc">${product.fullDescription}</p>
    <h2 class="section-heading" style="margin-top:1.5rem">How to Use</h2>
    <div class="usage-box">${product.usage}</div>`;
}

// ─── Related Products ─────────────────────────────────────────────
function renderRelated(product) {
  const related = PRODUCTS.filter(p =>
    p.id !== product.id &&
    (p.brand === product.brand ||
     p.industries.some(i => product.industries.includes(i)))
  ).slice(0, 4);

  if (related.length === 0) return;

  const section = document.getElementById("relatedSection");
  const grid    = document.getElementById("relatedGrid");
  if (!section || !grid) return;

  section.style.display = "block";
  grid.innerHTML = related.map(p => `
    <div class="product-card">
      <div class="product-card-image">
        <img src="${p.imageUrl}" alt="${p.name}"
          onerror="this.parentElement.style.background='var(--bg)';this.remove()">
      </div>
      <div class="product-card-body">
        <span class="brand-badge">${p.brand}</span>
        <h3>${p.name}</h3>
        <p>${p.shortDescription}</p>
        <div class="product-card-actions">
          <a href="product-detail?id=${p.id}" class="btn btn-outline">View Product</a>
        </div>
      </div>
    </div>`).join("");
}

// ─── Basket helpers ───────────────────────────────────────────────
function getBasket() {
  return JSON.parse(localStorage.getItem("enquiryBasket") || "[]");
}

function saveBasket(basket) {
  localStorage.setItem("enquiryBasket", JSON.stringify(basket));
  updateBasketCount();
  window.dispatchEvent(new Event("basketUpdated"));
}

function toggleBasket(productId) {
  const basket = getBasket();
  const idx    = basket.indexOf(productId);
  const btn    = document.getElementById("sidebarBasketBtn");

  if (idx === -1) {
    basket.push(productId);
    if (btn) {
      btn.innerHTML = "&#10003; Added to Enquiry";
      btn.classList.add("btn-added");
      btn.setAttribute("aria-pressed", "true");
    }
    showToast("Added to enquiry basket");
  } else {
    basket.splice(idx, 1);
    if (btn) {
      btn.textContent = "Add to Enquiry Basket";
      btn.classList.remove("btn-added");
      btn.setAttribute("aria-pressed", "false");
    }
    showToast("Removed from basket");
  }
  saveBasket(basket);
}

function updateBasketCount() {
  const el = document.getElementById("basketCount");
  if (el) el.textContent = getBasket().length;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}
