// API_BASE_URL is defined in data.js

// ─── State ───────────────────────────────────────────────────────
let allProducts    = [];
let filteredProducts = [];
let selectedIds    = new Set();
let deletingId     = null;
let currentPage    = 1;
let pageSize       = 10;
let sortCol        = "";
let sortDir        = "asc";
let demoMode       = false;

// Demo fallback when backend is unreachable:mirrors enquiries.js SAMPLE_ENQUIRIES pattern
const SAMPLE_ADMIN_PRODUCTS = PRODUCTS.map(p => ({
  ...p,
  _id: String(p.id)
}));

function isNetworkError(err) {
  return err instanceof TypeError;
}

// ─── Auth guard ──────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("adminToken");
  if (!token) { window.location.href = "login.html"; return; }

  if (typeof enhanceCustomSelect === "function") {
    enhanceCustomSelect(document.getElementById("pageSizeSelect"));
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/me.php`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    loadProducts();
  } catch (err) {
    if (isNetworkError(err)) {
      // Backend unreachable:fall back to demo data so the page is still navigable
      demoMode = true;
      loadProducts();
    } else {
      localStorage.removeItem("adminToken");
      window.location.href = "login.html";
    }
  }
});

function getToken() { return localStorage.getItem("adminToken"); }

function logout() {
  localStorage.removeItem("adminToken");
  window.location.href = "login.html";
}

// ─── Load products ────────────────────────────────────────────────
async function loadProducts() {
  const tbody   = document.getElementById("productTableBody");
  const errorEl = document.getElementById("pageError");

  tbody.innerHTML = adminSkeletonRows(6, 5);
  errorEl.style.display = "none";

  if (demoMode) {
    showDemoBanner();
    return finishLoad([...SAMPLE_ADMIN_PRODUCTS]);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/products.php`);
    if (!res.ok) throw new Error("Failed to load products.");
    const products = await res.json();
    finishLoad(products);
  } catch (err) {
    if (isNetworkError(err)) {
      // Network error:fall back to demo so the admin is still reviewable
      demoMode = true;
      showDemoBanner();
      return finishLoad([...SAMPLE_ADMIN_PRODUCTS]);
    }
    errorEl.textContent = err.message;
    errorEl.style.display = "block";
    tbody.innerHTML = '<tr class="loading-row"><td colspan="5">Could not load products.</td></tr>';
  }
}

function finishLoad(products) {
  allProducts      = products;
  filteredProducts = applySort([...products]);
  currentPage      = 1;
  selectedIds      = new Set();
  updateStats(products);
  renderTable();
  if (window.lucide) lucide.createIcons();
}

function showDemoBanner() {
  // Demo fallback is silent now:sample data loads without a visible banner.
  // Re-enable by uncommenting the banner creation if you want a visible warning.
}

function updateStats(products) {
  const available = products.filter(p => p.status === "Available").length;
  countUp("statTotal",       products.length);
  countUp("statAvailable",   available);
  countUp("statUnavailable", products.length - available);

  // Toggle empty-state shell when there are zero products in the DB
  const emptyEl = document.getElementById("productsEmptyState");
  const statsEl = document.getElementById("statsRow");
  const cardEl  = document.getElementById("productsCard");
  const isEmpty = products.length === 0;
  if (emptyEl) emptyEl.style.display = isEmpty ? "flex" : "none";
  if (statsEl) statsEl.style.display = isEmpty ? "none" : "grid";
  if (cardEl)  cardEl.style.display  = isEmpty ? "none" : "block";
  if (isEmpty && window.lucide) lucide.createIcons();
}

