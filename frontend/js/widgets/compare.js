// Safety net: ylEscapeHtml is defined in data.js. If a stale cached data.js is
// served (its ?v= was not bumped after a change), fall back to a local escaper
// and warn, so compare UI still renders instead of throwing a ReferenceError.
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

// Screen-reader announcement for compare changes (visible feedback is the
// button/tray state). Falls back silently if app.js hasn't loaded.
function cmpAnnounce(productId, msg) {
  if (typeof window.announce !== "function") return;
  // PRODUCTS is a top-level `let` in data.js (not a window property), so the
  // bare identifier is the correct way to reach it from this classic script.
  const list = typeof PRODUCTS !== "undefined" ? PRODUCTS : [];
  const p = (list || []).find(x => String(x.id) === String(productId));
  window.announce(`${p ? p.name : "Product"} ${msg}`);
}

function addToCompare(productId) {
  const list = getCompareList().map(String);
  const id = String(productId);
  if (list.includes(id)) return;
  if (list.length >= COMPARE_MAX) {
    // Card buttons disable at the limit, but this path can still be reached
    // (e.g. stale UI after a swap) — never fail silently for AT users.
    if (typeof window.announce === "function")
      window.announce(`Compare is full (${COMPARE_MAX} products). Remove one to add another.`);
    return;
  }
  list.push(id);
  saveCompareList(list);
  cmpAnnounce(id, "added to compare.");
}

function removeFromCompare(productId) {
  saveCompareList(getCompareList().map(String).filter(id => id !== String(productId)));
  cmpAnnounce(productId, "removed from compare.");
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
    // Reset to the collapsed pill so it reappears unobtrusive next time.
    tray.classList.remove("expanded");
    const t = document.getElementById("compareTrayToggle");
    if (t) t.setAttribute("aria-expanded", "false");
    document.body.classList.remove("compare-open");
    if (typeof updateFilterScrollFade === "function") updateFilterScrollFade();
    return;
  }

  tray.classList.add("visible");
  // Keep the collapsed-pill count in step with the list.
  const countEl = document.getElementById("compareTrayCount");
  if (countEl) countEl.textContent = `(${list.length})`;
  // Reserve space so the fixed tray never sits over the last products or the
  // bottom filter rows: expose its real height as a CSS var and flag the body.
  document.body.classList.add("compare-open");
  requestAnimationFrame(updateCompareTrayHeight);

  const slots = [];
  for (let i = 0; i < COMPARE_MAX; i++) {
    const id = list[i];
    if (id !== undefined) {
      const p    = PRODUCTS.find(p => String(p.id) === String(id));
      const name = ylEscapeHtml(p ? p.name : "Unknown product");
      const brandLabel = ylEscapeHtml(p ? p.brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase() : "YL");
      const hasImg = p && p.images && p.images.length > 0;
      const thumb = hasImg
        ? `<div class="compare-slot-thumb"><img src="${encodeURI(p.images[0])}" alt="" loading="lazy" onerror="ylImageFallback(this,'${brandLabel}')"></div>`
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

// Measure the (collapsed or expanded) tray and reserve exactly its height so it
// never occludes the last products, the footer, or the bottom filter rows.
function updateCompareTrayHeight() {
  const tray = document.getElementById("compareTray");
  if (!tray || !tray.classList.contains("visible")) return;
  const h = tray.offsetHeight || 56;
  document.documentElement.style.setProperty("--compare-tray-height", h + "px");
  if (typeof updateFilterScrollFade === "function") updateFilterScrollFade();
}

// Canyon-style collapse: the tray sits as a small "Compare (N)" pill until the
// user expands it into the full comparison bar. Re-measures so the reserved
// bottom space follows the tray's new height.
function toggleCompareTray() {
  const tray = document.getElementById("compareTray");
  if (!tray) return;
  const expanded = tray.classList.toggle("expanded");
  const toggle = document.getElementById("compareTrayToggle");
  if (toggle) toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
  requestAnimationFrame(updateCompareTrayHeight);
}

// ─── Mobile compare: edge tab + review sheet (≤640px) ───────────
// One implementation, injected once into <body>, shared by the products
// and product-detail pages. Replaces the bottom tray on phones (the tray
// is hidden by CSS at ≤640px). Skipped on compare.html itself.
function onComparePage() {
  return location.pathname === '/compare' || /compare\.html$/.test(location.pathname);
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
    +     '<button class="cmp-sheet-go" id="cmpSheetGo" onclick="location.href=\'/compare\'">Compare</button>'
    +   '</div>'
    + '</div>';

  document.body.appendChild(tab);
  document.body.appendChild(modal);
}

let cmpSheetRelease = null;

function openCompareSheet() {
  ensureMobileCompareUI();
  // Re-render from current PRODUCTS before opening: the initial render can run
  // before the catalogue data has loaded (e.g. items persisted from a previous
  // visit), which would otherwise leave the sheet list empty.
  renderCompareMobile();
  const m = document.getElementById("cmpModal");
  if (!m) return;
  m.classList.add("open");
  document.body.style.overflow = "hidden";
  // Trap focus in the sheet, Escape closes, focus returns to the opener on close.
  const sheet = m.querySelector(".cmp-sheet");
  if (sheet && typeof ylFocusTrap === "function") {
    cmpSheetRelease = ylFocusTrap(sheet, { onEscape: closeCompareSheet });
  }
}

function closeCompareSheet() {
  const m = document.getElementById("cmpModal");
  if (!m) return;
  m.classList.remove("open");
  document.body.style.overflow = "";
  if (cmpSheetRelease) { cmpSheetRelease(); cmpSheetRelease = null; }
}

function renderCompareMobile() {
  if (onComparePage()) return;
  // The mobile compare tab shadows the desktop bottom tray, so only surface it
  // on pages that actually have the tray (products / product-detail). On other
  // pages (enquiry, contact) hide any tab left over from a previous page view.
  if (!document.getElementById("compareTray")) {
    const leftover = document.getElementById("cmpTab");
    if (leftover) leftover.classList.remove("show");
    closeCompareSheet();
    return;
  }
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
      const brandLabel = ylEscapeHtml(p.brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase());
      const safeName = ylEscapeHtml(p.name);
      const hasImg = p.images && p.images.length > 0;
      const thumb = hasImg
        ? `<img src="${encodeURI(p.images[0])}" alt="" loading="lazy" onerror="ylImageFallback(this,'${brandLabel}')">`
        : brandLabel;
      return `
        <div class="cmp-sheet-item">
          <div class="cmp-sheet-thumb">${thumb}</div>
          <span class="cmp-sheet-name">${safeName}</span>
          <button class="cmp-sheet-rm" onclick="removeFromCompare('${p.id}')" aria-label="Remove ${safeName} from comparison">&times;</button>
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

// Keep the reserved tray height in sync when the tray wraps at narrow widths.
window.addEventListener("resize", () => {
  if (!document.body.classList.contains("compare-open")) return;
  updateCompareTrayHeight();
});

// ─── Init ───────────────────────────────────────────────────────
// The compareUpdated listeners persist for the app's lifetime; the initial and
// per-swap render is driven by ylReady (runs on load and on every Swup swap).
window.addEventListener("compareUpdated", renderCompareTray);
window.addEventListener("compareUpdated", renderCompareMobile);
ylReady(renderCompareTray);
ylReady(renderCompareMobile);
