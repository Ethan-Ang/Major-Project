# Yee Lim Adhesives - cPanel Deployment Guide

This is the step-by-step guide for deploying the static frontend + PHP API to the
Vodien cPanel host (`public_html/`). It is the canonical deployment reference; the
dated note in `docs/superpowers/handoff/` is the per-session sync log.

The stack is plain static HTML/CSS/JS plus PHP APIs backed by MySQL. There is no
build step, no Node runtime, and no framework. Do not introduce one.

> Safety: never commit or upload `frontend/api/config.php` (it holds live secrets).
> Never print real DB/cPanel/FTP passwords or API keys. Do not drop tables or run
> destructive SQL on the live database.

---

## 1. What goes where

Upload the **contents of `frontend/`** into `public_html/`, not the `frontend`
folder itself. After upload the live tree should look like:

```
public_html/
  index.html  products.html  product-detail.html  compare.html  enquiry.html
  about.html  contact.html
  admin/      css/   images/   js/
  api/        (PHP endpoints)
  .htaccess   (from frontend/.htaccess)
```

New files since the last live sync that MUST be present (a full re-upload covers
them, but verify these specifically):

- `css/dropdown-ui.css`
- `js/widgets/custom-select.js`
- `js/widgets/footer.js`, `js/widgets/chatbot.js`
- `api/auth.php`, `api/advisor.php`
- `admin/products.html`, `admin/overview.js`
- `.htaccess`

## 2. What must NOT be uploaded

Do not upload any of these to `public_html/`:

- `frontend/api/config.php` (live secrets; create/maintain it by hand on the server, see section 4)
- `.git/`, `.gitignore`
- `.claude/`, `.agents/`, `.superpowers/`
- `qa/`, `screenshots/`, `node_modules/`
- `backend/` (legacy Node/Express + MongoDB prototype, superseded by the PHP API; not used in production)
- `database/` SQL files (import them through phpMyAdmin instead, section 5; they should not sit in the web root)
- `DESIGN.md`, `PRODUCT.md`, `DEPLOYMENT_CPANEL.md`, `docs/` (internal docs)
- `config.example.php` is a template only. It is safe (no secrets) but optional to upload.

## 3. Required PHP environment

On cPanel (MultiPHP / Select PHP Version) confirm PHP 8.0+ with these extensions
enabled:

- `pdo_mysql` (database access)
- `mbstring` (advisor text handling)
- `curl` (advisor LLM calls; harmless if the advisor stays on the free fallback)
- `json` (bundled in modern PHP, confirm it is on)

Outbound HTTPS must be allowed for the optional AI advisor. Email uses PHP `mail()`.

## 4. Live config.php (created by hand on the server)

`config.php` lives only on the server and is gitignored. On a fresh server, copy
`config.example.php` to `config.php` and fill in real values. On an existing
server, do NOT overwrite it; only ADD the new `define()` lines below.

Required (database):

```php
define("DB_HOST", "localhost");
define("DB_NAME", "yeelimad_website");   // real cPanel DB name (usually prefixed, e.g. acct_yeelimad_website)
define("DB_USER", "...");                // real cPanel DB user
define("DB_PASS", "...");                // real cPanel DB password
```

Recommended (enquiry email notification) - use the address the client gave us:

```php
define("ENQUIRY_NOTIFY_TO", "contact@yeelimadhesives.com.sg"); // new leads are emailed here
define("ENQUIRY_FROM",      "no-reply@yeelimadhesives.com.sg"); // a real mailbox on the domain = best deliverability
define("SITE_URL",          "https://yeelimadhesives.com.sg");  // live URL, used for the "Mark as replied" email link
```

Enquiries are ALWAYS saved to the database. The email is a best-effort extra: if
it fails or `ENQUIRY_NOTIFY_TO` is unset, the lead is still safely stored and shows
up in the admin Enquiries inbox.

Optional (AI Product Advisor). Leave these out to use the free, built-in catalogue
matcher (the chatbot still works, just less conversational). To enable a real LLM,
set ONE provider (Gemini has a free tier). See `config.example.php` for the exact
lines for Gemini / OpenAI / Groq / Anthropic. The key stays on the server and is
never sent to the browser.

## 5. Database setup

The live `admins`, `admin_tokens`, and `products` tables already exist from the
prior sync. The only likely delta is the `enquiries` table.

1. **Back up first.** In phpMyAdmin, Export the whole `yeelimad_website` database
   before changing anything.
2. **Check the `enquiries` table** structure against `database/schema.sql`. The
   current code needs these columns: `id, name, company, email, phone, message,
   products (JSON), reply_token, replied (TINYINT default 0), created_at`.
   - If `enquiries` does not exist: run the `CREATE TABLE enquiries (...)` block
     from `database/schema.sql`.
   - If it exists with OLD columns (for example `is_read` instead of `replied`):
     do NOT drop it if it holds real leads. Add the missing columns with
     `ALTER TABLE` and migrate. Confirm the exact change before running it.
3. `database/seed_products.sql` is only for first-time seeding. Do NOT re-run it on
   a live DB that already has products (it would duplicate rows).

