// Yee Lim — shared SPA core: page-lifecycle helpers + basket/toast state.
//
// Loaded once and kept alive across Swup page swaps. It owns the enquiry-basket
// and toast functions that used to be duplicated (with diverging behaviour) in
// products.js, product-detail.js and the enquiry inline script. Centralising
// them here lets one unified script bundle run on every public page without the
// last-loaded copy silently winning and breaking the others.

(function () {
  // ─── Page lifecycle ───────────────────────────────────────────
  // ylReady(fn): register a page-init function. It runs once immediately if the
  // DOM is ready (initial load) and again on every Swup content swap (via
  // ylRunReady). Because ALL registered fns run on every swap, each one MUST be
  // idempotent and self-selecting: bail early when its page's anchor element is
  // absent, and render fresh into whatever DOM is present.
  var readyFns = [];
  function runFn(fn) { try { fn(); } catch (e) { console.error(e); } }

  window.ylReady = function (fn) {
    if (typeof fn !== "function") return;
    if (readyFns.indexOf(fn) === -1) readyFns.push(fn);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function once() {
        document.removeEventListener("DOMContentLoaded", once);
        runFn(fn);
      });
    } else {
      runFn(fn);
    }
  };

  // Re-run every registered init fn. Called by page-transitions.js after a swap.
  window.ylRunReady = function () {
    for (var i = 0; i < readyFns.length; i++) runFn(readyFns[i]);
  };

  // ylOnce(key, fn): run fn a single time per app lifetime. Use it to register
  // window/document listeners inside a re-runnable init so they never stack.
  var onceKeys = {};
  window.ylOnce = function (key, fn) {
    if (onceKeys[key]) return;
    onceKeys[key] = true;
    runFn(fn);
  };

  // ─── Enquiry basket (localStorage) ────────────────────────────
  window.getBasket = function () {
    try { return JSON.parse(localStorage.getItem("enquiryBasket") || "[]"); }
    catch (e) { return []; }
  };

  window.saveBasket = function (basket) {
    localStorage.setItem("enquiryBasket", JSON.stringify(basket));
    window.updateBasketCount();
    // Notify the navbar (counts) and each page's own listener (grid re-render on
    // products, sidebar buttons on detail, table refresh on compare).
    window.dispatchEvent(new Event("basketUpdated"));
  };

  // Generic add/remove. Page-specific UI updates happen in each page's
  // "basketUpdated" listener, not here. Success is confirmed by the button state
  // flipping to "In Enquiry" + the header count; there is deliberately NO visible
  // success toast (it was redundant and covered content / the mobile action bar).
  // A screen-reader-only aria-live message announces the change instead. A real
  // failure to persist (e.g. localStorage unavailable) still shows a visible error
  // and does NOT flip the button, so the user can retry.
  window.toggleBasket = function (productId, productName) {
    var basket = window.getBasket();
    var idx = basket.indexOf(productId);
    var adding = idx === -1;
    if (adding) basket.push(productId); else basket.splice(idx, 1);
    try {
      window.saveBasket(basket); // persists + updates count + dispatches basketUpdated
    } catch (e) {
      window.showToast("Sorry, we couldn't update your enquiry. Please try again.", "error");
      return; // basket not persisted -> button state unchanged, retry possible
    }
    var name = (productName && String(productName).trim()) ? String(productName).trim() : "Product";
    window.announce(adding
      ? name + " was added to your product enquiry."
      : name + " was removed from your product enquiry.");
  };

  window.updateBasketCount = function () {
    var el = document.getElementById("basketCount");
    if (el) el.textContent = window.getBasket().length;
  };

  // ─── Toast (VISIBLE — errors / warnings only) ─────────────────
  // No longer used for add-to-enquiry success (see toggleBasket). Kept for real
  // problems the user must see. Pass type "error" for a distinct error style.
  var toastTimer = null;
  window.showToast = function (message, type) {
    var toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.toggle("toast--error", type === "error");
    toast.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, type === "error" ? 4000 : 2500);
  };

  // ─── Screen-reader announcements (no visible UI) ──────────────
  // A single polite live region, injected once outside #swup so it survives page
  // swaps. Used to confirm basket changes for assistive tech now that the visible
  // success toast is gone. Clearing then setting re-announces identical messages.
  window.announce = function (message) {
    var el = document.getElementById("ylStatus");
    if (!el) {
      el = document.createElement("div");
      el.id = "ylStatus";
      el.className = "sr-only";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      el.setAttribute("aria-atomic", "true");
      document.body.appendChild(el);
    }
    el.textContent = "";
    window.setTimeout(function () { el.textContent = message; }, 50);
  };

  // Sanitise a value for safe use inside an inline handler's single-quoted JS
  // string (strips quotes/brackets/ampersand). No-op for the clean product names
  // in the catalogue; degrades gracefully if data ever contains those chars.
  window.ylTxt = function (s) {
    return String(s == null ? "" : s).replace(/[\\'"<>&]/g, " ").replace(/\s+/g, " ").trim();
  };
})();
