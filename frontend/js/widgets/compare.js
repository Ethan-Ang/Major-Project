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

  const rawList = getCompareList();

  if (rawList.length === 0) {
    tray.classList.remove("visible");
    // Reset to the expanded (default) state so the drawer reappears in full
    // next time something is added, instead of staying slim-collapsed.
    tray.classList.remove("is-collapsed");
    const toggle = document.getElementById("compareTrayToggle");
    if (toggle) {
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Collapse comparison tray");
    }
    document.body.classList.remove("compare-open");
    if (typeof updateFilterScrollFade === "function") updateFilterScrollFade();
    return;
  }

  // Resolve stored ids to real products first. An id that no longer resolves
  // (e.g. the product was removed from the catalogue) must not be able to
  // sit invisible while still counting toward the (n/3) cap, so prune it
  // from storage and re-render from the clean list. Guarded by the length
  // comparison: after the write-back the lengths match, so this can only
  // fire once per stale batch, never loop.
  const products = rawList
    .map(id => PRODUCTS.find(p => String(p.id) === String(id)))
    .filter(Boolean);

  if (!PRODUCTS.length) {
    // The catalogue has not loaded yet: this fires on DOMContentLoaded,
    // before the async product fetch resolves, so every id would look
    // unresolvable right now. Do not mistake "not loaded yet" for "no
    // longer exists": bail without touching storage or the DOM. products.js
    // / product-detail.js call renderCompareTray() again once PRODUCTS is
    // populated, and that call does the real (and, if needed, pruning) render.
    return;
  }

  if (products.length !== rawList.length) {
    saveCompareList(products.map(p => String(p.id))); // dispatches compareUpdated, which re-renders with the clean list
    return;
  }

  const list = products; // resolved products only, from here on

  tray.classList.add("visible");
  const countEl = document.getElementById("compareTrayCount");
  if (countEl) countEl.textContent = `(${list.length}/${COMPARE_MAX})`;
  // Reserve space so the fixed tray never sits over the last products or the
  // bottom filter rows: expose its real height as a CSS var and flag the body.
  document.body.classList.add("compare-open");
  requestAnimationFrame(updateCompareTrayHeight);

  const slotHTML = list.map(p => {
    const name = ylEscapeHtml(p.name);
    const brandLabel = ylEscapeHtml(p.brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase());
    const hasImg = p.images && p.images.length > 0;
    const img = hasImg
      ? `<img src="${encodeURI(p.images[0])}" alt="" loading="lazy" onerror="ylImageFallback(this,'${brandLabel}')">`
      : `<span class="no-image-mark" aria-hidden="true">${brandLabel}</span>`;
    return `
      <div class="cmp-slot">
        <span class="cmp-slot-img">${img}</span>
        <span class="cmp-slot-name" title="${name}">${name}</span>
        <button class="cmp-slot-x" onclick="removeFromCompare('${p.id}')" aria-label="Remove ${name} from comparison">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`;
  }).join("");

  const addSlot = list.length < COMPARE_MAX ? `
    <button class="cmp-slot cmp-slot-add" onclick="ylCompareAddMore()" aria-label="Add a product to compare">
      <span class="cmp-slot-add-icon" aria-hidden="true">+</span>
      <span class="cmp-slot-add-text"><strong>Add a product</strong><small>Search or browse</small></span>
    </button>` : "";

  const slotsEl = document.getElementById("compareTraySlots");
  if (slotsEl) slotsEl.innerHTML = slotHTML + addSlot;

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

// Add-a-product slot: on the catalogue page focus the existing search,
// anywhere else go to the catalogue.
function ylCompareAddMore() {
  const search = document.getElementById("searchInput");
  if (search) { search.focus(); search.scrollIntoView({ block: "center", behavior: "smooth" }); return; }
  location.href = "/products#catalogue";
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

// Full-width drawer, open by default: the collapse chevron slims it down to
// just the head row (title + count) so it stays out of the way while
// browsing, without losing the selection. Re-measures so the reserved
// bottom space follows the tray's new height.
function toggleCompareTray() {
  const tray = document.getElementById("compareTray");
  if (!tray) return;
  const collapsed = tray.classList.toggle("is-collapsed");
  const toggle = document.getElementById("compareTrayToggle");
  if (toggle) {
    toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    toggle.setAttribute("aria-label", collapsed ? "Expand comparison tray" : "Collapse comparison tray");
  }
  requestAnimationFrame(updateCompareTrayHeight);
}

// ─── Mobile compare: edge tab + review sheet (dormant, scheduled for
// deletion) ───────────────────────────────────────────────────────
// This block predates the unified bottom drawer (.compare-tray), which now
// covers every breakpoint per the locked mobile redesign, including the
// mobile mockup this block used to implement. renderCompareMobile() below
// is a no-op, so nothing here is ever invoked: ensureMobileCompareUI never
// runs, the tab and sheet elements are never created, and openCompareSheet
// / closeCompareSheet are unreachable. Left in place only so a later
// cleanup task can remove it outright, not because it still does anything.
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
  // Superseded: the compare drawer (.compare-tray) is now a responsive
  // full-width bar at every breakpoint per the locked redesign, so the
  // separate edge-tab + slide-up sheet is retired. Kept as a no-op (rather
  // than deleted) since products.js / product-detail.js still call it
  // defensively on load and on every compareUpdated event.
  return;
  // eslint-disable-next-line no-unreachable
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
