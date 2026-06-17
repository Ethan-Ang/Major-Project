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
  return getCompareList().map(String).includes(String(productId));
}

function addToCompare(productId) {
  const list = getCompareList().map(String);
  const id = String(productId);
  if (list.includes(id) || list.length >= COMPARE_MAX) return;
  list.push(id);
  saveCompareList(list);
}

function removeFromCompare(productId) {
  saveCompareList(getCompareList().map(String).filter(id => id !== String(productId)));
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
      const p    = PRODUCTS.find(p => String(p.id) === String(id));
      const name = p ? p.name : "Unknown product";
      const brandLabel = p ? p.brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase() : "YL";
      const hasImg = p && p.images && p.images.length > 0;
      const thumb = hasImg
        ? `<div class="compare-slot-thumb"><img src="${p.images[0]}" alt="" onerror="ylImageFallback(this,'${brandLabel}')"></div>`
        : `<div class="compare-slot-thumb no-image"><span class="no-image-mark" aria-hidden="true">${brandLabel}</span></div>`;
      slots.push(`
        <div class="compare-slot compare-slot-filled">
          ${thumb}
          <span class="compare-slot-name" title="${name}">${name}</span>
          <button class="compare-slot-remove"
            onclick="removeFromCompare('${id}')"
            aria-label="Remove ${name} from comparison">&times;</button>
        </div>`);
    } else {
      slots.push(`<div class="compare-slot compare-slot-empty">+ Add product</div>`);
    }
  }

  const slotsEl = document.getElementById("compareTraySlots");
  if (slotsEl) slotsEl.innerHTML = slots.join("");

  const btn = document.getElementById("compareBtn");
  if (btn) {
    const notEnough = list.length < 2;
    btn.disabled = notEnough;
    // Explain why the button is inactive instead of leaving a silent greyed button.
    const hint = notEnough ? "Select at least 2 products to compare" : "Open comparison view";
    btn.title = hint;
    btn.setAttribute("aria-label", hint);
  }
}

// ─── Mobile compare: edge tab + review sheet (≤640px) ───────────
// One implementation, injected once into <body>, shared by the products
// and product-detail pages. Replaces the bottom tray on phones (the tray
// is hidden by CSS at ≤640px). Skipped on compare.html itself.
function onComparePage() {
  return /compare\.html$/.test(location.pathname);
}

function ensureMobileCompareUI() {
  if (onComparePage() || document.getElementById("cmpTab")) return;

  const tab = document.createElement("button");
  tab.id = "cmpTab";
  tab.className = "cmp-tab";
  tab.type = "button";
  tab.setAttribute("aria-label", "Open product comparison");
  tab.onclick = openCompareSheet;
  tab.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="7" height="13" rx="1"/><rect x="14" y="4" width="7" height="16" rx="1"/></svg>'
    + '<span class="cmp-tab-count" id="cmpTabCount">0</span>';

  const modal = document.createElement("div");
  modal.id = "cmpModal";
  modal.className = "cmp-modal";
  modal.innerHTML =
    '<div class="cmp-modal-backdrop" onclick="closeCompareSheet()"></div>'
    + '<div class="cmp-sheet" role="dialog" aria-modal="true" aria-label="Product comparison">'
    +   '<div class="cmp-sheet-head">'
    +     '<h3 id="cmpSheetTitle">Compare</h3>'
    +     '<button class="cmp-sheet-x" onclick="closeCompareSheet()" aria-label="Close">&times;</button>'
    +   '</div>'
    +   '<div class="cmp-sheet-list" id="cmpSheetList"></div>'
    +   '<div class="cmp-sheet-foot">'
    +     '<button class="cmp-sheet-clear" onclick="clearCompare()">Clear all</button>'
    +     '<button class="cmp-sheet-go" id="cmpSheetGo" onclick="location.href=\'compare.html\'">Compare</button>'
    +   '</div>'
    + '</div>';

  document.body.appendChild(tab);
  document.body.appendChild(modal);
}

function openCompareSheet() {
  ensureMobileCompareUI();
  const m = document.getElementById("cmpModal");
  if (!m) return;
  m.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeCompareSheet() {
  const m = document.getElementById("cmpModal");
  if (!m) return;
  m.classList.remove("open");
  document.body.style.overflow = "";
}

function renderCompareMobile() {
  if (onComparePage()) return;
  ensureMobileCompareUI();

  const list  = getCompareList();
  const tab   = document.getElementById("cmpTab");
  const count = document.getElementById("cmpTabCount");
  if (!tab) return;

  if (list.length === 0) {
    tab.classList.remove("show");
    closeCompareSheet();
  } else {
    tab.classList.add("show");
    if (count) count.textContent = list.length;
  }

  // Sheet contents
  const title = document.getElementById("cmpSheetTitle");
  if (title) title.textContent = `Compare (${list.length}/${COMPARE_MAX})`;

  const listEl = document.getElementById("cmpSheetList");
  if (listEl) {
    listEl.innerHTML = list.map(id => {
      const p = PRODUCTS.find(pr => String(pr.id) === String(id));
      if (!p) return "";
      const brandLabel = p.brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase();
      const hasImg = p.images && p.images.length > 0;
      const thumb = hasImg
        ? `<img src="${p.images[0]}" alt="" onerror="ylImageFallback(this,'${brandLabel}')">`
        : brandLabel;
      return `
        <div class="cmp-sheet-item">
          <div class="cmp-sheet-thumb">${thumb}</div>
          <span class="cmp-sheet-name">${p.name}</span>
          <button class="cmp-sheet-rm" onclick="removeFromCompare('${p.id}')" aria-label="Remove ${p.name} from comparison">&times;</button>
        </div>`;
    }).join("");
  }

  const go = document.getElementById("cmpSheetGo");
  if (go) {
    const notEnough = list.length < 2;
    go.disabled    = notEnough;
    go.textContent = notEnough ? "Select 2 to compare" : "Compare products";
  }
}

// ─── Init ───────────────────────────────────────────────────────
window.addEventListener("compareUpdated", renderCompareTray);
window.addEventListener("DOMContentLoaded", renderCompareTray);
window.addEventListener("compareUpdated", renderCompareMobile);
window.addEventListener("DOMContentLoaded", renderCompareMobile);
