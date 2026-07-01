# Products-Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the products catalogue, product detail page, admin panel (login + dashboard), and enquiry basket for Yee Lim Adhesives Industries' revamped website.

**Architecture:** All pages are plain HTML/CSS/JS — no frameworks. `data.js` is the primary data source for the public catalogue (brands, industries, surfaces, features). The admin panel talks directly to the backend API at `http://localhost:5050` using Bearer token auth. The enquiry basket is stored in `localStorage`.

**Tech Stack:** Plain HTML5, CSS3, Vanilla JavaScript (ES6+). Backend API at `http://localhost:5050`.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/js/data.js` | Create | Sample product data — single source of truth for public pages |
| `frontend/css/products.css` | Create | Styles for catalogue, product detail, enquiry basket |
| `frontend/products.html` | Fill | Products catalogue — search, filter sidebar, product grid |
| `frontend/js/products.js` | Fill | Catalogue logic — render, search, filter, basket |
| `frontend/product-detail.html` | Create | Single product view — hero, details, related products |
| `frontend/js/product-detail.js` | Create | Detail page logic — URL param, render, basket |
| `frontend/admin_login.html` | Fill | Admin login form |
| `frontend/js/login.js` | Fill | Auth logic — POST login, store token, redirect |
| `frontend/css/admin.css` | Create | Admin panel styles |
| `frontend/admin_dashboard.html` | Fill | Admin dashboard — product table, add/edit/delete |
| `frontend/js/admin.js` | Fill | Admin CRUD — API calls with Bearer token, auth guard |
| `frontend/enquiry.html` | Create | Enquiry basket — product list, enquiry form |

---

## Task 1: Create `frontend/js/data.js` — Sample Product Data

**Files:**
- Create: `frontend/js/data.js`

- [ ] **Step 1: Create data.js with 12 sample products**

Create `frontend/js/data.js` with this exact content:

```js
const API_BASE_URL = "http://localhost:5050";

const BRANDS = ["Deer™ Brand", "Horsemen™ Brand", "Premier™ Brand", "Rhino™ Brand"];

const INDUSTRIES = [
  "Automotive", "Carpentry", "Cooling Process", "Fashion", "Flooring",
  "Insulation", "Lift & Escalator", "Marine", "Packaging",
  "Plumbing & Sanitary", "Upholstery", "Waterproof"
];

const SURFACES = [
  "Carpet", "Fibreglass Wool", "Foam & Sponge", "Labels", "Laminates",
  "Leather", "Metal", "Paper", "Plastics & Acrylics", "Rubber",
  "Stone Ceramics", "Tiles", "Turf", "Wallpaper", "Wood"
];

