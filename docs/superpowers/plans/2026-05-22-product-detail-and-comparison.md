# Product Detail Redesign + Comparison Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign product-detail.html with gallery, availability badge, spec table, and sticky 360px sidebar; then add a comparison feature (floating tray + full-screen overlay) accessible from both the catalogue cards and the detail page sidebar.

**Architecture:** All frontend — no backend changes. `compare.js` is a new shared module loaded by both pages that owns compare state (localStorage) and renders the tray + overlay. `product-detail.js` is rewritten to render four independent sections (gallery, header, spec table, sidebar). `products.js` gets a compare button added to cards and listens to `compareUpdated` events to keep button states in sync.

**Tech Stack:** Plain HTML, CSS, vanilla JS. data.js as product source. localStorage for basket and compare state.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `frontend/js/data.js` | Modify | Add `images: []` to all 12 products |
| `frontend/css/products.css` | Modify | Add gallery, availability, spec table, sidebar, tray, overlay, compare card button styles |
| `frontend/js/compare.js` | **Create** | Shared compare state, tray render, overlay render |
| `frontend/product-detail.html` | Modify | Two-column grid layout, new section IDs, load compare.js |
| `frontend/js/product-detail.js` | Modify | Rewrite into renderGallery, renderHeader, renderSpecTable, renderSidebar, renderFullDesc |
| `frontend/products.html` | Modify | Add compare tray div, compare overlay div, load compare.js |
| `frontend/js/products.js` | Modify | Add compare button in productCardHTML, listen to compareUpdated, track currentResults |

---

## Task 1: Add `images` field to all products in data.js

**Files:**
- Modify: `frontend/js/data.js`

- [ ] **Step 1: Add `images: []` to every product object**

Open `frontend/js/data.js`. For each of the 12 product objects, add the `images` property immediately after `imageUrl`. It is an empty array — placeholders until the client provides photography.

```js
// Example — repeat for all 12 products (ids 1–12)
{
  id: 1,
  name: "Deer™ Wood Contact Adhesive",
  // ... existing fields ...
  imageUrl: "images/products/deer-wood-contact.jpg",
  images: [],   // ← add this line to EVERY product
  status: "Available",
  // ...
}
```

- [ ] **Step 2: Verify**

Open `http://localhost:3000/products.html` — page loads, no console errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/js/data.js
git commit -m "feat: add images[] field to all products in data.js"
```

---

## Task 2: CSS — detail page layout, gallery, availability, spec table, sidebar

**Files:**
- Modify: `frontend/css/products.css` (append to end, before the prefers-reduced-motion block)

- [ ] **Step 1: Remove old detail layout rules that will be replaced**

In `products.css`, find and delete the entire `.detail-layout` rule (the grid with `420px 1fr`). Keep `.breadcrumb`, `.detail-image`, `.detail-info`, `.detail-section`, `.tag`, `.features-list`, `.detail-cta`, `.btn-lg`, `.detail-full-desc`, `.usage-box`, `.related-section`, `.related-grid` — those are still used.

The old rule to delete:
```css
.detail-layout {
  max-width: 1280px;
  /* ... */
  display: grid;
  grid-template-columns: 420px 1fr;
  /* ... */
}
```

- [ ] **Step 2: Append new detail page styles**

Append the following block to `frontend/css/products.css`, immediately before the existing `@media (prefers-reduced-motion: reduce)` block at the bottom:

```css
/* ─── Detail Page — Two-Column Grid ─────────────────────────── */
.detail-page-grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 2rem;
  max-width: 1280px;
  margin: 1.5rem auto 2rem;
  padding: 0 1.5rem;
  align-items: start;
}

.detail-main { min-width: 0; }

/* ─── Gallery ────────────────────────────────────────────────── */
.gallery-main {
  width: 100%;
  aspect-ratio: 4/3;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  cursor: default;
}

.gallery-main img { width: 100%; height: 100%; object-fit: cover; display: block; }

.gallery-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: var(--muted);
  font-size: 0.8rem;
}

.gallery-placeholder svg { opacity: 0.3; }

.gallery-thumbs { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; flex-wrap: wrap; }

.gallery-thumb {
  width: 64px;
  height: 50px;
  background: var(--bg);
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color 0.15s;
}

.gallery-thumb:hover { border-color: #aaa; }
.gallery-thumb.active { border-color: var(--red); }
.gallery-thumb img { width: 100%; height: 100%; object-fit: cover; }
.gallery-thumb svg { opacity: 0.25; }

/* ─── Product Header (availability + name + desc) ────────────── */
.detail-product-header { margin-bottom: 1rem; }

.detail-product-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.avail-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
}

