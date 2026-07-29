# 09. Credentials Transfer Template

**Project ReBond, Yee Lim Adhesives Industries Pte Ltd**

> ## THIS DOCUMENT MUST NEVER CONTAIN A PASSWORD
>
> Record here **which** accounts exist, **who** owns them, and **how** access was handed
> over. The secrets themselves are transferred separately.
>
> Wherever a secret would go, leave the marker:
>
> `[TRANSFER SECURELY, DO NOT WRITE THE PASSWORD IN THIS DOCUMENT]`

---

## How to transfer secrets safely

**Acceptable methods**, in order of preference:

1. **A password manager's secure share.** The recipient accepts, then changes the password.
2. **A one time secret link**, of the kind that self destructs after a single view, agreed
   in advance by both parties.
3. **In person**, typed directly into the recipient's password manager, never written down.

**Never acceptable:**

- Email, including an attachment or a "second email with the password".
- SMS, WhatsApp, Slack, Teams, or any chat application.
- A shared spreadsheet, document, or cloud folder.
- A printed sheet, a notebook, or a sticky note.
- Any file committed to the Git repository.
- This document, or any other document in this pack.

**After every transfer:**

- [ ] Yee Lim changes the password immediately on receipt.
- [ ] The sender confirms the transfer channel has been cleared or has expired.
- [ ] The date, method and the two people involved are recorded in the table below.
- [ ] Any temporary account created for the project, for example a deployment FTP account,
      is deleted.

---

## 1. Hosting and cPanel

| Field | Entry |
| --- | --- |
| Hosting provider | `[CLIENT TO CONFIRM]` |
| Account or customer number | `[TO BE COMPLETED]` |
| Control panel address | `[TO BE COMPLETED]` |
| Control panel username | `[TO BE COMPLETED]` |
| Control panel password | `[TRANSFER SECURELY, DO NOT WRITE THE PASSWORD IN THIS DOCUMENT]` |
| Account owner after handover | `[TO BE COMPLETED]` |
| Billing contact | `[TO BE COMPLETED]` |
| Renewal date | `[TO BE COMPLETED]` |
| Two factor authentication enabled | Yes / No `[TO BE COMPLETED]` |
| Notes | The website lives in `public_html/`. PHP 8.0 or later with `pdo_mysql`, `mbstring`, `curl`, `json` and `fileinfo`. |

### FTP or file transfer accounts

| Field | Entry |
| --- | --- |
| FTP host | `[TO BE COMPLETED]` |
| FTP username | `[TO BE COMPLETED]` |
| FTP password | `[TRANSFER SECURELY, DO NOT WRITE THE PASSWORD IN THIS DOCUMENT]` |
| Is this a temporary deployment account? | Yes / No `[TO BE COMPLETED]` |
| **If temporary, deleted on** | `[TO BE COMPLETED]` |

> The project's deploy scripts read these from a gitignored `ftp.env` file. That file must
> never be committed and must not be handed over inside the repository.

---

## 2. Domain registrar

| Field | Entry |
| --- | --- |
| Domain name | `[TO BE COMPLETED]` |
| Registrar | `[CLIENT TO CONFIRM]` |
| Registrar account address | `[TO BE COMPLETED]` |
| Registrar username or account email | `[TO BE COMPLETED]` |
| Registrar password | `[TRANSFER SECURELY, DO NOT WRITE THE PASSWORD IN THIS DOCUMENT]` |
| Registrant name on the WHOIS record | `[TO BE COMPLETED]` |
| Registrant email on record | `[TO BE COMPLETED]` |
| Expiry date | `[TO BE COMPLETED]` |
| Auto renewal enabled | Yes / No `[TO BE COMPLETED]` |
| Two factor authentication enabled | Yes / No `[TO BE COMPLETED]` |
| Transfer authorisation code held by | `[TO BE COMPLETED]` |

> **Check the registrant email.** A domain registered to a departed contractor's personal
> address is a severe and common risk. It should be a Yee Lim company address that outlives
> any individual.

