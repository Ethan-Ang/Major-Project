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

  // Pages that take part in the SPA. Anything else (about, admin, external)
  // navigates normally. "/" and "/index" both resolve to the home page, which
  // now runs the same unified bundle as the other public pages.
  var PARTICIPATING = ["/", "/index", "/products", "/product-detail", "/compare", "/enquiry", "/contact"];
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
      ".transition-fade{transition:opacity .22s cubic-bezier(.4,0,.2,1)}" +
      "html.is-animating .transition-fade{opacity:0}"
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
  function startBar() {
    mountBar();
    clearTimeout(barTimer);
    barProg = 0.09;
    bar.classList.add("show");
    bar.style.transform = "scaleX(0.09)";
    barTimer = setTimeout(tickBar, 200);
  }
  function tickBar() {
    barProg = Math.min(0.9, barProg + 0.12);
    bar.style.transform = "scaleX(" + barProg + ")";
    barTimer = setTimeout(tickBar, 320);
  }
  function endBar() {
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
  var swup = new Swup({
    containers: ["#swup"],
    animationSelector: '[class*="transition-"]',
    linkSelector: "a[href]",
    // Only SPA-navigate between participating pages; everything else falls back
    // to a full browser navigation.
    ignoreVisit: function (url) { return !participates(url); }
  });

  function afterSwap() {
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
    // navbar.js owns the rule for what counts as "active" (Products stays lit
    // across product-detail and compare) and applies it to the desktop row AND
    // the mobile drawer. Calling its helper keeps a swap identical to a direct
    // page load instead of maintaining a second, diverging copy here.
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