.avail-badge.available {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.avail-badge.unavailable {
  background: #fff0f0;
  color: var(--red);
  border: 1px solid #fecaca;
}

.avail-badge .avail-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

.detail-product-name {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
  margin-bottom: 0.6rem;
}

.detail-product-desc {
  font-size: 0.95rem;
  color: var(--muted);
  line-height: 1.6;
}

/* ─── Spec Table ─────────────────────────────────────────────── */
.spec-table-wrap {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  margin: 1.25rem 0;
}

.spec-table-heading {
  background: var(--bg);
  padding: 0.5rem 1rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
}

.spec-row {
  display: grid;
  grid-template-columns: 130px 1fr;
  border-bottom: 1px solid #f5f5f5;
}

.spec-row:last-child { border-bottom: none; }

.spec-key {
  background: #fafafa;
  padding: 0.65rem 1rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: #444;
  border-right: 1px solid #f0f0f0;
}

.spec-val {
  padding: 0.65rem 1rem;
  font-size: 0.82rem;
  color: var(--text);
  line-height: 1.5;
}

.spec-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; }

.spec-tag {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--muted);
  font-size: 0.72rem;
  padding: 0.15rem 0.45rem;
  border-radius: 3px;
}

.spec-features { display: flex; flex-wrap: wrap; gap: 0.25rem 1.25rem; }

