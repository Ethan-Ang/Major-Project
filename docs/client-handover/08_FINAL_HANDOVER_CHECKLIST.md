# 08. Final Handover Checklist

**Project ReBond, Yee Lim Adhesives Industries Pte Ltd**

Work through this together at the handover meeting. Tick each item only when it has been
**demonstrated**, not merely described.

**Handover date:** `[TO BE COMPLETED]`
**Location or meeting link:** `[TO BE COMPLETED]`
**Present:** `[TO BE COMPLETED]`

---

## 1. Website functionality

- [ ] The live website loads over `https` with a valid certificate
- [ ] Home page loads correctly and is unchanged
- [ ] About page loads correctly and is unchanged
- [ ] Products catalogue loads and shows the expected number of products
- [ ] Search returns sensible results for a real product name and for a keyword
- [ ] All four filter groups work: Product Type, Brand, Industry, Surface / Material
- [ ] Active filter chips and **Clear all** work
- [ ] Sorting works: Default, Name A to Z, Name Z to A, Sort by Brand
- [ ] Yee Lim Bond Finder returns ranked results for two surfaces
- [ ] Bond Finder disclaimer is present
- [ ] Product Advisor opens and answers a product question and a company question
- [ ] Product Advisor disclaimer "Guidance only. Our team confirms suitability." is present
- [ ] Product detail page: gallery, summary, all three tabs
- [ ] Availability wording reads `Available` with `Pricing & lead time confirmed on enquiry`
- [ ] Compare works with three products, and refuses a fourth
- [ ] Compare disclaimer is present
- [ ] Product Enquiry basket adds and removes products correctly
- [ ] Contact page shows correct details, hours and map
- [ ] The 404 page appears for an unknown address and offers a route back

## 2. Admin functionality

- [ ] Admin sign in works
- [ ] Dashboard loads with correct product and enquiry totals
- [ ] Product Analytics panel shows data, not an "not initialised" note
- [ ] Products list loads, searches, sorts and paginates
- [ ] Adding a product works end to end
- [ ] Editing a product works end to end
- [ ] Marking a product Available and Unavailable works, individually and in bulk
- [ ] Deleting a test product works, and the warning is understood
- [ ] Export CSV from the Products page works
- [ ] Enquiries list loads, searches and filters by status
- [ ] Enquiry detail panel opens and shows the products enquired about
- [ ] Mark as Replied works from the admin
- [ ] Mark all replied works
- [ ] Export CSV from the Enquiries page works
- [ ] Document Downloads page loads
- [ ] Catalogue Filters: add, rename, reorder, archive and the delete refusal all demonstrated
- [ ] Site Settings loads and saves
- [ ] Sign out works and ends the session

## 3. Product data

- [ ] The live product count matches Yee Lim's expectation: `[TO BE COMPLETED]`
- [ ] Every product has a short description
- [ ] Every product has a main image, or a documented reason it does not
- [ ] Every product has at least one industry and one surface tagged
- [ ] Brand names are correct, including the trademark marks
- [ ] Availability status is correct for every product
- [ ] Application Method and Available Sizes appear as their own specification rows where
      that data exists
- [ ] "Suitable for" lists are properly separated, not run together
- [ ] No unsupported technical or regulatory claim appears anywhere
- [ ] Catalogue Filters values contain no near duplicates

## 4. Enquiries

- [ ] A test enquiry submitted from the live public site appears in the admin inbox
- [ ] The reference number format `YL-YYYY-NNNN` is shown to the customer
- [ ] The notification email reaches the Yee Lim team
- [ ] The one tap "mark as replied" link in that email works
- [ ] The customer confirmation email is received
- [ ] The **Enquiry Recipient Email** in Site Settings is correct, or deliberately blank
- [ ] Reply by Email opens correctly addressed
- [ ] All test enquiries created during handover have been deleted

## 5. Images and documents

- [ ] Product images display on the catalogue, the detail gallery and on mobile
- [ ] Image upload demonstrated with a real file
- [ ] The 5 MB and format limits are understood
- [ ] SDS upload demonstrated
- [ ] TDS upload demonstrated
- [ ] The 10 MB PDF only limit is understood
- [ ] Replacing an SDS or TDS is understood to overwrite the previous one automatically
- [ ] The public download gate works end to end and the correct PDF arrives
- [ ] It is understood that download links are single use and expire in about 15 minutes
- [ ] The download record appears in Document Downloads
- [ ] The protected upload components are identified, and the requirement to preserve them
      is understood

