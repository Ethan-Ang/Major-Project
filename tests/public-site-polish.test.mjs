// Regression guards for the 2026-08-04 full-site polish pass.
//
// These are the invariants that were explicitly asked for and that a future
// edit could plausibly undo by accident: the compare tab's red rule, the
// compare drawer's single-transform motion model, the WhatsApp CTA's brand
// colour, the favicon wiring, and the skip link on every public page.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import path from "node:path";

const root = new URL("../frontend/", import.meta.url);
const readRaw = (rel) => fs.readFileSync(new URL(rel, root), "utf8");

// Assertions about what a page LINKS TO or LOADS must look at markup, not at
// prose. Several of these files carry comments that quote the very markup they
// replaced ("was href=contact-us.html, which 404s"), and a raw-text match reads
// those quotations as live markup. Strip HTML comments first.
const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, "");
const read = (rel) => stripComments(readRaw(rel));

const css = read("css/products.css");
const compareJs = read("js/widgets/compare.js");
const footerJs = read("js/widgets/footer.js");
const productsJs = read("js/pages/products.js");

const USER_OWNED_PAGES = [
  "products.html",
  "product-detail.html",
  "compare.html",
  "enquiry.html",
  "contact.html",
  "404.html",
];
const pages = Object.fromEntries(USER_OWNED_PAGES.map((p) => [p, read(p)]));