.spec-feature {
  font-size: 0.82rem;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.spec-feature::before {
  content: "✓";
  color: var(--red);
  font-weight: 700;
  flex-shrink: 0;
}

/* ─── Sticky Sidebar ─────────────────────────────────────────── */
.detail-sidebar {
  position: sticky;
  top: 1.5rem;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.sidebar-product-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.35;
}

.sidebar-brand {
  font-size: 0.78rem;
  color: var(--red);
  font-weight: 600;
  margin-top: 0.2rem;
}

.sidebar-divider { height: 1px; background: var(--border); }

.sidebar-avail {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.sidebar-avail.available { color: #16a34a; }
.sidebar-avail.unavailable { color: var(--red); }

.sidebar-avail .avail-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.sidebar-note {
  font-size: 0.75rem;
  color: var(--muted);
  text-align: center;
  line-height: 1.5;
}

.btn-compare-sidebar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.6rem;
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s, transform 0.1s;
  font-family: inherit;
}

.btn-compare-sidebar:hover { border-color: var(--red); color: var(--red); }
.btn-compare-sidebar.in-compare { border-color: var(--red); color: var(--red); background: #fff5f5; }
.btn-compare-sidebar:active { transform: scale(0.97); }

/* ─── Responsive — detail page ───────────────────────────────── */
@media (max-width: 900px) {
  .detail-page-grid {
    grid-template-columns: 1fr;
  }
  .detail-sidebar {
    position: static;
    order: -1;
  }
}
```

- [ ] **Step 3: Add compare card button styles**

Append this block immediately after the `.btn-added` rule in products.css:

```css
.btn-compare-card {
  width: 100%;
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s, transform 0.1s;
  font-family: inherit;
  margin-top: 0.4rem;
}

.btn-compare-card:hover { border-color: var(--red); color: var(--red); }
.btn-compare-card.in-compare { border-color: var(--red); color: var(--red); background: #fff5f5; }
.btn-compare-card:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-compare-card:not(:disabled):active { transform: scale(0.97); }
```

- [ ] **Step 4: Verify**

Open `http://localhost:3000/product-detail.html?id=1` — page still loads (may look broken until Task 5; that's expected). No CSS parse errors in DevTools console.

- [ ] **Step 5: Commit**

```bash
git add frontend/css/products.css
git commit -m "feat: add detail page layout, gallery, spec table, sidebar, compare button CSS"
```

---

## Task 3: CSS — compare tray and overlay

**Files:**
- Modify: `frontend/css/products.css` (append before prefers-reduced-motion block)

- [ ] **Step 1: Append compare tray and overlay styles**

```css
/* ─── Compare Tray (fixed bottom) ───────────────────────────── */
.compare-tray {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #1a1a1a;
  color: #fff;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 200;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1);
  box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
  flex-wrap: wrap;
}

.compare-tray.visible { transform: translateY(0); }

.compare-tray-label { font-size: 0.78rem; color: #888; flex-shrink: 0; }

.compare-tray-slots { display: flex; gap: 0.5rem; flex: 1; min-width: 0; flex-wrap: wrap; }

.compare-slot {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.75rem;
  border-radius: var(--radius);
  font-size: 0.78rem;
  max-width: 200px;
}

.compare-slot-filled { background: #2a2a2a; border: 1px solid #444; }
.compare-slot-empty { border: 1px dashed #444; color: #555; }

.compare-slot-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.compare-slot-remove {
  background: none;
  border: none;
  color: var(--red);
  cursor: pointer;
  font-size: 1rem;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
}

.compare-tray-actions { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }

.compare-tray-btn {
  background: var(--red);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  padding: 0.5rem 1.25rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s, transform 0.1s;
  font-family: inherit;
}

.compare-tray-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.compare-tray-btn:not(:disabled):hover { background: var(--red-dark); }
.compare-tray-btn:not(:disabled):active { transform: scale(0.97); }

.compare-tray-clear {
  background: none;
  border: none;
  color: #888;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.25rem;
  font-family: inherit;
  transition: color 0.15s;
}

.compare-tray-clear:hover { color: #fff; }

/* ─── Compare Overlay ────────────────────────────────────────── */
.compare-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  z-index: 300;
  display: none;
  align-items: flex-start;
  justify-content: center;
  overflow-y: auto;
  padding: 2rem 1rem;
}

.compare-overlay.open {
  display: flex;
  animation: fadeInPage 0.2s cubic-bezier(0.23, 1, 0.32, 1) both;
}

.compare-overlay-inner {
  background: var(--card);
  border-radius: var(--radius);
  width: 100%;
  max-width: 1100px;
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.23, 1, 0.32, 1) both;
}

.compare-overlay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--card);
  z-index: 1;
}

.compare-overlay-header h2 { font-size: 1rem; font-weight: 700; }

.compare-overlay-close {
  background: none;
  border: none;
  font-size: 1.4rem;
  cursor: pointer;
  color: var(--muted);
  padding: 0.25rem 0.5rem;
  line-height: 1;
  border-radius: var(--radius);
  transition: color 0.15s, background 0.15s;
  font-family: inherit;
}

.compare-overlay-close:hover { color: var(--text); background: var(--bg); }

.compare-table-wrap { overflow-x: auto; }

.compare-table { width: 100%; border-collapse: collapse; table-layout: fixed; }

.compare-label-col { width: 130px; }

.compare-col-header {
  padding: 1.25rem 1rem;
  text-align: left;
  border-right: 1px solid var(--border);
  vertical-align: top;
}

.compare-col-header:last-child { border-right: none; }

.compare-product-img {
  width: 100%;
  aspect-ratio: 4/3;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.compare-product-img img { width: 100%; height: 100%; object-fit: cover; }

.compare-product-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 0.25rem;
  line-height: 1.3;
}

.compare-product-brand {
  font-size: 0.75rem;
  color: var(--red);
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.compare-col-avail {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 20px;
  margin-bottom: 0.75rem;
}

.compare-col-avail.available { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
.compare-col-avail.unavailable { background: #fff0f0; color: var(--red); border: 1px solid #fecaca; }
.compare-col-avail .avail-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

.compare-col-remove {
  display: block;
  width: 100%;
  margin-top: 0.5rem;
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.35rem;
  font-size: 0.72rem;
  color: var(--muted);
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, color 0.15s;
}

.compare-col-remove:hover { border-color: var(--red); color: var(--red); }

.compare-row-label {
  padding: 0.75rem 1rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #444;
  background: #fafafa;
  border-right: 1px solid var(--border);
  border-top: 1px solid #f5f5f5;
  white-space: nowrap;
  vertical-align: top;
}

.compare-row-value {
  padding: 0.75rem 1rem;
  font-size: 0.82rem;
  color: var(--text);
  border-right: 1px solid var(--border);
  border-top: 1px solid #f5f5f5;
  vertical-align: top;
  line-height: 1.5;
}

.compare-row-value:last-child { border-right: none; }

.compare-tag {
  display: inline-block;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--muted);
  font-size: 0.72rem;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  margin: 0.1rem 0.15rem 0.1rem 0;
}

.compare-feature { font-size: 0.8rem; padding: 0.1rem 0; }
.compare-feature::before { content: "✓ "; color: var(--red); font-weight: 700; }

.btn-add-enquiry {
  width: 100%;
  background: var(--red);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  padding: 0.6rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, transform 0.1s;
}

.btn-add-enquiry:hover { background: var(--red-dark); }
.btn-add-enquiry:active { transform: scale(0.97); }
```

- [ ] **Step 2: Commit**

```bash
git add frontend/css/products.css
git commit -m "feat: add compare tray and comparison overlay CSS"
```

---

## Task 4: Create compare.js (shared compare state + tray + overlay)

**Files:**
- Create: `frontend/js/compare.js`

- [ ] **Step 1: Create the file**

Create `frontend/js/compare.js` with this complete content:

```js
// ─── Compare state ──────────────────────────────────────────────
const COMPARE_KEY  = "compareList";
const COMPARE_MAX  = 3;

function getCompareList() {
  return JSON.parse(localStorage.getItem(COMPARE_KEY) || "[]");
}

function saveCompareList(list) {
  localStorage.setItem(COMPARE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("compareUpdated"));
}

function isInCompare(productId) {
  return getCompareList().includes(productId);
}

function addToCompare(productId) {
  const list = getCompareList();
  if (list.includes(productId) || list.length >= COMPARE_MAX) return;
  list.push(productId);
  saveCompareList(list);
}

function removeFromCompare(productId) {
  saveCompareList(getCompareList().filter(id => id !== productId));
}

function clearCompare() {
  saveCompareList([]);
}

function toggleCompare(productId) {
  if (isInCompare(productId)) {
    removeFromCompare(productId);
  } else {
    addToCompare(productId);
  }
}

// ─── Tray ───────────────────────────────────────────────────────
function renderCompareTray() {
  const tray = document.getElementById("compareTray");
  if (!tray) return;

  const list = getCompareList();

  if (list.length === 0) {
    tray.classList.remove("visible");
    return;
  }

  tray.classList.add("visible");

  const slots = [];
  for (let i = 0; i < COMPARE_MAX; i++) {
    const id = list[i];
    if (id !== undefined) {
      const p = PRODUCTS.find(p => p.id === id);
      const name = p ? p.name : "Unknown product";
      slots.push(`
        <div class="compare-slot compare-slot-filled">
          <span class="compare-slot-name" title="${name}">${name}</span>
          <button class="compare-slot-remove"
            onclick="removeFromCompare(${id})"
            aria-label="Remove ${name} from comparison">×</button>
        </div>`);
    } else {
      slots.push(`<div class="compare-slot compare-slot-empty">+ Add product</div>`);
    }
  }

  document.getElementById("compareTraySlots").innerHTML = slots.join("");

  const btn = document.getElementById("compareBtn");
  btn.disabled = list.length < 2;
}

// ─── Overlay ────────────────────────────────────────────────────
function openComparisonOverlay() {
  const list = getCompareList();
  const products = list.map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean);
  if (products.length < 2) return;

  const headerCols = products.map(p => {
    const availClass = p.status === "Available" ? "available" : "unavailable";
    const imgContent = p.imageUrl
      ? `<img src="${p.imageUrl}" alt="${p.name}" onerror="this.style.display='none'">`
      : "";
    return `
      <td class="compare-col-header">
        <div class="compare-product-img">${imgContent}</div>
        <div class="compare-product-name">${p.name}</div>
        <div class="compare-product-brand">${p.brand}</div>
        <div class="compare-col-avail ${availClass}">
          <span class="avail-dot"></span>${p.status}
        </div>
        <button class="compare-col-remove"
          onclick="removeFromCompare(${p.id})">Remove</button>
      </td>`;
  }).join("");

  const specRows = [
    {
      label: "Category",
      render: p => p.category
    },
    {
      label: "Industries",
      render: p => p.industries.map(i => `<span class="compare-tag">${i}</span>`).join("")
    },
    {
      label: "Surfaces",
      render: p => p.surfaces.map(s => `<span class="compare-tag">${s}</span>`).join("")
    },
    {
      label: "Key Features",
      render: p => p.features.map(f => `<div class="compare-feature">${f}</div>`).join("")
    }
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
          <button class="btn-add-enquiry"
            onclick="addToBasketFromCompare(${p.id})">
            Add to Enquiry Basket
          </button>
        </td>`).join("")}
    </tr>`;

  const overlay = document.getElementById("compareOverlay");
  overlay.innerHTML = `
    <div class="compare-overlay-inner">
      <div class="compare-overlay-header">
        <h2>Compare Products</h2>
        <button class="compare-overlay-close"
          onclick="closeComparisonOverlay()"
          aria-label="Close comparison">×</button>
      </div>
      <div class="compare-table-wrap">
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
      </div>
    </div>`;

  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeComparisonOverlay() {
  const overlay = document.getElementById("compareOverlay");
  if (overlay) overlay.classList.remove("open");
  document.body.style.overflow = "";
}

function addToBasketFromCompare(productId) {
  const basket = JSON.parse(localStorage.getItem("enquiryBasket") || "[]");
  if (!basket.includes(productId)) {
    basket.push(productId);
    localStorage.setItem("enquiryBasket", JSON.stringify(basket));
    window.dispatchEvent(new Event("basketUpdated"));
  }
  closeComparisonOverlay();
}

// ─── Init: re-render tray whenever state changes ─────────────────
window.addEventListener("compareUpdated", renderCompareTray);
window.addEventListener("DOMContentLoaded", renderCompareTray);
```

- [ ] **Step 2: Commit**

```bash
git add frontend/js/compare.js
git commit -m "feat: add compare.js with shared compare state, tray and overlay rendering"
```

---

## Task 5: Rewrite product-detail.html + product-detail.js

**Files:**
- Modify: `frontend/product-detail.html`
- Modify: `frontend/js/product-detail.js`

- [ ] **Step 1: Rewrite product-detail.html**

Replace the entire contents of `frontend/product-detail.html` with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Detail | Yee Lim Adhesives Industries</title>
  <meta id="metaDescription" name="description" content="Detailed specifications, application surfaces, and usage guide for Yee Lim Adhesives industrial products. Submit an enquiry directly to our sales team.">
  <link rel="stylesheet" href="css/products.css">
  <script src="js/widgets/navbar.js"></script>
</head>
<body>

<div class="breadcrumb" id="breadcrumb">
  <a href="home.html">Home</a>
  <span>›</span>
  <a href="products.html">Products</a>
  <span>›</span>
  <span id="breadcrumbProduct">Loading…</span>
</div>

<div class="detail-page-grid" id="detailPageGrid">
  <div class="detail-main">
    <div id="detailGallery"></div>
    <div id="detailHeader"></div>
    <div id="detailSpecs"></div>
    <div id="detailDesc"></div>
  </div>
  <aside class="detail-sidebar" id="detailSidebar" aria-label="Product actions"></aside>
</div>

<div class="related-section" id="relatedSection" style="display:none">
  <h3>Related Products</h3>
  <div class="related-grid" id="relatedGrid"></div>
</div>

<div class="compare-overlay" id="compareOverlay"
  role="dialog" aria-modal="true" aria-label="Product comparison"></div>

<div class="toast" id="toast" role="status" aria-live="polite" aria-atomic="true"></div>

<footer class="footer">
  <p>&copy; 2025 Yee Lim Adhesives Industries. All rights reserved.</p>
</footer>

<script src="js/data.js"></script>
<script src="js/compare.js"></script>
<script src="js/product-detail.js"></script>
</body>
</html>
```

- [ ] **Step 2: Rewrite product-detail.js**

Replace the entire contents of `frontend/js/product-detail.js` with:

```js
// ─── Init ────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const params  = new URLSearchParams(window.location.search);
  const id      = parseInt(params.get("id"), 10);
  const product = PRODUCTS.find(p => p.id === id);

  if (!product) {
    document.getElementById("detailPageGrid").innerHTML =
      "<p style='padding:3rem 1.5rem;color:var(--muted)'>Product not found. <a href='products.html' style='color:var(--red)'>Back to products</a></p>";
    return;
  }

  document.title = `${product.name} | Yee Lim Adhesives Industries`;
  document.getElementById("breadcrumbProduct").textContent = product.name;

  renderGallery(product);
  renderHeader(product);
  renderSpecTable(product);
  renderSidebar(product);
  renderFullDesc(product);
  renderRelated(product);
  updateBasketCount();

  window.addEventListener("compareUpdated", () => updateSidebarCompareBtn(product.id));
});

