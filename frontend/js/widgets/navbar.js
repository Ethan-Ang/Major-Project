(function () {
  // ─── Inject nav CSS ───────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    .nav {
      background: #1a1712;
      color: #fff;
      position: sticky;
      top: 0;
      z-index: 100;
      /* Anchor the nav across page transitions: it keeps its own view-transition
         group, so during a cross-document navigation the content cross-fades and
         rises while the bar stays perfectly still. */
      view-transition-name: yl-nav;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      padding: 0 2rem;
      height: 60px;
      box-sizing: border-box;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      /* Flat at the top (blends into the dark hero); lifts with a soft shadow
         once the page scrolls, so the bar reads as elevated over the content. */
      box-shadow: none;
      transition: box-shadow 0.25s ease;
    }
    .nav.is-scrolled { box-shadow: 0 6px 20px -6px rgba(16, 13, 9, 0.35); }
    /* While the mobile drawer is open, the page scroll is locked with
       body { overflow: hidden }. On a scrolled page that knocks the sticky bar
       out of its sticky context, so it drops to the document top (off-screen)
       and leaves a 60px gap above the drawer where the page shows through. Pin
       the bar explicitly for that state so it stays glued to the viewport top. */
    body.nav-drawer-open .nav { position: fixed; top: 0; left: 0; right: 0; }
    @media (prefers-reduced-motion: reduce) { .nav { transition: none; } }
    .nav-logo {
      justify-self: start;
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      color: #fff;
      text-decoration: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .nav-logo-img {
      height: 38px;
      width: auto;
      display: block;
    }
    .nav-links {
      display: flex;
      gap: 1.5rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .nav-links a {
      position: relative;
      color: #cdc7b9;
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 500;
      letter-spacing: 0.05em;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      transition: color 0.2s ease;
    }
    /* Brand-red underline that grows in on hover and stays lit on the active
       page. transform-based so it animates smoothly without reflow. */
    .nav-links a::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      bottom: -6px;
      height: 2px;
      border-radius: 1px;
      background: #CC2929;
      transform: scaleX(0);
      transform-origin: center;
      transition: transform 0.2s ease;
    }
    .nav-links a:hover { color: #fff; }
    .nav-links a:hover::after { transform: scaleX(1); }
    .nav-links a.nav-active { color: #fff; font-weight: 600; }
    .nav-links a.nav-active::after { transform: scaleX(1); }
    .nav-right {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      justify-self: end;
      flex-shrink: 0;
    }
    /* Outlined enquiry control on the dark bar (locked final design): white
       hairline border, white label, red circular count badge. */
    .nav-basket {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: #fff;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.38);
      padding: 0.42rem 0.85rem;
      border-radius: 6px;
      transition: border-color 0.2s, background 0.2s;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .nav-basket:hover {
      border-color: rgba(255, 255, 255, 0.75);
      background: rgba(255, 255, 255, 0.06);
    }
    .nav-basket:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    .nav-basket svg { flex-shrink: 0; opacity: 0.9; }
    .nav-basket-label-short { display: none; }
    .nav-basket-count {
      background: #CC2929;
      color: #fff;
      font-size: 0.72rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      border-radius: 999px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
    .nav-basket-count.is-empty { display: none; }

    /* Count chip on the drawer "Product Enquiry" link. */
    .nav-drawer-count {
      display: none;
      margin-left: 0.5rem;
      background: #CC2929;
      color: #fff;
      font-size: 0.72rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      border-radius: 999px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      vertical-align: middle;
      text-align: center;
      line-height: 18px;
    }
    .nav-drawer-count.has-items { display: inline-block; }
    .nav-compare,
    .nav-compare-count { display: none !important; }
    .nav-hamburger {
      display: none;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;
      background: none;
      border: none;
      color: #fff;
      font-size: 1.4rem;
      cursor: pointer;
      padding: 0.45rem 0.55rem;
      line-height: 1;
      border-radius: 8px;
    }
    .nav-hamburger:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    /* Fixed overlay anchored under the 60px sticky nav, so opening it floats over
       the page instead of pushing content down. */
    .nav-mobile-drawer {
      background: #17130e;
      display: none;
      flex-direction: column;
      padding: 0.5rem 1.25rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
      position: fixed;
      top: 60px;
      left: 0;
      right: 0;
      max-height: calc(100dvh - 60px);
      overflow-y: auto;
      z-index: 99;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.35);
    }
    .nav-mobile-drawer.open { display: flex; }
    /* Dimmed backdrop below the drawer; click anywhere on it to close. */
    .nav-mobile-backdrop {
      display: none;
      position: fixed;
      top: 60px;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(16, 13, 9, 0.55);
      z-index: 98;
    }
    .nav-mobile-backdrop.open { display: block; }
    .nav-mobile-drawer a {
      color: #cdc7b9;
      text-decoration: none;
      font-size: 0.98rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 0.85rem 0.25rem;
      border-bottom: 1px solid #2a2418;
      transition: color 0.2s;
    }
    .nav-mobile-drawer a:last-child { border-bottom: none; }
    .nav-mobile-drawer a:hover { color: #fff; }
    @media (max-width: 768px) {
      /* With the centre nav-links hidden, only the logo and the right-hand
         cluster remain. Switch to a two-column grid so the right cluster (count
         chip + hamburger) pins to the right edge instead of auto-placing into
         the middle "auto" column. */
      .nav { grid-template-columns: 1fr auto; }
      .nav-links { display: none; }
      .nav-compare { display: none !important; }
      .nav-hamburger { display: inline-flex; }
    }
    @media (max-width: 480px) {
      /* Narrow mobile keeps the SAME arrangement as every other page width:
         logo left, outlined Product Enquiry control, hamburger right (locked
         final design). Only the paddings compress. */
      .nav { padding: 0 1rem; gap: 0.4rem; }
      .nav-logo-img { height: 32px; }
      .nav-right { gap: 0.45rem; }
      .nav-basket { font-size: 0.78rem; padding: 0.38rem 0.6rem; gap: 0.4rem; }
      .nav-hamburger { min-width: 40px; padding: 0.4rem 0.4rem; }
    }
  `;
  document.head.appendChild(style);

  // ─── Detect active page ───────────────────────────────────────
  const page = window.location.pathname.split("/").pop().replace(".html", "") || "home";
  function isActive(name) {
    if (name === "home" && (page === "home" || page === "")) return true;
    return page === name;
  }

  // ─── Basket count ─────────────────────────────────────────────
  function getBasketCount() {
    return JSON.parse(localStorage.getItem("enquiryBasket") || "[]").length;
  }

  function getCompareCount() {
    return JSON.parse(localStorage.getItem("compareList") || "[]").length;
  }

  // ─── Build nav HTML ───────────────────────────────────────────
  const links = [
    { name: "home",     label: "Home",    href: "/" },
    { name: "products", label: "Products", href: "/products" },
    { name: "about",    label: "About",   href: "/about" },
    { name: "contact",  label: "Contact", href: "/contact" },
  ];

  const navEl = document.createElement("nav");
  navEl.className = "nav";
  navEl.innerHTML = `
    <a href="/" class="nav-logo" aria-label="Yee Lim Adhesives Industries home">
      <img src="/images/logos/YLAI-nav.png" alt="Yee Lim Adhesives Industries" class="nav-logo-img">
    </a>
    <ul class="nav-links">
      ${links.map(l => `
        <li><a href="${l.href}" ${isActive(l.name) ? 'class="nav-active"' : ""}>${l.label}</a></li>
      `).join("")}
    </ul>
    <div class="nav-right">
      <a href="/enquiry" class="nav-basket">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"></path><path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"></path></svg>
        <span class="nav-basket-label nav-basket-label-full">Product Enquiry</span>
        <span class="nav-basket-count" id="basketCount">${getBasketCount()}</span>
      </a>
      <button class="nav-hamburger" id="_navHamburger" aria-label="Open navigation menu" aria-expanded="false" aria-controls="_navDrawer">&#9776;</button>
    </div>
  `;

  const drawerEl = document.createElement("div");
  drawerEl.className = "nav-mobile-drawer";
  drawerEl.id = "_navDrawer";
  drawerEl.innerHTML = `
    ${links.map(l => `<a href="${l.href}">${l.label}</a>`).join("")}
    <a href="/enquiry">Product Enquiry<span class="nav-drawer-count" id="navDrawerCount">${getBasketCount()}</span></a>
  `;

  const backdropEl = document.createElement("div");
  backdropEl.className = "nav-mobile-backdrop";
  backdropEl.id = "_navBackdrop";

  // ─── Insert at top of body ────────────────────────────────────
  function insert() {
    document.body.insertBefore(backdropEl, document.body.firstChild);
    document.body.insertBefore(drawerEl, document.body.firstChild);
    document.body.insertBefore(navEl, document.body.firstChild);

    const hamburger = document.getElementById("_navHamburger");

    function openDrawer() {
      drawerEl.classList.add("open");
      backdropEl.classList.add("open");
      document.body.classList.add("nav-drawer-open"); // pins the sticky bar (see CSS)
      document.body.style.overflow = "hidden"; // lock page scroll behind the overlay
      hamburger.setAttribute("aria-expanded", "true");
      hamburger.setAttribute("aria-label", "Close navigation menu");
    }
    function closeDrawer() {
      drawerEl.classList.remove("open");
      backdropEl.classList.remove("open");
      document.body.classList.remove("nav-drawer-open");
      document.body.style.overflow = "";
      hamburger.setAttribute("aria-expanded", "false");
      hamburger.setAttribute("aria-label", "Open navigation menu");
    }

    hamburger.addEventListener("click", () => {
      drawerEl.classList.contains("open") ? closeDrawer() : openDrawer();
    });
    backdropEl.addEventListener("click", closeDrawer);
    // Close when a drawer link is tapped (before the navigation happens).
    drawerEl.addEventListener("click", (e) => { if (e.target.closest("a")) closeDrawer(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && drawerEl.classList.contains("open")) closeDrawer();
    });

    // Elevate the bar with a soft shadow once the page scrolls off the top.
    let ticking = false;
    function syncElevation() {
      navEl.classList.toggle("is-scrolled", window.scrollY > 8);
      ticking = false;
    }
    window.addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(syncElevation); }
    }, { passive: true });
    syncElevation();

    // Keep basket + compare counts live
    window.addEventListener("storage", updateCounts);
    window.addEventListener("basketUpdated", updateCounts);
    window.addEventListener("compareUpdated", updateCounts);
    updateCounts();
  }

  function updateCounts() {
    const n = getBasketCount();

    const basketEl = document.getElementById("basketCount");
    if (basketEl) {
      basketEl.textContent = n;
      basketEl.classList.toggle("is-empty", n === 0);
    }

    // Drawer "Product Enquiry" count.
    const drawerCountEl = document.getElementById("navDrawerCount");
    if (drawerCountEl) {
      drawerCountEl.textContent = n;
      drawerCountEl.classList.toggle("has-items", n > 0);
    }

    const compareCountEl = document.getElementById("navCompareCount");
    const compareLinkEl  = document.getElementById("navCompareLink");
    const compareN = getCompareCount();
    if (compareCountEl) compareCountEl.textContent = compareN;
    if (compareLinkEl)  compareLinkEl.classList.toggle("visible", compareN > 0);
  }

  if (document.body) {
    insert();
  } else {
    document.addEventListener("DOMContentLoaded", insert);
  }
})();