// Isolate a CSS rule body by selector, so assertions cannot accidentally match
// a comment or an unrelated rule elsewhere in a 200KB stylesheet.
// Anchored so ".contact-whatsapp" cannot match inside
// ".contact-info-card .contact-whatsapp" — the selector must start a rule.
function ruleBody(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|[};]|\\*/)\\s*${escaped}\\s*\\{([^}]*)\\}`, "m").exec(source);
  return match ? match[1] : null;
}

// ─── 6A: the Compare tab must not wear a red line ────────────────

test("the expanded compare tab has no red rule, outline or glow", () => {
  const expanded = ruleBody(css, ".compare-tray.is-expanded .compare-tray-trigger");
  assert.ok(expanded !== null, "the expanded-tab rule must still exist");
  assert.match(
    expanded,
    /box-shadow:\s*none/,
    "expanding the tab must clear its shadow, not swap in a red inset rule"
  );
  assert.doesNotMatch(
    expanded,
    /var\(--red|#[cC][cC]2929|inset/,
    "no red and no inset rule on the expanded tab"
  );
});

test("no compare-tab rule reintroduces a red inset line in any state", () => {
  const offenders = css
    .split("\n")
    .filter((line) => /compare-tray-trigger/.test(line) && /inset 0 2px 0/.test(line));
  assert.deepEqual(offenders, [], "the red inset top rule must stay removed");
});

test("nothing casts a shadow into the page while the drawer is collapsed", () => {
  // FIELD BUG: the panel's lift shadow points UPWARD, and while collapsed the
  // panel sits flush below the viewport edge — so it bled soft grey back into
  // the bottom of the page, painting a dark band behind and around the tab.
  // The tab itself was already pure white; the band was this.
  const panel = ruleBody(css, ".compare-tray-panel");
  assert.doesNotMatch(panel, /box-shadow/, "the collapsed panel must not cast anything");
  const openPanel = ruleBody(css, ".compare-tray.is-expanded .compare-tray-panel");
  assert.match(openPanel, /box-shadow: 0 -10px 30px -14px/, "the lift belongs to the OPEN drawer");
  // and the tab itself carries no shadow in any state
  const trigger = ruleBody(css, ".compare-tray-trigger");
  assert.match(trigger, /box-shadow: none/, "a drop shadow smudged grey around a white tab");
  assert.doesNotMatch(css, /\.compare-tray-trigger:hover \{ box-shadow:/,
    "hover is carried by the border, not elevation");
});

test("the collapsed compare tab keeps the shared neutral border and white surface", () => {
  const trigger = ruleBody(css, ".compare-tray-trigger");
  assert.match(trigger, /background:\s*var\(--card\)/, "white surface token");
  assert.match(trigger, /border:\s*1px solid var\(--border\)/, "shared neutral hairline");
});

test("the compare icon is the tab's only red, and the count stays neutral", () => {
  assert.match(css, /\.compare-tray-trigger \.ctt-ic\s*\{\s*color:\s*var\(--red\);/);
  const count = ruleBody(css, ".compare-tray-trigger #compareTrayCount");
  assert.match(count, /color:\s*var\(--muted\)/, "the count must not be red");
});

// ─── 6B: one wrapper, one transform, explicit states ─────────────

test("the drawer moves as a single transform on the wrapper", () => {
  const visible = ruleBody(css, ".compare-tray.visible");
  const expanded = ruleBody(css, ".compare-tray.visible.is-expanded");
  assert.match(visible, /transform:\s*translate3d\(0, var\(--cmp-panel-h\), 0\)/,
    "collapsed parks the wrapper by exactly the panel height");
  assert.match(expanded, /transform:\s*translate3d\(0, 0, 0\)/,
    "expanded returns the same wrapper to rest");
});

test("open and close use the specified durations and curves", () => {
  const expanded = ruleBody(css, ".compare-tray.visible.is-expanded");
  const collapsed = ruleBody(css, ".compare-tray.visible");
  // open: ~280-320ms on cubic-bezier(0.22, 1, 0.36, 1)
  assert.match(expanded, /transform 0\.3s cubic-bezier\(0\.22, 1, 0\.36, 1\)/);
  // close: ~220-260ms on a controlled ease-in
  assert.match(collapsed, /transform 0\.24s cubic-bezier\(0\.4, 0, 0\.6, 1\)/);
});

test("the panel no longer animates height, padding or bottom", () => {
  const panel = ruleBody(css, ".compare-tray-panel");
  assert.doesNotMatch(panel, /grid-template-rows/, "height animation must stay removed");
  assert.doesNotMatch(panel, /transition/, "the panel itself no longer transitions on desktop");
  const inner = ruleBody(css, ".compare-tray-inner");
  assert.doesNotMatch(inner, /transition:\s*padding/, "padding must not animate");
});

test("no transition: all anywhere in the shared stylesheet", () => {
  assert.doesNotMatch(css, /transition:\s*all\b/, "transition: all is banned");
});

test("closing is driven by transitionend, not a chain of setTimeout guesses", () => {
  assert.match(compareJs, /addEventListener\("transitionend"/,
    "the close must complete on transitionend");
  assert.match(compareJs, /cmp-closing/, "an explicit closing state must exist");
  assert.match(compareJs, /cmp-opening/, "an explicit opening state must exist");
});

test("rapid toggling cannot strand the drawer: a re-open cancels the in-flight close", () => {
  assert.match(compareJs, /function ylCancelCompareClose/);
  assert.match(compareJs, /_cmpCloseToken\+\+/,
    "a token must invalidate a superseded close");
  assert.match(compareJs, /if \(token !== _cmpCloseToken\) return;/,
    "a superseded close must not finish");
});

// ─── 6C: slot-level updates, not a full rebuild ──────────────────

test("adding a product fills one slot instead of rewriting the drawer", () => {
  assert.match(compareJs, /function reconcileCompareSlots/);
  assert.doesNotMatch(
    compareJs,
    /slotsEl\.innerHTML\s*=/,
    "the wholesale innerHTML rebuild must stay removed"
  );
});

test("slot enter/exit/FLIP timings sit inside the specified bands", () => {
  const inMs = /CMP_SLOT_IN_MS\s*=\s*(\d+)/.exec(compareJs);
  const outMs = /CMP_SLOT_OUT_MS\s*=\s*(\d+)/.exec(compareJs);
  assert.ok(inMs && Number(inMs[1]) >= 180 && Number(inMs[1]) <= 240, "enter 180-240ms");
  assert.ok(outMs && Number(outMs[1]) >= 150 && Number(outMs[1]) <= 200, "exit 150-200ms");
  assert.match(compareJs, /translate3d\(0, 6px, 0\)/, "6px upward entry");
});

test("Clear all disables Compare now", () => {
  // Compare now became an <a href="/compare"> so it can travel through Swup
  // (SWUP-001). Anchors have no `disabled`, so the inactive state is centralised
  // in ylSetCompareNowEnabled and the empty branch must call it with false.
  assert.match(compareJs, /function ylSetCompareNowEnabled\(enabled\)/);
  assert.match(
    compareJs,
    /ylSetCompareNowEnabled\(false\);/,
    "emptying the comparison must disable Compare now"
  );
  assert.match(
    compareJs,
    /ylSetCompareNowEnabled\(list\.length >= 2\);/,
    "a populated tray must enable it only from two products up"
  );
});

test("Compare now is a Swup-navigable anchor, not a location.href button", () => {
  for (const name of ["products.html", "product-detail.html"]) {
    assert.doesNotMatch(pages[name], /location\.href='\/compare'/,
      `${name}: hard navigation bypasses Swup`);
    assert.match(pages[name], /<a class="compare-tray-btn[^"]*" id="compareBtn" href="\/compare"/,
      `${name}: must be a real same-origin anchor`);
  }
});

test("a disabled Compare now cannot navigate by click or key", () => {
  assert.match(compareJs, /ylOnce\("compareNow:guard"/);
  assert.match(compareJs, /aria-disabled"\) === "true"/);
  // capture phase, so the click never reaches Swup's own link handler
  assert.match(compareJs, /addEventListener\("click",[\s\S]{0,200}\}, true\);/);
});

test("panel controls leave the tab order while the drawer is collapsed", () => {
  assert.match(compareJs, /panel\.setAttribute\("inert", ""\)/);
  assert.match(compareJs, /panel\.removeAttribute\("inert"\)/);
});

// ─── 12/14/15/16: three permanent slots, picker open at 3/3 ──────

test("both tray pages ship exactly three permanent slot containers", () => {
  for (const name of ["products.html", "product-detail.html"]) {
    const html = pages[name];
    const shells = html.match(/<div class="compare-slot is-empty" data-slot="\d"><\/div>/g) || [];
    assert.equal(shells.length, 3, `${name}: three outer slots in the markup`);
    for (const i of [0, 1, 2]) {
      assert.match(html, new RegExp(`data-slot="${i}"`), `${name}: slot ${i}`);
    }
  }
});

test("slot geometry lives on the outer container, so filled and empty match", () => {
  const shell = ruleBody(css, ".compare-slot");
  assert.match(shell, /flex: 1 0 180px/, "one flex basis for every slot");
  assert.match(shell, /min-width: 0/, "a long product name must not widen the track");
  assert.match(shell, /height: 60px/);
  assert.match(shell, /box-sizing: border-box/);
  assert.match(shell, /max-width: 220px/);
});

test("the slot row scrolls rather than clipping when it cannot fit", () => {
  // REGRESSION GUARD: this was briefly `overflow-x: clip`, on the assumption
  // that three slots always fit on "desktop". They only fit from ~1100px up.
  // Below that, clip cut the third slot off with no way to reach it — measured
  // 1 of 3 reachable at 768px, 2 of 3 at 1024px. Scrolling is the correct
  // fallback; it shows nothing at widths where the slots do fit.
  const row = ruleBody(css, ".compare-tray-slots");
  assert.doesNotMatch(row, /overflow-x: clip/, "clip makes slots unreachable below ~1100px");
  assert.match(row, /overflow-x: auto/);
  assert.match(row, /min-width: 0/);
  // contained so a slot-row scroll can never chain into a full-page one
  assert.match(row, /overscroll-behavior-x: contain/);
});

test("stacked slots fill the mobile sheet instead of keeping the desktop cap", () => {
  // FIELD BUG: when the permanent outer .compare-slot was introduced, the box
  // metrics moved onto it — including max-width:220px, which only makes sense
  // for three slots side by side. The mobile override still targeted the inner
  // .cmp-slot, so every row stayed pinned at 220px inside a ~358px sheet and
  // left a dead gap down the right-hand side.
  const mobileShell = ruleBody(css, ".compare-tray-slots .compare-slot");
  assert.ok(mobileShell, "the mobile block must override the OUTER shell, not just .cmp-slot");
  assert.match(mobileShell, /max-width: none/, "release the desktop width cap");
  assert.match(mobileShell, /width: 100%/, "one slot per row, full sheet width");
});

test("the shells are emptied, never removed", () => {
  assert.match(compareJs, /function ensureCompareSlotShells/);
  assert.doesNotMatch(compareJs, /slots\.replaceChildren\(\)/,
    "that deleted the permanent outer containers");
  assert.match(compareJs, /ensureCompareSlotShells\(slots\)\.forEach\(shell => clearShell\(shell, false\)\)/);
});

test("products compact to the front and Add a Product always trails", () => {
  // FIELD BUG: selections kept whichever shell they already held, so removing
  // the middle of three left [P1][Add][P3] — a hole with the third product
  // stranded past it. Slack space in a desktop row; plainly broken stacked on
  // a phone. Remaining products now close up in list order.
  assert.match(compareJs, /wantedIds\.forEach\(\(id, i\) => \{ placement\[i\] = id; \}\);/,
    "products fill shells 0..n-1 in list order");
  assert.match(compareJs, /const addIndex = list\.length < COMPARE_MAX \? list\.length : -1;/,
    "the add control sits immediately after the last product");
  assert.doesNotMatch(compareJs, /slotsEl\.appendChild\(addEl\)/,
    "appending it would create a fourth element");
});

test("compacting MOVES a product's card rather than rebuilding it", () => {
  // A rebuild would re-request the thumbnail and flash. appendChild relocates
  // the live node, and the FLIP pass animates it into its new position.
  assert.match(compareJs, /function renderFilledShell\(shell, product, animate, existingNode\)/);
  assert.match(compareJs, /if \(existingNode && existingNode\.parentElement !== shell\)/);
  assert.match(compareJs, /shell\.replaceChildren\(existingNode\);/);
  assert.match(compareJs, /const delta = first\.get\(id\) - node\.getBoundingClientRect\(\)\.left;/,
    "FLIP the moved card from its old position");
});

test("the mobile sort control drops its redundant SORT prefix", () => {
  // The bar is narrow; a "SORT" prefix in front of "Default order" ate the room
  // the value needs and said nothing the value did not. aria-label still names it.
  const mobileSort = /<select id="mobileSortSelect"[^>]*>/.exec(pages["products.html"])[0];
  assert.doesNotMatch(mobileSort, /data-trigger-label/, "no visible prefix on mobile");
  assert.match(mobileSort, /aria-label="Sort products"/, "accessible name preserved");
  // the desktop control is a different element and keeps its visible label
  assert.match(pages["products.html"], /<span class="grid-sort-label"[^>]*>/);
});

test("the picker no longer closes itself at the maximum", () => {
  assert.doesNotMatch(compareJs, /setTimeout\(closeComparePicker/,
    "reaching 3/3 is not the same as finishing the comparison");
  // count / drawer / picker must be independent state
  assert.doesNotMatch(compareJs, /if \(getCompareList\(\)\.length >= COMPARE_MAX\) \{\s*closeComparePicker/);
});

test("the maximum-limit message exists, is shared, and is tied to disabled rows", () => {
  assert.match(compareJs, /id="compareLimitMessage" role="status" hidden/);
  assert.match(compareJs, /limitEl\.hidden = !full;/, "hidden again the moment the count drops");
  assert.match(compareJs, /disabled aria-describedby="compareLimitMessage"/,
    "one shared description rather than repeating the limit on every row");
  // selected rows must stay operable at 3/3
  assert.match(compareJs, /const disabled = !inCmp && full;/,
    "only UNselected products are disabled");
});

test("a shell's state is one authoritative marker, not partial attributes", () => {
  // FIELD BUG: renderFilledShell never cleared dataset.cmpRole, so any shell
  // that had once been the "Add a product" slot stayed stamped role="add" and
  // renderAddShell's `if (role === "add") return` refused to rebuild it. The
  // symptom was that removing a product left its card on screen — and only for
  // slots 1 and 2, because slot 0 had never been the add slot.
  assert.match(compareJs, /function applyShell\(shell, state, node, animate\)/);
  assert.match(compareJs, /if \(shellState\(shell\) === state\) return;/,
    "the skip decision must read the complete desired state");
  assert.match(compareJs, /shell\.dataset\.cmpState = state;/);
  // every path must clear the attributes it does not own
  assert.match(compareJs, /else delete shell\.dataset\.cmpId;/);
  assert.match(compareJs, /else delete shell\.dataset\.cmpRole;/);
  // and the old per-function early returns must be gone
  assert.doesNotMatch(compareJs, /if \(shell\.dataset\.cmpRole === "add"\) return;/);
  assert.doesNotMatch(compareJs, /if \(shell\.dataset\.cmpId === id\) return;/);
});

test("clearing a shell empties it instead of writing the string \"null\"", () => {
  // FIELD BUG: replaceChildren(null) stringifies its argument, so a cleared
  // slot rendered literal "null" text in the tray.
  assert.match(compareJs, /if \(node\) shell\.replaceChildren\(node\);\s*\n\s*else shell\.replaceChildren\(\);/,
    "replaceChildren must be called with no arguments to clear");
  assert.doesNotMatch(compareJs, /shell\.replaceChildren\(node\);(?!\s*\n\s*else)/);
});

test("a superseded slot swap cannot write stale content", () => {
  assert.match(compareJs, /shell\.dataset\.cmpSwap = String\(token\);/);
  assert.match(compareJs, /if \(shell\.dataset\.cmpSwap !== String\(token\)\) return;/);
});

test("the scroll lock compensates for the scrollbar gutter locally", () => {
  // Every overlay locks the page with overflow:hidden, which reclaims ~15px on
  // Windows/Linux and shifts the fixed compare bar sideways.
  // This was first tried as `scrollbar-gutter: stable` on <html> — WRONG: it
  // reserved the gutter on every page load, narrowed the layout and exposed the
  // near-black html background as a strip down the right edge of every page.
  // The compensation belongs to the lock, not the document.
  assert.doesNotMatch(css, /^\s*scrollbar-gutter:/m,
    "must not be a global document rule");
  assert.match(css, /body\.yl-scroll-locked \{ padding-right: var\(--yl-sb, 0px\); \}/);
  assert.match(compareJs, /function ylLockPageScroll\(\)/);
  assert.match(compareJs, /const gutter = window\.innerWidth - document\.documentElement\.clientWidth;/,
    "measure the real gutter rather than assuming a width");
  assert.match(compareJs, /function ylUnlockPageScroll\(\)/);
  assert.match(compareJs, /document\.documentElement\.style\.removeProperty\("--yl-sb"\)/,
    "the lock must clean up after itself");
  // the raw overflow writes must go through the helpers
  assert.doesNotMatch(compareJs, /document\.body\.appendChild\(panel\);\s*\n\s*document\.body\.style\.overflow = "hidden";/);
});

// ─── 9A: the WhatsApp CTA stays Yee Lim red ──────────────────────

test("the contact WhatsApp CTA is Yee Lim red with a white glyph, never green", () => {
  const cta = ruleBody(css, ".contact-whatsapp");
  assert.match(cta, /background:\s*var\(--red\)/, "red background");
  assert.match(cta, /color:\s*#fff/, "white label");
  assert.doesNotMatch(cta, /#25D366|#16a34a|#f2faf4/i, "no WhatsApp green anywhere on it");
  assert.match(css, /\.contact-whatsapp svg \{[^}]*color:\s*#fff/, "white icon");
});

test("the WhatsApp CTA is a width-fitted, centred icon+label group", () => {
  const cta = ruleBody(css, ".contact-whatsapp");
  assert.match(cta, /display:\s*inline-flex/);
  assert.match(cta, /align-items:\s*center/);
  assert.match(cta, /justify-content:\s*center/);
  assert.match(cta, /width:\s*fit-content/);
  assert.doesNotMatch(cta, /position:\s*absolute/, "no absolute positioning for the glyph");
  const min = /min-height:\s*(\d+)px/.exec(cta);
  assert.ok(min && Number(min[1]) >= 54 && Number(min[1]) <= 56, "54-56px tall");
});

test("the WhatsApp number and destination are unchanged", () => {
  assert.match(pages["contact.html"], /href="https:\/\/wa\.me\/6588755786"/);
});

// ─── 12: favicon ─────────────────────────────────────────────────

test("every user-owned page declares the favicon set exactly once", () => {
  for (const [name, html] of Object.entries(pages)) {
    const icons = html.match(/<link rel="icon"/g) || [];
    assert.equal(icons.length, 3, `${name}: one .ico + one 32px + one 16px, no duplicates`);
    assert.match(html, /<link rel="icon" href="\/favicon\.ico" sizes="any">/, name);
    assert.match(html, /favicon-32x32\.png/, name);
    assert.match(html, /favicon-16x16\.png/, name);
    assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png">/, name);
  }
});

test("the favicon files referenced actually exist and are non-empty", () => {
  for (const asset of ["favicon.ico", "favicon-16x16.png", "favicon-32x32.png", "apple-touch-icon.png"]) {
    const file = new URL(asset, root);
    assert.ok(fs.existsSync(file), `${asset} must exist so the request cannot 404`);
    assert.ok(fs.statSync(file).size > 100, `${asset} must not be a stub`);
  }
});

test("Home and About carry the same favicon set as every other page", () => {
  // Superseded the earlier "must stay untouched" rule: Home and About are now
  // explicitly in scope for shared-shell synchronisation. Their BODY content is
  // what stays protected — see the body-preservation test below.
  for (const name of ["index.html", "about.html"]) {
    const html = read(name);
    assert.equal((html.match(/<link rel="icon"/g) || []).length, 3, `${name}: same three icon links`);
    assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png">/, name);
    assert.doesNotMatch(html, /YeeLim_logo\.png/,
      `${name}: the old icon href returned 404 on live and must not come back`);
  }
});

test("the favicon is the brand red, not the previous teal", () => {
  // The generator asserts per-size hue cleanliness; this guards the source of
  // truth so the colour cannot silently drift back.
  const gen = fs.readFileSync(new URL("../qa/generate-favicons.mjs", root), "utf8");
  assert.match(gen, /const RED = '#CC2929'/, "must use the --red design token value");
  assert.ok(!fs.existsSync(new URL("images/logos/ylai-y-mark-512.png", root)),
    "the superseded teal master must be gone");
  assert.ok(fs.existsSync(new URL("images/logos/ylai-y-mark-red-512.png", root)),
    "the red master must be present");
});

test("Home and About load products.css like every other Swup page", () => {
  // Reversed on 2026-08-05. These pages used to keep a separate styles.css,
  // which cannot work: Swup swaps the #swup container and never touches <head>,
  // so arriving at Products from Home rendered the catalogue with products.css
  // never loaded, and arriving back rendered Home with styles.css never loaded.
  // Their rules now live in products.css scoped to .yl-static. The full
  // invariant is enforced in tests/style-token-parity.test.mjs.
  for (const name of ["index.html", "about.html"]) {
    const html = read(name);
    assert.match(html, /css\/products\.css\?v=\d+/, `${name} must load the shared stylesheet`);
    assert.doesNotMatch(html, /\/styles\.css\?v=/, `${name} must not load the retired styles.css`);
  }
  // and both must request it at the SAME version, or the edge serves two copies
  const v = (n) => /css\/products\.css\?v=(\d+)/.exec(read(n))[1];
  assert.equal(v("index.html"), v("about.html"), "products.css version must match across both pages");
});

// NOTE: the Home/About copy assertions that used to live here pinned specific
// sentences, which meant every legitimate edit by the teammate broke a test that
// had nothing to do with the change. Ownership moved to
// tests/home-about-copy-integrity.test.mjs, which checks the invariant that
// actually matters and does not go stale: the dictionary's English must equal
// the words on the page, in both directions, whatever those words currently are.
test("Home/About copy integrity is covered by its own suite", () => {
  const suite = fs.readFileSync(
    new URL("./home-about-copy-integrity.test.mjs", import.meta.url), "utf8");
  assert.match(suite, /dictionary English matches the teammate's copy/);
  assert.match(suite, /their body content and structure are untouched/);
});

test("About's broken CTA was repaired and the anchors point at real sections", () => {
  const about = read("about.html");
  assert.doesNotMatch(about, /contact-us\.html/, "that href returned 404 on live");
  // The Company column's deep links now name the sections About actually has
  // (#mission, #values) instead of #heritage / #quality. Every fragment the
  // footer emits must resolve to a real section.
  for (const fragment of new Set(
    [...footerJs.matchAll(/href="\/about#([A-Za-z0-9_-]+)"/g)].map((m) => m[1])
  )) {
    assert.match(
      about,
      new RegExp(`<section[^>]*\\sid="${fragment}"`),
      `the footer links /about#${fragment} but About has no such section`
    );
  }
  assert.match(footerJs, /href="\/about#mission"/);
  assert.match(footerJs, /href="\/about#values"/);
});