function countUp(id, target) {
  const el    = document.getElementById(id);
  const dur   = 600;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / dur, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ─── Render table with pagination ────────────────────────────────
function renderTable() {
  const tbody = document.getElementById("productTableBody");
  const total = filteredProducts.length;

  document.getElementById("tableCount").textContent =
    total === allProducts.length
      ? `${total} product${total !== 1 ? "s" : ""}`
      : `${total} of ${allProducts.length}`;

  if (total === 0) {
    const q = document.getElementById("tableSearch").value.trim();
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">${
      q ? "No products match your search." : "No products yet. Click Add Product to get started."
    }</td></tr>`;
    hidePagination();
    return;
  }

  const totalPages = Math.ceil(total / pageSize);
  if (currentPage > totalPages) currentPage = totalPages;

  const start   = (currentPage - 1) * pageSize;
  const pageRows = filteredProducts.slice(start, start + pageSize);

  tbody.innerHTML = pageRows.map((p, i) => {
    const delay = `${i * 0.04}s`;
    const checked = selectedIds.has(p._id) ? "checked" : "";
    return `
      <tr class="row-animate ${selectedIds.has(p._id) ? "row-selected" : ""}" style="animation-delay:${delay}">
        <td class="td-check">
          <input type="checkbox" class="row-check" value="${p._id}"
            ${checked} onchange="toggleRowSelect('${p._id}', this.checked)">
        </td>
        <td>
          <div class="cell-product">
            <div class="product-thumb"><span>${escapeHtml(brandMonogram(p))}</span></div>
            <div>
              <div class="product-name">${escapeHtml(p.name)}</div>
              <div class="product-desc">${escapeHtml(p.shortDescription || "")}</div>
            </div>
          </div>
        </td>
        <td><span class="cat-pill">${escapeHtml(p.category)}</span></td>
        <td>
          <span class="status-badge status-${p.status === "Available" ? "available" : "unavailable"}">
            ${escapeHtml(p.status)}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="icon-btn" title="${p.status === "Available" ? "Mark Unavailable" : "Mark Available"}"
              onclick="toggleStatus('${p._id}', '${p.status}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
                <line x1="12" y1="2" x2="12" y2="12"/>
              </svg>
            </button>
            <button class="icon-btn" title="Edit product" onclick="openEditModal('${p._id}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="icon-btn danger" title="Delete product"
              onclick="openDeleteModal('${p._id}', '${escapeAttr(p.name)}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>`;
  }).join("");

  renderPagination(total, totalPages);
  updateSelectAllState();
  updateBulkBar();
}

// ─── Pagination ───────────────────────────────────────────────────
function renderPagination(total, totalPages) {
  const bar  = document.getElementById("paginationBar");
  const info = document.getElementById("paginationInfo");
  const nums = document.getElementById("pageNumbers");

  if (totalPages <= 1) { bar.style.display = "none"; return; }
  bar.style.display = "flex";

  const start = (currentPage - 1) * pageSize + 1;
  const end   = Math.min(currentPage * pageSize, total);
  info.textContent = `Showing ${start}–${end} of ${total}`;

  document.getElementById("btnPrevPage").disabled = currentPage === 1;
  document.getElementById("btnNextPage").disabled = currentPage === totalPages;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  nums.innerHTML = pages.map(p =>
    p === "…"
      ? `<span class="page-ellipsis">…</span>`
      : `<button class="page-btn ${p === currentPage ? "page-btn-active" : ""}"
          onclick="goToPage(${p})">${p}</button>`
  ).join("");
}

function hidePagination() {
  document.getElementById("paginationBar").style.display = "none";
}

function changePage(dir) {
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  currentPage = Math.max(1, Math.min(currentPage + dir, totalPages));
  renderTable();
}

function goToPage(n) {
  currentPage = n;
  renderTable();
}

function onPageSizeChange() {
  pageSize    = parseInt(document.getElementById("pageSizeSelect").value, 10);
  currentPage = 1;
  renderTable();
}

// ─── Search ───────────────────────────────────────────────────────
function onSearch() {
  const q = document.getElementById("tableSearch").value.toLowerCase().trim();
  const base = q
    ? allProducts.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.shortDescription || "").toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q)
      )
    : [...allProducts];

  filteredProducts = applySort(base);
  currentPage      = 1;
  selectedIds      = new Set();
  renderTable();
}

