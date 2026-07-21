// ─── Document Downloads (CLIENT-004) ──────────────────────────────
// Admin viewer for SDS/TDS download records from api/downloads.php. Self-contained
// (own auth guard + helpers), matching the enquiries page pattern.

let DOWNLOADS = [];
let selected = new Set();
let pendingDelete = null; // number id, or "selected"

function isNetworkError(err) { return err instanceof TypeError; }
function authHeader() { return { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }; }

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("adminToken");
  if (!token) { window.location.href = "login.html"; return; }
  try {
    const res = await fetch(`${API_BASE_URL}/api/me.php`, { headers: authHeader() });
    if (!res.ok) throw new Error();
  } catch (err) {
    if (!isNetworkError(err)) { localStorage.removeItem("adminToken"); window.location.href = "login.html"; return; }
  }
  if (typeof enhanceCustomSelect === "function") {
    enhanceCustomSelect(document.getElementById("filterType"));
  }
  loadDownloads();
});

function logout() { localStorage.removeItem("adminToken"); window.location.href = "login.html"; }

async function loadDownloads() {
  const tbody = document.getElementById("downloadTableBody");
  tbody.innerHTML = downloadSkeletonRows(6);
  try {
    const res = await fetch(`${API_BASE_URL}/api/downloads.php`, { headers: authHeader() });
    if (!res.ok) throw new Error("status " + res.status);
    const data = await res.json();
    DOWNLOADS = Array.isArray(data) ? data.map(d => ({ ...d, date: String(d.date).replace(" ", "T") })) : [];
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--red)">Could not load downloads. Refresh to try again.</td></tr>`;
    return;
  }
  selected.clear();
  renderStats();
  renderTable();
}

function renderStats() {
  const sds = DOWNLOADS.filter(d => d.docType === "SDS").length;
  document.getElementById("statTotal").textContent = DOWNLOADS.length;
  document.getElementById("statSds").textContent = sds;
  document.getElementById("statTds").textContent = DOWNLOADS.length - sds;
}

function filtered() {
  const q = document.getElementById("tableSearch").value.trim().toLowerCase();
  const type = document.getElementById("filterType").value;
  return DOWNLOADS.filter(d => {
    if (type !== "all" && d.docType !== type) return false;
    if (!q) return true;
    return [d.name, d.company, d.email, d.productName].some(v => String(v || "").toLowerCase().includes(q));
  });
}

function renderTable() {
  const tbody = document.getElementById("downloadTableBody");
  const card  = document.getElementById("downloadsCard");
  const empty = document.getElementById("downloadsEmptyState");
  const rows  = filtered();

  // No records at all: show the teaching empty state, hide the table card.
  if (!DOWNLOADS.length) {
    if (card) card.style.display = "none";
    if (empty) empty.style.display = "flex";
    if (window.lucide) lucide.createIcons();
    return;
  }
  if (card) card.style.display = "";
  if (empty) empty.style.display = "none";

  document.getElementById("tableCount").textContent = rows.length
    ? `${rows.length} record${rows.length === 1 ? "" : "s"}` : "";

  if (!rows.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">No records match your search.</td></tr>`;
    syncSelectionUI();
    return;
  }

  tbody.innerHTML = rows.map(d => {
    const cls = d.docType === "SDS" ? "dl-doc-sds" : "dl-doc-tds";
    const date = new Date(d.date);
    const dateStr = isNaN(date) ? escapeHtml(d.date) : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const checked = selected.has(d.id) ? "checked" : "";
    return `
      <tr>
        <td><input type="checkbox" class="row-check" value="${d.id}" ${checked} onchange="toggleRow(${d.id}, this.checked)" aria-label="Select ${escapeAttr(d.name)}"></td>
        <td><strong>${escapeHtml(d.name)}</strong><div class="dl-sub">${escapeHtml(d.company) || "—"}</div></td>
        <td>${escapeHtml(d.email)}<div class="dl-sub">${escapeHtml(d.phone) || "—"}</div></td>
        <td>${escapeHtml(d.productName)}</td>
        <td><span class="dl-doc-badge ${cls}">${escapeHtml(d.docType)}</span></td>
        <td>${dateStr}</td>
        <td><button class="icon-btn danger" title="Delete record" aria-label="Delete ${escapeAttr(d.name)}" onclick="openDeleteModal(${d.id})"><i data-lucide="trash-2"></i></button></td>
      </tr>`;
  }).join("");

  syncSelectionUI();
  if (window.lucide) lucide.createIcons();
}

