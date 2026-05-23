// API_BASE_URL is defined in data.js
// Read state stored in localStorage so it persists across sessions

// ─── Sample enquiry data (replace with fetch when backend is ready) ─
const SAMPLE_ENQUIRIES = [
  {
    id: "enq001",
    name: "David Lim",
    company: "Sunrise Carpentry Pte Ltd",
    email: "david.lim@sunrisecarpentry.com.sg",
    phone: "+65 9123 4567",
    message: "Hi, we are looking for adhesives suitable for bonding high-pressure laminates to MDF boards. We have a large order coming up and need to know if you offer bulk pricing.",
    products: ["Deer™ Laminate Contact Adhesive", "Deer™ Wood Contact Adhesive"],
    date: "2026-05-21T09:14:00Z"
  },
  {
    id: "enq002",
    name: "Michelle Tan",
    company: "Pacific Marine Engineering",
    email: "m.tan@pacificmarine.com.sg",
    phone: "+65 8234 5678",
    message: "We need a marine-grade sealant that can handle saltwater exposure both above and below the waterline. Please advise on suitable products and lead time for 50 units.",
    products: ["Rhino™ Marine Sealant", "Rhino™ Heavy Duty Metal Adhesive"],
    date: "2026-05-20T14:32:00Z"
  },
  {
    id: "enq003",
    name: "Kevin Wong",
    company: "CoolTech HVAC Solutions",
    email: "kwong@cooltech.sg",
    phone: "+65 6789 0123",
    message: "We are tendering for a large cooling tower project and require adhesives for fibreglass wool insulation. Can you provide technical data sheets and MOQ details?",
    products: ["Rhino™ Cooling Tower Adhesive"],
    date: "2026-05-19T11:05:00Z"
  },
  {
    id: "enq004",
    name: "Sarah Chen",
    company: "StyleHome Interiors",
    email: "sarah@stylehome.com.sg",
    phone: "+65 9456 7890",
    message: "Looking for carpet adhesive for a commercial office fit-out — approximately 2000 sqm. Also interested in your wallpaper paste. Please send a quotation.",
    products: ["Premier™ Carpet & Turf Adhesive", "Premier™ Wallpaper Paste"],
    date: "2026-05-18T16:48:00Z"
  },
  {
    id: "enq005",
    name: "Ahmad Faizal",
    company: "AutoPro Workshop",
    email: "faizal@autopro.com.sg",
    phone: "+65 8765 4321",
    message: "We need neoprene adhesive for automotive upholstery work. Do you supply in small quantities or only bulk? Also need something heat-resistant for engine bay applications.",
    products: ["Deer™ Neoprene Rubber Adhesive", "Premier™ High Temperature Adhesive"],
    date: "2026-05-17T10:22:00Z"
  },
  {
    id: "enq006",
    name: "Rachel Ng",
    company: "FashionForward Pte Ltd",
    email: "rng@fashionforward.sg",
    phone: "+65 9012 3456",
    message: "We manufacture bags and accessories and need a reliable foam bond adhesive. Looking for something that stays flexible after bonding leather to foam.",
    products: ["Horsemen™ Foam Bond Adhesive"],
    date: "2026-05-15T09:00:00Z"
  }
];

// ─── State ────────────────────────────────────────────────────────
let enquiries      = [];
let filteredEnqs   = [];
let currentEnqId   = null;
let readIds        = new Set(JSON.parse(localStorage.getItem("readEnquiries") || "[]"));

// ─── Auth guard ───────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("adminToken");
  if (!token) { window.location.href = "login.html"; return; }
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

  // Try real API first; fall back to sample data
  try {
    const res = await fetch(`${API_BASE_URL}/api/enquiries`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }
    });
    if (res.ok) {
      enquiries = await res.json();
    } else {
      throw new Error("Use sample data");
    }
  } catch {
    enquiries = SAMPLE_ENQUIRIES;
  }

  filteredEnqs = [...enquiries];
  renderStats();
  renderTable();
}

function isRead(id) { return readIds.has(id); }

function saveReadState() {
  localStorage.setItem("readEnquiries", JSON.stringify([...readIds]));
}

// ─── Stats ────────────────────────────────────────────────────────
function renderStats() {
  const unread = enquiries.filter(e => !isRead(e.id)).length;
  countUp("statTotal",  enquiries.length);
  countUp("statUnread", unread);
  countUp("statRead",   enquiries.length - unread);

  const badge = document.getElementById("unreadBadge");
  if (unread > 0) {
    badge.textContent  = unread;
    badge.style.display = "inline-block";
  } else {
    badge.style.display = "none";
  }

  document.getElementById("tableCount").textContent =
    `${filteredEnqs.length} enquir${filteredEnqs.length !== 1 ? "ies" : "y"}`;
}