test("Home and About join the Swup shell without duplicate containers", () => {
  for (const name of ["index.html", "about.html"]) {
    const html = read(name);
    assert.equal((html.match(/id="swup"/g) || []).length, 1, `${name}: exactly one #swup`);
    assert.equal((html.match(/id="mainContent"/g) || []).length, 1, `${name}: exactly one main landmark`);
    assert.match(html, /<main id="mainContent"[^>]* tabindex="-1">/, name);
    assert.match(html, /class="skip-link"/, `${name}: skip link`);
    assert.doesNotMatch(html, /href="(products|contact|contact-us)\.html"/,
      `${name}: .html links 301-redirect and defeat Swup`);
  }
  const pt = fs.readFileSync(new URL("js/widgets/page-transitions.js", root), "utf8");
  assert.match(pt, /"\/about"/, "/about must participate in the SPA");
});

test("the sticky navbar's anchor offset is declared once, in the navbar", () => {
  const nav = fs.readFileSync(new URL("js/widgets/navbar.js", root), "utf8");
  assert.match(nav, /scroll-margin-top: 68px/,
    "native fragment navigation otherwise parks the target under the sticky header");
});

// ─── 13: skip link + landmark on every public page ───────────────

test("every user-owned page has one skip link pointing at its main landmark", () => {
  for (const [name, html] of Object.entries(pages)) {
    const links = html.match(/class="skip-link[^"]*" href="#mainContent"/g) || [];
    assert.equal(links.length, 1, `${name}: exactly one skip link`);
    assert.match(html, /<main id="mainContent"[^>]* tabindex="-1">/, `${name}: focusable main landmark`);
  }
});

