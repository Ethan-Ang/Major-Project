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

// ─── Init ───────────────────────────────────────────────────────
window.addEventListener("compareUpdated", renderCompareTray);
window.addEventListener("DOMContentLoaded", renderCompareTray);
