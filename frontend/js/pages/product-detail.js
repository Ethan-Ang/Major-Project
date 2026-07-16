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
  const h = document.getElementById("detailSummary");
  if (h) h.innerHTML =
    '<div aria-hidden="true" style="max-width:520px">' +
    '<div class="skeleton-line skeleton-line-short"></div>' +
    '<div class="skeleton-line skeleton-line-title"></div>' +
    '<div class="skeleton-line"></div>' +
    '<div class="skeleton-line skeleton-line-mid"></div>' +
    '</div>';
}

// ─── Init ────────────────────────────────────────────────────────
// Module-scoped current product, so the once-registered event listeners below
// always act on the product currently shown (they must not close over a stale
// product across Swup swaps between detail pages).
let detailProduct = null;

// Re-runnable across swaps: registered via ylReady, self-selecting on the
// gallery anchor. The catalogue fetch is reused for the session.
async function initDetailPage() {
  const gallery = document.getElementById("detailGallery");
  if (!gallery) return;

  if (!PRODUCTS || !PRODUCTS.length) {
    renderDetailSkeleton();
    try {
      await loadProductsFromBackend();
    } catch (err) {
      console.error(err);
    }
  }

  const params  = new URLSearchParams(window.location.search);
  const id      = params.get("id");
  const product = PRODUCTS.find(p => String(p.id) === String(id));
  detailProduct = product || null;

  // A stale fixed CTA bar from a previously viewed product must never linger
  // (it lives on <body>, outside the swapped container).
  const oldCta = document.getElementById("stickyCta");
  if (oldCta) oldCta.remove();
  document.body.classList.remove("detail-has-cta");
  document.body.style.paddingBottom = ""; // drop any measured reservation

  // Rendered before the not-found early-return so an invalid deep link still
  // shows the compare tray if items are already stored (known edge case fix).
  if (typeof renderCompareTray === "function") renderCompareTray();

  if (!product) {
    const grid = document.getElementById("detailPageGrid");
    if (grid) grid.innerHTML =
      "<p style='padding:3rem 1.5rem;color:var(--muted)'>Product not found. <a href='/products' style='color:var(--red)'>Back to products</a></p>";
    const summary = document.getElementById("detailSummary");
    if (summary) summary.innerHTML = ""; // clear the skeleton on the not-found path
    const tabs = document.querySelector(".detail-tabs");
    if (tabs) tabs.style.display = "none";
    const advice = document.getElementById("detailAdvice");
    if (advice) advice.innerHTML = "";
    const related = document.getElementById("relatedSection");
    if (related) related.style.display = "none";
    return;
  }

  document.title = `${product.name} | Yee Lim Adhesives Industries`;
  const breadcrumb = document.getElementById("breadcrumbProduct");
  if (breadcrumb) breadcrumb.textContent = product.name;

  // Undo the not-found path's display:none, in case a prior invalid id was
  // rendered in this same page instance (e.g. a history navigation Swup does
  // not re-fetch for).
  const tabsSection = document.querySelector(".detail-tabs");
  if (tabsSection) tabsSection.style.display = "";

  renderGallery(product);
  renderSummary(product);
  renderSpecTable(product);
  renderApplication(product);
  renderDownloads(product);
  renderAdvice(product);
  renderStickyCta(product);
  renderRelated(product);
  updateBasketCount();
  ylDetailTab("specs");

  // Registered once for the app's lifetime; they read the current detailProduct.
  ylOnce("detail:listeners", () => {
    window.addEventListener("compareUpdated", () => {
      if (detailProduct) updateSidebarCompareBtn(detailProduct.id);
    });
    window.addEventListener("basketUpdated", () => {
      if (detailProduct) syncDetailBasketButtons(detailProduct);
      syncStickyCtaReserve(); // Add→Added can reflow the bar; re-measure
    });
    // Re-measure the bar reservation when the viewport changes (rotation,
    // browser-chrome show/hide, breakpoint crossing).
    window.addEventListener("resize", syncStickyCtaReserve);
    window.addEventListener("orientationchange", syncStickyCtaReserve);

    // Arrow-key navigation between the three detail tabs. Delegated on
    // document (not bound to the tab buttons directly) so it keeps working
    // after a Swup page swap re-creates the tablist markup.
    document.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const target = e.target;
      if (!target || !target.classList || !target.classList.contains("detail-tab")) return;
      e.preventDefault();
      const current = YL_DETAIL_TABS.indexOf(target.id.replace("tab-", ""));
      if (current === -1) return;
      const delta = e.key === "ArrowRight" ? 1 : -1;
      const nextName = YL_DETAIL_TABS[(current + delta + YL_DETAIL_TABS.length) % YL_DETAIL_TABS.length];
      ylDetailTab(nextName);
      const nextTab = document.getElementById(`tab-${nextName}`);
      if (nextTab) nextTab.focus();
    });
  });
}
ylReady(initDetailPage);

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

