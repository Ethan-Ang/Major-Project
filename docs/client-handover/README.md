# Project ReBond, Client Handover Documentation

This folder is the complete handover pack for the **Yee Lim Adhesives Industries Pte Ltd**
website built under **Project ReBond**.

If you are reading this for the first time, open
[00_READ_ME_FIRST.md](00_READ_ME_FIRST.md).

---

## 1. What is in this folder

| File | Audience | Purpose |
| --- | --- | --- |
| [00_READ_ME_FIRST.md](00_READ_ME_FIRST.md) | Everyone | One page. Where to start, what to read, what is still outstanding. |
| [01_YEE_LIM_WEBSITE_HANDOVER_GUIDE.md](01_YEE_LIM_WEBSITE_HANDOVER_GUIDE.md) | Yee Lim staff (primary) | **The main handover manual.** Consolidates everything the client needs. |
| [02_ADMIN_USER_GUIDE.md](02_ADMIN_USER_GUIDE.md) | Yee Lim staff | Task by task instructions for the admin portal. |
| [03_TECHNICAL_HANDOVER.md](03_TECHNICAL_HANDOVER.md) | Developer / vendor | Architecture, file map, APIs, database, environment, testing. |
| [04_CONTENT_AND_PRODUCT_DATA_GUIDE.md](04_CONTENT_AND_PRODUCT_DATA_GUIDE.md) | Yee Lim staff | Approved wording, field rules, product entry checklist. |
| [05_BACKUP_DEPLOYMENT_AND_ROLLBACK_GUIDE.md](05_BACKUP_DEPLOYMENT_AND_ROLLBACK_GUIDE.md) | Mixed | Backups (client safe) and deployment / rollback (developer only). |
| [06_SECURITY_AND_ACCESS_GUIDE.md](06_SECURITY_AND_ACCESS_GUIDE.md) | Mixed | Account ownership, password policy, responsibility matrix. |
| [07_TROUBLESHOOTING_GUIDE.md](07_TROUBLESHOOTING_GUIDE.md) | Mixed | Symptom, cause, safe check, safe action, developer action. |
| [08_FINAL_HANDOVER_CHECKLIST.md](08_FINAL_HANDOVER_CHECKLIST.md) | Both parties | Sign off checklist for the handover meeting. |
| [09_CREDENTIALS_TRANSFER_TEMPLATE.md](09_CREDENTIALS_TRANSFER_TEMPLATE.md) | Both parties | Placeholders only. No password is ever written here. |
| [10_CHANGE_LOG_TEMPLATE.md](10_CHANGE_LOG_TEMPLATE.md) | Whoever changes the site | Record of every change made after handover. |
| [11_SUPPORT_AND_MAINTENANCE_SCHEDULE.md](11_SUPPORT_AND_MAINTENANCE_SCHEDULE.md) | Mixed | Recommended weekly, monthly, quarterly and annual routine. |
| [screenshots/](screenshots/) | Everyone | Interface screenshots referenced from the guides. |

---

## 2. How to read this pack

- **Yee Lim staff**: read `01`, then keep `02` and `04` open while you work.
- **A developer taking over**: read `03` first, then `05` and `06`.
- **At the handover meeting**: work through `08`, and fill in `09`.

---

## 3. Accuracy labels used throughout

Every statement in this pack carries one of these meanings. Where a claim could not
be proven from the repository or from local testing, it is marked explicitly.

| Label | Meaning |
| --- | --- |
| *(Verified from code)* | Read directly out of the current repository source. |
| *(Verified by local testing)* | Confirmed by running the site locally on 29 July 2026. |
| *(Project decision)* | A choice made during the project, recorded in project notes. |
| `[CLIENT TO CONFIRM]` | Yee Lim must supply or confirm this before it is treated as fact. |
| `[DEVELOPER TO VERIFY]` | Needs checking against the live server before it is relied on. |
| *(Recommendation)* | Advice, not something the site already does automatically. |

---

## 4. What this pack deliberately does not contain

- No passwords, database credentials, API keys or tokens.
- No live customer names, emails, phone numbers or enquiry messages.
- No screenshots of production personal data. Every screenshot was taken against
  a local development copy using test records only.

---

*Prepared for Yee Lim Adhesives Industries Pte Ltd, Project ReBond.*