// ─── Sort ─────────────────────────────────────────────────────────
function sortBy(col) {
  if (sortCol === col) {
    sortDir = sortDir === "asc" ? "desc" : "asc";
  } else {
    sortCol = col;
    sortDir = "asc";
  }
  updateSortIcons();
  filteredProducts = applySort(filteredProducts);
  currentPage = 1;
  renderTable();
}

function applySort(arr) {
  if (!sortCol) return arr;
  return [...arr].sort((a, b) => {
    const va = (a[sortCol] || "").toLowerCase();
    const vb = (b[sortCol] || "").toLowerCase();
    return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
  });
}

function updateSortIcons() {
  ["name", "category", "status"].forEach(col => {
    const el = document.getElementById(`sort-${col}`);
    if (!el) return;
    if (col !== sortCol) { el.innerHTML = ""; return; }
    el.innerHTML = sortDir === "asc"
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`;
  });
}

// ─── Bulk select ──────────────────────────────────────────────────
function toggleRowSelect(id, checked) {
  checked ? selectedIds.add(id) : selectedIds.delete(id);
  updateSelectAllState();
  updateBulkBar();
  const row = document.querySelector(`input[value="${id}"]`)?.closest("tr");
  if (row) row.classList.toggle("row-selected", checked);
}

function toggleSelectAll() {
  const allChecked = document.getElementById("selectAll").checked;
  const start = (currentPage - 1) * pageSize;
  const pageRows = filteredProducts.slice(start, start + pageSize);

  pageRows.forEach(p => {
    allChecked ? selectedIds.add(p._id) : selectedIds.delete(p._id);
  });

  renderTable();
}

function updateSelectAllState() {
  const start    = (currentPage - 1) * pageSize;
  const pageRows = filteredProducts.slice(start, start + pageSize);
  const allOnPageSelected = pageRows.length > 0 && pageRows.every(p => selectedIds.has(p._id));
  const selectAll = document.getElementById("selectAll");
  if (selectAll) {
    selectAll.checked       = allOnPageSelected;
    selectAll.indeterminate = !allOnPageSelected && pageRows.some(p => selectedIds.has(p._id));
  }
}

function clearSelection() {
  selectedIds = new Set();
  renderTable();
}

function updateBulkBar() {
  const bar  = document.getElementById("bulkBar");
  const text = document.getElementById("bulkSelected");
  const n    = selectedIds.size;
  bar.style.display = n > 0 ? "flex" : "none";
  text.textContent  = `${n} product${n !== 1 ? "s" : ""} selected`;
}

// ─── Bulk actions ─────────────────────────────────────────────────
async function bulkStatusChange(newStatus) {
  const ids = [...selectedIds];
  let done = 0;

  for (const id of ids) {
    try {
      await fetch(`${API_BASE_URL}/api/products.php?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ status: newStatus })
      });
      done++;
    } catch {}
  }

  showToast(`${done} product${done !== 1 ? "s" : ""} marked as ${newStatus}`, "success");
  selectedIds = new Set();
  loadProducts();
}

function bulkMarkAvailable()   { bulkStatusChange("Available"); }
function bulkMarkUnavailable() { bulkStatusChange("Unavailable"); }

function bulkDelete() {
  const n = selectedIds.size;
  document.getElementById("bulkDeleteText").innerHTML =
    `Delete <strong>${n} product${n !== 1 ? "s" : ""}</strong>?`;
  document.getElementById("bulkDeleteModal").classList.add("open");
}

async function confirmBulkDelete() {
  const btn = document.getElementById("confirmBulkDeleteBtn");
  const ids = [...selectedIds];
  btn.textContent = "Deleting…";
  btn.disabled    = true;

  let done = 0;
  for (const id of ids) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products.php?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) done++;
    } catch {}
  }

  document.getElementById("bulkDeleteModal").classList.remove("open");
  showToast(`${done} product${done !== 1 ? "s" : ""} deleted`, "success");
  selectedIds    = new Set();
  btn.textContent = "Delete All";
  btn.disabled    = false;
  loadProducts();
}

