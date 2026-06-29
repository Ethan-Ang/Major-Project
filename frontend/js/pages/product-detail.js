// Safety net: ylEscapeHtml is defined in data.js. If a stale cached data.js is
// served (its ?v= was not bumped after a change), define a local escaping
// fallback and warn, so the page still renders instead of throwing a
// ReferenceError and halting. The fix is to bump data.js's ?v= and redeploy.
if (typeof window !== "undefined" && typeof window.ylEscapeHtml !== "function") {
  window.ylEscapeHtml = function (s) {
    if (!window.__ylHelperWarned) {
      console.warn("[Yee Lim] ylEscapeHtml missing from data.js (stale cache?). Using fallback. Bump the ?v= on data.js and redeploy.");
      window.__ylHelperWarned = true;
    }
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
}

// Loading skeleton (same shimmer style as the catalogue) shown while product
// data is fetched, so a slow connection sees feedback instead of a blank area.
function renderDetailSkeleton() {
  const g = document.getElementById("detailGallery");
  if (g) g.innerHTML = '<div class="skeleton-img" aria-hidden="true" style="border-radius:8px;aspect-ratio:1/1"></div>';
  const h = document.getElementById("detailHeader");
  if (h) h.innerHTML =
    '<div aria-hidden="true" style="max-width:520px">' +
    '<div class="skeleton-line skeleton-line-short"></div>' +
    '<div class="skeleton-line skeleton-line-title"></div>' +
    '<div class="skeleton-line"></div>' +
    '<div class="skeleton-line skeleton-line-mid"></div>' +
    '</div>';
}

// ─── Init ────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  renderDetailSkeleton();
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
      "<p style='padding:3rem 1.5rem;color:var(--muted)'>Product not found. <a href='/products' style='color:var(--red)'>Back to products</a></p>";
    const hdr = document.getElementById("detailHeader");
    if (hdr) hdr.innerHTML = ""; // clear the header skeleton on the not-found path
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
  renderStickyCta(product);
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
    if (ref && ref.origin === location.origin && (ref.pathname === "/products" || ref.pathname.endsWith("/products.html"))) {
      e.preventDefault();
      history.back();
      return false;
    }
  } catch (_) { /* fall through to the href fallback */ }
  return true;
}

// ─── Gallery ─────────────────────────────────────────────────────
// Arrows, thumbnail row, and the "1 / N" counter only appear when a product
// has more than one image. A single image (the usual case) shows a clean,
// uncluttered frame. Broken/missing images fall back via ylImageFallback().
let galleryState = { images: [], index: 0, label: "" };

function renderGallery(product) {
  const el = document.getElementById("detailGallery");
  if (!el) return;
  const images = (product.images && product.images.length) ? product.images.filter(Boolean) : [];
  const brandLabel = ylEscapeHtml(product.brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase());
  const safeName = ylEscapeHtml(product.name);
  const placeholderSub = ylEscapeHtml((product.category && product.category !== "Others")
    ? product.category
    : "Adhesive Solution");

  galleryState = { images, index: 0, label: brandLabel };
  const multi = images.length > 1;

  const stageContent = images.length
    ? `<img id="galleryMainImg" src="${encodeURI(images[0])}" alt="${safeName}" loading="lazy" onerror="ylImageFallback(this,'${brandLabel}')">`
    : `<div class="gallery-placeholder" aria-label="${safeName}">
         <div class="gallery-placeholder-brand" aria-hidden="true">${brandLabel}</div>
         <span>${placeholderSub}</span>
       </div>`;

  const navHTML = multi ? `
    <button class="gallery-nav gallery-prev" type="button" aria-label="Previous image" onclick="galleryStep(-1)">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <button class="gallery-nav gallery-next" type="button" aria-label="Next image" onclick="galleryStep(1)">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
    <span class="gallery-counter" id="galleryCounter" aria-hidden="true">1 / ${images.length}</span>` : "";

  const thumbsHTML = multi ? `
    <div class="gallery-thumbs" aria-label="Product image thumbnails">
      ${images.map((src, i) => `
        <button class="gallery-thumb${i === 0 ? " active" : ""}" type="button"
          onclick="gallerySet(${i})" aria-label="Show image ${i + 1}"${i === 0 ? ' aria-current="true"' : ""}>
          <img src="${src}" alt="" loading="lazy" onerror="ylImageFallback(this,'${brandLabel}')">
        </button>`).join("")}
    </div>` : "";

  el.innerHTML = `
    <div class="gallery-main${images.length ? "" : " no-image"}" id="galleryMain">
      <div class="gallery-stage" id="galleryStage">${stageContent}</div>
      ${navHTML}
    </div>
    ${thumbsHTML}`;
}

