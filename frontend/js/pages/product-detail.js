// ─── Init ────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadProductsFromBackend();
  } catch (err) {
    console.error(err);
  }

  const params  = new URLSearchParams(window.location.search);
  const id      = params.get("id");
  const product = PRODUCTS.find(p => String(p.id) === String(id));

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
  renderDownloads(product);
  renderSidebar(product);
  renderFullDesc(product);
  renderRelated(product);
  updateBasketCount();

  if (typeof renderCompareTray === "function") renderCompareTray();
  window.addEventListener("compareUpdated", () => updateSidebarCompareBtn(product.id));
});

// ─── Back to catalogue ────────────────────────────────────────────
// If the visitor arrived from the products listing, Back returns them
// to that exact scroll / filter / search state. Otherwise the link's
// href (products.html#catalogue) is followed normally. The navbar
// Products link is unaffected.
function backToProducts(e) {
  try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.origin === location.origin && ref.pathname.endsWith("/products.html")) {
      e.preventDefault();
      history.back();
      return false;
    }
  } catch (_) { /* fall through to the href fallback */ }
  return true;
}

// ─── Gallery ─────────────────────────────────────────────────────
function renderGallery(product) {
  const el     = document.getElementById("detailGallery");
  if (!el) return;
  const images = (product.images && product.images.length) ? product.images : [];

  const brandLabel = product.brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase();
  const placeholderSub = (product.category && product.category !== "Others")
    ? product.category
    : "Adhesive Solution";
  const placeholderSVG = `
    <div class="gallery-placeholder" aria-label="${product.name}">
      <div class="gallery-placeholder-brand" aria-hidden="true">${brandLabel}</div>
      <span>${placeholderSub}</span>
    </div>`;

  const mainImgContent = images.length
    ? `<img id="galleryMainImg" src="${images[0]}" alt="${product.name}" onerror="ylImageFallback(this,'${brandLabel}')">`
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

// ─── Product Documents (SDS / TDS downloads) ──────────────────────
// Renders a clean download section ONLY when a document URL exists.
// If neither SDS nor TDS is set, the whole section stays hidden.
function escapeDocAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderDownloads(product) {
  const el = document.getElementById("detailDownloads");
  if (!el) return;

  const sds = (product.sdsUrl || "").trim();
  const tds = (product.tdsUrl || "").trim();

  // Hide the entire section when there are no documents.
  if (!sds && !tds) { el.innerHTML = ""; return; }

  const docLink = (href, label) => `
    <a class="doc-download" href="${escapeDocAttr(href)}" target="_blank" rel="noopener">
      <span class="doc-download-icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <polyline points="9 15 12 18 15 15"/>
        </svg>
      </span>
      <span class="doc-download-text">
        <span class="doc-download-label">${label}</span>
        <span class="doc-download-sub">PDF document, opens in a new tab</span>
      </span>
      <span class="doc-download-go" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </span>
    </a>`;

  el.innerHTML = `
    <section class="detail-downloads" aria-label="Product documents">
      <h2 class="section-heading">Product Documents</h2>
      <div class="doc-download-list">
        ${sds ? docLink(sds, "Download Safety Data Sheet") : ""}
        ${tds ? docLink(tds, "Download Technical Data Sheet") : ""}
      </div>
    </section>`;
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
  const enquiryLabel = product.status === "Available" ? "Add to Product Enquiry" : "Enquire About Availability";

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
        data-enquiry-label="${enquiryLabel}"
        onclick="toggleBasket('${product.id}')">
        ${inBasket ? "&#10003; Selected" : enquiryLabel}
      </button>
      <button
        class="btn-compare-sidebar${inCompare ? " in-compare" : ""}"
        id="sidebarCompareBtn"
        onclick="toggleCompare('${product.id}')">
        ${inCompare ? "&#10003; In Comparison" : "+ Add to Compare"}
      </button>
    </div>
    <div class="sidebar-foot">
      <a href="enquiry.html" class="sidebar-enquiry-link" id="sidebarEnquiryLink"${inBasket ? "" : " hidden"}>View Product Enquiry &rarr;</a>
      <p class="sidebar-note">Need advice before choosing? Add this product to your enquiry and Yee Lim's team will advise on suitability, pricing, and lead time.</p>
    </div>`;
}

function updateSidebarCompareBtn(productId) {
  const btn = document.getElementById("sidebarCompareBtn");
  if (!btn) return;
  const inCompare  = isInCompare(productId);
  btn.className    = `btn-compare-sidebar${inCompare ? " in-compare" : ""}`;
  btn.innerHTML    = inCompare ? "&#10003; In Comparison" : "+ Add to Compare";
}

// ─── Full Description + Usage ─────────────────────────────────────
function renderFullDesc(product) {
  const el = document.getElementById("detailDesc");
  if (!el) return;
  el.innerHTML = `
    <h2 class="section-heading">Product Description</h2>
    <p class="detail-product-desc">${product.fullDescription}</p>
    <h2 class="section-heading" style="margin-top:1.5rem">How to Use</h2>
    <div class="usage-box">${product.usage}</div>
    <div class="enquiry-guidance">
      <h2 class="enquiry-guidance-title">Not sure if this product fits your application?</h2>
      <p>Send your surface, application, and quantity requirements to Yee Lim.
      Our team will advise on suitability and quotation.</p>
      <a href="enquiry.html" class="enquiry-guidance-link">Send Product Enquiry &rarr;</a>
    </div>`;
}

// ─── Related Products ─────────────────────────────────────────────
function renderRelated(product) {
  const related = PRODUCTS.filter(p =>
    String(p.id) !== String(product.id) &&
    (p.brand === product.brand ||
     p.industries.some(i => product.industries.includes(i)))
  ).slice(0, 4);

  if (related.length === 0) return;

  const section = document.getElementById("relatedSection");
  const grid    = document.getElementById("relatedGrid");
  if (!section || !grid) return;

  section.style.display = "block";
  grid.innerHTML = related.map(p => {
    const brandLabel = p.brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase();
    return `
    <div class="product-card">
      <div class="product-card-image no-image">
        <div class="no-image-icon" aria-hidden="true">&#9783;</div>
        <div class="no-image-label" aria-hidden="true">${brandLabel}</div>
      </div>
      <div class="product-card-body">
        <span class="brand-badge">${p.brand}</span>
        <h3>${p.name}</h3>
        <p>${p.shortDescription}</p>
        <div class="product-card-actions">
          <a href="product-detail.html?id=${encodeURIComponent(p.id)}" class="btn btn-outline">View Product</a>
        </div>
      </div>
    </div>`;
  }).join("");
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
  const enquiryLink = document.getElementById("sidebarEnquiryLink");

  if (idx === -1) {
    basket.push(productId);
    if (btn) {
      btn.innerHTML = "&#10003; Selected";
      btn.classList.add("btn-added");
    }
    if (enquiryLink) enquiryLink.hidden = false;
    showToast("Added to your product enquiry");
  } else {
    basket.splice(idx, 1);
    if (btn) {
      btn.textContent = btn.dataset.enquiryLabel || "Add to Product Enquiry";
      btn.classList.remove("btn-added");
    }
    if (enquiryLink) enquiryLink.hidden = true;
    showToast("Removed from your product enquiry");
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