## 6. Contact and WhatsApp

- [ ] Contact email is correct
- [ ] WhatsApp number is correct, digits only with the country code
- [ ] Phone display is correct
- [ ] Address is correct
- [ ] WhatsApp buttons tested from a real phone, footer, Contact page, product page and
      Bond Finder
- [ ] Business hours are correct
- [ ] The map points to the correct location
- [ ] The response time wording is agreed and consistent across the site and both emails

## 7. Translation

- [ ] The language switch is visible in the header on desktop and on mobile
- [ ] Switching to Chinese translates the interface on every public page
- [ ] The language choice persists across pages and after a reload
- [ ] It is understood that the Chinese product text is a **first pass draft awaiting
      native speaker review**
- [ ] It is understood that "Suitable for" lists remain in English by design
- [ ] It is understood that new products need a developer to add their Chinese text
- [ ] A plan and owner for the Chinese review is agreed: `[TO BE COMPLETED]`

## 8. Mobile

Tested on a real device, not only a desktop preview.

- [ ] Catalogue, cards two per row
- [ ] Mobile filter sheet opens, applies and closes
- [ ] Language switch visible in the header
- [ ] Product detail accordion works
- [ ] Sticky action bar works
- [ ] Back to Products restores the previous catalogue state
- [ ] Compare sheet and picker work
- [ ] Enquiry form is usable, and tapping a field does **not** zoom the page
- [ ] Contact page and WhatsApp button work
- [ ] No horizontal scrolling on any page
- [ ] Device and browser used: `[TO BE COMPLETED]`

## 9. Desktop

- [ ] Tested in at least two browsers: `[TO BE COMPLETED]`
- [ ] No JavaScript errors in the browser console on any public page
- [ ] No failed network requests other than ones deliberately triggered
- [ ] Layout correct at 1440 pixels and at a narrower laptop width

## 10. Accessibility

- [ ] Keyboard navigation works through the catalogue, filters and forms
- [ ] Product detail tabs are reachable and operable by keyboard, including arrow keys
- [ ] Visible focus outlines are present on interactive controls
- [ ] Adding a product to the enquiry basket is announced to assistive technology
- [ ] It is understood that there is **no formal WCAG conformance statement** and no
      automated accessibility test suite `[DEVELOPER TO VERIFY]`
- [ ] Any accessibility requirement Yee Lim must meet is recorded: `[CLIENT TO CONFIRM]`

## 11. Security

- [ ] Admin password changed by Yee Lim after transfer
- [ ] Hosting password changed
- [ ] Domain registrar password changed
- [ ] Database password changed, or confirmed as newly created for Yee Lim
- [ ] Any temporary FTP account deleted
- [ ] Two factor authentication enabled on hosting, domain, Git and email where available
- [ ] The list of people holding admin access is recorded
- [ ] It is understood that every admin account has **full** rights, with no roles
- [ ] It is understood that there is **no self service password change** in the admin
- [ ] The known security gaps in [06_SECURITY_AND_ACCESS_GUIDE.md](06_SECURITY_AND_ACCESS_GUIDE.md)
      section 16 have been reviewed, in particular the unauthenticated image upload endpoint
- [ ] A remediation date for that endpoint is agreed: `[TO BE COMPLETED]`
- [ ] SSL confirmed active, and the HTTPS redirect enabled or scheduled

## 12. Backups

- [ ] A full website file backup has been taken and downloaded
- [ ] A full database export has been taken and downloaded
- [ ] Both have been confirmed non empty and readable
- [ ] The backup includes the `uploads` folder
- [ ] The backup storage location is agreed and is **not** the web server: `[TO BE COMPLETED]`
- [ ] The backup schedule is agreed
- [ ] Yee Lim has been shown how to take a backup themselves
- [ ] A restore test has been performed, or is scheduled: `[TO BE COMPLETED]`

## 13. Hosting