function gallerySet(i) {
  const { images, label } = galleryState;
  if (!images.length || i < 0 || i >= images.length) return;
  galleryState.index = i;

  const stage = document.getElementById("galleryStage");
  if (stage) {
    stage.innerHTML = `<img id="galleryMainImg" src="${encodeURI(images[i])}" alt="" loading="lazy" onerror="ylImageFallback(this,'${label}')">`;
  }
  const counter = document.getElementById("galleryCounter");
  if (counter) counter.textContent = `${i + 1} / ${images.length}`;

  document.querySelectorAll(".gallery-thumb").forEach((t, idx) => {
    const active = idx === i;
    t.classList.toggle("active", active);
    if (active) t.setAttribute("aria-current", "true");
    else t.removeAttribute("aria-current");
  });
}

function galleryStep(delta) {
  const { images, index } = galleryState;
  if (images.length < 2) return;
  gallerySet((index + delta + images.length) % images.length);
}

// ─── Product Header ───────────────────────────────────────────────
function renderHeader(product) {
  const el = document.getElementById("detailHeader");
  if (!el) return;
  const availClass = product.status === "Available" ? "available" : "unavailable";
  el.innerHTML = `
    <div class="detail-product-header">
      <div class="detail-product-meta">
        <span class="brand-badge">${ylEscapeHtml(brandDisplay(product.brand))}</span>
        <span class="avail-badge ${availClass}" aria-label="Availability: ${ylEscapeHtml(product.status)}">
          <span class="avail-dot" aria-hidden="true"></span>${product.status}
        </span>
      </div>
      <h1 class="detail-product-name">${ylEscapeHtml(product.name)}</h1>
      <p class="detail-product-desc">${ylEscapeHtml(product.shortDescription)}</p>
    </div>`;
}

// ─── Spec Table ───────────────────────────────────────────────────
// Rows are built conditionally so the table never shows blank cells. Empty
// Industries / Surfaces / Key Features (common for accessories and a few
// adhesives) are omitted entirely. Accessories show a clear "Product Type"
// instead of the internal "Brand: Others & Accessories".
function renderSpecTable(product) {
  const el = document.getElementById("detailSpecs");
  if (!el) return;

  const isAccessory = product.brand === "Others & Accessories" || product.category === "Others";
  const tagList = arr => `<div class="spec-tags">${arr.map(x => `<span class="spec-tag">${ylEscapeHtml(x)}</span>`).join("")}</div>`;

  const rows = [];
  if (isAccessory) {
    // Not an adhesive brand: present it as a product type, not a fake brand.
    rows.push({ key: "Product Type", val: "Spray Guns &amp; Accessories" });
  } else {
    if (product.brand)    rows.push({ key: "Brand",    val: ylEscapeHtml(product.brand) });
    if (product.category) rows.push({ key: "Category", val: ylEscapeHtml(product.category) });
  }

  if (product.industries.length) rows.push({ key: "Industries", val: tagList(product.industries) });
  if (product.surfaces.length)   rows.push({ key: "Surfaces",   val: tagList(product.surfaces) });
  if (product.features.length) {
    rows.push({
      key: "Key Features",
      val: `<div class="spec-features">${product.features.map(f => `<span class="spec-feature">${ylEscapeHtml(f)}</span>`).join("")}</div>`
    });
  }

  el.innerHTML = `
    <div class="spec-table-wrap">
      <div class="spec-table-heading">Specifications</div>
      ${rows.map(r => `
      <div class="spec-row">
        <div class="spec-key">${r.key}</div>
        <div class="spec-val">${r.val}</div>
      </div>`).join("")}
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
      <div class="sidebar-product-name">${ylEscapeHtml(product.name)}</div>
      <div class="sidebar-brand">${ylEscapeHtml(brandDisplay(product.brand))}</div>
    </div>
    <div class="sidebar-actions">
      <button
        class="btn btn-primary btn-lg${inBasket ? " btn-added" : ""}"
        id="sidebarBasketBtn"
        data-enquiry-label="${enquiryLabel}"
        aria-pressed="${inBasket ? "true" : "false"}"
        onclick="toggleBasket('${product.id}')">
        ${inBasket ? "In Product Enquiry" : enquiryLabel}
      </button>
      <button
        class="btn-compare-sidebar${inCompare ? " in-compare" : ""}"
        id="sidebarCompareBtn"
        onclick="toggleCompare('${product.id}')">
        ${inCompare ? "&#10003; In Comparison" : "+ Add to Compare"}
      </button>
    </div>
    <div class="sidebar-foot">
      <a href="/enquiry" class="sidebar-enquiry-link" id="sidebarEnquiryLink"${inBasket ? "" : " hidden"}>View Product Enquiry &rarr;</a>
      <p class="sidebar-note">Need advice before choosing? Add this product to your enquiry and Yee Lim's team will advise on suitability, pricing, and lead time.</p>
    </div>`;
}

