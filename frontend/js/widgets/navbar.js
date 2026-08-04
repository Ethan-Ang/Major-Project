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
      /* Guaranteed air between the three grid columns, so the centre link row can
         never end up touching the right-hand cluster (logo | links | actions). */
      column-gap: 1.25rem;
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
         ~30px at 1024. Fluid, so the centred group never crowds or over-spreads.
         The floor is 1rem rather than 1.75rem because just above the mobile
         breakpoint (769-820px) the link row plus the actions cluster filled the
         bar exactly, leaving the language switch pressed against "Contact". */
      gap: clamp(1rem, 3vw, 2.75rem);
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
      position: relative;
      color: #cdc7b9;
      text-decoration: none;
      font-size: 0.98rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 0.85rem 0.25rem 0.85rem 0.85rem;
      border-bottom: 1px solid #262421;
      transition: color 0.2s;
    }
    .nav-mobile-drawer a:last-child { border-bottom: none; }
    .nav-mobile-drawer a:hover { color: #fff; }
    /* Current page in the open menu: a short brand-red accent on the leading
       edge plus brighter, heavier text. Restrained on purpose — a filled red
       row would shout over the four quiet items around it. The left padding
       above is shared by every row so the active state never shifts the list. */
    .nav-mobile-drawer a.nav-active {
      color: #fff;
      font-weight: 600;
    }
    .nav-mobile-drawer a.nav-active::before {
      content: "";
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 1.15em;
      border-radius: 2px;
      background: #CC2929;
    }
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
         "Enquiry" (accessible name unchanged). Space is reclaimed from the
         outer padding and the gaps between items FIRST — the touch targets
         themselves stay full size so 中文, Enquiry and the menu all remain
         comfortably tappable on one row. */
      .nav { padding: 0 0.85rem; gap: 0.4rem; }
      .nav-logo-img { height: 32px; }
      .nav-right { gap: 0.1rem; }
      .nav-basket-label-full { display: none; }
      .nav-basket-label-short { display: inline; }
      .nav-basket { font-size: 0.82rem; height: 42px; padding: 0 0.8rem; gap: 0.4rem; margin-left: 0.25rem; }
      .nav-basket svg { width: 15px; height: 15px; }
      .nav-basket-count { min-width: 17px; height: 17px; line-height: 17px; font-size: 0.68rem; padding: 0 4px; }
      .nav-hamburger { min-width: 44px; min-height: 44px; padding: 0.4rem; }
      .nav-lang-btn { min-width: 40px; font-size: 0.86rem; }
    }
    @media (max-width: 380px) {
      /* Very narrow devices (320-380px): still one row with all four items.
         Only the paddings and gaps compress further; the 40px language box,
         the 42px Enquiry chip and the 44px menu button are left alone. */
      .nav { padding: 0 0.55rem; gap: 0.2rem; }
      .nav-logo-img { height: 29px; }
      .nav-right { gap: 0; }
      .nav-basket { padding: 0 0.6rem; gap: 0.3rem; margin-left: 0.1rem; font-size: 0.78rem; }
      .nav-lang-btn { min-width: 38px; padding: 0; }
    }
    /* ─── Language switch ──────────────────────────────────────────
       One borderless control showing only the language you are NOT in
       (中文 on English pages, EN on Chinese ones), so it never reads as a
       second boxed button beside Enquiry and never repeats the current
       state. It stays in the header at EVERY width — language is a global
       utility and a visitor who needs Chinese must not have to read an
       English menu first. The visible label is small type; an invisible
       44px box around it keeps the touch target full size. */
    .nav-lang-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;
      padding: 0 0.2rem;
      background: none;
      border: none;
      color: #cdc7b9;
      font-family: inherit;
      font-size: 0.9rem;
      font-weight: 600;
      line-height: 1;
      letter-spacing: 0.02em;
      cursor: pointer;
      transition: color 0.2s ease;
      flex-shrink: 0;
    }
    .nav-lang-btn:hover { color: #fff; }
    .nav-lang-btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; border-radius: 4px; }

    /* ─── Shared shell (SHELL-001) ──────────────────────────────
       These belong to the shared header/shell, not to any one page's
       stylesheet, so they live here — the one file every public page already
       loads. That is what lets the teammate-owned Home and About join the
       shell without pulling in css/products.css, whose .btn rule (4px radius,
       inline-flex) would otherwise override their 30px pill buttons and
       restyle their body. Previously .skip-link lived in products.css and so
       only existed on the six user-owned pages.
       Values are literal because styles.css does not define the design tokens. */
    .skip-link,
    .nf-skip-link {
      position: fixed;
      top: 0.75rem;
      left: 0.75rem;
      z-index: 1200;
      transform: translateY(-180%);
      padding: 0.65rem 0.9rem;
      border: 1px solid #dad5c8;
      border-radius: 4px;
      background: #ffffff;
      color: #1e1c17;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 0.875rem;
      font-weight: 700;
      text-decoration: none;
      transition: transform 150ms ease-out;
    }
    .skip-link:focus,
    .nf-skip-link:focus {
      transform: translateY(0);
      outline: 2px solid #CC2929;
      outline-offset: 2px;
    }
    #mainContent:focus { outline: none; }
    @media (prefers-reduced-motion: reduce) {
      .skip-link, .nf-skip-link { transition: none; }
    }

    /* Swup shell. The transition itself is the cross-document View Transition
       declared in the page stylesheets; this only guarantees the container is a
       normal block on pages whose own stylesheet has never heard of it. */
    #swup.transition-fade { display: block; }

    /* ANCHOR-001: the navbar is position:sticky and 60px tall, and native
       fragment navigation (/about#heritage typed in, or arriving from a footer
       link) parks the target flush with the viewport top — straight underneath
       it. The section heading was invisible on arrival.
       scroll-margin-top fixes every route at once: the browser's own fragment
       scroll, scrollIntoView, and Swup's restoreScroll all honour it, so they
       cannot disagree. Declared here because the navbar imposes the offset, and
       because Home/About do not load css/products.css. */
    main [id],
    section[id],
    [id][data-anchor] { scroll-margin-top: 68px; }
  `;
  document.head.appendChild(style);

  // ─── Detect active page ───────────────────────────────────────
  // Product Detail and Compare are task pages, so they do not claim a primary
  // navigation item. Product Enquiry is deliberately NOT a menu row (the
  // persistent Enquiry action in the header represents it), so it never lights
  // anything here.
  function currentPage(pathname) {
    return String(pathname || "").split("/").pop().replace(".html", "") || "home";
  }
  function resolveCurrentPage(pathname, override) {
    return String(override || "").trim() || currentPage(pathname);
  }
  function isActivePage(name, page) {
    if (name === "home") return page === "home" || page === "" || page === "index";
    return page === name;
  }
  const page = resolveCurrentPage(window.location.pathname, document.documentElement.getAttribute("data-nav-page"));
  function isActive(name) { return isActivePage(name, page); }

  // ─── Basket count ─────────────────────────────────────────────
  function getBasketCount() {
    return JSON.parse(localStorage.getItem("enquiryBasket") || "[]").length;
  }

  function getCompareCount() {
    return JSON.parse(localStorage.getItem("compareList") || "[]").length;
  }

  // ─── Build nav HTML ───────────────────────────────────────────
  // Labels resolve through the i18n engine when present (owned pages) and fall
  // back to English where it isn't loaded (e.g. teammate-owned home/about).
  var T = function (key, fallback) { return (window.ylLang === "zh" && window.ylT) ? (window.ylT(key) || fallback) : fallback; };
  var curLang = (typeof window.ylLang === "string") ? window.ylLang : "en";
  // Only the language you can switch TO is shown; the current one is never
  // repeated. The accessible name spells the action out in the target language.
  var altLang = curLang === "zh" ? "en" : "zh";
  var altLangLabel = altLang === "zh" ? "中文" : "EN";
  var altLangAria = altLang === "zh" ? "切换到中文 (Switch to Chinese)" : "Switch to English";
  const links = [
    { name: "home",     label: T("nav.home", "Home"),         href: "/", key: "nav.home" },
    { name: "products", label: T("nav.products", "Products"), href: "/products", key: "nav.products" },
    { name: "about",    label: T("nav.about", "About"),       href: "/about", key: "nav.about" },
    { name: "contact",  label: T("nav.contact", "Contact"),   href: "/contact", key: "nav.contact" },
  ];

  const navEl = document.createElement("nav");
  navEl.className = "nav";
  navEl.innerHTML = `
    <a href="/" class="nav-logo" aria-label="Yee Lim Adhesives Industries home">
      <img src="/images/logos/YLAI-nav.png" alt="Yee Lim Adhesives Industries" class="nav-logo-img">
    </a>
    <ul class="nav-links">
      ${links.map(l => `
        <li><a href="${l.href}" data-nav="${l.name}" data-i18n="${l.key}" ${isActive(l.name) ? 'class="nav-active" aria-current="page"' : ""}>${l.label}</a></li>
      `).join("")}
    </ul>
    <div class="nav-right">
      <button type="button" class="nav-lang-btn" data-lang="${altLang}" lang="${altLang === "zh" ? "zh-Hans" : "en"}" aria-label="${altLangAria}">${altLangLabel}</button>
      <a href="/enquiry" class="nav-basket" data-i18n-attr="aria-label:nav.enquiry" aria-label="${T("nav.enquiry", "Enquiry")}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"></path><path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10"></path></svg>
        <span class="nav-basket-label nav-basket-label-full" data-i18n="nav.enquiry">${T("nav.enquiry", "Enquiry")}</span>
        <span class="nav-basket-label nav-basket-label-short" aria-hidden="true" data-i18n="nav.enquiry_short">${T("nav.enquiry_short", "Enquiry")}</span>
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
  // No language control inside the drawer: it now lives in the header at every
  // width, and duplicating it here would give the same global utility two homes.
  drawerEl.innerHTML = links.map(l =>
    `<a href="${l.href}" data-nav="${l.name}" data-i18n="${l.key}" ${isActive(l.name) ? 'class="nav-active" aria-current="page"' : ""}>${l.label}</a>`
  ).join("");

  const backdropEl = document.createElement("div");
  backdropEl.className = "nav-mobile-backdrop";
  backdropEl.id = "_navBackdrop";
  backdropEl.setAttribute("aria-hidden", "true");

  // Keep a page-level skip link ahead of the injected navigation in keyboard
  // order. Pages without one retain the existing shell insertion behavior.
  function preserveSkipLinkFirst(body) {
    var skipLink = body.querySelector("[data-skip-link]");
    if (skipLink) body.insertBefore(skipLink, body.firstChild);
  }

  // ─── Insert at top of body ────────────────────────────────────
  function insert() {
    document.body.insertBefore(backdropEl, document.body.firstChild);
    document.body.insertBefore(drawerEl, document.body.firstChild);
    document.body.insertBefore(navEl, document.body.firstChild);
    preserveSkipLinkFirst(document.body);

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

    // Language switch. ylSetLang stores the choice and reloads IN PLACE, so the
    // visitor stays on the page they were reading (never bounced to Home) and
    // the selection persists across every later page via localStorage.
    document.querySelectorAll(".nav-lang-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var lang = btn.getAttribute("data-lang");
        if (window.ylSetLang) { window.ylSetLang(lang); }
        else { try { localStorage.setItem("ylLang", lang); } catch (e) {} window.location.reload(); }
      });
    });
  }

  // Single source of truth for the current-page state, used on first paint and
  // re-applied by page-transitions.js after every Swup content swap. It covers
  // BOTH the desktop link row and the mobile drawer, so the open menu always
  // shows where the visitor is.
  // LANG-003: flip the language switcher after an in-place language change.
  // The button advertises the language you are NOT in, so its label, lang,
  // aria-label and data-lang must all invert. Nothing else can do this: the
  // value is derived from state, not translated from a key.
  window.ylSyncNavLang = function () {
    var btn = document.querySelector(".nav-lang-btn");
    if (!btn) return;
    var now = (typeof window.ylLang === "string") ? window.ylLang : "en";
    var alt = now === "zh" ? "en" : "zh";
    btn.dataset.lang = alt;
    btn.textContent = alt === "zh" ? "中文" : "EN";
    btn.setAttribute("lang", alt === "zh" ? "zh-Hans" : "en");
    btn.setAttribute("aria-label", alt === "zh"
      ? "切换到中文 (Switch to Chinese)" : "Switch to English");
  };

  window.ylSyncNavActive = function () {
    var current = resolveCurrentPage(window.location.pathname, document.documentElement.getAttribute("data-nav-page"));
    document.querySelectorAll(".nav-links a[data-nav], .nav-mobile-drawer a[data-nav]").forEach(function (a) {
      var on = isActivePage(a.getAttribute("data-nav"), current);
      a.classList.toggle("nav-active", on);
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  };

  // Exposed so page-transitions.js can re-run it after a Swup swap: applying
  // static i18n resets the link's aria-label from data-i18n-attr, which would
  // otherwise drop the attached-product count from the accessible name.
  window.ylSyncNavCounts = updateCounts;

  function updateCounts() {
    const n = getBasketCount();

    const basketEl = document.getElementById("basketCount");
    if (basketEl) {
      basketEl.textContent = n;
      basketEl.classList.toggle("is-empty", n === 0);
    }

    const basketLinkEl = document.querySelector(".nav-basket");
    if (basketLinkEl) {
      // The count describes ATTACHED products, which are optional — at zero the
      // name is just "Enquiry", with no wording implying something is missing.
      // Previously hardcoded English; now translated like every other label.
      var label;
      if (n > 0) {
        var unit = (window.ylLang === "zh") ? "件" : (n === 1 ? "item" : "items");
        label = T("nav.enquiry_count", "Enquiry, {count} {unit} attached")
          .replace("{count}", n).replace("{unit}", unit);
      } else {
        label = T("nav.enquiry", "Enquiry");
      }
      basketLinkEl.setAttribute("aria-label", label);
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