function countUp(id, target) {
  const el    = document.getElementById(id);
  const dur   = 600;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ─── Render table ─────────────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById("enquiryTableBody");

  document.getElementById("tableCount").textContent =
    `${filteredEnqs.length} enquir${filteredEnqs.length !== 1 ? "ies" : "y"}`;

  if (filteredEnqs.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No enquiries found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filteredEnqs.map((e, i) => {
    const read     = isRead(e.id);
    const products = e.products.join(", ");
    const date     = new Date(e.date).toLocaleDateString("en-SG", {
      day: "numeric", month: "short", year: "numeric"
    });

    return `
      <tr class="enquiry-row row-animate ${read ? "" : "unread"}"
          style="animation-delay:${i * 0.04}s"
          onclick="openPanel('${e.id}')">
        <td style="padding-right:0">
          ${read ? "" : '<span class="unread-dot"></span>'}
        </td>
        <td>
          <div class="enq-name">${escapeHtml(e.name)}</div>
          <div class="enq-products">${escapeHtml(e.company)}</div>
        </td>
        <td>
          <div class="enq-products">${escapeHtml(products)}</div>
        </td>
        <td style="white-space:nowrap;color:var(--muted);font-size:0.82rem">${date}</td>
        <td onclick="event.stopPropagation()">
          <div class="table-actions">
            <button class="btn btn-ghost" title="Reply by email"
              onclick="window.location.href='mailto:${e.email}'">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </button>
            <button class="btn btn-ghost" title="${read ? "Mark as unread" : "Mark as read"}"
              onclick="toggleRead('${e.id}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${read
                  ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
                  : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'}
              </svg>
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
      e.company.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.products.some(p => p.toLowerCase().includes(q)) ||
      e.message.toLowerCase().includes(q);

    const matchStatus =
      status === "all" ||
      (status === "unread" && !isRead(e.id)) ||
      (status === "read"   && isRead(e.id));

    return matchQ && matchStatus;
  });

  renderTable();
  renderStats();
}

// ─── Mark read/unread ─────────────────────────────────────────────
function toggleRead(id) {
  isRead(id) ? readIds.delete(id) : readIds.add(id);
  saveReadState();
  renderTable();
  renderStats();
  if (currentEnqId === id) updateToggleBtn(id);
  showToast(isRead(id) ? "Marked as read" : "Marked as unread", "success");
}

function markAllRead() {
  enquiries.forEach(e => readIds.add(e.id));
  saveReadState();
  renderTable();
  renderStats();
  showToast("All enquiries marked as read", "success");
}

// ─── Detail slide panel ───────────────────────────────────────────
function openPanel(id) {
  const enq = enquiries.find(e => e.id === id);
  if (!enq) return;

  currentEnqId = id;
  if (!isRead(id)) {
    readIds.add(id);
    saveReadState();
    renderTable();
    renderStats();
  }

  const date = new Date(enq.date).toLocaleString("en-SG", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });

  const productPills = enq.products
    .map(p => `<span class="product-tag-pill">${escapeHtml(p)}</span>`)
    .join("");

  document.getElementById("detailPanelBody").innerHTML = `
    <div class="detail-field">
      <div class="detail-field-label">From</div>
      <div class="detail-field-value" style="font-weight:600">${escapeHtml(enq.name)}</div>
      <div class="detail-field-value" style="color:var(--muted)">${escapeHtml(enq.company)}</div>
    </div>
    <div class="detail-field">
      <div class="detail-field-label">Contact</div>
      <div class="detail-field-value">
        <a href="mailto:${enq.email}" style="color:var(--red)">${escapeHtml(enq.email)}</a>
      </div>
      <div class="detail-field-value" style="color:var(--muted)">${escapeHtml(enq.phone || "—")}</div>
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

  document.getElementById("replyBtn").href = `mailto:${enq.email}?subject=Re: Product Enquiry — Yee Lim Adhesives`;
  updateToggleBtn(id);

  document.getElementById("detailPanel").classList.add("open");
  document.getElementById("panelOverlay").classList.add("open");
  lucide.createIcons();
}

function updateToggleBtn(id) {
  const btn = document.getElementById("toggleReadBtn");
  btn.textContent = isRead(id) ? "Mark as Unread" : "Mark as Read";
}

function toggleCurrentRead() {
  if (currentEnqId) toggleRead(currentEnqId);
}

function closePanel() {
  document.getElementById("detailPanel").classList.remove("open");
  document.getElementById("panelOverlay").classList.remove("open");
  currentEnqId = null;
}

// ─── Export CSV ───────────────────────────────────────────────────
function exportEnquiriesCSV() {
  const headers = ["Name", "Company", "Email", "Phone", "Products", "Message", "Date", "Status"];
  const rows = enquiries.map(e => [
    e.name, e.company, e.email, e.phone || "",
    e.products.join("; "), e.message,
    new Date(e.date).toLocaleDateString("en-SG"),
    isRead(e.id) ? "Read" : "Unread"
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
  const toast  = document.getElementById("adminToast");
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
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
