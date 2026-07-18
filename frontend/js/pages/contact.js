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
  window.location.href = `mailto:contact@yeelimadhesives.com.sg?subject=${mailSubject}&body=${mailBody}`;
}

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
    status.textContent = "Please fill in all required fields.";
    status.className = "contact-form-status error";
    return;
  }

  // The enquiries endpoint has no dedicated "subject" column, so fold it into
  // the message. products is empty for a general contact enquiry — the API
  // accepts that (only name + email are required).
  const fullMessage = "Subject: " + subject + "\n\n" + message;

  if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
  status.textContent = "Sending your message…";
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
    const ref = result.reference ? " Your reference is " + result.reference + "." : "";
    status.innerHTML = "Thank you. We've received your enquiry." + ref
      + " Our team will reply within 1&ndash;2 business days.";
    status.className = "contact-form-status success";
  } catch (err) {
    // API unavailable — fall back to the mail client so nothing is lost, and
    // keep the user's input in the form.
    contactMailtoFallback(name, company, email, phone, subject, message);
    status.innerHTML = 'We could not submit your message automatically. Your email app should have opened so you can send it directly. '
      + 'If it did not, email us at '
      + '<a href="mailto:contact@yeelimadhesives.com.sg">contact@yeelimadhesives.com.sg</a>.';
    status.className = "contact-form-status error";
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send Message';
    }
  }
}
