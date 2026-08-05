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
const ADVISOR_ENQUIRY_SUMMARY_KEY = "ylProductAdvisorEnquirySummary";
const ADVISOR_ENQUIRY_SUMMARY_TTL_MS = 12 * 60 * 60 * 1000;
let enquiryBasketRepairEventQueued = false;

// Treat localStorage as untrusted input. core/app.js intentionally exposes the
// parsed value, which means valid JSON can still be the wrong type. Every
// Enquiry consumer uses this bounded canonical list so corrupt storage cannot
// crash the page or create an attacker-sized skeleton with String#repeat.
function enquiryBasketIds() {
  let value = [];
  try { value = typeof getBasket === "function" ? getBasket() : []; } catch (error) {}
  const knownIds = typeof PRODUCTS !== "undefined" && Array.isArray(PRODUCTS) && PRODUCTS.length
    ? new Set(PRODUCTS.map(function (product) { return String(product.id); }))
    : null;
  const ids = Array.isArray(value)
    ? Array.from(new Set(value.filter(function (id) {
        const stringId = String(id);
        return (typeof id === "string" || typeof id === "number") && /^\d{1,12}$/.test(stringId)
          && (!knownIds || knownIds.has(stringId));
      }).map(String))).slice(0, 100)
    : [];
  try {
    const canonical = JSON.stringify(ids);
    if (localStorage.getItem("enquiryBasket") !== canonical) {
      localStorage.setItem("enquiryBasket", canonical);
      if (!enquiryBasketRepairEventQueued) {
        enquiryBasketRepairEventQueued = true;
        queueMicrotask(function () {
          enquiryBasketRepairEventQueued = false;
          window.dispatchEvent(new Event("basketUpdated"));
        });
      }
    }
  } catch (error) {}
  return ids;
}

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
  const count = enquiryBasketIds().length;
  if (!count) {
    renderBasket();
    return;
  }
  syncAttachedChrome(count);
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
  applyAdvisorEnquirySummary();
  // Subject uses the same accessible custom dropdown as the catalogue sort,
  // replacing the native browser option list. The native <select> stays in the
  // DOM as the value source, so submitEnquiry is unchanged. Safe to re-run
  // across Swup swaps (enhanceCustomSelect guards against double enhancement).
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

