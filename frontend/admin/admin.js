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
let selectedMainImageFile = null;
let selectedExtraImageFiles = [];
let existingExtraImageUrls = [];
let selectedSdsFile = null;
let selectedTdsFile = null;

let existingSdsDocument = null;
let existingTdsDocument = null;

// Demo fallback when the backend is unreachable. Built from the bundled
// DEMO_PRODUCTS catalogue (the same data the public pages fall back to), not the
// empty live PRODUCTS array, so the offline admin list is populated rather than
// blank. normaliseProduct sets a string _id, which the table/selection rely on.
const SAMPLE_ADMIN_PRODUCTS = (typeof DEMO_PRODUCTS !== "undefined" ? DEMO_PRODUCTS : [])
  .map(normaliseProduct);

function isNetworkError(err) {
  return err instanceof TypeError;
}

// ─── Auth guard ──────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("adminToken");
  if (!token) { window.location.href = "login.html"; return; }
  bindProductImageUploadInputs();

  if (typeof enhanceCustomSelect === "function") {
    enhanceCustomSelect(document.getElementById("pageSizeSelect"));
    // Modal selects too, so they use the on-brand custom dropdown instead of
    // the native OS listbox (whose blue option highlight clashes with the brand).
    ["fieldCategory", "fieldBrand", "fieldStatus"].forEach(id =>
      enhanceCustomSelect(document.getElementById(id)));
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

function bindProductImageUploadInputs() {
  const mainInput = document.getElementById("fieldMainImageFile");
  const extraInput = document.getElementById("fieldExtraImageFiles");
  const sdsInput = document.getElementById("fieldSdsFile");
  const tdsInput = document.getElementById("fieldTdsFile");

  setupDropZone("sdsDropZone", sdsInput, files => {
    selectedSdsFile = validatePdfFile(files[0]);
    renderDocumentPreview("SDS");
  });

  setupDropZone("tdsDropZone", tdsInput, files => {
    selectedTdsFile = validatePdfFile(files[0]);
    renderDocumentPreview("TDS");
  });

  setupDropZone(null, mainInput, files => {
    selectedMainImageFile = validateImageFile(files[0]);
    updateImagePreview();
  });

  setupDropZone(null, extraInput, files => {
    selectedExtraImageFiles = Array.from(files).map(validateImageFile);
    renderExtraImagePreview();
  });

  const mainDrop = mainInput?.closest(".image-upload-drop");
  const extraDrop = extraInput?.closest(".image-upload-drop");

  setupDropZoneElement(mainDrop, files => {
    selectedMainImageFile = validateImageFile(files[0]);
    if (mainInput) mainInput.value = "";
    updateImagePreview();
  });

  setupDropZoneElement(extraDrop, files => {
    selectedExtraImageFiles = Array.from(files).map(validateImageFile);
    if (extraInput) extraInput.value = "";
    renderExtraImagePreview();
  });
}

function setupDropZone(dropId, input, onFiles) {
  if (input) {
    input.addEventListener("change", function () {
      if (this.files && this.files.length) {
        onFiles(this.files);
      }
    });
  }

  if (dropId) {
    const dropEl = document.getElementById(dropId);
    setupDropZoneElement(dropEl, onFiles);
  }
}

function setupDropZoneElement(dropEl, onFiles) {
  if (!dropEl) return;

  ["dragenter", "dragover"].forEach(eventName => {
    dropEl.addEventListener(eventName, e => {
      e.preventDefault();
      e.stopPropagation();
      dropEl.classList.add("is-dragover");
    });
  });

  ["dragleave", "drop"].forEach(eventName => {
    dropEl.addEventListener(eventName, e => {
      e.preventDefault();
      e.stopPropagation();
      dropEl.classList.remove("is-dragover");
    });
  });

  dropEl.addEventListener("drop", e => {
    const files = e.dataTransfer.files;
    if (files && files.length) {
      onFiles(files);
    }
  });
}

function validateImageFile(file) {
  if (!file) return null;

  const allowed = ["image/jpeg", "image/png", "image/webp"];

  if (!allowed.includes(file.type)) {
    showToast("Only JPG, PNG and WEBP images are allowed.", "error");
    throw new Error("Invalid image type.");
  }

  if (file.size > 5 * 1024 * 1024) {
    showToast("Each image must be below 5MB.", "error");
    throw new Error("Image too large.");
  }

  return file;
}

function validatePdfFile(file) {
  if (!file) return null;

  if (file.type !== "application/pdf") {
    showToast("Only PDF documents are allowed.", "error");
    throw new Error("Invalid document type.");
  }

  if (file.size > 10 * 1024 * 1024) {
    showToast("Document must be below 10MB.", "error");
    throw new Error("Document too large.");
  }

  return file;
}

function formatFileSize(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
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

// Non-dismissable banner so demo/offline data is never mistaken for the live
// catalogue. Shown when the backend is unreachable and we fall back to demo data.
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

function showDemoBanner() {
  showAdminBanner("adminDemoBanner",
    "Could not reach the server. Showing example products only. Changes will not save until the connection is restored.");
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
          <input type="checkbox" class="row-check" value="${p._id}" aria-label="Select ${escapeAttr(p.name)}"
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
        <td data-label="Category"><span class="cat-pill">${escapeHtml(p.category)}</span></td>
        <td data-label="Status">
          <span class="status-badge status-${p.status === "Available" ? "available" : "unavailable"}">
            ${escapeHtml(p.status)}
          </span>
        </td>
        <td data-label="Actions">
          <div class="table-actions">
            <button class="icon-btn" title="${p.status === "Available" ? "Mark Unavailable" : "Mark Available"}"
              aria-label="${p.status === "Available" ? "Mark " + escapeAttr(p.name) + " unavailable" : "Mark " + escapeAttr(p.name) + " available"}"
              onclick="toggleStatus('${p._id}', '${p.status}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
                <line x1="12" y1="2" x2="12" y2="12"/>
              </svg>
            </button>
            <button class="icon-btn" title="Edit product" aria-label="Edit ${escapeAttr(p.name)}" onclick="openEditModal('${p._id}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="icon-btn danger" title="Delete product" aria-label="Delete ${escapeAttr(p.name)}"
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
// In-place + optimistic: the status badge morphs colour smoothly (CSS
// transition on .status-badge) instead of the whole table reloading with
// a skeleton flash. The row's data + the Available/Unavailable stat counts
// are synced without a full re-render; a failed request reverts the badge.
async function toggleStatus(id, currentStatus) {
  const newStatus = currentStatus === "Available" ? "Unavailable" : "Available";

  const row       = document.querySelector(`.row-check[value="${id}"]`)?.closest("tr");
  const badge     = row?.querySelector(".status-badge");
  const toggleBtn = row?.querySelector('button[onclick^="toggleStatus"]');
  const product   = allProducts.find(p => p._id === id);
  const name      = product ? product.name : "product";

  function paint(status) {
    if (badge) {
      badge.classList.toggle("status-available", status === "Available");
      badge.classList.toggle("status-unavailable", status !== "Available");
      badge.textContent = status;
    }
    if (toggleBtn) {
      toggleBtn.setAttribute("title", status === "Available" ? "Mark Unavailable" : "Mark Available");
      toggleBtn.setAttribute("aria-label",
        status === "Available" ? `Mark ${name} unavailable` : `Mark ${name} available`);
      toggleBtn.setAttribute("onclick", `toggleStatus('${id}', '${status}')`);
    }
  }

  paint(newStatus); // optimistic — the badge animates immediately

  try {
    const res = await fetch(`${API_BASE_URL}/api/products.php?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ status: newStatus })
    });
    if (!res.ok) throw new Error();
    if (product) product.status = newStatus;
    const fp = filteredProducts.find(p => p._id === id);
    if (fp) fp.status = newStatus;
    // Update the Available / Unavailable counts directly (a ±1 change, so no
    // count-up-from-zero animation), leaving the rest of the table untouched.
    const available = allProducts.filter(p => p.status === "Available").length;
    const availEl = document.getElementById("statAvailable");
    const unavailEl = document.getElementById("statUnavailable");
    if (availEl)   availEl.textContent   = available;
    if (unavailEl) unavailEl.textContent = allProducts.length - available;
    showToast(`Marked as ${newStatus}`, "success");
  } catch {
    paint(currentStatus); // revert on failure
    showToast("Failed to update status", "error");
  }
}

// ─── Export CSV ───────────────────────────────────────────────────
function exportCSV() {
  const headers = ["Name", "Brand", "Category", "Status", "Industries", "Surfaces", "Features", "Short Description", "Full Description", "Usage", "Image URL", "Images", "SDS URL", "TDS URL"];
  const rows = allProducts.map(p => [
    p.name, p.brand, p.category, p.status,
    joinList(p.industries), joinList(p.surfaces), joinList(p.features),
    p.shortDescription, p.fullDescription, p.usage, p.imageUrl, joinList(p.images), p.sdsUrl, p.tdsUrl
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

async function openEditModal(id) {
  const p = allProducts.find(p => p._id === id);
  if (!p) return;

  selectedMainImageFile = null;
  selectedExtraImageFiles = [];
  selectedSdsFile = null;
  selectedTdsFile = null;
  
  existingSdsDocument = null;
existingTdsDocument = null;

  const allImages = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
  const mainImage = p.imageUrl || allImages[0] || "";
  existingExtraImageUrls = allImages.filter(img => img && img !== mainImage);

  document.getElementById("modalTitle").textContent   = "Edit Product";
  document.getElementById("editingId").value          = p._id;
  document.getElementById("fieldName").value          = p.name || "";
  document.getElementById("fieldCategory").value      = p.category || "Industrial";
  document.getElementById("fieldBrand").value         = p.brand || "Deer™ Brand";
  document.getElementById("fieldShortDesc").value     = p.shortDescription || "";
  document.getElementById("fieldFullDesc").value      = p.fullDescription || "";
  document.getElementById("fieldUsage").value         = p.usage || "";
  document.getElementById("fieldImageUrl").value      = mainImage;
  document.getElementById("fieldImages").value        = existingExtraImageUrls.join(", ");
  document.getElementById("fieldSdsUrl").value = "";
document.getElementById("fieldTdsUrl").value = "";
  document.getElementById("fieldIndustries").value    = joinList(p.industries);
  document.getElementById("fieldSurfaces").value      = joinList(p.surfaces);
  document.getElementById("fieldFeatures").value      = joinList(p.features);
  document.getElementById("fieldStatus").value        = p.status || "Available";

  const mainInput = document.getElementById("fieldMainImageFile");
  const extraInput = document.getElementById("fieldExtraImageFiles");
  const sdsInput = document.getElementById("fieldSdsFile");
  const tdsInput = document.getElementById("fieldTdsFile");

  if (mainInput) mainInput.value = "";
  if (extraInput) extraInput.value = "";
  if (sdsInput) sdsInput.value = "";
  if (tdsInput) tdsInput.value = "";

  document.getElementById("modalError").style.display = "none";

  syncModalSelects();
  updateImagePreview();
  renderExtraImagePreview();
  renderDocumentPreview("SDS");
renderDocumentPreview("TDS");

document.getElementById("productModal").classList.add("open");

await loadProductDocuments(p._id);
}

// Re-sync the custom-dropdown UI after the native <select> values are set
// programmatically (edit prefill / add reset).
function syncModalSelects() {
  if (typeof refreshCustomSelect !== "function") return;
  ["fieldCategory", "fieldBrand", "fieldStatus"].forEach(id =>
    refreshCustomSelect(document.getElementById(id)));
}

function closeModal() {
  document.getElementById("productModal").classList.remove("open");
}

function clearForm() {
  selectedMainImageFile = null;
  selectedExtraImageFiles = [];
  existingExtraImageUrls = [];
  selectedSdsFile = null;
  selectedTdsFile = null;
  
  existingSdsDocument = null;
  existingTdsDocument = null;

  ["fieldName","fieldShortDesc","fieldFullDesc","fieldUsage","fieldImageUrl","fieldImages","fieldSdsUrl","fieldTdsUrl","fieldIndustries","fieldSurfaces","fieldFeatures"].forEach(id => {
    document.getElementById(id).value = "";
  });

  const mainInput = document.getElementById("fieldMainImageFile");
  const extraInput = document.getElementById("fieldExtraImageFiles");
  if (mainInput) mainInput.value = "";
  if (extraInput) extraInput.value = "";

  document.getElementById("fieldCategory").value      = "Industrial";
  document.getElementById("fieldBrand").value         = "Deer™ Brand";
  document.getElementById("fieldStatus").value        = "Available";
  document.getElementById("modalError").style.display = "none";

  syncModalSelects();
  updateImagePreview();
  renderExtraImagePreview();
  
  const sdsInput = document.getElementById("fieldSdsFile");
const tdsInput = document.getElementById("fieldTdsFile");
if (sdsInput) sdsInput.value = "";
if (tdsInput) tdsInput.value = "";

renderDocumentPreview("SDS");
renderDocumentPreview("TDS");
}

function updateImagePreview() {
  const urlInput = document.getElementById("fieldImageUrl");
  const box = document.getElementById("imagePreview");

  if (!box) return;

  const url = urlInput ? urlInput.value.trim() : "";

  if (selectedMainImageFile) {
    const reader = new FileReader();

    reader.onload = function (e) {
      box.innerHTML = `
        <div class="admin-image-thumb">
          <img src="${e.target.result}" alt="Main image preview">
          <button type="button" class="admin-image-remove" onclick="removeSelectedMainImage()" aria-label="Remove main image">&times;</button>
        </div>`;
    };

    reader.readAsDataURL(selectedMainImageFile);
    return;
  }

  if (!url) {
    box.innerHTML = `<span>No main image selected</span>`;
    return;
  }

  box.innerHTML = `
    <div class="admin-image-thumb">
      <img src="${url}" alt="Main image preview" onerror="this.parentElement.parentElement.innerHTML='<span>Image not found</span>'">
      <button type="button" class="admin-image-remove" onclick="clearMainImageUrl()" aria-label="Remove main image">&times;</button>
    </div>`;
}

function removeSelectedMainImage() {
  selectedMainImageFile = null;
  const input = document.getElementById("fieldMainImageFile");
  if (input) input.value = "";
  updateImagePreview();
}

function clearMainImageUrl() {
  document.getElementById("fieldImageUrl").value = "";
  selectedMainImageFile = null;
  const input = document.getElementById("fieldMainImageFile");
  if (input) input.value = "";
  updateImagePreview();
}

function removeExistingExtraImage(index) {
  existingExtraImageUrls.splice(index, 1);
  document.getElementById("fieldImages").value = existingExtraImageUrls.join(", ");
  renderExtraImagePreview();
}

function removeSelectedExtraImage(index) {
  selectedExtraImageFiles.splice(index, 1);
  const input = document.getElementById("fieldExtraImageFiles");
  if (input) input.value = "";
  renderExtraImagePreview();
}

function renderExtraImagePreview() {
  const box = document.getElementById("extraImagePreview");
  if (!box) return;

  box.innerHTML = "";

  existingExtraImageUrls.forEach((url, index) => {
    const item = document.createElement("div");
    item.className = "admin-image-thumb";
    item.innerHTML = `
      <img src="${url}" alt="Additional image ${index + 1}" onerror="this.parentElement.innerHTML='<span style=&quot;font-size:0.75rem;color:#6b7480;padding:0.5rem&quot;>Image not found</span>'">
      <button type="button" class="admin-image-remove" onclick="removeExistingExtraImage(${index})" aria-label="Remove additional image">&times;</button>
    `;
    box.appendChild(item);
  });

  selectedExtraImageFiles.forEach((file, index) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      const item = document.createElement("div");
      item.className = "admin-image-thumb";
      item.innerHTML = `
        <img src="${e.target.result}" alt="New additional image ${index + 1}">
        <button type="button" class="admin-image-remove" onclick="removeSelectedExtraImage(${index})" aria-label="Remove selected image">&times;</button>
      `;
      box.appendChild(item);
    };

    reader.readAsDataURL(file);
  });

  if (!existingExtraImageUrls.length && !selectedExtraImageFiles.length) {
    box.innerHTML = `<div class="extra-image-empty">No additional images selected</div>`;
  }
}

async function loadProductDocuments(productId) {
  existingSdsDocument = null;
  existingTdsDocument = null;

  if (!productId) {
    renderDocumentPreview("SDS");
    renderDocumentPreview("TDS");
    return;
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/product_documents.php?product_id=${encodeURIComponent(productId)}`
    );

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(
        data.message || "Failed to load product documents."
      );
    }

    const documents = Array.isArray(data.documents)
      ? data.documents
      : [];

    existingSdsDocument =
      documents.find(item => item.document_type === "SDS") || null;

    existingTdsDocument =
      documents.find(item => item.document_type === "TDS") || null;

    renderDocumentPreview("SDS");
    renderDocumentPreview("TDS");
  } catch (error) {
    existingSdsDocument = null;
    existingTdsDocument = null;

    renderDocumentPreview("SDS");
    renderDocumentPreview("TDS");

    showToast(
      error.message || "Failed to load documents.",
      "error"
    );
  }
}

function renderDocumentPreview(type) {
  const isSds = type === "SDS";

  const file = isSds
    ? selectedSdsFile
    : selectedTdsFile;

  const existingDocument = isSds
    ? existingSdsDocument
    : existingTdsDocument;

  const box = document.getElementById(
    isSds
      ? "sdsDocPreview"
      : "tdsDocPreview"
  );

  if (!box) return;

  if (file) {
    box.innerHTML = `
      <div class="document-preview-card">
        <div class="document-preview-icon">
          PDF
        </div>

        <div class="document-preview-main">
          <div class="document-preview-name">
            ${escapeHtml(file.name)}
          </div>

          <div class="document-preview-meta">
            ${type} · ${formatFileSize(file.size)} · ready to upload
          </div>
        </div>

        <button
          type="button"
          class="document-remove"
          onclick="removeSelectedDocument('${type}')"
          aria-label="Remove selected ${type}"
          title="Remove selected file"
        >
          &times;
        </button>
      </div>
    `;

    return;
  }

  if (existingDocument) {
    box.innerHTML = `
      <div class="document-preview-card">
        <div class="document-preview-icon">
          PDF
        </div>

        <div class="document-preview-main">
          <div class="document-preview-name">
            ${escapeHtml(
              existingDocument.original_name ||
              existingDocument.file_path.split("/").pop()
            )}
          </div>

          <div class="document-preview-meta">
            ${type} · ${formatFileSize(
              Number(existingDocument.file_size || 0)
            )} · uploaded
          </div>
        </div>

        <a
          href="${escapeAttr(existingDocument.file_path)}"
          target="_blank"
          rel="noopener noreferrer"
          class="document-view-link"
          title="View ${type}"
        >
          View
        </a>

        <button
          type="button"
          class="document-remove"
          onclick="deleteSavedDocument('${type}')"
          aria-label="Delete uploaded ${type}"
          title="Delete document"
        >
          &times;
        </button>
      </div>
    `;

    return;
  }

  box.innerHTML =
    `<span>No ${type} document selected</span>`;
}

function removeSelectedDocument(type) {
  if (type === "SDS") {
    selectedSdsFile = null;
    const input = document.getElementById("fieldSdsFile");
    if (input) input.value = "";
  } else {
    selectedTdsFile = null;
    const input = document.getElementById("fieldTdsFile");
    if (input) input.value = "";
  }

  renderDocumentPreview(type);
}

async function deleteSavedDocument(type) {
  const isSds = type === "SDS";

  const existingDocument = isSds
    ? existingSdsDocument
    : existingTdsDocument;

  if (!existingDocument || !existingDocument.id) {
    showToast("Document record not found.", "error");
    return;
  }

  const confirmed = confirm(
    `Delete the uploaded ${type} document?`
  );

  if (!confirmed) {
    return;
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/delete_product_document.php?id=${encodeURIComponent(existingDocument.id)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      }
    );

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(
        data.message || `Failed to delete ${type}.`
      );
    }

    if (isSds) {
      existingSdsDocument = null;
      document.getElementById("fieldSdsUrl").value = "";
    } else {
      existingTdsDocument = null;
      document.getElementById("fieldTdsUrl").value = "";
    }

    renderDocumentPreview(type);

    showToast(
      `${type} document deleted`,
      "success"
    );
  } catch (error) {
    showToast(
      error.message || `Failed to delete ${type}.`,
      "error"
    );
  }
}