### SDS / TDS document columns (run once if missing)

The product documents feature needs two optional columns on `products`. On a fresh
import from `database/schema.sql` they already exist. On an EXISTING live DB from a
prior sync, add them once. First check whether they exist (phpMyAdmin > products >
Structure, or `SHOW COLUMNS FROM products;`). Only if `sds_url` / `tds_url` are NOT
present, run:

```sql
ALTER TABLE products
  ADD COLUMN sds_url VARCHAR(255) NULL AFTER images,
  ADD COLUMN tds_url VARCHAR(255) NULL AFTER sds_url;
```

This is additive and non-destructive (no data is changed or dropped). Existing
products simply get NULL document links until an admin adds them. Run it once only.

### Create or reset an admin user

Admin login checks `admins.password_hash` with PHP `password_verify`, so the
password must be stored as a bcrypt hash, never plain text. Generate a hash on the
server (cPanel Terminal or a throwaway PHP file you delete afterwards):

```php
<?php echo password_hash("the-real-admin-password", PASSWORD_DEFAULT), "\n";
```

Then in phpMyAdmin:

```sql
INSERT INTO admins (username, password_hash) VALUES ('admin', '<paste-the-hash>');
```

Delete the throwaway hashing script immediately after use. Do not commit the
password or the hash.

## 6. Deploy order of operations

1. Back up live `public_html/` (File Manager > Compress) and the DB (phpMyAdmin > Export).
2. Apply DB changes from section 5 (check structure first): the `enquiries` table if
   needed, and the one-time SDS/TDS `ALTER TABLE` if `sds_url` / `tds_url` are missing.
3. Upload the changed `frontend/` contents to `public_html/` (skip `config.php`).
4. Create or hand-edit `public_html/api/config.php` with the values in section 4.
5. If using relative document paths, create `public_html/uploads/documents/` and
   upload the PDF data sheets there. Admins then paste `uploads/documents/<file>.pdf`
   (or a full URL) into each product's SDS/TDS field. Products with blank fields
   show no download section.
6. Run the smoke test in section 7.

## 7. Post-deploy smoke test

- [ ] Home, products, product detail, compare, enquiry, about, contact all load with no console errors.
- [ ] Products listing shows the catalogue; an "Unavailable" product shows the "Currently Unavailable" badge and an "Enquire About Availability" button (not a green available state).
- [ ] Admin login works and lands on the Overview dashboard.
- [ ] Admin Products (`admin/products.html`): page-size dropdown, sort, filter, search, add, edit (incl. Available <-> Unavailable), delete all work.
- [ ] Admin Enquiries: list loads, status filter works, mark replied/unreplied works, delete works.
- [ ] Product documents: a product WITH an SDS or TDS URL shows the "Product Documents" section with working download links (open in a new tab); a product WITHOUT any document URL shows no download section at all.
- [ ] Submitting an enquiry on `enquiry.html` saves and appears in admin Enquiries.
- [ ] If `ENQUIRY_NOTIFY_TO` is set: the notification email arrives and the "Mark as replied" link works.
- [ ] Auth: without a token, `POST/PUT/DELETE /api/products.php` and `GET/PATCH/DELETE /api/enquiries.php` return 401.
- [ ] AI advisor chatbot opens and responds (catalogue fallback is fine with no LLM key).
- [ ] No PHP errors/warnings appear in any response body. Check `error_log` on the server, not the browser.
- [ ] Mobile layout (390px), tablet (768px), desktop (1440px): no horizontal overflow, no clipped buttons, dropdowns usable.

## 8. Redeploys

On every later redeploy: upload changed files but NEVER overwrite the live
`api/config.php`. If you add new config keys in code, add the matching `define()`
lines to the live `config.php` by hand.

## 9. Notes and future-ready items

- **Product images:** the schema supports one main image (`image_url`) plus an
  optional `images` JSON array for extra views. Admin lets staff paste image URLs.
  Until the client supplies real images, products fall back to a clean branded
  placeholder. No file-upload system is built; URLs only.
- **Product downloads (SDS / TDS):** implemented. The `products` table has optional
  `sds_url` and `tds_url` columns (see the migration in section 5). Admins paste a
  URL or a relative path (for example `uploads/documents/file.pdf`) into each
  product's Safety/Technical Data Sheet field. The product detail page shows a
  "Product Documents" section with download links ONLY for the documents that exist;
  if both are blank the section is hidden entirely. Links open in a new tab with
  `rel="noopener"`. The client confirmed the data sheets are not online yet, so most
  products will have blank fields (and therefore no download section) until files
  are uploaded. No file-upload UI is built; URLs/paths only.
- **Brand and company logos:** the design does not depend on logo image assets. Deer,
  Horsemen, Premier, Rhino and the Yee Lim company logo can be swapped in later
  (brand is currently shown as a text badge / monogram). No layout change is needed
  when the client supplies logo files.
- **Customer accounts:** intentionally none. Enquiries are submitted without login.
  Admin login is internal staff only. The public navbar has no customer Sign In.
