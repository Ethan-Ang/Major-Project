// Safety net: ylEscapeHtml is defined in data.js. If a stale cached data.js is
// served (its ?v= was not bumped after a change), fall back to a local escaper
// and warn, so the page still renders instead of throwing a ReferenceError.
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

// Loading skeleton (catalogue shimmer style) while product data is fetched.
function renderCompareSkeleton() {
  const content = document.getElementById("comparePageContent");
  if (!content) return;
  const col = '<div aria-hidden="true">' +
    '<div class="skeleton-img" style="border-radius:8px;aspect-ratio:1/1"></div>' +
    '<div class="skeleton-line skeleton-line-title" style="margin-top:0.75rem"></div>' +
    '<div class="skeleton-line skeleton-line-mid"></div>' +
    '<div class="skeleton-line"></div></div>';
  content.innerHTML =
    '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.5rem;max-width:640px">' +
    col + col + '</div>';
}

// Re-runnable across Swup swaps: registered via ylReady, self-selecting on the
// compare content anchor. The catalogue fetch is reused for the session.
function initComparePage() {
  const content = document.getElementById("comparePageContent");
  if (!content) return;

  if (PRODUCTS && PRODUCTS.length) {
    renderComparePage();
  } else {
    renderCompareSkeleton();
    loadProductsFromBackend()
      .catch(err => console.error(err))
      .finally(renderComparePage);
  }

  // Registered once for the app's lifetime; renderComparePage no-ops when the
  // compare content anchor is absent, so these are safe on other pages.
  ylOnce("compare:listeners", () => {
    window.addEventListener("compareUpdated", renderComparePage);
    window.addEventListener("resize", updateCompareScrollHint);
  });
}
ylReady(initComparePage);

// Shared brand-monogram label (uppercased, trademark suffix collapsed) used
// for image-fallback thumbnails in both the header cards and the selection panel.
function cxBrandLabel(brand) {
  return ylEscapeHtml(brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase());
}

// "Products to compare (n/3)" header panel: one card per product, an add
// slot below 3, and the grouped actions. Mirrors the bottom drawer.
function renderSelectPanel(products) {
  const el = document.getElementById("compareSelectPanel");
  if (!el) return;
  if (!products.length) { el.hidden = true; el.innerHTML = ""; return; }
  el.hidden = false;

  const subtype = p => (typeof productSubtype === "function") ? productSubtype(p) : (p.category || "");

  const cards = products.map(p => {
    const brandLabel = cxBrandLabel(p.brand);
    const hasImg = p.images && p.images.length > 0;
    const img = hasImg
      ? `<img src="${encodeURI(p.images[0])}" alt="" loading="lazy" onerror="ylImageFallback(this,'${brandLabel}')">`
      : `<span class="no-image-mark" aria-hidden="true">${brandLabel}</span>`;
    return `
      <div class="csel-card">
        <span class="csel-img">${img}</span>
        <span class="csel-text">
          <span class="csel-brand">${ylEscapeHtml(brandDisplay(p.brand))}</span>
          <span class="csel-name">${ylEscapeHtml(p.name)}</span>
          <span class="csel-sub">${ylEscapeHtml(subtype(p))}</span>
        </span>
        <button class="csel-x" onclick="toggleCompare('${p.id}')" aria-label="Remove ${ylEscapeHtml(p.name)} from comparison">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`;
  }).join("");

  // Add/Search slot only below 3/3 — completely removed at the cap. Opens the
  // dedicated compare picker (side panel), not a jump back to the catalogue.
  const addSlot = products.length < COMPARE_MAX
    ? `<button class="csel-card csel-add" type="button" onclick="ylCompareAddMore()"><span class="csel-add-icon" aria-hidden="true">+</span><span class="csel-add-text"><strong>Add a product</strong><small>Search or browse</small></span></button>`
    : "";

  el.innerHTML = `
    <div class="csel-head">Products to compare (${products.length}/3)</div>
    <div class="csel-body">
      <div class="csel-row">${cards}${addSlot}</div>
      <div class="csel-actions">
        <a class="btn btn-primary csel-compare" href="#comparePageContent">Compare now
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
        <button class="compare-page-clear" onclick="clearAll()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Clear all
        </button>
      </div>
    </div>`;
}

