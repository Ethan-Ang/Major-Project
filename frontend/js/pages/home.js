// Yee Lim — Home page controller. Part of the unified public bundle: loaded on
// every page, self-selecting on the home grid anchor, re-runnable across Swup
// swaps. Renders REAL catalogue data only (no invented products, counts or
// claims) through the same shared card renderer the catalogue uses, so the
// card actions, basket behaviour and compare integration are one system.

function renderHomeSkeleton() {
  const grid = document.getElementById("homeFeaturedGrid");
  if (!grid) return;
  grid.innerHTML = Array.from({ length: 3 }).map(() => `
    <div class="product-card skeleton-card" aria-hidden="true">
      <div class="skeleton-img"></div>
      <div class="product-card-body">
        <div class="skeleton-line skeleton-line-short"></div>
        <div class="skeleton-line skeleton-line-title"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-line-mid"></div>
      </div>
    </div>`).join("");
}

async function initHomePage() {
  const grid = document.getElementById("homeFeaturedGrid");
  if (!grid) return;

  if (!PRODUCTS || !PRODUCTS.length) {
    renderHomeSkeleton();
    try {
      await loadProductsFromBackend();
    } catch (err) {
      console.error(err);
    }
  }

  renderHomeBrands();
  renderHomeFeatured();
  updateBasketCount();
  if (typeof renderCompareTray === "function") renderCompareTray();

  // Keep the home cards' Add-to-Enquiry / Compare states in step without any
  // re-render (products.js only registers these after a catalogue visit, so
  // home registers its own; both call the same idempotent sync functions).
  ylOnce("home:listeners", () => {
    window.addEventListener("basketUpdated", () => {
      if (typeof syncEnquiryButtons === "function") syncEnquiryButtons();
    });
    window.addEventListener("compareUpdated", () => {
      if (typeof syncCompareButtons === "function") syncCompareButtons();
    });
  });
}
ylReady(initHomePage);

// Brand range tiles: the four real Yee Lim brands with live product counts,
// deep-linking into the already-working filtered catalogue.
function renderHomeBrands() {
  const wrap = document.getElementById("homeBrandGrid");
  if (!wrap) return;

  const HOME_BRANDS = [
    { name: "Deer™ Brand",     slug: "deer",     logo: "/images/logos/Deer.png" },
    { name: "Horsemen™ Brand", slug: "horsemen", logo: "/images/logos/Horsemen.png" },
    { name: "Premier™ Brand",  slug: "premier",  logo: "/images/logos/Premier.png" },
    { name: "Rhino™ Brand",    slug: "rhino",    logo: "/images/logos/Rhino.png" },
  ];

  wrap.innerHTML = HOME_BRANDS.map(b => {
    const count = (PRODUCTS || []).filter(p => p.brand === b.name).length;
    return `
      <a class="home-brand-card" href="/products?brand=${b.slug}">
        <span class="home-brand-ic" aria-hidden="true"><img src="${b.logo}" alt="" loading="lazy"></span>
        <span class="home-brand-text">
          <span class="home-brand-name">${ylEscapeHtml(b.name)}</span>
          <span class="home-brand-count">${count} product${count !== 1 ? "s" : ""}</span>
        </span>
        <svg class="home-brand-go" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
      </a>`;
  }).join("");
}

// Featured products: the first product of each brand in catalogue order,
// topped up in catalogue order to six — a stable, truthful selection (no
// invented "bestseller" claims). Rendered with the shared catalogue card.
function renderHomeFeatured() {
  const grid = document.getElementById("homeFeaturedGrid");
  if (!grid) return;
  const products = PRODUCTS || [];

  if (!products.length || typeof productCardHTML !== "function") {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>Products are temporarily unavailable</h3>
        <p>Please refresh the page in a moment, or contact Yee Lim directly and our team will assist you.</p>
        <a class="btn btn-outline" href="/contact">Contact Yee Lim</a>
      </div>`;
    return;
  }

  const picked = [];
  const seenBrand = new Set();
  products.forEach(p => {
    if (picked.length >= 4 || seenBrand.has(p.brand)) return;
    if (p.brand === "Others & Accessories") return;
    seenBrand.add(p.brand);
    picked.push(p);
  });
  products.forEach(p => {
    if (picked.length >= 6 || picked.includes(p)) return;
    if (p.brand === "Others & Accessories") return;
    picked.push(p);
  });

  const totalEl = document.getElementById("homeCatalogueCount");
  if (totalEl) totalEl.textContent = `View all ${products.length} products`;

  grid.innerHTML = picked.map(p => productCardHTML(p)).join("");
}