### DNS records

| Record type | Name | Value | Purpose |
| --- | --- | --- | --- |
| A | | `[TO BE COMPLETED]` | Points the domain at the hosting server |
| CNAME | | `[TO BE COMPLETED]` | |
| MX | | `[TO BE COMPLETED]` | Email routing |
| TXT (SPF) | | `[TO BE COMPLETED]` | Enquiry email deliverability |
| TXT (DKIM) | | `[TO BE COMPLETED]` | Enquiry email deliverability |

---

## 3. Website admin portal

| Field | Entry |
| --- | --- |
| Admin address | The live site address followed by `/admin/login.html` |
| Username | `[TO BE COMPLETED]` |
| Password | `[TRANSFER SECURELY, DO NOT WRITE THE PASSWORD IN THIS DOCUMENT]` |
| Number of admin accounts that exist | `[TO BE COMPLETED]` |
| Who holds admin access after handover | `[TO BE COMPLETED]` |
| Password changed by Yee Lim on | `[TO BE COMPLETED]` |

> **Important.** Every admin account has **full** rights: it can edit and delete any
> product, and read, export and delete any enquiry. There are no roles and no read only
> accounts.
>
> **There is no self service password change screen.** A developer performs password
> changes. Plan for this when scheduling routine rotation.

---

## 4. Database

| Field | Entry |
| --- | --- |
| Database name | `yeelimad_website` on the local schema. The live name is usually prefixed by the hosting account, `[DEVELOPER TO VERIFY]` |
| Database host | `[TO BE COMPLETED]` |
| Database username | `[TO BE COMPLETED]` |
| Database password | `[TRANSFER SECURELY, DO NOT WRITE THE PASSWORD IN THIS DOCUMENT]` |
| phpMyAdmin access | Through the hosting control panel |
| Where the live credentials are stored | `frontend/api/config.php` **on the server only**. Gitignored, never committed, never deployed over. |

> The contents of the live `config.php` were **not inspected** while preparing this
> documentation pack, and no credential value appears anywhere in it.

---

## 5. Email and SMTP

| Field | Entry |
| --- | --- |
| Enquiry notification recipient | Set in **Admin, Site Settings**, or falls back to the `ENQUIRY_NOTIFY_TO` constant in the server configuration. `[TO BE COMPLETED]` |
| "From" address used for site emails | `[TO BE COMPLETED]` Must be a real mailbox on the site's own domain. |
| Mailbox username | `[TO BE COMPLETED]` |
| Mailbox password | `[TRANSFER SECURELY, DO NOT WRITE THE PASSWORD IN THIS DOCUMENT]` |
| Webmail address | `[TO BE COMPLETED]` |
| Sending method | PHP `mail()`. No SMTP credentials are configured in the current build. |
| SPF published | Yes / No `[DEVELOPER TO VERIFY]` |
| DKIM enabled | Yes / No `[DEVELOPER TO VERIFY]` |

---

## 6. Git repository

| Field | Entry |
| --- | --- |
| Hosting service | `[TO BE COMPLETED]` |
| Repository address | `[TO BE COMPLETED]` |
| Repository owner after handover | `[CLIENT TO CONFIRM]` |
| Yee Lim account granted access | `[TO BE COMPLETED]` |
| Access level granted | `[TO BE COMPLETED]` |
| Branch holding the current live code | `[TO BE COMPLETED]` |
| Password or access token | `[TRANSFER SECURELY, DO NOT WRITE THE PASSWORD IN THIS DOCUMENT]` |
| Two factor authentication enabled | Yes / No `[TO BE COMPLETED]` |
| Contributors to be removed at handover | `[TO BE COMPLETED]` |

> Note that the Home page and About page are **not** in the repository, and
> `frontend/api/config.php` is deliberately excluded from it.

---

## 7. Analytics