function updateSidebarCompareBtn(productId) {
  const inCompare = isInCompare(productId);

  const btn = document.getElementById("sidebarCompareBtn");
  if (btn) {
    btn.className = `btn-compare-sidebar${inCompare ? " in-compare" : ""}`;
    btn.innerHTML = inCompare ? "&#10003; In Comparison" : "+ Add to Compare";
  }

  // Keep the mobile sticky-bar compare button in step with the sidebar.
  const sticky = document.getElementById("stickyCompareBtn");
  if (sticky) {
    sticky.classList.toggle("on", inCompare);
    sticky.setAttribute("aria-pressed", inCompare ? "true" : "false");
    sticky.setAttribute("aria-label", inCompare ? "Remove from comparison" : "Add to comparison");
    const lbl = document.getElementById("stickyCompareLabel");
    if (lbl) lbl.textContent = inCompare ? "Added" : "Compare";
  }
}

// ─── Mobile sticky action bar (≤640px) ────────────────────────────
// A fixed Compare + Add-to-Enquiry bar so the primary actions stay in
// reach once the sidebar scrolls away. Mirrors the sidebar button state;
// hidden on desktop via CSS.
function renderStickyCta(product) {
  if (document.getElementById("stickyCta")) return;
  const inBasket  = getBasket().includes(product.id);
  const inCompare = isInCompare(product.id);
  const addLabel  = product.status === "Available" ? "Add to Enquiry" : "Enquire";

  const bar = document.createElement("div");
  bar.id = "stickyCta";
  bar.className = "sticky-cta";
  bar.innerHTML = `
    <button class="sticky-cta-cmp${inCompare ? " on" : ""}" id="stickyCompareBtn"
      onclick="toggleCompare('${product.id}')"
      aria-pressed="${inCompare ? "true" : "false"}"
      aria-label="${inCompare ? "Remove from comparison" : "Add to comparison"}">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="7" height="13" rx="1"/><rect x="14" y="4" width="7" height="16" rx="1"/></svg>
      <span id="stickyCompareLabel">${inCompare ? "Added" : "Compare"}</span>
    </button>
    <button class="sticky-cta-add${inBasket ? " added" : ""}" id="stickyBasketBtn"
      data-add-label="${addLabel}"
      aria-pressed="${inBasket ? "true" : "false"}"
      onclick="toggleBasket('${product.id}')">
      ${inBasket ? "In Enquiry" : addLabel}
    </button>`;
  document.body.appendChild(bar);
  document.body.classList.add("detail-has-cta");
}

