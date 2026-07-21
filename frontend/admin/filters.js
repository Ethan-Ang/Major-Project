// ─── Catalogue Filters (CLIENT-005) ───────────────────────────────
// Admin management for the catalogue taxonomies (Product Types, Brands,
// Industries, Surfaces) served by api/taxonomies.php. Self-contained (its own
// auth guard + helpers), matching the enquiries.js page pattern.

const GROUP_META = {
  product_type: {
    title: "Product Types", singular: "product type", brand: false,
    hint: "The broadest catalogue split (e.g. Adhesives vs Spray Guns). Every product is assigned one on its edit page.",
  },
  brand: {
    title: "Brands", singular: "brand", brand: true,
    hint: "Yee Lim's product brands. A hidden brand stays assignable on the product form but does not appear in the public Brand filter.",
  },
  industry: {
    title: "Industries", singular: "industry", brand: false,
    hint: "Industry tags shown in the filter sidebar. Assign them to products in the Industries field on each product.",
  },
  surface: {
    title: "Surfaces", singular: "surface", brand: false,
    hint: "Surface / material tags shown in the filter sidebar. Assign them in the Surfaces field on each product.",
  },
};

let TERMS = { product_type: [], brand: [], industry: [], surface: [] };
let currentGroup = "product_type";
let pendingDeleteId = null;

function isNetworkError(err) { return err instanceof TypeError; }
function authHeader() { return { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }; }

// ─── Auth guard ───────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("adminToken");
  if (!token) { window.location.href = "login.html"; return; }
  try {
    const res = await fetch(`${API_BASE_URL}/api/me.php`, { headers: authHeader() });
    if (!res.ok) throw new Error();
  } catch (err) {
    if (!isNetworkError(err)) {
      localStorage.removeItem("adminToken");
      window.location.href = "login.html";
      return;
    }
  }
  loadTerms();
});

function logout() {
  localStorage.removeItem("adminToken");
  window.location.href = "login.html";
}

// ─── Load ─────────────────────────────────────────────────────────
async function loadTerms() {
  const tbody = document.getElementById("termTableBody");
  tbody.innerHTML = `<tr class="loading-row"><td colspan="6">Loading…</td></tr>`;
  try {
    const res = await fetch(`${API_BASE_URL}/api/taxonomies.php?scope=admin`, { headers: authHeader() });
    if (!res.ok) throw new Error("status " + res.status);
    const data = await res.json();
    TERMS = {
      product_type: data.product_type || [],
      brand:        data.brand || [],
      industry:     data.industry || [],
      surface:      data.surface || [],
    };
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--red)">Could not load filters. Refresh to try again.</td></tr>`;
    return;
  }
  renderTab();
}

// ─── Tabs ─────────────────────────────────────────────────────────
function switchTab(group) {
  if (!GROUP_META[group]) return;
  currentGroup = group;
  document.querySelectorAll(".filter-tab").forEach(btn =>
    btn.classList.toggle("active", btn.dataset.group === group));
  renderTab();
}

function renderTab() {
  const meta  = GROUP_META[currentGroup];
  const terms = TERMS[currentGroup] || [];

  const tbody = document.getElementById("termTableBody");
  if (!terms.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">No ${meta.singular} values yet. Use the “Add ${meta.singular}” button to create one.</td></tr>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  tbody.innerHTML = terms.map((t, i) => {
    const logo = meta.brand && t.logoUrl
      ? `<img class="tax-logo-thumb" src="${escapeAttr(t.logoUrl)}" alt="">` : "";
    const statusBadge = t.archived
      ? `<span class="tax-badge tax-badge-muted">Archived</span>`
      : (meta.brand && !t.publicVisible
          ? `<span class="tax-badge tax-badge-muted">Hidden</span>`
          : `<span class="tax-badge tax-badge-active">Active</span>`);
    const upDisabled   = i === 0 ? "disabled" : "";
    const downDisabled = i === terms.length - 1 ? "disabled" : "";
    const archiveBtn = t.archived
      ? `<button class="icon-btn" title="Restore" aria-label="Restore ${escapeAttr(t.label)}" onclick="toggleArchive(${t.id}, false)"><i data-lucide="rotate-ccw"></i></button>`
      : `<button class="icon-btn" title="Archive" aria-label="Archive ${escapeAttr(t.label)}" onclick="toggleArchive(${t.id}, true)"><i data-lucide="archive"></i></button>`;
    const delBtn = t.usageCount > 0
      ? `<button class="icon-btn" title="In use — archive instead of deleting" aria-label="Delete ${escapeAttr(t.label)} (disabled, in use)" disabled><i data-lucide="trash-2"></i></button>`
      : `<button class="icon-btn danger" title="Delete" aria-label="Delete ${escapeAttr(t.label)}" onclick="openDeleteModal(${t.id})"><i data-lucide="trash-2"></i></button>`;

    return `
      <tr>
        <td><div class="tax-name-cell">${logo}<strong>${escapeHtml(t.label)}</strong></div></td>
        <td><span class="tax-slug">${escapeHtml(t.slug)}</span></td>
        <td>${t.usageCount} product${t.usageCount === 1 ? "" : "s"}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="tax-order-btns">
            <button class="icon-btn" title="Move up" aria-label="Move ${escapeAttr(t.label)} up" onclick="moveTerm(${t.id}, -1)" ${upDisabled}><i data-lucide="chevron-up"></i></button>
            <button class="icon-btn" title="Move down" aria-label="Move ${escapeAttr(t.label)} down" onclick="moveTerm(${t.id}, 1)" ${downDisabled}><i data-lucide="chevron-down"></i></button>
          </div>
        </td>
        <td>
          <div class="tax-actions">
            <button class="icon-btn" title="Rename / edit" aria-label="Edit ${escapeAttr(t.label)}" onclick="openTermModal(${t.id})"><i data-lucide="pencil"></i></button>
            ${archiveBtn}
            ${delBtn}
          </div>
        </td>
      </tr>`;
  }).join("");

  if (window.lucide) lucide.createIcons();
}

