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

document.addEventListener("DOMContentLoaded", async () => {
  renderCompareSkeleton();
  try {
    await loadProductsFromBackend();
  } catch (err) {
    console.error(err);
  }
  renderComparePage();
});
window.addEventListener("compareUpdated", renderComparePage);

function renderComparePage() {
  const list     = getCompareList();
  const products = list.map(id => PRODUCTS.find(p => String(p.id) === String(id))).filter(Boolean);
  const content  = document.getElementById("comparePageContent");
  if (!content) return;

  if (products.length < 2) {
    content.innerHTML = `
      <div class="empty-state">
        <h3>Add at least 2 products to compare</h3>
        <p>Browse the catalogue and click <strong>+ Compare</strong> on the cards you want to compare side by side.</p>
        <a href="/products" class="btn btn-primary" style="display:inline-flex;margin-top:1.25rem">Browse Products</a>
      </div>`;
    return;
  }

  const headerCols = products.map(p => {
    const availClass  = p.status === "Available" ? "available" : "unavailable";
    const brandLabel  = ylEscapeHtml(p.brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase());
    const placeholderSub = ylEscapeHtml((p.category && p.category !== "Others") ? p.category : "Adhesive Solution");
    const hasRealImage = p.images && p.images.length > 0;
    const imgContent = hasRealImage
      ? `<img src="${encodeURI(p.images[0])}" alt="${ylEscapeHtml(p.name)}" loading="lazy" onerror="ylImageFallback(this,'${brandLabel}')">`
      : `<span class="compare-img-placeholder">${brandLabel}</span><span class="compare-img-placeholder-sub">${placeholderSub}</span>`;
    return `
      <td class="compare-col-header">
        <div class="compare-product-img">
          ${imgContent}
        </div>
        <a class="compare-product-name" href="/product-detail?id=${encodeURIComponent(p.id)}">${ylEscapeHtml(p.name)}</a>
        <div class="compare-product-brand">${ylEscapeHtml(brandDisplay(p.brand))}</div>
        <div class="compare-col-avail ${availClass}">
          <span class="avail-dot"></span>${ylEscapeHtml(p.status)}
        </div>
        <button class="btn-add-enquiry" onclick="addToBasket('${p.id}')">Select Product</button>
        <button class="compare-col-remove" onclick="removeFromCompare('${p.id}')">Remove</button>
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
  const n    = products.length;
  const cols = `90px repeat(${n}, minmax(148px, 1fr))`;

  // Header row: corner + one product card per column
  let cells = `<div class="cx-corner"></div>`;
  cells += products.map(p => {
    const availClass = p.status === "Available" ? "available" : "unavailable";
    const brandLabel = ylEscapeHtml(p.brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase());
    const hasImg     = p.images && p.images.length > 0;
    const img        = hasImg
      ? `<img src="${encodeURI(p.images[0])}" alt="" loading="lazy" onerror="ylImageFallback(this,'${brandLabel}')">`
      : brandLabel;
    return `
      <div class="cx-head">
        <div class="cx-head-img">${img}</div>
        <a class="cx-head-name" href="/product-detail?id=${encodeURIComponent(p.id)}">${ylEscapeHtml(p.name)}</a>
        <span class="cx-head-avail ${availClass}"><span class="avail-dot"></span>${ylEscapeHtml(p.status)}</span>
        <button class="cx-head-select" onclick="addToBasket('${p.id}')">Select</button>
        <button class="cx-head-rm" onclick="removeFromCompare('${p.id}')">Remove</button>
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
      <div class="cx-difftoggle">
        <span class="cx-difflabel">Highlight differences</span>
        <button class="cx-switch" id="cxSwitch" role="switch" aria-checked="false"
          aria-label="Highlight differences between products" onclick="toggleDiff()">
          <span class="cx-knob"></span>
        </button>
      </div>
      <div class="cx-scroll">
        <div class="cx-grid" id="cxGrid" style="grid-template-columns:${cols}">
          ${cells}
        </div>
      </div>
      ${addSlot}
    </div>`;
}

function toggleDiff() {
  const grid = document.getElementById("cxGrid");
  const sw   = document.getElementById("cxSwitch");
  if (!grid || !sw) return;
  const on = grid.classList.toggle("diffon");
  sw.classList.toggle("on", on);
  sw.setAttribute("aria-checked", on ? "true" : "false");
}

function addToBasket(productId) {
  const basket = JSON.parse(localStorage.getItem("enquiryBasket") || "[]");
  if (!basket.includes(productId)) {
    basket.push(productId);
    localStorage.setItem("enquiryBasket", JSON.stringify(basket));
    window.dispatchEvent(new Event("basketUpdated"));
  }
  showToast("Added to your product enquiry");
}

function clearAll() {
  clearCompare();
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}
