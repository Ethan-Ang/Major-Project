# Yee Lim 404 Recovery Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the standalone, flex-centred 404 into a professional recovery page with shared navigation and footer, natural spacing, complete English and Chinese copy, and no unrelated live-site changes.

**Architecture:** Keep the existing shared `products.css` as the base, but place all new 404 overrides in a dedicated `css/404.css` loaded afterward. Keep 404-specific Chinese strings in `js/pages/not-found.js`, while continuing to use the shared i18n engine for the navigation and footer. Add one narrow, opt-in enhancement to the clean shared navbar: honor an explicit page identity and preserve a marked skip link as the first body child. These isolation boundaries are necessary because the current shared stylesheet and dictionary contain unrelated uncommitted work and cannot be safely uploaded as a focused deployment.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node.js built-in test runner, shared Yee Lim widgets, browser-based responsive verification.

---

### Task 1: Replace the obsolete flex-centering regression with approved behavior

**Files:**
- Modify: `tests/404-layout.test.mjs`
- Read: `frontend/404.html`
- Read: `frontend/css/404.css`
- Read: `frontend/js/pages/not-found.js`
- Modify: `frontend/js/widgets/navbar.js`

- [x] **Step 1: Write failing shell, layout and translation tests**

Replace the existing assertions that require `.nf-body main`, `flex: 1`, and `justify-content: center` with tests that require:

```js
const notFoundCssPath = new URL("../frontend/css/404.css", import.meta.url);
const notFoundCss = fs.existsSync(notFoundCssPath)
  ? fs.readFileSync(notFoundCssPath, "utf8")
  : "";
const notFoundScriptPath = new URL(
  "../frontend/js/pages/not-found.js",
  import.meta.url
);
const notFoundScript = fs.existsSync(notFoundScriptPath)
  ? fs.readFileSync(notFoundScriptPath, "utf8")
  : "";

test("404 uses the shared public navigation and footer shell", () => {
  assert.doesNotMatch(pageSource, /class="nf-topbar"/);
  assert.doesNotMatch(pageSource, /<body[^>]*class="nf-body"/);
  assert.match(pageSource, /<div id="swup" class="transition-fade">/);
  assert.match(pageSource, /\/js\/i18n\.js\?v=4/);
  assert.match(pageSource, /\/js\/pages\/not-found\.js\?v=1/);
  assert.match(pageSource, /\/js\/widgets\/navbar\.js\?v=24/);
  assert.match(pageSource, /\/js\/widgets\/footer\.js\?v=24/);
  assert.match(pageSource, /\/js\/core\/app\.js\?v=5/);
});

test("404 uses a page-scoped natural-flow layout", () => {
  assert.match(pageSource, /\/css\/404\.css\?v=1/);
  assert.match(notFoundCss, /\.nf-help\s*\{/);
  assert.doesNotMatch(notFoundCss, /\bflex:\s*1\s*;/);
  assert.doesNotMatch(notFoundCss, /\bjustify-content:\s*center\s*;/);
  assert.match(notFoundCss, /padding:\s*3\.25rem\s+2rem\s+4rem\s*;/);
  assert.match(notFoundCss, /min-height:\s*120px\s*;/);
});

test("404 recovery copy is fully wired for English and Chinese", () => {
  for (const key of [
    "nf.page_title", "nf.skip", "nf.eyebrow", "nf.title", "nf.lead",
    "nf.search_label", "nf.search_ph", "nf.search", "nf.help", "nf.browse",
    "nf.browse_copy", "nf.contact", "nf.contact_copy",
    "nf.about", "nf.about_copy",
  ]) {
    assert.match(notFoundScript, new RegExp(`"${key.replace(".", "\\.")}"`));
    assert.match(pageSource, new RegExp(`data-nf-i18n(?:-attr)?="[^"]*${key.replace(".", "\\.")}`));
  }
});
```

Keep the existing recovery-content and destination-link test.

