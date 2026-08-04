// Yee Lim — Product Enquiry page controller (extracted from enquiry.html so it
// survives Swup page swaps). Uses the shared basket API in core/app.js.

// Chinese label helpers (English fallback when zh is not active).
function eqT(key, fb) { return (window.ylLang === "zh" && window.ylT) ? (window.ylT(key) || fb) : fb; }
function eqItemWord(n) { return window.ylLang === "zh" ? "件" : (n !== 1 ? "items" : "item"); }

// Loading skeleton (catalogue shimmer style) while product data is fetched, so
// the basket area is not blank on a slow connection.
function renderBasketSkeleton() {
  const list = document.getElementById("basketList");
  if (!list) return;
  const count = getBasket().length;
  const grid = document.querySelector(".enquiry-grid");
  const formSection = document.getElementById("enquiryFormSection");
  const colHead = document.getElementById("enquiryColHead");
  const totalBand = document.getElementById("enquiryTotalBand");
  const totalCount = document.getElementById("enquiryTotalCount");
  if (!count) {
    renderBasket();
    return;
  }
  if (grid) grid.classList.remove("is-empty");
  if (formSection) formSection.style.display = "block";
  if (colHead) colHead.style.display = "flex";
  if (totalBand) totalBand.style.display = "flex";
  if (totalCount) totalCount.innerHTML = `<b>${count}</b> ${eqItemWord(count)}`;
  const row = '<div class="basket-item" aria-hidden="true" style="align-items:center">' +
    '<div class="skeleton-img" style="width:64px;height:64px;aspect-ratio:auto;border-radius:6px;flex:none"></div>' +
    '<div style="flex:1">' +
    '<div class="skeleton-line skeleton-line-short"></div>' +
    '<div class="skeleton-line skeleton-line-title"></div>' +
    '<div class="skeleton-line skeleton-line-mid"></div></div></div>';
  list.innerHTML = row.repeat(count);
}

// Re-runnable init (initial load + every Swup swap). Bails on non-enquiry pages.
function initEnquiryPage() {
  const list = document.getElementById("basketList");
  if (!list) return;
  initEnquiryCounters();
  // Subject uses the same accessible custom dropdown as the catalogue sort,
  // replacing the native browser option list. The native <select> stays in
  // the DOM as the value source, so submitEnquiry and the frontend-only
  // Subject handling are unchanged. Safe to re-run across Swup swaps
  // (enhanceCustomSelect guards against double enhancement).
  if (typeof enhanceCustomSelect === "function") {
    enhanceCustomSelect(document.getElementById("eSubject"));
  }
  if (PRODUCTS && PRODUCTS.length) { renderBasket(); return; }
  renderBasketSkeleton();
  loadProductsFromBackend()
    .catch(err => console.error(err))
    .finally(renderBasket);
}
ylReady(initEnquiryPage);

// Live "n / 1000" counters under the Message and Enquiry Notes textareas.
// Bound per page view (the swap replaces the fields), guarded so re-running
// on the same DOM never stacks listeners.
function initEnquiryCounters() {
  [["eMessage", "eMessageCount"], ["eNotes", "eNotesCount"]].forEach(([taId, outId]) => {
    const ta = document.getElementById(taId);
    const out = document.getElementById(outId);
    if (!ta || !out || ta._ylCounterBound) return;
    ta._ylCounterBound = true;
    const max = ta.getAttribute("maxlength") || 1000;
    const sync = () => { out.textContent = `${ta.value.length} / ${max}`; };
    ta.addEventListener("input", sync);
    sync();
  });
}

