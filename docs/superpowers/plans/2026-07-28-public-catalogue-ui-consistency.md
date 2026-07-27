# Public Catalogue UI Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver and deploy the approved professional industrial B2B corrections for catalogue filters, navbar state, compare-product removal controls, bilingual alignment, and sort-label legibility.

**Architecture:** Keep behavior in the two existing shared sources: `navbar.js` owns exact-route active navigation and `products.css` owns the affected visual states. Add one dependency-free Node regression file that extracts the real navbar helper and inspects the real CSS rules. Bump only the three affected public page asset URLs, then validate with the existing Playwright harness before a five-file focused FTP deployment.

**Tech Stack:** Static HTML, CSS, browser JavaScript, Node.js 20 built-in test runner, Playwright QA, PHP local server, cURL FTP.

---

## File Map

- Create `tests/public-catalogue-ui-consistency.test.mjs`: tracked source-level regression tests for every approved behavior.
- Modify `frontend/js/widgets/navbar.js`: exact-route navigation active state.
- Modify `frontend/css/products.css`: checked filters, remove controls, compare-trigger centring, sort-label contrast.
- Modify `frontend/products.html`: cache versions for the changed CSS and navbar.
- Modify `frontend/product-detail.html`: cache versions for the changed CSS and navbar.
- Modify `frontend/compare.html`: cache versions for the changed CSS and navbar.
- Create `qa/catalogue-ui-consistency-qa.js`: ignored local Playwright visual/metric QA.
- Create `qa/deploy-catalogue-ui.ps1`: ignored focused backup, upload, and checksum verifier.

### Task 1: Exact-route Products navigation

**Files:**
- Create: `tests/public-catalogue-ui-consistency.test.mjs`
- Modify: `frontend/js/widgets/navbar.js:322-329`

- [ ] **Step 1: Create the failing navbar regression test**

Create `tests/public-catalogue-ui-consistency.test.mjs`:

```js
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const cssPath = new URL("../frontend/css/products.css", import.meta.url);
const navPath = new URL("../frontend/js/widgets/navbar.js", import.meta.url);
const css = fs.readFileSync(cssPath, "utf8");
const navSource = fs.readFileSync(navPath, "utf8");

function extractNamedFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) {
      return vm.runInNewContext(`(${source.slice(start, index + 1)})`);
    }
  }
  throw new Error(`Could not parse ${name}`);
}

function cssRules(source) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  for (const match of clean.matchAll(pattern)) {
    const selectors = match[1].split(",").map(value => value.trim());
    const declarations = Object.fromEntries(
      match[2]
        .split(";")
        .map(value => value.trim())
        .filter(Boolean)
        .map(value => {
          const colon = value.indexOf(":");
          return [value.slice(0, colon).trim(), value.slice(colon + 1).trim()];
        })
    );
    rules.push({ selectors, declarations });
  }
  return rules;
}

function findRule(requiredSelectors) {
  const required = [...requiredSelectors].sort();
  return cssRules(css).find(rule => {
    const actual = [...rule.selectors].sort();
    return actual.length === required.length &&
      actual.every((selector, index) => selector === required[index]);
  });
}

function rulesFor(selector) {
  return cssRules(css).filter(rule => rule.selectors.includes(selector));
}

test("Products nav is active only on the catalogue route", () => {
  const isActivePage = extractNamedFunction(navSource, "isActivePage");
  assert.equal(isActivePage("products", "products"), true);
  assert.equal(isActivePage("products", "product-detail"), false);
  assert.equal(isActivePage("products", "compare"), false);
  assert.equal(isActivePage("home", "index"), true);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test tests/public-catalogue-ui-consistency.test.mjs
```

Expected: one failed test because Product Detail currently returns `true`.

- [ ] **Step 3: Implement exact-route navigation**

Replace `isActivePage` in `frontend/js/widgets/navbar.js` with:

```js
function isActivePage(name, page) {
  if (name === "home") return page === "home" || page === "" || page === "index";
  return page === name;
}
```