// ─── Selection ────────────────────────────────────────────────────
function toggleRow(id, on) { if (on) selected.add(id); else selected.delete(id); syncSelectionUI(); }
function toggleSelectAll() {
  const on = document.getElementById("selectAll").checked;
  filtered().forEach(d => { if (on) selected.add(d.id); else selected.delete(d.id); });
  renderTable();
}
function syncSelectionUI() {
  const btn = document.getElementById("deleteSelectedBtn");
  document.getElementById("selCount").textContent = selected.size;
  btn.style.display = selected.size ? "inline-flex" : "none";
  const rows = filtered();
  const all = document.getElementById("selectAll");
  if (all) all.checked = rows.length > 0 && rows.every(d => selected.has(d.id));
}

// ─── Delete ───────────────────────────────────────────────────────
function openDeleteModal(id) {
  const d = DOWNLOADS.find(x => x.id === id);
  if (!d) return;
  pendingDelete = id;
  document.getElementById("deleteText").innerHTML = `Delete the download record for <strong>${escapeHtml(d.name)}</strong> (${escapeHtml(d.docType)} · ${escapeHtml(d.productName)})?`;
  document.getElementById("deleteModal").classList.add("open");
}
function deleteSelected() {
  if (!selected.size) return;
  pendingDelete = "selected";
  document.getElementById("deleteText").innerHTML = `Delete <strong>${selected.size}</strong> selected download record${selected.size === 1 ? "" : "s"}?`;
  document.getElementById("deleteModal").classList.add("open");
}
function closeDeleteModal() { pendingDelete = null; document.getElementById("deleteModal").classList.remove("open"); }

async function confirmDelete() {
  const btn = document.getElementById("confirmDeleteBtn");
  btn.disabled = true; btn.innerHTML = `<span class="btn-spinner"></span> Deleting…`;
  let res;
  try {
    if (pendingDelete === "selected") {
      res = await fetch(`${API_BASE_URL}/api/downloads.php`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
    } else {
      res = await fetch(`${API_BASE_URL}/api/downloads.php?id=${pendingDelete}`, { method: "DELETE", headers: authHeader() });
    }
  } catch (err) {
    btn.disabled = false; btn.textContent = "Delete";
    showToast("Could not reach the server", "error");
    return;
  }
  btn.disabled = false; btn.textContent = "Delete";
  closeDeleteModal();
  if (!res.ok) { showToast("Could not delete", "error"); return; }
  showToast("Deleted", "success");
  selected.clear();
  await loadDownloads();
}

// ─── Helpers ──────────────────────────────────────────────────────
// Shimmer skeleton rows matching this table's 7 columns, shown while records load.
function downloadSkeletonRows(count) {
  let out = "";
  for (let i = 0; i < count; i++) {
    out += `
      <tr class="skel-row" aria-hidden="true">
        <td style="width:28px"><span class="skel skel-checkbox"></span></td>
        <td><div class="skel skel-text skel-text-md"></div><div class="skel skel-text skel-text-sm"></div></td>
        <td><div class="skel skel-text skel-text-md"></div><div class="skel skel-text skel-text-sm"></div></td>
        <td><div class="skel skel-text skel-text-lg"></div></td>
        <td><div class="skel skel-pill"></div></td>
        <td><div class="skel skel-text skel-text-sm"></div></td>
        <td><div class="skel-actions"><span class="skel skel-icon"></span></div></td>
      </tr>`;
  }
  return out;
}

function showToast(message, type = "default") {
  const toast = document.getElementById("adminToast");
  toast.textContent = message;
  toast.className = `admin-toast show${type === "success" ? " toast-success" : type === "error" ? " toast-error" : ""}`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}
function escapeHtml(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escapeAttr(str) { return escapeHtml(str).replace(/'/g, "&#39;"); }