// ─── Gallery ─────────────────────────────────────────────────────
function renderGallery(product) {
  const el      = document.getElementById("detailGallery");
  const images  = (product.images && product.images.length) ? product.images : [];
  const primary = product.imageUrl;

  const placeholderSVG = `
    <div class="gallery-placeholder">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      <span>Image coming soon</span>
    </div>`;

  const mainImgContent = primary
    ? `<img id="galleryMainImg" src="${primary}" alt="${product.name}"
         onerror="this.replaceWith(document.createRange().createContextualFragment('${placeholderSVG.replace(/'/g, "\\'")}'))">`
    : placeholderSVG;

  const thumbSources = images.length ? images : (primary ? [primary] : []);

  const thumbsHTML = [0, 1, 2, 3].map(i => {
    const src = thumbSources[i];
    const imgTag = src
      ? `<img src="${src}" alt="View ${i + 1}"
           onerror="this.parentElement.innerHTML=''">`
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="1.5"
           stroke-linecap="round" stroke-linejoin="round">
           <rect x="3" y="3" width="18" height="18" rx="2"/>
           <circle cx="8.5" cy="8.5" r="1.5"/>
           <polyline points="21 15 16 10 5 21"/>
         </svg>`;
    const activeClass = i === 0 ? " active" : "";
    return `
      <div class="gallery-thumb${activeClass}"
        onclick="switchGalleryImage(${i}, this, '${thumbSources[i] || ""}')"
        aria-label="Product image ${i + 1}">
        ${imgTag}
      </div>`;
  }).join("");

  el.innerHTML = `
    <div class="gallery-main" id="galleryMain">${mainImgContent}</div>
    <div class="gallery-thumbs">${thumbsHTML}</div>`;
}

function switchGalleryImage(index, thumbEl, src) {
  const main = document.getElementById("galleryMain");
  if (src) {
    main.innerHTML = `<img id="galleryMainImg" src="${src}" alt="Product image">`;
  }
  document.querySelectorAll(".gallery-thumb").forEach(t => t.classList.remove("active"));
  thumbEl.classList.add("active");
}

// ─── Product Header ───────────────────────────────────────────────
function renderHeader(product) {
  const el          = document.getElementById("detailHeader");
  const availClass  = product.status === "Available" ? "available" : "unavailable";
  el.innerHTML = `
    <div class="detail-product-header">
      <div class="detail-product-meta">
        <span class="brand-badge">${product.brand}</span>
        <span class="avail-badge ${availClass}" aria-label="Availability: ${product.status}">
          <span class="avail-dot"></span>${product.status}
        </span>
      </div>
      <h1 class="detail-product-name">${product.name}</h1>
      <p class="detail-product-desc">${product.shortDescription}</p>
    </div>`;
}

// ─── Spec Table ───────────────────────────────────────────────────
function renderSpecTable(product) {
  const el          = document.getElementById("detailSpecs");
  const industryRow = product.industries.map(i => `<span class="spec-tag">${i}</span>`).join("");
  const surfaceRow  = product.surfaces.map(s => `<span class="spec-tag">${s}</span>`).join("");
  const featureRow  = product.features.map(f => `<span class="spec-feature">${f}</span>`).join("");

  el.innerHTML = `
    <div class="spec-table-wrap">
      <div class="spec-table-heading">Specifications</div>
      <div class="spec-row">
        <div class="spec-key">Brand</div>
        <div class="spec-val">${product.brand}</div>
      </div>
      <div class="spec-row">
        <div class="spec-key">Category</div>
        <div class="spec-val">${product.category}</div>
      </div>
      <div class="spec-row">
        <div class="spec-key">Industries</div>
        <div class="spec-val"><div class="spec-tags">${industryRow}</div></div>
      </div>
      <div class="spec-row">
        <div class="spec-key">Surfaces</div>
        <div class="spec-val"><div class="spec-tags">${surfaceRow}</div></div>
      </div>
      <div class="spec-row">
        <div class="spec-key">Key Features</div>
        <div class="spec-val"><div class="spec-features">${featureRow}</div></div>
      </div>
    </div>`;
}

// ─── Sticky Sidebar ───────────────────────────────────────────────
function renderSidebar(product) {
  const el         = document.getElementById("detailSidebar");
  const basket     = getBasket();
  const inBasket   = basket.includes(product.id);
  const inCompare  = isInCompare(product.id);
  const availClass = product.status === "Available" ? "available" : "unavailable";

  el.innerHTML = `
    <div class="sidebar-product-name">${product.name}</div>
    <div class="sidebar-brand">${product.brand}</div>
    <div class="sidebar-divider"></div>
    <div class="sidebar-avail ${availClass}">
      <span class="avail-dot"></span>${product.status}
    </div>
    <div class="sidebar-divider"></div>
    <button
      class="btn btn-primary btn-lg ${inBasket ? "btn-added" : ""}"
      id="sidebarBasketBtn"
      onclick="toggleBasket(${product.id})">
      ${inBasket ? "&#10003; Added to Enquiry" : "Add to Enquiry Basket"}
    </button>
    <button
      class="btn-compare-sidebar ${inCompare ? "in-compare" : ""}"
      id="sidebarCompareBtn"
      onclick="toggleCompare(${product.id})"
      aria-pressed="${inCompare}">
      ${inCompare ? "✓ In Comparison" : "+ Add to Compare"}
    </button>
    <a href="enquiry.html" class="btn btn-outline btn-lg" style="text-align:center">
      View Enquiry Basket
    </a>
    <p class="sidebar-note">Submit an enquiry to receive pricing and lead times from our sales team.</p>`;
}

function updateSidebarCompareBtn(productId) {
  const btn = document.getElementById("sidebarCompareBtn");
  if (!btn) return;
  const inCompare = isInCompare(productId);
  btn.className   = `btn-compare-sidebar ${inCompare ? "in-compare" : ""}`;
  btn.textContent = inCompare ? "✓ In Comparison" : "+ Add to Compare";
  btn.setAttribute("aria-pressed", inCompare ? "true" : "false");
}

// ─── Full Description + Usage ─────────────────────────────────────
function renderFullDesc(product) {
  const el = document.getElementById("detailDesc");
  el.innerHTML = `
    <h3 class="section-heading">Product Description</h3>
    <p class="desc-text">${product.fullDescription}</p>
    <h3 class="section-heading" style="margin-top:1.5rem">How to Use</h3>
    <div class="usage-box">${product.usage}</div>`;
}

// ─── Related Products ─────────────────────────────────────────────
function renderRelated(product) {
  const related = PRODUCTS.filter(p =>
    p.id !== product.id &&
    (p.brand === product.brand ||
     p.industries.some(i => product.industries.includes(i)))
  ).slice(0, 4);

  if (related.length === 0) return;

  document.getElementById("relatedSection").style.display = "block";
  document.getElementById("relatedGrid").innerHTML = related.map(p => `
    <div class="product-card">
      <div class="product-card-image">
        <img src="${p.imageUrl}" alt="${p.name}"
          onerror="this.parentElement.style.background='var(--bg)'">
      </div>
      <div class="product-card-body">
        <span class="brand-badge">${p.brand}</span>
        <h3>${p.name}</h3>
        <p>${p.shortDescription}</p>
        <div class="product-card-actions">
          <a href="product-detail.html?id=${p.id}" class="btn btn-outline">View Details</a>
        </div>
      </div>
    </div>`).join("");
}

// ─── Basket helpers ───────────────────────────────────────────────
function getBasket() {
  return JSON.parse(localStorage.getItem("enquiryBasket") || "[]");
}

function saveBasket(basket) {
  localStorage.setItem("enquiryBasket", JSON.stringify(basket));
  updateBasketCount();
  window.dispatchEvent(new Event("basketUpdated"));
}

function toggleBasket(productId) {
  const basket = getBasket();
  const idx    = basket.indexOf(productId);
  const btn    = document.getElementById("sidebarBasketBtn");

  if (idx === -1) {
    basket.push(productId);
    if (btn) { btn.innerHTML = "&#10003; Added to Enquiry"; btn.classList.add("btn-added"); }
    showToast("Added to enquiry basket");
  } else {
    basket.splice(idx, 1);
    if (btn) { btn.textContent = "Add to Enquiry Basket"; btn.classList.remove("btn-added"); }
    showToast("Removed from basket");
  }
  saveBasket(basket);
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
```

- [ ] **Step 3: Verify**

Open `http://localhost:3000/product-detail.html?id=1`

Expected:
- Gallery area shows placeholder SVG (no real photos yet) with 4 thumb slots
- Green "Available" badge next to brand badge
- Product name as `<h1>` below
- Spec table with 5 rows
- Sticky sidebar on the right with 3 buttons
- Full description and usage box below spec table
- Related products at the bottom

- [ ] **Step 4: Commit**

```bash
git add frontend/product-detail.html frontend/js/product-detail.js
git commit -m "feat: redesign product detail page with gallery, spec table, sticky sidebar"
```

---

## Task 6: Update products.html + products.js (add compare entry point)

**Files:**
- Modify: `frontend/products.html`
- Modify: `frontend/js/products.js`

- [ ] **Step 1: Add compare tray, overlay, and script to products.html**

In `frontend/products.html`, make two additions:

**Before the closing `</body>` tag**, add the compare tray, overlay, and script (after the existing `<script src="js/products.js"></script>` line):

```html
<!-- Compare tray -->
<div class="compare-tray" id="compareTray" role="region" aria-label="Product comparison tray">
  <span class="compare-tray-label">Comparing:</span>
  <div class="compare-tray-slots" id="compareTraySlots"></div>
  <div class="compare-tray-actions">
    <button class="compare-tray-btn" id="compareBtn"
      onclick="openComparisonOverlay()" disabled
      aria-label="Open comparison view">Compare →</button>
    <button class="compare-tray-clear" onclick="clearCompare()"
      aria-label="Clear all products from comparison">Clear all</button>
  </div>
</div>

<!-- Compare overlay -->
<div class="compare-overlay" id="compareOverlay"
  role="dialog" aria-modal="true" aria-label="Product comparison"></div>
```

**Change the script loading order** at the bottom of `<body>`:

```html
<script src="js/data.js"></script>
<script src="js/compare.js"></script>
<script src="js/products.js"></script>
```

- [ ] **Step 2: Add compare button to productCardHTML in products.js**

In `frontend/js/products.js`, locate `function productCardHTML(p)`. Add two things:

**At the top of the function**, after the `const inBasket` line, add:

```js
const inCompare      = isInCompare(p.id);
const compareMax     = getCompareList().length >= COMPARE_MAX;
const compareDisabled = !inCompare && compareMax;
const compareBtnClass = `btn-compare-card${inCompare ? " in-compare" : ""}`;
const compareBtnText  = inCompare ? "✓ In Compare" : "+ Compare";
```

**In the returned HTML**, after the closing `</div>` of `.product-card-actions`, add:

```html
<button
  class="${compareBtnClass}"
  onclick="toggleCompare(${p.id})"
  ${compareDisabled ? 'disabled title="Remove a product to add another"' : ''}
  aria-pressed="${inCompare}">
  ${compareBtnText}
</button>
```

So the full updated `productCardHTML` function becomes:

```js
function productCardHTML(p) {
  const basket         = getBasket();
  const inBasket       = basket.includes(p.id);
  const inCompare      = isInCompare(p.id);
  const compareMax     = getCompareList().length >= COMPARE_MAX;
  const compareDisabled = !inCompare && compareMax;
  const compareBtnClass = `btn-compare-card${inCompare ? " in-compare" : ""}`;
  const compareBtnText  = inCompare ? "✓ In Compare" : "+ Compare";
  const industryTags   = p.industries.slice(0, 2).map(i => `<span class="product-tag">${i}</span>`).join("");

  const brandSlug  = p.brand.replace(/[^a-z]/gi, "").toLowerCase();
  const imageHtml  = `
    <img
      src="${p.imageUrl}"
      alt="${p.name}"
      onerror="this.parentElement.classList.add('no-image');this.remove();this.parentElement.innerHTML+='<div class=no-image-icon>&#128247;</div><div class=no-image-label>${brandSlug}</div>'"
    >`;

  return `
    <div class="product-card">
      <div class="product-card-image">${imageHtml}</div>
      <div class="product-card-body">
        <span class="brand-badge">${p.brand}</span>
        <h3>${p.name}</h3>
        <p>${p.shortDescription}</p>
        <div class="product-tags">${industryTags}</div>
        <div class="product-card-actions">
          <a href="product-detail.html?id=${p.id}" class="btn btn-outline">View Details</a>
          <button
            class="btn btn-primary ${inBasket ? "btn-added" : ""}"
            onclick="toggleBasket(${p.id})"
          >${inBasket ? "&#10003; Added" : "Add to Enquiry"}</button>
        </div>
        <button
          class="${compareBtnClass}"
          onclick="toggleCompare(${p.id})"
          ${compareDisabled ? 'disabled title="Remove a product to add another"' : ""}
          aria-pressed="${inCompare}">
          ${compareBtnText}
        </button>
      </div>
    </div>`;
}
```

- [ ] **Step 3: Store currentResults and re-render on compareUpdated**

In `frontend/js/products.js`, add a module-level variable and update `renderGrid` and the DOMContentLoaded listener:

**At the top of the file**, add after the `let activeFilters` line:

```js
let currentResults = PRODUCTS;
```

**In `renderGrid`**, update the last line from `grid.innerHTML = products.map(...)` to also store results:

```js
function renderGrid(products) {
  currentResults = products;          // ← add this line
  const grid    = document.getElementById("productGrid");
  const countEl = document.getElementById("resultCount");
  // ... rest of function unchanged ...
}
```

**After the DOMContentLoaded listener**, add:

```js
window.addEventListener("compareUpdated", () => renderGrid(currentResults));
```

- [ ] **Step 4: Verify**

Open `http://localhost:3000/products.html`

Expected:
- Each product card has a "+ Compare" button below the action row
- Clicking it turns red "✓ In Compare" and the dark tray slides up from the bottom
- Up to 3 products can be added; the 4th card's Compare button goes disabled
- Clicking "×" on a tray slot removes that product
- With 2+ products selected, the "Compare →" button is enabled
- Clicking "Compare →" opens the full-screen overlay table
- Overlay shows product image placeholder, name, brand, availability, and spec rows
- "Add to Enquiry Basket" in overlay calls `addToBasketFromCompare` and closes
- "Remove" button in overlay column removes that product from comparison
- "Clear all" in tray clears everything and tray slides down

- [ ] **Step 5: Commit**

```bash
git add frontend/products.html frontend/js/products.js
git commit -m "feat: add comparison tray and overlay to products catalogue"
```

---

## Task 7: Wire compare entry point on detail page + final polish

**Files:**
- Verify: `frontend/js/product-detail.js` (no changes — compare functions already called)
- Verify: `frontend/product-detail.html` (compare overlay already added)

- [ ] **Step 1: Verify detail page compare flow**

Open `http://localhost:3000/product-detail.html?id=1`

Expected:
- "+ Add to Compare" button in sidebar
- Clicking it changes to "✓ In Comparison"
- Navigate to `http://localhost:3000/products.html` — the card for product 1 shows "✓ In Compare" (state persists via localStorage)
- The tray is already visible since 1 product is in the list

- [ ] **Step 2: Verify cross-page state sync**

1. Go to `products.html`, add products 2 and 3 to compare
2. Open `product-detail.html?id=2` — sidebar "Add to Compare" shows "✓ In Comparison"
3. Click it to remove → sidebar updates to "+ Add to Compare"
4. Go back to `products.html` → card 2 shows "+ Compare" and tray only has 3

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat: product detail redesign and comparison feature complete"
```

---

## Self-Review

**Spec coverage check:**
- [x] Gallery with 4 thumb slots, placeholder until client provides photos → Task 5 `renderGallery`
- [x] Availability badge (green/red dot) from `product.status` → Task 5 `renderHeader`
- [x] Spec table replacing tag clouds → Task 5 `renderSpecTable`
- [x] Wide 360px sticky sidebar with 3 buttons → Task 2 CSS + Task 5 `renderSidebar`
- [x] "+ Compare" on catalogue cards → Task 6 `productCardHTML`
- [x] "+ Add to Compare" in detail sidebar → Task 5 `renderSidebar`
- [x] Floating tray (max 3, slides up) → Task 3 CSS + Task 4 `renderCompareTray`
- [x] Full-screen overlay table → Task 3 CSS + Task 4 `openComparisonOverlay`
- [x] Products as columns, specs as rows → Task 4 overlay HTML
- [x] "Add to Enquiry" from overlay → Task 4 `addToBasketFromCompare`
- [x] localStorage persistence → Task 4 `getCompareList/saveCompareList`
- [x] `compareUpdated` event for cross-component sync → Tasks 4, 6

**Type consistency:**
- `isInCompare` defined in compare.js Task 4, called in products.js Task 6 and product-detail.js Task 5 ✓
- `toggleCompare` defined in compare.js Task 4, called in both pages ✓
- `getCompareList` defined in compare.js Task 4, used in products.js Task 6 ✓
- `COMPARE_MAX` constant defined in compare.js Task 4, used in products.js Task 6 ✓
- `openComparisonOverlay` defined in compare.js Task 4, called from tray button in products.html Task 6 ✓
- `removeFromCompare` defined in compare.js Task 4, called from tray slots and overlay columns ✓