const PRODUCTS = [
  {
    id: 1,
    name: "Deer™ Wood Contact Adhesive",
    brand: "Deer™ Brand",
    category: "Industrial",
    shortDescription: "High-strength contact adhesive for wood and laminates bonding.",
    fullDescription: "Deer™ Wood Contact Adhesive is a solvent-based neoprene contact adhesive formulated for bonding wood, laminates, and veneers. It forms an instant, durable bond on contact and is widely used in furniture manufacturing and interior fit-outs.",
    usage: "Apply evenly to both surfaces. Allow to dry for 5–10 minutes until tacky. Press surfaces firmly together. Full bond strength achieved within 24 hours.",
    imageUrl: "images/products/deer-wood-contact.jpg",
    status: "Available",
    industries: ["Carpentry", "Flooring"],
    surfaces: ["Wood", "Laminates"],
    features: ["Instant contact bond", "High solids content", "Excellent heat resistance", "Suitable for vertical surfaces"]
  },
  {
    id: 2,
    name: "Deer™ Neoprene Rubber Adhesive",
    brand: "Deer™ Brand",
    category: "Industrial",
    shortDescription: "Flexible neoprene adhesive for rubber, leather, and foam bonding.",
    fullDescription: "Deer™ Neoprene Rubber Adhesive provides a strong, flexible bond for rubber, leather, and foam materials. Ideal for automotive interiors, upholstery work, and soft furnishings requiring a pliable yet durable bond.",
    usage: "Clean surfaces thoroughly. Apply to both surfaces and allow to flash off for 5 minutes. Press together firmly.",
    imageUrl: "images/products/deer-neoprene.jpg",
    status: "Available",
    industries: ["Automotive", "Upholstery"],
    surfaces: ["Rubber", "Leather", "Foam & Sponge"],
    features: ["Flexible bond", "Resistant to vibration", "Good chemical resistance", "Suitable for curved surfaces"]
  },
  {
    id: 3,
    name: "Horsemen™ Industrial Spray Adhesive",
    brand: "Horsemen™ Brand",
    category: "Industrial",
    shortDescription: "Fast-tack spray adhesive for packaging, labels, and foam.",
    fullDescription: "Horsemen™ Industrial Spray Adhesive delivers a consistent, wide-coverage bond ideal for packaging lines, label application, and foam bonding. Its spray format allows fast, even application across large surface areas.",
    usage: "Shake can well. Hold 20–30 cm from surface and spray evenly. Bond immediately or allow to dry for repositionable tack.",
    imageUrl: "images/products/horsemen-spray.jpg",
    status: "Available",
    industries: ["Packaging", "Fashion"],
    surfaces: ["Paper", "Labels", "Foam & Sponge"],
    features: ["360° spray valve", "Repositionable or permanent bond", "Fast tack", "Low VOC formulation"]
  },
  {
    id: 4,
    name: "Horsemen™ Waterproof Tile Adhesive",
    brand: "Horsemen™ Brand",
    category: "Industrial",
    shortDescription: "Waterproof adhesive for tiles, stone, and ceramic surfaces.",
    fullDescription: "Horsemen™ Waterproof Tile Adhesive is a polymer-modified adhesive designed for fixing tiles, stone, and ceramics in wet areas including bathrooms, kitchens, and pools. Provides excellent water and mould resistance.",
    usage: "Mix with water to paste consistency. Apply with notched trowel. Press tiles firmly and allow 24 hours before grouting.",
    imageUrl: "images/products/horsemen-tile.jpg",
    status: "Available",
    industries: ["Plumbing & Sanitary", "Waterproof"],
    surfaces: ["Tiles", "Stone Ceramics", "Metal"],
    features: ["Waterproof formula", "Mould resistant", "Suitable for wet areas", "Non-slump on vertical surfaces"]
  },
  {
    id: 5,
    name: "Premier™ High Temperature Adhesive",
    brand: "Premier™ Brand",
    category: "Industrial",
    shortDescription: "Heat-resistant adhesive for automotive and insulation applications.",
    fullDescription: "Premier™ High Temperature Adhesive is engineered to maintain bond strength at elevated temperatures up to 200°C. Ideal for automotive engine bays, exhaust insulation, and industrial heat-shielding applications.",
    usage: "Apply to clean, dry surfaces. Allow 15 minutes open time. Cure under heat or at room temperature over 48 hours.",
    imageUrl: "images/products/premier-high-temp.jpg",
    status: "Available",
    industries: ["Automotive", "Insulation"],
    surfaces: ["Metal", "Fibreglass Wool"],
    features: ["Rated to 200°C", "Chemical resistant", "Non-corrosive", "Paintable after cure"]
  },
  {
    id: 6,
    name: "Premier™ Carpet & Turf Adhesive",
    brand: "Premier™ Brand",
    category: "Industrial",
    shortDescription: "Strong floor adhesive for carpet and artificial turf installation.",
    fullDescription: "Premier™ Carpet & Turf Adhesive is a high-tack, water-resistant adhesive for securing carpets and artificial turf to concrete, timber, and screed subfloors. Designed for commercial and residential flooring projects.",
    usage: "Apply to subfloor using a notched trowel. Lay carpet or turf within 20 minutes. Roll firmly with a 50 kg roller.",
    imageUrl: "images/products/premier-carpet.jpg",
    status: "Available",
    industries: ["Flooring"],
    surfaces: ["Carpet", "Turf"],
    features: ["High initial tack", "Water resistant", "Low odour", "Compatible with underfloor heating"]
  },
  {
    id: 7,
    name: "Premier™ Wallpaper Paste",
    brand: "Premier™ Brand",
    category: "Commercial",
    shortDescription: "Ready-mix paste for wallpaper and wall covering installation.",
    fullDescription: "Premier™ Wallpaper Paste is a smooth, non-staining adhesive suitable for all standard wallpapers and wall coverings including vinyl, fabric, and textured papers. Easy to apply and clean up.",
    usage: "Apply paste to back of wallpaper using a brush. Allow paper to soak for 3–5 minutes before hanging.",
    imageUrl: "images/products/premier-wallpaper.jpg",
    status: "Available",
    industries: ["Fashion"],
    surfaces: ["Wallpaper"],
    features: ["Ready to use", "Non-staining", "Suitable for all wallpaper types", "Easy water clean-up"]
  },
  {
    id: 8,
    name: "Rhino™ Heavy Duty Metal Adhesive",
    brand: "Rhino™ Brand",
    category: "Industrial",
    shortDescription: "Industrial-strength adhesive for metal, plastic, and composite bonding.",
    fullDescription: "Rhino™ Heavy Duty Metal Adhesive is a two-part epoxy system providing structural bond strength for metals, plastics, and composites. Used extensively in marine fabrication, lift and escalator maintenance, and heavy engineering.",
    usage: "Mix Part A and Part B in equal ratio. Apply to clean degreased surfaces. Clamp for 30 minutes. Full cure in 24 hours.",
    imageUrl: "images/products/rhino-metal.jpg",
    status: "Available",
    industries: ["Marine", "Lift & Escalator"],
    surfaces: ["Metal", "Plastics & Acrylics"],
    features: ["Two-part epoxy", "Structural bond strength", "Saltwater resistant", "Gap filling capability"]
  },
  {
    id: 9,
    name: "Rhino™ Marine Sealant",
    brand: "Rhino™ Brand",
    category: "Industrial",
    shortDescription: "Flexible marine-grade sealant for below and above waterline use.",
    fullDescription: "Rhino™ Marine Sealant is a polyurethane-based sealant designed for the marine environment. It bonds and seals metal, rubber, and plastic fittings both above and below the waterline. Resists fuel, oil, and saltwater.",
    usage: "Clean surfaces with solvent. Apply sealant with caulking gun. Tool to smooth finish within 15 minutes. Cure: 48 hours.",
    imageUrl: "images/products/rhino-marine.jpg",
    status: "Available",
    industries: ["Marine", "Waterproof"],
    surfaces: ["Metal", "Rubber"],
    features: ["Above and below waterline", "Fuel and oil resistant", "Permanently flexible", "Paintable after cure"]
  },
  {
    id: 10,
    name: "Deer™ Laminate Contact Adhesive",
    brand: "Deer™ Brand",
    category: "Industrial",
    shortDescription: "Premium contact adhesive for high-pressure laminates and veneers.",
    fullDescription: "Deer™ Laminate Contact Adhesive is a high-solids neoprene contact adhesive specifically formulated for bonding high-pressure laminates (HPL) to substrates including MDF, plywood, and particleboard. Provides a flat, bubble-free bond.",
    usage: "Apply to both surfaces with a roller or brush. Allow 10 minutes dry time. Align carefully and press from centre outward to eliminate air pockets.",
    imageUrl: "images/products/deer-laminate.jpg",
    status: "Available",
    industries: ["Carpentry"],
    surfaces: ["Laminates", "Wood"],
    features: ["High solids content", "Bubble-free bond", "Suitable for post-forming", "Fast setting"]
  },
  {
    id: 11,
    name: "Horsemen™ Foam Bond Adhesive",
    brand: "Horsemen™ Brand",
    category: "Industrial",
    shortDescription: "Specialist adhesive for bonding foam, sponge, and upholstery materials.",
    fullDescription: "Horsemen™ Foam Bond Adhesive is a solvent-based contact adhesive designed for bonding foam, sponge, and polyurethane materials used in upholstery, mattresses, and cushioning products. Maintains flexibility after cure.",
    usage: "Apply to both foam surfaces. Allow 5 minutes open time. Press surfaces together. Bond achieves full strength after 1 hour.",
    imageUrl: "images/products/horsemen-foam.jpg",
    status: "Available",
    industries: ["Upholstery", "Packaging"],
    surfaces: ["Foam & Sponge", "Leather"],
    features: ["Remains flexible", "No foam attack", "High coverage rate", "Suitable for all foam densities"]
  },
  {
    id: 12,
    name: "Rhino™ Cooling Tower Adhesive",
    brand: "Rhino™ Brand",
    category: "Industrial",
    shortDescription: "High-performance adhesive for cooling tower and HVAC insulation.",
    fullDescription: "Rhino™ Cooling Tower Adhesive is formulated for bonding fibreglass wool, rock wool, and metal components in cooling towers and HVAC systems. Resistant to constant moisture, heat cycling, and chemical exposure.",
    usage: "Apply to cleaned metal surface. Press fibreglass wool firmly. Allow 2 hours before exposure to water. Full cure: 72 hours.",
    imageUrl: "images/products/rhino-cooling.jpg",
    status: "Available",
    industries: ["Cooling Process", "Insulation"],
    surfaces: ["Fibreglass Wool", "Metal"],
    features: ["Moisture resistant", "Withstands heat cycling", "Non-corrosive to metal", "High peel strength"]
  }
];
```

- [ ] **Step 2: Verify data.js in browser console**

Open any `.html` file in a browser after adding a script tag pointing to `data.js`. In the console run:
```js
console.log(PRODUCTS.length); // expected: 12
console.log(BRANDS);          // expected: array of 4 brand strings
```

- [ ] **Step 3: Commit**

```bash
git add frontend/js/data.js
git commit -m "feat: add sample product data for products-admin"
```

---

## Task 2: Create `frontend/css/products.css` — Catalogue Styles

**Files:**
- Create: `frontend/css/products.css`

- [ ] **Step 1: Create the CSS directory and products.css**

```bash
mkdir -p frontend/css
```

Create `frontend/css/products.css`:

```css
/* ─── Variables ─────────────────────────────────────────────── */
:root {
  --red:       #CC2929;
  --red-dark:  #a82020;
  --dark:      #1a1a1a;
  --bg:        #f5f5f5;
  --card:      #ffffff;
  --border:    #e0e0e0;
  --text:      #222222;
  --muted:     #666666;
  --radius:    6px;
  --shadow:    0 2px 8px rgba(0,0,0,0.08);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  font-size: 16px;
  line-height: 1.5;
}

