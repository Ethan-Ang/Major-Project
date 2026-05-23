// ─── Compare state ──────────────────────────────────────────────
const COMPARE_KEY  = "compareList";
const COMPARE_MAX  = 3;

function getCompareList() {
  return JSON.parse(localStorage.getItem(COMPARE_KEY) || "[]");
}

function saveCompareList(list) {
  localStorage.setItem(COMPARE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("compareUpdated"));
}

function isInCompare(productId) {
  return getCompareList().includes(productId);
}

function addToCompare(productId) {
  const list = getCompareList();
  if (list.includes(productId) || list.length >= COMPARE_MAX) return;
  list.push(productId);
  saveCompareList(list);
}

function removeFromCompare(productId) {
  saveCompareList(getCompareList().filter(id => id !== productId));
}

function clearCompare() {
  saveCompareList([]);
}

function toggleCompare(productId) {
  if (isInCompare(productId)) {
    removeFromCompare(productId);
  } else {
    addToCompare(productId);
  }
}

// ─── Tray ───────────────────────────────────────────────────────
function renderCompareTray() {
  const tray = document.getElementById("compareTray");
  if (!tray) return;

  const list = getCompareList();

  if (list.length === 0) {
    tray.classList.remove("visible");
    return;
  }

  tray.classList.add("visible");

  const slots = [];
  for (let i = 0; i < COMPARE_MAX; i++) {
    const id = list[i];
    if (id !== undefined) {
      const p    = PRODUCTS.find(p => p.id === id);
      const name = p ? p.name : "Unknown product";
      slots.push(`
        <div class="compare-slot compare-slot-filled">
          <div class="compare-slot-thumb" aria-hidden="true"></div>
          <span class="compare-slot-name" title="${name}">${name}</span>
          <button class="compare-slot-remove"
            onclick="removeFromCompare(${id})"
            aria-label="Remove ${name} from comparison">&#215;</button>
        </div>`);
    } else {
      slots.push(`<div class="compare-slot compare-slot-empty">+ Add product</div>`);
    }
  }

  const slotsEl = document.getElementById("compareTraySlots");
  if (slotsEl) slotsEl.innerHTML = slots.join("");

  const btn = document.getElementById("compareBtn");
  if (btn) btn.disabled = list.length < 2;
}

// ─── Overlay ────────────────────────────────────────────────────
let _backdropListener = null;
let _escapeListener   = null;

function openComparisonOverlay() {
  const list     = getCompareList();
  const products = list.map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean);
  if (products.length < 2) return;

  const headerCols = products.map(p => {
    const availClass   = p.status === "Available" ? "available" : "unavailable";
    const imgContent   = p.imageUrl
      ? `<img src="${p.imageUrl}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'">`
      : "";
    return `
      <td class="compare-col-header">
        <div class="compare-product-img">${imgContent}</div>
        <div class="compare-product-name">${p.name}</div>
        <div class="compare-product-brand">${p.brand}</div>
        <div class="compare-col-avail ${availClass}">
          <span class="avail-dot"></span>${p.status}
        </div>
        <button class="compare-col-remove"
          onclick="removeFromCompare(${p.id})">Remove ×</button>
      </td>`;
  }).join("");

  const specRows = [
    { label: "Category",     render: p => p.category },
    { label: "Industries",   render: p => p.industries.map(i => `<span class="compare-tag">${i}</span>`).join("") },
    { label: "Surfaces",     render: p => p.surfaces.map(s => `<span class="compare-tag">${s}</span>`).join("") },
    { label: "Key Features", render: p => p.features.map(f => `<div class="compare-feature">${f}</div>`).join("") }
  ].map(row => `
    <tr>
      <td class="compare-row-label">${row.label}</td>
      ${products.map(p => `<td class="compare-row-value">${row.render(p)}</td>`).join("")}
    </tr>`).join("");

  const actionRow = `
    <tr>
      <td class="compare-row-label"></td>
      ${products.map(p => `
        <td class="compare-row-value">
          <button class="btn-add-enquiry"
            onclick="addToBasketFromCompare(${p.id})">
            Add to Enquiry Basket
          </button>
        </td>`).join("")}
    </tr>`;

  const overlay = document.getElementById("compareOverlay");
  if (!overlay) return;

  overlay.innerHTML = `
    <div class="compare-overlay-inner">
      <div class="compare-overlay-header">
        <h2>Compare Products</h2>
        <button class="compare-overlay-close"
          onclick="closeComparisonOverlay()"
          aria-label="Close comparison">×</button>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <colgroup>
            <col class="compare-label-col">
            ${products.map(() => "<col>").join("")}
          </colgroup>
          <thead>
            <tr>
              <td class="compare-row-label"></td>
              ${headerCols}
            </tr>
          </thead>
          <tbody>
            ${specRows}
            ${actionRow}
          </tbody>
        </table>
      </div>
    </div>`;

  // Clean up any previous listeners before (re-)attaching
  if (_backdropListener) { overlay.removeEventListener("click", _backdropListener); _backdropListener = null; }
  if (_escapeListener)   { document.removeEventListener("keydown", _escapeListener); _escapeListener = null; }

  overlay.classList.add("open");
  document.body.style.overflow = "hidden";

  _backdropListener = e => { if (e.target === overlay) closeComparisonOverlay(); };
  _escapeListener   = e => { if (e.key === "Escape") closeComparisonOverlay(); };
  overlay.addEventListener("click", _backdropListener);
  document.addEventListener("keydown", _escapeListener);
}

function closeComparisonOverlay() {
  const overlay = document.getElementById("compareOverlay");
  if (overlay) overlay.classList.remove("open");
  document.body.style.overflow = "";

  if (_backdropListener) {
    overlay && overlay.removeEventListener("click", _backdropListener);
    _backdropListener = null;
  }
  if (_escapeListener) {
    document.removeEventListener("keydown", _escapeListener);
    _escapeListener = null;
  }
}

function addToBasketFromCompare(productId) {
  const basket = JSON.parse(localStorage.getItem("enquiryBasket") || "[]");
  if (!basket.includes(productId)) {
    basket.push(productId);
    localStorage.setItem("enquiryBasket", JSON.stringify(basket));
    window.dispatchEvent(new Event("basketUpdated"));
  }
  closeComparisonOverlay();
}

// ─── Init ───────────────────────────────────────────────────────
window.addEventListener("compareUpdated", () => {
  renderCompareTray();
  const overlay = document.getElementById("compareOverlay");
  if (overlay && overlay.classList.contains("open")) {
    const list = getCompareList();
    if (list.length < 2) {
      closeComparisonOverlay();
    } else {
      openComparisonOverlay();
    }
  }
});
window.addEventListener("DOMContentLoaded", renderCompareTray);
