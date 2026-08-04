// Yee Lim — premium page transitions (Swup SPA). Loaded LAST in the bundle.
//
// Internal navigation between the participating public pages becomes an in-place
// content swap with a fast cross-fade + rise, so the navbar and footer stay put
// and the site feels like an app. Non-participating destinations (home, about,
// admin) and every external / mailto / tel / download / new-tab link fall back
// to a normal full-page navigation. Respects prefers-reduced-motion.
(function () {
  if (typeof Swup === "undefined") {
    console.warn("[Yee Lim] Swup not loaded; page transitions disabled (normal navigation still works).");
    return;
  }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Pages that take part in the SPA. Anything else (admin, external) navigates
  // normally. "/" and "/index" both resolve to the home page.
  // SWUP-002: /about joined the list once the teammate-owned Home and About
  // pages gained the Swup shell (#swup + <main id="mainContent">) and started
  // loading this bundle. Before that they were excluded because their markup
  // had no container for Swup to swap, so every link to them was a full reload.
  // They keep their own styles.css — participation needs the shell, not a
  // shared stylesheet.
  var PARTICIPATING = ["/", "/index", "/about", "/products", "/product-detail", "/compare", "/enquiry", "/contact"];
  function pathOf(url) {
    try { return new URL(url, location.origin).pathname.replace(/\.html$/, "") || "/"; }
    catch (e) { return "/"; }
  }
  function participates(url) { return PARTICIPATING.indexOf(pathOf(url)) !== -1; }

  // ─── Transition + progress-bar CSS ────────────────────────────
  // NOTE: the container fade must NOT use transform / will-change:transform.
  // Either one makes #swup the containing block for its position:fixed children
  // (compare tray, toast, mobile filter drawer, search dropdown), which would
  // trap them inside the scrolling page instead of pinning them to the viewport.
  // A pure opacity cross-fade keeps those overlays correct.
  var style = document.createElement("style");
  style.textContent =
    "#swup{will-change:opacity}" +
    (reduce ? "" :
      // PT-001: asymmetric, and deliberately so. The old symmetric .22s fade
      // ran the page all the way down to opacity 0 and held it there while the
      // swap happened, so every navigation showed a blank screen for a beat —
      // that empty moment is what made it feel wrong, not the speed.
      // Leaving is now fast and decisive (.14s ease-in, barely registered);
      // arriving is slower and eased-out (.30s expo), which is what reads as
      // smooth. Opacity only: a transform on #swup would make it the containing
      // block for its position:fixed children (compare tray, toast, filter
      // drawer) and trap them inside the scrolling page.
      ".transition-fade{transition:opacity .30s cubic-bezier(.16,1,.3,1)}" +
      "html.is-animating .transition-fade{opacity:0;transition:opacity .14s cubic-bezier(.4,0,1,1)}"
    ) +
    "#yl-pt-bar{position:fixed;top:0;left:0;height:2px;width:100%;background:#CC2929;" +
      "transform:scaleX(0);transform-origin:0 50%;z-index:10000;opacity:0;" +
      "transition:transform .2s ease,opacity .25s ease;pointer-events:none}" +
    "#yl-pt-bar.show{opacity:1}";
  document.head.appendChild(style);

  // ─── Thin top progress bar ────────────────────────────────────
  var bar = document.createElement("div");
  bar.id = "yl-pt-bar";
  function mountBar() { if (!bar.parentNode) document.body.appendChild(bar); }
  if (document.body) mountBar();
  else document.addEventListener("DOMContentLoaded", mountBar);

  var barTimer = null, barProg = 0;
  // PT-002: the bar used to appear the instant a visit began, so a navigation
  // that finished in ~250ms still flashed a red line across the top of the
  // screen and then yanked it away. On a local or cached page that is pure
  // noise, and it is a large part of why a fast transition felt busy.
  // It now waits: if the visit completes within GRACE it is never shown at all,
  // and it only earns its place when there is genuinely something to wait for.
  var BAR_GRACE_MS = 300;
  var barGrace = null;
  function startBar() {
    clearTimeout(barGrace);
    clearTimeout(barTimer);
    barGrace = setTimeout(function () {
      mountBar();
      barProg = 0.09;
      bar.classList.add("show");
      bar.style.transform = "scaleX(0.09)";
      barTimer = setTimeout(tickBar, 200);
    }, BAR_GRACE_MS);
  }
  function tickBar() {
    barProg = Math.min(0.9, barProg + 0.12);
    bar.style.transform = "scaleX(" + barProg + ")";
    barTimer = setTimeout(tickBar, 320);
  }
  function endBar() {
    clearTimeout(barGrace);   // a fast visit never gets a bar at all
    clearTimeout(barTimer);
    if (!bar.classList.contains("show")) return;
    bar.style.transform = "scaleX(1)";
    setTimeout(function () { bar.classList.remove("show"); bar.style.transform = "scaleX(0)"; }, 220);
  }

  // ─── Scroll memory (approximate back/forward restoration) ─────
  var scrollMem = {};
  var popped = false;
  window.addEventListener("popstate", function () { popped = true; });
  window.addEventListener("scroll", function () {
    scrollMem[pathOf(location.href)] = window.pageYOffset;
  }, { passive: true });

  // ─── Swup ─────────────────────────────────────────────────────
  // Exposed so other widgets can re-render the current page through the SPA
  // instead of falling back to location.reload(). i18n.js uses it for the
  // language switch (LANG-001).
  var swup = window.ylSwup = new Swup({
    containers: ["#swup"],
    animationSelector: '[class*="transition-"]',
    linkSelector: "a[href]",
    // Only SPA-navigate between participating pages; everything else falls back
    // to a full browser navigation.
    ignoreVisit: function (url) { return !participates(url); }
  });

  function afterSwap() {
    if (typeof window.ylApplyI18n === "function") {
      // Whole document, not just #swup: the persistent navbar and footer are
      // outside the swap container, and a language change has to reach them
      // too. Re-applying to already-correct elements is a cheap no-op.
      window.ylApplyI18n(document);
    }
    if (typeof window.ylSyncNavLang === "function") window.ylSyncNavLang();
    if (typeof window.ylRunReady === "function") window.ylRunReady();

    // Tidy up chrome that some pages inject into <body> but others must not show.
    if (!document.getElementById("compareTray")) {
      document.body.classList.remove("compare-open");
      document.documentElement.style.removeProperty("--compare-tray-height");
    }
    if (pathOf(location.href) !== "/product-detail") {
      var cta = document.getElementById("stickyCta");
      if (cta) cta.remove();
      document.body.classList.remove("detail-has-cta");
      document.body.style.paddingBottom = ""; // drop the measured CTA reservation
    }

    updateNavActive();
    restoreScroll();
  }

  function updateNavActive() {
    // navbar.js owns exact-route active matching and applies it to the desktop
    // row AND the mobile drawer. Product detail and compare therefore do not
    // inherit the Products state. Calling its helper keeps a swap identical to
    // a direct page load instead of maintaining a second, diverging copy here.
    if (typeof window.ylSyncNavActive === "function") window.ylSyncNavActive();
    // Close the mobile drawer if it was left open by the tap that navigated.
    var drawer = document.getElementById("_navDrawer");
    if (drawer) drawer.classList.remove("open");
    var burger = document.getElementById("_navHamburger");
    if (burger) {
      burger.setAttribute("aria-expanded", "false");
      burger.setAttribute("aria-label", "Open navigation menu");
    }
  }

  function restoreScroll() {
    // Back/forward: return to the remembered position.
    if (popped) {
      popped = false;
      var y = scrollMem[pathOf(location.href)];
      if (typeof y === "number") { window.scrollTo(0, y); return; }
    }
    // A filtered products deep-link scrolls itself (products.js), so leave it.
    if (pathOf(location.href) === "/products") {
      var usp = new URLSearchParams(location.search);
      if (usp.has("brand") || usp.has("industry") || usp.has("surface") || usp.has("type")) return;
    }
    // Hash target (e.g. breadcrumb "/products#catalogue").
    if (location.hash) {
      var el = document.getElementById(location.hash.slice(1));
      if (el) {
        var nav = document.querySelector(".nav");
        var off = (nav ? nav.offsetHeight : 0) + 8;
        window.scrollTo(0, Math.max(el.getBoundingClientRect().top + window.pageYOffset - off, 0));
        return;
      }
    }
    window.scrollTo(0, 0);
  }

  swup.hooks.on("visit:start", startBar);
  swup.hooks.on("content:replace", afterSwap);
  swup.hooks.on("page:view", endBar);
  swup.hooks.on("visit:end", endBar);
})();
