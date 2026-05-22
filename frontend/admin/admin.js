// API_BASE_URL is defined in data.js
let deletingId = null;
let allProducts = [];
let filteredProducts = [];

// ─── Auth guard ───────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("adminToken");
  if (!token) { window.location.href = "login.html"; return; }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Unauthorized");
    loadProducts();
  } catch {
    localStorage.removeItem("adminToken");
    window.location.href = "login.html";
  }
});

function getToken() { return localStorage.getItem("adminToken"); }

function logout() {
  localStorage.removeItem("adminToken");
  window.location.href = "login.html";
}

// ─── Load products ────────────────────────────────────────────────
async function loadProducts() {
  const tbody = document.getElementById("productTableBody");
  const errorEl = document.getElementById("pageError");

  tbody.innerHTML = '<tr class="loading-row"><td colspan="4">Loading products…</td></tr>';

  try {
    const res = await fetch(`${API_BASE_URL}/api/products`);
    if (!res.ok) throw new Error("Failed to load products.");
    const products = await res.json();
    allProducts = products;
    filteredProducts = products;

    updateStats(products);
    renderTable(products);

  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = "block";
    tbody.innerHTML = '<tr class="loading-row"><td colspan="4">Could not load products.</td></tr>';
  }
}

function updateStats(products) {
  const available = products.filter(p => p.status === "Available").length;
  const unavailable = products.length - available;
  document.getElementById("statTotal").textContent = products.length;
  document.getElementById("statAvailable").textContent = available;
  document.getElementById("statUnavailable").textContent = unavailable;
}

function renderTable(products) {
  const tbody = document.getElementById("productTableBody");

  if (products.length === 0) {
    const isSearching = document.getElementById("tableSearch").value.trim();
    tbody.innerHTML = `<tr class="empty-row"><td colspan="4">${
      isSearching ? "No products match your search." : "No products yet. Click Add Product to get started."
    }</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => `
    <tr>
      <td>
        <div class="product-name">${escapeHtml(p.name)}</div>
        <div class="product-desc">${escapeHtml(p.shortDescription || "")}</div>
      </td>
      <td>${escapeHtml(p.category)}</td>
      <td>
        <span class="status-badge status-${p.status === "Available" ? "available" : "unavailable"}">
          ${escapeHtml(p.status)}
        </span>
      </td>
      <td>
        <div class="table-actions">
          <button class="btn btn-ghost" title="${p.status === "Available" ? "Mark Unavailable" : "Mark Available"}"
            onclick="toggleStatus('${p._id}', '${p.status}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              ${p.status === "Available"
                ? '<path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line>'
                : '<path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line>'}
            </svg>
          </button>
          <button class="btn btn-ghost" title="Edit product" onclick="openEditModal('${p._id}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn btn-ghost btn-ghost-red" title="Delete product"
            onclick="openDeleteModal('${p._id}', '${escapeAttr(p.name)}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
              <path d="M10 11v6"></path><path d="M14 11v6"></path>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");

  if (window.lucide) lucide.createIcons();
}

// ─── Table search filter ──────────────────────────────────────────
function filterTable() {
  const q = document.getElementById("tableSearch").value.toLowerCase().trim();
  filteredProducts = q
    ? allProducts.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.shortDescription || "").toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q)
      )
    : allProducts;
  renderTable(filteredProducts);
}

// ─── Status toggle ────────────────────────────────────────────────
async function toggleStatus(id, currentStatus) {
  const newStatus = currentStatus === "Available" ? "Unavailable" : "Available";

  try {
    const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    if (!res.ok) throw new Error("Failed to update status.");

    showToast(`Marked as ${newStatus}`, "success");
    loadProducts();

  } catch (err) {
    showToast(err.message, "error");
  }
}

// ─── Add/Edit Modal ───────────────────────────────────────────────
function openAddModal() {
  document.getElementById("modalTitle").textContent = "Add Product";
  document.getElementById("editingId").value = "";
  clearForm();
  document.getElementById("productModal").classList.add("open");
}

function openEditModal(id) {
  const p = allProducts.find(p => p._id === id);
  if (!p) return;

  document.getElementById("modalTitle").textContent = "Edit Product";
  document.getElementById("editingId").value = p._id;
  document.getElementById("fieldName").value = p.name || "";
  document.getElementById("fieldCategory").value = p.category || "Industrial";
  document.getElementById("fieldShortDesc").value = p.shortDescription || "";
  document.getElementById("fieldFullDesc").value = p.fullDescription || "";
  document.getElementById("fieldUsage").value = p.usage || "";
  document.getElementById("fieldImageUrl").value = p.imageUrl || "";
  document.getElementById("fieldStatus").value = p.status || "Available";
  document.getElementById("modalError").style.display = "none";
  updateImagePreview();
  document.getElementById("productModal").classList.add("open");
}

function closeModal() {
  document.getElementById("productModal").classList.remove("open");
}

function clearForm() {
  ["fieldName", "fieldShortDesc", "fieldFullDesc", "fieldUsage", "fieldImageUrl"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("fieldCategory").value = "Industrial";
  document.getElementById("fieldStatus").value = "Available";
  document.getElementById("modalError").style.display = "none";
  updateImagePreview();
}

function updateImagePreview() {
  const url = document.getElementById("fieldImageUrl").value.trim();
  const box = document.getElementById("imagePreview");
  if (!url) {
    box.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.25">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      <span>No image URL entered</span>`;
    return;
  }
  box.innerHTML = `<img src="${url}" alt="Preview" onerror="this.parentElement.innerHTML='<span>Image not found</span>'">`;
}

async function saveProduct() {
  const id = document.getElementById("editingId").value;
  const btn = document.getElementById("saveBtn");
  const errorEl = document.getElementById("modalError");

  const payload = {
    name: document.getElementById("fieldName").value.trim(),
    category: document.getElementById("fieldCategory").value,
    shortDescription: document.getElementById("fieldShortDesc").value.trim(),
    fullDescription: document.getElementById("fieldFullDesc").value.trim(),
    usage: document.getElementById("fieldUsage").value.trim(),
    imageUrl: document.getElementById("fieldImageUrl").value.trim(),
    status: document.getElementById("fieldStatus").value
  };

  if (!payload.name || !payload.shortDescription) {
    errorEl.textContent = "Product name and short description are required.";
    errorEl.style.display = "block";
    return;
  }

  btn.textContent = "Saving…";
  btn.disabled = true;
  errorEl.style.display = "none";

  try {
    const url = id
      ? `${API_BASE_URL}/api/products/${id}`
      : `${API_BASE_URL}/api/products`;

    const res = await fetch(url, {
      method: id ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to save product.");
    }

    closeModal();
    showToast(id ? "Product updated" : "Product added", "success");
    loadProducts();

  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = "block";
  } finally {
    btn.textContent = "Save Product";
    btn.disabled = false;
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
  btn.textContent = "Deleting…";
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE_URL}/api/products/${deletingId}`, {
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
    btn.disabled = false;
  }
}

// ─── Toast ────────────────────────────────────────────────────────
function showToast(message, type = "default") {
  const toast = document.getElementById("adminToast");
  toast.textContent = message;
  toast.className = `admin-toast show${type === "success" ? " toast-success" : type === "error" ? " toast-error" : ""}`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ─── Helpers ──────────────────────────────────────────────────────
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
