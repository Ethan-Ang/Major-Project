(function () {
  // ─── Inject footer CSS ────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    .site-footer {
      background: #131210;
      color: #b9b3a6;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 0.875rem;
      line-height: 1.6;
      /* AUDIT (red divider): this rule is the ONLY red horizontal line on the
         site, and because the footer is shared it renders identically on every
         page — including the teammate-owned Home and About — so it is a genuine
         design-system element (the footer boundary), not a leftover on one or two
         pages. Kept for that reason, but restrained from 2px to a 1px hairline:
         at 2px a fully saturated red edge between the cream page and the
         near-black footer read as a hard stripe rather than an accent. No other
         red rule was introduced anywhere to justify it. */
      border-top: 1px solid #CC2929;
    }
    .site-footer-inner {
      max-width: 1280px;
      margin: 0 auto;
      /* env() keeps footer content out of the landscape notch inset; the dark
         .site-footer background still reaches the screen edge (viewport-fit=cover),
         so there's no cream gap beside it. */
      padding: 3.75rem max(1.5rem, env(safe-area-inset-right)) 3rem max(1.5rem, env(safe-area-inset-left));
      display: grid;
      grid-template-columns: 1.55fr 0.85fr 1fr 1.15fr;
      gap: 2.5rem 3.25rem;
    }
    /* Mono-caps column eyebrows: the same industrial label language the pages
       use, quieter than the old Space Grotesk headings. */
    .site-footer-col-title {
      color: #fff;
      font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin: 0 0 1.15rem;
    }
    .site-footer-brand {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 1.05rem;
      text-decoration: none;
    }
    .site-footer-logo {
      height: 44px;
      width: auto;
      display: block;
    }
    .site-footer-blurb {
      margin: 0 0 1.3rem;
      max-width: 36ch;
      font-size: 0.86rem;
      line-height: 1.7;
      color: #a8a294;
    }
    .site-footer-certs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .site-footer-cert {
      font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.62rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #b9b3a6;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 3px;
      padding: 0.3rem 0.6rem;
      white-space: nowrap;
    }
    .site-footer-links {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.75rem;
      font-size: 0.86rem;
    }
    /* A11Y-005: these were 15px-tall inline targets in a 12px-gap stack — well
       under the 24px WCAG 2.2 (2.5.8) minimum and genuinely fiddly on a phone.
       inline-block + min-height gives each link a real 24px box without
       changing the visible type size or the column rhythm. */
    .site-footer-links a,
    .site-footer-contact a {
      display: inline-block;
      min-height: 24px;
      line-height: 24px;
      color: #b9b3a6;
      text-decoration: none;
      transition: color 0.18s;
    }
    .site-footer-links a:hover,
    .site-footer-contact a:hover {
      color: #fff;
      text-decoration: underline;
      text-underline-offset: 3px;
      text-decoration-color: rgba(255, 255, 255, 0.4);
    }
    .site-footer-links a:focus-visible,
    .site-footer-contact a:focus-visible,
    .site-footer-cta:focus-visible {
      outline: 2px solid #CC2929;
      outline-offset: 2px;
      border-radius: 3px;
    }
    .site-footer-contact {
      display: grid;
      gap: 0.9rem;
      margin: 0 0 1.4rem;
    }
    .site-footer-contact dt {
      color: #7d776c;
      font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.62rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 0.2rem;
    }
    .site-footer-contact dd {
      margin: 0;
      font-size: 0.86rem;
      line-height: 1.55;
      color: #cdc7b9;
      overflow-wrap: anywhere;
    }
    /* Both footer CTAs stay brand red. Red is the site's single action colour
       (Add to Enquiry, Compare now, this), and the footer band carries the one
       CTA on the page, so it should hold that weight. It does not duplicate the
       product page's small green icon-only WhatsApp control: different size,
       different placement, different job in the hierarchy. */
    .site-footer-cta {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: #CC2929;
      color: #fff;
      text-decoration: none;
      font-size: 0.84rem;
      font-weight: 600;
      line-height: 1;
      padding: 0.72rem 1.25rem;
      border-radius: 4px;
      transition: background 0.18s;
    }
    .site-footer-cta:hover {
      background: #a82020;
      color: #fff;
    }
    /* Full-bleed hairline above the legal row; the row itself stays on the
       shared 1280px container so the two lines of small print align with the
       columns above at every viewport. */
    .site-footer-bottom-wrap {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .site-footer-bottom {
      max-width: 1280px;
      margin: 0 auto;
      padding: 1.2rem max(1.5rem, env(safe-area-inset-right)) 1.2rem max(1.5rem, env(safe-area-inset-left));
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      font-size: 0.76rem;
      color: #8a847a;
    }
    .site-footer-bottom strong { color: #cdc7b9; font-weight: 600; }
    /* CLIENT-007: the public Admin Login link was removed at the client's
       request (they bookmark /admin/login.html directly). The login page and
       its authentication are unchanged; this is discoverability, not a
       security control. */

    @media (max-width: 900px) {
      .site-footer-inner { grid-template-columns: 1fr 1fr; gap: 2rem; }
      .site-footer-col-brand { grid-column: 1 / -1; }
    }
    /* Mobile: keep it short and premium. The two link groups sit side by side
       instead of stacking, the marketing blurb is dropped, contact spans full
       width, and spacing tightens so the footer is not a long single column. */
    @media (max-width: 560px) {
      .site-footer-inner {
        grid-template-columns: 1fr 1fr;
        gap: 1.35rem 1.25rem;
        padding: 2rem 1.25rem 1.25rem;
      }
      .site-footer-col-brand { grid-column: 1 / -1; margin-bottom: 0.1rem; }
      .site-footer-blurb { display: none; }
      .site-footer-logo { height: 42px; }
      .site-footer-col:last-child { grid-column: 1 / -1; }
      .site-footer-col-title { margin-bottom: 0.55rem; }
      .site-footer-links { gap: 0.5rem; }
      .site-footer-contact { gap: 0.5rem; margin-bottom: 0.8rem; }
      .site-footer-bottom {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.3rem;
        padding: 0.9rem max(1.25rem, env(safe-area-inset-right)) calc(0.9rem + env(safe-area-inset-bottom, 0px)) max(1.25rem, env(safe-area-inset-left));
      }
    }

    /* ── Compact mobile footer (≤640px), matching the prototype ──────────
       The desktop grid footer + bottom bar (incl. Admin Login) are hidden on
       phones and replaced by .site-footer-mobile; desktop/tablet untouched. */
    .site-footer-mobile { display: none; }
    @media (max-width: 640px) {
      .site-footer-inner,
      .site-footer-bottom-wrap { display: none; }
      .site-footer-mobile {
        display: block;
        padding: 1.9rem 1.25rem calc(1.15rem + env(safe-area-inset-bottom, 0px));
      }
      .sfm-brand-row { display: flex; align-items: flex-start; gap: 0.85rem; margin-bottom: 1rem; }
      .sfm-logo { height: 38px; width: auto; flex: 0 0 auto; }
      .sfm-blurb { flex: 1; min-width: 0; margin: 0.15rem 0 0; font-size: 0.72rem; line-height: 1.6; color: #8a847a; }
      .sfm-certs {
        padding-bottom: 1.35rem;
        margin-bottom: 1.35rem;
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      .sfm-cols {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        padding-bottom: 1.35rem;
        margin-bottom: 1.35rem;
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      .sfm-col-title {
        color: #fff;
        font-family: 'Space Grotesk', 'Inter', sans-serif;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin: 0 0 0.75rem;
      }
      .sfm-col .site-footer-links { gap: 0.65rem; font-size: 0.8rem; }
      .sfm-cta-band { display: flex; align-items: center; justify-content: space-between; gap: 0.9rem; }
      .sfm-cta-title {
        margin: 0 0 0.2rem;
        font-family: 'Space Grotesk', 'Inter', sans-serif;
        font-size: 0.9rem;
        font-weight: 600;
        color: #f3efe6;
      }
      .sfm-cta-sub { margin: 0; font-size: 0.72rem; line-height: 1.4; color: #8a847a; }
      .sfm-cta-btn {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        background: #CC2929;
        color: #fff;
        text-decoration: none;
        font-size: 0.8rem;
        font-weight: 700;
        padding: 0.75rem 1rem;
        min-height: 44px;
        box-sizing: border-box;
        border-radius: 8px;
        transition: background 0.15s;
      }
      .sfm-cta-btn:active { background: #b62525; }
      .sfm-address {
        margin: 1.25rem 0 0;
        font-size: 0.72rem;
        line-height: 1.5;
        color: #8a847a;
      }
      .sfm-copyright {
        margin-top: 1rem;
        padding-top: 0.9rem;
        border-top: 1px solid rgba(255,255,255,0.08);
        font-size: 0.7rem;
        color: #8a93a0;
      }
      .sfm-copyright strong { color: #cdc7b9; font-weight: 600; }
    }
  `;
  document.head.appendChild(style);

  // Brand filter deep-links use stable slugs (?brand=deer) so the URL never
  // depends on trademark symbols or exact label punctuation. products.js
  // resolves the slug back to the official display name (FBL-001); the old
  // full-name URLs keep working there too.
  const BRAND_SLUGS = { "Deer™ Brand": "deer", "Horsemen™ Brand": "horsemen", "Premier™ Brand": "premier", "Rhino™ Brand": "rhino" };
  const brandLink = b => `/products?brand=${BRAND_SLUGS[b] || encodeURIComponent(b)}`;
  // Falls back to English where the i18n engine isn't loaded (teammate pages).
  var T = function (key, fallback) { return (window.ylLang === "zh" && window.ylT) ? (window.ylT(key) || fallback) : fallback; };

  // Shared WhatsApp glyph for both footer CTAs, so the two never drift apart.
  const WA_GLYPH = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.8c2.17 0 4.2.85 5.74 2.38a8.06 8.06 0 0 1 2.38 5.73c0 4.47-3.64 8.11-8.12 8.11a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.11.82.83-3.03-.2-.31a8.06 8.06 0 0 1-1.24-4.31c0-4.47 3.64-8.1 8.11-8.1Zm4.68 11.53c-.19-.29-.75-.46-1.57-.86-.3-.15-.7-.36-1-.1-.19.16-.46.5-.62.68-.11.13-.23.14-.42.05a6.6 6.6 0 0 1-1.95-1.2 7.34 7.34 0 0 1-1.35-1.68c-.14-.24-.02-.37.1-.49.11-.11.24-.28.37-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.8-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.19 1.1.16 1.52.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14Z"/></svg>';

  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.setAttribute("role", "contentinfo");
  footer.innerHTML = `
    <div class="site-footer-inner">
      <div class="site-footer-col site-footer-col-brand">
        <a href="/" class="site-footer-brand" aria-label="Yee Lim Adhesives Industries home">
          <img src="/images/logos/YLAI-nav.png" alt="Yee Lim Adhesives Industries" class="site-footer-logo">
        </a>
        <p class="site-footer-blurb" data-i18n="footer.blurb">${T("footer.blurb", "One of Singapore's earliest and largest adhesive manufacturers. For over 50 years we have formulated commercial and industrial adhesive solutions engineered to the job, not off the shelf.")}</p>
        <div class="site-footer-certs" aria-label="Certifications">
          <span class="site-footer-cert" data-i18n="footer.cert_iso">${T("footer.cert_iso", "ISO Certified")}</span>
          <span class="site-footer-cert" data-i18n="footer.cert_green">${T("footer.cert_green", "Singapore Green Label")}</span>
          <span class="site-footer-cert" data-i18n="footer.cert_lowvoc">${T("footer.cert_lowvoc", "Low-VOC / Low-Formaldehyde")}</span>
        </div>
      </div>

      <nav class="site-footer-col" aria-label="Company">
        <p class="site-footer-col-title" data-i18n="footer.company">${T("footer.company", "Company")}</p>
        <ul class="site-footer-links">
          <!-- FBL-002: these used to be the same bare /about link repeated, then
               #heritage and #quality — names the About page never actually used.
               They now name the sections that are really there: #mission on the
               mission section and #values on "Our Values". Both IDs sit on
               sections that already existed; nothing was invented, reworded or
               reordered to justify an anchor. navbar.js gives every section[id]
               a 68px scroll-margin-top (ANCHOR-001), so these land clear of the
               fixed navbar on a direct load and through Swup alike. -->
          <li><a href="/about" data-i18n="footer.about">${T("footer.about", "About Yee Lim")}</a></li>
          <li><a href="/about#mission" data-i18n="about.mission_title">${T("about.mission_title", "Our Mission")}</a></li>
          <li><a href="/about#values" data-i18n="about.values_title">${T("about.values_title", "Our Values")}</a></li>
          <li><a href="/contact" data-i18n="footer.contact_us">${T("footer.contact_us", "Contact Us")}</a></li>
        </ul>
      </nav>

      <nav class="site-footer-col" aria-label="Products and brands">
        <p class="site-footer-col-title" data-i18n="footer.products_brands">${T("footer.products_brands", "Products & Brands")}</p>
        <ul class="site-footer-links">
          <li><a href="/products" data-i18n="footer.all_products">${T("footer.all_products", "All Products")}</a></li>
          <li><a href="${brandLink("Deer™ Brand")}">Deer™ Brand</a></li>
          <li><a href="${brandLink("Horsemen™ Brand")}">Horsemen™ Brand</a></li>
          <li><a href="${brandLink("Premier™ Brand")}">Premier™ Brand</a></li>
          <li><a href="${brandLink("Rhino™ Brand")}">Rhino™ Brand</a></li>
        </ul>
      </nav>

      <div class="site-footer-col">
        <p class="site-footer-col-title" data-i18n="footer.contact_enquiry">${T("footer.contact_enquiry", "Contact & Enquiry")}</p>
        <dl class="site-footer-contact">
          <div>
            <dt data-i18n="footer.address">${T("footer.address", "Address")}</dt>
            <dd data-yl-address>1 Ang Mo Kio Street 65, #03-17, Singapore 569063</dd>
          </div>
          <div>
            <dt data-i18n="footer.email">${T("footer.email", "Email")}</dt>
            <dd><a data-yl-email="text" href="mailto:contact@yeelimadhesives.com.sg">contact@yeelimadhesives.com.sg</a></dd>
          </div>
          <div>
            <dt>WhatsApp</dt>
            <dd><a data-yl-wa data-yl-phone href="https://wa.me/6588755786" target="_blank" rel="noopener noreferrer">+65 8875 5786</a></dd>
          </div>
        </dl>
        <a class="site-footer-cta" data-yl-wa href="https://wa.me/6588755786?text=Hello%20Yee%20Lim%2C%20I%20would%20like%20to%20enquire%20about%20your%20adhesive%20products." target="_blank" rel="noopener noreferrer" data-i18n-attr="aria-label:footer.whatsapp_aria" aria-label="${T("footer.whatsapp_aria", "Message Yee Lim on WhatsApp (opens WhatsApp)")}">${WA_GLYPH}<span data-i18n="footer.whatsapp_us">${T("footer.whatsapp_us", "WhatsApp us")}</span></a>
      </div>
    </div>

    <div class="site-footer-bottom-wrap">
      <div class="site-footer-bottom">
        <span>&copy; ${new Date().getFullYear()} <strong>Yee Lim Adhesives Industries Pte Ltd</strong>. <span data-i18n="footer.rights">${T("footer.rights", "All rights reserved.")}</span></span>
        <span data-i18n="footer.tagline">${T("footer.tagline", "Commercial & Industrial Adhesive Solutions · Singapore")}</span>
      </div>
    </div>

    <!-- Compact mobile footer (≤640px) — matches the mobile prototype: a small
         logo + blurb, bordered trust chips, Brands + Company text columns, a
         "Have a project in mind?" band (no phone), and a slim copyright line.
         No Admin Login. Hidden on desktop/tablet; the grid footer above is hidden
         on phones so desktop is untouched. -->
    <div class="site-footer-mobile">
      <div class="sfm-brand-row">
        <img src="/images/logos/YLAI-nav.png" alt="Yee Lim Adhesives Industries" class="sfm-logo">
        <p class="sfm-blurb" data-i18n="footer.mobile_blurb">${T("footer.mobile_blurb", "Commercial & industrial adhesives, manufactured in Singapore since 1976.")}</p>
      </div>
      <div class="site-footer-certs sfm-certs" aria-label="Certifications">
        <span class="site-footer-cert" data-i18n="footer.cert_iso">${T("footer.cert_iso", "ISO Certified")}</span>
        <span class="site-footer-cert" data-i18n="footer.cert_green">${T("footer.cert_green", "Singapore Green Label")}</span>
        <span class="site-footer-cert" data-i18n="footer.cert_lowvoc">${T("footer.cert_lowvoc", "Low-VOC / Low-Formaldehyde")}</span>
      </div>
      <div class="sfm-cols">
        <nav class="sfm-col" aria-label="Brands">
          <p class="sfm-col-title" data-i18n="footer.brands">${T("footer.brands", "Brands")}</p>
          <ul class="site-footer-links">
            <li><a href="${brandLink("Deer™ Brand")}">Deer&trade;</a></li>
            <li><a href="${brandLink("Horsemen™ Brand")}">Horsemen&trade;</a></li>
            <li><a href="${brandLink("Premier™ Brand")}">Premier&trade;</a></li>
            <li><a href="${brandLink("Rhino™ Brand")}">Rhino&trade;</a></li>
          </ul>
        </nav>
        <nav class="sfm-col" aria-label="Company">
          <p class="sfm-col-title" data-i18n="footer.company">${T("footer.company", "Company")}</p>
          <ul class="site-footer-links">
            <li><a href="/products" data-i18n="footer.all_products">${T("footer.all_products", "All Products")}</a></li>
            <li><a href="/about" data-i18n="footer.about">${T("footer.about", "About Yee Lim")}</a></li>
            <li><a href="/about#mission" data-i18n="about.mission_title">${T("about.mission_title", "Our Mission")}</a></li>
            <li><a href="/about#values" data-i18n="about.values_title">${T("about.values_title", "Our Values")}</a></li>
            <li><a href="/contact" data-i18n="footer.contact_us">${T("footer.contact_us", "Contact Us")}</a></li>
          </ul>
        </nav>
      </div>
      <!-- The mobile band's CTA opens WhatsApp DIRECTLY. It used to read
           "Contact us" and route to the Contact page, which made the fastest
           route to a real conversation a two-step detour. Same configured number
           as the desktop column and the contact page (data-yl-wa lets an admin
           edit it in one place — see applySiteSettings in core/app.js), same
           prefilled opener, and the icon + accessible name both say WhatsApp so
           nobody taps it expecting a form. -->
      <div class="sfm-cta-band">
        <div class="sfm-cta-text">
          <p class="sfm-cta-title" data-i18n="footer.project">${T("footer.project", "Have a project in mind?")}</p>
          <p class="sfm-cta-sub" data-i18n="footer.project_sub">${T("footer.project_sub", "Enquiries & quotations within 1-2 business days.")}</p>
        </div>
        <a class="sfm-cta-btn" data-yl-wa
           href="https://wa.me/6588755786?text=Hello%20Yee%20Lim%2C%20I%20would%20like%20to%20enquire%20about%20your%20adhesive%20products."
           target="_blank" rel="noopener noreferrer"
           data-i18n-attr="aria-label:footer.whatsapp_aria"
           aria-label="${T("footer.whatsapp_aria", "Message Yee Lim on WhatsApp (opens WhatsApp)")}">
          ${WA_GLYPH}<span data-i18n="footer.whatsapp_us">${T("footer.whatsapp_us", "WhatsApp us")}</span>
        </a>
      </div>
      <p class="sfm-address" data-yl-address>1 Ang Mo Kio Street 65, #03-17, Singapore 569063</p>
      <div class="sfm-copyright">&copy; ${new Date().getFullYear()} <strong>Yee Lim Adhesives Industries Pte Ltd</strong> &middot; Singapore</div>
    </div>
  `;

  function insert() { document.body.appendChild(footer); }
  if (document.body) insert();
  else document.addEventListener("DOMContentLoaded", insert);
})();