function findTerm(id) {
  for (const g of Object.keys(TERMS)) {
    const t = (TERMS[g] || []).find(x => x.id === id);
    if (t) return t;
  }
  return null;
}

// ─── Add / edit modal ─────────────────────────────────────────────
function openTermModal(id) {
  const meta = GROUP_META[currentGroup];
  const term = id ? findTerm(id) : null;

  document.getElementById("termModalError").style.display = "none";
  document.getElementById("termId").value    = term ? term.id : "";
  document.getElementById("termGroup").value = currentGroup;
  document.getElementById("termLabel").value = term ? term.label : "";
  document.getElementById("termModalTitle").textContent =
    term ? `Rename ${meta.singular}` : `Add ${meta.singular}`;

  const brandFields = document.getElementById("brandFields");
  brandFields.style.display = meta.brand ? "block" : "none";
  document.getElementById("termLogoUrl").value = term && term.logoUrl ? term.logoUrl : "";
  document.getElementById("termLogoAlt").value = term && term.logoAlt ? term.logoAlt : "";
  document.getElementById("termPublic").checked = term ? term.publicVisible !== false : true;

  document.getElementById("termModalHint").textContent = term
    ? "Renaming updates every product currently using this value. The URL slug stays the same so existing links keep working."
    : "A URL-friendly slug is generated automatically from the name.";

  document.getElementById("termModal").classList.add("open");
  setTimeout(() => document.getElementById("termLabel").focus(), 50);
}

function closeTermModal() {
  document.getElementById("termModal").classList.remove("open");
}

async function saveTerm() {
  const id    = document.getElementById("termId").value;
  const group = document.getElementById("termGroup").value;
  const meta  = GROUP_META[group];
  const label = document.getElementById("termLabel").value.trim();
  const errEl = document.getElementById("termModalError");

  if (!label) {
    errEl.textContent = "A name is required.";
    errEl.style.display = "block";
    return;
  }

  const payload = { groupKey: group, label };
  if (meta.brand) {
    payload.logoUrl = document.getElementById("termLogoUrl").value.trim();
    payload.logoAlt = document.getElementById("termLogoAlt").value.trim();
    payload.publicVisible = document.getElementById("termPublic").checked;
  }

  const btn = document.getElementById("termSaveBtn");
  btn.disabled = true;
  btn.innerHTML = `<span class="btn-spinner"></span> Saving…`;

  const res = await apiSend(id ? "PATCH" : "POST",
    `${API_BASE_URL}/api/taxonomies.php${id ? `?id=${id}` : ""}`, payload);

  btn.disabled = false;
  btn.textContent = "Save";

  if (!res.ok) {
    errEl.textContent = res.data.message || "Could not save. Please try again.";
    errEl.style.display = "block";
    return;
  }
  closeTermModal();
  showToast(id ? "Value updated" : "Value added", "success");
  await loadTerms();
}

// ─── Reorder ──────────────────────────────────────────────────────
// Swap sort order with the neighbour in the given direction, then reload.
async function moveTerm(id, dir) {
  const list = TERMS[currentGroup] || [];
  const i = list.findIndex(t => t.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;

  const a = list[i], b = list[j];
  const r1 = await apiSend("PATCH", `${API_BASE_URL}/api/taxonomies.php?id=${a.id}`, { sortOrder: b.sortOrder });
  const r2 = await apiSend("PATCH", `${API_BASE_URL}/api/taxonomies.php?id=${b.id}`, { sortOrder: a.sortOrder });
  if (!r1.ok || !r2.ok) { showToast("Could not reorder", "error"); }
  await loadTerms();
}

// ─── Archive / restore ────────────────────────────────────────────
async function toggleArchive(id, archived) {
  const res = await apiSend("PATCH", `${API_BASE_URL}/api/taxonomies.php?id=${id}`, { archived });
  if (!res.ok) { showToast(res.data.message || "Could not update", "error"); return; }
  showToast(archived ? "Value archived" : "Value restored", "success");
  await loadTerms();
}

// ─── Delete ───────────────────────────────────────────────────────
function openDeleteModal(id) {
  const term = findTerm(id);
  if (!term) return;
  pendingDeleteId = id;
  document.getElementById("deleteTermText").innerHTML =
    `Delete <strong>${escapeHtml(term.label)}</strong>?`;
  document.getElementById("deleteTermModal").classList.add("open");
}

function closeDeleteModal() {
  pendingDeleteId = null;
  document.getElementById("deleteTermModal").classList.remove("open");
}

async function confirmDeleteTerm() {
  if (!pendingDeleteId) return;
  const res = await apiSend("DELETE", `${API_BASE_URL}/api/taxonomies.php?id=${pendingDeleteId}`);
  closeDeleteModal();
  if (!res.ok) { showToast(res.data.message || "Could not delete", "error"); return; }
  showToast("Value deleted", "success");
  await loadTerms();
}

// ─── Helpers ──────────────────────────────────────────────────────
async function apiSend(method, url, body) {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try { data = await res.json(); } catch {}
    return { ok: res.ok, status: res.status, data: data || {} };
  } catch (err) {
    return { ok: false, status: 0, data: { message: "Could not reach the server." } };
  }
}

function showToast(message, type = "default") {
  const toast = document.getElementById("adminToast");
  toast.textContent = message;
  toast.className   = `admin-toast show${type === "success" ? " toast-success" : type === "error" ? " toast-error" : ""}`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, "&#39;");
}