/* ─── Nav ────────────────────────────────────────────────────── */
.nav {
  background: var(--dark);
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 60px;
}

.nav-logo {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--red);
  text-decoration: none;
  letter-spacing: 0.5px;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
  list-style: none;
}

.nav-links a {
  color: #ccc;
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;
}

.nav-links a:hover { color: #fff; }

.nav-basket {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: #fff;
  text-decoration: none;
  font-size: 0.9rem;
  background: var(--red);
  padding: 0.4rem 0.9rem;
  border-radius: var(--radius);
  transition: background 0.2s;
}

.nav-basket:hover { background: var(--red-dark); }

.basket-count {
  background: #fff;
  color: var(--red);
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ─── Page Hero / Search ─────────────────────────────────────── */
.page-hero {
  background: var(--dark);
  color: #fff;
  padding: 2.5rem 2rem;
  text-align: center;
}

.page-hero h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.page-hero p {
  color: #aaa;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.search-bar {
  display: flex;
  max-width: 560px;
  margin: 0 auto;
  gap: 0;
}

.search-bar input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: var(--radius) 0 0 var(--radius);
  font-size: 1rem;
  outline: none;
}

.search-bar button {
  background: var(--red);
  color: #fff;
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: 0 var(--radius) var(--radius) 0;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}

.search-bar button:hover { background: var(--red-dark); }

/* ─── Layout: Sidebar + Grid ─────────────────────────────────── */
.catalogue-layout {
  display: flex;
  max-width: 1280px;
  margin: 2rem auto;
  padding: 0 1.5rem;
  gap: 2rem;
  align-items: flex-start;
}

/* ─── Filter Sidebar ──────────────────────────────────────────── */
.filter-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem;
}

.filter-sidebar h3 {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--muted);
  margin-bottom: 1rem;
}

.filter-group {
  margin-bottom: 1.5rem;
}

.filter-group h4 {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.6rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--border);
}

.filter-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text);
  padding: 0.2rem 0;
  cursor: pointer;
}

.filter-group input[type="checkbox"] {
  accent-color: var(--red);
  width: 15px;
  height: 15px;
  cursor: pointer;
}

.filter-clear {
  width: 100%;
  padding: 0.6rem;
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--muted);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 0.5rem;
}

.filter-clear:hover {
  border-color: var(--red);
  color: var(--red);
}

/* Mobile filter toggle */
.filter-toggle {
  display: none;
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 0.95rem;
  cursor: pointer;
  margin-bottom: 1rem;
  text-align: left;
  font-weight: 600;
}

/* ─── Product Grid ────────────────────────────────────────────── */
.product-grid-section {
  flex: 1;
}

.grid-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: var(--muted);
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

/* ─── Product Card ────────────────────────────────────────────── */
.product-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.2s, transform 0.2s;
}

.product-card:hover {
  box-shadow: var(--shadow);
  transform: translateY(-2px);
}

.product-card-image {
  width: 100%;
  height: 180px;
  object-fit: cover;
  background: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 0.8rem;
}

.product-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-card-body {
  padding: 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.brand-badge {
  display: inline-block;
  background: #fff0f0;
  color: var(--red);
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 3px;
  border: 1px solid #f5cccc;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.product-card-body h3 {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
  color: var(--text);
  line-height: 1.3;
}

.product-card-body p {
  font-size: 0.82rem;
  color: var(--muted);
  flex: 1;
  margin-bottom: 0.75rem;
  line-height: 1.4;
}

.product-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-bottom: 0.75rem;
}

.product-tag {
  font-size: 0.7rem;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--muted);
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
}

.product-card-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  text-decoration: none;
  text-align: center;
  display: inline-block;
}

.btn-primary {
  background: var(--red);
  color: #fff;
  flex: 1;
}

.btn-primary:hover { background: var(--red-dark); }

.btn-outline {
  background: none;
  border: 1px solid var(--border);
  color: var(--text);
  flex: 1;
}

.btn-outline:hover { border-color: var(--red); color: var(--red); }

.btn-added {
  background: #28a745;
  color: #fff;
}

/* ─── Empty State ─────────────────────────────────────────────── */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--muted);
  grid-column: 1 / -1;
}

.empty-state h3 { font-size: 1.1rem; margin-bottom: 0.5rem; }

/* ─── Toast Notification ──────────────────────────────────────── */
.toast {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  background: var(--dark);
  color: #fff;
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius);
  font-size: 0.875rem;
  z-index: 999;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.3s;
  pointer-events: none;
}

.toast.show {
  opacity: 1;
  transform: translateY(0);
}

/* ─── Product Detail Page ─────────────────────────────────────── */
.breadcrumb {
  max-width: 1280px;
  margin: 1.5rem auto 0;
  padding: 0 1.5rem;
  font-size: 0.85rem;
  color: var(--muted);
}

.breadcrumb a { color: var(--muted); text-decoration: none; }
.breadcrumb a:hover { color: var(--red); }
.breadcrumb span { margin: 0 0.4rem; }

.detail-layout {
  max-width: 1280px;
  margin: 1.5rem auto 3rem;
  padding: 0 1.5rem;
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 2.5rem;
  align-items: start;
}

.detail-image {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
}

.detail-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--radius);
}

.detail-info {}

.detail-info h1 {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0.5rem 0 0.75rem;
  line-height: 1.2;
}

.detail-info .short-desc {
  font-size: 1rem;
  color: var(--muted);
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.detail-section {
  margin-bottom: 1.25rem;
}

.detail-section h4 {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--muted);
  margin-bottom: 0.5rem;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.tag {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 0.8rem;
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius);
}

.features-list {
  list-style: none;
  padding: 0;
}

.features-list li {
  font-size: 0.9rem;
  padding: 0.3rem 0;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  color: var(--text);
}

.features-list li::before {
  content: "✓";
  color: var(--red);
  font-weight: 700;
  margin-top: 1px;
}

.detail-cta {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}

.btn-lg {
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
}

.detail-full-desc {
  max-width: 1280px;
  margin: 0 auto 2rem;
  padding: 0 1.5rem;
}

.detail-full-desc h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--red);
  display: inline-block;
}

.detail-full-desc p {
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--text);
  margin-bottom: 1rem;
}

