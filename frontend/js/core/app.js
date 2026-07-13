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
  // "basketUpdated" listener, not here.
  window.toggleBasket = function (productId) {
    var basket = window.getBasket();
    var idx = basket.indexOf(productId);
    if (idx === -1) {
      basket.push(productId);
      window.showToast("Added to your product enquiry");
    } else {
      basket.splice(idx, 1);
      window.showToast("Removed from your product enquiry");
    }
    window.saveBasket(basket);
  };

  window.updateBasketCount = function () {
    var el = document.getElementById("basketCount");
    if (el) el.textContent = window.getBasket().length;
  };

  // ─── Toast ────────────────────────────────────────────────────
  var toastTimer = null;
  window.showToast = function (message) {
    var toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2500);
  };
})();
