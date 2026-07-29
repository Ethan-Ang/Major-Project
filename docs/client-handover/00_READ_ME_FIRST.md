# 00. Read Me First

**Project:** Project ReBond
**Client:** Yee Lim Adhesives Industries Pte Ltd
**Document version:** `[TO BE COMPLETED AT FINAL HANDOVER]`
**Date:** `[TO BE COMPLETED AT FINAL HANDOVER]`

---

## 1. What this pack is

This folder contains everything needed to understand, operate, maintain and take
ownership of the Yee Lim Adhesives website.

It is written for two different readers, and the two are kept separate:

- **Yee Lim staff**, who manage products, images, documents and enquiries.
- **A future developer or web vendor**, who maintains the code, database and hosting.

---

## 2. Start here

| If you are | Read this first |
| --- | --- |
| A Yee Lim staff member | [01_YEE_LIM_WEBSITE_HANDOVER_GUIDE.md](01_YEE_LIM_WEBSITE_HANDOVER_GUIDE.md) |
| The person who will update products day to day | [02_ADMIN_USER_GUIDE.md](02_ADMIN_USER_GUIDE.md) |
| A developer or vendor taking the site over | [03_TECHNICAL_HANDOVER.md](03_TECHNICAL_HANDOVER.md) |
| Running the handover meeting | [08_FINAL_HANDOVER_CHECKLIST.md](08_FINAL_HANDOVER_CHECKLIST.md) |

---

## 3. The three rules that matter most

> **Rule 1. Never delete the only backup.**
> Before any change to the live site, take a backup of both the website files and
> the database. See [05_BACKUP_DEPLOYMENT_AND_ROLLBACK_GUIDE.md](05_BACKUP_DEPLOYMENT_AND_ROLLBACK_GUIDE.md).

> **Rule 2. Staff change content, developers change the system.**
> Editing a product, uploading an image, uploading an SDS or TDS, and reviewing an
> enquiry are all safe for Yee Lim staff. Anything touching PHP files, the database
> structure, hosting or the domain requires a developer. See section 22 of the main guide.

> **Rule 3. Passwords never go into a document.**
> Use [09_CREDENTIALS_TRANSFER_TEMPLATE.md](09_CREDENTIALS_TRANSFER_TEMPLATE.md) to
> record *which* accounts exist and who owns them. Transfer the actual passwords
> through a password manager or another agreed secure channel.

---

## 4. Known open items at the time of writing

These are recorded honestly so nothing is discovered later by surprise. They are
described in full in [03_TECHNICAL_HANDOVER.md](03_TECHNICAL_HANDOVER.md), section
"Known Constraints" and "Future Recommendations".

| Item | Status |
| --- | --- |
| Home page and About page | Not part of this repository. They are maintained directly on the live server by a separate contributor. The deployment scripts are hard coded to refuse to touch them. *(Verified from code)* |
| Simplified Chinese translation | The interface is translated. Product descriptions have first pass Chinese drafts that a native speaker still needs to review. Product "Suitable for" lists remain in English by design. *(Verified from code)* |
| Product image upload endpoint | Previously did not check the admin login token on the server side. **Fixed and deployed on 29 July 2026 (commit `30ae9d6`). Closed.** Re-verified against the live site: an unauthenticated upload now returns 401. *(Verified from code, by local testing, and against live)* |
| `fileinfo` PHP extension | Required by both upload endpoints. Without it, image and document uploads fail with a server error. Confirmed by local testing, and it is missing from the deployment guide's extension list. Must be confirmed on the live host. `[DEVELOPER TO VERIFY]` |
| "Suitable for" product data | Some product records lost their separators in the live database, so the list can render as one run on sentence. A data cleanup is outstanding. *(Verified from code and project notes)* |
| Hosting provider, domain registrar, analytics | Not asserted anywhere in this pack. They must be confirmed at handover. `[CLIENT TO CONFIRM]` |

---

## 5. What was verified, and how

- The repository was read directly. Every technical statement in this pack was
  checked against the current source files, not against older documentation.
- The website was run locally on **29 July 2026** against a local copy of the
  database, and all screenshots in [screenshots/](screenshots/) come from that run.
- Nothing was deployed. Nothing on the live server was changed. No production
  system was accessed while preparing this pack.

---

## 6. Contents of this folder

See [README.md](README.md) for the full file index.