// ─── Status toggle ────────────────────────────────────────────────
async function toggleStatus(id, currentStatus) {
  const newStatus = currentStatus === "Available" ? "Unavailable" : "Available";
  try {
    const res = await fetch(`${API_BASE_URL}/api/products.php?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ status: newStatus })
    });
    if (!res.ok) throw new Error();
    showToast(`Marked as ${newStatus}`, "success");
    loadProducts();
  } catch {
    showToast("Failed to update status", "error");
  }
}

// ─── Export CSV ───────────────────────────────────────────────────
function exportCSV() {
  const headers = ["Name", "Brand", "Category", "Status", "Industries", "Surfaces", "Features", "Short Description", "Full Description", "Usage", "Image URL", "Images"];
  const rows = allProducts.map(p => [
    p.name, p.brand, p.category, p.status,
    joinList(p.industries), joinList(p.surfaces), joinList(p.features),
    p.shortDescription, p.fullDescription, p.usage, p.imageUrl, joinList(p.images)
  ].map(v => `"${(v || "").replace(/"/g, '""')}"`));

  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `yee-lim-products-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("CSV exported", "success");
}

// ─── Add / Edit Modal ─────────────────────────────────────────────
function openAddModal() {
  document.getElementById("modalTitle").textContent = "Add Product";
  document.getElementById("editingId").value = "";
  clearForm();
  document.getElementById("productModal").classList.add("open");
}

function openEditModal(id) {
  const p = allProducts.find(p => p._id === id);
  if (!p) return;
  document.getElementById("modalTitle").textContent   = "Edit Product";
  document.getElementById("editingId").value          = p._id;
  document.getElementById("fieldName").value          = p.name || "";
  document.getElementById("fieldCategory").value      = p.category || "Industrial";
  document.getElementById("fieldBrand").value         = p.brand || "Deer™ Brand";
  document.getElementById("fieldShortDesc").value     = p.shortDescription || "";
  document.getElementById("fieldFullDesc").value      = p.fullDescription || "";
  document.getElementById("fieldUsage").value         = p.usage || "";
  document.getElementById("fieldImageUrl").value      = p.imageUrl || "";
  document.getElementById("fieldImages").value        = joinList(p.images);
  document.getElementById("fieldIndustries").value    = joinList(p.industries);
  document.getElementById("fieldSurfaces").value      = joinList(p.surfaces);
  document.getElementById("fieldFeatures").value      = joinList(p.features);
  document.getElementById("fieldStatus").value        = p.status || "Available";
  document.getElementById("modalError").style.display = "none";
  updateImagePreview();
  document.getElementById("productModal").classList.add("open");
}

function closeModal() {
  document.getElementById("productModal").classList.remove("open");
}

function clearForm() {
  ["fieldName","fieldShortDesc","fieldFullDesc","fieldUsage","fieldImageUrl","fieldImages","fieldIndustries","fieldSurfaces","fieldFeatures"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("fieldCategory").value      = "Industrial";
  document.getElementById("fieldBrand").value         = "Deer™ Brand";
  document.getElementById("fieldStatus").value        = "Available";
  document.getElementById("modalError").style.display = "none";
  updateImagePreview();
}

function updateImagePreview() {
  const url = document.getElementById("fieldImageUrl").value.trim();
  const box = document.getElementById("imagePreview");
  if (!url) {
    box.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      <span>No image URL entered</span>`;
    return;
  }
  box.innerHTML = `<img src="${url}" alt="Preview" onerror="this.parentElement.innerHTML='<span>Image not found</span>'">`;
}

