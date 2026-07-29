# 07. Troubleshooting Guide

**Project ReBond, Yee Lim Adhesives Industries Pte Ltd**

Find the area, find the symptom, follow the safe check. Each entry states clearly whether
a developer is needed and whether a rollback is likely.

> **Rule for Yee Lim staff: never edit PHP files, run SQL, or change server settings to fix
> a problem.** Report the symptom, with the exact wording of any error message, using the
> issue reporting template in Appendix F of
> [01_YEE_LIM_WEBSITE_HANDOVER_GUIDE.md](01_YEE_LIM_WEBSITE_HANDOVER_GUIDE.md).

---

## First, three checks that solve most problems

1. **Hard refresh the page.** `Ctrl` + `F5` on Windows, `Cmd` + `Shift` + `R` on a Mac.
   The site caches styling and code files aggressively, so a change can appear not to have
   worked when it simply has not been re-fetched.
2. **Try a different browser, and a different device on mobile data rather than office
   Wi-Fi.** This separates "the site is broken" from "my browser or network is the problem".
3. **Check whether the same thing happens for a colleague.** If not, it is local to you.

---

## Contents

1. [Public website](#1-public-website)
2. [Products](#2-products)
3. [Product Detail](#3-product-detail)
4. [Compare](#4-compare)
5. [Product Enquiry](#5-product-enquiry)
6. [Contact and WhatsApp](#6-contact-and-whatsapp)
7. [Admin Login](#7-admin-login)
8. [Admin Products](#8-admin-products)
9. [Uploads](#9-uploads)
10. [Enquiries](#10-enquiries)
11. [Database and API](#11-database-and-api)
12. [Mobile](#12-mobile)
13. [Language](#13-language)
14. [Deployment](#14-deployment)

---

# 1. Public website

### 1.1 The website does not load at all

| | |
| --- | --- |
| **Symptom** | The browser shows a connection error, a hosting suspension notice, or a "this site cannot be reached" message. |
| **Possible cause** | Hosting outage or suspension, expired domain, DNS problem, expired SSL certificate. |
| **Safe check** | Try on a second device, on mobile data. Check whether the domain or hosting renewal is overdue. Check the hosting provider's status page. |
| **Safe client action** | None beyond checking. Do not attempt any fix. |
| **Developer action** | Check hosting account status, DNS records, certificate expiry, and the server error log. |
| **Log or file** | Hosting control panel status, PHP error log. |
| **Rollback needed?** | Only if the outage began immediately after a deployment. |

### 1.2 A security warning appears, or the padlock is missing

| | |
| --- | --- |
| **Symptom** | "Not secure" in the address bar, or a certificate warning. |
| **Possible cause** | The SSL certificate has expired, or the site is being served over plain HTTP. |
| **Safe check** | Type the address with `https://` at the front and see whether it loads cleanly. |
| **Safe client action** | Report immediately. |
| **Developer action** | Renew or reissue the certificate. Confirm SSL is active, then enable the HTTPS redirect block in `frontend/.htaccess`, which is currently written but commented out. |
| **Rollback needed?** | No. |

### 1.3 A link leads to the "page not found" screen

| | |
| --- | --- |
| **Symptom** | The 404 page appears where a real page was expected. |
| **Possible cause** | A mistyped address, a renamed page, or an old link from an external site. |
| **Safe check** | Note the **exact** address that failed. Try navigating to the same place from the site menu. |
| **Safe client action** | Report the failing address. |
| **Developer action** | Check the clean URL rewrite rules in `frontend/.htaccess`, and whether the target file exists. |
| **Rollback needed?** | No. |

### 1.4 Styling looks broken, everything is unstyled text

| | |
| --- | --- |
| **Symptom** | The page loads but has no layout, colours or spacing. |
| **Possible cause** | The stylesheet failed to load, usually a bad or missing deployment, or a cached version mismatch. |
| **Safe check** | Hard refresh. Try another device. |
| **Safe client action** | Report immediately, this is visible to customers. |
| **Developer action** | Confirm `css/products.css` uploaded correctly and its `?v=` matches across every HTML file. Run `node qa/check-cache-versions.js`. |
| **Log or file** | Browser network tab, look for a 404 on the CSS file. |
| **Rollback needed?** | **Likely yes**, if it began after a deployment. |

---

# 2. Products

### 2.1 A new product does not appear in the catalogue

| | |
| --- | --- |
| **Symptom** | The product exists in the admin but not on the public site. |
| **Possible cause** | Not actually saved; the browser is showing a cached page; the visitor has a filter applied. |
| **Safe check** | Re open the product in the admin and confirm the fields saved. Hard refresh the public catalogue. Clear all filters. |
| **Safe client action** | Re save the product. |
| **Developer action** | Check `api/products.php` returns the record, and check the browser console for errors. |
| **Rollback needed?** | No. |

### 2.2 A product does not appear under a filter it should

| | |
| --- | --- |
| **Symptom** | The product exists but is missing from an industry or surface filter. |
| **Possible cause** | The industry or surface value on the product does not match the Catalogue Filters value character for character, for example `Flooring` versus `Floors`. |
| **Safe check** | Open the product in the admin and compare its Industries and Surfaces text against the values in **Catalogue Filters**. |
| **Safe client action** | Correct the spelling on the product, or rename the filter value in Catalogue Filters, which also updates every product using it. |
| **Developer action** | Only if the values match exactly and it still fails. |
| **Rollback needed?** | No. |

### 2.3 Search does not find a product

| | |
| --- | --- |
| **Symptom** | Searching an obvious word returns nothing. |
| **Possible cause** | That word does not appear anywhere in the product's recorded data. Search matches the **start of a word**, and a single letter query searches only name and brand. |
| **Safe check** | Search for the exact product name. If that works, the search is fine and the wording is the issue. |
| **Safe client action** | Add the customer's own word to the product's description or features. See section 16 of [04_CONTENT_AND_PRODUCT_DATA_GUIDE.md](04_CONTENT_AND_PRODUCT_DATA_GUIDE.md). |
| **Developer action** | Only if the exact product name also fails. |
| **Rollback needed?** | No. |

### 2.4 Product counts beside a filter look wrong

| | |
| --- | --- |
| **Symptom** | A filter says 5 products, but shows 3. |
| **Possible cause** | Another filter is also applied, so the two intersect. |
| **Safe check** | Select **Clear all** and apply only that one filter. |
| **Safe client action** | None if it resolves. |
| **Developer action** | If it persists with a single filter applied. |
| **Rollback needed?** | No. |

### 2.5 The Bond Finder does not suggest an obvious product

| | |
| --- | --- |
| **Symptom** | Two surfaces are selected and a product that clearly suits is not ranked. |
| **Possible cause** | The product is not tagged with both surfaces, or it is marked Unavailable. |
| **Safe check** | Open the product and check its Surfaces field and its status. |
| **Safe client action** | Add the missing surfaces. Confirm the status is Available. |
| **Developer action** | Only if the tagging is correct and it still does not rank. |
| **Rollback needed?** | No. |

---

# 3. Product Detail

### 3.1 The image does not display

| | |
| --- | --- |
| **Symptom** | A placeholder appears instead of the photograph. |
| **Possible cause** | No image was uploaded; the upload was rejected; the file was removed. |
| **Safe check** | Open the product in the admin and look at the image preview. |
| **Safe client action** | Re upload a JPG, PNG or WEBP under 5 MB. |
| **Developer action** | If a valid file still fails, check `api/upload-product-images.php` and the `uploads/products/product-<id>/` folder permissions. |
| **Log or file** | PHP error log; the browser network tab for a 404 on the image path. |
| **Rollback needed?** | No. |

### 3.2 The Application Method or Available Sizes row is missing

| | |
| --- | --- |
| **Symptom** | The information exists in Features but appears in the Characteristics row instead of its own labelled row. |
| **Possible cause** | The exact prefix was not used. The page looks for `Application:` and `Available in `. |
| **Safe check** | Open the product and read the Features field. |
| **Safe client action** | Rewrite as `Application: Brush or Roll` and `Available in 300G, 1 US Gallon`. See section 9 of [04_CONTENT_AND_PRODUCT_DATA_GUIDE.md](04_CONTENT_AND_PRODUCT_DATA_GUIDE.md). |
| **Developer action** | None. This is expected behaviour. |
| **Rollback needed?** | No. |

### 3.3 The "Suitable for" list runs together as one sentence

| | |
| --- | --- |
| **Symptom** | Uses appear as "Leather product bonding Shoe in-soles General purpose." |
| **Possible cause** | The separators are missing in that product's How to Use text. The site deliberately refuses to guess where to split, because guessing would invent product claims. |
| **Safe check** | Open the product and read the How to Use field. |
| **Safe client action** | Re write the list with semicolons between items. |
| **Developer action** | For a bulk fix across many records, see `database/fix_suitable_uses_delimiters.sql`. |
| **Rollback needed?** | No. |

### 3.4 The specification table is nearly empty

| | |
| --- | --- |
| **Symptom** | The Specifications tab shows "Specifications for this product are available from our team." |
| **Possible cause** | The product has no brand, industries, surfaces or features recorded. The table only ever shows real data. |
| **Safe check** | Open the product and check those fields. |
| **Safe client action** | Complete the product record. |
| **Developer action** | None. This is intended, honest behaviour. |
| **Rollback needed?** | No. |

### 3.5 The Downloads tab shows nothing

| | |
| --- | --- |
| **Symptom** | "No downloads are currently available for this product." |
| **Possible cause** | No SDS or TDS has been uploaded for that product. |
| **Safe check** | Open the product in the admin and look at the Product Documents area. |
| **Safe client action** | Upload the PDF. |
| **Developer action** | If a document is uploaded and the tab still shows empty, check the `product_documents` table and the `hasSds` / `hasTds` flags returned by `api/products.php`. |
| **Rollback needed?** | No. |

---

# 4. Compare

### 4.1 Compare does not update when a product is ticked

| | |
| --- | --- |
| **Symptom** | The count does not change, or the selection is lost. |
| **Possible cause** | The browser is blocking local storage, or is in private browsing mode. |
| **Safe check** | Try a normal, non private browser window. Try another browser. |
| **Safe client action** | None if it works elsewhere. |
| **Developer action** | If it fails in a normal window on multiple browsers, check the console for errors in `js/widgets/compare.js`. |
| **Rollback needed?** | Only if it started after a deployment. |

### 4.2 A fourth product cannot be added

| | |
| --- | --- |
| **Symptom** | "Compare is full. Remove one to add another." |
| **Possible cause** | None. The limit is three by design. |
| **Safe client action** | Remove one product first. |
| **Developer action** | None. |
| **Rollback needed?** | No. |

### 4.3 Compare rows are blank for one product

| | |
| --- | --- |
| **Symptom** | One column has empty cells. |
| **Possible cause** | That product has no data recorded for those rows. |
| **Safe client action** | Complete the product record in the admin. |
| **Developer action** | None. Nothing is invented to fill a gap, by design. |
| **Rollback needed?** | No. |

---

# 5. Product Enquiry

### 5.1 An enquiry does not appear in the admin

| | |
| --- | --- |
| **Symptom** | A customer says they submitted an enquiry but it is not in the inbox. |
| **Possible cause** | They did not complete the form; the spam guard blocked an automated submission; they hit the rate limit. |
| **Safe check** | **Submit a test enquiry yourself** and confirm it appears. This is the fastest way to separate "the system is broken" from "that one submission never completed". |
| **Safe client action** | If your own test appears, the system is working. Contact the customer directly. |
| **Developer action** | If your own test does **not** appear, check `api/enquiries.php` and the database connection. |
| **Log or file** | PHP error log. |
| **Rollback needed?** | Possibly, if it began after a deployment. |

### 5.2 The enquiry notification email is not received

| | |
| --- | --- |
| **Symptom** | Enquiries appear in the admin, but no email arrives. |
| **Possible cause** | The recipient address is wrong; the message went to spam; email delivery is not correctly configured on the server. |
| **Safe check** | Check the spam folder. Confirm the **Enquiry Recipient Email** in **Admin, Site Settings**. Note that a blank value is valid and means the server default is used. |
| **Safe client action** | Correct the recipient address if it is wrong. **The enquiry is always saved regardless, so no lead is lost.** |
| **Developer action** | Confirm `ENQUIRY_NOTIFY_TO` and `ENQUIRY_FROM` in the live configuration, and confirm SPF and DKIM are published for the sending domain. |
| **Log or file** | PHP error log; the hosting mail log. |
| **Rollback needed?** | No. |

### 5.3 The customer did not receive their confirmation email

| | |
| --- | --- |
| **Symptom** | The customer says no acknowledgement arrived. |
| **Possible cause** | Spam filtering, a mistyped email address, or the same delivery configuration issue as 5.2. |
| **Safe check** | Read the email address on the enquiry record for a typographical error. |
| **Safe client action** | Reply to them directly. |
| **Developer action** | As 5.2. |
| **Rollback needed?** | No. |

### 5.4 A visitor is told there are too many enquiries in a short time

| | |
| --- | --- |
| **Symptom** | "Too many enquiries in a short time. Please try again in about N minutes." |
| **Possible cause** | The spam rate limit, five submissions per ten minutes per internet connection. Several colleagues in one office share one connection. |
| **Safe check** | Ask whether several people submitted from the same office at once. |
| **Safe client action** | Wait the stated time, or invite them to phone or use WhatsApp instead. |
| **Developer action** | Only if a genuine customer hits this repeatedly. |
| **Rollback needed?** | No. |

### 5.5 The enquiry basket empties unexpectedly

| | |
| --- | --- |
| **Symptom** | Selected products disappear from the basket. |
| **Possible cause** | The visitor cleared their browser data, switched device, or is in private browsing. The basket is stored in their own browser. |
| **Safe client action** | Explain that the selection lives in their browser. |
| **Developer action** | Only if it happens consistently in a normal window. |
| **Rollback needed?** | No. |

---

# 6. Contact and WhatsApp

### 6.1 The WhatsApp link goes to the wrong number, or does not open

| | |
| --- | --- |
| **Symptom** | WhatsApp opens with an unknown or invalid number. |
| **Possible cause** | The WhatsApp number in **Site Settings** is wrong, or was entered with a `+`, spaces or brackets. |
| **Safe check** | Open **Admin, Site Settings** and read the WhatsApp Number field. It must be digits only including the country code, for example `6588755786`. |
| **Safe client action** | Correct it and save. Then test from a real phone. |
| **Developer action** | Only if the value is correct and the link is still wrong. |
| **Rollback needed?** | No. |

### 6.2 The contact details on the site are out of date

| | |
| --- | --- |
| **Symptom** | The footer or Contact page shows an old email, phone or address. |
| **Possible cause** | Site Settings has not been updated, or the browser is showing a cached page. |
| **Safe check** | Update in **Admin, Site Settings**, then hard refresh the public page. |
| **Safe client action** | Correct and save. |
| **Developer action** | If the old value persists after a hard refresh on two devices, the built in fallback values in the page may also need updating, which is a code change. |
| **Rollback needed?** | No. |

### 6.3 The business hours or map are wrong

| | |
| --- | --- |
| **Symptom** | Incorrect opening hours or map location. |
| **Possible cause** | These are in the page code, not in Site Settings. |
| **Safe client action** | None. Report the correct values. |
| **Developer action** | Edit `frontend/contact.html`, bump the relevant cache versions, and deploy. |
| **Rollback needed?** | No. |

---

# 7. Admin Login

### 7.1 The password is rejected

| | |
| --- | --- |
| **Symptom** | "Invalid username or password." |
| **Possible cause** | A typographical error, Caps Lock, or a trailing space copied in with the password. |
| **Safe check** | Type it manually rather than pasting. Check Caps Lock. |
| **Safe client action** | Try once more, carefully. Do not try repeatedly. |
| **Developer action** | Reset the password. There is no self service reset screen. |
| **Rollback needed?** | No. |

### 7.2 Too many login attempts

| | |
| --- | --- |
| **Symptom** | "Too many login attempts. Please try again in about N minutes." |
| **Possible cause** | Ten failed attempts within fifteen minutes from your internet connection. |
| **Safe check** | None needed. The message states the real waiting time. |
| **Safe client action** | **Wait.** A successful sign in clears the block immediately. |
| **Developer action** | Only if a correct password is still rejected after the wait. |
| **Rollback needed?** | No. |

### 7.3 Signed out unexpectedly

| | |
| --- | --- |
| **Symptom** | "Invalid or expired session. Please sign in again." |
| **Possible cause** | The 24 hour session expired, or you signed out in another tab. |
| **Safe client action** | Sign in again. |
| **Developer action** | Only if it happens within minutes of signing in. |
| **Rollback needed?** | No. |

### 7.4 The login page itself will not load

| | |
| --- | --- |
| **Symptom** | The admin address gives an error or a blank page. |
| **Possible cause** | A deployment problem, or a server issue. |
| **Safe check** | Confirm the public site still loads. |
| **Safe client action** | Report immediately. |
| **Developer action** | Confirm `admin/login.html` and `admin/login.js` are present and the API responds. |
| **Rollback needed?** | **Likely yes**, if it began after a deployment. |

---

# 8. Admin Products

### 8.1 Saving a product fails

| | |
| --- | --- |
| **Symptom** | An error message appears instead of the product saving. |
| **Possible cause** | A required field is empty, a field is over its limit, or the session expired. |
| **Safe check** | Read the message. "Product name and short description are required" and "too long" messages are self explanatory. |
| **Safe client action** | Correct the field and save again. If the message mentions the session, sign in again. **Copy your text somewhere safe first.** |
| **Developer action** | If the message is a generic "Something went wrong". |
| **Log or file** | PHP error log. |
| **Rollback needed?** | No. |

### 8.2 Status will not change, or reverts on reload

| | |
| --- | --- |
| **Symptom** | The badge changes then reverts. |
| **Possible cause** | The change did not save on the server, often an expired session. |
| **Safe check** | Reload and try again. |
| **Safe client action** | Sign out and back in, then retry. |
| **Developer action** | If it persists, check `api/products.php` and the browser network tab. |
| **Rollback needed?** | No. |

### 8.3 Catalogue Filters refuses to delete a value

| | |
| --- | --- |
| **Symptom** | The delete is rejected with a message about products using it. |
| **Possible cause** | None. The system deliberately refuses to delete a value that products still use. |
| **Safe client action** | **Archive** it instead, which retires it safely, or reassign those products first. |
| **Developer action** | None. |
| **Rollback needed?** | No. |

### 8.4 A rename appears to have removed products

| | |
| --- | --- |
| **Symptom** | After renaming a filter value, products seem to have vanished from that filter. |
| **Possible cause** | The rename should update every product automatically, inside one transaction. |
| **Safe check** | Hard refresh the public catalogue. Open one affected product and check its Industries or Surfaces field. |
| **Safe client action** | If the product fields still hold the old value, report it. |
| **Developer action** | Check the rename transaction in `api/taxonomies.php` and repair the affected rows. |
| **Rollback needed?** | Possibly, restore from the database backup taken before the rename. |

---

# 9. Uploads

### 9.1 An image is rejected

| | |
| --- | --- |
| **Symptom** | "Only JPG, PNG and WEBP images are allowed." or "Each image must be below 5MB." |
| **Possible cause** | The file is not a genuine JPG, PNG or WEBP, or it exceeds 5 MB. The check reads the real file content, not the file name. |
| **Safe check** | Check the file's real format and size. |
| **Safe client action** | Convert and resize, then re upload. |
| **Developer action** | If a genuine, small JPG is still rejected, check folder permissions on `uploads/products/`. |
| **Rollback needed?** | No. |

### 9.2 A PDF is rejected

| | |
| --- | --- |
| **Symptom** | "Only PDF documents are allowed" or "File must be smaller than 10 MB". |
| **Possible cause** | The file is not a genuine PDF, for example a Word document renamed, or it exceeds 10 MB. |
| **Safe client action** | Re export it as a real PDF and compress if needed. |
| **Developer action** | If a genuine small PDF is still rejected, confirm the `fileinfo` PHP extension is enabled on the server. |
| **Rollback needed?** | No. |

### 9.3 An uploaded document does not appear on the public page

| | |
| --- | --- |
| **Symptom** | The upload succeeded but the Downloads tab is still empty. |
| **Possible cause** | The page is cached, or the record did not save. |
| **Safe check** | Hard refresh the public product page. Re open the product in the admin and confirm the document preview shows. |
| **Developer action** | Check the `product_documents` table and the `hasSds` / `hasTds` flags. |
| **Rollback needed?** | No. |

### 9.4 The document download fails for a customer

| | |
| --- | --- |
| **Symptom** | "This download link has already been used." or "This download link has expired." |
| **Possible cause** | None. Links are **single use** and expire after about 15 minutes, by design. |
| **Safe client action** | Ask them to request the document again from the product page. |
| **Developer action** | If a **fresh** request also fails, check `api/download_document.php`, the token table, and that the file exists on disk. |
| **Rollback needed?** | No. |

### 9.5 The upload appears to hang

| | |
| --- | --- |
| **Symptom** | The save spinner does not finish. |
| **Possible cause** | A large file over a slow connection, or a server upload size limit. |
| **Safe check** | Try a much smaller file. |
| **Safe client action** | Compress the file and retry. |
| **Developer action** | Check the PHP `upload_max_filesize` and `post_max_size` values on the host. |
| **Rollback needed?** | No. |

---

# 10. Enquiries

### 10.1 The enquiry list will not load

| | |
| --- | --- |
| **Symptom** | A connection or server error where the table should be. |
| **Possible cause** | The session expired, or the database is unreachable. |
| **Safe check** | Reload. Sign out and back in. |
| **Safe client action** | If it persists, report immediately. |
| **Developer action** | Check `api/enquiries.php` and the database connection. |
| **Log or file** | PHP error log. |
| **Rollback needed?** | Possibly. |

### 10.2 The New Leads count never falls

| | |
| --- | --- |
| **Symptom** | The count stays high even though the team has replied. |
| **Possible cause** | Staff reply by email but never mark the enquiry as replied. |
| **Safe client action** | Mark them as replied, from the admin or from the one tap link in the notification email. Use **Mark all replied** to clear a backlog. |
| **Developer action** | None. |
| **Rollback needed?** | No. |

### 10.3 Obvious spam is arriving

| | |
| --- | --- |
| **Symptom** | Junk enquiries in the inbox. |
| **Possible cause** | A spam tool that gets past the honeypot and the rate limit. |
| **Safe client action** | Delete them. Note the pattern, for example a repeated company name or message. |
| **Developer action** | Review the pattern and tighten the guards if it becomes frequent. |
| **Rollback needed?** | No. |

### 10.4 A real enquiry was deleted by accident

| | |
| --- | --- |
| **Symptom** | The record is gone. |
| **Possible cause** | Deletion is permanent and there is no undo. |
| **Safe client action** | Report **immediately**. The sooner you ask, the more likely a recent backup still contains it. |
| **Developer action** | Restore from the most recent database backup taken before the deletion, into a test environment, and recover the row. |
| **Rollback needed?** | Partial database restore only. Do not restore the whole database over live data without care, or newer enquiries will be lost. |

---

# 11. Database and API

### 11.1 "Something went wrong on our end. Your details are fine, please try again shortly."

| | |
| --- | --- |
| **Symptom** | This exact message appears on the public site. |
| **Possible cause** | **The website cannot reach its database.** This message is deliberately distinct from a generic error, so the visitor knows their input was not at fault. |
| **Safe check** | See whether the admin also fails. If both fail, it is the database. |
| **Safe client action** | Do not retry repeatedly. **Report immediately, this is urgent.** |
| **Developer action** | Check the MySQL service, the credentials in `config.php`, and whether the host has suspended the database. |
| **Log or file** | PHP error log, look for `db.php: connection failed`. |
| **Rollback needed?** | Only if it began immediately after a deployment or a configuration change. |

### 11.2 "Something went wrong. Please try again later."

| | |
| --- | --- |
| **Symptom** | A generic error from an admin or public action. |
| **Possible cause** | A server side error was caught and logged. The detail is deliberately never shown to the browser. |
| **Safe client action** | Note exactly what you were doing, and report it. |
| **Developer action** | Read the PHP error log. Each endpoint logs with its own filename prefix, for example `products.php:`, `enquiries.php:`, `settings.php PATCH:`. |
| **Rollback needed?** | Depends on the cause. |

### 11.3 The dashboard says analytics are not initialised

| | |
| --- | --- |
| **Symptom** | The Product Analytics panel shows a note instead of data. |
| **Possible cause** | The `product_views` table does not exist on that server. The endpoint degrades quietly by design rather than breaking the dashboard. |
| **Safe client action** | Report it. Nothing else is affected. |
| **Developer action** | Apply `database/migrations/2026-07-22_product_views.sql`. |
| **Rollback needed?** | No. |

### 11.4 An admin page errors where an empty state was expected

| | |
| --- | --- |
| **Symptom** | Document Downloads, Catalogue Filters or Site Settings shows an error rather than "no records yet". |
| **Possible cause** | The backing table has not been created on that server. |
| **Safe client action** | Report it. |
| **Developer action** | Apply the relevant migration from `database/`. See section 7.3 of [03_TECHNICAL_HANDOVER.md](03_TECHNICAL_HANDOVER.md) for the order. |
| **Rollback needed?** | No. |

---

# 12. Mobile

### 12.1 The layout looks broken on a phone

| | |
| --- | --- |
| **Symptom** | Overlapping elements, horizontal scrolling, or unreadable text. |
| **Possible cause** | Cached old styling, or a genuine layout problem on that device. |
| **Safe check** | Hard refresh. Try a second phone, and a different browser. |
| **Safe client action** | Report with the exact device model, browser and a screenshot. |
| **Developer action** | Reproduce at 390 pixels width, check `css/products.css` at the 640 pixel breakpoint, and confirm the deployed `?v=` values. |
| **Rollback needed?** | Likely, if it began after a deployment. |

### 12.2 The page zooms in when a form field is tapped

| | |
| --- | --- |
| **Symptom** | On an iPhone, tapping a field zooms the whole page. |
| **Possible cause** | A form input has been given a font size below 16 pixels. This is a known iOS Safari behaviour. |
| **Safe client action** | Report it. |
| **Developer action** | The stylesheet enforces a minimum of 16 pixels for inputs at 640 pixels and below, with `!important`. Find and remove whatever overrode it. **Do not weaken that rule.** |
| **Rollback needed?** | Possibly. |

### 12.3 The mobile filter sheet will not open or close

| | |
| --- | --- |
| **Symptom** | The Filters button does nothing, or the sheet cannot be dismissed. |
| **Possible cause** | A JavaScript error earlier on the page, often caused by a cached mismatch between files. |
| **Safe check** | Hard refresh. Try another browser. |
| **Developer action** | Check the browser console. Run `node qa/check-cache-versions.js` and confirm all deployed versions are consistent. |
| **Rollback needed?** | Likely, if it began after a deployment. |

### 12.4 Back to Products loses the previous search

| | |
| --- | --- |
| **Symptom** | Returning from a product page resets the filters and scroll position. |
| **Possible cause** | The state restore did not run, often after a JavaScript error. |
| **Safe client action** | Report it. |
| **Developer action** | Check `js/pages/product-detail.js` and `js/pages/products.js`, and the Swup lifecycle in `js/core/app.js`. |
| **Rollback needed?** | Possibly. |

---

# 13. Language

### 13.1 Part of a page stays in English on the Chinese site

| | |
| --- | --- |
| **Symptom** | Chinese is selected but some text remains English. |
| **Possible cause** | Either that phrase has no Chinese entry, or that product has no Chinese translation, in which case English is the intended fallback. Product "Suitable for" lists are **deliberately** left in English. |
| **Safe check** | Note the page and the exact English text. |
| **Safe client action** | Report it with the wording. |
| **Developer action** | Add the key to `js/i18n.js`, or the product entry to `js/i18n-products.js`, then bump the cache version and deploy. |
| **Rollback needed?** | No. |

### 13.2 A newly added product shows in English on the Chinese site

| | |
| --- | --- |
| **Symptom** | Every other product is in Chinese, this one is not. |
| **Possible cause** | **Expected.** The admin is English only; Chinese product text is maintained separately in code. |
| **Safe client action** | Ask the developer to add the Chinese entry for that product. |
| **Developer action** | Add it to `js/i18n-products.js`, bump `?v=`, deploy. |
| **Rollback needed?** | No. |

### 13.3 The language switch is missing

| | |
| --- | --- |
| **Symptom** | No `中文` or `EN` control in the header. |
| **Possible cause** | The navbar script failed to load. |
| **Safe check** | Hard refresh. Check whether the menu and enquiry badge are also missing, which would confirm it. |
| **Developer action** | Confirm `js/widgets/navbar.js` deployed and its `?v=` is consistent across pages. |
| **Rollback needed?** | Likely, if it began after a deployment. |

### 13.4 The language resets on every page

| | |
| --- | --- |
| **Symptom** | The site returns to English when navigating. |
| **Possible cause** | The browser is blocking local storage, or is in private browsing mode. |
| **Safe check** | Try a normal browser window. |
| **Developer action** | Only if it fails in a normal window. |
| **Rollback needed?** | No. |

---

# 14. Deployment

**This section is for developers.**

### 14.1 A file reports `DIFFERS!` during verification

| | |
| --- | --- |
| **Symptom** | The deploy script's verify step reports a mismatch. |
| **Possible cause** | The upload failed silently, or the live file was changed by someone else between the backup and the verify. Remember this repository is shared, and the live server has previously held work not present in the repository. |
| **Safe check** | Download the live file and diff it against local, **in both directions**. |
| **Developer action** | Do not simply re-upload. Establish what the live version contains first, merge if necessary, then upload. |
| **Rollback needed?** | Possibly. |

### 14.2 A deployment script prints `REFUSING`

| | |
| --- | --- |
| **Symptom** | The script exits before uploading anything. |
| **Possible cause** | A protected file appeared in the deploy list: `index.html`, `about.html`, `home.html` or `config.php`. |
| **Developer action** | **This guard is correct. Do not remove it.** Take the file out of the deploy list. |
| **Rollback needed?** | No, nothing was uploaded. |

### 14.3 The cache version check fails

| | |
| --- | --- |
| **Symptom** | `node qa/check-cache-versions.js` exits with code 1. |
| **Possible cause** | A file's contents changed without its `?v=` being bumped, or a shared file carries different versions on different pages. |
| **Developer action** | Bump the version in every HTML file that references it, above the highest number ever used. Re-run. Use `--reset` only after an intentional, correctly bumped change. |
| **Rollback needed?** | No, if caught before deploying. |

### 14.4 The site breaks for some users only after a deployment

| | |
| --- | --- |
| **Symptom** | Some visitors see errors, others do not. |
| **Possible cause** | Cached stale files. Some browsers hold the old version, and the CDN caches by full URL including the query string, so a reused `?v=` serves stale content at the edge. |
| **Safe check** | Reproduce in a private window, and on a device that has never visited the site. |
| **Developer action** | Bump the affected version numbers **above the previous high water mark** and redeploy. Purge the CDN cache if available. |
| **Rollback needed?** | Consider it if customers are affected. |

### 14.5 The site breaks immediately after a deployment

| | |
| --- | --- |
| **Symptom** | Errors on the public site or the admin. |
| **Developer action** | **Roll back first, diagnose afterwards.** Use the pre-deployment backup in `ftp_backup/<timestamp>_predeploy/`. `deploy_rebond_public.sh` prints the exact rollback loop at the end of its run. If a migration was applied, roll back the files first, then the database. |
| **Rollback needed?** | **Yes.** |

### 14.6 An admin page errors after a deployment

| | |
| --- | --- |
| **Symptom** | A new or updated admin page fails. |
| **Possible cause** | A required database migration was not applied to the live database before the code was uploaded. |
| **Developer action** | Apply the migration through phpMyAdmin, in the documented order. Confirm which migrations are actually live before deploying, see section 7.3 of [03_TECHNICAL_HANDOVER.md](03_TECHNICAL_HANDOVER.md). |
| **Rollback needed?** | Not usually. Applying the migration is normally the fix. |

---

## Escalation

| Severity | Examples | Response |
| --- | --- | --- |
| **Critical** | The site is down. The database is unreachable. A security incident. Customer data exposed. | Contact the developer immediately. Do not attempt a fix. |
| **High** | Enquiries not saving. The admin is unusable. Styling broken sitewide. | Same day. |
| **Medium** | One product page wrong. A document will not upload. A filter behaving oddly. | Next working day. |
| **Low** | A typographical error. A missing translation. A cosmetic issue. | Batch into the next scheduled change. |

Always report using the issue template in Appendix F of
[01_YEE_LIM_WEBSITE_HANDOVER_GUIDE.md](01_YEE_LIM_WEBSITE_HANDOVER_GUIDE.md), and remove
any customer personal data from screenshots before sending them.
