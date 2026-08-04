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
const CMP_MOBILE_QUERY = window.matchMedia("(max-width: 640px)");

// Chinese label when zh is active (English fallback otherwise). Mirrors the
// page renderers' ylTr so the tray's JS-built slots translate too.
function cmpT(key, fallback) {
  return (window.ylLang === "zh" && window.ylT) ? (window.ylT(key) || fallback) : fallback;
}

// A11Y-007: same lookup with {placeholder} interpolation, for the
// screen-reader-only compare strings. The parity test asserts that the
// placeholders in each key match across both languages.
function cmpTf(key, fallback, vars) {
  return String(cmpT(key, fallback)).replace(/\{(\w+)\}/g, function (m, k) {
    return Object.prototype.hasOwnProperty.call(vars || {}, k) ? String(vars[k]) : m;
  });
}

let _compareTrayObserver = null;
let _compareObservedTray = null;
let _compareMeasureFrame = 0;

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
      window.announce(cmpTf("cmp.a11y.full", "Compare is full ({max} products). Remove one to add another.", { max: COMPARE_MAX }));
    return;
  }
  list.push(id);
  saveCompareList(list);
  cmpAnnounce(id, cmpT("cmp.a11y.added", "added to compare."));
  ylKeepCompareSourceClear(id);
}

function removeFromCompare(productId) {
  const restoreWithinTray = document.activeElement &&
    document.activeElement.closest(".cmp-slot-x");
  saveCompareList(getCompareList().map(String).filter(id => id !== String(productId)));
  cmpAnnounce(productId, cmpT("cmp.a11y.removed", "removed from compare."));
  if (restoreWithinTray) requestAnimationFrame(ylFocusNextCompareControl);
}

function clearCompare() {
  const hadItems = getCompareList().length > 0;
  const restoreFromTray = document.activeElement &&
    document.activeElement.closest(".compare-tray");
  saveCompareList([]);
  if (hadItems && typeof window.announce === "function") {
    window.announce(cmpT("cmp.a11y.cleared", "Comparison cleared."));
  }
  if (restoreFromTray) requestAnimationFrame(ylFocusCompareFallback);
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
  ylObserveCompareTray(tray);

  const rawList = getCompareList();

  if (rawList.length === 0) {
    tray.classList.remove("visible");
    // Reset to the collapsed (default) state so the tray reappears as the
    // quiet trigger next time something is added. Any in-flight open/close is
    // abandoned with it, so a Clear all mid-animation cannot leave the drawer
    // stuck in a transient class.
    ylCancelCompareClose(tray);
    tray.classList.remove("is-expanded");
    const toggle = document.getElementById("compareTrayToggle");
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", cmpT("cmp.a11y.none", "Compare products; no products selected"));
    }
    const panel = document.getElementById("compareTrayPanel");
    if (panel) {
      panel.setAttribute("aria-hidden", "true");
      panel.setAttribute("inert", "");
    }
    // CMP-006: empty the three permanent shells, do NOT remove them. A
    // replaceChildren() here would delete the fixed outer containers and the
    // row would have to rebuild its geometry from scratch next time.
    const slots = document.getElementById("compareTraySlots");
    if (slots) ensureCompareSlotShells(slots).forEach(shell => clearShell(shell, false));
    // CMP-005: Clear all left "Compare now" enabled. The tray is hidden so it
    // was invisible, but it stayed a live control pointing at an empty
    // comparison — reachable again the instant the tray reappeared, before the
    // next render had run.
    ylSetCompareNowEnabled(false);
    document.body.classList.remove("compare-open");
    // Tear down an open mobile sheet (e.g. Clear all emptied the list while the
    // sheet was showing) so no backdrop/scroll-lock is left behind.
    ylCloseCompareSheet(false);
    document.documentElement.style.setProperty("--compare-tray-height", "0px");
    document.documentElement.style.removeProperty("--compare-filter-max-height");
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
  // Both surfaces show the capacity so the compact trigger remains explicit.
  // Collapsed side-tab shows just "(N)" — the vertical tab is tight and "/3" ate
  // too much space. The expanded sheet keeps the full "(N/3)" for context.
  const countEl = document.getElementById("compareTrayCount");
  if (countEl) countEl.textContent = `(${list.length})`;
  const fullEl = document.getElementById("compareTrayFull");
  if (fullEl) fullEl.textContent = `(${list.length}/${COMPARE_MAX})`;
  // Reserve space so the fixed tray never sits over the last products or the
  // bottom filter rows: expose its real height as a CSS var and flag the body.
  document.body.classList.add("compare-open");
  ylEnsureSheetCloseBtn();

  reconcileCompareSlots(list);

  ylSetCompareNowEnabled(list.length >= 2);
  ylSyncCompareTrayA11y(list.length);
  scheduleCompareTrayHeight();
}

// SWUP-001: "Compare now" is an <a href="/compare"> so it travels through Swup
// like every other internal link. Anchors have no `disabled` property, so the
// inactive state is expressed with aria-disabled + a class, and clicks are
// swallowed while inactive (an anchor would otherwise still navigate). The
// keyboard path matters too: role="button" means Space activates it, and a
// disabled control must not respond to either key.
function ylSetCompareNowEnabled(enabled) {
  const btn = document.getElementById("compareBtn");
  if (!btn) return;
  const hint = enabled
    ? cmpT("common.cmp_hint_open", "Open comparison view")
    : cmpT("common.cmp_hint_min", "Select at least 2 products to compare");
  btn.classList.toggle("is-disabled", !enabled);
  btn.setAttribute("aria-disabled", enabled ? "false" : "true");
  btn.title = hint;
  btn.setAttribute("aria-label", hint);
  // Keep it out of the tab order while inactive so keyboard users are not sent
  // to a control that refuses to do anything.
  if (enabled) btn.removeAttribute("tabindex");
  else btn.setAttribute("tabindex", "-1");
}