// ─── Product Summary (gallery-adjacent column) ────────────────────
// Replaces the old separate renderHeader (name/desc/availability) and
// renderSidebar (buy box). Element IDs and classes on the action controls are
// unchanged from the old sidebar markup so updateSidebarCompareBtn and
// syncDetailBasketButtons (which target them by id) keep working untouched.
function renderSummary(product) {
  const el = document.getElementById("detailSummary");
  if (!el) return;

  const basket    = getBasket();
  const inBasket  = basket.includes(product.id);
  const inCompare = isInCompare(product.id);
  const availClass   = product.status === "Available" ? "available" : "unavailable";
  const enquiryLabel  = product.status === "Available" ? "Add to Product Enquiry" : "Enquire About Availability";

  // The one summary paragraph: prefer the full description, fall back to the
  // short one when the full field is a placeholder ("x", "n/a", etc). Real
  // data only, never invented copy.
  const descText = isMeaningfulText(product.fullDescription)
    ? product.fullDescription
    : (isMeaningfulText(product.shortDescription) ? product.shortDescription : "");

  // WhatsApp quick-chat, pre-filled with the product name so the sales team
  // has context. Uses the same number as the contact page + footer.
  const waText = encodeURIComponent(
    `Hello Yee Lim, I would like to enquire about ${product.name}.`);
  const waHref = `https://wa.me/6588755786?text=${waText}`;

  el.innerHTML = `
    <div class="detail-product-header">
      <div class="detail-product-meta">
        <span class="brand-badge">${ylEscapeHtml(brandDisplay(product.brand))}</span>
        <span class="avail-badge ${availClass}" aria-label="Availability: ${ylEscapeHtml(product.status)}">
          <span class="avail-dot" aria-hidden="true"></span>${product.status}
        </span>
      </div>
      <h1 class="detail-product-name">${ylEscapeHtml(product.name)}</h1>
      ${descText ? `<p class="detail-product-desc">${ylEscapeHtml(descText)}</p>` : ""}
    </div>
    <div class="sidebar-actions">
      <button
        class="btn btn-primary btn-lg${inBasket ? " btn-added" : ""}"
        id="sidebarBasketBtn"
        data-enquiry-label="${enquiryLabel}"
        aria-pressed="${inBasket ? "true" : "false"}"
        onclick="toggleBasket('${product.id}', '${ylTxt(product.name)}')">
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
      ${rows.map(r => `
      <div class="spec-row">
        <div class="spec-key">${r.key}</div>
        <div class="spec-val">${r.val}</div>
      </div>`).join("")}
    </div>`;
}