function renderBasket() {
  const ids = getBasket();
  const products = ids.map(id => PRODUCTS.find(p => String(p.id) === String(id))).filter(Boolean);
  const list = document.getElementById("basketList");
  if (!list) return;
  const formSection = document.getElementById("enquiryFormSection");
  const colHead = document.getElementById("enquiryColHead");
  const totalBand = document.getElementById("enquiryTotalBand");
  const totalCount = document.getElementById("enquiryTotalCount");
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
        <h2>${eqT("enquiry.empty_title", "No products selected yet")}</h2>
        <p>${eqT("enquiry.empty_body", "Browse the catalogue and add adhesives to build a single enquiry for our team.")}</p>
        <a href="/products" class="btn btn-primary">${eqT("enquiry.browse", "Browse Products")}</a>
      </div>`;
    if (formSection) formSection.style.display = "none";
    if (colHead) colHead.style.display = "none";
    if (totalBand) totalBand.style.display = "none";
    return;
  }

  if (grid) grid.classList.remove("is-empty");
  if (colHead) colHead.style.display = "flex";
  if (totalBand) totalBand.style.display = "flex";
  // Emphasised number + quiet unit (target treatment). products.length is a
  // number, so this innerHTML carries no untrusted text.
  if (totalCount) totalCount.innerHTML = `<b>${products.length}</b> ${eqItemWord(products.length)}`;

  const subtype = p => (typeof productSubtype === "function") ? productSubtype(p) : (p.category || "");

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
          <div class="basket-item-name">${ylEscapeHtml(p.name)}</div>
          <span class="basket-item-sub">${ylEscapeHtml(window.ylTerm ? window.ylTerm(subtype(p)) : subtype(p))}</span>
          <span class="basket-item-brand">${ylEscapeHtml(brandDisplay(p.brand))}</span>
        </div>
        <button class="basket-remove" onclick="removeFromBasket('${p.id}')" aria-label="Remove ${ylEscapeHtml(p.name)} from your product enquiry">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          <span>${eqT("enquiry.remove", "Remove")}</span>
        </button>
      </div>
    `;
  }).join("");

  if (formSection) formSection.style.display = "block";
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
  const website = document.getElementById("eWebsite").value.trim(); // honeypot
  const errorEl = document.getElementById("enquiryError");
  const btn     = document.getElementById("submitEnquiryBtn");

  // #eSubject and #eNotes have no columns of their own in the enquiries table,
  // so they are folded into `message` rather than dropped. They used to be
  // collected and silently discarded: a customer could pick "Request a
  // quotation", type notes, submit, and none of it reached the team. The
  // enquiries table, the admin inbox and both notification emails all render
  // `message`, so prefixing/suffixing it puts the content in front of a human
  // with no schema change. Labels stay in the visitor's language.
  const subject = (document.getElementById("eSubject") || {}).value || "";
  const notes   = (document.getElementById("eNotes") || {}).value || "";
  const message = [
    subject.trim() ? `${eqT("enquiry.f_subject", "Subject")}: ${subject.trim()}` : "",
    document.getElementById("eMessage").value.trim(),
    notes.trim() ? `${eqT("enquiry.f_notes", "Enquiry Notes")}: ${notes.trim()}` : "",
  ].filter(Boolean).join("\n\n");

  const privacy = document.getElementById("ePrivacy");
  const privacyErr = document.getElementById("ePrivacyErr");

  // Reset previous error state (summary + inline messages)
  ["eName", "eCompany", "eEmail"].forEach(fid => {
    const field = document.getElementById(fid);
    field.removeAttribute("aria-invalid");
    field.removeAttribute("aria-describedby");
    const inline = document.getElementById(fid + "Err");
    if (inline) inline.hidden = true;
  });
  if (privacy) {
    privacy.removeAttribute("aria-invalid");
    privacy.removeAttribute("aria-describedby");
  }
  if (privacyErr) privacyErr.hidden = true;

  // Inline validation: each invalid field gets its own message + aria link;
  // the summary stays as the announced overview (not the only signal).
  const invalid = [];
  if (!name)    invalid.push({ id: "eName",    label: eqT("enquiry.fld_name", "full name") });
  if (!company) invalid.push({ id: "eCompany", label: eqT("enquiry.fld_company", "company name") });
  if (!email)   invalid.push({ id: "eEmail",   label: eqT("enquiry.fld_email", "email address") });
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    invalid.push({ id: "eEmail", label: eqT("enquiry.fld_email_valid", "valid email address") });

  if (invalid.length > 0) {
    invalid.forEach(f => {
      const field = document.getElementById(f.id);
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", f.id + "Err");
      const inline = document.getElementById(f.id + "Err");
      if (inline) inline.hidden = false;
    });
    errorEl.textContent   = eqT("enquiry.fill_prefix", "Please enter your ") +
      invalid.map(f => f.label).join(window.ylLang === "zh" ? "、" : ", ") +
      eqT("enquiry.fill_suffix", " before sending your enquiry.");
    errorEl.style.display = "block";
    document.getElementById(invalid[0].id).focus();
    window.scrollTo({ top: errorEl.offsetTop - 100, behavior: "smooth" });
    return;
  }

  // Consent gate (frontend validation only; the API payload is unchanged).
  if (privacy && !privacy.checked) {
    privacy.setAttribute("aria-invalid", "true");
    // A11Y-003: the consent box was the one required control whose inline
    // message was not wired to it, so its error was shown but never announced.
    if (privacyErr) privacy.setAttribute("aria-describedby", privacyErr.id);
    if (privacyErr) privacyErr.hidden = false;
    errorEl.textContent   = eqT("enquiry.err_privacy", "Please agree to the use of your information so we can process your enquiry.");
    errorEl.style.display = "block";
    privacy.focus();
    return;
  }
  errorEl.style.display = "none";

  // Resolve the basket's product IDs into product names for the enquiry record
  const ids = getBasket();
  const products = ids
    .map(id => PRODUCTS.find(p => String(p.id) === String(id)))
    .filter(Boolean)
    .map(p => p.name);

  // UX-006: the send/restore cycle used to write btn.textContent, which threw
  // away the paper-plane <svg> permanently — after one failed send the button
  // came back as bare text for the rest of the session. Swap only the label
  // span so the icon and the button's structure survive a retry.
  const btnLabel = btn.querySelector("span") || btn;
  const btnLabelText = btnLabel.textContent;
  btn.disabled = true;
  btn.setAttribute("aria-busy", "true");
  btnLabel.textContent = eqT("enquiry.sending", "Sending…");

  try {
    let res;
    try {
      res = await fetch(`${API_BASE_URL}/api/enquiries.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, email, phone, message, products, website })
      });
    } catch (networkErr) {
      throw new Error(eqT("enquiry.send_fail", "We could not send your enquiry right now. Please try again shortly, or contact Yee Lim directly via the Contact page."));
    }

    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(result.message || eqT("enquiry.send_wrong", "Something went wrong. Please try again."));
    }

    // Success — clear the basket and show the confirmation screen
    localStorage.removeItem("enquiryBasket");
    window.dispatchEvent(new Event("basketUpdated"));
    // #enquiryContent is the form/basket block. #mainContent is the <main>
    // landmark (skip-link target) and must stay visible — the confirmation
    // lives inside it.
    document.getElementById("enquiryContent").style.display = "none";
    const confirmation = document.getElementById("confirmation");
    confirmation.style.display = "block";

    // Show the reference number and the "we emailed you a copy" note.
    if (result.reference) {
      const refEl = document.getElementById("confirmationRef");
      refEl.textContent = eqT("enquiry.your_ref", "Your reference:") + " " + result.reference;
      refEl.style.display = "block";
    }
    if (result.confirmed) {
      document.getElementById("confirmationNote").style.display = "block";
    }

    // A11Y-004: success was purely visual — the page simply swapped underneath
    // a screen-reader user with no announcement and focus still on a button
    // that no longer exists. Move focus to the confirmation heading (which the
    // reference number and follow-up copy sit under) and scroll it into view.
    const heading = confirmation.querySelector("h2");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });

  } catch (err) {
    errorEl.textContent   = err.message;
    errorEl.style.display = "block";
    btn.disabled = false;
    btn.removeAttribute("aria-busy");
    btnLabel.textContent = btnLabelText;
    // Move focus to the message so screen readers announce the failure
    errorEl.focus();
    window.scrollTo({ top: errorEl.offsetTop - 100, behavior: "smooth" });
  }
}