// ─── Full Description + Usage ─────────────────────────────────────
function renderFullDesc(product) {
  const el = document.getElementById("detailDesc");
  if (!el) return;
  el.innerHTML = `
    <h2 class="section-heading">Product Description</h2>
    <p class="detail-product-desc">${ylEscapeHtml(product.fullDescription)}</p>
    <h2 class="section-heading" style="margin-top:1.5rem">How to Use</h2>
    <div class="usage-box">${ylEscapeHtml(product.usage)}</div>
    <div class="enquiry-guidance">
      <h2 class="enquiry-guidance-title">Not sure if this product fits your application?</h2>
      <p>Send your surface, application, and quantity requirements to Yee Lim.
      Our team will advise on suitability and quotation.</p>
      <a href="/enquiry" class="enquiry-guidance-link" onclick="enquireAboutProduct('${product.id}')">Send Product Enquiry &rarr;</a>
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
    const brandLabel = ylEscapeHtml(p.brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase());
    const hasRealImage = p.images && p.images.length > 0;
    const imageContent = hasRealImage
      ? `<img src="${encodeURI(p.images[0])}" alt="${ylEscapeHtml(p.name)}" loading="lazy" onerror="ylImageFallback(this,'${brandLabel}')">`
      : `<div class="no-image-mark" aria-hidden="true">${brandLabel}</div>`;
    const imageClass = hasRealImage ? "product-card-image" : "product-card-image no-image";
    const detailHref = `/product-detail?id=${encodeURIComponent(p.id)}`;
    return `
    <div class="product-card">
      <div class="${imageClass}">
        <a class="product-card-image-link" href="${detailHref}" tabindex="-1" aria-hidden="true">${imageContent}</a>
      </div>
      <div class="product-card-body">
        <span class="brand-badge">${ylEscapeHtml(brandDisplay(p.brand))}</span>
        <h3><a class="product-card-title-link" href="${detailHref}">${ylEscapeHtml(p.name)}</a></h3>
        <p>${ylEscapeHtml(p.shortDescription)}</p>
        <div class="product-card-actions">
          <a href="${detailHref}" class="btn btn-outline">View Product</a>
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
  const sticky = document.getElementById("stickyBasketBtn");
  const enquiryLink = document.getElementById("sidebarEnquiryLink");

  if (idx === -1) {
    basket.push(productId);
    if (btn) {
      btn.textContent = "In Product Enquiry";
      btn.classList.add("btn-added");
      btn.setAttribute("aria-pressed", "true");
    }
    if (sticky) {
      sticky.textContent = "In Enquiry";
      sticky.classList.add("added");
      sticky.setAttribute("aria-pressed", "true");
    }
    if (enquiryLink) enquiryLink.hidden = false;
    showToast("Added to your product enquiry");
  } else {
    basket.splice(idx, 1);
    if (btn) {
      btn.textContent = btn.dataset.enquiryLabel || "Add to Product Enquiry";
      btn.classList.remove("btn-added");
      btn.setAttribute("aria-pressed", "false");
    }
    if (sticky) {
      sticky.textContent = sticky.dataset.addLabel || "Add to Enquiry";
      sticky.classList.remove("added");
      sticky.setAttribute("aria-pressed", "false");
    }
    if (enquiryLink) enquiryLink.hidden = true;
    showToast("Removed from your product enquiry");
  }
  saveBasket(basket);
}

// Bottom "Send Product Enquiry" CTA: the visitor is already looking at a
// specific product, so add it to the enquiry first (no duplicates), then let
// the link's href carry them to enquiry.html where it will be pre-selected.
// localStorage writes are synchronous, so the basket is saved before the
// default navigation runs — no preventDefault needed. Works for unavailable
// products too. The navbar Product Enquiry link is untouched (navigation only).
function enquireAboutProduct(productId) {
  const id = String(productId);
  const basket = getBasket();
  if (!basket.map(String).includes(id)) {
    basket.push(id);
    saveBasket(basket);
  }
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
