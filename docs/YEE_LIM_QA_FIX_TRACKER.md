# Yee Lim — QA / Fix Tracker

Living tracker for all design, UX, mobile, functionality, and QA feedback raised in conversation.
This is the single source of truth. **Never delete historical entries** — mark them resolved, rejected, or superseded.

- **Site:** yeelimadhesives.com (live) · **Repo branch:** products-admin
- **Started:** 2026-07-15
- **Deploy model:** manual FTP push, no build step. Changes go live but are **uncommitted** in git (house rule: code staged, not committed by the assistant; `.md` files never committed).
- **Commit hash column:** reads `FTP <asset vN>` because fixes were deployed over FTP, not committed. Real git hashes to be added if/when the branch is committed.

> ⚠️ **Verification rule:** an item is only `Verified` after it has been **visually and functionally tested** — not because code changed. Most items below are `Implemented` (code done + deployed + partially tested at 390px via Playwright) and still need real-device + cross-breakpoint confirmation.

---

## Summary (counts)

### By status (updated 2026-07-15 Run 2)
| Status | Count |
|---|---|
| Not reviewed | 0 |
| Planned / blocked | 3 (DATA-001, SEARCH-001, CLIENT-007) |
| In progress | 0 |
| Implemented | 25 (13 deployed from earlier sessions + 12 local-only from Run 2) |
| Verified | 0 (real-device sign-off still pending) |
| Rejected | 1 |
| Future improvement | 2 |
| Decision recorded | 8 |
| **Total tracked entries** | **39** |

### By priority (open + implemented actionable items)
| Priority | Count |
|---|---|
| Critical | 1 |
| High | 8 |
| Medium | 7 |
| Low | 4 |

*"Implemented" = shipped to live + tested at breakpoints via Playwright, awaiting real-device sign-off. Nothing is `Verified` yet (no real-device confirmation).*

---

## Next recommended fixes (5 highest-priority unfinished, updated Run 2)

1. **Deploy the Run 2 local work** (High). Commits `2ac829c`..HEAD are local-only; FTP push of the changed public files + bump live `index.html`/`about.html` `?v` refs on the live copies. Admin: deploy ONLY `enquiries.html`/`enquiries.js` (products side is teammate-blocked).
2. **DATA-001 — Approve + execute the "suitable for" data restoration** (High). Table ready; awaiting wording sign-off, then reviewed SQL via phpMyAdmin (20 rows).
3. **Teammate uploader sync** (High). Get the live-only admin uploader (admin.js v16/css v27 + 2 PHP endpoints) committed to git; until then the admin products files stay deployment-blocked.
4. **QA-CROSS — Real-device verification** (Medium). Confirm CMP-001 hide, advisor content-fit, inline validation, safe-area behaviour on the user's phone, then flip statuses to `Verified`.
5. **CLIENT-007 — Remove desktop footer Admin Login** (Low, needs a yes/no). One-line footer.js change + v bump; mobile already omits it.

> PD-004 reviewed this run: desktop action panel is `position:sticky; top:84px` and stops at its section; mobile uses the bottom bar. Matches DEC-005 — no change needed, recorded as satisfied.

---

## 1. Critical bugs and functionality

### CRIT-001 — Mobile nav bar disappears when opening the menu after scrolling
- **Page/component:** Global navbar (`navbar.js`) — mobile hamburger drawer
- **Original concern:** "when i scroll like the whole top nav bar is gone that's the problem here." Opening the hamburger after scrolling left a ~60px gap where a product card showed through; the dark bar (logo + close) had vanished.
- **Root cause:** `.nav` is `position: sticky`; opening the drawer sets `body{overflow:hidden}`, which knocks sticky out of its context so the bar dropped to document-top (offscreen). The fixed drawer starts at `top:60px`, leaving the gap.
- **Recommended decision:** Pin the bar (`position:fixed`) while the drawer is open. ✅ Done.
- **Priority:** Critical
- **Status:** Implemented
- **Relevant files:** `frontend/js/widgets/navbar.js`
- **Commit hash:** FTP `navbar.js v12`
- **Verification notes:** Logic fix; reproduced originally from the user's device screenshot. Not yet re-screenshotted post-fix.
- Desktop tested: [ ] · 390px: [ ] · 430px: [ ] · 768px: [ ]
- **Remaining issue:** Needs on-device confirmation that the bar stays put with logo + close and no gap.

