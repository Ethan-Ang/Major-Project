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

  const brandChip = images.length
    ? `<span class="gallery-brand-chip" aria-hidden="true">${brandLabel}</span>`
    : "";

  el.innerHTML = `
    <div class="gallery-main${images.length ? "" : " no-image"}" id="galleryMain">
      ${brandChip}
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
    const check = `<span class="spec-feature-check" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>`;
    rows.push({
      key: "Key Features",
      val: `<div class="spec-features">${product.features.map(f => `<span class="spec-feature">${check}<span class="spec-feature-text">${ylEscapeHtml(f)}</span></span>`).join("")}</div>`
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

  // WhatsApp quick-chat, pre-filled with the product name so the sales team
  // has context. Uses the same number as the contact page + footer.
  const waText = encodeURIComponent(
    `Hello Yee Lim, I would like to enquire about ${product.name}.`);
  const waHref = `https://wa.me/6588755786?text=${waText}`;

  el.innerHTML = `
    <div class="sidebar-avail-bar ${availClass}" aria-label="Availability: ${product.status}">
      <span class="avail-dot" aria-hidden="true"></span>${availLabel}
    </div>
    <div class="sidebar-identity">
      <div class="sidebar-brand">${ylEscapeHtml(brandDisplay(product.brand))}</div>
      <div class="sidebar-product-name">${ylEscapeHtml(product.name)}</div>
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
      <div class="sidebar-action-row">
        <button
          class="btn-compare-sidebar${inCompare ? " in-compare" : ""}"
          id="sidebarCompareBtn"
          onclick="toggleCompare('${product.id}')">
          ${inCompare ? "&#10003; In Comparison" : "+ Compare"}
        </button>
        <a class="btn-whatsapp-sidebar" href="${waHref}" target="_blank" rel="noopener noreferrer" aria-label="Chat about this product on WhatsApp">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.8c2.17 0 4.2.85 5.74 2.38a8.06 8.06 0 0 1 2.38 5.73c0 4.47-3.64 8.11-8.12 8.11a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.11.82.83-3.03-.2-.31a8.06 8.06 0 0 1-1.24-4.31c0-4.47 3.64-8.1 8.11-8.1Zm4.68 11.53c-.19-.29-.75-.46-1.57-.86-.3-.15-.7-.36-1-.1-.19.16-.46.5-.62.68-.11.13-.23.14-.42.05a6.6 6.6 0 0 1-1.95-1.2 7.34 7.34 0 0 1-1.35-1.68c-.14-.24-.02-.37.1-.49.11-.11.24-.28.37-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.8-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.19 1.1.16 1.52.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14Z"/></svg>
          WhatsApp
        </a>
      </div>
    </div>
    <div class="sidebar-foot">
      <a href="/enquiry" class="sidebar-enquiry-link" id="sidebarEnquiryLink"${inBasket ? "" : " hidden"}>View Product Enquiry &rarr;</a>
      <p class="sidebar-note">Yee Lim's team will advise on suitability, pricing &amp; lead time.</p>
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

// Some catalogue rows carry placeholder copy ("x", "-", "n/a") for fields that
// were never written up (e.g. the newer spray guns). Treat those as missing so
// the page never renders a stray "x".
function isMeaningfulText(text) {
  const t = (text == null ? "" : String(text)).trim();
  if (t.length < 3) return false; // "", "x", "-", "."
  return !/^(x+|-+|\.+|n\/?a|tbd|none|null)$/i.test(t);
}

// ─── Full Description + Usage ─────────────────────────────────────
// The source usage strings follow one of two shapes:
//   "Apply by <method>. Suitable for: <a>; <b>; <c>."  (most products)
//   free-form multi-step instructions            (e.g. PVC pipe cement)
// parseUsage separates the application method from the "suitable for" list so
// the two can be rendered distinctly instead of running together as one blob.
// The list is split on the "; " delimiters carried in the data — if a string
// has not been delimited (older records), it renders as one clean line rather
// than being mangled by a guessed word-boundary split.
function parseUsage(raw) {
  const text = (raw == null ? "" : String(raw)).trim();
  if (!text) return null;
  const m = text.match(/^(.*?)\.\s*suitable for:\s*(.+?)\.?\s*$/i);
  if (!m) return { method: "", steps: text, items: [] };
  const method = m[1].trim();
  const items = m[2].split(/\s*[;•]\s*/).map(s => s.trim()).filter(Boolean);
  return { method, steps: "", items };
}

function renderFullDesc(product) {
  const el = document.getElementById("detailDesc");
  if (!el) return;

  // Prefer the full description; fall back to the short one when the full field
  // is a placeholder, and omit "How to Use" entirely when there's no real usage
  // text — an honest omission reads better than a stray "x".
  const descText = isMeaningfulText(product.fullDescription)
    ? product.fullDescription
    : (isMeaningfulText(product.shortDescription) ? product.shortDescription : "");

  const parts = [];
  if (descText) {
    parts.push(`<h2 class="section-heading">Product Description</h2>`);
    parts.push(`<p class="detail-product-desc">${ylEscapeHtml(descText)}</p>`);
  }

  const usage = isMeaningfulText(product.usage) ? parseUsage(product.usage) : null;
  if (usage) {
    parts.push(`<h2 class="section-heading"${descText ? ' style="margin-top:1.75rem"' : ""}>How to Use</h2>`);
    const usageParts = [];
    if (usage.method) {
      usageParts.push(`
        <div class="usage-method">
          <span class="usage-method-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/></svg>
          </span>
          <div class="usage-method-text">
            <span class="usage-method-label">Application Method</span>
            <span class="usage-method-value">${ylEscapeHtml(usage.method)}</span>
          </div>
        </div>`);
    }
    if (usage.items.length) {
      usageParts.push(`
        <div class="usage-suitable">
          <span class="usage-suitable-label">Suitable for</span>
          <div class="usage-chips">
            ${usage.items.map(i => `<span class="usage-chip">${ylEscapeHtml(i)}</span>`).join("")}
          </div>
        </div>`);
    }
    if (usage.steps) {
      usageParts.push(`<p class="usage-steps">${ylEscapeHtml(usage.steps)}</p>`);
    }
    parts.push(`<div class="usage-box">${usageParts.join("")}</div>`);
  }

  parts.push(`
    <div class="enquiry-guidance">
      <div class="enquiry-guidance-copy">
        <h2 class="enquiry-guidance-title">Not sure if this product fits your application?</h2>
        <p>Send your surface, application, and quantity requirements to Yee Lim.
        Our team will advise on suitability and quotation.</p>
      </div>
      <a href="/enquiry" class="enquiry-guidance-link" onclick="enquireAboutProduct('${product.id}')">Send Product Enquiry &rarr;</a>
    </div>`);
  el.innerHTML = parts.join("\n");
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
    const imgClass = hasRealImage ? "related-card-img" : "related-card-img no-image";
    const detailHref = `/product-detail?id=${encodeURIComponent(p.id)}`;
    // The whole card is the link, so no CTA is needed. Fill the bottom slot with
    // the base type instead — a real differentiator B2B buyers scan for.
    const base = (p.features || []).find(f => /(solvent|water)[\s-]*based/i.test(f)) || "";
    return `
    <a class="related-card" href="${detailHref}" aria-label="${ylEscapeHtml(p.name)}, view product">
      <div class="${imgClass}">${imageContent}</div>
      <div class="related-card-body">
        <span class="brand-badge">${ylEscapeHtml(brandDisplay(p.brand))}</span>
        <h3 class="related-card-name">${ylEscapeHtml(p.name)}</h3>
        <p class="related-card-desc">${ylEscapeHtml(p.shortDescription)}</p>
        ${base ? `<span class="related-card-base">${ylEscapeHtml(base)}</span>` : ""}
      </div>
    </a>`;
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
