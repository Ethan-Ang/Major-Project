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
            aria-label="Remove ${name} from comparison">&times;</button>
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

// ─── Init ───────────────────────────────────────────────────────
window.addEventListener("compareUpdated", renderCompareTray);
window.addEventListener("DOMContentLoaded", renderCompareTray);
