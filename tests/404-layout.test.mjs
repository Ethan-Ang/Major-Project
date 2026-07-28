import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const pageSource = fs.readFileSync(
  new URL("../frontend/404.html", import.meta.url),
  "utf8"
);
const navbarSource = fs.readFileSync(
  new URL("../frontend/js/widgets/navbar.js", import.meta.url),
  "utf8"
);
const optionalSource = (path) => {
  try {
    return fs.readFileSync(new URL(path, import.meta.url), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
};
const notFoundCss = optionalSource("../frontend/css/404.css");
const notFoundScript = optionalSource("../frontend/js/pages/not-found.js");

function bracedBody(source, openAt, label) {
  assert.equal(source[openAt], "{", `${label} must have an opening brace`);
  let depth = 0;
  let quote = "";
  let inComment = false;

  for (let index = openAt; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inComment) {
      if (char === "*" && next === "/") {
        inComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "*") {
      inComment = true;
      index += 1;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openAt + 1, index);
    }
  }

  assert.fail(`${label} must have a closing brace`);
}

function blockFor(source, headerPattern, label) {
  const match = headerPattern.exec(source);
  assert.ok(match, `${label} must exist`);
  const openAt = source.indexOf("{", match.index);
  return bracedBody(source, openAt, label);
}

function declarationsFor(block, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return blockFor(
    block,
    new RegExp(`${escapedSelector}\\s*\\{`),
    `${selector} rule`
  );
}

function executableFunction(source, name, expectedParameters, bindings = {}) {
  const match = new RegExp(
    `\\bfunction\\s+${name}\\s*\\(([^)]*)\\)\\s*\\{`
  ).exec(source);
  assert.ok(match, `${name} function must exist`);
  const parameters = match[1].split(",").map((value) => value.trim()).filter(Boolean);
  assert.deepEqual(parameters, expectedParameters, `${name} parameters must remain stable`);
  const openAt = source.indexOf("{", match.index);
  const bindingNames = Object.keys(bindings);
  return Function(
    ...bindingNames,
    `return function (${parameters.join(", ")}) {${bracedBody(
      source,
      openAt,
      `${name} function`
    )}};`
  )(...bindingNames.map((binding) => bindings[binding]));
}

function translationBindings(source) {
  const keys = new Set();

  for (const match of source.matchAll(/\bdata-nf-i18n=(["'])(.*?)\1/g)) {
    keys.add(match[2].trim());
  }
  for (const match of source.matchAll(/\bdata-nf-i18n-attr=(["'])(.*?)\1/g)) {
    for (const pair of match[2].matchAll(/\b[\w-]+\s*:\s*([\w.-]+)/g)) {
      keys.add(pair[1]);
    }
  }

  return keys;
}

test("404 page uses the shared application shell", () => {
  assert.doesNotMatch(pageSource, /\bnf-topbar\b/);
  assert.doesNotMatch(pageSource, /<body[^>]*\bnf-body\b/i);
  assert.match(pageSource, /<html[^>]*\bdata-nav-page=["']404["']/i);
  assert.match(pageSource, /id=["']swup["'][^>]*\btransition-\w+/i);
  const skipLinkMarkup = /<a\b([^>]*)>Skip to main content<\/a>/i.exec(pageSource);
  assert.ok(skipLinkMarkup, "404 page must include the skip link");
  assert.match(skipLinkMarkup[1], /\bdata-skip-link\b/i);
  assert.match(skipLinkMarkup[1], /\bhref=["']#mainContent["']/i);
  for (const asset of [
    "/css/404.css?v=1",
    "/js/i18n.js?v=4",
    "/js/pages/not-found.js?v=1",
    "/js/widgets/navbar.js?v=24",
    "/js/widgets/footer.js?v=24",
    "/js/core/app.js?v=5",
  ]) assert.ok(pageSource.includes(asset), `404 page must load ${asset}`);
});

test("404 help section uses natural responsive document flow", () => {
  const desktopHelp = declarationsFor(notFoundCss, ".nf-help");
  const desktopCard = declarationsFor(notFoundCss, ".nf-help-card");
  assert.doesNotMatch(desktopHelp, /\bflex\s*:\s*1\s*;/);
  assert.doesNotMatch(desktopHelp, /\bjustify-content\s*:\s*center\s*;/);
  assert.match(desktopHelp, /\bpadding\s*:\s*3\.25rem\s+2rem\s+4rem\s*;/);
  assert.match(desktopCard, /\bmin-height\s*:\s*120px\s*;/);

  const tabletBlock = blockFor(
    notFoundCss,
    /@media\s*\(max-width:\s*900px\)\s*\{/,
    "max-width: 900px media block"
  );
  assert.match(
    declarationsFor(tabletBlock, ".nf-help"),
    /\bpadding\s*:\s*2\.75rem\s+1\.25rem\s+3\.5rem\s*;/
  );
  assert.match(
    declarationsFor(tabletBlock, ".nf-help-card"),
    /\bmin-height\s*:\s*0\s*;/
  );

  const mobileBlock = blockFor(
    notFoundCss,
    /@media\s*\(max-width:\s*640px\)\s*\{/,
    "max-width: 640px media block"
  );
  assert.match(
    declarationsFor(mobileBlock, ".nf-help"),
    /\bpadding\s*:\s*2rem\s+1\.25rem\s+2\.75rem\s*;/
  );
});

test("404 content is translated through the not-found page module", () => {
  const pageBindings = translationBindings(pageSource);
  for (const key of [
    "nf.page_title", "nf.skip", "nf.eyebrow", "nf.title", "nf.lead",
    "nf.search_label", "nf.search_ph", "nf.search", "nf.help", "nf.browse",
    "nf.browse_copy", "nf.contact", "nf.contact_copy", "nf.about", "nf.about_copy",
  ]) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      notFoundScript,
      new RegExp(`"${escapedKey}"\\s*:`),
      `not-found script must define ${key}`
    );
    assert.ok(pageBindings.has(key), `404 page must bind ${key}`);
  }
});

test("404 navigation defers active-state selection to the navbar widget", () => {
  assert.doesNotMatch(pageSource, /\bnav-active\b|\baria-current\b/i);
  const currentPage = executableFunction(navbarSource, "currentPage", ["pathname"]);
  const resolveCurrentPage = executableFunction(
    navbarSource,
    "resolveCurrentPage",
    ["pathname", "override"],
    { currentPage }
  );
  const isActivePage = executableFunction(
    navbarSource,
    "isActivePage",
    ["name", "page"]
  );
  const notFoundPage = resolveCurrentPage("/404.html", "404");
  assert.equal(notFoundPage, "404");
  for (const pathname of [
    "/missing/products",
    "/missing/about",
    "/missing/contact",
  ]) {
    assert.equal(
      resolveCurrentPage(pathname, "404"),
      "404",
      `${pathname} must retain the explicit 404 page identity`
    );
  }
  for (const name of ["home", "products", "about", "contact"]) {
    assert.equal(
      isActivePage(name, notFoundPage),
      false,
      `${name} must stay inactive on the 404 route`
    );
  }
  assert.equal(isActivePage("products", currentPage("/products")), true);

  const initialPageExpression =
    'resolveCurrentPage(window.location.pathname, document.documentElement.getAttribute("data-nav-page"))';
  assert.ok(
    navbarSource.includes(`const page = ${initialPageExpression};`),
    "initial navbar rendering must honor the explicit page identity"
  );

  const activeMarkup =
    '${isActive(l.name) ? \'class="nav-active" aria-current="page"\' : ""}';
  const activeTemplateLines = navbarSource
    .split(/\r?\n/)
    .filter((line) => line.includes(activeMarkup));
  assert.equal(
    activeTemplateLines.length,
    2,
    "desktop and drawer templates must each emit the active markup"
  );
  assert.ok(
    activeTemplateLines.some(
      (line) =>
        line.includes('<li><a href="${l.href}" data-nav="${l.name}"') &&
        line.includes('${l.label}</a></li>')
    ),
    "desktop template must apply active markup through isActive(l.name)"
  );
  assert.ok(
    activeTemplateLines.some(
      (line) =>
        line.trim().startsWith('`<a href="${l.href}" data-nav="${l.name}"') &&
        line.trim().endsWith('${l.label}</a>`')
    ),
    "drawer template must apply active markup through isActive(l.name)"
  );

  const syncBody = blockFor(
    navbarSource,
    /window\.ylSyncNavActive\s*=\s*function\s*\(\)\s*\{/,
    "ylSyncNavActive function"
  ).replace(/\s+/g, " ").trim();
  const syncSteps = [
    `var current = ${initialPageExpression};`,
    'document.querySelectorAll(".nav-links a[data-nav], .nav-mobile-drawer a[data-nav]").forEach(function (a) {',
    'var on = isActivePage(a.getAttribute("data-nav"), current);',
    'a.classList.toggle("nav-active", on);',
    'if (on) a.setAttribute("aria-current", "page");',
    'else a.removeAttribute("aria-current");',
  ];
  let previousStep = -1;
  for (const step of syncSteps) {
    const stepAt = syncBody.indexOf(step);
    assert.ok(stepAt > previousStep, `ylSyncNavActive must apply: ${step}`);
    previousStep = stepAt;
  }
});

test("navbar preserves the skip link as the first body child", () => {
  const preserveSkipLinkFirst = executableFunction(
    navbarSource,
    "preserveSkipLinkFirst",
    ["body"]
  );
  const originalFirstChild = { id: "nav" };
  const skipLink = { id: "skip" };
  const calls = [];
  const body = {
    firstChild: originalFirstChild,
    querySelector(selector) {
      assert.equal(selector, "[data-skip-link]");
      return skipLink;
    },
    insertBefore(element, before) {
      calls.push([element, before]);
    },
  };

  preserveSkipLinkFirst(body);
  assert.deepEqual(calls, [[skipLink, originalFirstChild]]);

  const insertAt = navbarSource.indexOf("function insert()");
  const lastShellInsert = navbarSource.indexOf(
    "document.body.insertBefore(navEl, document.body.firstChild);"
  );
  const preserveAt = navbarSource.indexOf(
    "preserveSkipLinkFirst(document.body);"
  );
  assert.ok(
    insertAt !== -1 && lastShellInsert > insertAt && preserveAt > lastShellInsert,
    "skip link must be restored to first position after navigation shell insertion"
  );
});

test("404 keeps its existing English recovery content and destinations", () => {
  for (const copy of [
    "404 &ndash; Page Not Found",
    "We can&rsquo;t find the page you&rsquo;re looking for",
    "Helpful places to go",
    "Browse Products",
    "Contact Yee Lim",
    "About Yee Lim",
  ]) assert.ok(pageSource.includes(copy), `404 page must preserve: ${copy}`);
  assert.match(pageSource, /class=["']page-hero nf-hero["']/);
  assert.match(pageSource, /class=["']page-hero-img["']/);
  assert.match(pageSource, /<form[^>]*\baction=["']\/products["'][^>]*\bmethod=["']get["']/i);
  assert.match(pageSource, /<input[^>]*\bname=["']q["']/i);
  for (const href of ["/products", "/contact", "/about"]) {
    assert.match(pageSource, new RegExp(`href=["']${href}["']`));
  }
});