// ─── Product Documents (SDS / TDS downloads) ──────────────────────
// CLIENT-002: the "Downloads" section is ALWAYS visible. With no documents it
// shows an honest empty state; otherwise one row per available document.
// CLIENT-003 (visitor-details gate before download) is NOT built yet — when it
// is, it wraps the docRow action below; the states/markup here stay as-is.
function escapeDocAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// A document only renders when its record is a genuine same-site root-relative
// path (/uploads/docs/x.pdf) or an explicit absolute https URL. Malformed
// values (placeholders, stray text, unsafe schemes) are treated as "no
// document" rather than a broken button.
function validDocUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  // Protocol-relative / UNC-style values (//host, \\host, /\host, ///host)
  // begin with a slash but resolve to an EXTERNAL host — never a document.
  if (/^[\/\\]{2,}/.test(s)) return null;
  if (s.startsWith("/")) {
    // Site-rooted path: must parse and stay on this origin.
    try {
      const u = new URL(s, window.location.origin);
      return u.origin === window.location.origin ? s : null;
    } catch { return null; }
  }
  // Absolute external URL: https only. Bare tokens ("x", "tbc") fail this
  // test and fall through to the empty state instead of a broken button.
  if (!/^https:\/\//i.test(s)) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" ? s : null;
  } catch { return null; }
}