- [x] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test tests/404-layout.test.mjs
```

Expected: the new shell, stylesheet and translation tests fail because the standalone topbar and flex-centred implementation still exist. The recovery-content test remains green.

- [x] **Step 3: Confirm the failure is behavioral**

Read each failure and confirm it names a missing shared script, missing `404.css`, obsolete `.nf-topbar`, or missing `nf.*` translation key. Fix test syntax only if the runner errors before reaching those assertions.

### Task 2: Build the isolated natural-flow 404 shell and layout

**Files:**
- Modify: `frontend/404.html`
- Create: `frontend/css/404.css`
- Add: `frontend/images/hero/adhesive-pails-warehouse-1536.jpg`
- Add: `frontend/images/hero/adhesive-pails-warehouse-1536.webp`

- [x] **Step 1: Replace the standalone shell**

In `frontend/404.html`:

- load `/css/404.css?v=1` after `/css/products.css?v=100`;
- load shared i18n, the page-local translator, navbar and footer in that order;
- mark the document with `data-nav-page="404"` so real unknown URLs cannot activate a primary link;
- remove `<header class="nf-topbar">`;
- change `<body class="nf-body">` to `<body>`;
- add an accessible skip link;
- wrap `main` in `<div id="swup" class="transition-fade">`;
- load `/js/core/app.js?v=5` before `</body>`.

The resulting structure is:

```html
<link rel="stylesheet" href="/css/products.css?v=100">
<link rel="stylesheet" href="/css/404.css?v=1">
<script src="/js/i18n.js?v=4"></script>
<script src="/js/pages/not-found.js?v=1"></script>
<script src="/js/widgets/navbar.js?v=24"></script>
<script src="/js/widgets/footer.js?v=24"></script>
</head>
<body>
  <a class="nf-skip-link" href="#mainContent" data-skip-link data-nf-i18n="nf.skip">Skip to main content</a>
  <div id="swup" class="transition-fade">
    <main id="mainContent">
      <!-- existing hero and helpful destinations -->
    </main>
  </div>
  <script src="/js/core/app.js?v=5"></script>
</body>
```

- [x] **Step 2: Add the natural-flow stylesheet**

Create `frontend/css/404.css` with:

```css
.nf-skip-link {
  position: fixed;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 200;
  transform: translateY(-180%);
  padding: 0.65rem 0.9rem;
  border-radius: 4px;
  background: var(--card);
  color: var(--text);
  font-weight: 700;
  text-decoration: none;
}

.nf-skip-link:focus { transform: translateY(0); }

.nf-hero .page-hero-img {
  background-image: url("/images/hero/adhesive-pails-warehouse-1536.jpg");
  background-image: image-set(
    url("/images/hero/adhesive-pails-warehouse-1536.webp") type("image/webp"),
    url("/images/hero/adhesive-pails-warehouse-1536.jpg") type("image/jpeg")
  );
  background-position: right bottom;
}

.nf-hero .page-hero-inner {
  padding-top: 3rem;
  padding-bottom: 3rem;
}

.nf-hero .hero-eyebrow { color: var(--red); }
.nf-hero h1 { max-width: 20ch; }
.nf-search { margin-top: 1rem; max-width: 560px; }

.nf-help {
  display: block;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 3.25rem 2rem 4rem;
}

.nf-help h2 { margin-bottom: 1.25rem; font-size: 1.25rem; }
.nf-help-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}
.nf-help-card { min-height: 120px; align-items: center; }

@media (max-width: 900px) {
  .nf-help { padding: 2.75rem 1.25rem 3.5rem; }
  .nf-help-grid { grid-template-columns: 1fr; }
  .nf-help-card { min-height: 0; }
}