.usage-box {
  background: var(--card);
  border-left: 4px solid var(--red);
  border-radius: 0 var(--radius) var(--radius) 0;
  padding: 1rem 1.25rem;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text);
  margin-top: 1rem;
}

.related-section {
  max-width: 1280px;
  margin: 0 auto 3rem;
  padding: 0 1.5rem;
}

.related-section h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 1.25rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

/* ─── Enquiry Basket Page ─────────────────────────────────────── */
.page-content {
  max-width: 900px;
  margin: 2rem auto 4rem;
  padding: 0 1.5rem;
}

.page-content h1 {
  font-size: 1.6rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.page-content .sub {
  color: var(--muted);
  font-size: 0.9rem;
  margin-bottom: 2rem;
}

.basket-list {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  margin-bottom: 2rem;
}

.basket-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}

.basket-item:last-child { border-bottom: none; }

.basket-item-info { flex: 1; }
.basket-item-info h4 { font-size: 0.95rem; margin-bottom: 0.2rem; }
.basket-item-info p { font-size: 0.8rem; color: var(--muted); }

.basket-remove {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0.25rem;
  border-radius: 3px;
  transition: color 0.2s;
}

.basket-remove:hover { color: var(--red); }

.basket-empty {
  text-align: center;
  padding: 3rem;
  color: var(--muted);
}

.enquiry-form {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem;
}

.enquiry-form h2 {
  font-size: 1.1rem;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
}

.form-group input,
.form-group textarea {
  padding: 0.65rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: var(--red);
}

.form-group textarea { resize: vertical; min-height: 100px; }

.form-submit {
  margin-top: 1.25rem;
}

.confirmation {
  text-align: center;
  padding: 3rem;
  display: none;
}

