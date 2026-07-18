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
// Collapsed-first model (Canyon-style interaction hierarchy): with products
// selected, only a small centred bottom trigger shows — icon, "Compare (N)",
// chevron. The full slots/actions panel reveals only after a deliberate
// expand, and collapses back to the quiet trigger.
function renderCompareTray() {
  const tray = document.getElementById("compareTray");
  if (!tray) return;

  const rawList = getCompareList();

  if (rawList.length === 0) {
    tray.classList.remove("visible");
    // Reset to the collapsed (default) state so the tray reappears as the
    // quiet trigger next time something is added.
    tray.classList.remove("is-expanded");
    const toggle = document.getElementById("compareTrayToggle");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("compare-open");
    // Tear down an open mobile sheet (e.g. Clear all emptied the list while the
    // sheet was showing) so no backdrop/scroll-lock is left behind.
    ylCloseCompareSheet();
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
  // Trigger shows the simple count; the expanded head shows the (n/3) cap.
  const countEl = document.getElementById("compareTrayCount");
  if (countEl) countEl.textContent = `(${list.length})`;
  const fullEl = document.getElementById("compareTrayFull");
  if (fullEl) fullEl.textContent = `(${list.length}/${COMPARE_MAX})`;
  // Reserve space so the fixed tray never sits over the last products or the
  // bottom filter rows: expose its real height as a CSS var and flag the body.
  document.body.classList.add("compare-open");
  ylEnsureSheetCloseBtn();
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

// Add-a-product slot: opens the dedicated compare picker (side panel with
// search + Recently viewed / All products). Falls back to the catalogue if
// the picker cannot be built for any reason.
function ylCompareAddMore() {
  if (typeof openComparePicker === "function") { openComparePicker(); return; }
  location.href = "/products#catalogue";
}

// Measure the (collapsed or expanded) tray and reserve exactly its height so it
// never occludes the last products, the footer, or the bottom filter rows.
function updateCompareTrayHeight() {
  const tray = document.getElementById("compareTray");
  if (!tray || !tray.classList.contains("visible")) return;
  // Mobile (<=640px): the collapsed side tab floats on the left edge and the
  // expanded sheet is a modal over a backdrop — neither reserves bottom page
  // space, so the footer/filters keep their natural height.
  if (window.matchMedia("(max-width: 640px)").matches) {
    document.documentElement.style.setProperty("--compare-tray-height", "0px");
    if (typeof updateFilterScrollFade === "function") updateFilterScrollFade();
    return;
  }
  const h = tray.offsetHeight || 56;
  document.documentElement.style.setProperty("--compare-tray-height", h + "px");
  if (typeof updateFilterScrollFade === "function") updateFilterScrollFade();
}

// Collapsed by default. Desktop: the centred trigger expands the slots/actions
// drawer in place. Mobile (<=640px): the collapsed side tab opens a bottom SHEET
// with a dimmed backdrop, focus trap and scroll lock (Canyon-inspired). Esc /
// backdrop / close-button all collapse it. Re-measures so any reserved space
// follows the tray's new state.
function toggleCompareTray() {
  const tray = document.getElementById("compareTray");
  if (!tray) return;
  const willExpand = !tray.classList.contains("is-expanded");
  tray.classList.toggle("is-expanded", willExpand);
  const toggle = document.getElementById("compareTrayToggle");
  if (toggle) toggle.setAttribute("aria-expanded", willExpand ? "true" : "false");

  if (window.matchMedia("(max-width: 640px)").matches) {
    if (willExpand) ylOpenCompareSheet(); else ylCloseCompareSheet();
  }
  requestAnimationFrame(updateCompareTrayHeight);
}

// Inject the mobile sheet's close control into the panel once. Hidden by CSS on
// desktop and while collapsed; shown only in the mobile expanded sheet. Done in
// JS so it exists on every page that carries the tray without editing each page
// (incl. the protected Home markup).
function ylEnsureSheetCloseBtn() {
  const inner = document.querySelector("#compareTrayPanel .compare-tray-inner");
  if (!inner || inner.querySelector(".cmp-sheet-close")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cmp-sheet-close";
  btn.setAttribute("aria-label", "Close comparison");
  btn.onclick = toggleCompareTray;
  btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  inner.insertBefore(btn, inner.firstChild);
}

// Mobile bottom-sheet open: dim backdrop (tap to close), page scroll lock, and a
// focus trap inside the panel. Idempotent.
let _cmpSheetRelease = null;
function ylOpenCompareSheet() {
  if (document.getElementById("cmpSheetBackdrop")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "cmp-sheet-backdrop";
  backdrop.id = "cmpSheetBackdrop";
  backdrop.addEventListener("click", () => toggleCompareTray());
  document.body.appendChild(backdrop);
  document.body.classList.add("cmp-sheet-open");
  document.body.style.overflow = "hidden";
  const panel = document.getElementById("compareTrayPanel");
  if (typeof ylFocusTrap === "function" && panel) {
    // No onEscape here: the lifetime Esc listener below already collapses the
    // tray, so passing one would double-toggle.
    _cmpSheetRelease = ylFocusTrap(panel, {});
  }
}

// Tear the sheet down and return focus to the (now visible again) side tab.
function ylCloseCompareSheet() {
  const backdrop = document.getElementById("cmpSheetBackdrop");
  if (backdrop) backdrop.remove();
  const wasOpen = document.body.classList.contains("cmp-sheet-open");
  document.body.classList.remove("cmp-sheet-open");
  document.body.style.overflow = "";
  if (_cmpSheetRelease) { _cmpSheetRelease(false); _cmpSheetRelease = null; }
  if (wasOpen) {
    const toggle = document.getElementById("compareTrayToggle");
    if (toggle && toggle.offsetParent !== null) toggle.focus();
  }
}

// If the viewport crosses from a mobile expanded sheet up to desktop, drop the
// modal scaffolding so the desktop drawer behaves normally.
window.addEventListener("resize", () => {
  if (document.body.classList.contains("cmp-sheet-open") &&
      !window.matchMedia("(max-width: 640px)").matches) {
    ylCloseCompareSheet();
  }
});

if (typeof ylOnce === "function") {
  ylOnce("compareTray:esc", () => {
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const tray = document.getElementById("compareTray");
      if (!tray || !tray.classList.contains("is-expanded")) return;
      if (!tray.contains(document.activeElement)) return;
      toggleCompareTray();
      const toggle = document.getElementById("compareTrayToggle");
      if (toggle) toggle.focus();
    });
  });
}

// Keep the reserved tray height in sync when the tray wraps at narrow widths.
window.addEventListener("resize", () => {
  if (!document.body.classList.contains("compare-open")) return;
  updateCompareTrayHeight();
});

// ─── Compare picker (dedicated add-product flow) ─────────────────
// Slide-in side panel (Canyon-inspired interaction, Yee Lim visual language):
// segmented Recently viewed / All products, live search, direct add into the
// compare slots. Built lazily on first open, torn down fully on close.
// Recently-viewed ids are written by product-detail.js (ylPushRecentlyViewed).
const YL_RECENT_KEY = "recentlyViewed";

function ylGetRecentlyViewed() {
  try { return JSON.parse(localStorage.getItem(YL_RECENT_KEY) || "[]").map(String); }
  catch (e) { return []; }
}

function ylPushRecentlyViewed(productId) {
  const id = String(productId);
  const list = ylGetRecentlyViewed().filter(x => x !== id);
  list.unshift(id);
  try { localStorage.setItem(YL_RECENT_KEY, JSON.stringify(list.slice(0, 8))); } catch (e) {}
}

let _pickerState = null; // { tab, query, release }

function openComparePicker() {
  if (document.getElementById("ylCmpPicker")) return; // already open

  const recents = ylGetRecentlyViewed();
  _pickerState = { tab: recents.length ? "recent" : "all", query: "" };

  const backdrop = document.createElement("div");
  backdrop.className = "cmp-picker-backdrop";
  backdrop.id = "ylCmpPickerBackdrop";

  const panel = document.createElement("aside");
  panel.className = "cmp-picker";
  panel.id = "ylCmpPicker";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "ylCmpPickerTitle");
  panel.innerHTML = `
    <div class="cmp-picker-head">
      <div>
        <span class="cmp-picker-eyebrow">Compare Products</span>
        <h2 class="cmp-picker-title" id="ylCmpPickerTitle">Add a product to compare</h2>
        <span class="cmp-picker-count" id="ylCmpPickerCount"></span>
      </div>
      <button class="cmp-picker-x" type="button" onclick="closeComparePicker()" aria-label="Close product picker">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="cmp-picker-tools">
      <div class="cmp-picker-tabs" role="tablist" aria-label="Product source">
        <button class="cmp-picker-tab" id="ylCmpTabRecent" role="tab" type="button" onclick="ylCmpPickerTab('recent')">Recently viewed</button>
        <button class="cmp-picker-tab" id="ylCmpTabAll" role="tab" type="button" onclick="ylCmpPickerTab('all')">All products</button>
      </div>
      <div class="cmp-picker-search">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <label class="sr-only" for="ylCmpPickerSearch">Search products to compare</label>
        <input type="text" id="ylCmpPickerSearch" placeholder="Search by name, brand or keyword&hellip;" autocomplete="off">
      </div>
    </div>
    <div class="cmp-picker-list" id="ylCmpPickerList" aria-live="polite"></div>`;

  document.body.appendChild(backdrop);
  document.body.appendChild(panel);
  document.body.style.overflow = "hidden";

  backdrop.addEventListener("click", closeComparePicker);
  panel.querySelector("#ylCmpPickerSearch").addEventListener("input", (e) => {
    _pickerState.query = e.target.value;
    renderComparePickerList();
  });

  if (typeof ylFocusTrap === "function") {
    _pickerState.release = ylFocusTrap(panel, { onEscape: closeComparePicker });
  }

  // Data may not be loaded yet on pages that render nothing else from it.
  if (typeof PRODUCTS !== "undefined" && PRODUCTS.length) {
    renderComparePickerList();
  } else if (typeof loadProductsFromBackend === "function") {
    const list = panel.querySelector("#ylCmpPickerList");
    if (list) list.innerHTML = `<div class="cmp-picker-empty">Loading products&hellip;</div>`;
    loadProductsFromBackend().catch(() => {}).finally(renderComparePickerList);
  }
}

function closeComparePicker() {
  const panel = document.getElementById("ylCmpPicker");
  const backdrop = document.getElementById("ylCmpPickerBackdrop");
  if (panel) panel.remove();
  if (backdrop) backdrop.remove();
  document.body.style.overflow = "";
  if (_pickerState && typeof _pickerState.release === "function") _pickerState.release();
  _pickerState = null;
}

function ylCmpPickerTab(tab) {
  if (!_pickerState) return;
  _pickerState.tab = tab;
  renderComparePickerList();
}

function ylCmpPickerAdd(productId) {
  toggleCompare(productId);
  // Slots full: the job is done — close so the tray shows the result.
  if (getCompareList().length >= COMPARE_MAX) {
    setTimeout(closeComparePicker, 350);
  }
}

// Search normalisation for the picker: the shared ylSearchNorm treatment
// (lowercase, ™/® stripped, hyphens folded) plus remaining punctuation folded
// to spaces, so "232-FG", "232 FG" and "232fg." all resolve consistently.
function cmpNorm(s) {
  const base = (typeof ylSearchNorm === "function")
    ? ylSearchNorm(s)
    : String(s || "").toLowerCase().replace(/[™®]/g, "").replace(/[-‐-―]/g, " ");
  return base.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function cmpTokens(s) { return cmpNorm(s).split(" ").filter(Boolean); }

// Deterministic relevance score (lower = better). Tiers, strongest first:
//   0  exact whole-name or code match
//   1  exact token match (a whole word of the name/brand, or the code)
//   2  token-prefix match (a name/brand token, or the code, starts with q)
//   3  brand prefix
//   4  whole-name prefix
//   5  name substring   6  brand substring   7  type/subtype/category
//   8  industry / surface keyword            9  description
// Tier 2 is why a single "p" surfaces Deer™ PVA (its "pva" token) AND every
// Premier™ product (their "premier" token) — both are token-prefix matches —
// while nothing else appears. Short queries are deliberately restricted to the
// strong prefix/token tiers so one or two characters can never dump the whole
// catalogue through a stray letter in a long description or an industry name
// (e.g. the "p" in "Upholstery" / "purpose"). Ties keep catalogue order.
function cmpScoreProduct(p, q) {
  const name   = cmpNorm(p.name);
  const brand  = cmpNorm(typeof brandDisplay === "function" ? brandDisplay(p.brand) : p.brand);
  const raw    = cmpNorm(p.brand || "");
  const code   = cmpNorm(typeof productCodeFromName === "function" ? productCodeFromName(p) : "");
  const type   = cmpNorm(typeof productType === "function" ? productType(p) : (p.category || ""));
  const sub    = cmpNorm(typeof productSubtype === "function" ? productSubtype(p) : "");
  const tokens = [...cmpTokens(name), ...cmpTokens(brand), ...cmpTokens(raw)];
  const weak    = q.length >= 2; // substring tiers off for 1-char queries
  const keyword = q.length >= 3; // industry / surface / description off below 3 chars

  if (name === q || (code && code === q)) return 0;
  if (tokens.includes(q) || brand === q || raw === q) return 1;
  if (tokens.some(t => t.startsWith(q)) || (code && code.startsWith(q))) return 2;
  if (brand.startsWith(q) || raw.startsWith(q)) return 3;
  if (name.startsWith(q)) return 4;
  if (weak && name.includes(q)) return 5;
  if (weak && (brand.includes(q) || raw.includes(q))) return 6;
  if (weak && (type.includes(q) || sub.includes(q) || cmpNorm(p.category).includes(q))) return 7;
  if (keyword && (p.industries || []).some(i => cmpNorm(i).includes(q))) return 8;
  if (keyword && (p.surfaces || []).some(s => cmpNorm(s).includes(q))) return 8;
  if (keyword && cmpNorm(p.shortDescription).includes(q)) return 9;
  return Infinity;
}

function renderComparePickerList() {
  const panel = document.getElementById("ylCmpPicker");
  if (!panel || !_pickerState) return;
  const listEl = panel.querySelector("#ylCmpPickerList");
  const countEl = panel.querySelector("#ylCmpPickerCount");
  const products = (typeof PRODUCTS !== "undefined" && PRODUCTS) ? PRODUCTS : [];
  const compare = getCompareList().map(String);
  const full = compare.length >= COMPARE_MAX;

  if (countEl) countEl.textContent = `${compare.length} of ${COMPARE_MAX} selected`;

  // Both segments stay clickable at all times; an empty Recently viewed shows
  // a designed empty state below instead of a disabled control + tooltip.
  const recents = ylGetRecentlyViewed();
  const tabR = panel.querySelector("#ylCmpTabRecent");
  const tabA = panel.querySelector("#ylCmpTabAll");
  if (tabR) tabR.setAttribute("aria-selected", _pickerState.tab === "recent" ? "true" : "false");
  if (tabA) tabA.setAttribute("aria-selected", _pickerState.tab === "all" ? "true" : "false");

  if (!listEl) return;

  // Recently viewed with no history: honest empty state + a real route on.
  if (_pickerState.tab === "recent" && !recents.length) {
    listEl.innerHTML = `
      <div class="cmp-picker-empty cmp-picker-empty-recent">
        <span class="cmp-picker-empty-ic" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </span>
        <h3>No recently viewed products</h3>
        <p>Products you open will appear here for quick comparison.</p>
        <button class="cmp-picker-browse" type="button" onclick="ylCmpPickerTab('all')">Browse all products</button>
      </div>`;
    return;
  }

  // Source rows: recents keep their view order; All keeps catalogue order.
  let rows = _pickerState.tab === "recent"
    ? recents.map(id => products.find(p => String(p.id) === id)).filter(Boolean)
    : products.slice();

  // Ranked live search (real data only — no faked matches). Capped so a broad
  // query stays a tidy, scannable list rather than an endless scroll; short
  // queries are already narrowed to strong prefix/token matches by the scorer.
  const q = cmpNorm(_pickerState.query);
  if (q) {
    rows = rows
      .map((p, i) => ({ p, s: cmpScoreProduct(p, q), i }))
      .filter(x => x.s !== Infinity)
      .sort((a, b) => a.s - b.s || a.i - b.i)
      .map(x => x.p)
      .slice(0, 24);
  }

  if (!rows.length) {
    listEl.innerHTML = `<div class="cmp-picker-empty">${
      q ? "No products match your search." : "No products available."
    }</div>`;
    return;
  }

  const subtype = p => (typeof productSubtype === "function") ? productSubtype(p) : (p.category || "");
  listEl.innerHTML = rows.map(p => {
    const name = ylEscapeHtml(p.name);
    const brandLabel = ylEscapeHtml(p.brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase());
    const hasImg = p.images && p.images.length > 0;
    const img = hasImg
      ? `<img src="${encodeURI(p.images[0])}" alt="" loading="lazy" onerror="ylImageFallback(this,'${brandLabel}')">`
      : `<span class="no-image-mark" aria-hidden="true">${brandLabel}</span>`;
    const inCmp = compare.includes(String(p.id));
    const disabled = !inCmp && full;
    const btn = inCmp
      ? `<button class="cmp-picker-add is-added" type="button" onclick="ylCmpPickerAdd('${p.id}')" aria-pressed="true" aria-label="Remove ${name} from comparison">&#10003; Added</button>`
      : `<button class="cmp-picker-add" type="button" onclick="ylCmpPickerAdd('${p.id}')" ${disabled ? "disabled" : ""} aria-pressed="false" aria-label="${disabled ? "Comparison full: remove one to add another" : `Add ${name} to comparison`}">+ Add</button>`;
    return `
      <div class="cmp-picker-row">
        <span class="cmp-picker-thumb" aria-hidden="true">${img}</span>
        <span class="cmp-picker-info">
          <span class="cmp-picker-name">${name}</span>
          <span class="cmp-picker-sub">${ylEscapeHtml(subtype(p))}</span>
        </span>
        ${btn}
      </div>`;
  }).join("");
}

// Keep an open picker's rows/count in step with the compare list.
window.addEventListener("compareUpdated", () => {
  if (document.getElementById("ylCmpPicker")) renderComparePickerList();
});

// ─── Init ───────────────────────────────────────────────────────
// The compareUpdated listener persists for the app's lifetime; the initial and
// per-swap render is driven by ylReady (runs on load and on every Swup swap).
window.addEventListener("compareUpdated", renderCompareTray);
ylReady(renderCompareTray);
