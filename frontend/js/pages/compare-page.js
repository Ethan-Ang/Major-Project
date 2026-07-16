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
    window.addEventListener("basketUpdated", renderComparePage);
    window.addEventListener("resize", updateCompareScrollHint);
  });
}
ylReady(initComparePage);

// Local basket helpers (compare-page.js does not load js/pages/products.js,
// so it cannot rely on that file's getBasket()/toggleBasket()).
function getEnquiryBasket() {
  return JSON.parse(localStorage.getItem("enquiryBasket") || "[]");
}

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
        </span>
        <button class="csel-x" onclick="toggleCompare('${p.id}')" aria-label="Remove ${ylEscapeHtml(p.name)} from comparison">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`;
  }).join("");

  const addSlot = products.length < COMPARE_MAX
    ? `<a class="csel-card csel-add" href="/products#catalogue"><span class="csel-add-icon" aria-hidden="true">+</span><span class="csel-add-text"><strong>Add a product</strong><small>Search or browse</small></span></a>`
    : "";

  el.innerHTML = `
    <div class="csel-head">Products to compare (${products.length}/3)</div>
    <div class="csel-row">${cards}${addSlot}</div>
    <div class="csel-actions">
      <button class="compare-page-clear" onclick="clearAll()">Clear all</button>
      <a class="btn btn-primary csel-compare" href="#comparePageContent">Compare now</a>
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

  const basket = getEnquiryBasket();

  const headerCols = products.map(p => {
    const availClass  = p.status === "Available" ? "available" : "unavailable";
    const brandLabel  = cxBrandLabel(p.brand);
    const placeholderSub = ylEscapeHtml((p.category && p.category !== "Others") ? p.category : "Adhesive Solution");
    const hasRealImage = p.images && p.images.length > 0;
    const imgContent = hasRealImage
      ? `<img src="${encodeURI(p.images[0])}" alt="${ylEscapeHtml(p.name)}" loading="lazy" onerror="ylImageFallback(this,'${brandLabel}')">`
      : `<span class="compare-img-placeholder">${brandLabel}</span><span class="compare-img-placeholder-sub">${placeholderSub}</span>`;
    const inBasket = basket.includes(String(p.id));
    return `
      <td class="compare-col-header">
        <div class="compare-col-inner">
          <div class="compare-product-img">
            <button class="compare-col-remove" aria-label="Remove from comparison" onclick="removeFromCompare('${p.id}')">&times;</button>
            ${imgContent}
          </div>
          <a class="compare-product-name" href="/product-detail?id=${encodeURIComponent(p.id)}">${ylEscapeHtml(p.name)}</a>
          <div class="compare-product-brand">${ylEscapeHtml(brandDisplay(p.brand))}</div>
          <div class="compare-col-avail ${availClass}">
            <span class="avail-dot"></span>${ylEscapeHtml(p.status)}
          </div>
          <button class="btn-add-enquiry${inBasket ? " added" : ""}" aria-pressed="${inBasket ? "true" : "false"}" onclick="addToBasket('${p.id}', '${ylTxt(p.name)}')">${inBasket ? "In Product Enquiry" : "Add to Product Enquiry"}</button>
        </div>
      </td>`;
  }).join("");

  const specRows = [
    { label: "Category",     render: p => ylEscapeHtml(p.category) },
    { label: "Industries",   render: p => p.industries.map(i => `<span class="compare-tag">${ylEscapeHtml(i)}</span>`).join("") },
    { label: "Surfaces",     render: p => p.surfaces.map(s => `<span class="compare-tag">${ylEscapeHtml(s)}</span>`).join("") },
    { label: "Key Features", render: p => p.features.map(f => `<div class="compare-feature">${ylEscapeHtml(f)}</div>`).join("") }
  ].map(row => `
    <tr>
      <td class="compare-row-label">${row.label}</td>
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
            <td class="compare-row-label">Product</td>
            ${headerCols}
          </tr>
        </thead>
        <tbody>
          ${specRows}
        </tbody>
      </table>
    </div>`;

  // Measure after layout so the swipe hint only appears when columns overflow.
  requestAnimationFrame(updateCompareScrollHint);

  // Portrait phones get a one-time nudge to rotate for the side-by-side view.
  maybeShowRotateNudge(products.length);
}