- [ ] Hosting provider identified: `[TO BE COMPLETED]`
- [ ] Hosting account registered to Yee Lim
- [ ] Control panel access transferred and tested by Yee Lim
- [ ] Renewal date recorded: `[TO BE COMPLETED]`
- [ ] PHP version confirmed as 8.0 or later, with `pdo_mysql`, `mbstring`, `curl`, `json`
      and `fileinfo` enabled
- [ ] Billing arrangement agreed

## 14. Domain

- [ ] Domain registrar identified: `[TO BE COMPLETED]`
- [ ] Domain registered to Yee Lim, using a company email address that outlives any individual
- [ ] Registrar access transferred and tested by Yee Lim
- [ ] Expiry date recorded: `[TO BE COMPLETED]`
- [ ] Auto renewal confirmed or a calendar reminder set
- [ ] DNS records documented

## 15. Source code

- [ ] The full source code has been delivered
- [ ] Git repository access transferred
- [ ] The branch containing the current live code is identified: `[TO BE COMPLETED]`
- [ ] It is understood that `frontend/api/config.php` is **not** in the repository and
      lives only on the server
- [ ] It is understood that the Home and About pages are **not** in the repository
- [ ] The database schema and migration files have been delivered
- [ ] The deployment scripts have been delivered and explained
- [ ] Any outstanding uncommitted work is identified and its status agreed: `[TO BE COMPLETED]`

## 16. Documentation

- [ ] This complete documentation pack has been delivered
- [ ] Every `[TO BE COMPLETED]` placeholder in the pack has been filled in
- [ ] Every `[CLIENT TO CONFIRM]` item has been confirmed or has an owner and a date
- [ ] Every `[DEVELOPER TO VERIFY]` item has been verified or has an owner and a date
- [ ] The known open items in [00_READ_ME_FIRST.md](00_READ_ME_FIRST.md) have been reviewed
- [ ] The Future Recommendations in [03_TECHNICAL_HANDOVER.md](03_TECHNICAL_HANDOVER.md)
      section 13 have been reviewed, and the Urgent items scheduled

## 17. Training

- [ ] Adding and editing a product, demonstrated by Yee Lim staff unaided
- [ ] Uploading an image, demonstrated unaided
- [ ] Uploading an SDS or TDS, demonstrated unaided
- [ ] Reviewing and marking an enquiry, demonstrated unaided
- [ ] Updating Site Settings, demonstrated unaided
- [ ] Managing Catalogue Filters, demonstrated unaided
- [ ] Taking a backup, demonstrated unaided
- [ ] The boundary between staff tasks and developer tasks is understood
      (main guide, section 22)
- [ ] Trained staff: `[TO BE COMPLETED]`
- [ ] Training date: `[TO BE COMPLETED]`

## 18. Client approval

- [ ] Yee Lim confirms the website meets the agreed scope
- [ ] Outstanding issues are listed below with owners and dates
- [ ] The support period and maintenance arrangement are agreed
- [ ] Both parties have signed below

---

## Outstanding issues at handover

| # | Issue | Owner | Agreed resolution date | Status |
| --- | --- | --- | --- | --- |
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

---

## Agreed support period

| Item | Detail |
| --- | --- |
| Support start date | `[TO BE COMPLETED]` |
| Support end date | `[TO BE COMPLETED]` |
| What is included | `[TO BE COMPLETED]` |
| What is excluded | `[TO BE COMPLETED]` |
| Response times | `[TO BE COMPLETED]` |
| Contact method | `[TO BE COMPLETED]` |
| Cost and billing | `[TO BE COMPLETED]` |

---

## Sign off

**Client representative**

| Field | Entry |
| --- | --- |
| Name | `[TO BE COMPLETED]` |
| Position | `[TO BE COMPLETED]` |
| Organisation | Yee Lim Adhesives Industries Pte Ltd |
| Signature | |
| Date | `[TO BE COMPLETED]` |

**Project representative**

| Field | Entry |
| --- | --- |
| Name | `[TO BE COMPLETED]` |
| Position | `[TO BE COMPLETED]` |
| Organisation | `[TO BE COMPLETED]` |
| Signature | |
| Date | `[TO BE COMPLETED]` |

---

*By signing, both parties confirm that the items ticked above were demonstrated and
accepted, and that the outstanding issues listed above are the complete set of known open
items at the date of handover.*
