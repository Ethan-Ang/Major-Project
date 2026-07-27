// Yee Lim — Contact page form handler (extracted from contact.html so it
// survives Swup page swaps). The form uses inline onsubmit="submitContactForm",
// so these are exposed as globals. No per-page init is needed.

// Open the user's mail client with the message pre-filled. Used as the fallback
// when the API submit fails, so a message is never lost.
function contactMailtoFallback(name, company, email, phone, subject, message) {
  const mailSubject = encodeURIComponent(`[Website Enquiry] ${subject}`);
  const mailBody = encodeURIComponent(
`Name: ${name}
Company: ${company || "-"}
Email: ${email}
Phone: ${phone || "-"}

Message:
${message}`
  );
  const to = ylContactEmail() || "contact@yeelimadhesives.com.sg";
  window.location.href = `mailto:${to}?subject=${mailSubject}&body=${mailBody}`;
}

// The contact email, from Site Settings when available, else the built-in value.
function ylContactEmail() {
  return (window.ylSetting && window.ylSetting("contact_email", "")) || "";
}

// Build the contact email at runtime from its parts, so the raw address never
// appears in the static HTML that Cloudflare scans — that stops it being
// replaced with "[email protected]". Real visitors get the correct, clickable
// address; runs on load and across Swup swaps (self-selects on the contact page).
function ylBuildContactEmail() {
  const setting = ylContactEmail();
  document.querySelectorAll("a.contact-email-link").forEach(a => {
    const u = a.dataset.user, d = a.dataset.domain;
    const addr = setting || ((u && d) ? (u + "@" + d) : "");
    if (!addr) return;
    a.setAttribute("href", "mailto:" + addr);
    a.textContent = addr;
  });
}
if (typeof ylReady === "function") ylReady(ylBuildContactEmail);
else document.addEventListener("DOMContentLoaded", ylBuildContactEmail);

// Chinese label helper (English fallback when zh is not active).
function ctT(key, fb) { return (window.ylLang === "zh" && window.ylT) ? (window.ylT(key) || fb) : fb; }

async function submitContactForm(event) {
  event.preventDefault();

  const name = document.getElementById("contactName").value.trim();
  const company = document.getElementById("contactCompany").value.trim();
  const email = document.getElementById("contactEmail").value.trim();
  const phone = document.getElementById("contactPhone").value.trim();
  const subject = document.getElementById("contactSubject").value.trim();
  const message = document.getElementById("contactMessage").value.trim();
  const status = document.getElementById("contactFormStatus");
  const btn = document.querySelector(".contact-submit-btn");

  if (!name || !email || !subject || !message) {
    status.textContent = ctT("contact.fill_required", "Please fill in all required fields.");
    status.className = "contact-form-status error";
    return;
  }

  // The enquiries endpoint has no dedicated "subject" column, so fold it into
  // the message. products is empty for a general contact enquiry — the API
  // accepts that (only name + email are required).
  const fullMessage = "Subject: " + subject + "\n\n" + message;

  if (btn) { btn.disabled = true; btn.textContent = ctT("contact.sending", "Sending…"); }
  status.textContent = ctT("contact.sending_msg", "Sending your message…");
  status.className = "contact-form-status";

  try {
    const res = await fetch("/api/enquiries.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, company, email, phone, message: fullMessage, products: [], website: "" })
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(result.message || "Server error");

    // Success: clear the form and confirm, with the reference number if returned.
    document.querySelector(".contact-form").reset();
    const zh = (window.ylLang === "zh" && window.ylT);
    const ref = result.reference
      ? (zh ? " " + ctT("contact.ref_is", "Your reference is") + " " + result.reference + "。"
            : " " + ctT("contact.ref_is", "Your reference is") + " " + result.reference + ".")
      : "";
    status.innerHTML = ctT("contact.thanks", "Thank you. We've received your enquiry.") + ref
      + " " + ctT("contact.reply2", "Our team will reply within 1-2 business days.");
    status.className = "contact-form-status success";
  } catch (err) {
    // API unavailable — fall back to the mail client so nothing is lost, and
    // keep the user's input in the form.
    contactMailtoFallback(name, company, email, phone, subject, message);
    const fallbackEmail = ylContactEmail() || "contact@yeelimadhesives.com.sg";
    status.innerHTML = ctT("contact.fail_auto", "We could not submit your message automatically. Your email app should have opened so you can send it directly.")
      + ' ' + ctT("contact.fail_email_at", "If it did not, email us at") + ' '
      + '<a href="mailto:' + fallbackEmail + '">' + fallbackEmail + '</a>' + (window.ylLang === "zh" ? "。" : ".");
    status.className = "contact-form-status error";
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> ' + ctT("contact.send_msg", "Send Message");
    }
  }
}