function splitList(value) {
  return value
    .split(/[,\n]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function joinList(value) {
  return Array.isArray(value) ? value.join(", ") : "";
}

async function saveProduct() {
  const id      = document.getElementById("editingId").value;
  const btn     = document.getElementById("saveBtn");
  const errorEl = document.getElementById("modalError");

  const payload = {
    name:             document.getElementById("fieldName").value.trim(),
    brand:            document.getElementById("fieldBrand").value,
    category:         document.getElementById("fieldCategory").value,
    shortDescription: document.getElementById("fieldShortDesc").value.trim(),
    fullDescription:  document.getElementById("fieldFullDesc").value.trim(),
    usage:            document.getElementById("fieldUsage").value.trim(),
    imageUrl:         document.getElementById("fieldImageUrl").value.trim(),
    images:           splitList(document.getElementById("fieldImages").value),
    industries:       splitList(document.getElementById("fieldIndustries").value),
    surfaces:         splitList(document.getElementById("fieldSurfaces").value),
    features:         splitList(document.getElementById("fieldFeatures").value),
    status:           document.getElementById("fieldStatus").value
  };

  if (!payload.name || !payload.shortDescription) {
    errorEl.textContent    = "Product name and short description are required.";
    errorEl.style.display  = "block";
    return;
  }

  btn.innerHTML         = `<span class="btn-spinner"></span> Saving…`;
  btn.disabled          = true;
  errorEl.style.display = "none";

  try {
    const res = await fetch(
      id ? `${API_BASE_URL}/api/products.php?id=${id}` : `${API_BASE_URL}/api/products.php`,
      {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload)
      }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to save product.");
    }
    closeModal();
    showToast(id ? "Product updated" : "Product added", "success");
    loadProducts();
  } catch (err) {
    errorEl.textContent   = err.message;
    errorEl.style.display = "block";
  } finally {
    btn.textContent = "Save Product";
    btn.disabled    = false;
  }
}

// ─── Delete Modal ─────────────────────────────────────────────────
function openDeleteModal(id, name) {
  deletingId = id;
  document.getElementById("deleteProductName").textContent = name;
  document.getElementById("deleteModal").classList.add("open");
}

function closeDeleteModal() {
  deletingId = null;
  document.getElementById("deleteModal").classList.remove("open");
}

async function confirmDelete() {
  const btn = document.getElementById("confirmDeleteBtn");
  btn.innerHTML = `<span class="btn-spinner"></span> Deleting…`;
  btn.disabled  = true;

  try {
    const res = await fetch(`${API_BASE_URL}/api/products.php?id=${deletingId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error("Failed to delete product.");
    closeDeleteModal();
    showToast("Product deleted", "success");
    loadProducts();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.textContent = "Delete Product";
    btn.disabled    = false;
  }
}

// ─── Toast ────────────────────────────────────────────────────────
function showToast(message, type = "default") {
  const toast  = document.getElementById("adminToast");
  toast.textContent = message;
  toast.className   = `admin-toast show${type === "success" ? " toast-success" : type === "error" ? " toast-error" : ""}`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ─── Helpers ──────────────────────────────────────────────────────
function adminSkeletonRows(count, cols) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push(`
      <tr class="skel-row" aria-hidden="true">
        <td class="td-check"><span class="skel skel-checkbox"></span></td>
        <td>
          <div class="skel skel-text skel-text-md"></div>
          <div class="skel skel-text skel-text-sm"></div>
        </td>
        <td><span class="skel skel-pill"></span></td>
        <td><span class="skel skel-badge"></span></td>
        <td><div class="skel-actions"><span class="skel skel-icon"></span><span class="skel skel-icon"></span><span class="skel skel-icon"></span></div></td>
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

function escapeAttr(str) {
  return String(str).replace(/'/g, "&#39;");
}

// Two-letter monogram for the product thumbnail (from brand, else name)
function brandMonogram(p) {
  const src = (p.brand || p.name || "")
    .replace(/™/g, "").replace(/\bBrand\b/i, "").trim();
  const letters = src.replace(/[^A-Za-z ]/g, "").trim();
  if (!letters) return "YL";
  return letters.slice(0, 2).toUpperCase();
}