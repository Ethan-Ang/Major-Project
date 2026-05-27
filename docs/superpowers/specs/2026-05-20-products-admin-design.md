# Products-Admin Design Spec
**Project:** Project ReBond — Yee Lim Web Revitalisation  
**Branch:** products-admin  
**Author:** Matthias (CHAN YEUI YEUNG MATTHIAS)  
**Date:** 2026-05-20  
**Status:** Approved

---

## Overview

Build the products catalogue, product detail, admin panel (login + dashboard), and enquiry basket for Yee Lim Adhesives Industries' revamped website. All pages use plain HTML, CSS, and JavaScript — no frameworks. Files live in `frontend/` alongside teammates' pages.

---

## Files

| File | Status | Notes |
|------|--------|-------|
| `frontend/products.html` | Fill (empty stub) | Products catalogue |
| `frontend/product-detail.html` | Create new | Single product view |
| `frontend/admin_login.html` | Fill (empty stub) | Admin login |
| `frontend/admin_dashboard.html` | Fill (empty stub) | Admin CRUD panel |
| `frontend/js/products.js` | Fill (empty stub) | Catalogue logic |
| `frontend/js/product-detail.js` | Create new | Detail page logic |
| `frontend/js/login.js` | Fill (empty stub) | Auth logic |
| `frontend/js/admin.js` | Fill (empty stub) | Admin CRUD logic |
| `frontend/js/data.js` | Create new | Sample product data (primary source for public pages) |
| `frontend/css/products.css` | Create new | Catalogue + detail styles |
| `frontend/css/admin.css` | Create new | Admin panel styles |

---

## Data Strategy

The backend API (`http://localhost:5050`) supports:
```json
{ "name", "category", "shortDescription", "fullDescription", "usage", "imageUrl", "status" }
```

`data.js` supplements this with brand, industry, surface, and key features for prototype filtering. The admin panel writes to the real API using Bearer token auth. The public catalogue reads from the API and falls back to `data.js` sample data for rich filtering.

### Sample product data shape (data.js)
```js
{
  id: 1,
  name: "...",
  brand: "Deer™ Brand",           // Deer™, Horsemen™, Premier™, Rhino™
  category: "Industrial",
  shortDescription: "...",
  fullDescription: "...",
  usage: "...",
  imageUrl: "images/products/sample.jpg",
  status: "Available",
  industries: ["Flooring", "Carpentry"],   // from 12 categories
  surfaces: ["Wood", "Laminates"],          // from 15 categories
  features: ["...", "..."]
}
```

### Brands (4)
Deer™, Horsemen™, Premier™, Rhino™

### Industries (12)
Automotive, Carpentry, Cooling Process, Fashion, Flooring, Insulation, Lift & Escalator, Marine, Packaging, Plumbing & Sanitary, Upholstery, Waterproof

### Surfaces (15)
Carpet, Fibreglass Wool, Foam & Sponge, Labels, Laminates, Leather, Metal, Paper, Plastics & Acrylics, Rubber, Stone Ceramics, Tiles, Turf, Wallpaper, Wood

---

## Colour Palette & Typography

| Token | Value |
|-------|-------|
| Primary red | `#CC2929` |
| Dark | `#1a1a1a` |
| Background | `#f5f5f5` |
| Card | `#ffffff` |
| Border | `#e0e0e0` |
| Text primary | `#222222` |
| Text secondary | `#666666` |

- Headings: bold, sans-serif (system stack)
- Body: 16px minimum
- No decorative fonts, no Bootstrap, no Tailwind

---

## Page 1 — Products Catalogue (`products.html`)

**Layout:** sticky nav → hero search bar → filter sidebar + product grid → footer

- **Search bar:** filters by name, brand, industry, surface, keyword — live filtering (no page reload)
- **Filter sidebar:** checkboxes grouped by Brand, Industry, Surface — desktop sidebar, mobile collapsible drawer
- **Product grid:** 3 col desktop / 2 col tablet / 1 col mobile
- **Product card:** image, name, brand badge, short description, "Add to Enquiry" + "View Details" buttons
- **Empty state:** friendly message when no results match

**Data flow:** `data.js` → `products.js` renders grid → filter/search update visible cards

---

## Page 2 — Product Detail (`product-detail.html`)

**Layout:** breadcrumb → product hero (image + name + brand badge + CTA) → tabs/sections (Description, Surfaces, Industries, Features) → related products → enquiry CTA

- URL param: `?id=1` — `product-detail.js` reads param, finds product in data.js
- "Add to Enquiry Basket" button → writes to localStorage
- "Enquire Now" button → jumps to basket or contact page
- Related products: same brand or overlapping industry (max 4 cards)

---

## Page 3 — Admin Login (`admin_login.html`)

- Simple form: username + password
- Calls `POST http://localhost:5050/api/auth/login`
- On success: stores token in `localStorage.setItem("adminToken", data.token)` → redirects to `admin_dashboard.html`
- On failure: shows inline error message
- If already logged in (token exists + valid): skip to dashboard

---

## Page 4 — Admin Dashboard (`admin_dashboard.html`)

**Auth guard:** on page load, calls `GET /api/auth/me` with Bearer token. If invalid → redirect to login.

**Layout:** sidebar nav + main content area

- **Product table:** name, category, status, actions (Edit / Delete)
- **Add product form:** modal or inline panel — fields: name, category, shortDescription, fullDescription, usage, imageUrl, status
- **Edit:** pre-fills form with existing data, calls `PUT /api/products/:id`
- **Delete:** confirmation prompt, calls `DELETE /api/products/:id`
- **Logout:** clears token, redirects to login

**API calls all include:** `Authorization: Bearer <token>` header

---

## Enquiry Basket

- **Storage:** `localStorage` key `enquiryBasket` — array of product IDs
- **Add:** from any product card or detail page → toast notification "Added to enquiry"
- **Basket page** (`frontend/enquiry.html`): lists selected products with remove buttons
- **Enquiry form fields:** name, company, email, phone, message, product list (auto-populated)
- **Submit:** shows confirmation message (no real email sending for prototype)
- **Badge:** basket icon in nav shows count

---

## Responsiveness

| Breakpoint | Behaviour |
|-----------|-----------|
| Desktop (>1024px) | 3-col grid, sidebar always visible |
| Tablet (768–1024px) | 2-col grid, sidebar collapsible |
| Mobile (<768px) | 1-col grid, sidebar as drawer from bottom |

---

## Build Order (Priority)

1. `data.js` — sample product data (foundation for everything)
2. `products.html` + `products.css` + `products.js` — highest priority
3. `product-detail.html` + `product-detail.js`
4. `admin_login.html` + `login.js`
5. `admin_dashboard.html` + `admin.js`
6. `admin.css`
7. Enquiry basket (woven into products.js + products.html)