// One-time, dismissible "rotate your phone" overlay. Only on a portrait,
// coarse-pointer phone (≤640px) with 2+ products. Dismissal persists in
// localStorage; it also auto-hides the moment the device turns to landscape.
// The horizontal-scroll table remains the fallback for anyone who ignores it.
let rotateNudgeShown = false;
function maybeShowRotateNudge(count) {
  if (rotateNudgeShown || count < 2) return;
  if (localStorage.getItem("ylCompareRotateDismissed")) return;

  const coarse   = window.matchMedia("(pointer: coarse)").matches;
  const portrait = window.matchMedia("(orientation: portrait)").matches;
  if (!coarse || !portrait || window.innerWidth > 640) return;
  if (document.getElementById("cxRotateOverlay")) return;
  rotateNudgeShown = true;

  const overlay = document.createElement("div");
  overlay.className = "cx-rotate-overlay";
  overlay.id = "cxRotateOverlay";
  overlay.innerHTML = `
    <div class="cx-rotate-card" role="dialog" aria-modal="true" aria-labelledby="cxRotateTitle">
      <span class="cx-rotate-icon" aria-hidden="true">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="10" height="20" rx="2"/><path d="M14 8l3-3 3 3"/><path d="M17 5v6a9 9 0 0 1-9 9"/></svg>
      </span>
      <h3 class="cx-rotate-title" id="cxRotateTitle">Rotate for the best view</h3>
      <p class="cx-rotate-text">Turn your phone sideways to compare all products side by side in one glance.</p>
      <button type="button" class="cx-rotate-dismiss">I&rsquo;ve rotated, continue</button>
      <button type="button" class="cx-rotate-stay">Stay in portrait &amp; scroll instead</button>
    </div>`;
  document.body.appendChild(overlay);

  const landscapeMq = window.matchMedia("(orientation: landscape)");
  const onRotate = (e) => { if (e.matches) close(false); };
  const close = (persist) => {
    if (persist) localStorage.setItem("ylCompareRotateDismissed", "1");
    landscapeMq.removeEventListener("change", onRotate);
    overlay.remove();
  };
  // Both buttons dismiss and remember the choice; portrait scroll is the
  // fallback, never blocked. Auto-dismiss (no persist) when turned to landscape.
  overlay.querySelector(".cx-rotate-dismiss").addEventListener("click", () => close(true));
  overlay.querySelector(".cx-rotate-stay").addEventListener("click", () => close(true));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(true); });
  landscapeMq.addEventListener("change", onRotate);
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

function addToBasket(productId, productName) {
  const basket = getEnquiryBasket();
  const id     = String(productId);
  const name   = (productName && String(productName).trim()) ? String(productName).trim() : "Product";
  if (!basket.includes(id)) {
    basket.push(id);
    try {
      localStorage.setItem("enquiryBasket", JSON.stringify(basket));
    } catch (e) {
      // Real failure to persist: show a visible error, do not flip the button.
      (window.showToast || function () {})("Sorry, we couldn't update your enquiry. Please try again.", "error");
      return;
    }
    window.dispatchEvent(new Event("basketUpdated"));
    // No visible success toast — the button flips to "In Enquiry"; announce for SR.
    (window.announce || function () {})(name + " was added to your product enquiry.");
  } else {
    // Already present: no duplicate, no visible toast; quietly confirm for SR.
    (window.announce || function () {})(name + " is already in your product enquiry.");
  }
}

function clearAll() {
  clearCompare();
}
// showToast now lives in js/core/app.js (shared).
