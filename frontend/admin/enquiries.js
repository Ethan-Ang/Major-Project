// API_BASE_URL is defined in data.js
// Lead lifecycle: New (needs a response) -> Replied. Status is server-backed
// (enquiries.replied) and seeded from the API on load. A lead becomes Replied
// when you reply from the admin, tap "Mark as replied" in the notification
// email, or toggle it manually. Opening a lead does NOT change its status.

// ─── State ────────────────────────────────────────────────────────
let enquiries    = [];
let filteredEnqs = [];
let currentEnqId = null;
let repliedIds   = new Set();
let loadFailed   = false; // true when the API could not be reached

// Non-dismissable banner at the top of the page. Used to make a load failure
// obvious instead of silently showing fake or stale data.
function showAdminBanner(id, text) {
  const host = document.querySelector(".admin-body");
  if (!host) return;
  let bar = document.getElementById(id);
  if (!bar) {
    bar = document.createElement("div");
    bar.id = id;
    bar.setAttribute("role", "alert");
    bar.style.cssText = "background:#fdecec;border:1px solid #f0b4b4;color:#8a1f1f;" +
      "padding:0.85rem 1.1rem;border-radius:10px;margin-bottom:1.25rem;font-size:0.9rem;" +
      "font-weight:500;display:flex;gap:0.5rem;align-items:flex-start;line-height:1.5";
    bar.innerHTML = '<span aria-hidden="true">&#9888;</span><span class="yl-banner-text"></span>';
    host.insertBefore(bar, host.firstChild);
  }
  bar.querySelector(".yl-banner-text").textContent = text;
}

function hideAdminBanner(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function isNetworkError(err) {
  return err instanceof TypeError;
}

// ─── Auth guard ───────────────────────────────────────────────────
// Validates the token against the server (matching admin.js/products.html)
// instead of only checking that one is present. An expired or revoked token
// used to slip through here — the page just showed the "could not reach the
// server" banner with an empty table instead of sending you back to login.
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("adminToken");
  if (!token) { window.location.href = "login.html"; return; }

  try {
    const res = await fetch(`${API_BASE_URL}/api/me.php`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
  } catch (err) {
    if (!isNetworkError(err)) {
      localStorage.removeItem("adminToken");
      window.location.href = "login.html";
      return;
    }
    // Backend unreachable (not an auth problem): let the page render.
    // loadEnquiries() already shows its own banner on a failed fetch.
  }

  if (typeof enhanceCustomSelect === "function") {
    enhanceCustomSelect(document.getElementById("filterStatus"));
  }

  loadEnquiries();
});

function logout() {
  localStorage.removeItem("adminToken");
  window.location.href = "login.html";
}

// ─── Load enquiries ───────────────────────────────────────────────
async function loadEnquiries() {
  const tbody = document.getElementById("enquiryTableBody");
  tbody.innerHTML = adminSkeletonRows(6, 5);

  // No demo/sample fallback here: a real inbox must never show fake leads. On a
  // failure we show a clear error state and a banner instead.
  loadFailed = false;
  try {
    const res = await fetch(`${API_BASE_URL}/api/enquiries.php`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }
    });
    if (!res.ok) throw new Error("status " + res.status);
    const data = await res.json();
    enquiries = Array.isArray(data) ? data : [];
  } catch {
    loadFailed = true;
    enquiries = [];
  }

  if (loadFailed) {
    showAdminBanner("enqLoadError",
      "Could not reach the server, so enquiries could not be loaded. Nothing shown here is a real lead. Refresh the page to try again.");
  } else {
    hideAdminBanner("enqLoadError");
  }

  // Normalise the MySQL datetime ("YYYY-MM-DD HH:MM:SS") for reliable Date parsing
  enquiries = enquiries.map(e => ({ ...e, date: String(e.date).replace(" ", "T") }));

  // Seed Replied status from the DB
  repliedIds = new Set(enquiries.filter(e => e.replied).map(e => e.id));

  filteredEnqs = [...enquiries];
  renderStats();
  renderTable();
}

