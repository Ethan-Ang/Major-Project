(function () {
  // ─── Inject nav CSS ───────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    .nav {
      background: #111827;
      color: #fff;
      position: sticky;
      top: 0;
      z-index: 100;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      padding: 0 2rem;
      height: 60px;
      box-sizing: border-box;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
    }
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
      color: #d4d8e0;
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
    .nav-basket {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      color: #fff;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #CC2929;
      padding: 0.38rem 0.85rem;
      border-radius: 6px;
      transition: background 0.2s, box-shadow 0.2s;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .nav-basket:hover {
      background: #b62525;
      box-shadow: 0 2px 8px rgba(204, 41, 41, 0.28);
    }
    .nav-basket:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    .nav-basket svg { flex-shrink: 0; opacity: 0.9; }
    .nav-basket-label-short { display: none; }
    /* Crisp white badge with red text reads clean on the red button. Squared
       corners (3px) match the de-pilled 6px button; min-width lets 2+ digits
       grow horizontally. */
    .nav-basket-count {
      background: #fff;
      color: #CC2929;
      font-size: 0.72rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      border-radius: 3px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
    .nav-basket-count.is-empty { display: none; }

    /* Compact mobile enquiry indicator: a small envelope + count chip shown in
       the header only on narrow mobile and only when products are selected. It
       replaces the full red pill so the header (logo / indicator / hamburger)
       does not feel crowded. Hidden on tablet/desktop. */
    .nav-enquiry-compact {
      display: none;
      align-items: center;
      gap: 0.3rem;
      height: 36px;
      padding: 0 0.65rem;
      color: #fff;
      text-decoration: none;
      background: #CC2929;
      border-radius: 999px;
      font-size: 0.82rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      flex-shrink: 0;
    }
    .nav-enquiry-compact:hover { background: #b62525; }
    .nav-enquiry-compact:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    .nav-enquiry-compact svg { width: 16px; height: 16px; opacity: 0.95; }

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
    .nav-mobile-drawer {
      background: #0b1220;
      display: none;
      flex-direction: column;
      padding: 0.5rem 1.25rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
    }
    .nav-mobile-drawer.open { display: flex; }
    .nav-mobile-drawer a {
      color: #d4d8e0;
      text-decoration: none;
      font-size: 0.98rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 0.85rem 0.25rem;
      border-bottom: 1px solid #1c2433;
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
      /* Narrow mobile: clean header = logo, compact enquiry chip (only when
         products are selected), hamburger. The full red pill is hidden here;
         Product Enquiry stays reachable in the drawer. */
      .nav { padding: 0 1rem; gap: 0.4rem; }
      .nav-logo-img { height: 32px; }
      .nav-right { gap: 0.5rem; }
      .nav-basket { display: none; }
      .nav-enquiry-compact.has-items { display: inline-flex; }
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
      <a href="/enquiry" class="nav-enquiry-compact" id="navEnquiryCompact" aria-label="Product Enquiry">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"></path><path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"></path></svg>
        <span id="navEnquiryCompactCount">${getBasketCount()}</span>
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

  // ─── Insert at top of body ────────────────────────────────────
  function insert() {
    document.body.insertBefore(drawerEl, document.body.firstChild);
    document.body.insertBefore(navEl, document.body.firstChild);

    document.getElementById("_navHamburger").addEventListener("click", function () {
      const drawer = document.getElementById("_navDrawer");
      const isOpen = drawer.classList.toggle("open");
      this.setAttribute("aria-expanded", isOpen ? "true" : "false");
      this.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    });

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

    // Compact mobile indicator: visible only when products are selected.
    const compactEl = document.getElementById("navEnquiryCompact");
    const compactCountEl = document.getElementById("navEnquiryCompactCount");
    if (compactEl) {
      compactEl.classList.toggle("has-items", n > 0);
      compactEl.setAttribute("aria-label", `Product Enquiry, ${n} selected product${n === 1 ? "" : "s"}`);
    }
    if (compactCountEl) compactCountEl.textContent = n;

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