async function uploadProductImages(productId) {
  const hasMain = !!selectedMainImageFile;
  const hasExtra = selectedExtraImageFiles.length > 0;

  if (!hasMain && !hasExtra) {
    return {
      main_image: null,
      extra_images: []
    };
  }

  const formData = new FormData();
  formData.append("product_id", productId);

  if (hasMain) {
    formData.append("main_image", selectedMainImageFile);
  }

  selectedExtraImageFiles.forEach(file => {
    formData.append("extra_images[]", file);
  });

  const res = await fetch(`${API_BASE_URL}/api/upload-product-images.php`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`
    },
    body: formData
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || "Image upload failed.");
  }

  return data;
}

async function uploadProductDocument(
  productId,
  documentType,
  file
) {
  if (!file) {
    return null;
  }

  const formData = new FormData();

  formData.append(
    "product_id",
    productId
  );

  formData.append(
    "document_type",
    documentType
  );

  formData.append(
    "document_file",
    file
  );

  const res = await fetch(
    `${API_BASE_URL}/api/upload_product_document.php`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`
      },
      body: formData
    }
  );

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(
      data.message ||
      `${documentType} upload failed.`
    );
  }

  return data.document || null;
}

function buildFinalImagesArray(mainImageUrl, extraUrls) {
  const images = [];

  if (mainImageUrl) {
    images.push(mainImageUrl);
  }

  extraUrls.forEach(url => {
    if (url && !images.includes(url)) {
      images.push(url);
    }
  });

  return images;
}