function renderComparePage() {
  const list     = getCompareList();
  const products = list.map(id => PRODUCTS.find(p => String(p.id) === String(id))).filter(Boolean);
  const content  = document.getElementById("comparePageContent");
  if (!content) return;

  // The selection panel tracks the raw compare list (0-3 products); it is
  // independent of the "need 2+ to compare" gate below.
  renderSelectPanel(products);

  if (products.length < 2) {
    content.innerHTML = `
      <div class="empty-state">
        <h2>Add at least 2 products to compare</h2>
        <p>Browse the catalogue and click <strong>+ Compare</strong> on the cards you want to compare side by side.</p>
        <a href="/products" class="btn btn-primary" style="display:inline-flex;margin-top:1.25rem">Browse Products</a>
      </div>`;
    return;
  }

  const subtype = p => (typeof productSubtype === "function") ? productSubtype(p) : (p.category || "");

  const headerCols = products.map(p => {
    const brandLabel  = cxBrandLabel(p.brand);
    const placeholderSub = ylEscapeHtml((p.category && p.category !== "Others") ? p.category : "Adhesive Solution");
    const hasRealImage = p.images && p.images.length > 0;
    const imgContent = hasRealImage
      ? `<img src="${encodeURI(p.images[0])}" alt="${ylEscapeHtml(p.name)}" loading="lazy" onerror="ylImageFallback(this,'${brandLabel}')">`
      : `<span class="compare-img-placeholder">${brandLabel}</span><span class="compare-img-placeholder-sub">${placeholderSub}</span>`;
    return `
      <td class="compare-col-header">
        <div class="compare-col-inner">
          <div class="compare-product-img">
            ${imgContent}
          </div>
          <div class="compare-product-brand">${ylEscapeHtml(brandDisplay(p.brand))}</div>
          <a class="compare-product-name" href="/product-detail?id=${encodeURIComponent(p.id)}">${ylEscapeHtml(p.name)}</a>
          <div class="compare-product-sub">${ylEscapeHtml(subtype(p))}</div>
        </div>
      </td>`;
  }).join("");

  // Real comparison fields only; a missing value renders as an em dash.
  const EMPTY = `<span class="compare-empty-val" aria-label="Not specified">&mdash;</span>`;
  const text = v => (v && String(v).trim()) ? ylEscapeHtml(String(v).trim()) : EMPTY;
  const listVals = arr => (arr && arr.length) ? ylEscapeHtml(arr.join(", ")) : EMPTY;
  // The real "Suitable for" method segment of the usage field, when present.
  const methodOf = p => {
    const usage = String(p.usage || "").trim();
    if (!usage || /^(x+|-+|\.+|n\/?a|tbd|none|null)$/i.test(usage)) return "";
    const m = usage.match(/suitable for\s*:\s*/i);
    return (m ? usage.slice(0, m.index) : usage).trim();
  };
  const check = `<span class="compare-check" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>`;
  const icon = d => `<span class="compare-label-ic" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg></span>`;

  const specRows = [
    { label: "Best for",
      ic: icon('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>'),
      render: p => listVals(p.industries) },
    { label: "Surface / Material",
      ic: icon('<polygon points="12 2 22 8.5 12 15 2 8.5 12 2"/><polyline points="2 13 12 19.5 22 13"/>'),
      render: p => listVals(p.surfaces) },
    { label: "Application Method",
      ic: icon('<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>'),
      render: p => text(methodOf(p)) },
    { label: "Category",
      ic: icon('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>'),
      render: p => text(p.category === "Others" ? "Application Equipment" : p.category) },
    { label: "Key Features",
      ic: icon('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
      render: p => p.features.length
        ? p.features.map(f => `<div class="compare-feature">${check}${ylEscapeHtml(f)}</div>`).join("")
        : EMPTY }
  ].map(row => `
    <tr>
      <td class="compare-row-label"><span class="compare-label-wrap">${row.ic}<span>${row.label}</span></span></td>
      ${products.map(p => `<td class="compare-row-value">${row.render(p)}</td>`).join("")}
    </tr>`).join("");

  // Single comparison table at every breakpoint: .cx-scroll makes it
  // horizontally scrollable on narrow viewports while the sticky
  // .compare-row-label column (see products.css) keeps row labels in view.
  // The inline min-width gives each product column room (~220px) so 2-3
  // products scroll cleanly on a phone instead of being crushed flat.
  const minTableWidth = 150 + products.length * 220;

  content.innerHTML = `
    <div class="cx-scrollhint" id="cxScrollHint" hidden>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
      Swipe to compare all ${products.length} products
    </div>
    <div class="compare-page-table-wrap cx-scroll">
      <table class="compare-table" style="min-width:${minTableWidth}px">
        <colgroup>
          <col class="compare-label-col">
          ${products.map(() => "<col>").join("")}
        </colgroup>
        <thead>
          <tr>
            <td class="compare-row-label compare-corner">Product</td>
            ${headerCols}
          </tr>
        </thead>
        <tbody>
          ${specRows}
        </tbody>
      </table>
    </div>
    <p class="compare-disclaimer">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      Product information is provided for general guidance only. Contact Yee Lim for full technical details.
    </p>`;

  // Measure after layout so the swipe hint only appears when columns overflow.
  requestAnimationFrame(updateCompareScrollHint);
}

// Show the swipe hint only when the product columns actually overflow the
// viewport (2-3 products at phone widths). Fades out once the user reaches
// the end of the scroll so it does not nag.
function updateCompareScrollHint() {
  const sc   = document.querySelector(".cx-scroll");
  const hint = document.getElementById("cxScrollHint");
  if (!sc || !hint) return;
  hint.hidden = !(sc.scrollWidth > sc.clientWidth + 4);
  sc.onscroll = () => {
    const atEnd = sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 8;
    hint.style.opacity = atEnd ? "0" : "1";
  };
}

function clearAll() {
  clearCompare();
}
// showToast now lives in js/core/app.js (shared).
