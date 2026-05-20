document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get("id"), 10);
  const product = PRODUCTS.find(p => p.id === id);

  if (!product) {
    document.getElementById("detailLayout").innerHTML =
      "<p style='padding:2rem;color:#666'>Product not found. <a href='products.html'>Back to products</a></p>";
    return;
  }

  renderBreadcrumb(product);
  renderHero(product);
  renderFullDesc(product);
  renderRelated(product);
  updateBasketCount();
});

function renderBreadcrumb(product) {
  document.getElementById("breadcrumbProduct").textContent = product.name;
  document.title = `${product.name} | Yee Lim Adhesives Industries`;
}

function renderHero(product) {
  const basket = getBasket();
  const inBasket = basket.includes(product.id);

  document.getElementById("detailImage").innerHTML = `
    <img src="${product.imageUrl}" alt="${product.name}"
         onerror="this.parentElement.innerHTML='<span style=&quot;padding:2rem;color:#aaa&quot;>No image available</span>'">
  `;

  const industryTags = product.industries.map(i => `<span class="tag">${i}</span>`).join("");
  const surfaceTags = product.surfaces.map(s => `<span class="tag">${s}</span>`).join("");
  const featureItems = product.features.map(f => `<li>${f}</li>`).join("");

  document.getElementById("detailInfo").innerHTML = `
    <span class="brand-badge">${product.brand}</span>
    <h1>${product.name}</h1>
    <p class="short-desc">${product.shortDescription}</p>

    <div class="detail-section">
      <h4>Suitable Industries</h4>
      <div class="tag-list">${industryTags}</div>
    </div>

    <div class="detail-section">
      <h4>Suitable Surfaces</h4>
      <div class="tag-list">${surfaceTags}</div>
    </div>

    <div class="detail-section">
      <h4>Key Features</h4>
      <ul class="features-list">${featureItems}</ul>
    </div>

    <div class="detail-cta">
      <button
        class="btn btn-primary btn-lg ${inBasket ? "btn-added" : ""}"
        id="addBtn"
        onclick="toggleBasket(${product.id})"
      >${inBasket ? "✓ Added to Enquiry" : "Add to Enquiry Basket"}</button>
      <a href="enquiry.html" class="btn btn-outline btn-lg">View Enquiry Basket</a>
    </div>
  `;
}

function renderFullDesc(product) {
  document.getElementById("detailFullDesc").innerHTML = `
    <h3>Product Description</h3>
    <p>${product.fullDescription}</p>
    <h3 style="margin-top:1.5rem">How to Use</h3>
    <div class="usage-box">${product.usage}</div>
  `;
}

function renderRelated(product) {
  const related = PRODUCTS.filter(p =>
    p.id !== product.id &&
    (p.brand === product.brand || p.industries.some(i => product.industries.includes(i)))
  ).slice(0, 4);

  if (related.length === 0) return;

  document.getElementById("relatedSection").style.display = "block";
  document.getElementById("relatedGrid").innerHTML = related.map(p => `
    <div class="product-card">
      <div class="product-card-image">
        <img src="${p.imageUrl}" alt="${p.name}" onerror="this.parentElement.innerHTML='<span>No image</span>'">
      </div>
      <div class="product-card-body">
        <span class="brand-badge">${p.brand}</span>
        <h3>${p.name}</h3>
        <p>${p.shortDescription}</p>
        <div class="product-card-actions">
          <a href="product-detail.html?id=${p.id}" class="btn btn-outline">View Details</a>
        </div>
      </div>
    </div>
  `).join("");
}

function toggleBasket(productId) {
  const basket = getBasket();
  const idx = basket.indexOf(productId);
  const btn = document.getElementById("addBtn");

  if (idx === -1) {
    basket.push(productId);
    btn.textContent = "✓ Added to Enquiry";
    btn.classList.add("btn-added");
    showToast("Added to enquiry basket");
  } else {
    basket.splice(idx, 1);
    btn.textContent = "Add to Enquiry Basket";
    btn.classList.remove("btn-added");
    showToast("Removed from basket");
  }

  saveBasket(basket);
}

function getBasket() {
  return JSON.parse(localStorage.getItem("enquiryBasket") || "[]");
}

function saveBasket(basket) {
  localStorage.setItem("enquiryBasket", JSON.stringify(basket));
  updateBasketCount();
}

function updateBasketCount() {
  const el = document.getElementById("basketCount");
  if (el) el.textContent = getBasket().length;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}
