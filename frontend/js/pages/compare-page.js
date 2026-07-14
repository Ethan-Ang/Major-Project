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

function updateClearAllButton(hasItems) {
  const btn = document.querySelector(".compare-page-clear");
  if (!btn) return;
  btn.disabled = !hasItems;
  btn.style.visibility = hasItems ? "visible" : "hidden";
}

// The "Highlight differences" toggle lives in the header (beside Clear all). It
// only applies when a comparison is on screen, so hide it below 2 products; and
// since each render rebuilds the table/grid un-highlighted, reset it to off.
function updateDiffToggle(show) {
  const toggle = document.getElementById("cxDiffToggle");
  if (!toggle) return;
  toggle.hidden = !show;
  if (show) {
    toggle.querySelectorAll(".cx-switch").forEach(sw => {
      sw.classList.remove("on");
      sw.setAttribute("aria-checked", "false");
    });
  }
}

function renderComparePage() {
  const list     = getCompareList();
  const products = list.map(id => PRODUCTS.find(p => String(p.id) === String(id))).filter(Boolean);
  const content  = document.getElementById("comparePageContent");
  if (!content) return;

  updateClearAllButton(list.length > 0);
  updateDiffToggle(products.length >= 2);

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
    const brandLabel  = ylEscapeHtml(p.brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase());
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
          <button class="btn-add-enquiry${inBasket ? " added" : ""}" aria-pressed="${inBasket ? "true" : "false"}" onclick="addToBasket('${p.id}')">${inBasket ? "In Product Enquiry" : "Add to Product Enquiry"}</button>
        </div>
      </td>`;
  }).join("");

  // `cmp` is the same normalised value the mobile grid diffs on, so one row is
  // flagged cx-diff (and shaded when the toggle is on) only when products differ.
  const specRows = [
    { label: "Category",     render: p => ylEscapeHtml(p.category),                                                    cmp: p => p.category || "" },
    { label: "Industries",   render: p => p.industries.map(i => `<span class="compare-tag">${ylEscapeHtml(i)}</span>`).join(""), cmp: p => [...p.industries].sort().join("|") },
    { label: "Surfaces",     render: p => p.surfaces.map(s => `<span class="compare-tag">${ylEscapeHtml(s)}</span>`).join(""),   cmp: p => [...p.surfaces].sort().join("|") },
    { label: "Key Features", render: p => p.features.map(f => `<div class="compare-feature">${ylEscapeHtml(f)}</div>`).join(""), cmp: p => [...p.features].sort().join("|") }
  ].map(row => {
    const values  = products.map(row.cmp);
    const allSame = values.every(v => v === values[0]);
    return `
    <tr class="${allSame ? "" : "cx-diff"}">
      <td class="compare-row-label">${row.label}</td>
      ${products.map(p => `<td class="compare-row-value">${row.render(p)}</td>`).join("")}
    </tr>`;
  }).join("");

  content.innerHTML = `
    <div class="compare-page-table-wrap">
      <table class="compare-table">
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
    </div>
    ${buildCompareMobile(products)}`;

  // Measure after layout so the swipe hint only appears when columns overflow.
  requestAnimationFrame(updateCompareScrollHint);

  // Portrait phones get a one-time nudge to rotate for the side-by-side view.
  maybeShowRotateNudge(products.length);
}

// One-time, dismissible "rotate your phone" overlay. Only on a portrait,
// coarse-pointer phone (≤640px) with 2+ products. Dismissal persists in
// localStorage; it also auto-hides the moment the device turns to landscape.
// The horizontal-scroll grid remains the fallback for anyone who ignores it.
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

// ─── Mobile column comparison (≤640px) ────────────────────────────
// A horizontally-scrollable grid: a sticky spec-label column on the left,
// one column per product. A "Highlight differences" switch shades the rows
// where products disagree. Hidden on desktop (the table above is shown
// instead). Rebuilt whenever renderComparePage runs (incl. compareUpdated).
function cxTags(arr) {
  if (!arr || !arr.length) return "&ndash;";
  return arr.map(x => `<span class="cx-celltag">${ylEscapeHtml(x)}</span>`).join("");
}

function cxFeatures(arr) {
  if (!arr || !arr.length) return "&ndash;";
  return arr.map(f => `<div class="cx-cellfeat">${ylEscapeHtml(f)}</div>`).join("");
}

function buildCompareMobile(products) {
  const n      = products.length;
  const cols   = `90px repeat(${n}, minmax(148px, 1fr))`;
  const basket = getEnquiryBasket();

  // Header row: corner + one product card per column
  let cells = `<div class="cx-corner"></div>`;
  cells += products.map(p => {
    const availClass = p.status === "Available" ? "available" : "unavailable";
    const brandLabel = ylEscapeHtml(p.brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase());
    const hasImg     = p.images && p.images.length > 0;
    const img        = hasImg
      ? `<img src="${encodeURI(p.images[0])}" alt="" loading="lazy" onerror="ylImageFallback(this,'${brandLabel}')">`
      : brandLabel;
    const inBasket = basket.includes(String(p.id));
    return `
      <div class="cx-head">
        <div class="cx-head-img">
          <button class="cx-head-rm" aria-label="Remove from comparison" onclick="removeFromCompare('${p.id}')">&times;</button>
          ${img}
        </div>
        <a class="cx-head-name" href="/product-detail?id=${encodeURIComponent(p.id)}">${ylEscapeHtml(p.name)}</a>
        <span class="cx-head-avail ${availClass}"><span class="avail-dot"></span>${ylEscapeHtml(p.status)}</span>
        <button class="cx-head-select${inBasket ? " added" : ""}" aria-pressed="${inBasket ? "true" : "false"}" onclick="addToBasket('${p.id}')">${inBasket ? "In Enquiry" : "Add to Enquiry"}</button>
      </div>`;
  }).join("");

  // Spec rows. `cmp` builds a normalised string used only for diff detection.
  const specs = [
    { label: "Category",     render: p => ylEscapeHtml(p.category) || "&ndash;", cmp: p => p.category || "" },
    { label: "Industries",   render: p => cxTags(p.industries),    cmp: p => [...p.industries].sort().join("|") },
    { label: "Surfaces",     render: p => cxTags(p.surfaces),      cmp: p => [...p.surfaces].sort().join("|") },
    { label: "Key Features", render: p => cxFeatures(p.features),  cmp: p => [...p.features].sort().join("|") }
  ];

  specs.forEach(s => {
    const values    = products.map(s.cmp);
    const allSame   = values.every(v => v === values[0]);
    const diffClass = allSame ? "" : " cx-diff";
    cells += `<div class="cx-rowlabel${diffClass}">${s.label}</div>`;
    cells += products.map(p => `<div class="cx-cell${diffClass}">${s.render(p)}</div>`).join("");
  });

  const addSlot = n < COMPARE_MAX
    ? `<button class="cx-add" onclick="location.href='/products'">+ Add another product</button>`
    : "";

  return `
    <div class="cx-wrap">
      <div class="cx-scrollhint" id="cxScrollHint" hidden>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
        Swipe to compare all ${n} products
      </div>
      <div class="cx-scroll">
        <div class="cx-grid" id="cxGrid" style="grid-template-columns:${cols}">
          ${cells}
        </div>
      </div>
      ${addSlot}
    </div>`;
}

// Show the swipe hint only when the product columns actually overflow the
// viewport (3+ products at phone widths). Fades out once the user reaches the
// end of the scroll so it does not nag.
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

// One switch state drives both views: toggles `diffon` on the desktop table AND
// the mobile grid, and syncs every .cx-switch (only one is visible at a time).
function toggleDiff() {
  const table  = document.querySelector(".compare-table");
  const grid   = document.getElementById("cxGrid");
  const anchor = table || grid;
  if (!anchor) return;
  const on = !anchor.classList.contains("diffon");
  if (table) table.classList.toggle("diffon", on);
  if (grid)  grid.classList.toggle("diffon", on);
  document.querySelectorAll(".cx-switch").forEach(sw => {
    sw.classList.toggle("on", on);
    sw.setAttribute("aria-checked", on ? "true" : "false");
  });
}

function addToBasket(productId) {
  const basket = getEnquiryBasket();
  const id     = String(productId);
  if (!basket.includes(id)) {
    basket.push(id);
    localStorage.setItem("enquiryBasket", JSON.stringify(basket));
    window.dispatchEvent(new Event("basketUpdated"));
    showToast("Added to your product enquiry");
  } else {
    showToast("Already in your product enquiry");
  }
}

function clearAll() {
  clearCompare();
}
// showToast now lives in js/core/app.js (shared).
