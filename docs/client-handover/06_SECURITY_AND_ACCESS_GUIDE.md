# 06. Security and Access Guide

**Project ReBond, Yee Lim Adhesives Industries Pte Ltd**

This guide covers who owns what, how credentials are handled, and what to do when
something goes wrong. It contains **no credentials of any kind**.

---

## Contents

1. [Responsibility matrix](#1-responsibility-matrix)
2. [Account ownership](#2-account-ownership)
3. [Password policy](#3-password-policy)
4. [Credential transfer](#4-credential-transfer)
5. [Least privilege](#5-least-privilege)
6. [Two factor authentication](#6-two-factor-authentication)
7. [Staff departure process](#7-staff-departure-process)
8. [Backups and personal data](#8-backups-and-personal-data)
9. [File uploads](#9-file-uploads)
10. [Spam protection](#10-spam-protection)
11. [Security controls already in place](#11-security-controls-already-in-place)
12. [Incident reporting](#12-incident-reporting)
13. [Log review](#13-log-review)
14. [SSL renewal](#14-ssl-renewal)
15. [Software updates](#15-software-updates)
16. [Known security gaps](#16-known-security-gaps)

---

# 1. Responsibility matrix

Complete this at handover. Every row needs a named person, not a job title alone.

| Access / System | Owner | Backup Owner | Review Frequency |
| --- | --- | --- | --- |
| Domain registrar account | `[TO BE COMPLETED]` | `[TO BE COMPLETED]` | Annually, and before expiry |
| Hosting control panel account | `[TO BE COMPLETED]` | `[TO BE COMPLETED]` | Quarterly |
| Website database user | `[TO BE COMPLETED]` | `[TO BE COMPLETED]` | Annually |
| Website admin portal login | `[TO BE COMPLETED]` | `[TO BE COMPLETED]` | Quarterly |
| FTP or file transfer account | `[TO BE COMPLETED]` | `[TO BE COMPLETED]` | Quarterly, and delete temporary accounts immediately after use |
| Enquiry notification mailbox | `[TO BE COMPLETED]` | `[TO BE COMPLETED]` | Quarterly |
| Git repository | `[TO BE COMPLETED]` | `[TO BE COMPLETED]` | Annually |
| AI service key, if the Product Advisor uses one | `[TO BE COMPLETED]` | `[TO BE COMPLETED]` | Annually, and rotate on any suspicion |
| Analytics, if in use | `[TO BE COMPLETED]` | `[TO BE COMPLETED]` | Annually |
| Search Console, if in use | `[TO BE COMPLETED]` | `[TO BE COMPLETED]` | Annually |
| WhatsApp business number | `[TO BE COMPLETED]` | `[TO BE COMPLETED]` | Annually |
| Backup storage location | `[TO BE COMPLETED]` | `[TO BE COMPLETED]` | Quarterly |

---

# 2. Account ownership

**The principle: Yee Lim Adhesives Industries Pte Ltd should be the registered owner of
every account the website depends on.** A developer or agency may hold access, but should
not be the registrant.

| Account | Should be registered to |
| --- | --- |
| Domain | Yee Lim, using a company email address that outlives any individual |
| Hosting | Yee Lim |
| Database | Created inside the Yee Lim hosting account |
| Website admin portal | Yee Lim |
| Git repository | `[CLIENT TO CONFIRM]` Agree whether Yee Lim owns the repository or is granted access to it |
| Any AI service account | `[CLIENT TO CONFIRM]` If the Product Advisor runs in AI mode, the account and billing should sit with Yee Lim |

> **Warning.** A domain registered to a departed contractor's personal email address is a
> common and severe risk. Confirm the registrant at handover and correct it if needed.

---

# 3. Password policy

*(Recommendation)*

| Rule | Detail |
| --- | --- |
| Length | At least 14 characters, or a passphrase of four or more unrelated words |
| Uniqueness | Every account gets a different password. Never reuse. |
| Storage | In a password manager. Not in a spreadsheet, a notebook, a shared document or an email. |
| Sharing | Through the password manager's sharing feature. Never by email, SMS or messaging app. |
| Rotation | At handover, on any staff departure with access, and on any suspicion of compromise |
| Written down | Never. Not in this documentation pack, and not in any other document. |

## 3.1 Changing the admin portal password

`[DEVELOPER TO VERIFY]` **The admin portal has no self service password change screen in
the current build.** *(Verified from code: no such endpoint or page exists.)* A developer
changes it by updating the `password_hash` value for the account, generated with PHP's
`password_hash()`.

This is listed as a recommended improvement in
[03_TECHNICAL_HANDOVER.md](03_TECHNICAL_HANDOVER.md), section 13.2, precisely because a
password that requires a developer to change tends never to be changed.

---

# 4. Credential transfer

Use [09_CREDENTIALS_TRANSFER_TEMPLATE.md](09_CREDENTIALS_TRANSFER_TEMPLATE.md) to record
**which** accounts exist, who owns them and how access was transferred.

**Never write an actual password into that template, or into any other document.**

## The process

1. Fill in the template with the account details, excluding secrets.
2. Transfer the secrets separately, through a password manager's secure share, or another
   channel both parties have agreed in advance.
3. Yee Lim changes every password immediately after receiving it.
4. The sender confirms the transfer channel has been cleared.
5. Both parties sign off in [08_FINAL_HANDOVER_CHECKLIST.md](08_FINAL_HANDOVER_CHECKLIST.md).

> **Delete temporary access.** If a temporary FTP account was created for deployment, it
> must be deleted from the hosting control panel once the work is complete.

---

# 5. Least privilege

**The current build has one level of access.** Everyone who can sign in to the admin
portal can:

- Edit and delete any product, along with its images and documents.
- Read, export and delete any enquiry, including customer personal data.
- Read and delete document download records, which contain visitor personal data.
- Change the site's public contact details.

There are no read only accounts and no per user permissions. *(Verified from code.)*

**Therefore:**

- Give the admin login only to staff who genuinely need it.
- Do not create a shared "office" login that several people use. If more than one person
  needs access, ask a developer to create separate accounts, so a departure only requires
  removing one.
- `[CLIENT TO CONFIRM]` Record who currently holds admin access, and review it quarterly.

---

# 6. Two factor authentication

| System | Two factor available? |
| --- | --- |
| Website admin portal | **No.** Not implemented in the current build. *(Verified from code)* |
| Hosting control panel | `[CLIENT TO CONFIRM]` Usually available. **Enable it.** |
| Domain registrar | `[CLIENT TO CONFIRM]` Usually available. **Enable it.** |
| Git hosting | `[CLIENT TO CONFIRM]` Usually available. **Enable it.** |
| Email accounts | `[CLIENT TO CONFIRM]` **Enable it.** |

*(Recommendation)* Enable two factor authentication everywhere it is offered. The hosting
and domain accounts matter most; losing either is far more damaging than losing the admin
portal, because both can be used to take the site down entirely.

---

# 7. Staff departure process

Complete on the person's last working day, not later.

- [ ] Change the website admin portal password.
- [ ] Change the hosting control panel password.
- [ ] Change the domain registrar password.
- [ ] Change any shared email account password.
- [ ] Remove their access from the Git repository.
- [ ] Remove or change any FTP account they used.
- [ ] Revoke their access to the backup storage location.
- [ ] Revoke their access to the password manager.
- [ ] Confirm any backup copies they hold personally are deleted.
- [ ] Record the date and who performed each step.

The same applies when a developer or agency engagement ends.

---

# 8. Backups and personal data

Backups of this website contain personal data:

- The `enquiries` table: customer names, companies, emails, phone numbers and messages.
- The `document_downloads` table: visitor names, work emails, companies and phone numbers.

Therefore:

- Store backups somewhere access controlled, not a public cloud folder or a personal
  laptop.
- Do not email backup files.
- Apply the same retention rule to backups as to the live data.
- `[CLIENT TO CONFIRM]` Confirm your retention period against your own privacy obligations.
- Delete old backups securely once they are past that period.

The same caution applies to the **Export CSV** files produced from the admin Enquiries
page.

---

# 9. File uploads

Uploads are already restricted. *(Verified from code.)*

| Control | Detail |
| --- | --- |
| Image formats | JPG, PNG and WEBP only, verified by reading the file content, not the file name |
| Image size | 5 MB maximum per file |
| Document format | PDF only, verified by reading the file content |
| Document size | 10 MB maximum |
| Script execution | `uploads/.htaccess` denies execution of `.php`, `.phtml`, `.cgi`, `.pl`, `.py`, `.sh` and similar anywhere under `/uploads` |
| Directory listing | Disabled under `/uploads` and at the site root |
| Data sheet access | Any path containing `/documents/` is blocked from direct access. SDS and TDS PDFs are served only through `api/download_document.php` in exchange for a single use token that expires in about 15 minutes |

**Operational rule for staff:** only upload files obtained from a trusted source inside
Yee Lim. Never upload a file received from an unknown sender.

---

# 10. Spam protection

Already in place, with no CAPTCHA for genuine visitors. *(Verified from code.)*

| Protection | Detail |
| --- | --- |
| Honeypot field | A hidden field real visitors never see. When an automated tool fills it, the site reports success but saves nothing and emails no one. |
| Enquiry rate limit | 5 submissions per 10 minutes per internet connection, then a clear message with the real waiting time. |
| Document request rate limit | 30 requests per hour per internet connection. Counted only after validation passes, so bad input cannot exhaust the limit. |
| Product Advisor rate limit | 30 messages per 10 minutes per internet connection. |
| Product view tracking cap | 60 pings per minute per connection, plus per session and per day deduplication. |
| Login throttle | 10 failed attempts per 15 minutes per connection. Only failures count, and a successful sign in clears the block. |

---

# 11. Security controls already in place

Recorded here so a future developer does not remove them by accident.

| Control | Where |
| --- | --- |
| Passwords stored as hashes, verified with `password_verify` | `api/login.php` |
| Bearer token sessions with a 24 hour expiry, validated on every protected request | `api/auth.php`, `api/login.php` |
| Expired tokens deleted on validation and garbage collected on each successful login | `api/auth.php`, `api/login.php` |
| Prepared statements everywhere, no string concatenated SQL from user input | All endpoints |
| Errors logged server side, never displayed to the browser | `api/db.php` |
| A distinct 503 response when the database is unreachable, so the visitor is told their input is fine | `api/db.php` |
| Mail header injection prevented by stripping CR and LF from all header values | `api/enquiries.php` |
| Reply tokens compared with `hash_equals`, avoiding timing leaks | `api/enquiries.php` |
| Download tokens are single use, marked used **before** streaming | `api/download_document.php` |
| Download path safety: the resolved file must sit inside `uploads/` | `api/download_document.php` |
| Document file paths exposed only to authenticated admins | `api/product_documents.php` |
| The public product payload exposes only `hasSds` and `hasTds`, never the document URL | `api/products.php` |
| The AI key stays server side; the browser never sees it, and `connect-src` is `'self'` | `api/advisor.php`, `.htaccess` |
| Security response headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, Content Security Policy | `frontend/.htaccess` |
| Web access denied by name to `config.php`, `config.example.php`, `.sql`, `.md`, `.log`, `.htaccess` | `frontend/.htaccess` |
| Directory listings disabled | `frontend/.htaccess`, `uploads/.htaccess` |
| Live credentials excluded from source control | `.gitignore` covers `frontend/api/config.php` and `ftp.env` |
| Admin views excluded from the analytics counter, and the dedupe key is a hash, never personal data | `api/track_view.php` |

---

# 12. Incident reporting

## What counts as a security incident

- The website is defaced, or shows content nobody at Yee Lim added.
- Someone signs in to the admin who should not have access.
- Customer data appears somewhere it should not.
- A password or key is exposed, for example emailed, posted, or committed to the repository.
- The hosting provider reports malware or abuse.
- An unexpected redirect, pop up, or unknown script appears on the site.

## What to do, in order

1. **Do not delete anything.** Evidence matters.
2. Contact your developer immediately.
3. Change the admin, hosting and domain passwords.
4. Record what happened, when it was noticed, and by whom.
5. Take a backup of the current state before any remediation, so the compromised state can
   be examined.
6. `[CLIENT TO CONFIRM]` If customer personal data was exposed, follow your own
   notification obligations.
7. Once resolved, record the incident and the fix in
   [10_CHANGE_LOG_TEMPLATE.md](10_CHANGE_LOG_TEMPLATE.md).

**Never attempt to fix a security incident by editing server files yourself.**

---

# 13. Log review

`[DEVELOPER TO VERIFY]` The website writes PHP errors to the server error log via
`error_log()`. The exact log location depends on the hosting configuration.

*(Recommendation)* A developer should review, quarterly:

- The PHP error log, for repeated database errors, upload failures and endpoint errors.
- The web server access log, for unusual request patterns against `/admin/` and `/api/`.
- The admin Enquiries list, for spam patterns that the current guards are not catching.

The website itself keeps **no audit trail** of who changed or deleted a product or an
enquiry. That is a recorded gap, see section 16.

---

# 14. SSL renewal

`[CLIENT TO CONFIRM]` The SSL certificate provider and its renewal arrangement.

**Facts from the code:** the HTTPS redirect block in `frontend/.htaccess` is written in a
proxy safe form but is **currently commented out**, pending confirmation that SSL is
active on the live host. *(Verified from code.)*

**Actions:**

- [ ] `[DEVELOPER TO VERIFY]` Confirm SSL is active on the live domain.
- [ ] If it is, enable the HTTPS redirect block so visitors cannot reach the site over
      plain HTTP.
- [ ] Confirm whether the certificate auto renews. Most cPanel hosts issue an auto renewing
      free certificate.
- [ ] Put the expiry date in a calendar regardless. An expired certificate makes the site
      appear broken and untrustworthy to every visitor.

---

# 15. Software updates

The site uses very few third party components by design, which is a security advantage.

| Component | Update consideration |
| --- | --- |
| PHP | `[DEVELOPER TO VERIFY]` Keep on a supported version, 8.0 or later. Test after any version change on the host. |
| MySQL | Managed by the host. |
| Swup, the page transition library | Vendored in the repository. Update deliberately, and re-test navigation on every public page. |
| Lucide icons, admin only | Loaded from `unpkg.com` at "latest". *(Recommendation)* Pin a version, or self host, so an upstream change cannot alter the admin without warning. |
| Google Fonts | Loaded from `fonts.googleapis.com`. *(Recommendation)* Self hosting would remove two external hosts from the Content Security Policy. |
| Playwright, development only | Not deployed. Update freely. |

---

# 16. Known security gaps

Recorded honestly. Detail and remediation are in
[03_TECHNICAL_HANDOVER.md](03_TECHNICAL_HANDOVER.md), section 13.

| Gap | Severity | Status |
| --- | --- | --- |
| ~~`api/upload-product-images.php` does **not** check the admin token~~ | **High** | **Fixed 29 July 2026, commit `30ae9d6`.** It now calls `requireAdmin($pdo)` like every other write endpoint. Verified: unauthenticated returns 401, authenticated still uploads normally. **Committed but not yet deployed**, so the live server carries the old version until the next deployment. |
| No self service password change in the admin portal. | Medium | A developer must change passwords, which discourages routine rotation. |
| No two factor authentication on the admin portal. | Medium | Not implemented. |
| No role model. Every admin is a full administrator. | Medium | By design in the current build. Mitigate by limiting who has an account. |
| No audit trail of who changed or deleted a product or an enquiry. | Medium | Recorded as a recommended improvement. |
| The Content Security Policy keeps `'unsafe-inline'` for scripts and styles. | Low, deliberate | The pages rely on inline handlers and inline styles; removing them is a large rewrite. Documented in the `.htaccess` itself. |
| The HTTPS redirect is written but disabled. | Depends on SSL status | See section 14. |
| Deployment uses plain FTP. | Low to medium | Moving to SFTP is a recorded optional improvement. |
| Email deliverability depends on SPF and DKIM being published for the sending domain. | Low | `[DEVELOPER TO VERIFY]`. `config.example.php` documents the required records. |

> None of these prevent the site operating safely today, but items marked High and Medium
> should be scheduled rather than forgotten.