function capitaliseFirst(value) {
  const text = String(value || "").trim();

  if (!text) return "";

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function capitaliseListItem(value) {
  const text = String(value || "").trim();

  if (!text) return "";

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function splitList(value) {
  return String(value || "")
    .split(/[,\n]/)
    .map(item => capitaliseListItem(item))
    .filter(Boolean);
}

function joinList(value) {
  return Array.isArray(value) ? value.join(", ") : "";
}

async function saveProduct() {
  const id      = document.getElementById("editingId").value;
  const btn     = document.getElementById("saveBtn");
  const errorEl = document.getElementById("modalError");

  const manualMainImageUrl = document.getElementById("fieldImageUrl").value.trim();
  const manualExtraUrls = splitList(document.getElementById("fieldImages").value);

  const payload = {
    name: capitaliseFirst(
  document.getElementById("fieldName").value
),

brand: document.getElementById("fieldBrand").value,

category: capitaliseFirst(
  document.getElementById("fieldCategory").value
),

shortDescription: capitaliseFirst(
  document.getElementById("fieldShortDesc").value
),

fullDescription: capitaliseFirst(
  document.getElementById("fieldFullDesc").value
),

usage: capitaliseFirst(
  document.getElementById("fieldUsage").value
),
    imageUrl:         manualMainImageUrl,
    images:           buildFinalImagesArray(manualMainImageUrl, manualExtraUrls),
    sdsUrl: "",
tdsUrl: "",
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
    let productId = id;

    const firstSaveRes = await fetch(
      id ? `${API_BASE_URL}/api/products.php?id=${id}` : `${API_BASE_URL}/api/products.php`,
      {
        method: id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      }
    );

    const firstSaveData = await firstSaveRes.json();

    if (!firstSaveRes.ok) {
      throw new Error(firstSaveData.message || "Failed to save product.");
    }

    productId = firstSaveData.id || firstSaveData._id || productId;

    const uploaded = await uploadProductImages(productId);

const uploadedSdsDocument = await uploadProductDocument(
  productId,
  "SDS",
  selectedSdsFile
);

const uploadedTdsDocument = await uploadProductDocument(
  productId,
  "TDS",
  selectedTdsFile
);

if (uploadedSdsDocument) {
  existingSdsDocument = uploadedSdsDocument;
  selectedSdsFile = null;

  const sdsInput = document.getElementById("fieldSdsFile");

  if (sdsInput) {
    sdsInput.value = "";
  }
}

if (uploadedTdsDocument) {
  existingTdsDocument = uploadedTdsDocument;
  selectedTdsFile = null;

  const tdsInput = document.getElementById("fieldTdsFile");

  if (tdsInput) {
    tdsInput.value = "";
  }
}

const finalMainImage =
  uploaded.main_image || payload.imageUrl;

const finalExtraImages = [
  ...manualExtraUrls,
  ...uploaded.extra_images
];

const finalPayload = {
  ...payload,
  imageUrl: finalMainImage,
  images: buildFinalImagesArray(
    finalMainImage,
    finalExtraImages
  ),
  sdsUrl: "",
  tdsUrl: ""
};

const needsFinalSave =
  uploaded.main_image ||
  uploaded.extra_images.length;

    if (needsFinalSave) {
      const finalSaveRes = await fetch(`${API_BASE_URL}/api/products.php?id=${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(finalPayload)
      });

      const finalSaveData = await finalSaveRes.json();

      if (!finalSaveRes.ok) {
        throw new Error(finalSaveData.message || "Files uploaded but product paths failed to save.");
      }
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