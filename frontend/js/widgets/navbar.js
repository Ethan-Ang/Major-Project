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
      display: flex;
      align-items: center;
      gap: 0.4rem;
      color: #fff;
      text-decoration: none;
      font-size: 0.9rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #CC2929;
      padding: 0.4rem 0.9rem;
      border-radius: 6px;
      transition: background 0.2s;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .nav-basket:hover { background: #a82020; }
    .nav-basket-count {
      background: #fff;
      color: #CC2929;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
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
    .nav-signin {
      color: #d1d5db;
      text-decoration: none;
      font-size: 0.875rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 0.4rem 0.65rem;
      border-radius: 6px;
      transition: color 0.2s, background 0.2s;
      white-space: nowrap;
      flex-shrink: 0;
      font-weight: 500;
    }
    .nav-signin:hover { color: #fff; background: rgba(255,255,255,0.06); }

    .floating-whatsapp {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 999;
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      background: #25D366;
      color: #fff;
      text-decoration: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 0.9rem;
      font-weight: 700;
      padding: 0.85rem 1.05rem;
      border-radius: 999px;
      box-shadow: 0 12px 30px rgba(0,0,0,0.22);
      transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
    }

    .floating-whatsapp:hover {
      background: #1ebe5d;
      color: #fff;
      transform: translateY(-2px);
      box-shadow: 0 16px 36px rgba(0,0,0,0.28);
    }

    .floating-whatsapp-icon {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(255,255,255,0.22);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
    }

    @media (max-width: 768px) {
      .nav-links { display: none; }
      .nav-signin { display: none; }
      .nav-compare { display: none !important; }
      .nav-hamburger { display: block; }

      .floating-whatsapp {
        right: 16px;
        bottom: 16px;
        padding: 0.8rem 0.9rem;
        font-size: 0.85rem;
      }
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
    { name: "home",     label: "Home",    href: "home.html" },
    { name: "products", label: "Products", href: "products.html" },
    { name: "about",    label: "About",   href: "about.html" },
    { name: "contact",  label: "Contact", href: "contact.html" },
  ];

  const navEl = document.createElement("nav");
  navEl.className = "nav";
  navEl.innerHTML = `
    <a href="home.html" class="nav-logo" aria-label="Yee Lim home">
      <span class="nav-logo-mark" aria-hidden="true">YL</span>
      <span class="nav-logo-text">YEE LIM</span>
    </a>
    <ul class="nav-links">
      ${links.map(l => `
        <li><a href="${l.href}" ${isActive(l.name) ? 'class="nav-active"' : ""}>${l.label}</a></li>
      `).join("")}
    </ul>
    <div class="nav-right">
      <a href="auth/login.html" class="nav-signin">Sign In</a>
      <a href="enquiry.html" class="nav-basket">
        Enquiry Basket
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
    <a href="enquiry.html">Enquiry Basket</a>
    <a href="auth/login.html">Sign In</a>
  `;

  const whatsappNumber = "6588755786"; // Replace with Yee Lim's actual WhatsApp number
  const whatsappMessage = encodeURIComponent("Hello Yee Lim, I would like to enquire about your adhesive products.");
  const whatsappEl = document.createElement("a");
  whatsappEl.className = "floating-whatsapp";
  whatsappEl.href = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;
  whatsappEl.target = "_blank";
  whatsappEl.rel = "noopener noreferrer";
  whatsappEl.setAttribute("aria-label", "Chat with Yee Lim on WhatsApp");
  whatsappEl.innerHTML = `
    <span class="floating-whatsapp-icon" aria-hidden="true">☎</span>
    <span>WhatsApp Us</span>
  `;

  // ─── Insert at top of body ────────────────────────────────────
  function insert() {
    document.body.insertBefore(drawerEl, document.body.firstChild);
    document.body.insertBefore(navEl, document.body.firstChild);
    document.body.appendChild(whatsappEl);

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
    if (basketEl) basketEl.textContent = getBasketCount();

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