.confirmation h2 { color: #28a745; margin-bottom: 0.5rem; }
.confirmation p { color: var(--muted); }

/* ─── Footer ──────────────────────────────────────────────────── */
.footer {
  background: var(--dark);
  color: #aaa;
  text-align: center;
  padding: 1.5rem;
  font-size: 0.85rem;
  margin-top: auto;
}

/* ─── Responsive ──────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .product-grid { grid-template-columns: repeat(2, 1fr); }
  .related-grid { grid-template-columns: repeat(2, 1fr); }
  .detail-layout { grid-template-columns: 1fr; }
  .detail-image { max-height: 320px; }
}

@media (max-width: 768px) {
  .nav-links { display: none; }
  .catalogue-layout { flex-direction: column; padding: 0 1rem; }

  .filter-toggle { display: block; }

  .filter-sidebar {
    width: 100%;
    display: none;
  }

  .filter-sidebar.open { display: block; }

  .product-grid { grid-template-columns: 1fr; }
  .related-grid { grid-template-columns: repeat(2, 1fr); }

  .detail-cta { flex-direction: column; }
  .detail-cta .btn { width: 100%; text-align: center; }

  .form-row { grid-template-columns: 1fr; }

  .page-hero h1 { font-size: 1.4rem; }
}
```

- [ ] **Step 2: Verify CSS file exists**

```bash
ls frontend/css/products.css
```

- [ ] **Step 3: Commit**

```bash
git add frontend/css/products.css
git commit -m "feat: add products catalogue CSS"
```

---

## Task 3: Build `frontend/products.html` — Catalogue Page

**Files:**
- Modify: `frontend/products.html`

- [ ] **Step 1: Write products.html**

Replace the empty file with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Products | Yee Lim Adhesives Industries</title>
  <meta name="description" content="Browse Yee Lim's full range of industrial and commercial adhesives — Deer™, Horsemen™, Premier™, and Rhino™ brands. Filter by industry and surface.">
  <link rel="stylesheet" href="css/products.css">
</head>
<body>

<!-- Nav -->
<nav class="nav">
  <a href="home.html" class="nav-logo">YEE LIM</a>
  <ul class="nav-links">
    <li><a href="home.html">Home</a></li>
    <li><a href="products.html" style="color:#fff">Products</a></li>
    <li><a href="about.html">About</a></li>
    <li><a href="contact.html">Contact</a></li>
  </ul>
  <a href="enquiry.html" class="nav-basket">
    Enquiry Basket <span class="basket-count" id="basketCount">0</span>
  </a>
</nav>

<!-- Hero / Search -->
<section class="page-hero">
  <h1>Our Products</h1>
  <p>50+ years of adhesive expertise — find the right product for your application.</p>
  <div class="search-bar">
    <input type="text" id="searchInput" placeholder="Search by product name, industry, or surface…" autocomplete="off">
    <button onclick="applyFilters()">Search</button>
  </div>
</section>

<!-- Catalogue Layout -->
<div class="catalogue-layout">

  <!-- Mobile filter toggle -->
  <button class="filter-toggle" id="filterToggle" onclick="toggleFilterSidebar()">
    ☰ Filters
  </button>

  <!-- Filter Sidebar -->
  <aside class="filter-sidebar" id="filterSidebar">
    <h3>Filter Products</h3>

    <div class="filter-group">
      <h4>Brand</h4>
      <div id="brandFilters"></div>
    </div>

    <div class="filter-group">
      <h4>Industry</h4>
      <div id="industryFilters"></div>
    </div>

    <div class="filter-group">
      <h4>Surface</h4>
      <div id="surfaceFilters"></div>
    </div>

    <button class="filter-clear" onclick="clearFilters()">Clear All Filters</button>
  </aside>

  <!-- Product Grid -->
  <section class="product-grid-section">
    <div class="grid-meta">
      <span id="resultCount">Loading products…</span>
    </div>
    <div class="product-grid" id="productGrid"></div>
  </section>

</div>

<!-- Toast -->
<div class="toast" id="toast"></div>

<!-- Footer -->
<footer class="footer">
  <p>&copy; 2025 Yee Lim Adhesives Industries. All rights reserved. | 1 Ang Mo Kio Street 65, #03-17, Singapore 569063</p>
</footer>

<script src="js/data.js"></script>
<script src="js/products.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify HTML opens without errors**

Open `frontend/products.html` in a browser. The page should load the nav, hero, search bar, and filter sidebar skeleton. No JS errors in console yet (data.js and products.js are empty — that's Task 4).

- [ ] **Step 3: Commit**

```bash
git add frontend/products.html
git commit -m "feat: add products catalogue HTML structure"
```

---

## Task 4: Build `frontend/js/products.js` — Catalogue Logic

**Files:**
- Modify: `frontend/js/products.js`

- [ ] **Step 1: Write products.js**

Replace the empty file with:

```js
// ─── State ──────────────────────────────────────────────────────
let activeFilters = { brands: [], industries: [], surfaces: [] };

// ─── Init ────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  buildFilterCheckboxes();
  renderGrid(PRODUCTS);
  updateBasketCount();

  document.getElementById("searchInput").addEventListener("input", applyFilters);
});

// ─── Build filter sidebar checkboxes from data ───────────────────
function buildFilterCheckboxes() {
  buildCheckboxGroup("brandFilters", BRANDS, "brand");
  buildCheckboxGroup("industryFilters", INDUSTRIES, "industry");
  buildCheckboxGroup("surfaceFilters", SURFACES, "surface");
}

function buildCheckboxGroup(containerId, items, type) {
  const container = document.getElementById(containerId);
  container.innerHTML = items.map(item => `
    <label>
      <input type="checkbox" value="${item}" data-type="${type}" onchange="applyFilters()">
      ${item}
    </label>
  `).join("");
}

// ─── Apply search + filters ───────────────────────────────────────
function applyFilters() {
  const query = document.getElementById("searchInput").value.toLowerCase().trim();

  activeFilters = { brands: [], industries: [], surfaces: [] };
  document.querySelectorAll(".filter-sidebar input[type=checkbox]:checked").forEach(cb => {
    const type = cb.dataset.type;
    if (type === "brand") activeFilters.brands.push(cb.value);
    if (type === "industry") activeFilters.industries.push(cb.value);
    if (type === "surface") activeFilters.surfaces.push(cb.value);
  });

  let results = PRODUCTS.filter(p => {
    const matchesQuery = !query ||
      p.name.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query) ||
      p.shortDescription.toLowerCase().includes(query) ||
      p.industries.some(i => i.toLowerCase().includes(query)) ||
      p.surfaces.some(s => s.toLowerCase().includes(query));

    const matchesBrand = activeFilters.brands.length === 0 ||
      activeFilters.brands.includes(p.brand);

    const matchesIndustry = activeFilters.industries.length === 0 ||
      p.industries.some(i => activeFilters.industries.includes(i));

    const matchesSurface = activeFilters.surfaces.length === 0 ||
      p.surfaces.some(s => activeFilters.surfaces.includes(s));

    return matchesQuery && matchesBrand && matchesIndustry && matchesSurface;
  });

  renderGrid(results);
}

function clearFilters() {
  document.querySelectorAll(".filter-sidebar input[type=checkbox]").forEach(cb => cb.checked = false);
  document.getElementById("searchInput").value = "";
  activeFilters = { brands: [], industries: [], surfaces: [] };
  renderGrid(PRODUCTS);
}

// ─── Render product grid ──────────────────────────────────────────
function renderGrid(products) {
  const grid = document.getElementById("productGrid");
  const countEl = document.getElementById("resultCount");

  countEl.textContent = `${products.length} product${products.length !== 1 ? "s" : ""} found`;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>No products found</h3>
        <p>Try adjusting your search or filters.</p>
      </div>`;
    return;
  }

  grid.innerHTML = products.map(p => productCardHTML(p)).join("");
}

function productCardHTML(p) {
  const basket = getBasket();
  const inBasket = basket.includes(p.id);
  const industryTags = p.industries.slice(0, 2).map(i => `<span class="product-tag">${i}</span>`).join("");

  return `
    <div class="product-card">
      <div class="product-card-image">
        <img src="${p.imageUrl}" alt="${p.name}" onerror="this.parentElement.innerHTML='<span>No image</span>'">
      </div>
      <div class="product-card-body">
        <span class="brand-badge">${p.brand}</span>
        <h3>${p.name}</h3>
        <p>${p.shortDescription}</p>
        <div class="product-tags">${industryTags}</div>
        <div class="product-card-actions">
          <a href="product-detail.html?id=${p.id}" class="btn btn-outline">View Details</a>
          <button
            class="btn btn-primary ${inBasket ? 'btn-added' : ''}"
            id="addBtn${p.id}"
            onclick="toggleBasket(${p.id})"
          >${inBasket ? "✓ Added" : "Add to Enquiry"}</button>
        </div>
      </div>
    </div>`;
}

// ─── Filter sidebar mobile toggle ────────────────────────────────
function toggleFilterSidebar() {
  document.getElementById("filterSidebar").classList.toggle("open");
}

// ─── Enquiry basket (localStorage) ───────────────────────────────
function getBasket() {
  return JSON.parse(localStorage.getItem("enquiryBasket") || "[]");
}

function saveBasket(basket) {
  localStorage.setItem("enquiryBasket", JSON.stringify(basket));
  updateBasketCount();
}

function toggleBasket(productId) {
  const basket = getBasket();
  const idx = basket.indexOf(productId);

  if (idx === -1) {
    basket.push(productId);
    showToast("Added to enquiry basket");
  } else {
    basket.splice(idx, 1);
    showToast("Removed from basket");
  }

  saveBasket(basket);
  renderGrid(
    (() => {
      const query = document.getElementById("searchInput").value.toLowerCase().trim();
      return PRODUCTS.filter(p => {
        const matchesQuery = !query ||
          p.name.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query) ||
          p.industries.some(i => i.toLowerCase().includes(query)) ||
          p.surfaces.some(s => s.toLowerCase().includes(query));
        const matchesBrand = activeFilters.brands.length === 0 || activeFilters.brands.includes(p.brand);
        const matchesIndustry = activeFilters.industries.length === 0 || p.industries.some(i => activeFilters.industries.includes(i));
        const matchesSurface = activeFilters.surfaces.length === 0 || p.surfaces.some(s => activeFilters.surfaces.includes(s));
        return matchesQuery && matchesBrand && matchesIndustry && matchesSurface;
      });
    })()
  );
}

function updateBasketCount() {
  const count = getBasket().length;
  document.getElementById("basketCount").textContent = count;
}

// ─── Toast ────────────────────────────────────────────────────────
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}
```

- [ ] **Step 2: Verify in browser**

Open `frontend/products.html`. Expected:
- 12 product cards render in a 3-column grid
- Brand badges show in red
- Search input filters cards live as you type
- Brand/Industry/Surface checkboxes filter correctly
- "Add to Enquiry" button turns green and says "✓ Added" on click
- Basket count badge increments
- Toast notification appears bottom-right

- [ ] **Step 3: Commit**

```bash
git add frontend/js/products.js
git commit -m "feat: add products catalogue logic with search, filter, and basket"
```

---

## Task 5: Create `frontend/product-detail.html`

**Files:**
- Create: `frontend/product-detail.html`

- [ ] **Step 1: Write product-detail.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Detail | Yee Lim Adhesives Industries</title>
  <link rel="stylesheet" href="css/products.css">
</head>
<body>

<nav class="nav">
  <a href="home.html" class="nav-logo">YEE LIM</a>
  <ul class="nav-links">
    <li><a href="home.html">Home</a></li>
    <li><a href="products.html">Products</a></li>
    <li><a href="about.html">About</a></li>
    <li><a href="contact.html">Contact</a></li>
  </ul>
  <a href="enquiry.html" class="nav-basket">
    Enquiry Basket <span class="basket-count" id="basketCount">0</span>
  </a>
</nav>

<div class="breadcrumb" id="breadcrumb">
  <a href="home.html">Home</a>
  <span>›</span>
  <a href="products.html">Products</a>
  <span>›</span>
  <span id="breadcrumbProduct">Loading…</span>
</div>

<!-- Product Hero -->
<div class="detail-layout" id="detailLayout">
  <div class="detail-image" id="detailImage">Loading…</div>
  <div class="detail-info" id="detailInfo">Loading…</div>
</div>

<!-- Full Description + Usage -->
<div class="detail-full-desc" id="detailFullDesc"></div>

<!-- Related Products -->
<div class="related-section" id="relatedSection" style="display:none">
  <h3>Related Products</h3>
  <div class="related-grid" id="relatedGrid"></div>
</div>

<div class="toast" id="toast"></div>

<footer class="footer">
  <p>&copy; 2025 Yee Lim Adhesives Industries. All rights reserved.</p>
</footer>

<script src="js/data.js"></script>
<script src="js/product-detail.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/product-detail.html
git commit -m "feat: add product detail HTML"
```

---

## Task 6: Create `frontend/js/product-detail.js`

**Files:**
- Create: `frontend/js/product-detail.js`

- [ ] **Step 1: Write product-detail.js**

```js
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
         onerror="this.parentElement.innerHTML='<span style=padding:2rem;color:#aaa>No image available</span>'">
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
        class="btn btn-primary btn-lg ${inBasket ? 'btn-added' : ''}"
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

  const section = document.getElementById("relatedSection");
  section.style.display = "block";
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
  document.getElementById("basketCount").textContent = getBasket().length;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}
```

- [ ] **Step 2: Verify in browser**

Open `frontend/products.html`, click "View Details" on any product card. Expected:
- URL changes to `product-detail.html?id=1` (or whichever id)
- Product name, brand badge, description, surfaces, industries, features all render
- "Add to Enquiry Basket" works and turns green
- Related products show below
- Breadcrumb shows correct product name

- [ ] **Step 3: Commit**

```bash
git add frontend/product-detail.html frontend/js/product-detail.js
git commit -m "feat: add product detail page with related products and basket"
```

---

## Task 7: Build `frontend/admin_login.html` + `frontend/js/login.js`

**Files:**
- Modify: `frontend/admin_login.html`
- Modify: `frontend/js/login.js`

- [ ] **Step 1: Write admin_login.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Login | Yee Lim Adhesives</title>
  <link rel="stylesheet" href="css/admin.css">
</head>
<body class="login-body">

  <div class="login-card">
    <div class="login-logo">YEE LIM</div>
    <h1>Admin Login</h1>
    <p class="login-sub">Sign in to manage your product catalogue.</p>

    <div class="alert alert-error" id="loginError" style="display:none"></div>

    <form id="loginForm" onsubmit="handleLogin(event)">
      <div class="form-group">
        <label for="username">Username</label>
        <input type="text" id="username" name="username" required autocomplete="username">
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required autocomplete="current-password">
      </div>
      <button type="submit" class="btn-login" id="loginBtn">Sign In</button>
    </form>
  </div>

  <script src="js/data.js"></script>
  <script src="js/login.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write login.js**

```js
// API_BASE_URL is defined in data.js — do not redeclare here

document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("adminToken")) {
    window.location.href = "admin_dashboard.html";
  }
});

async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const btn = document.getElementById("loginBtn");
  const errorEl = document.getElementById("loginError");

  btn.textContent = "Signing in…";
  btn.disabled = true;
  errorEl.style.display = "none";

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Invalid username or password.");
    }

    localStorage.setItem("adminToken", data.token);
    window.location.href = "admin_dashboard.html";

  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = "block";
    btn.textContent = "Sign In";
    btn.disabled = false;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/admin_login.html frontend/js/login.js
git commit -m "feat: add admin login page with API auth"
```

---

## Task 8: Create `frontend/css/admin.css`

**Files:**
- Create: `frontend/css/admin.css`

- [ ] **Step 1: Write admin.css**

```css
:root {
  --red:      #CC2929;
  --red-dark: #a82020;
  --dark:     #1a1a1a;
  --bg:       #f0f2f5;
  --card:     #ffffff;
  --border:   #e0e0e0;
  --text:     #222222;
  --muted:    #666666;
  --radius:   6px;
  --shadow:   0 2px 8px rgba(0,0,0,0.08);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  font-size: 15px;
}

/* ─── Login Page ─────────────────────────────────────────────── */
.login-body {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--dark);
}

