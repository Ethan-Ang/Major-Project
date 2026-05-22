# Product Detail Redesign + Comparison Feature

**Date:** 2026-05-22
**Branch:** products-admin
**Stack:** Plain HTML / CSS / JS, data from data.js + backend API at localhost:5050

---

## Scope

Two sequential deliverables:

1. **Product detail page redesign** — gallery, availability badge, spec table, wide sticky sidebar
2. **Product comparison feature** — floating tray on catalogue + full-screen comparison overlay, entry points on both catalogue cards and detail page sidebar

---

## 1. Product Detail Page Redesign

### Layout

Two-column grid: `1fr 360px`

- **Left column** — scrollable: gallery, product header, spec table, full description, usage box
- **Right column (360px)** — sticky sidebar: never scrolls, holds all CTAs

### 1.1 Image Gallery

- Main image area: full-width, `aspect-ratio: 4/3`, grey placeholder with SVG image icon
- Thumbnail strip below main image: 4 slots, fixed `56px × 44px`, first thumb has red border (active state)
- Clicking a thumb swaps the main image (JS)
- All 4 thumbs show placeholder SVG until Yee Lim provides product photography
- Data model: add `images: []` array to each product in `data.js`; if empty, show single placeholder

### 1.2 Availability Badge

- Displayed inline with brand badge: `● Available` (green #16a34a) or `● Unavailable` (red #CC2929)
- Source: `product.status` field (already in backend; add to data.js sample data)
- Also shown in sticky sidebar under a divider

### 1.3 Spec Table

Replaces the existing tag clouds and feature list. Single table with rows:

| Row | Value |
|-----|-------|
| Brand | e.g. Deer™ |
| Category | e.g. Industrial |
| Industries | Tag pills (flex-wrap) |
| Surfaces | Tag pills (flex-wrap) |
| Key Features | Checkmark list inline |

- Table has a "SPECIFICATIONS" section header (small caps, muted)
- Alternating row background: label column `#fafafa`, value column `#fff`
- Row borders: `1px solid #f0f0f0`
- No outer shadow — inherits card border

### 1.4 Wide Sticky Sidebar (360px)

Position: `position: sticky; top: 1.5rem; align-self: start`

Contents (top to bottom):
1. Product name (0.9rem, 700)
2. Brand name in red (0.75rem)
3. Divider
4. Availability status with dot
5. Divider
6. **Add to Enquiry Basket** — full-width red primary button
7. **Add to Compare** — full-width outline button with compare icon
8. **View Enquiry Basket** — full-width outline button
9. Note: "Submit an enquiry to receive pricing and lead times from our sales team." (muted, 0.75rem, centered)

Button order is deliberate: primary action first, comparison second, navigation third.

---

## 2. Comparison Feature

### 2.1 Entry Points

**Catalogue page (products.html):**
- Each product card gets a small **"+ Compare"** button below the existing action row
- Clicking adds to compare state; button turns red and reads **"✓ Added"**
- Max 3 products — when full, all unselected cards show the button disabled with tooltip "Remove a product to add another"

**Detail page sidebar:**
- **"Add to Compare"** outline button (item 7 in sidebar spec above)
- Same state toggle as catalogue: turns to "✓ In Compare" when active

### 2.2 Floating Comparison Tray

Appears at the bottom of the page when ≥ 1 product is added to compare. Slides up with CSS transition.

Structure (left to right):
- Label: "Comparing:" (muted)
- Up to 3 product slots: product name in dark chip with × to remove. Empty slots show dashed outline "+ Add product"
- **Compare →** red button (disabled and greyed if only 1 product selected — need at least 2)
- **Clear all** ghost button (far right)

CSS: `position: fixed; bottom: 0; left: 0; right: 0; z-index: 200; background: #1a1a1a`

Persistence: `localStorage` key `compareList` (array of product IDs, max 3)

### 2.3 Comparison Overlay

Full-screen overlay (not a modal — covers 100vw × 100vh). Opens when "Compare →" is clicked.

**Layout:** Products as columns, specs as rows.

| Row | Description |
|-----|-------------|
| Product image | Placeholder or actual image |
| Product name | Bold, linked to detail page |
| Brand | Brand badge |
| Availability | Coloured dot + text |
| Category | Plain text |
| Industries | Tag pills |
| Surfaces | Tag pills |
| Key Features | ✓ per feature |

- Header row: product images + names, sticky as table scrolls horizontally on narrow viewports
- Highlighted column: none (no "winner" — this is spec info, not a recommendation engine)
- Close button: top-right corner, returns user to wherever they were
- "Add to Enquiry" button per column: adds that product to enquiry basket
- Remove button (×) per column: removes from comparison

**Animations:**
- Tray: `transform: translateY(100%) → translateY(0)` on show, reverse on hide
- Overlay: `opacity 0 → 1` + `scale(0.97) → scale(1)` on open

### 2.4 State Management

```
compareList (localStorage) = [1, 4, 7]   // product IDs, max 3
```

Functions:
- `addToCompare(id)` — add to list, dispatch `compareUpdated` event
- `removeFromCompare(id)` — remove, dispatch event
- `clearCompare()` — clear all
- `renderCompareTray()` — rebuild tray UI from current state
- `openComparisonOverlay()` — render full table from current state
- `closeComparisonOverlay()`

All pages that show compare buttons listen to `compareUpdated` event to sync button states.

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/product-detail.html` | Restructure layout to two-column |
| `frontend/js/product-detail.js` | Rewrite renderHero (gallery, spec table, sidebar); add compare functions |
| `frontend/css/products.css` | Add gallery, spec table, sidebar, compare tray, overlay styles |
| `frontend/products.html` | Add compare tray div, update product card template |
| `frontend/js/products.js` | Add compare button to card render, compare state functions |
| `frontend/js/data.js` | Add `status` and `images[]` fields to each product |

No new HTML files. The comparison overlay is injected into the DOM by JS.

---

## Out of Scope

- Backend integration for comparison (frontend-only, data.js)
- Sharing/bookmarking comparison URLs
- Image gallery with real photos (placeholders until client provides assets)
- Comparison on mobile (tray collapses to icon on small screens — follow-up)