### DATA-001 — Product `usage` "Suitable for" values lost their `; ` delimiters in the database
- **Page/component:** Product data (`api/products.php` → MySQL) driving the product-detail usage section
- **Original concern:** Surfaced while implementing PD-002 — "suitable uses run together without clear separation." The uses cannot be split into separate chips.
- **Root cause (confirmed):** The live/local API returns e.g. `"usage":"Apply by brush or roll. Suitable for: Leather product bonding Shoe in-soles General purpose."` — **no `; ` delimiters**. `splitSuitableFor()` therefore returns one item. The correct delimited values still exist in `frontend/js/data.js` (`DEMO_PRODUCTS`), but the DB copy was flattened (spaces). Splitting on spaces/capitals is unsafe (would mangle e.g. `Adhesion of laminates (E.g. Carpentry, Door, Cabinet and etc.)`), so it must not be guessed.
- **Recommended decision:** Restore the `; ` delimiters in the DB `usage` column using the known-good values from `data.js` (+ optional professional wording polish). This is data restoration, not inventing content. **Needs DB access (cPanel/phpMyAdmin), out of the FTP flow.** Until then, the redesign renders each product's single value as a clean line (see PD-002).
- **Affected count:** **20 of 31 products** need a DB `usage` fix — 19 flattened "Suitable for" lists + 1 (#30 ASG001) with an `"x"` placeholder. 11 need no change (genuine instructions or single-value). All 20 restorable exactly from `data.js` (deterministic split; no guessing).
- **Full plan + before/after table:** **[docs/DATA-001_suitable-uses-restoration-plan.md](DATA-001_suitable-uses-restoration-plan.md)** — includes method (reviewed SQL via phpMyAdmin, `` `usage` `` is reserved), backup, rollback, verification, and the 20-row Current / data.js / Proposed table (⚠ flags wording that needs sign-off).
- **Priority:** High
- **Status:** Planned — **AWAITING USER APPROVAL of the before/after table. Do NOT run DB changes until approved.**
- **Relevant files:** MySQL `products.usage`; reference values in `frontend/js/data.js`; parser `splitSuitableFor` in `frontend/js/pages/product-detail.js` (already updated to split on `;`/`•` only — commas are content, so professional wording with internal commas renders correctly once data is restored).
- **Commit hash:** — (parser + list-render shipped in `product-detail.js v14` / `products.css v68`; DB not yet touched)
- **Verification notes:** Confirmed via `curl /api/products.php` for all 31 products; list rendering proven at 390px with mocked delimited data (4 items, comma preserved within an item).
- Desktop tested: [ ] · 390px: [ ] · 430px: [ ] · 768px: [ ]
- **Remaining issue:** DB not modified. Multi-item lists appear only after approval + DB restore.

### ENQ-001 — Add-to-enquiry success toast ("black thing") — REMOVED
- **Page/component:** Enquiry add flow (`core/app.js` `toggleBasket`, `compare-page.js` `addToBasket`) + `.toast`
- **Original concern:** "why when i add to enquiry this black thing appears" — dark toast covered content / overlapped the mobile action bar / Related Products; redundant with the button-state change.
- **Resolution (per user request — remove the visible success toast entirely):**
  - **No visible toast on successful add/remove.** Feedback is the button flip (Add ↔ In Enquiry) + header count, which were already driven by `localStorage`/`basketUpdated` (unaffected).
  - **Accessibility:** added a visually-hidden `aria-live="polite"` region (`#ylStatus`, injected once in `core/app.js`) that announces e.g. *"Deer™ Brand 101 was added to your product enquiry."* / "…removed…" / (compare) "…is already in your product enquiry." Product name passed via `toggleBasket(id, name)` / `addToBasket(id, name)`, sanitised with `ylTxt()`.
  - **Errors preserved & distinct:** `showToast` now shows ONLY real errors, styled `.toast--error` (red, not success), with retry possible (button does not flip on failure). Wrapped the persist in try/catch. Also lifted the toast above the sticky CTA on `body.detail-has-cta`.
  - **Shared-utility check:** `window.showToast` was used ONLY for the 4 enquiry messages (no other public callers); admin has its own separate `showToast` (untouched). Adjusted the enquiry calls, did not delete the toast system.
- **Priority:** Medium
- **Status:** Implemented
- **Relevant files:** `frontend/js/core/app.js`, `frontend/js/pages/products.js`, `frontend/js/pages/product-detail.js`, `frontend/js/pages/compare-page.js`, `frontend/css/products.css`
- **Commit hash:** FTP `app.js v2`, `products.js v33`, `product-detail.js v14`, `compare-page.js v12`, `products.css v68`
- **Verification notes:** Playwright 55/55 checks at 360/390/430/768/1280 — add: NO visible toast, button→In Enquiry, count 0→1, basket persisted, aria-live announced (with product name); remove: no toast, count→0, announced; error (localStorage throws): visible error toast, styled error, button NOT flipped, count stays 0; compare + products-card entry points: no toast, basket updates.
- Desktop tested: [x] · 390px: [x] · 430px: [x] · 768px: [x] · 360px: [x]
- **Remaining issue:** Real-device confirmation (esp. that a screen reader announces the add). Not yet `Verified`.

---

## 2. Mobile design and responsiveness

### MOB-001 — Overscroll reveals the cream page background
- **Page/component:** Global (`products.css` `html/body`)
- **Original concern:** "it shdnt let me scroll so far down see i can see the cream background" → later: "the overscrolling i can still see the cream can u js make the scrolling stop at footer isit possible."
- **Root cause:** No `overscroll-behavior` and no `html` background, so iOS rubber-band exposed the cream body behind the dark nav/footer.
- **Recommended decision:** `overscroll-behavior-y:none` on `html,body` to stop the bounce at the footer; near-black `html` background as fallback so any residual over-pull reads dark, never cream. ✅ Done.
- **Priority:** High
- **Status:** Implemented
- **Relevant files:** `frontend/css/products.css`
- **Commit hash:** FTP `products.css v66`
- **Verification notes:** iOS-only behaviour; cannot reproduce headlessly. Needs real-device check.
- Desktop tested: [ ] · 390px: [ ] · 430px: [ ] · 768px: [ ]
- **Remaining issue:** Does NOT reach `index.html`/`about.html` (they load teammate `styles.css`, not `products.css`) — see DEC-007. Confirm bounce actually stops on the user's iOS version.

### MOB-002 — "Faint rectangle" when pressing buttons (not premium)
- **Page/component:** Global tap feedback
- **Original concern:** "why i press some buttons there's like the faint rectangle when pressing it doesn't feel premium at all."
- **Root cause:** No `-webkit-tap-highlight-color` set → iOS default tap box, a hard rectangle that ignores `border-radius`, flashing a square on rounded buttons/rows.
- **Recommended decision:** `-webkit-tap-highlight-color: transparent` on `html`; elements keep their own `:active` feedback. ✅ Done.
- **Priority:** Medium
- **Status:** Implemented
- **Relevant files:** `frontend/css/products.css`
- **Commit hash:** FTP `products.css v65`
- **Verification notes:** iOS-only; needs device check.
- Desktop tested: [ ] · 390px: [ ] · 430px: [ ] · 768px: [ ]
- **Remaining issue:** Confirm no interactive element lost useful feedback on the phone.

### MOB-003 — Breadcrumb cramped on mobile
- **Page/component:** Product detail breadcrumb
- **Original concern:** "on mobile, it feels slightly cramped. Keep full breadcrumb on desktop, but simplify mobile to `Products › Product Name`."
- **Recommended decision:** Hide the "Home ›" step at ≤640px only; desktop keeps full hierarchy. Navigation preserved. ✅ Done.
- **Priority:** Medium
- **Status:** Implemented
- **Relevant files:** `frontend/product-detail.html` (`.bc-home`, `.bc-sep-home`), `frontend/css/products.css`
- **Commit hash:** FTP `products.css v66` + `product-detail.html`
- **Verification notes:** Playwright at 390px confirmed breadcrumb reads "Products › Deer™ Brand 101".
- Desktop tested: [ ] · 390px: [x] · 430px: [ ] · 768px: [ ]
- **Remaining issue:** Confirm desktop still shows full "Home › Products › Product". See also DEC-001, PD-003.

---

## 3. Products catalogue

### CAT-001 — Filter sheet top edge was faded (heading + count dimmed)
- **Page/component:** Products filter drawer (`.filter-sidebar .drawer-body`)
- **Original concern:** "why is the number faded like that... the top part is faded" and (2nd screenshot) "how come its like that like other websites dont have that." The "PRODUCT TYPE" heading and its red count badge looked dimmed.
- **Root cause:** A top+bottom mask fade was applied whenever the list overflowed, so the top faded even at scroll-top.
- **Recommended decision:** Make the fade scroll-aware — no top fade at the top, no bottom fade at the end. ✅ Done.
- **Priority:** High
- **Status:** Implemented
- **Relevant files:** `frontend/css/products.css`, `frontend/js/pages/products.js`
- **Commit hash:** FTP `products.css v62`, `products.js v31`
- **Verification notes:** Logic + Playwright products page load OK; specific drawer-open fade not re-screenshotted.
- Desktop tested: [ ] · 390px: [ ] · 430px: [ ] · 768px: [ ]
- **Remaining issue:** Confirm heading + count read solid at rest on device.

### CAT-002 — Sort dropdown highlight sticks after tapping
- **Page/component:** Sort control (`custom-select.js`, `dropdown-ui.css`)
- **Original concern:** "when u press default order n press it again it doesn't go back to the same colour the user needs to press out of it."
- **Root cause:** Sticky `:hover` on touch devices.
- **Recommended decision:** Gate `:hover` under `@media (hover:hover)`. ✅ Done.
- **Priority:** High
- **Status:** Implemented
- **Relevant files:** `frontend/css/dropdown-ui.css`
- **Commit hash:** FTP `dropdown-ui.css v6`
- **Verification notes:** Part of the broader dropdown fix (see CAT-003).
- Desktop tested: [ ] · 390px: [x] · 430px: [ ] · 768px: [ ]
- **Remaining issue:** Superseded/re-confirmed by CAT-003; verify on device.

### CAT-003 — "Default order" blends into the background
- **Page/component:** Mobile sort control (`.mfb-sort-wrap` trigger + custom-select options)
- **Original concern:** Raised repeatedly: "should it just stay white", "why doesnt it stay white like u said", "the default order still has the same thing... it still blends in."
- **Root cause (multi-layered — took 3 passes):** (1) selected option got a cream `is-active` fill on open; (2) the option's synthetic `mouseenter` re-added the fill on touch; (3) **the real culprit** — a mobile override `.mfb-sort-wrap .custom-select-trigger[aria-expanded="true"]/:hover { background:#f6f2ea }` filled the *trigger* cream while open and stuck it after tap. Cream = same family as page bg → blend.
- **Recommended decision:** Pointer/touch opens leave the row white (checkmark only); open trigger stays transparent/white; all hover fills gated to `@media (hover:hover)`. ✅ Done.
- **Priority:** High
- **Status:** Implemented
- **Relevant files:** `frontend/js/widgets/custom-select.js`, `frontend/css/products.css` (`.mfb-sort-wrap`), `frontend/css/dropdown-ui.css`
- **Commit hash:** FTP `custom-select.js v4`, `products.css v66`
- **Verification notes:** Playwright at 390px — open trigger computed background = `rgba(0,0,0,0)`; selected row white with ✓.
- Desktop tested: [ ] · 390px: [x] · 430px: [ ] · 768px: [ ]
- **Remaining issue:** User to confirm on device (previous "fixes" looked right in Playwright but device still showed it until the trigger cause was found).

### CAT-004 — Sticky Filters/Sort toolbar looked "unnatural and awkward"
- **Page/component:** `.mobile-toolbar` (products catalogue)
- **Original concern:** "i dont think that idea is wrong i think it just looks unnatural and awkward." Detailed brief: too close under nav, too tall/heavy, segmented buttons bulky, "31 products" floating/disconnected, cards bleed underneath, needs solid bg + shadow when sticky.
- **Recommended decision:** Redesign — solid opaque cream (no bleed), compact 44px controls, breathing room under nav, count row hugs/aligns to the bar, faint lift on the pill, and a shadow that appears only when actually stuck (IntersectionObserver). ✅ Done.
- **Priority:** High
- **Status:** Implemented
- **Relevant files:** `frontend/css/products.css`, `frontend/js/pages/products.js` (`initStickyToolbar`)
- **Commit hash:** FTP `products.css v63`, `products.js v32`
- **Verification notes:** Playwright at 390px — at-rest, stuck (shadow on, cards behind, no bleed), and dropdown-open-while-stuck all verified visually.
- Desktop tested: [ ] · 390px: [x] · 430px: [ ] · 768px: [ ]
- **Remaining issue:** Confirm "premium" feel on device; check 430px/768px.

### CAT-005 — Stray full-width line under the toolbar
- **Page/component:** `.mobile-toolbar` border
- **Original concern:** "what is this line circled u see it right" — a full-width hairline under "31 PRODUCTS" extending past the cards into the gutters.
- **Root cause:** Toolbar `border-bottom` drawing always; bar shares page cream (`#f3efe6`) so only the border was visible at rest.
- **Recommended decision:** Border (and shadow) only when `.is-stuck`; transparent at rest so it blends. ✅ Done.
- **Priority:** Medium
- **Status:** Implemented
- **Relevant files:** `frontend/css/products.css`
- **Commit hash:** FTP `products.css v64`
- **Verification notes:** Playwright at 390px — no line at rest; border+shadow on stuck.
- Desktop tested: [ ] · 390px: [x] · 430px: [ ] · 768px: [ ]
- **Remaining issue:** Device confirmation.

### CAT-006 — Product status colour ("Enquire to order" / "Unavailable")
- **Page/component:** Product cards + detail status pill
- **Original concern:** Seen in screenshots — "● Enquire to order" and "Unavailable" shown in amber; "Available" in green.
- **Recommended decision:** Amber (not error red) for "Enquire to order"/limited states; green for "Available". Amber appears already in use in the live build. See DEC-002.
- **Priority:** Low
- **Status:** Implemented (appears live) — needs confirmation it is intentional/consistent everywhere.
- **Relevant files:** `frontend/css/products.css`, product rendering (`products.js` / `product-detail.js` / `data.js`)
- **Commit hash:** N/A (pre-existing)
- **Verification notes:** Not changed this session; recorded as a decision.
- Desktop tested: [ ] · 390px: [ ] · 430px: [ ] · 768px: [ ]
- **Remaining issue:** Confirm the amber token is used consistently and never error-red.

> **CAT — also see:** REJ-001 ("Our ranges" loop), DEC-008 (sticky toolbar is an intentional pattern).

---

## 4. Product detail

### PD-001 — "How to Use" section is oversized and misleading
- **Page/component:** Product detail usage section (`renderFullDesc` in `product-detail.js`)
- **Original concern:** Oversized/misleading — titled "How to Use" but only shows an application method + suitable uses, not steps.
- **Recommended decision:** Conditional heading — **"How to Use" only when genuine steps exist; otherwise "Application & Suitable Uses"**. ✅ Done. Robust check: `hasUsageSteps = Array.isArray(usage.steps) ? usage.steps.length>0 : Boolean(String(usage.steps||"").trim())`.
- **Priority:** High
- **Status:** Implemented
- **Relevant files:** `frontend/js/pages/product-detail.js`, `frontend/css/products.css`
- **Commit hash:** FTP `product-detail.js v13`, `products.css v67`
- **Verification notes:** Playwright headings verified at 360/390/430/768/1280 — id 1/2/10 (method+uses) → "Application & Suitable Uses"; id 8 (free-form) + id 9 (numbered) → "How to Use". Card also made compact + warm neutral (was pale-red warning panel). Section no longer competes with the sticky CTA / dark enquiry card (full-context 390px shot).
- Desktop tested: [x] (1280) · 390px: [x] · 430px: [x] · 768px: [x] · 360px: [x]
- **Remaining issue:** Real-device confirmation. "No usage" case verified by code logic only (the `if(usage)` guard omits the section) — no current product has empty usage to screenshot.

### PD-002 — "Suitable uses" looks like an input box / runs together
- **Page/component:** Product detail — suitable-uses display
- **Original concern:** Suitable uses render inside an input-looking box and run together without separation.
- **Recommended decision (styling):** Warm neutral card; multiple delimited values → warm chips; a **single value → a clean readable line** (not a full-width bordered box). Removed the mobile `.usage-chip:only-child { width:100% }` input-look rule. ✅ Done. **BUT true separation into multiple chips is blocked by DATA-001** (the DB strings have no `; ` delimiters, so every product currently yields ONE value → renders as a clean line, not multiple chips).
- **Priority:** High
- **Status:** Implemented (styling) — blocked on DATA-001 for real multi-chip separation
- **Relevant files:** `frontend/js/pages/product-detail.js` (single-vs-multiple render), `frontend/css/products.css` (`.usage-*`, `.usage-suitable-single`)
- **Commit hash:** FTP `product-detail.js v13`, `products.css v67`
- **Verification notes:** Playwright before/after at 360/390/430/768/1280: the fake-input box is gone; long single values (id 2, id 10) wrap cleanly as a readable line; warm chips retained for genuinely delimited data. No JS selectors removed (chip markup preserved; `.usage-suitable-single` added additively).
- Desktop tested: [x] · 390px: [x] · 430px: [x] · 768px: [x] · 360px: [x]
- **Remaining issue:** See DATA-001 — uses will only appear as multiple chips once the DB delimiters are restored.

### PD-003 — Breadcrumb references "Home"
- **Page/component:** Product detail breadcrumb
- **Original concern:** "why does it reference home if i didn't press from home?????"
- **Recommended decision:** Not a bug — breadcrumbs show site **hierarchy**, not click history, so "Home" is the correct ancestor. Kept on desktop; simplified on mobile (see MOB-003). User agreed. See DEC-001.
- **Priority:** Low
- **Status:** Decision recorded (Answered) + mobile change Implemented via MOB-003
- **Relevant files:** `frontend/product-detail.html`, `frontend/css/products.css`
- **Commit hash:** FTP `products.css v66` (mobile simplification)
- **Verification notes:** Explanation accepted by user.
- Desktop tested: [ ] · 390px: [x] · 430px: [ ] · 768px: [ ]
- **Remaining issue:** None (design decision).

### PD-004 — Action panel (Enquire / Compare / WhatsApp) sticky behaviour
- **Page/component:** Product detail action panel / sticky CTA
- **Original concern:** Recorded decision — the action panel may be sticky on desktop but should not be sticky on mobile.
- **Recommended decision:** Sticky on desktop, not sticky on mobile. See DEC-005. (Current mobile uses a bottom sticky CTA bar — confirm this matches the intent.)
- **Priority:** Medium
- **Status:** Planned (needs review against current behaviour)
- **Relevant files:** `frontend/css/products.css` (`.detail-sidebar`, `.sticky-cta`), `frontend/js/pages/product-detail.js`
- **Commit hash:** —
- **Verification notes:** Not audited this session.
- Desktop tested: [ ] · 390px: [ ] · 430px: [ ] · 768px: [ ]
- **Remaining issue:** Confirm desktop-sticky / mobile-not-sticky intent vs the current bottom CTA bar.

---

## 5. Compare tray and compare page

### CMP-001 — Compare edge tab/tray appears over the open mobile nav menu
- **Page/component:** Compare edge tab (`.cmp-tab`) / floating compare tray vs mobile nav drawer
- **Original concern:** On the open-menu screenshot the red compare button ("2") floated on top of the dark nav menu overlay ("what is this even why isit like that"). User then clarified their main concern was the missing nav bar (CRIT-001), but the compare button over the menu is a real stacking observation.
- **Recommended decision:** Ensure the compare tab/tray sits **below** the nav drawer + backdrop when the menu is open (z-index / hide while menu open). Also see DEC-004.
- **Resolution (2026-07-15 Run 2):** Chose **hide** over restack: `body.nav-drawer-open` (already set by navbar.js) now hides `.cmp-tab`, `.sticky-cta`, and `.compare-tray` via `visibility:hidden`, so the open menu is the single interactive layer. Also introduced the `--z-*` overlay ladder tokens in `:root` (typeahead 50 < nav 98-100 < filter sheet 119/120 < tray 200 < cmp-tab 850 < sticky CTA 900 < toast 999 < cmp modal 1100 < rotate 1200 < advisor 9990 < transitions 10000) and converted all products.css overlay z-indexes to them.
- **Priority:** Medium
- **Status:** Implemented (local, not deployed)
- **Relevant files:** `frontend/css/products.css`, `frontend/js/widgets/navbar.js` (class pre-existing)
- **Commit hash:** `75b93fd`
- **Verification notes:** Playwright 390px: tab visible before, `visibility:hidden` while `nav-drawer-open`, visible again after close; sticky-cta also hidden on detail. Screenshot `after-cmp001-drawer-390.png`.
- Desktop tested: [x] (n/a, mobile-only overlay) · 390px: [x] · 430px: [ ] · 768px: [ ]
- **Remaining issue:** On-device confirmation; 430/768 spot-check.

---

## 6. Product enquiry
- No specific issues raised in this conversation. The "+ Enquiry" flow appeared in screenshots without complaint.
- **Status:** Not reviewed — nothing outstanding.

---

## 7. Contact page
- No specific issues raised in this conversation.
- **Status:** Not reviewed — nothing outstanding.

---

## 8. Footer and navigation links
- No direct footer or nav-link content complaints this conversation.
- Footer appeared only in the overscroll screenshot (handled under **MOB-001**).
- Navbar structural bug tracked under **CRIT-001**; breadcrumb under **MOB-003 / PD-003**.
- **Status:** Not reviewed — nothing outstanding beyond the cross-referenced items.

---

## 9. Product Advisor
- The "Not sure which adhesive you need?" advisor banner appeared in screenshots with no complaint this conversation.
- **Status:** Not reviewed — nothing outstanding. (Placement decisions predate this conversation.)

---

## 10. Page transitions and motion
- No issues raised this conversation. (Swup SPA transitions exist site-wide.)
- **Status:** Not reviewed — nothing outstanding.

---

## 11. Admin pages
- No direct admin feedback. The shared dropdown fixes (CAT-002/CAT-003) were version-bumped and redeployed to admin pages too (`dropdown-ui.css v6`, `custom-select.js v4` on `admin/products.html`, `admin/enquiries.html`).
- **Status:** Implemented (inherited) — admin dropdowns get the same non-sticky/white-on-open behaviour. Not separately verified.
- Desktop tested: [ ] · 390px: [ ] · 430px: [ ] · 768px: [ ]

---

## 12. Accessibility
- No explicit a11y feedback, but changes preserved a11y:
  - Hover gating (`@media hover:hover`) keeps keyboard focus + `focus-visible` states intact for the sort control (CAT-002/003).
  - Custom-select keyboard nav (arrows/Home/End/Enter/Esc) and `aria-*` unchanged.
  - Breadcrumb remains a real `<nav aria-label="Breadcrumb">`; mobile only visually hides "Home ›" (MOB-003).
- **Status:** Not reviewed as a dedicated pass — no regressions expected; a focused a11y/contrast audit is a future improvement.

---

## 12B. Run 2 (2026-07-15) — local implementation pass

> **DEPLOYED TO PRODUCTION 2026-07-15 evening** (14 files, backup `ftp_backup/2026-07-15_run2/`, byte-verified on origin, live smoke tests pass). Update to the note below: entries in this section are now LIVE.
>
> **INCIDENT during deploy:** a teammate had hot-deployed `product-detail.js` v16 that calls `displayCapitalised()` without defining it, which **crashed the live product-detail page** (no title/specs; ReferenceError). Their attempts primed Cloudflare edge caches for `?v=16` through `?v=19` with broken copies (7-day TTL). Resolution: our working file shipped as **`product-detail.js?v=20`** (v17 was burned too). The teammate's broken v16 copy is preserved in the backup folder; their capitalisation change needs re-applying WITH its helper definition, as v21+. **Never reuse v16-v19 for this file.**
> Live `index.html`/`about.html` still reference `footer.js?v=15` (old-but-working code, backward compatible); bumping those refs on the live copies was deliberately skipped this run per the "do not modify index.html/teammate pages" constraint.

### FBL-001 — Footer brand links depend on trademark symbols / exact labels
- **Problem:** `?brand=deer` didn't filter (31 shown); only the exact `?brand=Deer™ Brand` URL worked. Footer emitted encoded display names.
- **Fix:** `BRAND_SLUGS` map + `canonicalBrand()` in products.js (slug, case-insensitive, ™/®-and-"Brand"-suffix tolerant); footer.js emits `/products?brand=deer|horsemen|premier|rhino`. Legacy full-name URLs still resolve.
- **Status:** Implemented (local) · **Commit:** `75b93fd` · **Files:** products.js, footer.js
- **Evidence:** `?brand=deer` → 14 of 31 + checkbox; `?brand=RHINO` → 1 of 31; `?brand=horsemen|premier` → both checked; legacy URL still works.
- **Note:** In-page filter changes still use `history.replaceState` (deliberate: no history spam, Swup interplay). Cross-page back/forward + direct URLs + refresh all work. Recorded as the accepted design.

### PD-005 — Detail page-bottom breathing room above the fixed bar
- **Fix:** `body.detail-has-cta .site-footer { padding-bottom: 20px }` (inside the dark footer so no cream strip; JS-measured body reservation unchanged).
- **Status:** Implemented (local) · **Commit:** `75b93fd` · **Files:** products.css

### CAT-007 — No-results state offers the Product Advisor
- **Fix:** empty state now has "Clear all filters" + "Ask the Product Advisor" side by side (`.empty-state-actions`).
- **Status:** Implemented (local) · **Commit:** `0cc4fd0` · **Files:** products.js, products.css
- **Evidence:** `?q=zzzznothing` renders both buttons; screenshot `after-noresults-390.png`.

### COPY-001 — Filter drawer heading + duplicate sort label
- **Fix:** drawer h2 "Filter Products" → "Refine Products" (matches sidebar + tablet toggle); removed the redundant `sr-only` label on `#sortSelect` (aria-label is the single accessible name; custom-select.js reads aria-label, verified unaffected).
- **Status:** Implemented (local) · **Commit:** `0cc4fd0` · **Files:** products.html

### PD-CTA-001 — Detail advisory card reframed as expert help
- **Problem:** dark card's "Send Product Enquiry →" duplicated the primary conversion right above the fixed enquiry bar.
- **Fix:** "Need help confirming compatibility?" + one-line copy + "Contact an Expert →" linking `/contact` (spec-supplied wording). Primary conversion stays in the sticky bar / desktop action panel.
- **Status:** Implemented (local) · **Commit:** `900646e` · **Files:** product-detail.js
- **Evidence:** 390 + 1280 render, no console errors; screenshot `after-guidance-390.png`.
- **v2 (2026-07-16 Run 5, approved client copy):** body now "Share your materials, application and quantity requirements. Our team will help confirm the most suitable option."; CTA "Get Product Advice →" is a `<button>` that opens the Product Advisor (contact-page fallback if the advisor script is absent). Verified: opens advisor with focus in its input, basket untouched, Escape still closes, no page errors (screenshot `run5-a7-advisor-open-390.png`). The earlier `/contact` link version (`900646e`) is superseded and is what's currently DEPLOYED; v2 is local-only.

### A11Y-002 — Breadcrumb `aria-current="page"`
- **Fix:** added to detail (`#breadcrumbProduct`) and compare current crumbs.
- **Status:** Implemented (local) · **Commit:** `900646e` · **Files:** product-detail.html, compare.html

### CMP-002 — Compare add/remove/limit announced to screen readers
- **Fix:** compare.js announces "<name> added/removed from compare." via the shared `window.announce` region; the max-limit path announces "Compare is full (3 products)..." instead of silently returning. Duplicate-add still guarded.
- **Status:** Implemented (local) · **Commit:** `7530733` · **Files:** compare.js
- **Evidence:** announcements carry real product names; list unchanged on 4th add; dup blocked.

### ENQ-002 — Inline per-field enquiry validation + email format check
- **Problem:** errors were summary-only (`aria-describedby` pointed every field at one message); email format was never validated client-side.
- **Fix:** per-field `.field-error` messages (`#eNameErr` etc.), `aria-invalid` + per-field `aria-describedby`, email regex, focus to first invalid; summary kept as overview. Success flow (intercepted API): reference shown, basket cleared, form hidden.
- **Status:** Implemented (local) · **Commit:** `ad75d7b` · **Files:** enquiry.html, enquiry.js, products.css
- **Evidence:** screenshots `after-enquiry-inline-errors-390.png`, `after-enquiry-success-390.png`. No real enquiry submitted (route intercepted).

### ADV-001 — Advisor sheet opened at 82vh with a huge blank middle
- **Fix:** mobile panel `height:auto; min-height:320px; max-height:78dvh; padding-bottom:env(safe-area-inset-bottom)`. Opens at content height (~54vh at 390), grows with the conversation to the cap, then messages scroll.
- **Status:** Implemented (local) · **Commit:** `616276c` · **Files:** chatbot.js
- **Evidence:** open 458px (54%), after reply 658px (78%) + scrollable; input stays visible. Screenshots `after-advisor-fit-390.png`, `after-advisor-grown-390.png`.

### CSV-001 — Admin CSV export: formula injection + missing Reference
- **Fix:** cells starting `=` `+` `-` `@` get a leading apostrophe (standard neutralisation; note: `+65...` phones are also prefixed — accepted trade-off); added Reference as the first column. Quoting/multiline/quotes verified with a hostile in-memory row (nothing persisted).
- **Status:** Implemented (local) · **Commit:** `c2a7bec` · **Files:** admin/enquiries.js (NOT a protected uploader file; live copy matched local v9 before edit)

### A11Y-003 — Advisor honors prefers-reduced-motion
- **Fix:** reduced-motion block zeroes panel/backdrop transitions and message smooth-scroll.
- **Status:** Implemented (local) · **Commit:** (Phase 8 commit) · **Files:** chatbot.js
- **Evidence:** computed transitionDuration ≈ 0 under `reducedMotion: 'reduce'`.

### Cache versions bumped locally (commit `859082e`)
`products.css v69 · products.js v34 · footer.js v16 · product-detail.js v15 · compare.js v10 · enquiry.js v2 · chatbot.js v18 · admin/enquiries.js v10` — applied consistently on products/product-detail/compare/enquiry/contact + admin/enquiries. **At deploy time the live `index.html`/`about.html` refs for products.css/footer.js must be bumped on the live copies (never deploy the repo copies).**

### Blocked / not done this run
- **DATA-001** — unchanged, awaiting wording approval + phpMyAdmin run (production DB untouched).
- **Admin Products page (all of it)** — deployment-blocked: teammate's live-only uploader (admin.js v16 / admin.css v27) is not in git; local files must not be edited or deployed until synced.
- **SEARCH-001 grouped filter autocomplete** — audited, spec'd, explicitly not implemented (awaiting approval).
- **CLIENT-003/004/005/006** — need DB/schema approval (and 005 sits inside the protected admin form).
- **CLIENT-007 (footer Admin Login)** — desktop link still present; simple footer.js edit but held for explicit confirmation since it removes a navigation entry the team may use.
- **QA-CROSS real-device verification** — everything above still needs the user's phone.

## 13. Future ideas / optional improvements

### FUT-001 — "Our ranges" scroll affordance
- **Concern/idea:** If discoverability of the 4 range chips is a worry, add an edge fade + clearer "peek" of the next tile so users know it scrolls.
- **Recommended decision:** Optional; only if the bounded scroll feels non-obvious. Offered, not requested.
- **Priority:** Low · **Status:** Future improvement · **Files:** `frontend/css/products.css` (`.hero-ranges-row`)

### FUT-002 — Reconcile repo `index.html` / `about.html` with live
- **Concern/idea:** Repo copies are stale placeholders vs the real live homepage/about; a landmine for any full re-upload.
- **Recommended decision:** Someone should sync repo ↔ live so the bodies stop being stale. See DEC-007.
- **Priority:** Low · **Status:** Future improvement · **Files:** `frontend/index.html`, `frontend/about.html`

---

## 14. Decisions already made

- **DEC-001 — Breadcrumb hierarchy is correct, not a bug.** "Home › Products › Product" reflects site structure, not click history. Kept on desktop; shortened to "Products › Product" on mobile (MOB-003). *Confirmed by user.*
- **DEC-002 — "Enquire to order" uses amber, not error red.** Limited/enquire states = amber; "Available" = green. (Appears already applied — CAT-006.)
- **DEC-003 — WhatsApp may use green or a green-accent treatment.** Green is acceptable/intended for the WhatsApp action, scoped so it doesn't fight the brand red.
- **DEC-004 — Compare tray must not cover content or the footer.** The floating compare tray/tab must reserve space / never overlap the footer or the open nav menu (CMP-001).
- **DEC-005 — Product-detail action panel may be sticky on desktop but not on mobile.** (PD-004.)
- **DEC-006 — Official Yee Lim and product-brand logos must never be modified.** Deer / Horsemen / Premier / Rhino marks and the YLAI logo are used as-is.
- **DEC-007 — `frontend/index.html` (and `about.html`) are out of scope unless explicitly approved.** They are teammate-owned/stale in the repo; never deploy the repo bodies. Live edits only touch their `?v=` refs.
- **DEC-008 — The sticky Filters/Sort toolbar is intentional and correct.** A sticky sort/filter bar is a standard catalogue pattern; kept (and redesigned per CAT-004), not removed.

---

## 15. Rejected or unnecessary changes

### REJ-001 — "Our ranges" full-circle / infinite-loop carousel
- **Original concern:** "for the our ranges shd it go full circle like u can scroll back to deer" — then "why is the full circle loop not recommended tho".
- **Decision:** **Rejected.** Keep the bounded horizontal scroll (already scrolls back to Deer by swiping). An infinite loop hides that there are exactly 4 fixed ranges, harms accessibility/keyboard order, adds implementation jank (cloned tiles, double-fired filter clicks), and is unnecessary for 4 items. If discoverability is the real concern, use FUT-001 instead.
- **Priority:** Low · **Status:** Rejected · **Files:** `frontend/products.html`, `frontend/css/products.css`

---

## 15B. Run 5 (2026-07-16) — safe-implementation sweep against the re-issued Run 2 spec

> Most Run 2 spec items were **already resolved** in Runs 2-4 (manifest in the session log). Deltas implemented this run, all local-only:
> - **PD-CTA-001 v2** — approved copy + "Get Product Advice →" opens the advisor (see entry above).
> - **CLIENT-002** — "Contact Yee Lim" in the empty Downloads state is now a real `/contact` link (muted underline, focus ring).
> - **SEARCH-001** — hyphen differences folded in suggestion matching ("spray-guns" ↔ "Spray Guns"); slugs/free-text unaffected.
> - **Verified additionally:** CMP-001 hidden overlays are NOT keyboard-focusable (visibility:hidden) and survive 4x open/close cycles; CSV neutralises `-10+20`/`@IMPORT` and preserves Unicode + quoted commas/newlines.
> - **Decisions recorded:** COPY-001 keeps "Refine Products" (dominant existing term, spec permits); FILTER-001 keeps `overscroll-behavior: contain` (deliberate anti-accident choice over boundary scroll-transfer); pushState filter history already shipped safely (committed-entry model) — no rollback to replaceState-only needed.
> - Evidence: delta suite 10/10, project suite 25/25, search suite 64/64. Versions: products.css v72, products.js v36, product-detail.js v22.
> - Blocked set unchanged (uploader sync + DB approvals); approved decisions 1-10 recorded in the architecture plan.

### Run 6 (2026-07-16) — verified local follow-up
- **Scope:** search normalisation parity, document URL validation, aria-live status region, accessible search input naming, cache version bumps on public pages, plus a public catalogue/detail polish pass.
- **Root causes:**
  1. Search suggestions and the grid used different text normalisation paths, so input variants like `spray-guns` could disagree.
  2. Product-document validation accepted protocol-relative/UNC-style values that could render unsafe external links.
  3. The shared live-region was created lazily, which could miss the first announcement on the initial user action.
  4. The search field relied on a redundant `aria-label` rather than the existing `<label for>` association.
  5. The public product detail page still surfaced the Downloads block too early in the content flow, and the filter summary used a noisy per-group badge pattern.
- **Run 6 fixes:**
  1. Added a shared `ylSearchNorm()` helper and used it in both the product grid filter pipeline and the typeahead suggestion ranking so autocomplete and the live results now agree.
  2. Hardened `validDocUrl()` to reject protocol-relative/UNC-style values and unsafe schemes while preserving same-origin `/documents/...` and `/uploads/docs/...` paths.
  3. Created the live region during app initialisation so `#ylStatus` exists before the first action. It remains a single hidden status region.
  4. Kept the search input’s accessible name through the associated `<label>` and preserved the combobox ARIA wiring.
  5. Reordered the public detail-page content to read as Product Description → Application & Suitable Uses → Downloads → Product Advice → Related Products, and simplified the filter heading chip to a calm “1 filter active / N filters active” summary without the old circular group badge.
- **Verification evidence (local):**
  - Browser smoke test to `http://127.0.0.1:8010/products` succeeded and loaded the page.
  - Browser smoke test to `http://127.0.0.1:8010/product-detail?id=1` succeeded and rendered the updated section order.
  - Playwright checks confirmed `spray-guns`, `spray guns`, `Spray Guns`, `spray---guns`, `spray–guns`, and whitespace-padded variants all returned the same 2-product result set; Enter committed the query and preserved the same result set; the suggestion panel surfaced `Spray Guns & Accessories` for the query.
  - Accessibility check confirmed one `#ylStatus[role="status"][aria-live="polite"]` region exists and the search input has a single associated `<label>` with `for="searchInput"` and no redundant `aria-label`.
  - Document validation checks rejected `//example.org/test.pdf`, `///example.org/test.pdf`, `\\example.org\\test.pdf`, `javascript:alert(1)`, `data:application/pdf,hello`, `vbscript:alert(1)`, `x`, `tbc`, and empty values; same-origin `/documents/...` and `/uploads/docs/...` values still validate.
  - Cache-version refs were verified as `app.js?v=3`, `products.js?v=38`, `product-detail.js?v=24`, and `products.css?v=73` on the owned public pages.
- **Status:** Verified locally; not deployed.

## 16. Client feedback 12/07/26 — classification (audited 2026-07-16, read-only)

> Source: [docs/client-feedback/YLAI-WebsiteFeedback120726.pdf](client-feedback/YLAI-WebsiteFeedback120726.pdf) (committed `b58de49`). Feedback predates the warm redesign; business requirements treated as authoritative, current design system preserved. Nothing below was implemented during this audit.
>
> **2026-07-16: full architecture + migration plan for the backend items (CLIENT-001/003/004/005/006, PRIV-001, SEC-001) now lives in [docs/CLIENT_FEATURES_ARCHITECTURE_PLAN.md](CLIENT_FEATURES_ARCHITECTURE_PLAN.md)** — schemas, endpoints, storage, phases 0-7, 10 approval questions, recommended MVP (taxonomy management first). Plan only; nothing executed.

### CLIENT-001 — Product image and document management
- **Classification:** **Teammate-owned live implementation — read-only audit and repository synchronisation review required.**
- **Status:** Partially satisfied on production (drag-drop main/additional images + SDS/TDS PDF zones, previews, empty states, size/type hints all visible live). Exists live only: NOT in working tree, NOT in HEAD, NOT in origin/products-admin (admin.js v16/admin.css v27 vs local v7/v17; endpoints `api/upload-product-images.php`, `api/upload_product_document.php` have no local counterparts).
- **Unverified vs client ask:** retrieval/replace/delete round-trip, whether uploads populate public `sdsUrl`/`tdsUrl` (API still returns none for all 31 products), storage location, DB fields.
- **Blockers:** deployment-blocked files unchanged (admin/products.html, admin.css, admin.js, api/products.php, upload endpoints). Requires teammate git sync before ANY work.

### CLIENT-002 — Persistent "Downloads" section with "No downloads available"
- **Requirement:** keep the section visible when no documents exist, with placeholder text.
- **Status: Implemented (local, 2026-07-16, NOT deployed).** `renderDownloads` now always renders the "Downloads" section: STATE A honest warm-neutral empty card ("No downloads are currently available for this product." + "Contact Yee Lim if you require technical documentation.", dashed border, deliberately not error-styled); STATES B/C/D one row per available document (icon, "Safety/Technical Data Sheet" label, "PDF document, opens in a new tab" sub-label, native anchors). `validDocUrl` guard: only explicit http(s) or site-rooted paths count as records — bare placeholders ("x", "tbc") and unsafe schemes fall to the empty state, never a broken button. The CLIENT-003 gate integration point is a single marked `docRow` action.
- **Evidence:** 18/18 checks (A/B/C/D, invalid + placeholder URLs, mobile + desktop, keyboard focus, zero page errors); screenshots `client002-stateA-390.png`, `client002-stateD-390.png`. Current live behaviour preserved for real documents (direct open, new tab).
- **Files:** product-detail.js, products.css · **Commit:** see quick-win commit below.

### CLIENT-007 status update (2026-07-16)
- **Implemented (local, NOT deployed).** Desktop footer Admin Login anchor + its CSS removed from footer.js (the "·" separator was the anchor's `::before`, so nothing dangles). Mobile footer already had none. Verified: zero `a[href*=admin]` in any public footer variant at desktop + mobile; `/admin/login.html` still reachable directly (200) with authentication untouched; no hidden replacement link. Homepage footers come from this shared component, so live index/about inherit the change at deploy time via `footer.js?v=17` ref bumps on the live copies (repo copies untouched, DEC-007).

### CLIENT-003 — Visitor details form before SDS/TDS download
- **Requirement:** Name, Email, Company, Contact No. captured before download; records go to the admin panel like enquiries; NOT emailed.
- **Status:** Missing entirely. Needs frontend gate (detail page modal/inline form), new API endpoint, new DB table (downloads log), admin surface (CLIENT-004). Depends on real document URLs existing (blocked on CLIENT-001 sync + document data entry). See PRIV-001.

### CLIENT-004 — Admin page to view/delete download records
- **Requirement:** separate admin menu listing TDS/SDS download submissions with delete.
- **Status:** Missing. Model on the existing enquiries page (list, detail, delete, CSV). Touches admin-nav.js (shared with protected page: coordinate). Depends on CLIENT-003 schema. DB approval required.

### CLIENT-005 — Non-technical management of Product Types / Brands / Industries
- **Requirement:** admin can add/remove filter list values without a developer.
- **Status:** Missing. Current taxonomy is hardcoded: `INDUSTRIES`/`SURFACES` arrays in data.js:81-92; brand + category `<option>`s hardcoded in the (protected) admin form; admin industries field is free text. A new industry typed on a product would NOT appear in the public filter sidebar without a code change. Requires: taxonomy tables or settings JSON + API + admin UI + public filter build from API. **Sits inside the protected admin form zone → blocked pending teammate sync.** DB approval required.

### CLIENT-006 — Technical site settings (contact details etc.)
- **Requirement:** admin-editable email/WhatsApp/contact number used by site interface + enquiry routing.
- **Status:** Missing. Values hardcoded in at least footer.js, product-detail.js (wa.me/6588755786), chatbot.js, contact.html (+65 8875 5786, contact@yeelimadhesives.com.sg); enquiry destination email lives server-side. Requires settings storage + API + admin form + consumption refactor. Medium effort. DB approval required. Broader "edit wording/images/layout" ask = CMS territory; recommend documenting a maintainer guide instead of building a CMS (needs client conversation).

### CLIENT-007 — Remove Admin Login link from public footer
- **Requirement:** explicit client instruction; they will bookmark the direct URL.
- **Status:** Partially satisfied (mobile footer already omits it); desktop link still present (footer.js:350). One-line owned-file change + v bump. **Now client-authorised: scheduled for next deploy window.**

### SEARCH-001 — Unified product + filter autocomplete
- **Status: Implemented (local, 2026-07-16, NOT deployed).** The one search field now suggests grouped results: PRODUCTS (thumb + name + brand·type, max 5) and BRANDS / PRODUCT TYPES / INDUSTRIES / SURFACES (label + live count, max 3 each), plus "View all N matching products". No Applications group by design: no application filter exists in the sidebar, and a suggestion must never fake a selection (decision recorded).
- **Behaviour:** filter suggestion → checks the REAL checkbox (single source of truth) → grid/count/pills/URL all update through `applyFilters`; query cleared; polite announcement ("Deer™ Brand filter applied. 14 of 31 products"); scrolls to catalogue. Product suggestion → detail page. Plain Enter → free-text search (never auto-picks). Empty state: "No direct matches. Press Enter to search the full catalogue." + advisor action.
- **Matching:** normalised (lowercase, ™/® optional, spaces collapsed, punctuation literal); fields: name, brand, type, industry, surface, short description. A6 ranking: exact/prefix product > exact/prefix filter label > contains-products > other filters. **Reviewed synonyms (complete list):** car/vehicle→Automotive, boat/ship→Marine, timber→Wood, cabinet→Carpentry, sofa→Upholstery. Navigational only; no technical equivalence implied.
- **URL/history (A10):** canonical slugs for ALL filter params (`brand=deer`, `industry=flooring`, `type=adhesives`, `surface=stone-ceramics` via `ylSlug`); legacy display-value URLs still resolve (`canonicalValue`). Typing = replaceState; committed selection/submit = pushState; committed entries are never clobbered by later typing (scratch branch). popstate restores query, checkboxes, pills, count; reloads if a filter entry is reached while another page's DOM is live (Swup skips non-swup states by design).
- **Stacking fix found during QA:** panel was painted over by the advisor banner (hero-inner z:1 tied + lost DOM order); `.st-elevate` lifts hero contexts to 60 only while open.
- **Evidence:** 64/64 Playwright checks incl. keyboard-only selection, back/forward x2, mobile 360/390/430 geometry (44px rows, contain-scroll, panel topmost at 5 sample points), 200% zoom, tablet. Screenshots `search001-*.png`. Zero console errors (Swup's pre-existing "Transition was skipped" AbortError under rapid programmatic navigation noted as a known library behaviour, not a regression).
- **Files:** products.js, products.css, products.html · **Commit:** see Run 3 commit below.

### FILTER-001 — Desktop filter sidebar usability (audited 2026-07-16)
- **Facts (1440/1280/1024):** sticky top 84px; max-height already viewport-derived (`viewport - 104px`); internal scroller `.drawer-body` genuinely overflows (content 1294px vs 533-665px window); **last options unreachable without inner scroll at every desktop size**; scroll-aware top/bottom fade present (CAT-001), styled 8px scrollbar; keyboard focus auto-scrolls into view; 640px/200%-zoom falls back to mobile toolbar gracefully; groups collapsible (all default-expanded); checkbox row target 32px.
- **Confirmed gaps:** (a) `overscroll-behavior: auto` on the scroller → scroll chaining to the page at limits; (b) Surface group (15 options) buries the tail; (c) 32px targets under the 40-44px ideal.
- **Recommended (not implemented):** `overscroll-behavior: contain`; default-collapse or "Show more (7)" for Surface/Industry with session-remembered expansion; nudge row height to ~40px. Keep the existing fade + scrollbar (already good). Evidence: `filter001-*.png`.
- **Status update: Implemented (local, 2026-07-16, NOT deployed).** Shipped: `overscroll-behavior: contain` on the scroller; "Show more (N)"/"Show less" on Industry (4 hidden) + Surface (7 hidden) with session-remembered expansion, checked options never hidden (`syncShowMore`/`revealCheckbox`, incl. URL restores + typeahead selections); label rows min-height 38px; heading chip "N active" (`#filterActiveTotal`); short-desktop fallback (`min-width:769px and max-height:620px` → static sidebar, page scroll). Verified: last option reachable after expand (33/33), slug + legacy URLs auto-reveal and check, 200% zoom falls back to mobile UI, tablet unaffected. Part of the 64/64 run above.

### PRIV-001 — Personal-data handling for download records (planning, blocks CLIENT-003/004)
- Download records are PII (name, email, company, phone) under Singapore PDPA. Requirements for the eventual build: purpose notice at the capture form; admin-only access (session-gated like enquiries); deletion capability (CLIENT-004) as the retention tool + a stated retention period (client to confirm, e.g. 12 months); no email fan-out (client explicitly wants panel-only); exclude from CSV formula injection the same way enquiries export now guards; escape all rendered values (reuse enquiries `escapeHtml` pattern); do not log PII in server error logs.

### SEC-001 — Secure image/document upload/download handling (read-only observations)
- Observed live: `/uploads/`, `/uploads/products/`, `/api/` return 403 (no directory listing — good); `api/upload_product_document.php` unauthenticated → 401 (good); **`api/upload-product-images.php` unauthenticated GET → HTTP 200 with JSON validation error** — it processes input before/without an auth gate on GET; POST auth could not be verified without performing an upload (not attempted). JS sends a Bearer token.
- To verify during teammate sync (server code not fetchable): auth enforced before ANY processing on both endpoints; file-type allowlist by content (not just extension); size caps server-side; randomised stored filenames; upload dir execution disabled (php engine off / .htaccess); SDS/TDS served as static PDFs or via a read-only handler; no path traversal via product_id/document_type.
- Future CLIENT-003 download gate must not expose other visitors' records and must rate-limit like enquiries (honeypot pattern exists).

## Instructions for future Claude sessions

> Whenever the user raises a new issue, add it to this tracker. Whenever an issue is implemented, update its status, files, commit, and testing evidence. **Never delete historical entries; mark them resolved, rejected, or superseded.**

Additional working rules for this file:
- Only mark an item **Verified** after visually and functionally testing it — never just because code changed. Record which breakpoints (desktop / 390 / 430 / 768) and whether the user confirmed on-device.
- Keep design opinions separate from confirmed bugs.
- Keep the summary counts and "Next recommended fixes" list in sync when statuses change.
- Respect the recorded decisions (Section 14) and constraints (esp. DEC-006 logos, DEC-007 index/about out of scope).
- Commit hashes: replace `FTP <asset vN>` with the real git hash if/when the branch is committed.
