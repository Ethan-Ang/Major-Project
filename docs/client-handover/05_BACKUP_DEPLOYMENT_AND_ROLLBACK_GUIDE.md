# 05. Backup, Deployment and Rollback Guide

**Project ReBond, Yee Lim Adhesives Industries Pte Ltd**

This guide is split deliberately. **Part A** is safe for Yee Lim staff. **Part B** is for
a developer only. Do not attempt Part B without development experience.

---

## Contents

- [Part A. Client safe actions](#part-a-client-safe-actions)
  - [A1. Why backups matter](#a1-why-backups-matter)
  - [A2. Backing up the website files](#a2-backing-up-the-website-files)
  - [A3. Backing up the database](#a3-backing-up-the-database)
  - [A4. Naming and storing backups](#a4-naming-and-storing-backups)
  - [A5. Backup schedule](#a5-backup-schedule)
  - [A6. What staff must never do](#a6-what-staff-must-never-do)
- [Part B. Developer only actions](#part-b-developer-only-actions)
  - [B1. Preconditions](#b1-preconditions)
  - [B2. Local verification](#b2-local-verification)
  - [B3. The deployment whitelist](#b3-the-deployment-whitelist)
  - [B4. Hard exclusions](#b4-hard-exclusions)
  - [B5. Database migrations](#b5-database-migrations)
  - [B6. Cache and version bumping](#b6-cache-and-version-bumping)
  - [B7. Running the deployment](#b7-running-the-deployment)
  - [B8. Smoke testing](#b8-smoke-testing)
  - [B9. Rollback](#b9-rollback)
  - [B10. Deployment record](#b10-deployment-record)

---

# Part A. Client safe actions

## A1. Why backups matter

The website has two halves, and **neither is any use without the other**:

| Half | Contains |
| --- | --- |
| **Website files** | The pages, styling and code, plus every uploaded product photograph and every uploaded SDS and TDS PDF. |
| **Database** | Every product record, every enquiry, the catalogue filter values, the site settings and the admin accounts. |

Restore only the files and you get a working website with no products.
Restore only the database and you get products with no website.

> **Always back up both, at the same time, and label them so you can tell which file
> backup goes with which database backup.**

## A2. Backing up the website files

`[CLIENT TO CONFIRM]` The exact steps depend on the hosting control panel, which is not
asserted anywhere in this pack. In a typical cPanel style control panel:

1. Sign in to the hosting control panel.
2. Open the **Backup** or **Backup Wizard** tool.
3. Choose to download a **Home Directory** backup, or use the **File Manager** to compress
   and download the `public_html` folder.
4. Wait for the download to complete, then confirm the downloaded file opens.

**Make sure the backup includes the `uploads` folder.** That is where product photographs
and data sheet PDFs live. A file backup without it is incomplete.

## A3. Backing up the database

1. Sign in to the hosting control panel.
2. Open the **Backup** tool and download a **MySQL Database** backup, or open
   **phpMyAdmin**, select the website database, and use **Export** with the default
   settings to download a `.sql` file.
3. Confirm the downloaded file is not zero bytes.

## A4. Naming and storing backups

*(Recommendation)* Use names that sort correctly and say what they are:

```
yeelim-files-2026-07-29.zip
yeelim-database-2026-07-29.sql
```

Add a short reason when the backup is tied to a change:

```
yeelim-database-2026-07-29-before-product-import.sql
```

**Storage rules:**

- `[CLIENT TO CONFIRM]` Agree a storage location that is **not** the web server itself.
  A backup that only exists on the server is lost with the server.
- Keep at least the three most recent sets.
- Backups contain customer personal data from the enquiries table and the document
  download records. Store them somewhere access controlled.
- Record every backup in the backup log, Appendix D of
  [01_YEE_LIM_WEBSITE_HANDOVER_GUIDE.md](01_YEE_LIM_WEBSITE_HANDOVER_GUIDE.md).

## A5. Backup schedule

| Situation | Frequency |
| --- | --- |
| Normal operation | Monthly |
| Immediately before **any** change to the live site | Always |
| Before a hosting change, a PHP version change or a migration | Always |
| After a large batch of product updates | Same day |
| Before deleting anything in bulk | Always |

## A6. What staff must never do

> - **Never delete the only backup.** Keep the previous one until the new one has been
>   confirmed readable.
> - **Never edit files directly on the server.** Use the admin portal.
> - **Never upload files into `public_html` yourself.**
> - **Never restore a backup yourself.** Restoring wrongly can overwrite good data with
>   older data. Ask your developer.
> - **Never share a backup file outside the company.** It contains customer personal data.

---

# Part B. Developer only actions

> Everything below assumes development experience. The full technical context, including
> the file map, the API reference and the constraints, is in
> [03_TECHNICAL_HANDOVER.md](03_TECHNICAL_HANDOVER.md). The canonical deployment
> reference in the repository is `DEPLOYMENT_CPANEL.md`.

## B1. Preconditions

Before touching the live server, confirm all of these:

- [ ] You know exactly which files you are changing and why.
- [ ] The change has been tested locally.
- [ ] **You have re-checked `git log` and `git status`.** This repository is shared with
      another contributor who commits to the same branch and working tree.
- [ ] **You have downloaded the current live copy of every shared file you intend to
      upload and diffed it against your local copy, in both directions.** The live server
      has previously contained work that was never in the repository. Uploading blindly
      would silently delete it.
- [ ] A pre-deployment file backup and database export exist.
- [ ] Any required database migration is ready and its rollback statement is known.

## B2. Local verification

```bash
# unit tests
node --test tests/

# cache version guard, must exit 0
node qa/check-cache-versions.js

# run the site
cd frontend && php -S 127.0.0.1:8099 router.php
```

Then work through the manual QA list in section 10.6 of
[03_TECHNICAL_HANDOVER.md](03_TECHNICAL_HANDOVER.md).

## B3. The deployment whitelist

Deployment is **explicit, file by file**. There is no "upload everything" step.

**`deploy_rebond_public.sh`**, the six public pages plus the shared bundle they load:

```
products.html product-detail.html compare.html enquiry.html contact.html 404.html
css/products.css css/dropdown-ui.css
js/widgets/navbar.js js/widgets/footer.js js/widgets/compare.js
js/widgets/custom-select.js js/widgets/page-transitions.js js/widgets/chatbot.js
js/core/app.js js/data.js
js/pages/products.js js/pages/product-detail.js js/pages/enquiry.js
js/pages/compare-page.js js/pages/contact.js
```

**`deploy_all.sh`** adds the admin pages, the API endpoints and `uploads/.htaccess`:

```
admin/dashboard.html admin/products.html admin/enquiries.html admin/login.html
admin/filters.html admin/filters.js admin/settings.html admin/settings.js
admin/downloads.html admin/downloads.js admin/admin.js
api/products.php api/enquiries.php api/taxonomies.php api/settings.php api/downloads.php
api/document_request.php api/download_document.php api/product_documents.php
api/delete_product_document.php
uploads/.htaccess
```

Both scripts back up each live file first, upload, then re-download and diff to verify.
Every file should report `MATCH`.

## B4. Hard exclusions

Both scripts contain a `NEVER` guard and will abort the entire run rather than touch:

```
index.html   about.html   home.html   config.php
```

- **`index.html` and `about.html`** are maintained directly on the live server by a
  separate contributor. The repository copy of `about.html` is a 0 byte placeholder;
  deploying it would blank the live About page.
- **`config.php`** holds the live database credentials and any AI key. It is gitignored,
  is created and maintained by hand on the server, and must never be overwritten. On an
  existing server, only **add** new `define()` lines to it.

Also never deploy: `backend/`, `database/*.sql`, `qa/`, `node_modules/`, `.git/`,
`docs/`, or any internal `.md` file. The root `.htaccess` denies web access to `.sql`,
`.md`, `.log`, `config.php` and `config.example.php` by name as defence in depth, but
they should not be on the server at all.

> **Never use `git add .` or `git add -A`, and never use a bulk FTP "upload folder"
> operation.** Stage and upload exact paths only.

## B5. Database migrations

**Apply migrations before uploading code that depends on them.**

1. Take a database export first.
2. Apply the `.sql` file through phpMyAdmin.
3. Run the verification query in the migration file's header comment. Each migration
   documents both its verification and its rollback statement.
4. Only then upload the code.

Order matters: `2026-07-21_taxonomy_terms.sql` must be applied before
`2026-07-21_products_product_type.sql`.

> **`database/product_documents.sql` must never be run against the live database.**
> That table already exists there; the file is a reconstruction for local development only.

`[DEVELOPER TO VERIFY]` Which migrations have actually been applied to live. Check before
deploying anything that assumes a table exists.

## B6. Cache and version bumping

The host serves CSS and JS with a 7 day cache, and the CDN caches by the **full URL
including the query string**.

> **Never reuse a `?v=` number for changed content.** A changed file under a reused
> version can be served stale from the edge, and the person who deployed it will not see
> the problem. **Always bump above the highest number ever used**, even if a lower number
> looks free.

Steps:

1. Bump the `?v=` on every changed CSS and JS file, in **every** HTML file that references
   it. A shared file must carry the **same** `?v=` on every page.
2. Run `node qa/check-cache-versions.js`. It fails with exit code 1 and names the offending
   files if a hash changed without a bump, or if a shared file has inconsistent versions.
3. Use `--reset` only after an intentional change where you have already bumped correctly.

Current high water marks are listed in section 11.5 of
[03_TECHNICAL_HANDOVER.md](03_TECHNICAL_HANDOVER.md).

Admin HTML is exempt from this concern: `frontend/admin/.htaccess` sends no-cache headers
for `.html` in that folder only, so admin page edits appear immediately.

## B7. Running the deployment

```bash
# public pages only
bash deploy_rebond_public.sh

# public + admin + api
bash deploy_all.sh
```

Both read FTP credentials from `ftp.env` (gitignored) and write a timestamped backup to
`ftp_backup/<timestamp>_predeploy/` before uploading anything.

Read the output carefully:

- `upload_failures=0` and `verify_mismatches=0` means every file uploaded and matched.
- Any `DIFFERS!` line must be investigated **before** doing anything else. It usually means
  either the upload failed silently, or the live file was changed by someone else between
  the backup and the verify.

## B8. Smoke testing

```bash
node qa/deploy-smoke.js
node qa/live-check.js
```

Then, manually against the live site:

- [ ] Catalogue loads, filters work, product counts are correct.
- [ ] One product detail page: all three tabs, gallery, availability wording.
- [ ] Compare with three products.
- [ ] Submit a test enquiry, confirm it appears in the admin and the notification email
      arrives. Delete the test record afterwards.
- [ ] Complete a document download gate and confirm the PDF streams.
- [ ] Admin sign in, product edit and save.
- [ ] Language switch to Chinese and back.
- [ ] Browser console clear of JavaScript errors on every public page.
- [ ] **Home page and About page still load and are unchanged.**

## B9. Rollback

1. Identify the pre-deployment backup: `ftp_backup/<timestamp>_predeploy/`.
2. Re-upload those files over the live ones. `deploy_rebond_public.sh` prints the exact
   rollback loop at the end of its run.
3. If a database migration was applied, run its documented rollback statement, or restore
   the database export taken in step B1.
4. Re-run the smoke tests.
5. Record the rollback and its cause in
   [10_CHANGE_LOG_TEMPLATE.md](10_CHANGE_LOG_TEMPLATE.md).

**Order matters when rolling back a change that included a migration:** roll the files
back first, then the database, so the site is never running new code against an old
schema.

## B10. Deployment record

Complete an entry in [10_CHANGE_LOG_TEMPLATE.md](10_CHANGE_LOG_TEMPLATE.md) for every
deployment, including the backup reference, the exact file list, whether a database change
was involved, and the verification result.

---

## Summary of warnings

> - Never overwrite production configuration blindly. `config.php` is not in the
>   repository and holds the live credentials.
> - Never deploy Home or About from this repository. The About copy here is empty and the
>   Home page does not exist here at all.
> - Never deploy admin or API changes without testing them locally first.
> - Never delete the only backup.
> - Never use `git add .`, `git add -A`, or a bulk folder upload. Stage and upload exact
>   paths.
> - Never reuse a cache version number for changed content.
> - Never run `database/product_documents.sql` against the live database.
> - Always diff the live copy of a shared file against local, in both directions, before
>   uploading.
