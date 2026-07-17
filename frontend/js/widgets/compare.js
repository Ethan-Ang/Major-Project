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

// Keep the reserved tray height in sync when the tray wraps at narrow widths.
window.addEventListener("resize", () => {
  if (!document.body.classList.contains("compare-open")) return;
  updateCompareTrayHeight();
});

// ─── Init ───────────────────────────────────────────────────────
// The compareUpdated listener persists for the app's lifetime; the initial and
// per-swap render is driven by ylReady (runs on load and on every Swup swap).
window.addEventListener("compareUpdated", renderCompareTray);
ylReady(renderCompareTray);
