// Yee Lim — Product Enquiry page controller (extracted from enquiry.html so it
// survives Swup page swaps). Uses the shared basket API in core/app.js.

// Loading skeleton (catalogue shimmer style) while product data is fetched, so
// the basket area is not blank on a slow connection.
function renderBasketSkeleton() {
  const list = document.getElementById("basketList");
  if (!list) return;
  const row = '<div class="basket-item" aria-hidden="true" style="align-items:center">' +
    '<div class="skeleton-img" style="width:64px;height:64px;aspect-ratio:auto;border-radius:6px;flex:none"></div>' +
    '<div style="flex:1">' +
    '<div class="skeleton-line skeleton-line-short"></div>' +
    '<div class="skeleton-line skeleton-line-title"></div>' +
    '<div class="skeleton-line skeleton-line-mid"></div></div></div>';
  list.innerHTML = row + row;
}

// Re-runnable init (initial load + every Swup swap). Bails on non-enquiry pages.
function initEnquiryPage() {
  const list = document.getElementById("basketList");
  if (!list) return;
  if (PRODUCTS && PRODUCTS.length) { renderBasket(); return; }
  renderBasketSkeleton();
  loadProductsFromBackend()
    .catch(err => console.error(err))
    .finally(renderBasket);
}
ylReady(initEnquiryPage);