// The Advisor handoff is deliberately a concise structured summary, never a
// transcript. It is appended to the editable message field and marked on this
// particular textarea node so repeated ylReady runs cannot duplicate it. The
// session record remains until a successful enquiry, allowing a fresh Swup DOM
// or same-tab refresh to recover the explicit handoff.
function applyAdvisorEnquirySummary() {
  const eMessage = document.getElementById("eMessage");
  if (!eMessage) return;
  try {
    const raw = sessionStorage.getItem(ADVISOR_ENQUIRY_SUMMARY_KEY);
    if (!raw) return;
    const handoff = JSON.parse(raw);
    const now = Date.now();
    if (!handoff || handoff.schemaVersion !== 1 || typeof handoff.id !== "string" || !handoff.id
        || typeof handoff.summaryText !== "string" || !handoff.summaryText.trim()
        || !Number.isFinite(handoff.updatedAt) || handoff.updatedAt > now + 300000
        || now - handoff.updatedAt > ADVISOR_ENQUIRY_SUMMARY_TTL_MS
        || handoff.summaryText.length > 900
        || !Array.isArray(handoff.productIds) || !Array.isArray(handoff.productNames)) {
      return;
    }
    if (eMessage.dataset.advisorSummaryId === handoff.id) return;

    const existing = eMessage.value;
    const summary = handoff.summaryText.trim();
    const separator = existing.trim() ? "\n\n" : "";
    const maxLength = Number(eMessage.getAttribute("maxlength")) || 1000;
    if (!existing.includes(summary) && existing.length + separator.length + summary.length > maxLength) {
      let notice = document.getElementById("eAdvisorSummaryFitNotice");
      if (!notice) {
        notice = document.createElement("p");
        notice.id = "eAdvisorSummaryFitNotice";
        notice.className = "field-hint";
        notice.setAttribute("role", "status");
        eMessage.insertAdjacentElement("afterend", notice);
      }
      const needed = existing.length + separator.length + summary.length - maxLength;
      notice.textContent = eqFill(eqT(
        "enquiry.advisor_summary_no_space",
        "Your Product Advisor summary is ready, but the Message field needs {count} more characters. Shorten your message to include the complete editable summary."
      ), { count: needed });
      const describedBy = new Set((eMessage.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
      describedBy.add(notice.id);
      eMessage.setAttribute("aria-describedby", Array.from(describedBy).join(" "));
      if (!eMessage._ylAdvisorSummaryRetryBound) {
        eMessage._ylAdvisorSummaryRetryBound = true;
        eMessage.addEventListener("input", applyAdvisorEnquirySummary);
      }
      return;
    }
    if (!existing.includes(summary)) {
      eMessage.value = existing + separator + summary;
    }
    eMessage.dataset.advisorSummaryId = handoff.id;
    const notice = document.getElementById("eAdvisorSummaryFitNotice");
    if (notice) notice.remove();
    const describedBy = (eMessage.getAttribute("aria-describedby") || "").split(/\s+/)
      .filter(function (id) { return id && id !== "eAdvisorSummaryFitNotice"; });
    eMessage.setAttribute("aria-describedby", describedBy.join(" "));
    eMessage.dispatchEvent(new Event("input", { bubbles: true }));
  } catch (error) {}
}

ylOnce("advisor-enquiry-basket-sync", function () {
  window.addEventListener("basketUpdated", function () {
    if (document.getElementById("basketList")) renderBasket();
  });
});

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

// Panel chrome that depends on how many products are attached. THE FORM IS
// NEVER TOUCHED HERE — this only toggles controls in the left column, which is
// what makes removing the last product safe for anything already typed in.
function syncAttachedChrome(count) {
  // With nothing attached there is no section heading and no footer: the empty
  // note is the heading, and it carries its own actions. Showing the footer too
  // would put two advisor controls on screen at once.
  const head = document.getElementById("enquiryColHead");
  if (head) head.hidden = count === 0;
  const band = document.getElementById("enquiryTotalBand");
  if (band) band.hidden = count === 0;
  // Emphasised number + quiet unit. `count` is a number, so this innerHTML
  // carries no untrusted text.
  const totalCount = document.getElementById("enquiryTotalCount");
  if (totalCount && count > 0) {
    totalCount.innerHTML = `<b>${count}</b> ${eqItemWord(count)}`;
  }

  // Name the region after whichever heading is actually live, so assistive tech
  // never labels it from a hidden element.
  const section = document.getElementById("enquiryAttachSection");
  if (section) {
    section.setAttribute("aria-labelledby",
      count === 0 ? "attachedHeadingEmpty" : "attachedHeadingFull");
  }

  // Message helper copy follows what the enquiry is about. data-i18n is updated
  // alongside the text so a Swup swap or language switch re-applies the matching
  // string rather than reverting to the other one. This touches a <p>, never a
  // field — nothing the visitor has typed can be disturbed by it.
  const hint = document.getElementById("eMessageHint");
  if (hint) {
    const key = count === 0 ? "enquiry.msg_hint_general" : "enquiry.msg_hint_products";
    const fallback = count === 0
      ? "Tell us what you need help with, including your application, materials or estimated quantity."
      : "Tell us about your requirements, quantity or any questions about the attached products.";
    hint.setAttribute("data-i18n", key);
    hint.textContent = eqT(key, fallback);
  }
}

function renderBasket() {
  const ids = enquiryBasketIds();
  const products = ids.map(id => PRODUCTS.find(p => String(p.id) === String(id))).filter(Boolean);
  const list = document.getElementById("basketList");
  if (!list) return;
  syncAttachedChrome(products.length);

  if (products.length === 0) {
    // Zero attached products is NORMAL. A compact panel that states the fact,
    // says plainly that an enquiry can still be sent, and offers one quiet way
    // to the catalogue. No page takeover, no hidden form, no primary CTA — the
    // Product Advisor entry point lives in its own card below, not repeated
    // here. The document icon replaces the old shopping cart: this is a B2B
    // enquiry with optional attachments, not a checkout.
    list.innerHTML = `
      <div class="basket-empty">
        <span class="basket-empty-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>
        </span>
        <h2 id="attachedHeadingEmpty">${eqT("enquiry.empty_title", "No products selected")}</h2>
        <p>${eqT("enquiry.empty_body", "You can continue with a general enquiry, or add a product for more specific advice.")}</p>
        <div class="basket-empty-actions">
          <a href="/products" class="enquiry-quiet-btn" id="enquiryBrowseLink" data-i18n="enquiry.browse">${eqT("enquiry.browse", "Browse products")}</a>
          <button type="button" class="enquiry-quiet-btn" aria-haspopup="dialog"
            onclick="if(window.openProductAdvisor){window.openProductAdvisor()}else if(window.ylSwup){window.ylSwup.navigate('/contact')}else{window.location.href='/contact'}"
            data-i18n="enquiry.open_advisor">${eqT("enquiry.open_advisor", "Open Product Advisor")}</button>
        </div>
      </div>`;
    return;
  }

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
  const before = enquiryBasketIds();
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

  // NOTE what is deliberately absent from this whole function: any check on how
  // many products are attached. Zero is a valid submission.

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
  const ids = enquiryBasketIds();
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
    sessionStorage.removeItem(ADVISOR_ENQUIRY_SUMMARY_KEY);
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
