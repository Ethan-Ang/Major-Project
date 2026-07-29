# 11. Support and Maintenance Schedule

**Project ReBond, Yee Lim Adhesives Industries Pte Ltd**

> ## These are recommendations, not existing automated features
>
> Nothing in this schedule happens by itself. The website has **no automated backup, no
> automated monitoring, no automated link checking and no automated alerting** built in.
> Every item below is a task a person must perform, or that Yee Lim must arrange with a
> maintenance provider.
>
> The one thing the site does automatically is record product views for the dashboard
> analytics panel. Everything else on this page is manual.

---

## Contents

1. [Weekly](#1-weekly)
2. [Monthly](#2-monthly)
3. [Quarterly](#3-quarterly)
4. [Annually](#4-annually)
5. [Ownership](#5-ownership)
6. [Time estimates](#6-time-estimates)
7. [Completion log](#7-completion-log)

---

# 1. Weekly

**Owner:** `[CLIENT TO CONFIRM]`
**Estimated time:** 15 to 20 minutes

| # | Task | How | Why |
| --- | --- | --- | --- |
| 1.1 | Open the live site | Load the Home page, the catalogue and one product page | Catches an outage or an expired certificate before a customer does |
| 1.2 | Review new enquiries | **Admin, Enquiries.** Read every New lead | An unread enquiry is a lost sale |
| 1.3 | Reply, and mark as replied | From the admin, or the one tap link in the notification email | Keeps the New Leads count meaningful |
| 1.4 | Test the enquiry flow | Add a product to the enquiry basket and submit a test enquiry. Delete the test record afterwards | Confirms the whole lead pipeline still works, including the notification email |
| 1.5 | Spot check images and documents | Open two or three product pages. Confirm the photograph shows and the Downloads tab behaves | Catches a failed upload or a missing file |
| 1.6 | Clear spam and test records | Delete obvious junk from Enquiries | Keeps the inbox usable |

> **Task 1.4 is the single most valuable weekly check.** It exercises the database, the
> enquiry save and the email path in one action. If it works, most of the site works.

---

# 2. Monthly

**Owner:** `[CLIENT TO CONFIRM]`
**Estimated time:** 45 to 60 minutes

| # | Task | How | Why |
| --- | --- | --- | --- |
| 2.1 | **Back up the website files** | Hosting control panel. Confirm the `uploads` folder is included | Files and database are useless without each other |
| 2.2 | **Back up the database** | Hosting control panel or phpMyAdmin export | As above |
| 2.3 | Confirm both backups are readable | Open the downloaded files. Check neither is zero bytes | An unopened backup is an assumption |
| 2.4 | Record both in the backup log | Appendix D of [01_YEE_LIM_WEBSITE_HANDOVER_GUIDE.md](01_YEE_LIM_WEBSITE_HANDOVER_GUIDE.md) | So you know what you have |
| 2.5 | Test the admin login | Sign in and out | Catches an expired or broken account before you need it urgently |
| 2.6 | Check the contact details | **Admin, Site Settings**, then the public footer and Contact page | Wrong details silently cost enquiries |
| 2.7 | Test the WhatsApp button | From a real phone, from the footer and from a product page | The number lives in one place; one wrong digit breaks every button |
| 2.8 | Check product links and downloads | Open five products at random. Confirm each loads and its Downloads tab behaves | Catches deleted files and broken records |
| 2.9 | Review the browser console | Open the catalogue, a product page, compare and the enquiry page with the browser developer tools open. Look for red errors | Catches a cached file mismatch that only some visitors would hit |
| 2.10 | Review the dashboard analytics | **Admin, Overview** | Tells you which products deserve better photographs and descriptions |

---

# 3. Quarterly

**Owner:** `[CLIENT TO CONFIRM]`, with developer involvement for 3.1
**Estimated time:** 2 to 3 hours

| # | Task | How | Why |
| --- | --- | --- | --- |
| 3.1 | **Restore test a backup** | A developer restores the most recent backup into a test environment and confirms the site loads, products appear and the admin works | **A backup that has never been restored is an assumption, not a backup** |
| 3.2 | Review the access list | Who holds admin, hosting, domain and repository access. Remove anyone who no longer needs it | Every admin account has full rights, so this matters more than usual here |
| 3.3 | Review outdated products | Look for products left Unavailable for a long time. Decide: relaunch, or delete deliberately | Keeps the catalogue honest |
| 3.4 | Review data sheets | Confirm every published SDS and TDS is the current approved revision | A superseded safety data sheet is a real liability |
| 3.5 | Run the catalogue quality checklist | Section 17 of [04_CONTENT_AND_PRODUCT_DATA_GUIDE.md](04_CONTENT_AND_PRODUCT_DATA_GUIDE.md) | Catches spelling drift in filter values, missing tags and malformed Features |
| 3.6 | Verify mobile layouts | On a real phone: catalogue, filter sheet, product accordion, compare sheet, enquiry form | Mobile is a distinct design, not a scaled desktop |
| 3.7 | Test every form | Enquiry form with valid and invalid input. Document download gate. Admin product save | Confirms validation and spam guards still behave |
| 3.8 | Test the Bond Finder and the Product Advisor | Ask a realistic question of each | Confirms both still return sensible, current catalogue results |
| 3.9 | Review analytics and search visibility | If connected `[CLIENT TO CONFIRM]` | Tells you what customers are actually looking for |
| 3.10 | Developer log review | PHP error log and web server access log | Catches recurring errors and unusual traffic against `/admin/` and `/api/` |
| 3.11 | Review the change log | [10_CHANGE_LOG_TEMPLATE.md](10_CHANGE_LOG_TEMPLATE.md) | Confirms it is actually being kept |

---

# 4. Annually

**Owner:** `[CLIENT TO CONFIRM]`
**Estimated time:** Half a day, plus renewals

| # | Task | How | Why |
| --- | --- | --- | --- |
| 4.1 | **Renew the domain** | Registrar. Confirm auto renewal and that the registrant email is still a valid Yee Lim address | An expired domain takes the site and the email offline |
| 4.2 | **Renew the hosting** | Hosting provider | As above |
| 4.3 | **Confirm the SSL certificate** | Check the expiry date and whether it auto renews | An expired certificate makes the site look untrustworthy to every visitor |
| 4.4 | Review privacy and security obligations | `[CLIENT TO CONFIRM]` The site stores customer enquiries and document download records | Retention periods and notification duties are Yee Lim's to define |
| 4.5 | Confirm the enquiry retention rule is being applied | Export, then delete records older than the agreed period | Reduces the impact of any future breach |
| 4.6 | Full content review | Every product, every description, the Contact page, the business hours, the response time wording | Content drifts out of date quietly |
| 4.7 | Review technical dependencies | Developer: PHP version still supported, the vendored Swup library, the externally loaded icon and font hosts | Prevents a surprise when the host upgrades PHP |
| 4.8 | Review the Future Recommendations | Section 13 of [03_TECHNICAL_HANDOVER.md](03_TECHNICAL_HANDOVER.md) | Decide what is now worth doing |
| 4.9 | Confirm the maintenance provider for the coming year | Who fixes it when it breaks, and at what response time | Discovering there is nobody, during an outage, is the worst time |
| 4.10 | Review the Chinese translation | If the Chinese site is in active use, confirm the native speaker review has been completed and product translations are current | The current strings are first pass drafts |

---

# 5. Ownership

Complete this at handover. Every row needs a named person.

| Task group | Owner | Backup owner | Escalates to |
| --- | --- | --- | --- |
| Weekly checks | `[TO BE COMPLETED]` | `[TO BE COMPLETED]` | |
| Enquiry response | `[TO BE COMPLETED]` | `[TO BE COMPLETED]` | |
| Monthly backups | `[TO BE COMPLETED]` | `[TO BE COMPLETED]` | |
| Product content | `[TO BE COMPLETED]` | `[TO BE COMPLETED]` | |
| Data sheet approval | `[TO BE COMPLETED]` | `[TO BE COMPLETED]` | |
| Quarterly restore test | `[TO BE COMPLETED]` (developer) | `[TO BE COMPLETED]` | |
| Access review | `[TO BE COMPLETED]` | `[TO BE COMPLETED]` | |
| Domain and hosting renewals | `[TO BE COMPLETED]` | `[TO BE COMPLETED]` | |
| Technical support | `[TO BE COMPLETED]` | `[TO BE COMPLETED]` | |
| Security incidents | `[TO BE COMPLETED]` | `[TO BE COMPLETED]` | |

---

# 6. Time estimates

| Frequency | Estimated effort | Annual total |
| --- | --- | --- |
| Weekly | 15 to 20 minutes | About 15 hours |
| Monthly | 45 to 60 minutes | About 11 hours |
| Quarterly | 2 to 3 hours | About 10 hours |
| Annually | Half a day, plus renewals | About 4 hours |
| | | **About 40 hours per year** |

*(Recommendation)* This excludes routine product updates, replying to enquiries and any
development work. Use it when agreeing a maintenance arrangement, so the scope is
realistic on both sides.

---

# 7. Completion log

Keep a record. A schedule nobody signs off is a schedule nobody follows.

## Weekly

| Week ending | Completed by | 1.1 | 1.2 | 1.3 | 1.4 | 1.5 | 1.6 | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |

## Monthly

| Month | Completed by | Files backup ref | Database backup ref | All checks done | Issues found | Actioned |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | Y/N | | Y/N |
| | | | | Y/N | | Y/N |
| | | | | Y/N | | Y/N |

## Quarterly

| Quarter | Completed by | Restore test passed | Access review done | Content review done | Issues raised | Actioned |
| --- | --- | --- | --- | --- | --- | --- |
| | | Y/N | Y/N | Y/N | | Y/N |
| | | Y/N | Y/N | Y/N | | Y/N |

## Annually

| Year | Completed by | Domain renewed | Hosting renewed | SSL confirmed | Content reviewed | Provider confirmed | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | Y/N | Y/N | Y/N | Y/N | Y/N | |
| | | Y/N | Y/N | Y/N | Y/N | Y/N | |

---

## If you only do three things

1. **Reply to enquiries promptly, and mark them replied.** That is the site's whole
   commercial purpose.
2. **Take a monthly backup of both the files and the database, and store it off the
   server.** It is the only thing that makes any other mistake recoverable.
3. **Renew the domain and the hosting on time.** Everything else can be fixed. An expired
   domain can be lost permanently.