function isReplied(id) { return repliedIds.has(id); }

// Persist a single enquiry's status to the server (best-effort).
async function patchReplied(id, repliedFlag) {
  if (!/^\d+$/.test(String(id))) return; // skip sample/offline rows
  try {
    await fetch(`${API_BASE_URL}/api/enquiries.php?id=${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`
      },
      body: JSON.stringify({ replied: repliedFlag ? 1 : 0 })
    });
  } catch {}
}

// ─── Stats ────────────────────────────────────────────────────────
// animate: count up from zero (initial load) vs set directly (a ±1 change
// from a single toggle, where a from-zero count-up would read as a flash).
function renderStats(animate = true) {
  const newCount = enquiries.filter(e => !isReplied(e.id)).length;
  const setNum = animate ? countUp : (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setNum("statTotal",   enquiries.length);
  setNum("statNew",     newCount);
  setNum("statReplied", enquiries.length - newCount);

  const badge = document.getElementById("unreadBadge");
  if (badge) {
    // inline-flex so the CSS centers the count (an inline "inline-block" here
    // would override the stylesheet and leave the digits sitting high).
    if (newCount > 0) { badge.textContent = newCount; badge.style.display = "inline-flex"; }
    else { badge.style.display = "none"; }
  }

  document.getElementById("tableCount").textContent =
    `${filteredEnqs.length} enquir${filteredEnqs.length !== 1 ? "ies" : "y"}`;
}

function countUp(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const dur = 600, start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ─── Render table ─────────────────────────────────────────────────
// animate: replay the staggered row entrance (initial load / filter change)
// vs a quiet in-place refresh (a single toggle), so marking one lead replied
// doesn't re-animate the whole table.
function renderTable(animate = true) {
  const tbody = document.getElementById("enquiryTableBody");

  document.getElementById("tableCount").textContent =
    `${filteredEnqs.length} enquir${filteredEnqs.length !== 1 ? "ies" : "y"}`;

  if (filteredEnqs.length === 0) {
    // Distinguish a load failure, a genuinely empty inbox, and a filter/search
    // that matched nothing. If there are enquiries but none are showing, the
    // current search or status filter is the reason.
    let msg;
    if (loadFailed)                  msg = "Could not load enquiries. Please refresh the page to try again.";
    else if (enquiries.length === 0) msg = "No enquiries yet. New leads from the website will appear here.";
    else                             msg = "No enquiries match your filters.";
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">${msg}</td></tr>`;
    return;
  }

  tbody.innerHTML = filteredEnqs.map((e, i) => {
    const replied  = isReplied(e.id);
    const products = e.products.join(", ");
    const date     = new Date(e.date).toLocaleDateString("en-SG", {
      day: "numeric", month: "short", year: "numeric"
    });

    // "unread" class = a New lead (red bar + bold) that still needs a response
    return `
      <tr class="enquiry-row ${animate ? "row-animate" : ""} ${replied ? "" : "unread"}"
          style="animation-delay:${i * 0.04}s"
          onclick="openPanel('${e.id}')">
        <td style="padding-right:0">
          ${replied ? "" : '<span class="unread-dot"></span>'}
        </td>
        <td>
          <div class="enq-name">${escapeHtml(e.name)}</div>
          <div class="enq-products">${escapeHtml(e.company)}</div>
        </td>
        <td data-label="Products">
          <div class="enq-products">${escapeHtml(products)}</div>
        </td>
        <td data-label="Date" style="white-space:nowrap;color:var(--muted);font-size:0.82rem">${date}</td>
        <td data-label="Actions" onclick="event.stopPropagation()">
          <div class="table-actions">
            <button class="icon-btn" title="Reply by email" aria-label="Reply to ${escapeHtml(e.name)} by email" onclick="replyTo('${e.id}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
              </svg>
            </button>
            <button class="icon-btn" title="${replied ? "Mark as new" : "Mark as replied"}"
              aria-label="${replied ? "Mark " + escapeHtml(e.name) + " as new" : "Mark " + escapeHtml(e.name) + " as replied"}"
              onclick="toggleReplied('${e.id}')">
              ${replied
                ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`}
            </button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

// ─── Search + filter ──────────────────────────────────────────────
function filterEnquiries() {
  const q      = document.getElementById("tableSearch").value.toLowerCase().trim();
  const status = document.getElementById("filterStatus").value;

  filteredEnqs = enquiries.filter(e => {
    const matchQ = !q ||
      e.name.toLowerCase().includes(q) ||
      (e.company || "").toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.products.some(p => p.toLowerCase().includes(q)) ||
      (e.message || "").toLowerCase().includes(q);

    const matchStatus =
      status === "all" ||
      (status === "new"     && !isReplied(e.id)) ||
      (status === "replied" &&  isReplied(e.id));

    return matchQ && matchStatus;
  });

  renderTable();
  renderStats();
}

// ─── Status changes ───────────────────────────────────────────────
function markReplied(id) {
  if (isReplied(id)) return;
  repliedIds.add(id);
  patchReplied(id, true);
  renderTable(false);
  renderStats(false);
  if (currentEnqId === id) updateToggleBtn(id);
}

// Reply from the admin: marks the lead Replied, then opens the email client.
// The address is looked up from the loaded enquiry (never passed through the
// inline attribute) and encoded, so a crafted email value cannot inject markup.
function replyTo(id) {
  const enq = enquiries.find(e => String(e.id) === String(id));
  if (!enq) return;
  markReplied(id);
  showToast("Marked as replied", "success");
  window.location.href = mailtoFor(enq.email);
}

// Build a safe mailto: link for a customer address.
function mailtoFor(email) {
  return `mailto:${encodeURIComponent(email || "")}`
       + `?subject=${encodeURIComponent("Re: Your enquiry to Yee Lim Adhesives")}`;
}

function toggleReplied(id) {
  isReplied(id) ? repliedIds.delete(id) : repliedIds.add(id);
  patchReplied(id, isReplied(id));
  renderTable(false);
  renderStats(false);
  if (currentEnqId === id) updateToggleBtn(id);
  showToast(isReplied(id) ? "Marked as replied" : "Marked as new", "success");
}

function openMarkAllRepliedModal() {
  const count = enquiries.filter(e => !isReplied(e.id)).length;
  if (count === 0) {
    showToast("No new enquiries to mark", "success");
    return;
  }
  document.getElementById("markAllRepliedCount").textContent = count;
  document.getElementById("markAllRepliedModal").classList.add("open");
}

function closeMarkAllRepliedModal() {
  document.getElementById("markAllRepliedModal").classList.remove("open");
}

function markAllReplied() {
  enquiries.forEach(e => {
    if (!isReplied(e.id)) {
      repliedIds.add(e.id);
      patchReplied(e.id, true);
    }
  });
  renderTable(false);
  renderStats(false);
  closeMarkAllRepliedModal();
  showToast("All enquiries marked as replied", "success");
}

// ─── Detail slide panel ───────────────────────────────────────────
function openPanel(id) {
  const enq = enquiries.find(e => e.id === id);
  if (!enq) return;
  currentEnqId = id; // opening only views — does NOT change status

  const date = new Date(enq.date).toLocaleString("en-SG", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
  });

  const productPills = enq.products
    .map(p => `<span class="product-tag-pill">${escapeHtml(p)}</span>`).join("");

  document.getElementById("detailPanelBody").innerHTML = `
    ${enq.reference ? `<div class="detail-field">
      <div class="detail-field-label">Reference</div>
      <div class="detail-field-value" style="font-weight:600;letter-spacing:0.3px">${escapeHtml(enq.reference)}</div>
    </div>` : ""}
    <div class="detail-field">
      <div class="detail-field-label">From</div>
      <div class="detail-field-value" style="font-weight:600">${escapeHtml(enq.name)}</div>
      <div class="detail-field-value" style="color:var(--muted)">${escapeHtml(enq.company || "")}</div>
    </div>
    <div class="detail-field">
      <div class="detail-field-label">Contact</div>
      <div class="detail-field-value">
        <a href="${escapeHtml(mailtoFor(enq.email))}" style="color:var(--red)">${escapeHtml(enq.email)}</a>
      </div>
      <div class="detail-field-value" style="color:var(--muted)">${escapeHtml(enq.phone || "Not provided")}</div>
    </div>
    <div class="detail-field">
      <div class="detail-field-label">Products Enquired</div>
      <div class="product-tag-list">${productPills}</div>
    </div>
    <div class="detail-field">
      <div class="detail-field-label">Message</div>
      <div class="detail-field-value" style="background:var(--bg);padding:0.85rem;border-radius:var(--radius);line-height:1.6">
        ${escapeHtml(enq.message)}
      </div>
    </div>
    <div class="detail-field">
      <div class="detail-field-label">Received</div>
      <div class="detail-field-value" style="color:var(--muted)">${date}</div>
    </div>
  `;

  const replyBtn = document.getElementById("replyBtn");
  replyBtn.href = mailtoFor(enq.email);
  replyBtn.onclick = () => markReplied(id); // replying from the admin marks it Replied
  updateToggleBtn(id);

  document.getElementById("detailPanel").classList.add("open");
  document.getElementById("panelOverlay").classList.add("open");
  lucide.createIcons();

  if (typeof ylFocusTrap === "function") {
    detailPanelRelease = ylFocusTrap(document.getElementById("detailPanel"), { onEscape: closePanel });
  }
}

let detailPanelRelease = null;

function updateToggleBtn(id) {
  const btn = document.getElementById("toggleReadBtn");
  btn.textContent = isReplied(id) ? "Mark as New" : "Mark as Replied";
}

function toggleCurrentRead() {
  if (currentEnqId) toggleReplied(currentEnqId);
}

function closePanel() {
  document.getElementById("detailPanel").classList.remove("open");
  document.getElementById("panelOverlay").classList.remove("open");
  currentEnqId = null;
  if (detailPanelRelease) { detailPanelRelease(); detailPanelRelease = null; }
}

// ─── Export CSV ───────────────────────────────────────────────────
function exportEnquiriesCSV() {
  const headers = ["Name", "Company", "Email", "Phone", "Products", "Message", "Date", "Status"];
  const rows = enquiries.map(e => [
    e.name, e.company, e.email, e.phone || "",
    e.products.join("; "), e.message,
    new Date(e.date).toLocaleDateString("en-SG"),
    isReplied(e.id) ? "Replied" : "New"
  ].map(v => `"${String(v).replace(/"/g, '""')}"`));

  const csv  = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `yee-lim-enquiries-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("CSV exported", "success");
}

// ─── Toast + helpers ──────────────────────────────────────────────
function showToast(message, type = "default") {
  const toast = document.getElementById("adminToast");
  toast.textContent = message;
  toast.className   = `admin-toast show${type === "success" ? " toast-success" : type === "error" ? " toast-error" : ""}`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function adminSkeletonRows(count, cols) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push(`
      <tr class="skel-row" aria-hidden="true">
        <td style="width:28px"><span class="skel skel-dot"></span></td>
        <td>
          <div class="skel skel-text skel-text-md"></div>
          <div class="skel skel-text skel-text-sm"></div>
        </td>
        <td><div class="skel skel-text skel-text-lg"></div></td>
        <td><div class="skel skel-text skel-text-pill"></div></td>
        <td><div class="skel-actions"><span class="skel skel-icon"></span><span class="skel skel-icon"></span></div></td>
      </tr>
    `);
  }
  return rows.join("");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
