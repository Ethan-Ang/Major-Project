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
    .nav-logo-mark {
      width: 30px;
      height: 30px;
      background: #CC2929;
      color: #fff;
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .nav-logo-text {
      font-size: 1.02rem;
      font-weight: 700;
      color: #fff;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    .nav-links {
      display: flex;
      gap: 1.5rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .nav-links a {
      color: #ccc;
      text-decoration: none;
      font-size: 0.9rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      transition: color 0.2s;
    }
    .nav-links a:hover { color: #fff; }
    .nav-links a.nav-active { color: #fff; }
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
      gap: 0.5rem;
      color: #fff;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #CC2929;
      padding: 0.45rem 1rem;
      border-radius: 999px;
      transition: background 0.2s, box-shadow 0.2s;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .nav-basket:hover {
      background: #a82020;
      box-shadow: 0 2px 10px rgba(204, 41, 41, 0.35);
    }
    .nav-basket svg { flex-shrink: 0; opacity: 0.95; }
    .nav-basket-count {
      background: rgba(0, 0, 0, 0.28);
      color: #fff;
      font-size: 0.72rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      border-radius: 999px;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
    .nav-basket-count.is-empty { display: none; }
    .nav-compare,
    .nav-compare-count { display: none !important; }
    .nav-hamburger {
      display: none;
      background: none;
      border: none;
      color: #fff;
      font-size: 1.4rem;
      cursor: pointer;
      padding: 0.2rem 0.4rem;
      line-height: 1;
    }
    .nav-mobile-drawer {
      background: #0b1220;
      display: none;
      flex-direction: column;
      padding: 0.75rem 2rem;
    }
    .nav-mobile-drawer.open { display: flex; }
    .nav-mobile-drawer a {
      color: #ccc;
      text-decoration: none;
      font-size: 0.95rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 0.65rem 0;
      border-bottom: 1px solid #222;
      transition: color 0.2s;
    }
    .nav-mobile-drawer a:last-child { border-bottom: none; }
    .nav-mobile-drawer a:hover { color: #fff; }
    @media (max-width: 768px) {
      .nav-links { display: none; }
      .nav-compare { display: none !important; }
      .nav-hamburger { display: block; }
    }
    @media (max-width: 480px) {
      .nav-logo-text { font-size: 0.85rem; }
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
    { name: "home",     label: "Home",    href: "index.html" },
    { name: "products", label: "Products", href: "products.html" },
    { name: "about",    label: "About",   href: "about.html" },
    { name: "contact",  label: "Contact", href: "contact.html" },
  ];

  const navEl = document.createElement("nav");
  navEl.className = "nav";
  navEl.innerHTML = `
    <a href="index.html" class="nav-logo" aria-label="Yee Lim home">
      <span class="nav-logo-mark" aria-hidden="true">YL</span>
      <span class="nav-logo-text">YEE LIM</span>
    </a>
    <ul class="nav-links">
      ${links.map(l => `
        <li><a href="${l.href}" ${isActive(l.name) ? 'class="nav-active"' : ""}>${l.label}</a></li>
      `).join("")}
    </ul>
    <div class="nav-right">
      <a href="enquiry.html" class="nav-basket">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"></path><path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"></path></svg>
        Product Enquiry
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
    <a href="enquiry.html">Product Enquiry</a>
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
    const basketEl = document.getElementById("basketCount");
    if (basketEl) {
      const n = getBasketCount();
      basketEl.textContent = n;
      basketEl.classList.toggle("is-empty", n === 0);
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