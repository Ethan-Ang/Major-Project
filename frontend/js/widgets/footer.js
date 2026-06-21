(function () {
  // ─── Inject footer CSS ────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    .site-footer {
      background: #0e1116;
      color: #aeb6c2;
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
    .site-footer-col h4 {
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
      color: #e0a3a3;
      font-size: 0.8rem;
      font-style: italic;
      font-weight: 500;
      letter-spacing: 0.2px;
    }
    .site-footer-blurb {
      margin: 0 0 1.1rem;
      max-width: 38ch;
      color: #9aa4b2;
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
      color: #cbd2db;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      padding: 0.2rem 0.5rem;
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
      color: #9aa4b2;
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
      color: #c3cad4;
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
    .site-footer-bottom strong { color: #9aa4b2; font-weight: 600; }
    .site-footer-admin {
      color: #8a93a0;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .site-footer-admin:hover { color: #fff; }
    .site-footer-admin:focus-visible {
      outline: 2px solid #CC2929;
      outline-offset: 2px;
      border-radius: 3px;
    }

    @media (max-width: 900px) {
      .site-footer-inner { grid-template-columns: 1fr 1fr; gap: 2rem; }
      .site-footer-col-brand { grid-column: 1 / -1; }
    }
    @media (max-width: 560px) {
      .site-footer-inner { grid-template-columns: 1fr; }
      .site-footer-bottom { flex-direction: column; align-items: flex-start; }
    }
  `;
  document.head.appendChild(style);

  // Brand filter deep-links reuse the products page ?brand= URL state
  const brandLink = b => `/products?brand=${encodeURIComponent(b)}`;

  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.setAttribute("role", "contentinfo");
  footer.innerHTML = `
    <div class="site-footer-inner">
      <div class="site-footer-col site-footer-col-brand">
        <a href="/" class="site-footer-brand" aria-label="Yee Lim Adhesives Industries home">
          <span class="site-footer-mark" aria-hidden="true">YL</span>
          <span>
            <span class="site-footer-name">YEE LIM</span><br>
            <span class="site-footer-tagline">For a Better Job</span>
          </span>
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
        <h4>Company</h4>
        <ul class="site-footer-links">
          <li><a href="/about">About Yee Lim</a></li>
          <li><a href="/about">Our Heritage</a></li>
          <li><a href="/about">Quality &amp; Environment</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </nav>

      <nav class="site-footer-col" aria-label="Products and brands">
        <h4>Products &amp; Brands</h4>
        <ul class="site-footer-links">
          <li><a href="/products">All Adhesive Solutions</a></li>
          <li><a href="${brandLink("Deer™ Brand")}">Deer™ Brand</a></li>
          <li><a href="${brandLink("Horsemen™ Brand")}">Horsemen™ Brand</a></li>
          <li><a href="${brandLink("Premier™ Brand")}">Premier™ Brand</a></li>
          <li><a href="${brandLink("Rhino™ Brand")}">Rhino™ Brand</a></li>
        </ul>
      </nav>

      <div class="site-footer-col">
        <h4>Contact &amp; Enquiry</h4>
        <dl class="site-footer-contact">
          <div>
            <dt>Address</dt>
            <dd>1 Ang Mo Kio Street 65,<br>#03-17, Singapore 569063</dd>
          </div>
        </dl>
        <a class="site-footer-cta" href="/contact">Speak to Yee Lim &rarr;</a>
      </div>
    </div>

    <div class="site-footer-bottom">
      <span>&copy; ${new Date().getFullYear()} <strong>Yee Lim Adhesives Industries Pte Ltd</strong>. All rights reserved.</span>
      <span>Commercial &amp; Industrial Adhesive Solutions · Singapore · <a class="site-footer-admin" href="admin/login.html">Admin Login</a></span>
    </div>
  `;

  function insert() { document.body.appendChild(footer); }
  if (document.body) insert();
  else document.addEventListener("DOMContentLoaded", insert);
})();