function renderBasket() {
  const ids = getBasket();
  const products = ids.map(id => PRODUCTS.find(p => String(p.id) === String(id))).filter(Boolean);
  const list = document.getElementById("basketList");
  if (!list) return;
  const formSection = document.getElementById("enquiryFormSection");
  const selectedDisplay = document.getElementById("selectedProductsDisplay");
  const colHead = document.getElementById("enquiryColHead");
  const countEl = document.getElementById("enquiryCount");
  const grid = document.querySelector(".enquiry-grid");

  if (products.length === 0) {
    // Empty: the form column is hidden, so collapse the two-column grid to a
    // single centered column (see .enquiry-grid.is-empty) — otherwise the empty
    // card would sit pinned to the half-width left track, off-centre.
    if (grid) grid.classList.add("is-empty");
    list.innerHTML = `
      <div class="basket-empty">
        <div class="basket-empty-icon" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13 5.4 5M7 13l-2.3 2.3c-.6.6-.2 1.7.7 1.7H17"/><circle cx="9" cy="20" r="1.4"/><circle cx="16" cy="20" r="1.4"/></svg>
        </div>
        <h2>No products selected yet</h2>
        <p>Browse the catalogue and add adhesives to build a single enquiry for our team.</p>
        <a href="/products" class="btn btn-primary">Browse Products</a>
      </div>`;
    if (formSection) formSection.style.display = "none";
    if (colHead) colHead.style.display = "none";
    return;
  }

  if (grid) grid.classList.remove("is-empty");
  if (colHead) colHead.style.display = "flex";
  if (countEl) countEl.textContent = `(${products.length})`;

  list.innerHTML = products.map(p => {
    const brandLabel = ylEscapeHtml(p.brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase());
    const hasRealImage = p.images && p.images.length > 0;
    const thumb = hasRealImage
      ? `<img src="${encodeURI(p.images[0])}" alt="" loading="lazy" onerror="ylImageFallback(this,'${brandLabel}')">`
      : brandLabel;
    return `
      <div class="basket-item">
        <div class="basket-item-thumb" aria-hidden="true">${thumb}</div>
        <div class="basket-item-info">
          <span class="basket-item-brand">${ylEscapeHtml(brandDisplay(p.brand))}</span>
          <div class="basket-item-name">${ylEscapeHtml(p.name)}</div>
          <p>${ylEscapeHtml(p.shortDescription)}</p>
        </div>
        <button class="basket-remove" onclick="removeFromBasket('${p.id}')" aria-label="Remove ${ylEscapeHtml(p.name)} from your product enquiry">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;
  }).join("");

  if (formSection) formSection.style.display = "block";
  if (selectedDisplay) {
    const productLines = products.map(p => `<li>${ylEscapeHtml(p.name)}</li>`).join("");
    selectedDisplay.innerHTML = `
      <div class="enquiring-about-label">Enquiring about</div>
      <ul class="enquiring-about-list">${productLines}</ul>
    `;
  }
}

function removeFromBasket(id) {
  const basket = getBasket().map(String).filter(i => i !== String(id));
  saveBasket(basket);
  renderBasket();
}

function clearAllBasket() {
  saveBasket([]);
  renderBasket();
}

async function submitEnquiry() {
  const name    = document.getElementById("eName").value.trim();
  const company = document.getElementById("eCompany").value.trim();
  const email   = document.getElementById("eEmail").value.trim();
  const phone   = document.getElementById("ePhone").value.trim();
  const message = document.getElementById("eMessage").value.trim();
  const website = document.getElementById("eWebsite").value.trim(); // honeypot
  const errorEl = document.getElementById("enquiryError");
  const btn     = document.getElementById("submitEnquiryBtn");

  // Reset previous error state (summary + inline messages)
  ["eName", "eCompany", "eEmail"].forEach(fid => {
    const field = document.getElementById(fid);
    field.removeAttribute("aria-invalid");
    field.removeAttribute("aria-describedby");
    const inline = document.getElementById(fid + "Err");
    if (inline) inline.hidden = true;
  });

  // Inline validation: each invalid field gets its own message + aria link;
  // the summary stays as the announced overview (not the only signal).
  const invalid = [];
  if (!name)    invalid.push({ id: "eName",    label: "full name" });
  if (!company) invalid.push({ id: "eCompany", label: "company name" });
  if (!email)   invalid.push({ id: "eEmail",   label: "email address" });
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    invalid.push({ id: "eEmail", label: "valid email address" });

  if (invalid.length > 0) {
    invalid.forEach(f => {
      const field = document.getElementById(f.id);
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", f.id + "Err");
      const inline = document.getElementById(f.id + "Err");
      if (inline) inline.hidden = false;
    });
    errorEl.textContent   = "Please enter your " + invalid.map(f => f.label).join(", ") + " before sending your enquiry.";
    errorEl.style.display = "block";
    document.getElementById(invalid[0].id).focus();
    window.scrollTo({ top: errorEl.offsetTop - 100, behavior: "smooth" });
    return;
  }
  errorEl.style.display = "none";

  // Resolve the basket's product IDs into product names for the enquiry record
  const ids = getBasket();
  const products = ids
    .map(id => PRODUCTS.find(p => String(p.id) === String(id)))
    .filter(Boolean)
    .map(p => p.name);

  btn.disabled    = true;
  btn.textContent = "Sending…";

  try {
    let res;
    try {
      res = await fetch(`${API_BASE_URL}/api/enquiries.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, email, phone, message, products, website })
      });
    } catch (networkErr) {
      throw new Error("We could not send your enquiry right now. Please try again shortly, or contact Yee Lim directly via the Contact page.");
    }

    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(result.message || "Something went wrong. Please try again.");
    }

    // Success — clear the basket and show the confirmation screen
    localStorage.removeItem("enquiryBasket");
    window.dispatchEvent(new Event("basketUpdated"));
    document.getElementById("mainContent").style.display = "none";
    document.getElementById("confirmation").style.display = "block";

    // Show the reference number and the "we emailed you a copy" note.
    if (result.reference) {
      const refEl = document.getElementById("confirmationRef");
      refEl.textContent = "Your reference: " + result.reference;
      refEl.style.display = "block";
    }
    if (result.confirmed) {
      document.getElementById("confirmationNote").style.display = "block";
    }

  } catch (err) {
    errorEl.textContent   = err.message;
    errorEl.style.display = "block";
    btn.disabled    = false;
    btn.textContent = "Submit Enquiry";
    // Move focus to the message so screen readers announce the failure
    errorEl.focus();
    window.scrollTo({ top: errorEl.offsetTop - 100, behavior: "smooth" });
  }
}
