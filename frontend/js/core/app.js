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
      var errMsg = (window.ylLang === "zh" && window.ylT) ? (window.ylT("enquiry.update_fail") || "Sorry, we couldn't update your enquiry. Please try again.") : "Sorry, we couldn't update your enquiry. Please try again.";
      window.showToast(errMsg, "error");
      return; // basket not persisted -> button state unchanged, retry possible
    }
    var zh = (window.ylLang === "zh" && window.ylT);
    var name = (productName && String(productName).trim()) ? String(productName).trim() : (zh ? "产品" : "Product");
    window.announce(adding
      ? name + (zh ? " " + (window.ylT("common.added_enquiry") || "") : " was added to your product enquiry.")
      : name + (zh ? " " + (window.ylT("common.removed_enquiry") || "") : " was removed from your product enquiry."));
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
  // The region is created at page init, not lazily on the first announce():
  // assistive tech can miss a message that lands in a live region created in the
  // same tick, so it must already exist before the first user action.
  function ensureStatusRegion() {
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
    return el;
  }
  window.ylReady(ensureStatusRegion); // idempotent: getElementById guard, one region ever

  window.announce = function (message) {
    var el = ensureStatusRegion();
    el.textContent = "";
    window.setTimeout(function () { el.textContent = message; }, 50);
  };

  // Sanitise a value for safe use inside an inline handler's single-quoted JS
  // string (strips quotes/brackets/ampersand). No-op for the clean product names
  // in the catalogue; degrades gracefully if data ever contains those chars.
  window.ylTxt = function (s) {
    return String(s == null ? "" : s).replace(/[\\'"<>&]/g, " ").replace(/\s+/g, " ").trim();
  };

  // ─── Site settings (CLIENT-006) ───────────────────────────────
  // Editable contact details (email / WhatsApp / phone / address) served by
  // api/settings.php. Fetched once, cached, and applied to any element tagged
  // with a data-yl-* hook below. The bundled HTML already carries the current
  // values as fallbacks, so pages are correct before the fetch resolves; the
  // fetch only changes anything after an admin edits a value. ylSetting() lets
  // code that builds markup at render time (e.g. product-detail wa.me links)
  // read a value directly.
  var YL_SETTINGS = null, settingsPromise = null;

  window.ylSetting = function (key, fallback) {
    return (YL_SETTINGS && YL_SETTINGS[key]) ? YL_SETTINGS[key] : fallback;
  };

  function applySiteSettings() {
    if (!YL_SETTINGS) return;
    var s = YL_SETTINGS, els, i, href, qi;
    if (s.whatsapp_number) {                       // wa.me links: swap number, keep any ?text=
      els = document.querySelectorAll("[data-yl-wa]");
      for (i = 0; i < els.length; i++) {
        href = els[i].getAttribute("href") || ""; qi = href.indexOf("?");
        els[i].setAttribute("href", "https://wa.me/" + s.whatsapp_number + (qi >= 0 ? href.slice(qi) : ""));
      }
    }
    if (s.phone_display) {
      els = document.querySelectorAll("[data-yl-phone]");
      for (i = 0; i < els.length; i++) els[i].textContent = s.phone_display;
    }
    if (s.contact_email) {
      els = document.querySelectorAll("[data-yl-email]");
      for (i = 0; i < els.length; i++) {
        els[i].setAttribute("href", "mailto:" + s.contact_email);
        if (els[i].getAttribute("data-yl-email") === "text") els[i].textContent = s.contact_email;
      }
    }
    if (s.address_line) {
      els = document.querySelectorAll("[data-yl-address]");
      for (i = 0; i < els.length; i++) els[i].textContent = s.address_line;
    }
  }
  window.applySiteSettings = applySiteSettings;

  function loadSiteSettings() {
    if (settingsPromise) return settingsPromise;
    settingsPromise = fetch("/api/settings.php")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (s) { if (s && typeof s === "object") { YL_SETTINGS = s; window.YL_SETTINGS = s; applySiteSettings(); } })
      .catch(function () { /* keep the bundled fallbacks */ });
    return settingsPromise;
  }

  window.ylReady(applySiteSettings); // re-apply cached values on each page + swap
  loadSiteSettings();                // fetch once at startup
})();
