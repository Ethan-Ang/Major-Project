# 02. Admin User Guide

**Project ReBond, Yee Lim Adhesives Industries Pte Ltd**

A task by task guide to the admin portal. Every task follows the same shape:
**Objective, Before You Start, Steps, Expected Result, Common Mistakes, When to Ask for
Help.**

For background on what each field means, see
[01_YEE_LIM_WEBSITE_HANDOVER_GUIDE.md](01_YEE_LIM_WEBSITE_HANDOVER_GUIDE.md),
section 6, and [04_CONTENT_AND_PRODUCT_DATA_GUIDE.md](04_CONTENT_AND_PRODUCT_DATA_GUIDE.md).

> All screenshots in this guide were taken on a local development copy using test data.
> No real customer information appears anywhere.

---

## Contents

1. [Logging in](#1-logging-in)
2. [Dashboard overview](#2-dashboard-overview)
3. [Adding a product](#3-adding-a-product)
4. [Editing a product](#4-editing-a-product)
5. [Changing product availability](#5-changing-product-availability)
6. [Deleting a product](#6-deleting-a-product)
7. [Uploading product images](#7-uploading-product-images)
8. [Uploading an SDS or TDS](#8-uploading-an-sds-or-tds)
9. [Reviewing an enquiry](#9-reviewing-an-enquiry)
10. [Replying to an enquiry and marking it replied](#10-replying-to-an-enquiry-and-marking-it-replied)
11. [Exporting enquiries](#11-exporting-enquiries)
12. [Deleting an enquiry](#12-deleting-an-enquiry)
13. [Reviewing document download records](#13-reviewing-document-download-records)
14. [Managing catalogue filter values](#14-managing-catalogue-filter-values)
15. [Updating contact details in Site Settings](#15-updating-contact-details-in-site-settings)
16. [Exporting the product list](#16-exporting-the-product-list)
17. [Logging out](#17-logging-out)
18. [Common errors and what they mean](#18-common-errors-and-what-they-mean)

---

## 1. Logging in

![Admin login](screenshots/admin-login.png)
*Screenshot A1. The admin sign in page.*

### Objective
Get into the admin portal.

### Before You Start
- You have the admin web address, username and password from the handover.
- You are on a private computer, not a shared public one.

### Steps
1. Open the live website address in your browser.
2. Add `/admin/login.html` to the end of the address and press Enter.
3. Type the username.
4. Type the password.
5. Select **Sign In**.

### Expected Result
The dashboard opens, showing product and enquiry totals, and your username appears at
the bottom left of the sidebar.

### Common Mistakes
- Extra spaces copied in with the password.
- Caps Lock is on.
- Trying repeatedly after a failure. After **ten failed attempts within fifteen
  minutes** from the same internet connection, the login is temporarily blocked and
  will tell you how long to wait. Waiting is the fix, not trying harder.

### When to Ask for Help
- The password is definitely correct and still rejected.
- The page shows a connection or server error rather than "Invalid username or password".
- You need the password reset. There is no self service reset screen; a developer does it.

> **Note.** Your sign in lasts 24 hours. After that you will be asked to sign in again.

---

## 2. Dashboard overview

![Admin dashboard](screenshots/admin-dashboard.png)
*Screenshot A2. The dashboard. Test data shown.*

### Objective
Understand the state of the site at a glance.

### What each part means

| Panel | Meaning |
| --- | --- |
| **Total Products** | Every product in the catalogue. |
| **Available** | How many are currently marked Available. |
| **New Enquiries, 7d** | Enquiries received in the last seven days. |
| **New Leads** | Enquiries still marked New, that is, not yet replied to. This is your to do list. |
| **Enquiries chart** | Leads received over the last seven days. |
| **Catalogue** | Product count by category. |
| **Product Analytics** | Most viewed products and the view trend over the last 30 days. Views made while signed in as an admin are excluded, so your own checking does not inflate the numbers. |

### Common Mistakes
Treating "New Leads" as "unread". It means "not yet marked as replied". If someone
replies by email without marking it, the count stays high.

### When to Ask for Help
The Product Analytics panel shows a message that analytics are not initialised. That
means a database table has not been created on the server yet, which is a developer task.

---

## 3. Adding a product

![Product form](screenshots/admin-product-edit.png)
*Screenshot A3. The product form. The Add form is identical, but empty.*

### Objective
Publish a new product to the public catalogue.

### Before You Start
- Product name, exactly as it should appear, including the brand and trademark mark.
- A short description, one factual sentence.
- The main product photograph, as JPG, PNG or WEBP, under 5 MB.
- Optionally the SDS and TDS as PDFs, under 10 MB each.
- The industries, surfaces, features and sizes information.
- The pre publish checklist in
  [04_CONTENT_AND_PRODUCT_DATA_GUIDE.md](04_CONTENT_AND_PRODUCT_DATA_GUIDE.md).

### Steps
1. Select **Products** in the sidebar.
2. Select **Add Product** at the top right.
3. Fill in the required fields, marked with an asterisk:
   - **Product Name**
   - **Category**: Industrial, Commercial or Others
   - **Short Description**
4. Fill in the optional fields:
   - **Brand**: choose the official brand.
   - **Product Type**: Adhesives, or Spray Guns & Accessories.
   - **Industries**: comma separated, for example `Carpentry, Flooring`.
   - **Surfaces**: comma separated, for example `Wood, Laminates`.
   - **Features**: comma separated. Use the exact prefixes so they land in the right
     rows on the public page:
     - `Application: Brush or Roll` becomes the **Application Method** row.
     - `Available in 300G, 1 US Gallon` becomes the **Available Sizes** row.
     - Anything else, for example `Liquid, Yellow`, becomes the **Characteristics** row.
   - **Full Description**
   - **How to Use**: the application instructions, then
     `Suitable for: use one; use two; use three.`
5. Under **Product Images**, select **Choose main image** and pick the main photograph.
6. Optionally select **Choose additional images** and pick the gallery photographs.
7. Under **Product Documents**, optionally attach the SDS PDF and the TDS PDF.
8. Select **Save Product**.

### Expected Result
- The modal closes and a confirmation appears.
- The new product is in the list and the **Total Products** count has increased.
- The product is created as **Available**.
- Opening the public catalogue in another tab shows the product.

### Common Mistakes
- Leaving **Short Description** empty. Saving is refused.
- Writing "Applied by brush" instead of `Application: Brush or Roll`, so it does not
  become a labelled specification row.
- Writing "Sizes: 300G" instead of `Available in 300G`, with the same result.
- Typing an industry or surface that does not match the values in **Catalogue Filters**.
  Add it there first, then tag the product.
- Uploading a photograph over 5 MB, or a document that is not a real PDF.
- Forgetting to check the public page afterwards.

> **Note.** The first letter of the product name, category and the description fields is
> automatically capitalised on save.

### When to Ask for Help
- The save fails with a message you do not recognise.
- The product saves but does not appear on the public site after a hard refresh
  (`Ctrl` + `F5`, or `Cmd` + `Shift` + `R` on a Mac).

---

## 4. Editing a product

### Objective
Correct or improve an existing product record.

### Before You Start
Know exactly what you are changing, and why. Record it in
[10_CHANGE_LOG_TEMPLATE.md](10_CHANGE_LOG_TEMPLATE.md) if it is a significant change.

### Steps
1. Select **Products**.
2. Find the product. Use the search box at the top of the table, or the page size and
   pagination controls, or select a column heading to sort.
3. Select the **edit** icon on that row.
4. Change what you need.
5. Select **Save Product**.

### Expected Result
The change appears in the list, and on the public product page after a refresh.

### Common Mistakes
- Editing the wrong product because two names are similar. Check the name in the form
  header before saving.
- Expecting a Chinese description to update. It will not. Chinese product text is
  maintained separately by a developer, see section 13 of the main guide.
- Assuming the change is not live because the browser is showing a cached page.

### When to Ask for Help
The edit saves but the public page still shows the old text after a hard refresh on two
different devices.

---

## 5. Changing product availability

### Objective
Mark a product Available or Unavailable, without deleting it.

### Before You Start
Nothing. This is a one click change and is fully reversible.

### Steps

**For one product:**
1. Select **Products**.
2. Find the row.
3. Select the availability toggle icon in the Actions column.

**For several products:**
1. Tick the boxes beside the products.
2. In the bar that appears, select **Mark Available** or **Mark Unavailable**.

### Expected Result
The status badge changes colour and text immediately, and the Available count at the
top updates.

### Common Mistakes
Looking for a status control inside the edit form. There is none. Availability is
changed only from the list.

### When to Ask for Help
The badge changes but reverts when you reload the page. That indicates the change did
not save on the server.

---

## 6. Deleting a product

> **Warning.** Deleting is permanent. It also permanently deletes that product's
> uploaded images and its SDS and TDS documents from the server. There is no undo.

### Objective
Remove a product that should never have existed.

### Before You Start
- Ask whether **Mark Unavailable** would do instead. In almost every case it would.
- Take a backup if the record matters. See
  [05_BACKUP_DEPLOYMENT_AND_ROLLBACK_GUIDE.md](05_BACKUP_DEPLOYMENT_AND_ROLLBACK_GUIDE.md).

### Steps
1. Select **Products**.
2. Find the row and select the **delete** icon.
3. Read the product name in the confirmation dialog and check it is the right one.
4. Select **Delete Product**.

### Expected Result
The product disappears from the list and from the public catalogue.

### Common Mistakes
- Deleting a discontinued product instead of marking it Unavailable, which destroys its
  photographs and data sheets as well.
- Using **Delete Selected** in the bulk bar without checking which rows are ticked.

### Safe Recovery
Only by restoring a backup taken **before** the deletion, which is a developer task.
If there is no such backup, the product and its files cannot be recovered.

### When to Ask for Help
Immediately, if you deleted something by accident. The sooner you ask, the more likely
a recent backup still contains it.

---

## 7. Uploading product images

![Image upload area](screenshots/admin-image-upload.png)
*Screenshot A4. The Product Images area.*

### Objective
Give a product its catalogue photograph and gallery images.

### Before You Start
- Files are JPG, PNG or WEBP.
- Each file is under **5 MB**.
- The photograph is one Yee Lim is happy to publish.

### Steps
1. Open the product for editing, or start a new product.
2. Scroll to **Product Images**.
3. Select **Choose main image** and pick one file. This is the photograph shown on the
   product card and first in the gallery.
4. Optionally select **Choose additional images** and pick several files at once. These
   fill the rest of the gallery on the product detail page.
5. Select **Save Product**.

### Expected Result
A preview appears for the main image and each additional image before saving, and the
photographs appear on the public product page after saving.

### Common Mistakes
- Uploading a `.gif`, `.bmp`, `.tif` or `.heic` file. Only JPG, PNG and WEBP are
  accepted, and the check looks at the real file content, not the file name.
- Uploading a photograph straight from a phone camera at 8 MB or more. Resize it first.
- Expecting to reorder the gallery. There is no reorder control; re upload in the order
  you want.
- Expecting to delete one gallery image. There is no per image delete control.
- Expecting to type alternative text. There is no such field; the product name is used.

### When to Ask for Help
- You need a single gallery image removed.
- A valid file under 5 MB is still rejected.

---

## 8. Uploading an SDS or TDS

![Document upload area](screenshots/admin-document-upload.png)
*Screenshot A5. The Product Documents area.*

### Objective
Publish the Safety Data Sheet or Technical Data Sheet for a product.

### Before You Start
- The file is a genuine **PDF**, under **10 MB**.
- The document is the current approved version. `[CLIENT TO CONFIRM]` who approves it.

### Steps
1. Open the product for editing.
2. Scroll to **Product Documents**.
3. For the SDS: select **Choose or drop SDS PDF** and pick the file, or drag the file
   onto the area.
4. For the TDS: select **Choose or drop TDS PDF** and do the same.
5. Select **Save Product**.

### Expected Result
- The document name appears in the preview area.
- The public product page **Downloads** tab now offers that document.

### Common Mistakes
- Trying to delete the old file first. You do not need to. Uploading a new SDS replaces
  the old SDS automatically, and the old file is removed from the server. The same
  applies to the TDS.
- Uploading a Word document renamed to `.pdf`. It is rejected, because the check reads
  the real file content.
- Uploading a scanned image saved as a PDF that is over 10 MB.
- Forgetting to test the download afterwards.

### How to test the download
1. Open the public product page.
2. Go to the **Downloads** tab and select the document.
3. Fill the short form with your own name, work email and company.
4. Confirm the correct PDF downloads.
5. The download link works **once** and expires after about **15 minutes**. If you need
   it again, request it again.

### When to Ask for Help
- A genuine PDF under 10 MB is rejected.
- The Downloads tab still shows no documents after saving and refreshing.

---

## 9. Reviewing an enquiry

![Enquiries inbox](screenshots/admin-enquiries.png)
*Screenshot A6. The Enquiries inbox, filtered to test records.*

### Objective
Read a customer enquiry and everything they asked about.

### Before You Start
Nothing.

### Steps
1. Select **Enquiries**.
2. Optionally narrow the list:
   - Type in the search box to search across the enquiries.
   - Use the status filter to show All, New, or Replied.
3. Select the enquiry row.
4. Read the side panel: name, company, email, phone, message, the products enquired
   about, the reference number and the date.

### Expected Result
You have everything needed to reply, including the exact product list the customer
selected.

### Common Mistakes
- Missing older enquiries because a search term is still in the box.
- Reading only the message and missing the product list, which is usually the point of
  the enquiry.

### When to Ask for Help
The list does not load, or shows a connection error.

---

## 10. Replying to an enquiry and marking it replied

### Objective
Respond to the customer and clear the enquiry from the New list.

### Before You Start
Have the answer ready: product recommendation, price, minimum order quantity, lead time.

### Steps

**Option A, from the admin:**
1. Open the enquiry.
2. Select **Reply by Email**. Your email program opens, addressed to the customer.
3. Send your reply.
4. Return to the admin and select **Mark as Replied**.

**Option B, from the notification email:**
1. Reply directly to the notification email. It is set to reply to the customer, so
   your reply reaches them.
2. Select the "mark this enquiry as done" link at the bottom of that email. It marks
   the enquiry as replied without signing in.

**To clear a backlog:** use **Mark all replied** on the Enquiries page.

### Expected Result
The enquiry moves from **New** to **Replied**, and the New Leads count drops.

### Common Mistakes
- Replying but not marking it, so the New count never falls and the real backlog becomes
  invisible.
- Using **Mark all replied** before actually replying to them all.

### When to Ask for Help
The status will not change, or changes and then reverts on reload.

---

## 11. Exporting enquiries

### Objective
Get the enquiry list into a spreadsheet.

### Before You Start
> **Warning.** The exported file contains customer personal data. Save it somewhere
> appropriate and do not email it outside the company.

### Steps
1. Select **Enquiries**.
2. Select **Export CSV** at the top right.
3. Open the downloaded file in your spreadsheet program.

### Expected Result
A `.csv` file downloads, containing the enquiry records.

### Common Mistakes
- Leaving the export in a Downloads folder on a shared computer.
- Expecting the export to respect the on screen search filter. Check the contents of the
  file before relying on it.

### When to Ask for Help
Nothing downloads, or the file will not open.

---

## 12. Deleting an enquiry

> **Warning.** Deleting an enquiry is permanent.

### Objective
Remove spam or test records.

### Before You Start
- Export to CSV first if there is any chance the record is needed.
- Agree an internal retention rule. See section 9.8 of the main guide.

### Steps
1. Select **Enquiries**.
2. Open the enquiry and confirm it is genuinely spam or a test.
3. Use the delete action and confirm.

### Expected Result
The enquiry disappears and the totals update.

### Common Mistakes
Deleting a real lead that looked like spam. Read it fully first.

### When to Ask for Help
You deleted a real enquiry. Ask immediately; recovery requires a backup taken before
the deletion.

---

## 13. Reviewing document download records

![Document downloads](screenshots/admin-document-downloads.png)
*Screenshot A7. Document Downloads, shown with no records.*

### Objective
See who requested an SDS or TDS.

### Before You Start
This data is personal data about site visitors. It is never emailed out and lives only
in the admin portal.

### Steps
1. Select **Document Downloads**.
2. Review the list: visitor name, contact details, product, document type and date.
3. To remove records, tick them and use **Delete selected**, or delete one at a time.

### Expected Result
You can see who has requested which data sheet, and when.

### Common Mistakes
Treating these as enquiries. They are not. A download record means someone wanted a
data sheet, not that they asked for a quotation.

### When to Ask for Help
The page shows an error rather than an empty state. That may mean a database table is
missing on the server.

---

## 14. Managing catalogue filter values

![Catalogue filters](screenshots/admin-catalogue-filters.png)
*Screenshot A8. The Catalogue Filters page.*

### Objective
Control which Product Types, Brands, Industries and Surfaces are offered in the public
filter sidebar.

### Before You Start
Decide the exact wording. The value you create is what customers will see.

### Steps
1. Select **Catalogue Filters**.
2. Choose the tab: **Product Types**, **Brands**, **Industries** or **Surfaces**.
3. To add: select **Add**, type the label, and save. For a brand you may also give a
   logo image path and its alternative text.
4. To rename: open the value, change the label, and save. **Every product using the old
   name is updated automatically**, so nothing disappears from the catalogue.
5. To reorder: change the sort order value.
6. To hide from the public sidebar but keep it assignable: turn off public visibility.
7. To retire a value completely: archive it.
8. To delete: only possible when no product is using the value. If a product is using
   it, the system refuses and tells you.

### Expected Result
The public filter sidebar reflects your change, with correct product counts.

### Common Mistakes
- Creating a near duplicate, for example `Flooring` and `Floors`, which splits the
  products across two filters.
- Deleting instead of archiving. Archiving is the safe way to retire a value.
- Renaming to fix a typo and worrying it will orphan products. It will not; the rename
  updates the products too.

### When to Ask for Help
A rename appears to have removed products from the catalogue.

---

## 15. Updating contact details in Site Settings

![Site settings](screenshots/admin-site-settings.png)
*Screenshot A9. The Site Settings page.*

### Objective
Change the contact details shown across the website.

### Before You Start
Have the correct values ready and agreed internally.

### Steps
1. Select **Site Settings**.
2. Update any of:
   - **Contact Email**: must be a valid email address.
   - **WhatsApp Number**: digits only, including the country code, no `+`, no spaces.
     For example `6588755786`.
   - **Phone (as displayed)**: how it is shown to visitors, for example `+65 8875 5786`.
   - **Address**: one line.
   - **Enquiry Recipient Email**: where new enquiry notifications are emailed. Leave
     blank to use the server default. This is never shown publicly.
3. Select **Save Changes**.
4. Open the public site and confirm the footer and Contact page show the new details.

### Expected Result
A confirmation appears, and the public site updates.

### Common Mistakes
- Typing `+65 8875 5786` into the **WhatsApp Number** field. It must be digits only.
  Use `6588755786`.
- Changing the phone display but not the WhatsApp number, so the two disagree.
- Expecting Site Settings to change the business hours or the map. It cannot; those
  require a developer.

### When to Ask for Help
The save is rejected and you cannot tell why, or the site still shows the old details
after a hard refresh.

---

## 16. Exporting the product list

### Objective
Get the catalogue into a spreadsheet, for stocktaking or review.

### Steps
1. Select **Products**.
2. Select **Export CSV** at the top right.

### Expected Result
A spreadsheet file downloads containing the product list.

### When to Ask for Help
Nothing downloads.

---

## 17. Logging out

### Objective
End your admin session safely.

### Steps
1. Select the sign out icon at the bottom left of the sidebar, next to your username.

### Expected Result
You are returned to the sign in page, and the session is ended on the server.

### Common Mistakes
Closing the browser tab without signing out on a shared computer. The session would
remain valid until it expires.

---

## 18. Common errors and what they mean

| Message you see | What it means | What to do |
| --- | --- | --- |
| "Invalid username or password." | The credentials do not match. | Re type carefully. Check Caps Lock. |
| "Too many login attempts. Please try again in about N minutes." | Ten failed attempts within fifteen minutes from your connection. | Wait the stated time. A successful sign in clears it. |
| "Invalid or expired session. Please sign in again." | Your 24 hour session ended. | Sign in again. |
| "Product name and short description are required." | A required field is empty. | Fill both in. |
| "Product name (max 200 characters) or short description (max 5000) is too long." | A field exceeds its limit. | Shorten it. |
| "Only JPG, PNG and WEBP images are allowed." | The image format is not supported, based on the real file content. | Convert to JPG, PNG or WEBP. |
| "Each image must be below 5MB." | The photograph is too large. | Resize or compress it. |
| "Only PDF documents are allowed" | The document is not a genuine PDF. | Re export it as a real PDF. |
| "File must be smaller than 10 MB" | The PDF is too large. | Compress it. |
| "Something went wrong on our end. Your details are fine, please try again shortly." | The website could not reach its database. | Do not retry repeatedly. Report it to your developer straight away. |
| "Something went wrong. Please try again later." | A server side problem was logged. | Report it, including what you were doing at the time. |
| "This download link has already been used." / "This download link has expired." | Data sheet links are single use and last about 15 minutes. | Request the document again from the product page. |
| "That document is not available." | No SDS or TDS is uploaded for that product. | Upload the document, see section 8. |
| Catalogue Filters refuses to delete a value | Products are still using it. | Archive it instead, or reassign those products first. |

---

## Getting help

When reporting a problem, use the issue reporting template in Appendix F of
[01_YEE_LIM_WEBSITE_HANDOVER_GUIDE.md](01_YEE_LIM_WEBSITE_HANDOVER_GUIDE.md). Include
the exact wording of any error message and a screenshot with any personal data removed.

For the full list of what staff may safely do and what needs a developer, see section 22
of the main guide.
