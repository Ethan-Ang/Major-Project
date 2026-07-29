# 10. Change Log Template

**Project ReBond, Yee Lim Adhesives Industries Pte Ltd**

Record every change made to the website after handover. A log is what makes a problem
diagnosable six months later, and what tells you which backup to roll back to.

---

## What to log

**Always log:**

- Any code deployment.
- Any database change or migration.
- Any hosting, domain, DNS or SSL change.
- Adding, deleting or replacing an SDS or TDS document.
- Bulk product changes, for example an import or a mass status change.
- Any change to Site Settings.
- Any change to Catalogue Filters, particularly a rename or an archive.
- Any password change or access change.
- Any incident, and its resolution.
- Any translation review.

**No need to log:**

- Editing the text of a single product.
- Marking one enquiry as replied.
- Routine day to day admin work.

---

## Full entry template

Copy this block for each significant change.

```
### Change #____

Date:                    YYYY-MM-DD
Time (with time zone):
Requested by:
Performed by:

Change summary:
(One or two sentences. What changed, and why.)

Type:                    [ ] Content  [ ] Code  [ ] Database  [ ] Configuration
                         [ ] Hosting/Domain  [ ] Security  [ ] Documents  [ ] Incident fix

Pages or files affected:
(List exact paths. For a deployment, paste the deploy list.)

Cache versions bumped:
(Which ?v= numbers changed, from and to. Write "not applicable" if none.)

Database change:         Yes / No
  If yes, migration file:
  If yes, rollback statement recorded:      Yes / No
  If yes, verification query run:           Yes / No

Backup created before the change:           Yes / No
  Files backup reference:
  Database backup reference:
  Backup stored at:

Tested by:
  Tested locally:                           Yes / No
  Unit tests run (node --test tests/):      Pass / Fail / Not applicable
  Cache version check passed:               Yes / No / Not applicable
  Manual QA completed:                      Yes / No

Deployed by:
  Deployment method:
  Deploy script output: upload_failures = ___   verify_mismatches = ___

Verification result after deployment:
  [ ] Public catalogue loads
  [ ] Product detail loads, all three tabs
  [ ] Compare works
  [ ] Test enquiry submitted and received
  [ ] Document download works
  [ ] Admin sign in and product save work
  [ ] Language switch works
  [ ] Home and About pages still load and are unchanged
  [ ] Browser console clear of errors
  Notes:

Rollback required:       Yes / No
  If yes, reason:
  If yes, rolled back at:
  If yes, rolled back by:

Notes:
(Anything a future maintainer would want to know. Surprises, decisions taken, follow up
work created.)
```

---

## Quick log

For smaller changes that still need a record.

| # | Date | Requested by | Change summary | Files or area affected | DB change | Backup ref | Tested by | Deployed by | Verified | Rollback | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | Y/N | | | | Y/N | Y/N | |
| 2 | | | | | Y/N | | | | Y/N | Y/N | |
| 3 | | | | | Y/N | | | | Y/N | Y/N | |
| 4 | | | | | Y/N | | | | Y/N | Y/N | |
| 5 | | | | | Y/N | | | | Y/N | Y/N | |
| 6 | | | | | Y/N | | | | Y/N | Y/N | |
| 7 | | | | | Y/N | | | | Y/N | Y/N | |
| 8 | | | | | Y/N | | | | Y/N | Y/N | |
| 9 | | | | | Y/N | | | | Y/N | Y/N | |
| 10 | | | | | Y/N | | | | Y/N | Y/N | |

---

## Document approval log

Use this specifically for SDS and TDS changes, where approval matters.

| # | Date | Product | Document type | File name | Revision or issue date | Approved by | Uploaded by | Download tested | Previous version replaced |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | SDS / TDS | | | | | Y/N | Y/N |
| 2 | | | SDS / TDS | | | | | Y/N | Y/N |
| 3 | | | SDS / TDS | | | | | Y/N | Y/N |
| 4 | | | SDS / TDS | | | | | Y/N | Y/N |

---

## Translation review log

| # | Date | Scope reviewed | Reviewer | Native speaker | Issues found | Issues corrected | Deployed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | Y/N | | Y/N | Y/N |
| 2 | | | | Y/N | | Y/N | Y/N |
| 3 | | | | Y/N | | Y/N | Y/N |

---

## Access change log

| # | Date | Person | System | Change | Performed by | Password rotated | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | Granted / Revoked | | Y/N | |
| 2 | | | | Granted / Revoked | | Y/N | |
| 3 | | | | Granted / Revoked | | Y/N | |
| 4 | | | | Granted / Revoked | | Y/N | |

---

## Incident log

| # | Date noticed | Noticed by | Symptom | Severity | Cause | Resolution | Resolved on | Preventive action | Follow up needed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | Critical / High / Medium / Low | | | | | Y/N |
| 2 | | | | Critical / High / Medium / Low | | | | | Y/N |
| 3 | | | | Critical / High / Medium / Low | | | | | Y/N |

---

## Worked example

For reference only. Delete or ignore when using this template.

```
### Change #1

Date:                    2026-08-14
Time (with time zone):   10:20 SGT
Requested by:            Sales team
Performed by:            Yee Lim staff (admin portal)

Change summary:
Replaced the outdated Safety Data Sheet for Deer(TM) Brand 212 with the March 2026
revision supplied by the technical team.

Type:                    [x] Documents

Pages or files affected:
Product "Deer(TM) Brand 212", Product Documents, SDS slot only.

Cache versions bumped:   Not applicable, no code change.

Database change:         No

Backup created before the change:           Yes
  Files backup reference:                   yeelim-files-2026-08-14.zip
  Database backup reference:                yeelim-database-2026-08-14.sql
  Backup stored at:                         Company backup drive, Website folder

Tested by:               Yee Lim staff
  Tested locally:                           Not applicable, admin portal change
  Manual QA completed:                      Yes

Deployed by:             Not applicable, no deployment needed

Verification result after deployment:
  [x] Public product page Downloads tab offers the SDS
  [x] Download gate completed and the correct March 2026 PDF arrived
  [x] Download record appeared in Document Downloads
  Notes: The previous SDS was replaced automatically, as expected.

Rollback required:       No

Notes:
Approved by the technical team on 2026-08-12. Recorded in the document approval log,
row 1. No Chinese translation impact.
```
