(function () {
  // ─── Inject footer CSS ────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    .site-footer {
      background: #17130e;
      color: #b9b3a6;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 0.875rem;
      line-height: 1.6;
      border-top: 3px solid #CC2929;
    }
    .site-footer-inner {
      max-width: 1280px;
      margin: 0 auto;
      padding: 3rem 1.5rem 2rem;
      display: grid;
      grid-template-columns: 1.7fr 1fr 1fr 1.3fr;
      gap: 2.5rem;
    }
    .site-footer-col-title {
      color: #fff;
      font-family: 'Space Grotesk', 'Inter', sans-serif;
      font-size: 0.82rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 0 0 1.1rem;
    }
    .site-footer-brand {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 0.9rem;
      text-decoration: none;
    }
    .site-footer-logo {
      height: 52px;
      width: auto;
      display: block;
    }
    .site-footer-mark {
      width: 34px;
      height: 34px;
      background: #CC2929;
      color: #fff;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Space Grotesk', 'Inter', sans-serif;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }
    .site-footer-name {
      color: #fff;
      font-family: 'Space Grotesk', 'Inter', sans-serif;
      font-size: 1.1rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      line-height: 1.15;
    }
    .site-footer-tagline {
      color: #e79a9a;
      font-size: 0.8rem;
      font-style: italic;
      font-weight: 500;
      letter-spacing: 0.2px;
    }
    .site-footer-blurb {
      margin: 0 0 1.1rem;
      max-width: 38ch;
      color: #b9b3a6;
    }
    .site-footer-certs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .site-footer-cert {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.3px;
      color: #cdc7b9;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      padding: 0.2rem 0.5rem;
      white-space: nowrap;
    }
    .site-footer-links {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.6rem;
    }
    .site-footer-links a,
    .site-footer-contact a {
      color: #b9b3a6;
      text-decoration: none;
      transition: color 0.18s;
    }
    .site-footer-links a:hover,
    .site-footer-contact a:hover { color: #fff; }
    .site-footer-links a:focus-visible,
    .site-footer-contact a:focus-visible,
    .site-footer-cta:focus-visible {
      outline: 2px solid #CC2929;
      outline-offset: 2px;
      border-radius: 3px;
    }
    .site-footer-contact {
      display: grid;
      gap: 0.85rem;
      margin: 0 0 1.25rem;
    }
    .site-footer-contact dt {
      color: #8a93a0;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 0.15rem;
    }
    .site-footer-contact dd {
      margin: 0;
      color: #cdc7b9;
    }
    .site-footer-cta {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #CC2929;
      color: #fff;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 0.6rem 1.1rem;
      border-radius: 6px;
      transition: background 0.18s, box-shadow 0.18s;
    }
    .site-footer-cta:hover {
      background: #a82020;
      box-shadow: 0 2px 10px rgba(204, 41, 41, 0.35);
      color: #fff;
    }
    .site-footer-bottom {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      max-width: 1280px;
      margin: 0 auto;
      padding: 1.1rem 1.5rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      font-size: 0.78rem;
      color: #8a93a0;
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
        padding: 0.9rem 1.25rem calc(0.9rem + env(safe-area-inset-bottom, 0px));
      }
    }

    /* ── Compact mobile footer (≤640px), matching the prototype ──────────
       The desktop grid footer + bottom bar (incl. Admin Login) are hidden on
       phones and replaced by .site-footer-mobile; desktop/tablet untouched. */
    .site-footer-mobile { display: none; }
    @media (max-width: 640px) {
      .site-footer-inner,
      .site-footer-bottom { display: none; }
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

  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.setAttribute("role", "contentinfo");
  footer.innerHTML = `
    <div class="site-footer-inner">
      <div class="site-footer-col site-footer-col-brand">
        <a href="/" class="site-footer-brand" aria-label="Yee Lim Adhesives Industries home">
          <img src="/images/logos/YLAI-nav.png" alt="Yee Lim Adhesives Industries" class="site-footer-logo">
        </a>
        <p class="site-footer-blurb">
          One of Singapore's earliest and largest adhesive manufacturers. For over
          50 years we have formulated commercial and industrial adhesive solutions
          engineered to the job, not off the shelf.
        </p>
        <div class="site-footer-certs" aria-label="Certifications">
          <span class="site-footer-cert">ISO Certified</span>
          <span class="site-footer-cert">Singapore Green Label</span>
          <span class="site-footer-cert">Low-VOC / Low-Formaldehyde</span>
        </div>
      </div>

      <nav class="site-footer-col" aria-label="Company">
        <p class="site-footer-col-title">Company</p>
        <ul class="site-footer-links">
          <li><a href="/about">About Yee Lim</a></li>
          <li><a href="/about">Our Heritage</a></li>
          <li><a href="/about">Quality &amp; Environment</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </nav>

      <nav class="site-footer-col" aria-label="Products and brands">
        <p class="site-footer-col-title">Products &amp; Brands</p>
        <ul class="site-footer-links">
          <li><a href="/products">All Products</a></li>
          <li><a href="${brandLink("Deer™ Brand")}">Deer™ Brand</a></li>
          <li><a href="${brandLink("Horsemen™ Brand")}">Horsemen™ Brand</a></li>
          <li><a href="${brandLink("Premier™ Brand")}">Premier™ Brand</a></li>
          <li><a href="${brandLink("Rhino™ Brand")}">Rhino™ Brand</a></li>
        </ul>
      </nav>

      <div class="site-footer-col">
        <p class="site-footer-col-title">Contact &amp; Enquiry</p>
        <dl class="site-footer-contact">
          <div>
            <dt>Address</dt>
            <dd>1 Ang Mo Kio Street 65,<br>#03-17, Singapore 569063</dd>
          </div>
        </dl>
        <a class="site-footer-cta" href="https://wa.me/6588755786?text=Hello%20Yee%20Lim%2C%20I%20would%20like%20to%20enquire%20about%20your%20adhesive%20products." target="_blank" rel="noopener noreferrer">Speak to Yee Lim &rarr;</a>
      </div>
    </div>

    <div class="site-footer-bottom">
      <span>&copy; ${new Date().getFullYear()} <strong>Yee Lim Adhesives Industries Pte Ltd</strong>. All rights reserved.</span>
      <span>Commercial &amp; Industrial Adhesive Solutions · Singapore</span>
    </div>

    <!-- Compact mobile footer (≤640px) — matches the mobile prototype: a small
         logo + blurb, bordered trust chips, Brands + Company text columns, a
         "Have a project in mind?" band (no phone), and a slim copyright line.
         No Admin Login. Hidden on desktop/tablet; the grid footer above is hidden
         on phones so desktop is untouched. -->
    <div class="site-footer-mobile">
      <div class="sfm-brand-row">
        <img src="/images/logos/YLAI-nav.png" alt="Yee Lim Adhesives Industries" class="sfm-logo">
        <p class="sfm-blurb">Commercial &amp; industrial adhesives, manufactured in Singapore since 1976.</p>
      </div>
      <div class="site-footer-certs sfm-certs" aria-label="Certifications">
        <span class="site-footer-cert">ISO Certified</span>
        <span class="site-footer-cert">Singapore Green Label</span>
        <span class="site-footer-cert">Low-VOC / Low-Formaldehyde</span>
      </div>
      <div class="sfm-cols">
        <nav class="sfm-col" aria-label="Brands">
          <p class="sfm-col-title">Brands</p>
          <ul class="site-footer-links">
            <li><a href="${brandLink("Deer™ Brand")}">Deer&trade;</a></li>
            <li><a href="${brandLink("Horsemen™ Brand")}">Horsemen&trade;</a></li>
            <li><a href="${brandLink("Premier™ Brand")}">Premier&trade;</a></li>
            <li><a href="${brandLink("Rhino™ Brand")}">Rhino&trade;</a></li>
          </ul>
        </nav>
        <nav class="sfm-col" aria-label="Company">
          <p class="sfm-col-title">Company</p>
          <ul class="site-footer-links">
            <li><a href="/products">All Products</a></li>
            <li><a href="/about">About Yee Lim</a></li>
            <li><a href="/about">Our Heritage</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </nav>
      </div>
      <div class="sfm-cta-band">
        <div class="sfm-cta-text">
          <p class="sfm-cta-title">Have a project in mind?</p>
          <p class="sfm-cta-sub">Enquiries &amp; quotations within 1&ndash;2 business days.</p>
        </div>
        <a class="sfm-cta-btn" href="/contact">Contact us &rarr;</a>
      </div>
      <p class="sfm-address">1 Ang Mo Kio Street 65, #03-17, Singapore 569063</p>
      <div class="sfm-copyright">&copy; ${new Date().getFullYear()} <strong>Yee Lim Adhesives Industries Pte Ltd</strong> &middot; Singapore</div>
    </div>
  `;

  function insert() { document.body.appendChild(footer); }
  if (document.body) insert();
  else document.addEventListener("DOMContentLoaded", insert);
})();