| Field | Entry |
| --- | --- |
| Analytics in use? | `[CLIENT TO CONFIRM]` Not asserted anywhere in this pack. The site has its own internal product view counter, which is separate and needs no external account. |
| Provider | `[TO BE COMPLETED]` |
| Property or account identifier | `[TO BE COMPLETED]` |
| Account owner after handover | `[TO BE COMPLETED]` |
| Login | `[TRANSFER SECURELY, DO NOT WRITE THE PASSWORD IN THIS DOCUMENT]` |

---

## 8. Search Console

| Field | Entry |
| --- | --- |
| Search Console in use? | `[CLIENT TO CONFIRM]` |
| Property address | `[TO BE COMPLETED]` |
| Verification method | `[TO BE COMPLETED]` |
| Account owner after handover | `[TO BE COMPLETED]` |
| Login | `[TRANSFER SECURELY, DO NOT WRITE THE PASSWORD IN THIS DOCUMENT]` |

---

## 9. WhatsApp and business contact

| Field | Entry |
| --- | --- |
| WhatsApp number used on the site | Currently `6588755786`, editable in **Admin, Site Settings** |
| Whose phone or device holds it | `[TO BE COMPLETED]` |
| WhatsApp Business account, if any | `[CLIENT TO CONFIRM]` |
| Public phone number displayed | Currently `+65 8875 5786`, editable in Site Settings |
| Public contact email | Currently `contact@yeelimadhesives.com.sg`, editable in Site Settings |
| Public address | Currently `1 Ang Mo Kio Street 65, #03-17, Singapore 569063`, editable in Site Settings |

> These four values are editable by Yee Lim staff in Site Settings and need no credential
> transfer. They are listed here so the owner of each channel is recorded.

---

## 10. Third party services

### AI service, for the Product Advisor

| Field | Entry |
| --- | --- |
| Is an AI provider configured on the live server? | `[DEVELOPER TO VERIFY]` The live configuration file was not inspected while preparing this pack. |
| Provider | `[TO BE COMPLETED]` |
| Account owner and billing | `[CLIENT TO CONFIRM]` Should sit with Yee Lim if the feature is in use. |
| API key | `[TRANSFER SECURELY, DO NOT WRITE THE KEY IN THIS DOCUMENT]` |
| Where the key is stored | `frontend/api/config.php` on the server only. It is never sent to the browser. |
| Usage limits or cost cap | `[TO BE COMPLETED]` |

> If no provider is configured, the Product Advisor still works. It falls back to a free,
> built in catalogue matcher. Nothing breaks.

### Any other service

| Service | Purpose | Account owner | Credentials |
| --- | --- | --- | --- |
| | | | `[TRANSFER SECURELY, DO NOT WRITE THE PASSWORD IN THIS DOCUMENT]` |
| | | | `[TRANSFER SECURELY, DO NOT WRITE THE PASSWORD IN THIS DOCUMENT]` |

---

## 11. Transfer record

Complete one row per credential handed over.

| # | System | Transferred to | Transferred by | Date | Method used | Password changed by Yee Lim on | Channel cleared |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |
| 6 | | | | | | | |
| 7 | | | | | | | |
| 8 | | | | | | | |
| 9 | | | | | | | |
| 10 | | | | | | | |

---

## 12. Final confirmation

- [ ] Every account the website depends on is listed above
- [ ] Every credential has been transferred through an agreed secure method
- [ ] Yee Lim has changed every password received
- [ ] Every transfer channel has been cleared or has expired
- [ ] Any temporary deployment FTP account has been deleted
- [ ] Departing contributors have been removed from the Git repository
- [ ] Two factor authentication is enabled wherever it is available
- [ ] The domain registrant email is a Yee Lim company address
- [ ] **No password, key or token has been written into this document or any other
      document in this pack**

**Completed by:** `[TO BE COMPLETED]`
**Date:** `[TO BE COMPLETED]`
**Countersigned by (Yee Lim):** `[TO BE COMPLETED]`
