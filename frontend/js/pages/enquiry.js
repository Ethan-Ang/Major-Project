// Yee Lim — Enquiry page controller (extracted from enquiry.html so it survives
// Swup page swaps). Uses the shared basket API in core/app.js.
//
// PRODUCTS ARE OPTIONAL. Zero attached products is a valid submission state, so
// nothing in here hides, disables or re-renders the form based on the basket.
// renderBasket() only ever touches the LEFT column, which is what keeps details
// the customer has already typed intact when they remove the last product.

// Chinese label helpers (English fallback when zh is not active).
function eqT(key, fb) { return (window.ylLang === "zh" && window.ylT) ? (window.ylT(key) || fb) : fb; }
function eqItemWord(n) { return window.ylLang === "zh" ? "件" : (n !== 1 ? "items" : "item"); }

// Fill {placeholders} in a translated string.
function eqFill(str, vars) {
  return String(str).replace(/\{(\w+)\}/g, function (m, k) {
    return Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m;
  });
}

// Loading skeleton (catalogue shimmer style) while product data is fetched, so
// the basket area is not blank on a slow connection.
function renderBasketSkeleton() {
  const list = document.getElementById("basketList");
  if (!list) return;
  const count = getBasket().length;
  const totalBand = document.getElementById("enquiryTotalBand");
  const totalCount = document.getElementById("enquiryTotalCount");
  if (!count) {
    renderBasket();
    return;
  }
  syncAttachedChrome(count);
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
  // Enquiry topic uses the same accessible custom dropdown as the catalogue
  // sort, replacing the native browser option list. The native <select> stays
  // in the DOM as the value source, so reading .value below is unchanged. Safe
  // to re-run across Swup swaps (enhanceCustomSelect guards against double
  // enhancement).
  if (typeof enhanceCustomSelect === "function") {
    enhanceCustomSelect(document.getElementById("eSubject"));
  }
  initEnquiryTopic();
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

// Panel chrome that depends on how many products are attached: the "Clear all"
// control, the sub-line, the Browse/Add-another label and the Message label.
// The FORM ITSELF IS NEVER TOUCHED HERE — only labels, so no field is re-created
// and no typed value can be lost.
function syncAttachedChrome(count) {
  const clearBtn = document.getElementById("clearAllBtn");
  if (clearBtn) clearBtn.hidden = count === 0;

  // Sub-line: only meaningful when there is something to review.
  const sub = document.getElementById("enquiryBasketSub");
  if (sub) sub.hidden = count === 0;

  // One link, two jobs: the entry point to the catalogue reads "Browse products"
  // when nothing is attached and "Add another product" once something is.
  // data-i18n is updated too so a Swup swap or language switch re-applies the
  // matching string rather than reverting to the other one.
  const browse = document.getElementById("enquiryBrowseLink");
  if (browse) {
    const key = count === 0 ? "enquiry.browse" : "enquiry.add_another";
    const fallback = count === 0 ? "Browse products" : "Add another product";
    browse.setAttribute("data-i18n", key);
    browse.textContent = eqT(key, fallback);
  }

  // Message label follows what the enquiry is about.
  const msgLabel = document.getElementById("eMessageLabel");
  if (msgLabel) {
    const key = count === 0 ? "enquiry.f_message_general" : "enquiry.f_message_products";
    const fallback = count === 0 ? "How can we help?" : "Tell us about your requirements";
    msgLabel.setAttribute("data-i18n", key);
    msgLabel.textContent = eqT(key, fallback);
  }
}

// The control assistive tech actually reaches for the topic field. Once
// enhanceCustomSelect has run, the native <select> is aria-hidden and
// unfocusable, so error state and focus belong on the trigger button.
function subjectControl() {
  const select = document.getElementById("eSubject");
  if (!select) return null;
  const wrap = select.closest(".custom-select-wrap");
  return (wrap && wrap.querySelector(".custom-select-trigger")) || select;
}

// "Product recommendation" is the one topic where the team needs specifics to
// answer at all, so it gets a hint. Bound once per page view; guarded so a
// Swup re-init never stacks listeners.
function initEnquiryTopic() {
  const select = document.getElementById("eSubject");
  if (!select || select._ylTopicBound) return;
  select._ylTopicBound = true;
  select.addEventListener("change", syncTopicHint);
  syncTopicHint();
}

function syncTopicHint() {
  const select = document.getElementById("eSubject");
  const hint = document.getElementById("eSubjectHint");
  if (!select || !hint) return;
  // Match on the option's POSITION, not its text: the label is translated, so
  // comparing against an English string would silently stop working in Chinese.
  const isRecommendation = select.selectedIndex === 1;
  hint.hidden = !isRecommendation;

  // Only describe the field by the hint while the hint is actually showing, and
  // never clobber an active error message.
  const control = subjectControl();
  if (control && control.getAttribute("aria-invalid") !== "true") {
    if (isRecommendation) control.setAttribute("aria-describedby", "eSubjectHint");
    else control.removeAttribute("aria-describedby");
  }
}

function renderBasket() {
  const ids = getBasket();
  const products = ids.map(id => PRODUCTS.find(p => String(p.id) === String(id))).filter(Boolean);
  const list = document.getElementById("basketList");
  if (!list) return;
  const totalBand = document.getElementById("enquiryTotalBand");
  const totalCount = document.getElementById("enquiryTotalCount");

  syncAttachedChrome(products.length);

  if (products.length === 0) {
    // Zero attached products is NORMAL, not an error and not a dead end: a
    // compact note inside the same panel, with the form still sitting beside it
    // fully usable. No full-bleed empty card, no hidden form, no grid collapse.
    // The document icon replaces the old shopping cart — this is a B2B enquiry,
    // not a checkout.
    list.innerHTML = `
      <div class="basket-none">
        <span class="basket-none-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </span>
        <div class="basket-none-copy">
          <strong>${eqT("enquiry.empty_title", "No products selected")}</strong>
          <p>${eqT("enquiry.empty_body", "That's okay. You can still submit a general enquiry or ask us for a product recommendation.")}</p>
        </div>
      </div>`;
    if (totalBand) totalBand.style.display = "none";
    return;
  }

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
        <button class="basket-remove" onclick="removeFromBasket('${p.id}')" aria-label="${ylEscapeHtml(eqFill(eqT("enquiry.remove_aria", "Remove {product} from your enquiry"), { product: p.name }))}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          <span>${eqT("enquiry.remove", "Remove")}</span>
        </button>
      </div>
    `;
  }).join("");
}

// Removing a product rewrites only the left panel, so focus needs a deliberate
// home: the next Remove button when one exists, otherwise the catalogue link
// that has taken its place. Without this, focus falls back to <body> and a
// keyboard user is dumped at the top of the page.
function restoreFocusAfterRemove(index) {
  const buttons = document.querySelectorAll("#basketList .basket-remove");
  if (buttons.length) {
    (buttons[Math.min(index, buttons.length - 1)]).focus();
    return;
  }
  const browse = document.getElementById("enquiryBrowseLink");
  if (browse) browse.focus();
}

function removeFromBasket(id) {
  const before = getBasket().map(String);
  const index = before.indexOf(String(id));
  const removed = PRODUCTS.find(p => String(p.id) === String(id));
  const name = removed ? removed.name : eqT("enquiry.remove", "Remove");

  const basket = before.filter(i => i !== String(id));
  saveBasket(basket);
  renderBasket();

  // Announce the new state, and say plainly that the enquiry can still be sent
  // — the zero case is the one a screen-reader user would otherwise read as a
  // dead end.
  if (typeof window.announce === "function") {
    const left = basket.length;
    window.announce(left === 0
      ? eqFill(eqT("enquiry.a11y_removed_last", "{product} removed. No products attached. You can still submit your enquiry."), { product: name })
      : eqFill(eqT("enquiry.a11y_removed", "{product} removed. {count} {unit} still attached."),
               { product: name, count: left, unit: eqItemWord(left) }));
  }
  restoreFocusAfterRemove(index < 0 ? 0 : index);
}

function clearAllBasket() {
  saveBasket([]);
  renderBasket();
  if (typeof window.announce === "function") {
    window.announce(eqT("enquiry.a11y_cleared", "All products removed. No products attached. You can still submit your enquiry."));
  }
  const browse = document.getElementById("enquiryBrowseLink");
  if (browse) browse.focus();
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
    subject.trim() ? `${eqT("enquiry.f_subject_plain", "Enquiry topic")}: ${subject.trim()}` : "",
    document.getElementById("eMessage").value.trim(),
    notes.trim() ? `${eqT("enquiry.f_notes", "Enquiry Notes")}: ${notes.trim()}` : "",
  ].filter(Boolean).join("\n\n");

  const privacy = document.getElementById("ePrivacy");
  const privacyErr = document.getElementById("ePrivacyErr");
  const subjectErr = document.getElementById("eSubjectErr");
  const subjectCtl = subjectControl();

  // Reset previous error state (summary + inline messages)
  ["eName", "eCompany", "eEmail"].forEach(fid => {
    const field = document.getElementById(fid);
    field.removeAttribute("aria-invalid");
    field.removeAttribute("aria-describedby");
    const inline = document.getElementById(fid + "Err");
    if (inline) inline.hidden = true;
  });
  if (subjectCtl) {
    subjectCtl.removeAttribute("aria-invalid");
    subjectCtl.removeAttribute("aria-describedby");
  }
  if (subjectErr) subjectErr.hidden = true;
  syncTopicHint(); // restores the hint's aria-describedby if it is showing
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

  // Enquiry topic gate. NOTE what is deliberately absent from this whole
  // function: any check on how many products are attached. Zero is valid.
  if (!subject.trim()) {
    if (subjectCtl) {
      subjectCtl.setAttribute("aria-invalid", "true");
      if (subjectErr) subjectCtl.setAttribute("aria-describedby", subjectErr.id);
    }
    if (subjectErr) subjectErr.hidden = false;
    errorEl.textContent   = eqT("enquiry.err_subject", "Please choose an enquiry topic.");
    errorEl.style.display = "block";
    if (subjectCtl) subjectCtl.focus();
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

  // Resolve the basket's product IDs into product names for the enquiry record.
  // An empty basket sends an empty array — a truthful "nothing attached". It
  // must never be padded with a placeholder name or a fake id to keep some
  // downstream code happy; every consumer handles [] explicitly instead.
  const ids = getBasket();
  const products = ids
    .map(id => PRODUCTS.find(p => String(p.id) === String(id)))
    .filter(Boolean)
    .map(p => p.name);
  const hadProducts = products.length > 0;

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

    // Tell the truth about what was sent: mention attached products only when
    // there actually were some, otherwise confirm the general enquiry is with
    // the team. No invented "enquiry history" or other new affordance here.
    const withProducts = document.getElementById("confirmationProducts");
    const generalOnly  = document.getElementById("confirmationGeneral");
    if (withProducts) withProducts.hidden = !hadProducts;
    if (generalOnly)  generalOnly.hidden  = hadProducts;

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