.login-card {
  background: var(--card);
  border-radius: var(--radius);
  padding: 2.5rem;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}

.login-logo {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--red);
  letter-spacing: 1px;
  margin-bottom: 1rem;
}

.login-card h1 {
  font-size: 1.4rem;
  margin-bottom: 0.25rem;
}

.login-sub {
  color: var(--muted);
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 0.65rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 0.9rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: var(--red);
}

.form-group textarea { resize: vertical; min-height: 80px; }

.btn-login {
  width: 100%;
  padding: 0.75rem;
  background: var(--red);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: background 0.2s;
}

.btn-login:hover { background: var(--red-dark); }
.btn-login:disabled { background: #999; cursor: not-allowed; }

.alert {
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.alert-error { background: #fff0f0; border: 1px solid #f5cccc; color: #a82020; }
.alert-success { background: #f0fff4; border: 1px solid #b2dfdb; color: #2e7d32; }

/* ─── Dashboard Layout ───────────────────────────────────────── */
.admin-layout {
  display: flex;
  min-height: 100vh;
}

.admin-sidebar {
  width: 220px;
  background: var(--dark);
  color: #fff;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 0;
}

.admin-sidebar-logo {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--red);
  padding: 0 1.25rem 1.5rem;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #333;
}

.admin-nav {
  list-style: none;
  padding: 1rem 0;
  flex: 1;
}

.admin-nav li a {
  display: block;
  padding: 0.65rem 1.25rem;
  color: #aaa;
  text-decoration: none;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.admin-nav li a:hover,
.admin-nav li a.active {
  color: #fff;
  background: rgba(255,255,255,0.07);
}

.admin-sidebar-footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid #333;
}

.btn-logout {
  width: 100%;
  padding: 0.6rem;
  background: none;
  border: 1px solid #444;
  color: #aaa;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-logout:hover { border-color: var(--red); color: var(--red); }

/* ─── Dashboard Main ─────────────────────────────────────────── */
.admin-main {
  flex: 1;
  overflow: auto;
  padding: 2rem;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.admin-header h1 {
  font-size: 1.4rem;
  font-weight: 700;
}

.btn {
  padding: 0.55rem 1rem;
  border-radius: var(--radius);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.btn-primary { background: var(--red); color: #fff; }
.btn-primary:hover { background: var(--red-dark); }

.btn-outline {
  background: none;
  border: 1px solid var(--border);
  color: var(--text);
}

.btn-outline:hover { border-color: var(--red); color: var(--red); }

.btn-danger { background: none; border: 1px solid #f5cccc; color: #a82020; }
.btn-danger:hover { background: #fff0f0; }

/* ─── Product Table ──────────────────────────────────────────── */
.admin-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
}

.admin-card-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.admin-card-header h2 { font-size: 1rem; font-weight: 600; }

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  text-align: left;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--muted);
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--border);
  background: #fafafa;
}

td {
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.875rem;
  vertical-align: middle;
}

tr:last-child td { border-bottom: none; }
tr:hover td { background: #fafafa; }

.status-badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.status-available { background: #e8f5e9; color: #2e7d32; }
.status-unavailable { background: #fff0f0; color: #a82020; }

.table-actions { display: flex; gap: 0.4rem; }

/* ─── Modal ──────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  display: none;
}

.modal-overlay.open { display: flex; }

.modal {
  background: var(--card);
  border-radius: var(--radius);
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 16px 48px rgba(0,0,0,0.25);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 { font-size: 1rem; font-weight: 700; }

.modal-close {
  background: none;
  border: none;
  font-size: 1.3rem;
  cursor: pointer;
  color: var(--muted);
  line-height: 1;
}

.modal-close:hover { color: var(--text); }

.modal-body { padding: 1.5rem; }

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.loading-row td {
  text-align: center;
  color: var(--muted);
  padding: 3rem;
}

@media (max-width: 768px) {
  .admin-sidebar { display: none; }
  .admin-main { padding: 1rem; }
  .form-row-2 { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/css/admin.css
git commit -m "feat: add admin panel CSS"
```

---

## Task 9: Build `frontend/admin_dashboard.html` + `frontend/js/admin.js`

**Files:**
- Modify: `frontend/admin_dashboard.html`
- Modify: `frontend/js/admin.js`

- [ ] **Step 1: Write admin_dashboard.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard | Yee Lim Adhesives</title>
  <link rel="stylesheet" href="css/admin.css">
</head>
<body>

<div class="admin-layout">

  <!-- Sidebar -->
  <aside class="admin-sidebar">
    <div class="admin-sidebar-logo">YEE LIM ADMIN</div>
    <ul class="admin-nav">
      <li><a href="#" class="active">📦 Products</a></li>
    </ul>
    <div class="admin-sidebar-footer">
      <button class="btn-logout" onclick="logout()">Sign Out</button>
    </div>
  </aside>

  <!-- Main -->
  <main class="admin-main">
    <div class="admin-header">
      <h1>Products</h1>
      <button class="btn btn-primary" onclick="openAddModal()">+ Add Product</button>
    </div>

    <div class="alert alert-error" id="pageError" style="display:none"></div>

    <div class="admin-card">
      <div class="admin-card-header">
        <h2>All Products</h2>
        <span id="productCount" style="font-size:0.85rem;color:#666"></span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="productTableBody">
          <tr class="loading-row"><td colspan="4">Loading products…</td></tr>
        </tbody>
      </table>
    </div>
  </main>
</div>

<!-- Add / Edit Modal -->
<div class="modal-overlay" id="productModal">
  <div class="modal">
    <div class="modal-header">
      <h2 id="modalTitle">Add Product</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="alert alert-error" id="modalError" style="display:none"></div>

      <input type="hidden" id="editingId">

      <div class="form-row-2">
        <div class="form-group">
          <label for="fieldName">Product Name *</label>
          <input type="text" id="fieldName" required>
        </div>
        <div class="form-group">
          <label for="fieldCategory">Category *</label>
          <select id="fieldCategory">
            <option value="Industrial">Industrial</option>
            <option value="Commercial">Commercial</option>
            <option value="Others">Others</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label for="fieldShortDesc">Short Description *</label>
        <input type="text" id="fieldShortDesc" required>
      </div>

      <div class="form-group">
        <label for="fieldFullDesc">Full Description</label>
        <textarea id="fieldFullDesc" rows="4"></textarea>
      </div>

      <div class="form-group">
        <label for="fieldUsage">How to Use</label>
        <textarea id="fieldUsage" rows="3"></textarea>
      </div>

      <div class="form-row-2">
        <div class="form-group">
          <label for="fieldImageUrl">Image URL</label>
          <input type="text" id="fieldImageUrl" placeholder="images/products/name.jpg">
        </div>
        <div class="form-group">
          <label for="fieldStatus">Status</label>
          <select id="fieldStatus">
            <option value="Available">Available</option>
            <option value="Unavailable">Unavailable</option>
          </select>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="saveBtn" onclick="saveProduct()">Save Product</button>
    </div>
  </div>
</div>

<!-- Delete Confirm Modal -->
<div class="modal-overlay" id="deleteModal">
  <div class="modal" style="max-width:400px">
    <div class="modal-header">
      <h2>Delete Product</h2>
      <button class="modal-close" onclick="closeDeleteModal()">✕</button>
    </div>
    <div class="modal-body">
      <p>Are you sure you want to delete <strong id="deleteProductName"></strong>? This cannot be undone.</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeDeleteModal()">Cancel</button>
      <button class="btn btn-danger" id="confirmDeleteBtn" onclick="confirmDelete()">Delete</button>
    </div>
  </div>
</div>

<script src="js/data.js"></script>
<script src="js/admin.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write admin.js**

```js
// API_BASE_URL is defined in data.js — do not redeclare here
let deletingId = null;
let allProducts = [];  // cache for edit lookups

// ─── Auth guard ───────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("adminToken");
  if (!token) { window.location.href = "admin_login.html"; return; }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Unauthorized");
    loadProducts();
  } catch {
    localStorage.removeItem("adminToken");
    window.location.href = "admin_login.html";
  }
});

function getToken() { return localStorage.getItem("adminToken"); }

function logout() {
  localStorage.removeItem("adminToken");
  window.location.href = "admin_login.html";
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
    allProducts = products;  // cache for edit lookups

    countEl.textContent = `${products.length} product${products.length !== 1 ? "s" : ""}`;

    if (products.length === 0) {
      tbody.innerHTML = '<tr class="loading-row"><td colspan="4">No products yet. Add one above.</td></tr>';
      return;
    }

    tbody.innerHTML = products.map(p => `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td>${p.category}</td>
        <td><span class="status-badge status-${p.status === "Available" ? "available" : "unavailable"}">${p.status}</span></td>
        <td>
          <div class="table-actions">
            <button class="btn btn-outline" onclick="openEditModal('${p._id}')">Edit</button>
            <button class="btn btn-danger" onclick="openDeleteModal('${p._id}', '${p.name.replace(/'/g, "\\'")}')">Delete</button>
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
```

- [ ] **Step 3: Verify in browser**

Open `frontend/admin_login.html`. Expected:
- Login form shows with Yee Lim branding
- With backend running: enter `admin` / `[local admin test password redacted]` → redirects to dashboard
- Dashboard shows product table loaded from API
- Add Product button opens modal — fill form and save → row appears in table
- Edit button pre-fills modal with existing data
- Delete button shows confirm dialog → deletes from API
- Sign Out clears token and redirects to login
- Without backend: login shows error message gracefully

- [ ] **Step 4: Commit**

```bash
git add frontend/admin_dashboard.html frontend/js/admin.js
git commit -m "feat: add admin dashboard with full product CRUD"
```

---

## Task 10: Create `frontend/enquiry.html` — Enquiry Basket

**Files:**
- Create: `frontend/enquiry.html`

- [ ] **Step 1: Write enquiry.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Enquiry Basket | Yee Lim Adhesives Industries</title>
  <link rel="stylesheet" href="css/products.css">
</head>
<body>

<nav class="nav">
  <a href="home.html" class="nav-logo">YEE LIM</a>
  <ul class="nav-links">
    <li><a href="home.html">Home</a></li>
    <li><a href="products.html">Products</a></li>
    <li><a href="about.html">About</a></li>
    <li><a href="contact.html">Contact</a></li>
  </ul>
  <a href="enquiry.html" class="nav-basket" style="background:#333">
    Enquiry Basket <span class="basket-count" id="basketCount">0</span>
  </a>
</nav>

<div class="page-content">
  <h1>Enquiry Basket</h1>
  <p class="sub">Review your selected products and submit an enquiry to our sales team.</p>

  <!-- Basket product list -->
  <div id="basketSection">
    <div class="basket-list" id="basketList"></div>
    <a href="products.html" id="continueLink" style="display:inline-block;margin-bottom:1.5rem;font-size:0.875rem;color:#CC2929;text-decoration:none">← Continue browsing products</a>
  </div>

  <!-- Enquiry form -->
  <div class="enquiry-form" id="enquiryFormSection" style="display:none">
    <h2>Submit Your Enquiry</h2>

    <div id="selectedProductsDisplay" style="margin-bottom:1.25rem;font-size:0.85rem;color:#666;background:#f5f5f5;padding:0.75rem;border-radius:6px;"></div>

    <div class="form-row">
      <div class="form-group">
        <label for="eName">Full Name *</label>
        <input type="text" id="eName" required>
      </div>
      <div class="form-group">
        <label for="eCompany">Company Name *</label>
        <input type="text" id="eCompany" required>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="eEmail">Email Address *</label>
        <input type="email" id="eEmail" required>
      </div>
      <div class="form-group">
        <label for="ePhone">Phone Number</label>
        <input type="tel" id="ePhone">
      </div>
    </div>
    <div class="form-group">
      <label for="eMessage">Message / Requirements</label>
      <textarea id="eMessage" placeholder="Tell us about your project, quantity needed, or any specific requirements…"></textarea>
    </div>
    <div class="form-submit">
      <button class="btn btn-primary" style="padding:0.75rem 2rem;font-size:1rem" onclick="submitEnquiry()">Submit Enquiry</button>
    </div>
  </div>

  <!-- Confirmation -->
  <div class="confirmation" id="confirmation">
    <h2>✓ Enquiry Submitted</h2>
    <p>Thank you for your enquiry. Our team will get back to you within 1–2 business days.</p>
    <a href="products.html" class="btn btn-primary" style="margin-top:1.5rem;padding:0.75rem 1.5rem">Browse More Products</a>
  </div>
</div>

<footer class="footer">
  <p>&copy; 2025 Yee Lim Adhesives Industries. All rights reserved.</p>
</footer>

<script src="js/data.js"></script>
<script>
document.addEventListener("DOMContentLoaded", renderBasket);

function getBasket() {
  return JSON.parse(localStorage.getItem("enquiryBasket") || "[]");
}

function saveBasket(basket) {
  localStorage.setItem("enquiryBasket", JSON.stringify(basket));
  updateBasketCount();
}

function updateBasketCount() {
  document.getElementById("basketCount").textContent = getBasket().length;
}

function renderBasket() {
  const ids = getBasket();
  updateBasketCount();

  const products = ids.map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean);
  const list = document.getElementById("basketList");
  const formSection = document.getElementById("enquiryFormSection");
  const selectedDisplay = document.getElementById("selectedProductsDisplay");

  if (products.length === 0) {
    list.innerHTML = `
      <div class="basket-empty">
        <p>Your enquiry basket is empty.</p>
        <a href="products.html" class="btn btn-primary" style="margin-top:1rem;padding:0.65rem 1.25rem">Browse Products</a>
      </div>`;
    formSection.style.display = "none";
    return;
  }

  list.innerHTML = products.map(p => `
    <div class="basket-item">
      <div class="basket-item-info">
        <h4>${p.name}</h4>
        <p>${p.brand} · ${p.shortDescription.substring(0, 70)}…</p>
      </div>
      <button class="basket-remove" onclick="removeFromBasket(${p.id})" title="Remove">✕</button>
    </div>
  `).join("");

  formSection.style.display = "block";
  selectedDisplay.textContent = `Selected products: ${products.map(p => p.name).join(", ")}`;
}

function removeFromBasket(id) {
  const basket = getBasket().filter(i => i !== id);
  saveBasket(basket);
  renderBasket();
}

function submitEnquiry() {
  const name = document.getElementById("eName").value.trim();
  const company = document.getElementById("eCompany").value.trim();
  const email = document.getElementById("eEmail").value.trim();

  if (!name || !company || !email) {
    alert("Please fill in your name, company, and email address.");
    return;
  }

  localStorage.removeItem("enquiryBasket");

  document.getElementById("basketSection").style.display = "none";
  document.getElementById("enquiryFormSection").style.display = "none";
  document.getElementById("confirmation").style.display = "block";
  document.getElementById("basketCount").textContent = "0";
}
</script>
</body>
</html>
```

- [ ] **Step 2: Verify in browser**

Open `frontend/products.html`, add 2–3 products to basket, then click "Enquiry Basket" in nav. Expected:
- Products listed with remove buttons
- Removing a product updates the list and nav badge
- Enquiry form shows below with product names pre-listed
- Submitting with valid name/company/email shows confirmation screen
- Basket is cleared after submission

- [ ] **Step 3: Final commit**

```bash
git add frontend/enquiry.html
git commit -m "feat: add enquiry basket page with submission flow"
```

---

## Task 11: Create `images/products/` placeholder and final check

**Files:**
- Create: `frontend/images/products/.gitkeep`

- [ ] **Step 1: Create the images directory**

```bash
mkdir -p frontend/images/products
touch frontend/images/products/.gitkeep
```

- [ ] **Step 2: End-to-end walkthrough**

Open `frontend/products.html` and verify the full user journey:

1. Products catalogue loads with 12 cards
2. Search for "wood" — only Deer™ wood products show
3. Check "Rhino™ Brand" filter — only Rhino products show
4. Clear filters — all 12 return
5. Click "View Details" on a card — detail page loads with correct product
6. Click "Add to Enquiry Basket" on detail page — count badge increments
7. Click "Enquiry Basket" in nav — basket page lists the product
8. Fill in name/company/email and submit — confirmation shows
9. Navigate to `admin_login.html` — login form loads
10. (With backend running) log in — redirected to dashboard with product table

- [ ] **Step 3: Final commit**

```bash
git add frontend/images/products/.gitkeep
git commit -m "feat: complete products-admin feature — catalogue, detail, admin, enquiry basket"
```
