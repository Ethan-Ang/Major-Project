// API_BASE_URL is defined in data.js
let deletingId = null;
let allProducts = [];

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
  const countEl = document.getElementById("productCount");
  const errorEl = document.getElementById("pageError");

  try {
    const res = await fetch(`${API_BASE_URL}/api/products`);
    if (!res.ok) throw new Error("Failed to load products.");
    const products = await res.json();
    allProducts = products;

    countEl.textContent = `${products.length} product${products.length !== 1 ? "s" : ""}`;

    if (products.length === 0) {
      tbody.innerHTML = '<tr class="loading-row"><td colspan="4">No products yet. Add one above.</td></tr>';
      return;
    }

    tbody.innerHTML = products.map(p => `
      <tr>
        <td><strong>${escapeHtml(p.name)}</strong></td>
        <td>${escapeHtml(p.category)}</td>
        <td><span class="status-badge status-${p.status === "Available" ? "available" : "unavailable"}">${escapeHtml(p.status)}</span></td>
        <td>
          <div class="table-actions">
            <button class="btn btn-outline" onclick="openEditModal('${p._id}')">Edit</button>
            <button class="btn btn-danger" onclick="openDeleteModal('${p._id}', '${escapeAttr(p.name)}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join("");

  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = "block";
    tbody.innerHTML = '<tr class="loading-row"><td colspan="4">Could not load products.</td></tr>';
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
    box.textContent = "No image URL entered";
    return;
  }
  box.innerHTML = `<img src="${url}" alt="Preview" onerror="this.parentElement.textContent='Image not found'">`;
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
    loadProducts();

  } catch (err) {
    alert(err.message);
  } finally {
    btn.textContent = "Delete";
    btn.disabled = false;
  }
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