test("the skip link is defined once, in the shared navbar component", () => {
  // MOVED from css/products.css (SHELL-001): at the time, Home and About did not
  // load that stylesheet, so a definition there left them without a skip link.
  // They load it now, but navbar.js remains the right home for this: it is the
  // one file every public page loads, including any future page.
  const nav = fs.readFileSync(new URL("js/widgets/navbar.js", root), "utf8");
  assert.match(nav, /\.skip-link,\s*\n\s*\.nf-skip-link \{/, "one shared definition, in the navbar");
  assert.doesNotMatch(css, /^\.skip-link,/m, "products.css must no longer define it");
  const nf = read("css/404.css");
  assert.doesNotMatch(nf, /\.nf-skip-link \{/, "the 404 must not redefine it");
});

test("every public page, including Home and About, has one skip link", () => {
  for (const name of [...USER_OWNED_PAGES, "index.html", "about.html"]) {
    const html = read(name);
    assert.equal((html.match(/class="skip-link/g) || []).length, 1, `${name}: exactly one`);
  }
});

test("all eight public pages request identical shared-asset versions", () => {
  // Live Home/About were pinned at navbar.js?v=19 / footer.js?v=20 while the
  // other six asked for v25/v24 — the same file served at two versions, so the
  // edge handed Home and About a stale shell.
  const ASSETS = ["js/widgets/navbar.js", "js/widgets/footer.js", "js/i18n.js"];
  const all = [...USER_OWNED_PAGES, "index.html", "about.html"];
  for (const asset of ASSETS) {
    const seen = new Map();
    for (const name of all) {
      const m = new RegExp(asset.replace(/[./]/g, "\\$&") + "\\?v=(\\d+)").exec(read(name));
      if (m) seen.set(name, m[1]);
    }
    const versions = new Set(seen.values());
    assert.equal(versions.size, 1,
      `${asset} requested at ${[...versions].join(" and ")}: ${JSON.stringify(Object.fromEntries(seen))}`);
  }
});

// ─── Error colour is one token, not a second brand red ───────────

test("validation red is a single token and never a hardcoded hex", () => {
  assert.match(css, /--error:\s*#c0392b/, "one error token");
  const strays = css.match(/#c0392b/g) || [];
  assert.equal(strays.length, 1, "the hex may appear only in the token definition");
  for (const [name, html] of Object.entries(pages)) {
    assert.doesNotMatch(html, /#c0392b/, `${name}: no inline error hex`);
  }
});

// ─── SEO wiring ──────────────────────────────────────────────────

test("indexable pages carry a canonical, and the noindex 404 deliberately does not", () => {
  for (const name of ["products.html", "compare.html", "enquiry.html", "contact.html"]) {
    assert.match(pages[name], /<link rel="canonical" href="https:\/\/yeelimadhesives\.com\//, name);
  }
  assert.match(pages["404.html"], /<meta name="robots" content="noindex">/);
  assert.doesNotMatch(pages["404.html"], /rel="canonical"/,
    "a canonical on a noindex error page would be misleading");
});

test("product detail sets its canonical per product at runtime", () => {
  const detailJs = read("js/pages/product-detail.js");
  assert.match(detailJs, /function ylSyncDetailMeta/);
  assert.match(detailJs, /product-detail\?id=\$\{encodeURIComponent\(product\.id\)\}/);
});

test("robots.txt and sitemap.xml exist and agree with each other", () => {
  const robots = read("robots.txt");
  const sitemap = read("sitemap.xml");
  assert.match(robots, /Sitemap: https:\/\/yeelimadhesives\.com\/sitemap\.xml/);
  // Anything disallowed must not then be advertised in the sitemap.
  for (const blocked of ["/compare", "/enquiry", "/admin"]) {
    assert.match(robots, new RegExp(`Disallow: ${blocked}`), `robots blocks ${blocked}`);
    assert.doesNotMatch(
      sitemap,
      new RegExp(`<loc>https://yeelimadhesives\\.com${blocked}</loc>`),
      `sitemap must not list ${blocked}, which robots.txt blocks`
    );
  }
});

// ─── Back/forward restores catalogue state ───────────────────────

test("filter history entries restate their own URL for Swup's popstate", () => {
  assert.match(
    productsJs,
    /const keep = extra => Object\.assign\(\{\}, cur, \{ url: newUrl \}, extra\);/,
    "carrying Swup's stale state.url forward is what dropped filters on Back"
  );
});

// ─── Touch targets ───────────────────────────────────────────────

test("standalone links meet the 24px minimum target size", () => {
  for (const selector of [".product-card-title-link", ".related-view-all", ".contact-detail a"]) {
    const body = ruleBody(css, selector);
    assert.match(body, /min-height:\s*24px/, `${selector} needs a 24px box`);
  }
  assert.match(footerJs, /min-height:\s*24px/, "footer links need a 24px box");
});