function renderDownloads(product) {
  const el = document.getElementById("detailDownloads");
  if (!el) return;

  const sds = validDocUrl(product.sdsUrl);
  const tds = validDocUrl(product.tdsUrl);

  // Same WhatsApp quick-chat pattern used in the summary actions, offered as
  // a fallback when no document exists for this product.
  const waHref = `https://wa.me/6588755786?text=${encodeURIComponent(
    `Hello Yee Lim, I would like to enquire about ${product.name}.`)}`;

  // ── The single future integration point for CLIENT-003: the gate will
  // replace this anchor's direct navigation with the visitor-details flow.
  // Until then the approved behaviour stands: open the PDF in a new tab. ──
  const docRow = (href, label) => {
    const type = /\.pdf(\?|#|$)/i.test(href) ? "PDF document" : "Document";
    return `
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
        <span class="doc-download-sub">${type}, opens in a new tab</span>
      </span>
      <span class="doc-download-go" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </span>
    </a>`;
  };

  const body = (sds || tds)
    ? `<div class="doc-download-list">
        ${sds ? docRow(sds, "Safety Data Sheet") : ""}
        ${tds ? docRow(tds, "Technical Data Sheet") : ""}
      </div>`
    : `<div class="doc-empty">
        <span class="doc-empty-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </span>
        <span class="doc-empty-text">
          <span class="doc-empty-main">No downloads are currently available for this product.</span>
          <span class="doc-empty-sub"><a href="/contact" class="doc-empty-link">Contact Yee Lim</a> if you require technical documentation.</span>
        </span>
      </div>
      <a class="btn-whatsapp-sidebar doc-empty-wa" href="${waHref}" target="_blank" rel="noopener noreferrer" aria-label="Chat about this product on WhatsApp">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.8c2.17 0 4.2.85 5.74 2.38a8.06 8.06 0 0 1 2.38 5.73c0 4.47-3.64 8.11-8.12 8.11a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.11.82.83-3.03-.2-.31a8.06 8.06 0 0 1-1.24-4.31c0-4.47 3.64-8.1 8.11-8.1Zm4.68 11.53c-.19-.29-.75-.46-1.57-.86-.3-.15-.7-.36-1-.1-.19.16-.46.5-.62.68-.11.13-.23.14-.42.05a6.6 6.6 0 0 1-1.95-1.2 7.34 7.34 0 0 1-1.35-1.68c-.14-.24-.02-.37.1-.49.11-.11.24-.28.37-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.8-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.19 1.1.16 1.52.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14Z"/></svg>
        Talk to Yee Lim
      </a>`;

  el.innerHTML = `
    <section class="detail-downloads" aria-label="Product downloads">
      ${body}
    </section>`;
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

  // WhatsApp quick-chat, pre-filled with the product name (same number as the
  // sidebar, contact page + footer).
  const waHref = `https://wa.me/6588755786?text=${encodeURIComponent(
    `Hello Yee Lim, I would like to enquire about ${product.name}.`)}`;

  const bar = document.createElement("div");
  bar.id = "stickyCta";
  bar.className = "sticky-cta";
  bar.innerHTML = `
    <button class="sticky-cta-add${inBasket ? " added" : ""}" id="stickyBasketBtn"
      data-add-label="${addLabel}"
      aria-pressed="${inBasket ? "true" : "false"}"
      onclick="toggleBasket('${product.id}', '${ylTxt(product.name)}')">
      ${inBasket ? "In Enquiry" : addLabel}
    </button>
    <button class="sticky-cta-cmp${inCompare ? " on" : ""}" id="stickyCompareBtn"
      onclick="toggleCompare('${product.id}')"
      aria-pressed="${inCompare ? "true" : "false"}"
      aria-label="${inCompare ? "Remove from comparison" : "Add to comparison"}">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="7" height="13" rx="1"/><rect x="14" y="4" width="7" height="16" rx="1"/></svg>
      <span id="stickyCompareLabel">${inCompare ? "Added" : "Compare"}</span>
    </button>
    <a class="sticky-cta-wa" href="${waHref}" target="_blank" rel="noopener noreferrer"
      aria-label="Chat about this product on WhatsApp">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.29-.15-1.7-.84-1.96-.93-.26-.1-.45-.15-.64.14-.19.29-.74.93-.9 1.12-.17.19-.33.21-.62.07-.29-.15-1.22-.45-2.32-1.43-.86-.77-1.44-1.72-1.6-2-.17-.29-.02-.45.13-.59.13-.13.29-.34.44-.51.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.14-.64-1.55-.88-2.12-.23-.55-.47-.48-.64-.49h-.55c-.19 0-.51.07-.77.36-.26.29-1.01.99-1.01 2.41 0 1.42 1.04 2.8 1.18 2.99.15.19 2.04 3.12 4.95 4.38.69.3 1.23.48 1.65.61.69.22 1.33.19 1.83.12.56-.08 1.7-.7 1.95-1.37.24-.67.24-1.25.17-1.37-.07-.12-.26-.19-.55-.34zM12.04 21.5a9.45 9.45 0 0 1-4.83-1.32l-.35-.21-3.58.94.96-3.49-.23-.36a9.42 9.42 0 0 1-1.45-5.03c0-5.21 4.24-9.45 9.46-9.45 2.53 0 4.9.99 6.68 2.78a9.4 9.4 0 0 1 2.77 6.68c-.01 5.21-4.25 9.45-9.46 9.45z"/></svg>
    </a>`;
  document.body.appendChild(bar);
  document.body.classList.add("detail-has-cta");
  requestAnimationFrame(syncStickyCtaReserve);
}

// Reserve exactly the sticky bar's rendered height as body padding, so the page
// scrolls clear of it. Measured (not the CSS 4.9rem fallback) so the reservation
// always matches the real bar height incl. the safe-area inset — never taller,
// which is what let the cream body background leak through as a strip above the
// bar. No-op (and cleared) on desktop or when the bar is absent.
function syncStickyCtaReserve() {
  const cta = document.getElementById("stickyCta");
  if (!cta || window.innerWidth > 640) {
    document.body.style.paddingBottom = "";
    // Also clear the exposed height so the compare drawer (compare.js) does
    // not stack itself above a sticky bar that is not actually shown.
    document.documentElement.style.setProperty("--sticky-cta-height", "0px");
    return;
  }
  document.body.style.paddingBottom = cta.offsetHeight + "px";
  // Expose the same measurement so the compare drawer can stack above this
  // bar instead of overlapping it. See body.detail-has-cta .compare-tray
  // in products.css.
  document.documentElement.style.setProperty("--sticky-cta-height", cta.offsetHeight + "px");
}

// Some catalogue rows carry placeholder copy ("x", "-", "n/a") for fields that
// were never written up (e.g. the newer spray guns). Treat those as missing so
// the page never renders a stray "x".
function isMeaningfulText(text) {
  const t = (text == null ? "" : String(text)).trim();
  if (t.length < 3) return false; // "", "x", "-", "."
  return !/^(x+|-+|\.+|n\/?a|tbd|none|null)$/i.test(t);
}

// ─── Application & Suitable Uses tab ──────────────────────────────
// Built ONLY from the real usage field. Seed format:
//   "Apply by brush or roll. Suitable for: Leather product bonding; Shoe
//   in-soles; General purpose."
// Older / free-form records with no "Suitable for:" segment (e.g. numbered
// step instructions) render their whole usage text as the method column
// rather than being force-fit into a "suitable uses" list that isn't there.
// Real data only, never invented structure.
function renderApplication(product) {
  const el = document.getElementById("detailApply");
  if (!el) return;
  const usage = String(product.usage || "").trim();
  if (!usage) {
    el.innerHTML = `
      <div class="apply-empty">
        <p>Application guidance for this product is available from our team.</p>
        <p><a href="/contact" class="doc-empty-link">Contact Yee Lim</a> for advice on your surface and application.</p>
      </div>`;
    return;
  }
  const m = usage.match(/suitable for\s*:?\s*/i);
  const method = m ? usage.slice(0, m.index).trim() : usage;
  const uses = m ? usage.slice(m.index + m[0].length).split(/;|•/).map(s => s.trim().replace(/\.$/, "")).filter(Boolean) : [];
  el.innerHTML = `
    <div class="apply-grid">
      ${method ? `
      <div class="apply-col">
        <h3 class="apply-heading">Application Method</h3>
        <p class="apply-method">${ylEscapeHtml(method)}</p>
      </div>` : ""}
      ${uses.length ? `
      <div class="apply-col">
        <h3 class="apply-heading">Suitable Uses</h3>
        <ul class="apply-uses">${uses.map(u => `<li>${ylEscapeHtml(u)}</li>`).join("")}</ul>
      </div>` : ""}
    </div>`;
}

// ─── Tab switcher (Specifications / Application / Downloads) ──────
const YL_DETAIL_TABS = ["specs", "apply", "downloads"];
function ylDetailTab(name) {
  YL_DETAIL_TABS.forEach(t => {
    const tab = document.getElementById(`tab-${t}`);
    const panel = document.getElementById(`panel-${t}`);
    if (!tab || !panel) return;
    const on = t === name;
    tab.setAttribute("aria-selected", on ? "true" : "false");
    tab.tabIndex = on ? 0 : -1;
    panel.hidden = !on;
  });
}

function renderAdvice(product) {
  const el = document.getElementById("detailAdvice");
  if (!el) return;

  el.innerHTML = `
    <div class="enquiry-guidance">
      <div class="enquiry-guidance-copy">
        <h2 class="enquiry-guidance-title">Need help confirming compatibility?</h2>
        <p>Share your materials, application and quantity requirements. Our team will help confirm the most suitable option.</p>
      </div>
      <button type="button" class="enquiry-guidance-link"
        onclick="if(window.openProductAdvisor){openProductAdvisor()}else{window.location.href='/contact'}">
        Get Product Advice &rarr;</button>
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
// getBasket / saveBasket / toggleBasket / updateBasketCount / showToast now
// live in js/core/app.js (shared, event-driven). The sidebar + sticky-bar
// buttons update from the current basket state on the "basketUpdated" event
// (wired once in initDetailPage), instead of imperatively inside toggleBasket.
function syncDetailBasketButtons(product) {
  const inBasket = getBasket().map(String).includes(String(product.id));

  const btn = document.getElementById("sidebarBasketBtn");
  if (btn) {
    btn.textContent = inBasket ? "In Product Enquiry" : (btn.dataset.enquiryLabel || "Add to Product Enquiry");
    btn.classList.toggle("btn-added", inBasket);
    btn.setAttribute("aria-pressed", inBasket ? "true" : "false");
  }

  const sticky = document.getElementById("stickyBasketBtn");
  if (sticky) {
    sticky.textContent = inBasket ? "In Enquiry" : (sticky.dataset.addLabel || "Add to Enquiry");
    sticky.classList.toggle("added", inBasket);
    sticky.setAttribute("aria-pressed", inBasket ? "true" : "false");
  }

  const enquiryLink = document.getElementById("sidebarEnquiryLink");
  if (enquiryLink) enquiryLink.hidden = !inBasket;
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