if (typeof ylOnce === "function") {
  ylOnce("compareNow:guard", () => {
    const blocked = (e) => {
      const btn = e.target && e.target.closest && e.target.closest("#compareBtn");
      if (!btn) return false;
      return btn.getAttribute("aria-disabled") === "true";
    };
    // Capture phase so the click never reaches Swup's link handler.
    document.addEventListener("click", (e) => {
      if (!blocked(e)) return;
      e.preventDefault();
      e.stopPropagation();
    }, true);
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
      if (!blocked(e)) return;
      e.preventDefault();
      e.stopPropagation();
    }, true);
  });
}

// ─── Slot reconciliation ────────────────────────────────────────
// CMP-003: the tray used to rebuild every slot with one innerHTML write on each
// compareUpdated. Adding a third product therefore re-created the two already
// on screen — images reloaded, the action buttons jumped, and the whole
// component flashed. Now only the delta is touched: the affected empty slot is
// filled, removed products animate out, and survivors are FLIPped into their
// new positions. Nothing else in the drawer is rewritten.
const CMP_SLOT_IN_MS  = 200; // 180-240ms fade + 6px rise
const CMP_SLOT_OUT_MS = 170; // 150-200ms exit
const CMP_SLOT_FLIP_MS = 200;

function buildCompareSlot(p) {
  const name = ylEscapeHtml(p.name);
  const brandLabel = ylEscapeHtml(p.brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase());
  const hasImg = p.images && p.images.length > 0;
  const img = hasImg
    ? `<img src="${encodeURI(p.images[0])}" alt="" loading="lazy" onerror="ylImageFallback(this,'${brandLabel}')">`
    : `<span class="no-image-mark" aria-hidden="true">${brandLabel}</span>`;
  const el = document.createElement("div");
  el.className = "cmp-slot";
  el.dataset.cmpId = String(p.id);
  el.innerHTML =
    `<span class="cmp-slot-img">${img}</span>` +
    `<span class="cmp-slot-name" title="${name}">${name}</span>` +
    `<button type="button" class="cmp-slot-x" onclick="removeFromCompare('${p.id}')" aria-label="${cmpTf("cmp.a11y.remove_one", "Remove {product} from comparison", { product: name })}">` +
    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>` +
    `</button>`;
  return el;
}

function buildCompareAddSlot() {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "cmp-slot cmp-slot-add";
  el.dataset.cmpAdd = "1";
  el.setAttribute("aria-label", cmpT("common.add_product", "Add a product"));
  el.onclick = ylCompareAddMore;
  el.innerHTML =
    `<span class="cmp-slot-add-icon" aria-hidden="true">+</span>` +
    `<span class="cmp-slot-add-text"><strong>${cmpT("common.add_product", "Add a product")}</strong>` +
    `<small>${cmpT("common.search_browse", "Search or browse")}</small></span>`;
  return el;
}

function cmpMotionOK() {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// CMP-006: guarantee the three permanent outer containers exist. They ship in
// the page markup; this only backfills them if a page (or a Swup swap) somehow
// arrives without them. They are never removed after this.
function ensureCompareSlotShells(slotsEl) {
  const shells = [];
  for (let i = 0; i < COMPARE_MAX; i++) {
    let shell = slotsEl.querySelector(`.compare-slot[data-slot="${i}"]`);
    if (!shell) {
      shell = document.createElement("div");
      shell.className = "compare-slot is-empty";
      shell.dataset.slot = String(i);
      slotsEl.appendChild(shell);
    }
    shells.push(shell);
  }
  return shells;
}

function reconcileCompareSlots(list) {
  const slotsEl = document.getElementById("compareTraySlots");
  if (!slotsEl) return;
  const animate = cmpMotionOK();
  const shells = ensureCompareSlotShells(slotsEl);

  // CMP-014: products COMPACT to the front. Selections used to keep whichever
  // shell they already occupied, so removing the middle of three left
  // [P1][Add][P3] — a hole in the row with the third product stranded past it.
  // On desktop that read as slack space; stacked vertically on a phone it just
  // looked broken. Remaining products now close up in list order and "Add a
  // product" always trails them, which is what the row is describing: the
  // products you have chosen, then the way to choose another.
  const wantedIds = list.map(p => String(p.id));
  const placement = new Array(COMPARE_MAX).fill(null);
  wantedIds.forEach((id, i) => { placement[i] = id; });
  const addIndex = list.length < COMPARE_MAX ? list.length : -1;

  // Compacting means a product can change shell. Its rendered card is MOVED
  // between the permanent shells rather than rebuilt, so the thumbnail is not
  // re-fetched and nothing flickers — appendChild relocates a live node.
  const existing = new Map();
  shells.forEach(shell => {
    const id = shell.dataset.cmpId;
    const node = shell.firstElementChild;
    if (id && node && !node.classList.contains("cmp-slot-add")) existing.set(id, node);
  });
  // FLIP: where each surviving card sits before anything moves.
  const first = new Map();
  if (animate) existing.forEach((node, id) => { first.set(id, node.getBoundingClientRect().left); });

  shells.forEach((shell, i) => {
    const id = placement[i];
    const product = id ? list.find(p => String(p.id) === id) : null;
    if (product) {
      // No early return here: applyShell owns the "already correct" decision
      // via the single cmpState marker. A second check on a sub-attribute is
      // what allowed a shell to be skipped while its state was actually stale.
      renderFilledShell(shell, product, animate, existing.get(id));
    } else if (i === addIndex) {
      renderAddShell(shell, animate);
    } else {
      clearShell(shell, animate);
    }
  });

  // FLIP: slide the moved cards from where they were to where they now are.
  if (!animate) return;
  existing.forEach((node, id) => {
    if (!first.has(id) || !node.isConnected) return;
    const delta = first.get(id) - node.getBoundingClientRect().left;
    if (!delta) return;
    node.style.transition = "none";
    node.style.transform = `translate3d(${delta}px, 0, 0)`;
    requestAnimationFrame(() => {
      node.style.transition = `transform ${CMP_SLOT_FLIP_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      node.style.transform = "";
    });
  });
}