@media (max-width: 640px) {
  .nf-hero .page-hero-inner { padding: 1.75rem 1.25rem 1.5rem; }
  .nf-help { padding: 2rem 1.25rem 2.75rem; }
  .nf-help h2 { margin-bottom: 0.9rem; font-size: 1.1rem; }
  .nf-help-grid { gap: 0.75rem; }
}
```

- [x] **Step 3: Run the focused test**

Run:

```powershell
node --test tests/404-layout.test.mjs
```

Expected: shell and layout tests pass. Translation test still fails until Task 3.

### Task 3: Complete isolated 404 translation behavior

**Files:**
- Modify: `frontend/404.html`
- Create: `frontend/js/pages/not-found.js`

- [x] **Step 1: Add 404 dictionary entries**

Add this page-local Simplified Chinese map:

```js
(function () {
  "use strict";

  var ZH = {
    "nf.page_title": "页面未找到 | Yee Lim Adhesives Industries",
    "nf.skip": "跳至主要内容",
    "nf.eyebrow": "404 · 页面未找到",
    "nf.title": "找不到您要访问的页面",
    "nf.lead": "您要访问的页面可能已被移动、重命名或不存在。让我们帮助您重新找到所需内容。",
    "nf.search_label": "按产品名称、编号、品牌或关键词搜索",
    "nf.search_ph": "按产品名称、编号、品牌或关键词搜索……",
    "nf.search": "搜索",
    "nf.help": "您可以前往",
    "nf.browse": "浏览产品",
    "nf.browse_copy": "查看我们的全系列工商业胶粘剂。",
    "nf.contact": "联系 Yee Lim",
    "nf.contact_copy": "我们的团队可协助您进行产品选型、技术支持和询价。",
    "nf.about": "关于 Yee Lim",
    "nf.about_copy": "了解我们对品质与工业粘合解决方案的承诺。"
  };

  function apply(root) {
    if (window.ylLang !== "zh") return;
    var scope = root || document;

    scope.querySelectorAll("[data-nf-i18n]").forEach(function (element) {
      var value = ZH[element.getAttribute("data-nf-i18n")];
      if (value) element.textContent = value;
    });

    scope.querySelectorAll("[data-nf-i18n-attr]").forEach(function (element) {
      element.getAttribute("data-nf-i18n-attr").split(",").forEach(function (pair) {
        var parts = pair.split(":");
        var attribute = (parts[0] || "").trim();
        var value = ZH[(parts[1] || "").trim()];
        if (attribute && value) element.setAttribute(attribute, value);
      });
    });
  }

  window.ylApplyNotFoundI18n = apply;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { apply(); });
  } else {
    apply();
  }
})();
```

- [x] **Step 2: Add translation hooks to the page**

Use `data-nf-i18n` on visible copy and `data-nf-i18n-attr` for the search label, placeholder and button accessible name. The page-local script reads the shared `window.ylLang`, returns immediately for English, and applies the map on `DOMContentLoaded` for Chinese. Do not replace the English source copy.

- [x] **Step 3: Run the focused test and verify GREEN**

Run:

```powershell
node --test tests/404-layout.test.mjs
```

Expected: all focused tests pass with zero failures.

- [x] **Step 4: Run the complete Node regression suite**

Run:

```powershell
$testFiles = Get-ChildItem tests -Filter "*.test.mjs" |
  Sort-Object Name |
  ForEach-Object FullName
node --test @testFiles
```

Expected: the 404 tests pass. Report any pre-existing unrelated asset-version failures separately rather than changing unrelated pages.

### Task 4: Visual, interaction and live-response verification

**Files:**
- Create verification screenshots under: `qa/screenshots/404-recovery/`
- Do not commit generated screenshots unless explicitly requested.

- [x] **Step 1: Serve the public frontend locally**

Run the project's established local static server from `frontend` and open `/404.html`.

- [ ] **Step 2: Verify responsive English layouts**

At 1600x900, 1440x900, 768x1024 and 390x844, confirm:

- hero, helpful section and footer follow natural flow;
- no expanding blank band separates the sections;
- cards remain equal on desktop and natural-height when stacked;
- no horizontal overflow or clipped copy;
- no primary navigation link is active;
- mobile drawer opens, traps focus, closes and restores focus;
- search submits to `/products?q=...`;
- all three destination links are correct.

- [ ] **Step 3: Verify Simplified Chinese layouts**

Set `localStorage.ylLang` to `zh`, reload at all four sizes, and confirm:

- page copy, navigation and footer use Chinese consistently;
- heading, search and cards do not clip or overflow;
- card alignment remains professional despite shorter Chinese strings.

- [x] **Step 4: Verify real HTTP behavior**

Check the live or Apache-equivalent unknown route and confirm it returns HTTP `404`, renders the custom page, and keeps the full recovery shell.

- [x] **Step 5: Review exact scope before commit or upload**

Run:

```powershell
git diff --check
git status --short
git diff -- frontend/404.html frontend/css/404.css frontend/js/pages/not-found.js frontend/js/widgets/navbar.js tests/404-layout.test.mjs docs/superpowers/specs/2026-07-28-404-recovery-layout-design.md docs/superpowers/plans/2026-07-28-404-recovery-layout.md
```

Stage only:

```powershell
git add -- frontend/404.html frontend/css/404.css frontend/js/pages/not-found.js frontend/js/widgets/navbar.js tests/404-layout.test.mjs frontend/images/hero/adhesive-pails-warehouse-1536.jpg frontend/images/hero/adhesive-pails-warehouse-1536.webp docs/superpowers/specs/2026-07-28-404-recovery-layout-design.md docs/superpowers/plans/2026-07-28-404-recovery-layout.md
```

Do not stage or upload the dirty shared `frontend/css/products.css`.
