(function () {
  // ─── Inject nav CSS ───────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    .nav {
      background: #141310; /* deep warm-black (locked ReBond direction), never brown */
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
      /* The dark bar fills edge-to-edge (incl. under the notch via viewport-fit=cover);
         env() keeps the logo/actions out of the landscape notch inset so nothing
         hides, while the background still reaches the screen edge (no cream gap). */
      padding: 0 max(2rem, env(safe-area-inset-right)) 0 max(2rem, env(safe-area-inset-left));
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
    /* Other widgets render asynchronously and may clear body.style.overflow as
       they tear down their own sheets. Keep the nav's scroll lock authoritative
       for exactly as long as its body state class is present. */
    body.nav-drawer-open { overflow: hidden !important; }
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
      /* Professional B2B spacing: ~40-44px between links at 1440, easing down to
         ~30px at 1024. Fluid, so the centred group never crowds or over-spreads. */
      gap: clamp(1.75rem, 3vw, 2.75rem);
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
    /* Outlined enquiry control on the dark bar (locked ReBond design): quiet
       hairline border with a faint fill, white label, red circular count
       badge. Restrained and integrated, not flashy. */
    .nav-basket {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: #fff;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      /* line-height 1: the label's box hugs the glyphs, so flex centring puts
         icon, label and badge on one true vertical axis (the default 1.5 box
         made the badge read slightly low against the text). */
      line-height: 1;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.30);
      height: 36px;
      padding: 0 0.95rem;
      border-radius: 5px;
      transition: border-color 0.2s, background 0.2s;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .nav-basket:hover {
      border-color: rgba(255, 255, 255, 0.7);
      background: rgba(255, 255, 255, 0.08);
    }
    .nav-basket:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    /* Icon nudged 0.5px down: the envelope's visual mass sits high in its
       viewBox, so pure mathematical centring reads a hair proud of the label. */
    .nav-basket svg { flex-shrink: 0; width: 16px; height: 16px; opacity: 0.95; transform: translateY(0.5px); }
    .nav-basket-label { transform: translateY(0.5px); } /* cap-height vs x-height optical balance */
    .nav-basket-label-short { display: none; }
    .nav-basket-count {
      background: #CC2929;
      color: #fff;
      font-size: 0.7rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0;
      border-radius: 999px;
      min-width: 18px;
      height: 18px;
      /* Symmetric padding + a fixed line-height equal to the box height so a
         single digit sits dead-centre; the small translateY drops it onto the
         same optical baseline as the icon + label (which are nudged the same
         0.5px), so the badge no longer reads a hair high against the text. */
      padding: 0 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 18px;
      box-sizing: border-box;
      transform: translateY(0.5px);
    }
    .nav-basket-count.is-empty { display: none; }
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
      background: #131210;
      display: none;
      flex-direction: column;
      padding: 0.5rem 1.25rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
      position: fixed;
      top: 60px;
      left: 0;
      right: 0;
      max-height: calc(100dvh - 60px);
      overflow-y: auto;
      overscroll-behavior: contain;
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
      border-bottom: 1px solid #262421;
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
      .nav-basket { height: 44px; }
      .nav-hamburger { display: inline-flex; }
    }
    @media (max-width: 480px) {
      /* Narrow mobile: swap the long "Product Enquiry" label for the short
         "Enquiry" (accessible name unchanged) and open the spacing up, so the
         logo, enquiry chip and hamburger each get room to breathe instead of
         crowding together. */
      .nav { padding: 0 1rem; gap: 0.5rem; }
      .nav-logo-img { height: 32px; }
      .nav-right { gap: 0.55rem; }
      .nav-basket-label-full { display: none; }
      .nav-basket-label-short { display: inline; }
      .nav-basket { font-size: 0.82rem; height: 42px; padding: 0 0.85rem; gap: 0.45rem; }
      .nav-basket svg { width: 15px; height: 15px; }
      .nav-basket-count { min-width: 17px; height: 17px; line-height: 17px; font-size: 0.68rem; padding: 0 4px; }
      .nav-hamburger { min-width: 44px; min-height: 44px; padding: 0.4rem; }
    }
    @media (max-width: 380px) {
      /* Very narrow devices: keep the short "Enquiry" label and all three
         actions, just compress the paddings a touch further. */
      .nav { padding: 0 0.7rem; gap: 0.35rem; }
      .nav-logo-img { height: 30px; }
      .nav-right { gap: 0.4rem; }
      .nav-basket { padding: 0 0.65rem; gap: 0.35rem; }
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
      <a href="/enquiry" class="nav-basket" aria-label="Product Enquiry">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"></path><path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"></path></svg>
        <span class="nav-basket-label nav-basket-label-full">Product Enquiry</span>
        <span class="nav-basket-label nav-basket-label-short" aria-hidden="true">Enquiry</span>
        <span class="nav-basket-count" id="basketCount">${getBasketCount()}</span>
      </a>
      <button type="button" class="nav-hamburger" id="_navHamburger" aria-label="Open navigation menu" aria-expanded="false" aria-controls="_navDrawer" aria-haspopup="dialog">&#9776;</button>
    </div>
  `;

  const drawerEl = document.createElement("div");
  drawerEl.className = "nav-mobile-drawer";
  drawerEl.id = "_navDrawer";
  drawerEl.setAttribute("role", "dialog");
  drawerEl.setAttribute("aria-modal", "true");
  drawerEl.setAttribute("aria-label", "Site navigation");
  drawerEl.setAttribute("aria-hidden", "true");
  drawerEl.tabIndex = -1;
  drawerEl.innerHTML = `
    ${links.map(l => `<a href="${l.href}">${l.label}</a>`).join("")}
  `;

  const backdropEl = document.createElement("div");
  backdropEl.className = "nav-mobile-backdrop";
  backdropEl.id = "_navBackdrop";
  backdropEl.setAttribute("aria-hidden", "true");

  // ─── Insert at top of body ────────────────────────────────────
  function insert() {
    document.body.insertBefore(backdropEl, document.body.firstChild);
    document.body.insertBefore(drawerEl, document.body.firstChild);
    document.body.insertBefore(navEl, document.body.firstChild);

    const hamburger = document.getElementById("_navHamburger");
    const firstDrawerLink = drawerEl.querySelector("a[href]");
    const mobileNavQuery = window.matchMedia("(max-width: 768px)");
    let drawerRelease = null;
    let bodyOverflowBeforeDrawer = "";

    function focusSafely(element) {
      if (!element || !element.isConnected || typeof element.focus !== "function") return;
      try { element.focus({ preventScroll: true }); }
      catch (e) { try { element.focus(); } catch (ignored) {} }
    }

    // Use the site's shared trap when it has loaded. The fallback mirrors its
    // Tab/Escape behaviour, but is installed only when that helper is absent so
    // one key press can never run two close handlers.
    function fallbackFocusTrap(initialFocus) {
      const selector = 'a[href], button:not([disabled]), input:not([disabled]),' +
                       ' select:not([disabled]), textarea:not([disabled]),' +
                       ' [tabindex]:not([tabindex="-1"])';

      function focusables() {
        return Array.from(drawerEl.querySelectorAll(selector)).filter(element =>
          element.offsetParent !== null || element === document.activeElement
        );
      }

      function onKeydown(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeDrawer();
          return;
        }
        if (event.key !== "Tab") return;
        const items = focusables();
        if (!items.length) { event.preventDefault(); focusSafely(drawerEl); return; }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === first || !drawerEl.contains(active))) {
          event.preventDefault();
          focusSafely(last);
        } else if (!event.shiftKey && (active === last || !drawerEl.contains(active))) {
          event.preventDefault();
          focusSafely(first);
        }
      }

      document.addEventListener("keydown", onKeydown, true);
      setTimeout(() => {
        if (drawerEl.classList.contains("open")) focusSafely(initialFocus || drawerEl);
      }, 0);
      return function release() {
        document.removeEventListener("keydown", onKeydown, true);
      };
    }

    function releaseDrawerTrap() {
      if (!drawerRelease) return;
      const release = drawerRelease;
      drawerRelease = null;
      // Focus is restored explicitly to the hamburger below, so prevent the
      // shared helper from also restoring its captured element.
      try { release(false); } catch (e) {}
    }

    function acquireDrawerTrap() {
      releaseDrawerTrap();
      if (typeof ylFocusTrap === "function") {
        drawerRelease = ylFocusTrap(drawerEl, {
          initialFocus: firstDrawerLink || drawerEl,
          onEscape: closeDrawer
        });
      } else {
        drawerRelease = fallbackFocusTrap(firstDrawerLink || drawerEl);
      }
    }

    // The products filter, mobile compare sheet and compare picker are modal
    // layers too. Close any one that is already active before the nav acquires
    // focus and scroll ownership.
    function closeCompetingLayers() {
      if (document.body.classList.contains("filter-drawer-open") &&
          typeof closeFilterDrawer === "function") {
        closeFilterDrawer(false);
      }
      if (document.getElementById("ylCmpPicker") &&
          typeof closeComparePicker === "function") {
        closeComparePicker(false);
      }
      if (document.body.classList.contains("cmp-sheet-open") &&
          typeof toggleCompareTray === "function") {
        toggleCompareTray();
      }
      // A competing close may move focus back to its own trigger. The nav is
      // the newly requested layer, so make its trigger the deterministic return
      // target before the focus trap captures state.
      focusSafely(hamburger);
    }

    function openDrawer() {
      if (drawerEl.classList.contains("open")) return;
      closeCompetingLayers();
      bodyOverflowBeforeDrawer = document.body.style.overflow;
      drawerEl.classList.add("open");
      drawerEl.setAttribute("aria-hidden", "false");
      backdropEl.classList.add("open");
      document.body.classList.add("nav-drawer-open"); // pins the sticky bar (see CSS)
      document.body.style.overflow = "hidden"; // lock page scroll behind the overlay
      hamburger.setAttribute("aria-expanded", "true");
      hamburger.setAttribute("aria-label", "Close navigation menu");
      acquireDrawerTrap();
    }

    function closeDrawer(restoreFocus = true) {
      const hadDrawerState = drawerEl.classList.contains("open") || drawerRelease;
      if (!hadDrawerState) return;
      drawerEl.classList.remove("open");
      drawerEl.setAttribute("aria-hidden", "true");
      backdropEl.classList.remove("open");
      document.body.classList.remove("nav-drawer-open");
      releaseDrawerTrap();
      const anotherModalOwnsScroll =
        document.body.classList.contains("filter-drawer-open") ||
        document.body.classList.contains("cmp-sheet-open") ||
        Boolean(document.getElementById("ylCmpPicker"));
      document.body.style.overflow = anotherModalOwnsScroll ? "hidden" : bodyOverflowBeforeDrawer;
      hamburger.setAttribute("aria-expanded", "false");
      hamburger.setAttribute("aria-label", "Open navigation menu");
      if (restoreFocus && mobileNavQuery.matches) focusSafely(hamburger);
    }

    hamburger.addEventListener("click", () => {
      drawerEl.classList.contains("open") ? closeDrawer() : openDrawer();
    });
    backdropEl.addEventListener("click", closeDrawer);
    // Close when a drawer link is tapped (before the navigation happens).
    drawerEl.addEventListener("click", (e) => { if (e.target.closest("a")) closeDrawer(); });
    // Swup can begin a visit from history or code rather than a drawer click;
    // release modal state before its content swap in all cases.
    document.addEventListener("swup:visit:start", () => closeDrawer(false));
    const onMobileNavChange = (event) => { if (!event.matches) closeDrawer(false); };
    if (typeof mobileNavQuery.addEventListener === "function") {
      mobileNavQuery.addEventListener("change", onMobileNavChange);
    } else {
      mobileNavQuery.addListener(onMobileNavChange);
    }
    window.addEventListener("pagehide", () => closeDrawer(false));

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

    const basketLinkEl = document.querySelector(".nav-basket");
    if (basketLinkEl) {
      basketLinkEl.setAttribute("aria-label", n > 0
        ? `Product Enquiry, ${n} ${n === 1 ? "item" : "items"}`
        : "Product Enquiry");
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