function shellSwap(shell, node, animate) {
  const outgoing = shell.firstElementChild;
  // Each swap claims the shell. A swap still waiting out its exit animation is
  // abandoned if a newer one starts, so a fast add-remove-add cannot let a
  // stale timer write old content over the current state.
  const token = (Number(shell.dataset.cmpSwap || 0) + 1) % 1000;
  shell.dataset.cmpSwap = String(token);
  const finish = () => {
    if (shell.dataset.cmpSwap !== String(token)) return; // superseded
    // BUGFIX: replaceChildren(null) does NOT empty the element — it stringifies
    // the argument and inserts a text node reading "null", which showed up as
    // literal "null" text in the tray. Call it with no arguments to clear.
    if (node) shell.replaceChildren(node);
    else shell.replaceChildren();
    if (!animate || !node) return;
    node.style.opacity = "0";
    node.style.transform = "translate3d(0, 6px, 0)";
    requestAnimationFrame(() => {
      node.style.transition = `opacity ${CMP_SLOT_IN_MS}ms ease, transform ${CMP_SLOT_IN_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      node.style.opacity = "";
      node.style.transform = "";
    });
  };
  if (!outgoing || !animate) { finish(); return; }
  // The outgoing content leaves inside the shell, so the shell's own box — and
  // therefore the row — never changes size during the swap.
  outgoing.style.transition = `opacity ${CMP_SLOT_OUT_MS}ms ease, transform ${CMP_SLOT_OUT_MS}ms ease`;
  outgoing.style.opacity = "0";
  outgoing.style.transform = "translate3d(0, 4px, 0)";
  setTimeout(finish, CMP_SLOT_OUT_MS);
}

// BUGFIX: these three used to each keep their own partial marker (cmpId on
// filled, cmpRole on add) and early-return on it. Nothing ever cleared cmpRole
// when a shell became filled, so any shell that had once been the "Add a
// product" slot stayed permanently stamped role="add" — and renderAddShell's
// `if (role === "add") return` then refused to rebuild it. The visible symptom
// was that removing a product left its card on screen: storage updated, the
// slot did not. Slot 0 looked fine only because it had never been the add slot.
//
// There is now ONE authoritative marker per shell describing its complete
// desired state, so a stale sub-attribute cannot make a shell think it is
// already correct.
function shellState(shell) { return shell.dataset.cmpState || ""; }

function applyShell(shell, state, node, animate) {
  if (shellState(shell) === state) return; // genuinely already correct
  shell.dataset.cmpState = state;
  const filled = state.startsWith("filled:");
  if (filled) shell.dataset.cmpId = state.slice(7);
  else delete shell.dataset.cmpId;
  if (state === "add") shell.dataset.cmpRole = "add";
  else delete shell.dataset.cmpRole;
  shell.classList.toggle("is-filled", filled);
  shell.classList.toggle("is-empty", !filled);
  shellSwap(shell, node, animate);
}

// `existingNode` is this product's already-rendered card, if it is currently in
// another shell. Reusing it means a compaction MOVES the card instead of
// rebuilding it: the image is not re-requested and there is no flash.
function renderFilledShell(shell, product, animate, existingNode) {
  const state = "filled:" + String(product.id);
  if (existingNode && existingNode.parentElement !== shell) {
    // Relocating a live node — no entrance animation, the FLIP pass handles
    // the movement, so skip shellSwap's fade-in entirely.
    shell.dataset.cmpState = state;
    shell.dataset.cmpId = String(product.id);
    delete shell.dataset.cmpRole;
    shell.classList.add("is-filled");
    shell.classList.remove("is-empty");
    shell.replaceChildren(existingNode);
    return;
  }
  applyShell(shell, state, existingNode || buildCompareSlot(product), animate);
}

function renderAddShell(shell, animate) {
  applyShell(shell, "add", buildCompareAddSlot(), animate);
}

function clearShell(shell, animate) {
  applyShell(shell, "empty", null, animate);
}

// A newly revealed fixed bar must not land on top of the card action that just
// created it. Nudge only when that source action is actually intersected; no
// movement occurs for detail/sidebar controls or cards already clear of it.
function ylKeepCompareSourceClear(productId) {
  if (!CMP_MOBILE_QUERY.matches) return;
  const keepClear = () => {
    const source = Array.from(document.querySelectorAll(".product-card .pcard-cmp[data-product-id]"))
      .find(button => String(button.dataset.productId) === String(productId));
    const actions = source && source.closest(".product-card")
      ? source.closest(".product-card").querySelector(".product-card-actions")
      : null;
    const tray = document.getElementById("compareTray");
    if (!actions || !tray || !tray.classList.contains("visible") || tray.classList.contains("is-expanded")) return;
    const actionRect = actions.getBoundingClientRect();
    const trayRect = tray.getBoundingClientRect();
    const overlap = actionRect.bottom - trayRect.top;
    if (overlap > 0 && actionRect.top < window.innerHeight) {
      window.scrollBy({ top: Math.ceil(overlap + 12), left: 0, behavior: "auto" });
    }
  };
  // Measure after the bar's entrance transition reaches its final position.
  // Reduced-motion users simply get the same single delayed clearance check.
  setTimeout(keepClear, 340);
}

// Add-a-product slot: opens the dedicated compare picker (side panel with
// search + Recently viewed / All products). Falls back to the catalogue if
// the picker cannot be built for any reason.
//
// On phones the expanded sheet has to stand down while the picker owns the
// screen (two stacked modals would fight over scroll lock and focus). That is
// a temporary hand-over, NOT a dismissal: _cmpSheetPendingReopen records that
// the sheet was the layer that opened the picker so closing the picker puts it
// straight back, with every selected product still in place. Without this the
// picker's × dropped the visitor onto the collapsed side-tab, which reads as
// "my whole comparison was cancelled".
let _cmpSheetPendingReopen = false;

function ylCompareAddMore() {
  if (typeof openComparePicker === "function") {
    const tray = document.getElementById("compareTray");
    const opener = CMP_MOBILE_QUERY.matches
      ? document.getElementById("compareTrayToggle")
      : document.activeElement;
    if (CMP_MOBILE_QUERY.matches && document.body.classList.contains("cmp-sheet-open")) {
      if (tray) { ylCancelCompareClose(tray); tray.classList.remove("is-expanded"); }
      ylSyncCompareTrayA11y(getCompareList().length);
      ylCloseCompareSheet(false);
      scheduleCompareTrayHeight();
      _cmpSheetPendingReopen = true;
      requestAnimationFrame(() => openComparePicker(opener));
    } else {
      openComparePicker(opener);
    }
    return;
  }
  location.href = "/products#catalogue";
}

// Put the mobile sheet back after the picker hands the screen over. Selections
// are untouched by any of this — they only ever change via a row × or Clear all.
function ylReopenCompareSheetIfPending() {
  if (!_cmpSheetPendingReopen) return;
  _cmpSheetPendingReopen = false;
  if (!CMP_MOBILE_QUERY.matches) return;
  const tray = document.getElementById("compareTray");
  if (!tray || !tray.classList.contains("visible")) return;
  ylCancelCompareClose(tray);
  tray.classList.add("is-expanded", "cmp-opening");
  ylSyncCompareTrayA11y(getCompareList().length);
  ylOpenCompareSheet();
  requestAnimationFrame(() => requestAnimationFrame(() => tray.classList.remove("cmp-opening")));
  scheduleCompareTrayHeight();
}

// Observe the tray itself rather than guessing from breakpoints or one render.
// This catches panel motion, item-count changes, wrapping, zoom and responsive
// mode changes. The observer is rebound when Swup replaces the tray node.
function ylObserveCompareTray(tray) {
  if (tray === _compareObservedTray) return;
  if (_compareTrayObserver) _compareTrayObserver.disconnect();
  _compareObservedTray = tray;
  if (typeof ResizeObserver === "function") {
    _compareTrayObserver = new ResizeObserver(scheduleCompareTrayHeight);
    _compareTrayObserver.observe(tray);
  }
}

function scheduleCompareTrayHeight() {
  if (_compareMeasureFrame) cancelAnimationFrame(_compareMeasureFrame);
  _compareMeasureFrame = requestAnimationFrame(() => {
    _compareMeasureFrame = 0;
    updateCompareTrayHeight();
  });
}

// Measure the tray and reserve exactly the visible collapsed control. On mobile
// the expanded sheet is modal and reserves zero; the collapsed bottom bar must
// reserve its full safe-area-aware footprint so it never covers page actions.
function updateCompareTrayHeight() {
  const tray = document.getElementById("compareTray");
  if (!tray || !tray.classList.contains("visible")) {
    document.documentElement.style.setProperty("--compare-tray-height", "0px");
    document.documentElement.style.removeProperty("--compare-filter-max-height");
    if (typeof updateFilterScrollFade === "function") updateFilterScrollFade();
    return;
  }
  if (CMP_MOBILE_QUERY.matches) {
    // Collapsed compare is a left-edge side-tab and expanded is a modal
    // sheet — neither occupies bottom page flow, so reserve nothing here.
    tray.style.setProperty("--cmp-panel-h", "0px");
    document.documentElement.style.setProperty("--compare-tray-height", "0px");
    document.documentElement.style.removeProperty("--compare-filter-max-height");
    if (typeof updateFilterScrollFade === "function") updateFilterScrollFade();
    return;
  }
  // The panel is always laid out at full height now (it is hidden by being
  // translated below the fold, not by being collapsed), so its measured height
  // IS the collapsed offset the wrapper travels. Publish it as --cmp-panel-h,
  // which the single CSS transform reads.
  const panel = document.getElementById("compareTrayPanel");
  const trigger = document.getElementById("compareTrayToggle");
  const panelH = panel ? Math.ceil(panel.getBoundingClientRect().height || 0) : 0;
  const triggerH = trigger ? Math.ceil(trigger.getBoundingClientRect().height || 0) : 0;
  tray.style.setProperty("--cmp-panel-h", panelH + "px");
  // Reserve only what is actually on screen: the tab alone when collapsed,
  // tab + panel when the drawer is open.
  const h = tray.classList.contains("is-expanded") ? panelH + triggerH : triggerH;
  document.documentElement.style.setProperty("--compare-tray-height", h + "px");
  updateCompareFilterMaxHeight(h);
  if (typeof updateFilterScrollFade === "function") updateFilterScrollFade();
}

function updateCompareFilterMaxHeight(trayHeight) {
  const sidebar = document.getElementById("filterSidebar");
  if (!sidebar || !document.body.classList.contains("compare-open") || CMP_MOBILE_QUERY.matches) {
    document.documentElement.style.removeProperty("--compare-filter-max-height");
    return;
  }
  const top = Math.max(0, sidebar.getBoundingClientRect().top);
  const available = Math.max(160, window.innerHeight - top - trayHeight - 16);
  document.documentElement.style.setProperty("--compare-filter-max-height", `${Math.floor(available)}px`);
}

function ylSyncCompareTrayA11y(count) {
  const tray = document.getElementById("compareTray");
  const toggle = document.getElementById("compareTrayToggle");
  const panel = document.getElementById("compareTrayPanel");
  if (!tray) return;
  const expanded = tray.classList.contains("is-expanded");
  if (toggle) {
    toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    toggle.setAttribute(
      "aria-label",
      cmpTf(expanded ? "cmp.a11y.collapse" : "cmp.a11y.expand",
        expanded ? "Collapse comparison tray, {count} selected" : "Expand comparison tray, {count} selected",
        { count: count })
    );
  }
  if (panel) {
    panel.setAttribute("aria-hidden", expanded ? "false" : "true");
    // The panel is now permanently laid out (below the fold when collapsed), so
    // visibility:hidden no longer keeps its Clear all / Compare now buttons out
    // of the tab order. `inert` does that job, and also blocks pointer hits on
    // the strip of panel that sits under the viewport edge.
    if (expanded) panel.removeAttribute("inert");
    else panel.setAttribute("inert", "");
  }
}

function ylSafeFocus(target) {
  if (!target || typeof target.focus !== "function") return;
  try { target.focus({ preventScroll: true }); }
  catch (e) { try { target.focus(); } catch (ignore) {} }
}

function ylFocusNextCompareControl() {
  const tray = document.getElementById("compareTray");
  if (!tray || !tray.classList.contains("visible")) {
    ylFocusCompareFallback();
    return;
  }
  const next = document.querySelector(
    "#compareTray .cmp-slot-x, #compareTray .cmp-slot-add, #compareTrayToggle"
  );
  ylSafeFocus(next);
}

function ylFocusCompareFallback() {
  const target = document.querySelector(
    ".pcard-cmp:not([disabled]), .btn-compare-sidebar:not([disabled]), #compareTrayToggle"
  );
  ylSafeFocus(target);
}

// Collapsed by default. Desktop: the centred trigger expands the slots/actions
// drawer in place. Mobile (<=640px): the collapsed side tab opens a bottom SHEET
// with a dimmed backdrop, focus trap and scroll lock (Canyon-inspired). Esc /
// backdrop / close-button all collapse it. Re-measures so any reserved space
// follows the tray's new state.
// CMP-004: the drawer is a four-state machine — collapsed, opening, expanded,
// closing — and every transition between them is ONE transform. No timers guess
// when motion has finished; the close completes on transitionend (with a
// generous safety net in case the event is swallowed, e.g. the tab is
// backgrounded mid-animation). Because both directions animate the same
// property on the same element, an interrupted transition simply re-targets
// from wherever it is: rapid clicking cannot strand the drawer halfway.
let _cmpCloseToken = 0;

function ylCancelCompareClose(tray) {
  _cmpCloseToken++;
  tray.classList.remove("cmp-closing", "cmp-opening");
}

function toggleCompareTray() {
  const tray = document.getElementById("compareTray");
  if (!tray) return;
  // While a close is in flight the tray still carries .is-expanded, so read the
  // intent from the animation state, not just the class.
  const closing = tray.classList.contains("cmp-closing");
  const willExpand = closing || !tray.classList.contains("is-expanded");
  ylCancelCompareClose(tray);

  if (willExpand) {
    if (CMP_MOBILE_QUERY.matches) {
      // Park the sheet below the fold for exactly one frame, then release it so
      // the browser has two distinct transform values to interpolate between.
      tray.classList.add("is-expanded", "cmp-opening");
      ylOpenCompareSheet();
      requestAnimationFrame(() => requestAnimationFrame(() => tray.classList.remove("cmp-opening")));
    } else {
      tray.classList.add("is-expanded");
    }
    ylSyncCompareTrayA11y(getCompareList().length);
    scheduleCompareTrayHeight();
    return;
  }

  // Closing. Panel controls leave the tab order immediately; the pixels follow.
  ylSyncCompareTrayA11y__collapsing(tray);
  if (!CMP_MOBILE_QUERY.matches) {
    // Desktop: dropping .is-expanded is itself the close animation (the wrapper
    // transitions back to its collapsed offset), so nothing to wait for.
    tray.classList.remove("is-expanded");
    ylSyncCompareTrayA11y(getCompareList().length);
    scheduleCompareTrayHeight();
    return;
  }

  // Mobile: run the sheet out, then tear the modal down when it has landed.
  const token = ++_cmpCloseToken;
  const panel = document.getElementById("compareTrayPanel");
  const finish = () => {
    if (token !== _cmpCloseToken) return; // superseded by a re-open
    tray.classList.remove("is-expanded", "cmp-closing");
    ylCloseCompareSheet();
    ylSyncCompareTrayA11y(getCompareList().length);
    scheduleCompareTrayHeight();
  };
  if (!panel || !cmpMotionOK()) { finish(); return; }
  tray.classList.add("cmp-closing");
  const onEnd = (e) => {
    if (e.target !== panel || e.propertyName !== "transform") return;
    panel.removeEventListener("transitionend", onEnd);
    finish();
  };
  panel.addEventListener("transitionend", onEnd);
  // Safety net only: a backgrounded tab never fires transitionend.
  setTimeout(() => { panel.removeEventListener("transitionend", onEnd); finish(); }, 420);
}

// Take the panel out of the tab order the moment a close begins, so focus can
// never land inside a drawer that is on its way off screen.
function ylSyncCompareTrayA11y__collapsing(tray) {
  const panel = document.getElementById("compareTrayPanel");
  const toggle = document.getElementById("compareTrayToggle");
  if (panel) {
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("inert", "");
  }
  if (toggle) toggle.setAttribute("aria-expanded", "false");
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
  // This control COLLAPSES the sheet back to the compact compare tab; it never
  // clears the selection (only a row × or Clear all do). The name says so.
  btn.setAttribute("aria-label", cmpT("cmp.a11y.collapse_short", "Collapse compare"));
  btn.onclick = toggleCompareTray;
  btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  inner.insertBefore(btn, inner.firstChild);
}

// Mobile bottom-sheet open: dim backdrop (tap to close), page scroll lock, and a
// focus trap inside the panel. Idempotent.
let _cmpSheetRelease = null;
let _cmpSheetScrollY = 0;
let _cmpSheetBodyStyle = null;

function ylLockCompareScroll() {
  if (_cmpSheetBodyStyle) return;
  _cmpSheetScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  _cmpSheetBodyStyle = {
    position: document.body.style.position,
    top: document.body.style.top,
    left: document.body.style.left,
    right: document.body.style.right,
    width: document.body.style.width,
    overflow: document.body.style.overflow
  };
  document.body.style.position = "fixed";
  document.body.style.top = `-${_cmpSheetScrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
  document.body.style.overflow = "hidden";
}

function ylUnlockCompareScroll() {
  if (!_cmpSheetBodyStyle) return;
  const previous = _cmpSheetBodyStyle;
  _cmpSheetBodyStyle = null;
  document.body.style.position = previous.position;
  document.body.style.top = previous.top;
  document.body.style.left = previous.left;
  document.body.style.right = previous.right;
  document.body.style.width = previous.width;
  document.body.style.overflow = previous.overflow;
  window.scrollTo(0, _cmpSheetScrollY);
}

function ylOpenCompareSheet() {
  if (document.getElementById("cmpSheetBackdrop")) return;
  if (document.body.classList.contains("filter-drawer-open") &&
      typeof closeFilterDrawer === "function") {
    closeFilterDrawer(false);
  }
  const backdrop = document.createElement("div");
  backdrop.className = "cmp-sheet-backdrop";
  backdrop.id = "cmpSheetBackdrop";
  backdrop.addEventListener("click", () => toggleCompareTray());
  // #swup uses will-change:opacity, which forms its own stacking context. Keep
  // the backdrop in that same context as the tray; a body-level backdrop would
  // otherwise paint over (and intercept) the numerically higher sheet controls.
  (document.getElementById("swup") || document.body).appendChild(backdrop);
  document.body.classList.add("cmp-sheet-open");
  ylLockCompareScroll();
  const panel = document.getElementById("compareTrayPanel");
  if (panel) {
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", cmpT("cmp.a11y.sheet", "Selected products to compare"));
  }
  if (typeof ylFocusTrap === "function" && panel) {
    // No onEscape here: the lifetime Esc listener below already collapses the
    // tray, so passing one would double-toggle.
    _cmpSheetRelease = ylFocusTrap(panel, {});
  }
}

// Tear the sheet down and return focus to the (now visible again) side tab.
function ylCloseCompareSheet(restoreFocus = true) {
  const backdrop = document.getElementById("cmpSheetBackdrop");
  if (backdrop) backdrop.remove();
  const wasOpen = document.body.classList.contains("cmp-sheet-open");
  document.body.classList.remove("cmp-sheet-open");
  ylUnlockCompareScroll();
  const panel = document.getElementById("compareTrayPanel");
  if (panel) {
    panel.removeAttribute("role");
    panel.removeAttribute("aria-modal");
    panel.removeAttribute("aria-label");
  }
  if (_cmpSheetRelease) { _cmpSheetRelease(false); _cmpSheetRelease = null; }
  if (wasOpen && restoreFocus) {
    const toggle = document.getElementById("compareTrayToggle");
    if (toggle && toggle.offsetParent !== null) ylSafeFocus(toggle);
  }
}

// Reconcile both breakpoint directions. Desktop -> mobile must acquire the
// sheet's backdrop, dialog semantics, scroll lock and focus trap; mobile ->
// desktop releases them while leaving the expanded desktop tray intact.
function ylReconcileCompareMode(event) {
  const tray = document.getElementById("compareTray");
  // A breakpoint change is not an interaction: drop any transient open/close
  // classes so the drawer settles into the new mode's resting state at once.
  if (tray) ylCancelCompareClose(tray);
  if (!tray || !tray.classList.contains("is-expanded")) {
    if (!event.matches && document.body.classList.contains("cmp-sheet-open")) {
      ylCloseCompareSheet(false);
    }
    scheduleCompareTrayHeight();
    return;
  }
  if (event.matches && !document.body.classList.contains("cmp-sheet-open")) {
    ylOpenCompareSheet();
  } else if (!event.matches && document.body.classList.contains("cmp-sheet-open")) {
    ylCloseCompareSheet(false);
  }
  ylSyncCompareTrayA11y(getCompareList().length);
  scheduleCompareTrayHeight();
}
if (typeof CMP_MOBILE_QUERY.addEventListener === "function") {
  CMP_MOBILE_QUERY.addEventListener("change", ylReconcileCompareMode);
} else if (typeof CMP_MOBILE_QUERY.addListener === "function") {
  CMP_MOBILE_QUERY.addListener(ylReconcileCompareMode);
}

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

// ResizeObserver handles element changes; this event is the fallback and also
// covers viewport zoom/safe-area changes that do not resize the tray immediately.
window.addEventListener("resize", () => {
  if (!document.body.classList.contains("compare-open")) return;
  scheduleCompareTrayHeight();
});
window.addEventListener("scroll", () => {
  if (!document.body.classList.contains("compare-open") || CMP_MOBILE_QUERY.matches) return;
  scheduleCompareTrayHeight();
}, { passive: true });

// ─── Compare picker (dedicated add-product flow) ─────────────────
// Slide-in side panel (Canyon-inspired interaction, Yee Lim visual language):
// segmented Recently viewed / All products, live search, direct add into the
// compare slots. Built lazily on first open, torn down fully on close.
// Recently-viewed ids are written by product-detail.js (ylPushRecentlyViewed).
const YL_RECENT_KEY = "recentlyViewed";

function comparePickerCopy(lang) {
  const copy = {
    en: {
      eyebrow: "Compare Products",
      title: "Add a product to compare",
      closeAria: "Close product picker",
      sourceAria: "Product source",
      recentTab: "Recently viewed",
      allTab: "All products",
      searchLabel: "Search products to compare",
      searchPlaceholder: "Search by name, brand or keyword…",
      loading: "Loading products…",
      selectedCount: "{count} of {max} selected",
      recentEmptyTitle: "No recently viewed products",
      recentEmptyBody: "Products you open will appear here for quick comparison.",
      browseAll: "Browse all products",
      noSearchResults: "No products match your search.",
      noProducts: "No products available.",
      add: "Add",
      added: "Added",
      removeAria: "Remove {product} from comparison",
      addAria: "Add {product} to comparison",
      fullAria: "Comparison full: remove one to add another",
      limitMessage: "Maximum of 3 products selected. Remove one to choose another."
    },
    zh: {
      eyebrow: "产品对比",
      title: "添加产品进行对比",
      closeAria: "关闭产品选择器",
      sourceAria: "产品来源",
      recentTab: "最近浏览",
      allTab: "所有产品",
      searchLabel: "搜索要对比的产品",
      searchPlaceholder: "按名称、品牌或关键词搜索……",
      loading: "正在加载产品……",
      selectedCount: "已选择 {count}／{max} 款产品",
      recentEmptyTitle: "暂无最近浏览的产品",
      recentEmptyBody: "您浏览过的产品将显示在此处，便于快速对比。",
      browseAll: "浏览所有产品",
      noSearchResults: "没有符合搜索条件的产品。",
      noProducts: "暂无可用产品。",
      add: "添加",
      added: "已添加",
      removeAria: "从对比中移除 {product}",
      addAria: "将 {product} 添加至对比",
      fullAria: "对比列表已满：请先移除一款产品再添加",
      limitMessage: "最多可选择 3 款产品。请先移除一款，再选择其他产品。"
    }
  };
  return lang === "zh" ? copy.zh : copy.en;
}

function formatComparePickerCopy(template, replacements) {
  const values = replacements !== null && typeof replacements === "object"
    ? replacements
    : { count: replacements };
  return String(template).replace(/\{([a-z][a-zA-Z0-9]*)\}/g, function (match, key) {
    return Object.prototype.hasOwnProperty.call(values, key)
      ? String(values[key])
      : match;
  });
}

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

// CMP-010: locking the page with overflow:hidden removes the scrollbar, and on
// Windows/Linux the reclaimed ~15px shifts the whole page (and the fixed
// compare bar) sideways. Measure the real gutter at lock time and hand it back
// as padding, so the layout does not move. Measured per lock rather than
// assumed, because the width differs by platform and by user setting, and is 0
// wherever scrollbars are overlays (macOS, mobile).
function ylLockPageScroll() {
  const gutter = window.innerWidth - document.documentElement.clientWidth;
  if (gutter > 0) document.documentElement.style.setProperty("--yl-sb", gutter + "px");
  document.body.classList.add("yl-scroll-locked");
  document.body.style.overflow = "hidden";
}

function ylUnlockPageScroll() {
  document.body.style.overflow = "";
  document.body.classList.remove("yl-scroll-locked");
  document.documentElement.style.removeProperty("--yl-sb");
}

let _pickerState = null; // { tab, query, release, opener }

function openComparePicker(opener) {
  if (document.getElementById("ylCmpPicker")) return; // already open

  const copy = comparePickerCopy(window.ylLang);
  const recents = ylGetRecentlyViewed();
  _pickerState = {
    tab: recents.length ? "recent" : "all",
    query: "",
    opener: opener || document.activeElement
  };

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
        <span class="cmp-picker-eyebrow">${copy.eyebrow}</span>
        <h2 class="cmp-picker-title" id="ylCmpPickerTitle">${copy.title}</h2>
        <span class="cmp-picker-count" id="ylCmpPickerCount"></span>
      </div>
      <button class="cmp-picker-x" type="button" onclick="closeComparePicker()" aria-label="${copy.closeAria}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="cmp-picker-tools">
      <div class="cmp-picker-tabs" role="group" aria-label="${copy.sourceAria}">
        <button class="cmp-picker-tab" id="ylCmpTabRecent" type="button" aria-pressed="false" onclick="ylCmpPickerTab('recent')">${copy.recentTab}</button>
        <button class="cmp-picker-tab" id="ylCmpTabAll" type="button" aria-pressed="false" onclick="ylCmpPickerTab('all')">${copy.allTab}</button>
      </div>
      <div class="cmp-picker-search">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <label class="sr-only" for="ylCmpPickerSearch">${copy.searchLabel}</label>
        <input type="text" id="ylCmpPickerSearch" placeholder="${copy.searchPlaceholder}" autocomplete="off">
      </div>
    </div>
    <!-- CMP-009: the maximum-limit explanation. It is a single shared message
         referenced by every disabled row's aria-describedby, so the limit is
         announced once on demand rather than repeated for all 28 disabled
         results. role=status announces it when it appears without stealing
         focus; it is removed again the moment the count drops below 3. -->
    <p class="cmp-picker-limit" id="compareLimitMessage" role="status" hidden></p>
    <div class="cmp-picker-list" id="ylCmpPickerList" aria-live="polite"></div>`;

  document.body.appendChild(backdrop);
  document.body.appendChild(panel);
  ylLockPageScroll();

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
    if (list) list.innerHTML = `<div class="cmp-picker-empty">${copy.loading}</div>`;
    loadProductsFromBackend().catch(() => {}).finally(renderComparePickerList);
  }
}

function closeComparePicker(restoreFocus = true) {
  const state = _pickerState;
  const panel = document.getElementById("ylCmpPicker");
  const backdrop = document.getElementById("ylCmpPickerBackdrop");
  if (panel) panel.remove();
  if (backdrop) backdrop.remove();
  ylUnlockPageScroll();
  if (state && typeof state.release === "function") state.release(false);
  _pickerState = null;
  // restoreFocus === false marks a forced teardown (another modal is taking
  // over, or the page is being swapped): the sheet must NOT come back then.
  if (restoreFocus === false) { _cmpSheetPendingReopen = false; return; }
  if (_cmpSheetPendingReopen) {
    ylReopenCompareSheetIfPending();
    // The sheet is the layer the visitor returns to; its focus trap owns focus
    // from here, so the generic restore below would fight it.
    return;
  }
  const candidates = [
    state && state.opener,
    document.getElementById("compareTrayToggle"),
    document.querySelector("#compareSelectPanel .csel-add, #compareSelectPanel .csel-remove, #compareSelectPanel .csel-compare, #compareSelectPanel .compare-page-clear"),
    document.querySelector("#mainContent button:not([disabled]), #mainContent a[href]")
  ];
  const target = candidates.find(element =>
    element && element.isConnected && element.getClientRects().length > 0
  );
  ylSafeFocus(target);
}

function ylCmpPickerTab(tab) {
  if (!_pickerState) return;
  _pickerState.tab = tab;
  renderComparePickerList();
}

// CMP-008: reaching the maximum used to close the picker after 350ms.
// Selecting a third product is not the same thing as finishing the comparison
// task, and the auto-close also released the picker's scroll lock, which on any
// platform with classic scrollbars restored the scrollbar gutter and shifted
// the whole page (and the fixed compare bar) sideways. That is the reported
// "the bar shifts / a scrollbar appears".
//
// The picker now closes ONLY on Back, Close, Escape, Compare now or an explicit
// navigation. Count, drawer state and picker state are separate values: at 3/3
// the valid state is compareCount=3, drawer=expanded, picker=open.
function ylCmpPickerAdd(productId) {
  toggleCompare(productId);
  // Keep focus on the row the visitor just acted on, whichever direction it
  // went, so selecting and unselecting feel like one continuous interaction.
  requestAnimationFrame(() => {
    const target = Array.from(document.querySelectorAll("#ylCmpPicker .cmp-picker-add"))
      .find(button => String(button.dataset.productId) === String(productId));
    ylSafeFocus(target);
  });
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
  const copy = comparePickerCopy(window.ylLang);
  const listEl = panel.querySelector("#ylCmpPickerList");
  const countEl = panel.querySelector("#ylCmpPickerCount");
  const products = (typeof PRODUCTS !== "undefined" && PRODUCTS) ? PRODUCTS : [];
  const compare = getCompareList().map(String);
  const full = compare.length >= COMPARE_MAX;

  if (countEl) {
    countEl.textContent = formatComparePickerCopy(copy.selectedCount, {
      count: compare.length,
      max: COMPARE_MAX
    });
  }

  // CMP-009: show the limit explanation only while the selection is actually
  // full. Unselecting one product hides it again on the same render that
  // re-enables the rows, so the two never disagree.
  const limitEl = panel.querySelector("#compareLimitMessage");
  if (limitEl) {
    limitEl.textContent = copy.limitMessage;
    limitEl.hidden = !full;
  }

  // Both segments stay clickable at all times; an empty Recently viewed shows
  // a designed empty state below instead of a disabled control + tooltip.
  const recents = ylGetRecentlyViewed();
  const tabR = panel.querySelector("#ylCmpTabRecent");
  const tabA = panel.querySelector("#ylCmpTabAll");
  if (tabR) tabR.setAttribute("aria-pressed", _pickerState.tab === "recent" ? "true" : "false");
  if (tabA) tabA.setAttribute("aria-pressed", _pickerState.tab === "all" ? "true" : "false");

  if (!listEl) return;

  // Recently viewed with no history: honest empty state + a real route on.
  if (_pickerState.tab === "recent" && !recents.length) {
    listEl.innerHTML = `
      <div class="cmp-picker-empty cmp-picker-empty-recent">
        <span class="cmp-picker-empty-ic" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </span>
        <h3>${copy.recentEmptyTitle}</h3>
        <p>${copy.recentEmptyBody}</p>
        <button class="cmp-picker-browse" type="button" onclick="ylCmpPickerTab('all')">${copy.browseAll}</button>
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
      q ? copy.noSearchResults : copy.noProducts
    }</div>`;
    return;
  }

  const subtype = p => (typeof productSubtype === "function") ? productSubtype(p) : (p.category || "");
  listEl.innerHTML = rows.map(p => {
    const name = ylEscapeHtml(p.name);
    const brandLabel = ylEscapeHtml(p.brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase());
    const hasImg = p.images && p.images.length > 0;
    const img = hasImg
      ? `<img src="${encodeURI(p.images[0])}" alt="" loading="lazy" data-fallback-brand="${brandLabel}" onerror="ylImageFallback(this,this.dataset.fallbackBrand)">`
      : `<span class="no-image-mark" aria-hidden="true">${brandLabel}</span>`;
    const inCmp = compare.includes(String(p.id));
    const disabled = !inCmp && full;
    const dataId = ylEscapeHtml(String(p.id));
    const removeAria = formatComparePickerCopy(copy.removeAria, { product: name });
    const addAria = formatComparePickerCopy(copy.addAria, { product: name });
    const btn = inCmp
      ? `<button class="cmp-picker-add is-added" type="button" data-product-id="${dataId}" onclick="ylCmpPickerAdd(this.dataset.productId)" aria-pressed="true" aria-label="${removeAria}">&#10003; ${copy.added}</button>`
      : `<button class="cmp-picker-add" type="button" data-product-id="${dataId}" onclick="ylCmpPickerAdd(this.dataset.productId)" ${disabled ? `disabled aria-describedby="compareLimitMessage"` : ""} aria-pressed="false" aria-label="${disabled ? copy.fullAria : addAria}">+ ${copy.add}</button>`;
    return `
      <div class="cmp-picker-row">
        <span class="cmp-picker-thumb" aria-hidden="true">${img}</span>
        <span class="cmp-picker-info">
          <span class="cmp-picker-name">${name}</span>
          <span class="cmp-picker-sub">${ylEscapeHtml(window.ylTerm ? window.ylTerm(subtype(p)) : subtype(p))}</span>
        </span>
        ${btn}
      </div>`;
  }).join("");
}

// Keep an open picker's rows/count in step with the compare list.
window.addEventListener("compareUpdated", () => {
  if (document.getElementById("ylCmpPicker")) renderComparePickerList();
});

function ylCleanupCompareOverlays() {
  const tray = document.getElementById("compareTray");
  if (tray) tray.classList.remove("visible", "is-expanded");
  if (document.body.classList.contains("cmp-sheet-open") || document.getElementById("cmpSheetBackdrop")) {
    ylCloseCompareSheet(false);
  }
  if (document.getElementById("ylCmpPicker") || document.getElementById("ylCmpPickerBackdrop")) {
    closeComparePicker(false);
  }
  document.body.classList.remove("compare-open");
  document.documentElement.style.setProperty("--compare-tray-height", "0px");
  document.documentElement.style.removeProperty("--compare-filter-max-height");
}

// ─── Init ───────────────────────────────────────────────────────
// The compareUpdated listener persists for the app's lifetime; the initial and
// per-swap render is driven by ylReady (runs on load and on every Swup swap).
window.addEventListener("compareUpdated", renderCompareTray);
if (typeof ylOnce === "function") {
  ylOnce("compare:swupCleanup", () => {
    document.addEventListener("swup:visit:start", ylCleanupCompareOverlays);
  });
}
ylReady(renderCompareTray);
