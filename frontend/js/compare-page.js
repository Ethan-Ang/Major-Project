document.addEventListener("DOMContentLoaded", renderComparePage);
window.addEventListener("compareUpdated", renderComparePage);

function renderComparePage() {
  const list     = getCompareList();
  const products = list.map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean);
  const content  = document.getElementById("comparePageContent");
  if (!content) return;

  if (products.length < 2) {
    content.innerHTML = `
      <div class="empty-state">
        <h3>Add at least 2 products to compare</h3>
        <p>Browse the catalogue and click <strong>+ Compare</strong> on the cards you want to compare side by side.</p>
        <a href="products.html" class="btn btn-primary" style="display:inline-flex;margin-top:1.25rem">Browse Products</a>
      </div>`;
    return;
  }

  const headerCols = products.map(p => {
    const availClass = p.status === "Available" ? "available" : "unavailable";
    const imgContent = p.imageUrl
      ? `<img src="${p.imageUrl}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'">`
      : "";
    return `
      <td class="compare-col-header">
        <div class="compare-product-img">${imgContent}</div>
        <a class="compare-product-name" href="product-detail?id=${p.id}">${p.name}</a>
        <div class="compare-product-brand">${p.brand}</div>
        <div class="compare-col-avail ${availClass}">
          <span class="avail-dot"></span>${p.status}
        </div>
        <button class="compare-col-remove" onclick="removeFromCompare(${p.id})">Remove &#215;</button>
      </td>`;
  }).join("");

  const specRows = [
    { label: "Category",     render: p => p.category },
    { label: "Industries",   render: p => p.industries.map(i => `<span class="compare-tag">${i}</span>`).join("") },
    { label: "Surfaces",     render: p => p.surfaces.map(s => `<span class="compare-tag">${s}</span>`).join("") },
    { label: "Key Features", render: p => p.features.map(f => `<div class="compare-feature">${f}</div>`).join("") }
  ].map(row => `
    <tr>
      <td class="compare-row-label">${row.label}</td>
      ${products.map(p => `<td class="compare-row-value">${row.render(p)}</td>`).join("")}
    </tr>`).join("");

  const actionRow = `
    <tr>
      <td class="compare-row-label"></td>
      ${products.map(p => `
        <td class="compare-row-value">
          <button class="btn-add-enquiry" onclick="addToBasket(${p.id})">Add to Enquiry Basket</button>
        </td>`).join("")}
    </tr>`;

  content.innerHTML = `
    <div class="compare-page-table-wrap">
      <table class="compare-table">
        <colgroup>
          <col class="compare-label-col">
          ${products.map(() => "<col>").join("")}
        </colgroup>
        <thead>
          <tr>
            <td class="compare-row-label"></td>
            ${headerCols}
          </tr>
        </thead>
        <tbody>
          ${specRows}
          ${actionRow}
        </tbody>
      </table>
    </div>`;
}

function addToBasket(productId) {
  const basket = JSON.parse(localStorage.getItem("enquiryBasket") || "[]");
  if (!basket.includes(productId)) {
    basket.push(productId);
    localStorage.setItem("enquiryBasket", JSON.stringify(basket));
    window.dispatchEvent(new Event("basketUpdated"));
  }
  showToast("Added to enquiry basket");
}

function clearAll() {
  clearCompare();
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}