Update the nearby comment so it states that Product Detail and Compare are task pages and do not claim a primary navigation item.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
node --test tests/public-catalogue-ui-consistency.test.mjs
```

Expected: one passing test, zero failures.

- [ ] **Step 5: Commit only Task 1**

```powershell
git add -- tests/public-catalogue-ui-consistency.test.mjs frontend/js/widgets/navbar.js
git commit -m "fix: use exact active state for products navigation"
```

### Task 2: Plain checked filter rows

**Files:**
- Modify: `tests/public-catalogue-ui-consistency.test.mjs`
- Modify: `frontend/css/products.css:4686-4696`

- [ ] **Step 1: Append the failing filter regression test**

Append:

```js
test("checked filter rows stay plain while the checkbox carries selection", () => {
  const checkedRules = rulesFor(".filter-group label:has(input:checked)");
  const hoverRules = rulesFor(".filter-group label:hover:has(input:checked)");
  assert.ok(
    checkedRules.some(rule => rule.declarations.background === "transparent"),
    "checked row must have a transparent background"
  );
  assert.ok(
    hoverRules.some(rule => rule.declarations.background === "transparent"),
    "hovered checked row must stay transparent"
  );
  assert.ok(
    !checkedRules.some(rule => rule.declarations.background === "var(--red-tint)"),
    "checked row must not use the red tint"
  );
  assert.ok(
    !hoverRules.some(rule => rule.declarations.background === "var(--red-tint)"),
    "hovered checked row must not use the red tint"
  );
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test tests/public-catalogue-ui-consistency.test.mjs
```

Expected: the navbar test passes and the filter test fails because desktop checked rows use `var(--red-tint)`.

- [ ] **Step 3: Implement the plain selected state**

Replace the two desktop checked-row rules with:

```css
/* The red checked box and semibold label already communicate selection.
   Keep the dense B2B filter list on one calm, plain surface. */
.filter-group label:has(input:checked),
.filter-group label:hover:has(input:checked) {
  background: transparent;
}
```

Keep the existing selected label-weight rule and the mobile transparent rule.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
node --test tests/public-catalogue-ui-consistency.test.mjs
```

Expected: two passing tests, zero failures.

- [ ] **Step 5: Commit only Task 2**

```powershell
git add -- tests/public-catalogue-ui-consistency.test.mjs frontend/css/products.css
git commit -m "fix: keep selected filter rows visually plain"
```

### Task 3: One compare-product remove control

**Files:**
- Modify: `tests/public-catalogue-ui-consistency.test.mjs`
- Modify: `frontend/css/products.css:3479-3494`
- Modify: `frontend/css/products.css:4166-4171`
- Modify: `frontend/css/products.css:4323-4341`
- Modify: `frontend/css/products.css:4405-4430`
- Modify: `frontend/css/products.css:4622-4628`

- [ ] **Step 1: Append the failing remove-control regression test**

Append:

```js
test("all compare-product remove controls share option A", () => {
  const shared = findRule([".cmp-slot-x", ".csel-x", ".compare-col-x"]);
  assert.ok(shared, "one shared remove-control rule must exist");
  assert.equal(shared.declarations.width, "44px");
  assert.equal(shared.declarations.height, "44px");
  assert.equal(shared.declarations["border-radius"], "6px");
  assert.equal(shared.declarations.background, "var(--card)");
  assert.equal(shared.declarations.border, "1px solid var(--border)");
  assert.equal(shared.declarations.color, "var(--red)");

  const icons = findRule([
    ".cmp-slot-x svg",
    ".csel-x svg",
    ".compare-col-x svg",
  ]);
  assert.ok(icons, "remove icons must share one geometry rule");
  assert.equal(icons.declarations.width, "14px");
  assert.equal(icons.declarations.height, "14px");
  assert.equal(icons.declarations["stroke-width"], "1.8");

  const hover = findRule([
    ".cmp-slot-x:hover",
    ".csel-x:hover",
    ".compare-col-x:hover",
  ]);
  assert.ok(hover, "remove controls must share one hover rule");
  assert.equal(hover.declarations.background, "var(--red-tint)");
  assert.equal(hover.declarations["border-color"], "var(--red-tint-bdr)");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test tests/public-catalogue-ui-consistency.test.mjs
```

Expected: the remove-control test fails because the three controls use separate square, circle, and 40-pixel treatments.

- [ ] **Step 3: Implement the shared option-A rules**

Remove duplicated visual declarations from `.cmp-slot-x`, `.csel-x`, and the mobile `.compare-col-x`. Keep only their positioning and visibility declarations.

Add after the `.csel-x` positioning rule:

```css
/* Product removal is one control across tray, selection panel and mobile table:
   a precise 44px industrial touch target, never a playful floating circle. */
.cmp-slot-x,
.csel-x,
.compare-col-x {
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--red);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.cmp-slot-x,
.csel-x {
  display: inline-flex;
}

.cmp-slot-x { flex-shrink: 0; }

.cmp-slot-x svg,
.csel-x svg,
.compare-col-x svg {
  width: 14px;
  height: 14px;
  stroke-width: 1.8;
}

.cmp-slot-x:hover,
.csel-x:hover,
.compare-col-x:hover {
  color: var(--red);
  border-color: var(--red-tint-bdr);
  background: var(--red-tint);
}
```

Keep `.compare-col-x { display: none; }` outside the phone media query and `display: inline-flex` inside it. Keep the existing `.csel-x` absolute positioning and the mobile vertical centring transform.

Extend the existing focus-visible group to include all three product-removal classes while preserving the other Compare controls:

```css
.compare-tray-btn:focus-visible,
.compare-tray-clear:focus-visible,
.compare-tray-collapse:focus-visible,
.cmp-slot-x:focus-visible,
.csel-x:focus-visible,
.compare-col-x:focus-visible,
.cmp-slot-add:focus-visible {
  outline: 2px solid var(--red);
  outline-offset: 2px;
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
node --test tests/public-catalogue-ui-consistency.test.mjs
```

Expected: three passing tests, zero failures.

- [ ] **Step 5: Commit only Task 3**

```powershell
git add -- tests/public-catalogue-ui-consistency.test.mjs frontend/css/products.css
git commit -m "fix: standardize compare product remove controls"
```

### Task 4: Bilingual Compare centring and sort-label contrast

**Files:**
- Modify: `tests/public-catalogue-ui-consistency.test.mjs`
- Modify: `frontend/css/products.css:693-705`
- Modify: `frontend/css/products.css:3306-3348`

- [ ] **Step 1: Append the failing alignment and contrast tests**

Append:

```js
test("Compare trigger centres translated content without a negative offset", () => {
  const trigger = rulesFor(".compare-tray-trigger")
    .find(rule => rule.declarations["justify-content"]);
  assert.ok(trigger, "base Compare trigger must define horizontal centring");
  assert.equal(trigger.declarations["justify-content"], "center");

  const count = rulesFor(".compare-tray-trigger #compareTrayCount")
    .find(rule => Object.hasOwn(rule.declarations, "margin-left"));
  assert.ok(count, "Compare count must define its neutral margin");
  assert.equal(count.declarations["margin-left"], "0");
});

test("desktop sort label is strong enough for Simplified Chinese", () => {
  const label = rulesFor(".grid-sort-label")[0];
  assert.ok(label, "sort label rule must exist");
  assert.equal(label.declarations["font-weight"], "600");
  assert.equal(label.declarations.color, "var(--muted)");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test tests/public-catalogue-ui-consistency.test.mjs
```

Expected: both new tests fail because the trigger has no base `justify-content`, the count uses `-0.18rem`, and the label uses weight `500` with `var(--muted-2)`.

- [ ] **Step 3: Implement language-neutral centring**

Add to the base `.compare-tray-trigger` declaration:

```css
justify-content: center;
```

Change the count rule to:

```css
.compare-tray-trigger #compareTrayCount {
  margin-left: 0;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
```

Do not add any `[lang="zh"]` positional override. Keep the phone side-tab's existing `justify-content: center`.

- [ ] **Step 4: Implement professional sort-label contrast**

Change `.grid-sort-label` to:

```css
.grid-sort-label {
  font-family: var(--mono);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
```

- [ ] **Step 5: Run the focused test and verify GREEN**

Run:

```powershell
node --test tests/public-catalogue-ui-consistency.test.mjs
```

Expected: five passing tests, zero failures.

- [ ] **Step 6: Commit only Task 4**

```powershell
git add -- tests/public-catalogue-ui-consistency.test.mjs frontend/css/products.css
git commit -m "fix: align bilingual compare and sort controls"
```

### Task 5: Cache-bust the affected runtime pages

**Files:**
- Modify: `tests/public-catalogue-ui-consistency.test.mjs`
- Modify: `frontend/products.html:11-15`
- Modify: `frontend/product-detail.html:11-15`
- Modify: `frontend/compare.html:18-22`

- [ ] **Step 1: Append the failing asset-version regression test**

Append:

```js
test("affected pages request the corrected CSS and navbar assets", () => {
  for (const page of ["products.html", "product-detail.html", "compare.html"]) {
    const html = fs.readFileSync(
      new URL(`../frontend/${page}`, import.meta.url),
      "utf8"
    );
    assert.match(html, /\/css\/products\.css\?v=97/);
    assert.match(html, /\/js\/widgets\/navbar\.js\?v=23/);
  }
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test tests/public-catalogue-ui-consistency.test.mjs
```

Expected: the asset-version test fails because the affected pages still request CSS `v=96` and navbar `v=22`.

- [ ] **Step 3: Bump only the affected asset URLs**

In all three affected pages:

```html
<link rel="stylesheet" href="/css/products.css?v=97">
<script src="/js/widgets/navbar.js?v=23"></script>
```

Do not change any other asset version and do not modify Home, About, admin, API, or translation files.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
node --test tests/public-catalogue-ui-consistency.test.mjs
```

Expected: six passing tests, zero failures.

- [ ] **Step 5: Run syntax and whitespace verification**

Run:

```powershell
node --check frontend/js/widgets/navbar.js
git diff --check
```

Expected: both commands exit zero with no diagnostics.

- [ ] **Step 6: Commit only Task 5**

```powershell
git add -- tests/public-catalogue-ui-consistency.test.mjs frontend/products.html frontend/product-detail.html frontend/compare.html
git commit -m "chore: refresh catalogue UI asset versions"
```

### Task 6: Responsive English and Chinese verification

**Files:**
- Create: `qa/catalogue-ui-consistency-qa.js`
- Verify: all six production/test files changed above

- [ ] **Step 1: Create the focused Playwright QA script**

Create `qa/catalogue-ui-consistency-qa.js`:

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const BASE = (process.env.BASE_URL || "http://127.0.0.1:8123").replace(/\/$/, "");
const OUT = path.join(__dirname, "screenshots", "catalogue-ui-consistency");
fs.mkdirSync(OUT, { recursive: true });

function number(value) {
  return Number.parseFloat(value.replace("px", ""));
}

async function addState(context, lang, compareList = ["1", "2"]) {
  await context.addInitScript(({ selectedLang, selectedProducts }) => {
    localStorage.setItem("ylLang", selectedLang);
    localStorage.setItem("compareList", JSON.stringify(selectedProducts));
  }, { selectedLang: lang, selectedProducts: compareList });
}

async function verifyLanguage(browser, lang, width, height) {
  const context = await browser.newContext({ viewport: { width, height } });
  await addState(context, lang);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  await page.goto(`${BASE}/products.html`, { waitUntil: "networkidle" });
  await page.waitForSelector(".product-card:not(.skeleton-card)");

  const firstFilter = page.locator(".filter-group input[type=checkbox]").first();
  await firstFilter.check();
  const filterBackground = await firstFilter.locator("xpath=..").evaluate(
    element => getComputedStyle(element).backgroundColor
  );
  assert.equal(filterBackground, "rgba(0, 0, 0, 0)");

  if (width > 640) {
    const triggerMetrics = await page.locator("#compareTrayToggle").evaluate(button => {
      const buttonRect = button.getBoundingClientRect();
      const children = [...button.children]
        .map(child => child.getBoundingClientRect())
        .filter(rect => rect.width > 0 && rect.height > 0);
      const left = Math.min(...children.map(rect => rect.left));
      const right = Math.max(...children.map(rect => rect.right));
      return {
        buttonCenter: (buttonRect.left + buttonRect.right) / 2,
        contentCenter: (left + right) / 2,
      };
    });
    assert.ok(
      Math.abs(triggerMetrics.buttonCenter - triggerMetrics.contentCenter) <= 1,
      `${lang} Compare content is not centred: ${JSON.stringify(triggerMetrics)}`
    );

    const sortStyle = await page.locator(".grid-sort-label").evaluate(element => {
      const style = getComputedStyle(element);
      return { color: style.color, weight: style.fontWeight };
    });
    assert.equal(sortStyle.color, "rgb(106, 101, 90)");
    assert.equal(sortStyle.weight, "600");
  }

  await page.goto(`${BASE}/product-detail.html?id=1`, { waitUntil: "networkidle" });
  await page.waitForSelector(".detail-product-name");
  assert.equal(await page.locator('.nav-links [data-nav="products"].nav-active').count(), 0);
  assert.equal(await page.locator('.nav-links [data-nav="products"][aria-current="page"]').count(), 0);

  if (width > 640) {
    await page.locator("#compareTrayToggle").click();
    const trayRemove = page.locator(".cmp-slot-x").first();
    await trayRemove.waitFor();
    const trayStyle = await trayRemove.evaluate(element => {
      const style = getComputedStyle(element);
      return {
        width: style.width,
        height: style.height,
        radius: style.borderRadius,
        color: style.color,
      };
    });
    assert.deepEqual(trayStyle, {
      width: "44px",
      height: "44px",
      radius: "6px",
      color: "rgb(204, 41, 41)",
    });
  }

  await page.goto(`${BASE}/compare.html`, { waitUntil: "networkidle" });
  assert.equal(await page.locator('.nav-links [data-nav="products"].nav-active').count(), 0);
  if (width > 640) {
    const selectionRemove = page.locator(".csel-x").first();
    await selectionRemove.waitFor();
    const selectionStyle = await selectionRemove.evaluate(element => {
      const style = getComputedStyle(element);
      return {
        width: style.width,
        height: style.height,
        radius: style.borderRadius,
        color: style.color,
      };
    });
    assert.deepEqual(selectionStyle, {
      width: "44px",
      height: "44px",
      radius: "6px",
      color: "rgb(204, 41, 41)",
    });
  }

  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    true
  );
  assert.deepEqual(errors, []);
  await page.screenshot({
    path: path.join(OUT, `${lang}-${width}.png`),
    fullPage: true,
  });
  await context.close();
}

(async () => {
  const browser = await chromium.launch();
  try {
    for (const lang of ["en", "zh"]) {
      await verifyLanguage(browser, lang, 1440, 900);
      await verifyLanguage(browser, lang, 768, 1024);
      await verifyLanguage(browser, lang, 390, 844);
    }
  } finally {
    await browser.close();
  }
  console.log("PASS catalogue UI consistency: 6 responsive language states");
})().catch(error => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Start the local PHP server**

Run:

```powershell
$catalogueServer = Start-Process -FilePath "php" -ArgumentList @("-S", "127.0.0.1:8123", "-t", "frontend") -WorkingDirectory (Get-Location) -WindowStyle Hidden -PassThru
```

Expected: a hidden PHP process with an assigned process ID.

- [ ] **Step 3: Run focused source and visual verification**

Run:

```powershell
node --test tests/public-catalogue-ui-consistency.test.mjs
node qa/catalogue-ui-consistency-qa.js
```

Expected: six source tests pass and all six language/viewport states pass.

- [ ] **Step 4: Run the existing public smoke suite**

Run:

```powershell
node qa/deploy-smoke.js
```

Expected: `failures=0`.

- [ ] **Step 5: Inspect the six screenshots**

Inspect:

```text
qa/screenshots/catalogue-ui-consistency/en-1440.png
qa/screenshots/catalogue-ui-consistency/en-768.png
qa/screenshots/catalogue-ui-consistency/en-390.png
qa/screenshots/catalogue-ui-consistency/zh-1440.png
qa/screenshots/catalogue-ui-consistency/zh-768.png
qa/screenshots/catalogue-ui-consistency/zh-390.png
```

Confirm:

- selected filters are plain;
- compare controls remain compact and industrial;
- remove controls are identical and not permanently filled;
- English and Chinese Compare content is centred;
- `排序方式` is readable but remains secondary;
- there is no horizontal overflow or clipped control.

- [ ] **Step 6: Stop the local server**

Run:

```powershell
Stop-Process -Id $catalogueServer.Id
```

- [ ] **Step 7: Run final repository verification**

Run:

```powershell
node --test tests/public-catalogue-ui-consistency.test.mjs
node --check frontend/js/widgets/navbar.js
git diff --check
git status --short
```

Expected: all tests pass, syntax and diff checks are clean, and only known user-owned changes plus this plan's files appear.

### Task 7: Focused live deployment with rollback

**Files:**
- Create: `qa/deploy-catalogue-ui.ps1`
- Deploy: `frontend/css/products.css`
- Deploy: `frontend/js/widgets/navbar.js`
- Deploy: `frontend/products.html`
- Deploy: `frontend/product-detail.html`
- Deploy: `frontend/compare.html`

- [ ] **Step 1: Create the focused deployment script**

Create `qa/deploy-catalogue-ui.ps1`:

```powershell
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$credentialFile = Join-Path $projectRoot "ftp.env"
$targets = @(
  "css/products.css",
  "js/widgets/navbar.js",
  "products.html",
  "product-detail.html",
  "compare.html"
)
$protected = @("index.html", "about.html", "admin", "api", "config.php")

function Read-FtpValue([string]$name) {
  $line = Get-Content -LiteralPath $credentialFile |
    Where-Object { $_ -match "^$([regex]::Escape($name))=" } |
    Select-Object -First 1
  if (-not $line) { throw "Missing $name in ftp.env" }
  return ($line.Substring($line.IndexOf("=") + 1)).Trim().Trim('"')
}

function Invoke-Curl([string[]]$arguments) {
  & curl.exe @arguments
  if ($LASTEXITCODE -ne 0) { throw "curl failed with exit code $LASTEXITCODE" }
}

if (-not (Test-Path -LiteralPath $credentialFile)) {
  throw "ftp.env not found"
}

$ftpHost = Read-FtpValue "FTP_HOST"
$ftpUser = Read-FtpValue "FTP_USER"
$ftpPass = Read-FtpValue "FTP_PASS"
$ftpAuth = "${ftpUser}:${ftpPass}"
$stamp = Get-Date -Format "yyyy-MM-ddTHHmmss"
$backupRoot = Join-Path $projectRoot "ftp_backup\${stamp}_catalogue_ui_consistency"
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

foreach ($target in $targets) {
  if ($protected | Where-Object { $target -eq $_ -or $target.StartsWith("${_}/") }) {
    throw "Refusing protected target: $target"
  }
  $local = Join-Path (Join-Path $projectRoot "frontend") $target
  if (-not (Test-Path -LiteralPath $local)) { throw "Missing local file: $target" }
  $backup = Join-Path $backupRoot $target
  New-Item -ItemType Directory -Path (Split-Path -Parent $backup) -Force | Out-Null
  Invoke-Curl @(
    "--fail", "--silent", "--show-error", "--max-time", "60",
    "--user", $ftpAuth,
    "--output", $backup,
    "ftp://${ftpHost}/${target}"
  )
}

$verifyRoot = Join-Path $env:TEMP "yl-catalogue-ui-verify-$stamp"
$tempRootFull = [IO.Path]::GetFullPath($env:TEMP).TrimEnd("\", "/")
$verifyRoot = [IO.Path]::GetFullPath($verifyRoot)
if (-not $verifyRoot.StartsWith(
  $tempRootFull + [IO.Path]::DirectorySeparatorChar,
  [StringComparison]::OrdinalIgnoreCase
)) {
  throw "Unsafe verification directory: $verifyRoot"
}
New-Item -ItemType Directory -Path $verifyRoot -Force | Out-Null

try {
  foreach ($target in $targets) {
    $local = Join-Path (Join-Path $projectRoot "frontend") $target
    Invoke-Curl @(
      "--fail", "--silent", "--show-error", "--max-time", "90",
      "--ftp-create-dirs",
      "--user", $ftpAuth,
      "--upload-file", $local,
      "ftp://${ftpHost}/${target}"
    )
  }

  foreach ($target in $targets) {
    $local = Join-Path (Join-Path $projectRoot "frontend") $target
    $remote = Join-Path $verifyRoot $target
    New-Item -ItemType Directory -Path (Split-Path -Parent $remote) -Force | Out-Null
    Invoke-Curl @(
      "--fail", "--silent", "--show-error", "--max-time", "60",
      "--user", $ftpAuth,
      "--output", $remote,
      "ftp://${ftpHost}/${target}"
    )
    $localHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $local).Hash
    $remoteHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $remote).Hash
    if ($localHash -ne $remoteHash) { throw "Checksum mismatch: $target" }
    Write-Output "MATCH $target"
  }
} catch {
  $deployError = $_
  $rollbackFailures = @()
  Write-Warning "Deployment verification failed. Restoring all five backups."
  foreach ($target in $targets) {
    try {
      $backup = Join-Path $backupRoot $target
      Invoke-Curl @(
        "--fail", "--silent", "--show-error", "--max-time", "90",
        "--ftp-create-dirs",
        "--user", $ftpAuth,
        "--upload-file", $backup,
        "ftp://${ftpHost}/${target}"
      )
      Write-Output "RESTORED $target"
    } catch {
      $rollbackFailures += $target
    }
  }
  if ($rollbackFailures.Count -gt 0) {
    throw "Deployment failed and rollback failed for: $($rollbackFailures -join ', '). Original error: $deployError"
  }
  throw $deployError
} finally {
  $safeToDelete = $verifyRoot.StartsWith(
    $tempRootFull + [IO.Path]::DirectorySeparatorChar,
    [StringComparison]::OrdinalIgnoreCase
  ) -and (Split-Path -Leaf $verifyRoot).StartsWith("yl-catalogue-ui-verify-")
  if ($safeToDelete -and (Test-Path -LiteralPath $verifyRoot)) {
    Remove-Item -LiteralPath $verifyRoot -Recurse -Force
  }
}

Write-Output "BACKUP $backupRoot"
Write-Output "DEPLOYED $($targets.Count)"
```

- [ ] **Step 2: Re-run the complete pre-deploy gate**

Run:

```powershell
node --test tests/public-catalogue-ui-consistency.test.mjs
node --check frontend/js/widgets/navbar.js
git diff --check
```

Expected: all commands exit zero immediately before deployment.

- [ ] **Step 3: Back up, upload, and verify only five live files**

Run with network approval:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File qa/deploy-catalogue-ui.ps1
```

Expected:

```text
MATCH css/products.css
MATCH js/widgets/navbar.js
MATCH products.html
MATCH product-detail.html
MATCH compare.html
BACKUP <absolute backup path>
DEPLOYED 5
```

- [ ] **Step 4: Run live smoke verification**

Run:

```powershell
$env:BASE_URL = "https://www.yeelimadhesives.com"
node qa/deploy-smoke.js
Remove-Item Env:BASE_URL
```

Expected: `failures=0`.

- [ ] **Step 5: Run the focused visual QA against live**

Run:

```powershell
$env:BASE_URL = "https://www.yeelimadhesives.com"
node qa/catalogue-ui-consistency-qa.js
Remove-Item Env:BASE_URL
```

Expected: all six English/Chinese responsive states pass on the deployed site.

- [ ] **Step 6: Record the handoff**

Report:

- the five deployed files;
- the backup path printed by the deployment script;
- source-test pass count;
- local and live Playwright pass counts;
- live smoke result;
- any remaining unrelated dirty-worktree files.
