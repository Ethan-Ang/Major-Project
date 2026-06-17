# Admin Redesign + Enquiry Flow — Design Spec
**Date:** 2026-06-12
**Branch:** `products-admin`
**Status:** approved (v3 dashboard direction + DB-and-email enquiry flow)

---

## Goal

Two linked pieces of work:

1. **Redesign the admin** so it stops feeling "AI plain." Approved direction = a richer
   **dashboard command-center** (v3 mockup), not a bare CRUD table. Cohesive with the public
   B2B site (Space Grotesk + Inter, red `#CC2929` + ink, sidebar dot-grid) but with real
   depth, KPIs, a chart, and leads surfaced up front.
2. **Build the enquiry flow for real.** Today it is fake end-to-end: the public form posts
   nowhere, and the admin inbox shows hardcoded sample data.

Approved reference mockup: `frontend/admin/_admin_mockup_v3.html` (throwaway, delete before final commit).

---

## Enquiry flow (approved: DB + email)

```
Customer submits enquiry (enquiry.html)
        │  POST /api/enquiries.php
        ▼
   1. INSERT into `enquiries`  ← always first; the system of record
        │
        ▼
   2. Email the sales mailbox  ← best-effort notification, must never block/lose a save
        │
        ▼
Admin Overview + Enquiries inbox read from the DB (GET /api/enquiries.php)
Owner can act entirely from the email (full details + one-tap reply); the admin is the
searchable archive, not a second inbox they must watch.
```

**Save-first ordering is mandatory** — a flaky shared-host mailer can never cause a lost lead.

**Email transport (sub-decision, deferred):** start with PHP `mail()` for the demo; note that
Vodien shared hosting often flags it as spam. Production-better path is authenticated SMTP from a
real `@yeelimadhesives.com` mailbox via PHPMailer. Config keys live in gitignored `config.php`
(e.g. `ENQUIRY_NOTIFY_TO`, optional SMTP settings).

---

## `enquiries` table (to add to schema.sql + migrate locally and on live)

```sql
CREATE TABLE enquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  message TEXT,
  products JSON,                       -- array of product names enquired about
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_enquiries_created (created_at)
);
```

## `api/enquiries.php` (new; mirrors products.php conventions: PDO, prepared statements)

- `POST` (public) — validate name+email, sanitize, INSERT, then attempt email notification,
  return `201 {id}`. Email failure is swallowed (logged) so the save still succeeds.
- `GET` (admin) — return all enquiries newest-first, shaped to match what `enquiries.js`
  already consumes: `{id, name, company, email, phone, message, products[], date, is_read}`
  (`date` = `created_at`).
- `PATCH`/`POST ?action=read` — set `is_read` (moves read state off per-browser localStorage).
- Auth note: existing `products.php` does not verify the bearer token server-side; match that
  convention for now (loose), and record it as a known gap rather than silently diverging.

---

## Admin page structure

Public site already owns `products.html`, so the admin keeps its own filenames under `admin/`:

| File | Role | Change |
|---|---|---|
| `admin/dashboard.html` | **Overview home** (new centerpiece) | was the product table → becomes KPIs + chart + recent leads |
| `admin/products.html` (new) | Products management table | the current dashboard table markup moves here |
| `admin/enquiries.html` | Enquiries inbox | restyled; reads real DB data + DB read-state |
| `admin/login.html` | Login | restyled to match |
| `admin/admin.js` | drives the products table | retarget to products.html |
| `admin/overview.js` (new) | populates the Overview from products.php + enquiries.php | new |

- `login.js` redirect target → `dashboard.html` (the Overview).
- Nav (sidebar) gains **Overview / Products / Enquiries**; Enquiries shows an unread badge.

---

## Design system (port from public `css/products.css` into `admin.css`)

- Fonts: `@import` Space Grotesk + Inter; kill the `-apple-system` system stack (the #1 "AI" tell).
- Keep brand red `#CC2929` + ink `#0e1116`; add depth the public site doesn't need but a
  dashboard does: layered shadows, ~12px card radius, faint card gradients, gradient sidebar,
  sparklines, an SVG area chart with red gradient fill.
- Supporting colour (green/amber) used **only** where data needs it (deltas, status), never
  decoratively — that restraint is what keeps it from looking like a generic template.

---

## Build order

1. Design-system foundation in `admin.css`.
2. Overview home (`dashboard.html` + `overview.js`) — show real running page.
3. Enquiries backend (`enquiries.php`, `enquiries` table, schema.sql, local migrate).
4. Wire public `enquiry.html` form + email notification.
5. Products page (`products.html`) redesign + retarget `admin.js`.
6. Enquiries inbox + Login restyle; move read-state to DB.
7. Verify every page + the full submit→DB→inbox→email loop on the local server.

## Out of scope / deferred

- Production SMTP setup (demo uses `mail()`).
- Removing the dead Node `backend/`.
- Live cPanel deployment of the new endpoint + table (do after local verification).
