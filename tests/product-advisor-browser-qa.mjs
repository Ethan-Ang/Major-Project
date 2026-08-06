import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startPhpServer } from "./helpers/php-server.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(HERE, "..", "frontend");

// The harness used to assume a server was already listening on a fixed port. It
// now starts PHP's built-in server over frontend/ with the production-shaped
// router (tests/helpers/router.php), so clean URLs such as /about resolve the
// way the live host resolves them and /api/*.php is the real endpoint.
// YL_QA_BASE_URL still wins, for pointing the suite at another environment.
const externalBaseUrl = process.env.YL_QA_BASE_URL;
const phpServer = externalBaseUrl ? null : await startPhpServer();
const BASE_URL = externalBaseUrl || phpServer.url;
const BASE_ORIGIN = new URL(BASE_URL).origin;

/**
 * The stylesheets a route is expected to end up with, read from the physical
 * document that route serves rather than hardcoded.
 *
 * This previously carried a literal ["/styles.css"] for Home and About. That
 * file no longer exists: commit 5226335 put every Swup page on the same pair of
 * stylesheets, so the expectation described an architecture the site had moved
 * off, and the assertion failed on correct pages. Deriving it from the document
 * means the check still catches a genuinely wrong or missing stylesheet, and
 * cannot rot again the next time a page's stylesheets legitimately change.
 *
 * Sorted to match localStylesFor().
 */
const ROUTE_DOCUMENTS = {
  "/": "index.html",
  "/about": "about.html",
  "/products": "products.html",
  "/product-detail": "product-detail.html",
  "/enquiry": "enquiry.html",
  "/contact": "contact.html",
  "/compare": "compare.html",
};

function expectedStylesForRoute(route) {
  const pathname = route.split("?")[0].replace(/\/+$/, "") || "/";
  const document = ROUTE_DOCUMENTS[pathname];
  assert.ok(document, `No document mapped for route ${route}`);
  const html = fs.readFileSync(path.join(FRONTEND_DIR, document), "utf8");
  const hrefs = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)]
    .map((tag) => /href=["']([^"']+)["']/i.exec(tag[0]))
    .filter(Boolean)
    .map((match) => match[1]);
  return [...new Set(
    hrefs
      .map((href) => new URL(href, BASE_URL))
      .filter((url) => url.origin === BASE_ORIGIN)
      .map((url) => url.pathname)
  )].sort();
}
const EVIDENCE_DIR = path.resolve(HERE, "..", "qa", "advisor-evidence");
const CONVERSATION_KEY = "ylProductAdvisorConversation";
const SUMMARY_KEY = "ylProductAdvisorEnquirySummary";
const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l5yWAAAAAElFTkSuQmCC",
  "base64",
);

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const report = {
  harness: "yee-lim-product-advisor-browser-qa",
  baseUrl: BASE_URL,
  startedAt: new Date().toISOString(),
  safety: {
    advisorApiIntercepted: true,
    externalNetworkStubbed: true,
    realEnquirySubmissions: 0,
  },
  checks: [],
  diagnostics: {
    consoleErrors: [],
    consoleWarnings: [],
    expectedConsoleMessages: [],
    pageErrors: [],
    failedRequests: [],
    expectedRequestFailures: [],
    stubbedExternalAborts: [],
    badHttpResponses: [],
    advisorRequests: [],
  },
};

function shortError(error) {
  return {
    name: error && error.name ? error.name : "Error",
    message: error && error.message ? error.message : String(error),
  };
}

async function check(id, fn) {
  const started = Date.now();
  try {
    const details = await fn();
    report.checks.push({ id, status: "pass", durationMs: Date.now() - started, details: details ?? null });
    return details;
  } catch (error) {
    report.checks.push({ id, status: "fail", durationMs: Date.now() - started, error: shortError(error) });
    return undefined;
  }
}

function envelope(language, message, intent = "general", recommendations = [], action = null) {
  return {
    reply: message,
    message,
    intent,
    language,
    recommendations,
    action,
    source: "qa-deterministic",
  };
}

let RECOMMENDATIONS = [];

async function loadGroundedRecommendationFixtures() {
  const response = await fetch(`${BASE_URL}/api/products.php`, { headers: { Accept: "application/json" } });
  assert.equal(response.ok, true, `products.php returned ${response.status}`);
  const products = await response.json();
  assert.equal(Array.isArray(products), true);
  return ["1", "2"].map((id) => {
    const product = products.find((item) => String(item.id) === id);
    assert.ok(product, `Catalogue product ${id} is required by the recommendation fixture`);
    return {
      id,
      name: String(product.name),
      brand: String(product.brand),
      href: `/product-detail?id=${id}`,
      shortDescription: String(product.shortDescription || ""),
      usageText: String(product.usage || ""),
      surfaces: Array.isArray(product.surfaces) ? product.surfaces.map(String) : [],
      features: Array.isArray(product.features) ? product.features.map(String) : [],
    };
  });
}

function mockAdvisorReply(payload, state) {
  const messages = Array.isArray(payload && payload.messages) ? payload.messages : [];
  const lastUser = [...messages].reverse().find((item) => item && item.role === "user");
  const query = String(lastUser && lastUser.content ? lastUser.content : "");
  const language = payload && payload.language === "zh" ? "zh" : "en";
  const enquiryAction = { type: "enquiry", labelKey: "advisor.submit_enquiry", href: "/enquiry" };

  if (/force failure/i.test(query)) {
    state.failureAttempts += 1;
    if (state.failureAttempts === 1) {
      return {
        status: 503,
        body: envelope(language, language === "zh" ? "服务暂时不可用。" : "Service temporarily unavailable.", "error"),
      };
    }
    return {
      status: 200,
      body: envelope(language, language === "zh" ? "重试成功。" : "Recovered after retry.", "general", [], enquiryAction),
    };
  }

  if (/recommend|推荐/i.test(query)) {
    return {
      status: 200,
      body: envelope(
        language,
        language === "zh" ? "根据您提供的资料，以下产品值得进一步评估。" : "Based on the details provided, these products are worth evaluating.",
        "recommendation",
        RECOMMENDATIONS,
        enquiryAction,
      ),
    };
  }

  if (/xss/i.test(query)) {
    return {
      status: 200,
      body: envelope(
        language,
        '<img src="/qa-xss" onerror="window.__qaXss=1"><script>window.__qaXss=2</script>',
        "general",
        [],
        enquiryAction,
      ),
    };
  }

  if (/delivery|deliver|交货/i.test(query)) {
    const message = language === "zh"
      ? "具体交货时间会因产品、数量和库存情况而异。请提交询价，我们的团队会为您确认预计交期。"
      : "Delivery time depends on the product, quantity and availability. Submit an enquiry and our team will confirm the estimated lead time.";
    return { status: 200, body: envelope(language, message, "delivery", [], enquiryAction) };
  }

  return {
    status: 200,
    body: envelope(language, language === "zh" ? "我已收到您的问题。" : "I received your question.", "general", [], enquiryAction),
  };
}

async function installDeterministicRoutes(context, label) {
  const state = { failureAttempts: 0 };
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.origin === BASE_ORIGIN && url.pathname === "/api/advisor.php") {
      let payload = null;
      try { payload = request.postDataJSON(); } catch (error) {}
      const record = {
        context: label,
        method: request.method(),
        payload,
        at: new Date().toISOString(),
      };
      report.diagnostics.advisorRequests.push(record);
      const query = String(payload?.messages?.at(-1)?.content || "");
      if (/qa offline/i.test(query)) {
        await route.abort("internetdisconnected");
        return;
      }
      if (/qa interrupted navigation/i.test(query)) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        try {
          await route.fulfill({
            status: 200,
            contentType: "application/json; charset=utf-8",
            body: JSON.stringify(envelope("en", "Stale response after navigation", "general", [], {
              type: "enquiry", labelKey: "advisor.submit_enquiry", href: "/enquiry",
            })),
          });
        } catch (error) {}
        return;
      }
      if (/qa timeout/i.test(query)) {
        await new Promise((resolve) => setTimeout(resolve, 220));
        try {
          await route.fulfill({
            status: 200,
            contentType: "application/json; charset=utf-8",
            body: JSON.stringify(envelope("en", "Late response", "general", [], {
              type: "enquiry", labelKey: "advisor.submit_enquiry", href: "/enquiry",
            })),
          });
        } catch (error) {}
        return;
      }
      if (/qa invalid json/i.test(query)) {
        await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: "{not-json" });
        return;
      }
      if (/qa missing fields/i.test(query)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json; charset=utf-8",
          body: JSON.stringify({ message: "Incomplete response", intent: "general", language: "en" }),
        });
        return;
      }
      if (/duplicate send probe/i.test(query)) {
        await new Promise((resolve) => setTimeout(resolve, 180));
      }
      const response = mockAdvisorReply(payload, state);
      await route.fulfill({
        status: response.status,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify(response.body),
      });
      return;
    }

    if (url.origin === BASE_ORIGIN && url.pathname === "/api/enquiries.php") {
      report.safety.realEnquirySubmissions += 1;
      await route.fulfill({
        status: 418,
        contentType: "application/json; charset=utf-8",
        body: JSON.stringify({ error: "QA guard: real enquiry submission blocked" }),
      });
      return;
    }

    // PHP's development server does not URL-decode the path before router.php's
    // file_exists check. Fulfil the two genuine space-containing image assets
    // directly so the QA run exercises the checked-in files, not that dev-only
    // routing limitation.
    const decodedPath = decodeURIComponent(url.pathname);
    const localSpaceAssets = new Map([
      ["/images/quality (1).png", path.join(FRONTEND_DIR, "images", "quality (1).png")],
      ["/images/trust (1).png", path.join(FRONTEND_DIR, "images", "trust (1).png")],
    ]);
    if (url.origin === BASE_ORIGIN && localSpaceAssets.has(decodedPath)) {
      await route.fulfill({ status: 200, contentType: "image/png", path: localSpaceAssets.get(decodedPath) });
      return;
    }

    if (url.origin !== BASE_ORIGIN) {
      const type = request.resourceType();
      if (type === "stylesheet") {
        await route.fulfill({ status: 200, contentType: "text/css", body: "/* external stylesheet stubbed by QA */" });
      } else if (type === "image") {
        await route.fulfill({ status: 200, contentType: "image/png", body: ONE_PIXEL_PNG });
      } else {
        await route.fulfill({ status: 204, contentType: "text/plain", body: "" });
      }
      return;
    }

    await route.continue();
  });
}

function instrumentPage(page, label) {
  page.on("console", (message) => {
    const entry = { context: label, type: message.type(), text: message.text() };
    if (message.type() === "error" && (/status of 503 \(Service Unavailable\)/.test(message.text())
        || (label === "failure-states" && /Failed to load resource/.test(message.text())))) {
      report.diagnostics.expectedConsoleMessages.push(entry);
    } else if (message.type() === "error") report.diagnostics.consoleErrors.push(entry);
    if (message.type() === "warning") report.diagnostics.consoleWarnings.push(entry);
  });
  page.on("pageerror", (error) => {
    report.diagnostics.pageErrors.push({ context: label, ...shortError(error) });
  });
  page.on("requestfailed", (request) => {
    const entry = {
      context: label,
      method: request.method(),
      url: request.url(),
      failure: request.failure()?.errorText || "unknown",
    };
    const requestUrl = new URL(request.url());
    let lastContent = "";
    try { lastContent = String(request.postDataJSON()?.messages?.at(-1)?.content || ""); } catch (error) {}
    if (label === "failure-states" && requestUrl.origin === BASE_ORIGIN
        && requestUrl.pathname === "/api/advisor.php"
        && /qa (?:timeout|offline|interrupted navigation)/i.test(lastContent)) {
      report.diagnostics.expectedRequestFailures.push(entry);
    } else if (requestUrl.origin !== BASE_ORIGIN) report.diagnostics.stubbedExternalAborts.push(entry);
    else report.diagnostics.failedRequests.push(entry);
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (response.status() < 400) return;
    if (url.pathname === "/api/advisor.php" && response.status() === 503) return;
    report.diagnostics.badHttpResponses.push({ context: label, status: response.status(), url: response.url() });
  });
}

async function waitForApp(page, route = "/products") {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (
    typeof window.openProductAdvisor === "function"
    && typeof window.closeProductAdvisor === "function"
    && typeof window.ylSwup === "object"
    && document.querySelectorAll("#yl-advisor-panel").length === 1
  ));
}

async function openAdvisor(page) {
  await page.evaluate(() => window.openProductAdvisor());
  await page.waitForFunction(() => {
    const panel = document.getElementById("yl-advisor-panel");
    return panel && panel.classList.contains("open") && panel.getAttribute("aria-hidden") === "false" && !panel.inert;
  });
}

async function closeAdvisor(page, restoreFocus = false) {
  await page.evaluate((restore) => window.closeProductAdvisor(restore), restoreFocus);
  await page.waitForFunction(() => {
    const panel = document.getElementById("yl-advisor-panel");
    return panel && !panel.classList.contains("open") && panel.getAttribute("aria-hidden") === "true" && panel.inert;
  });
}

async function submitMessage(page, text) {
  const before = await page.locator(".yl-msg-assistant").count();
  await page.locator("#ylAdvInput").fill(text);
  await page.locator("#ylAdvInput").press("Enter");
  await page.waitForFunction((assistantCount) => {
    const log = document.getElementById("ylAdvMessages");
    return log && log.getAttribute("aria-busy") === "false"
      && document.querySelectorAll(".yl-msg-assistant").length > assistantCount;
  }, before);
  return {
    userText: await page.locator(".yl-msg-user .yl-msg-bubble").last().textContent(),
    assistantText: await page.locator(".yl-msg-assistant .yl-msg-bubble").last().textContent(),
  };
}

async function switchLanguage(page, language) {
  const current = await page.evaluate(() => window.ylLang);
  if (current === language) return;
  await page.locator(`.nav-lang-btn[data-lang="${language}"]`).click();
  await page.waitForFunction((target) => window.ylLang === target, language);
  await page.waitForFunction(() => !document.documentElement.classList.contains("is-changing"));
  await page.waitForTimeout(80);
}

async function conversationSnapshot(page) {
  return page.evaluate((key) => {
    const parsed = JSON.parse(sessionStorage.getItem(key));
    return {
      bubbles: Array.from(document.querySelectorAll(".yl-msg-bubble"), (element) => element.textContent),
      messages: parsed.messages.map((message) => ({
        id: message.id,
        sender: message.sender,
        originalText: message.originalText,
        originalLanguage: message.originalLanguage,
        kind: message.kind,
        intent: message.intent,
      })),
      currentStep: parsed.currentStep,
      structuredAnswers: parsed.structuredAnswers,
      recommendedProductIds: parsed.recommendedProductIds,
    };
  }, CONVERSATION_KEY);
}

function localStylesFor(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'))
    .map((link) => new URL(link.href, location.href))
    .filter((url) => url.origin === location.origin)
    .map((url) => url.pathname)
    .sort());
}

function allDurationsAreZero(value) {
  return String(value).split(",").every((part) => Number.parseFloat(part) === 0);
}

function allDurationsAreEffectivelyZero(value) {
  return String(value).split(",").every((part) => Number.parseFloat(part) <= 0.001);
}

let browser;
try {
  RECOMMENDATIONS = await loadGroundedRecommendationFixtures();
  browser = await chromium.launch({ headless: true });

  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await installDeterministicRoutes(desktopContext, "desktop");
  const page = await desktopContext.newPage();
  page.setDefaultTimeout(9000);
  instrumentPage(page, "desktop");

  await check("bootstrap.cold-products-route", async () => {
    await waitForApp(page);
    assert.equal(new URL(page.url()).pathname, "/products");
    assert.equal(await page.locator("#yl-advisor-panel").count(), 1);
    assert.equal(await page.locator("#yl-advisor-root").count(), 1);
    return { path: new URL(page.url()).pathname, advisorInstances: 1 };
  });

  await check("dialog.open-focus-inert-scroll-lock", async () => {
    await page.evaluate(() => {
      const trigger = document.createElement("button");
      trigger.id = "qaAdvisorTrigger";
      trigger.textContent = "Open QA advisor";
      trigger.style.cssText = "position:fixed;top:80px;left:16px;z-index:2";
      trigger.addEventListener("click", () => window.openProductAdvisor());
      document.body.appendChild(trigger);
      window.scrollTo(0, Math.min(600, document.documentElement.scrollHeight - innerHeight));
      document.body.style.overflow = "scroll";
    });
    const beforeY = await page.evaluate(() => window.scrollY);
    await page.locator("#qaAdvisorTrigger").click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), "ylAdvInput");
    assert.equal(await page.locator("#yl-advisor-panel").getAttribute("role"), "dialog");
    assert.equal(await page.locator("#yl-advisor-panel").getAttribute("aria-modal"), "true");
    assert.equal(await page.locator("#yl-advisor-panel").getAttribute("aria-hidden"), "false");
    assert.equal(await page.evaluate(() => document.getElementById("yl-advisor-panel").inert), false);
    assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
    assert.equal(await page.evaluate(() => window.scrollY), beforeY);
    return { scrollY: beforeY, activeElement: "ylAdvInput" };
  });

  await check("dialog.focus-trap-wraps-both-directions", async () => {
    // First and last are read from the panel rather than hardcoded. "Start over"
    // and the footer links only exist once a conversation has started, so naming
    // them here tested the trap only in one particular state -- and silently
    // stopped testing the wrap at all when they were not on screen. The trap's
    // contract is what matters: from the last focusable, Tab reaches the first,
    // and from the first, Shift+Tab reaches the last.
    const focusable = await page.evaluate(() => {
      const panel = document.getElementById("yl-advisor-panel");
      const selector = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
      return Array.from(panel.querySelectorAll(selector))
        .filter((element) => !element.hasAttribute("inert")
          && element.getAttribute("aria-hidden") !== "true"
          && !element.disabled
          && !element.hidden
          && element.getClientRects().length > 0)
        .map((element) => element.id || element.className);
    });
    assert.ok(focusable.length > 1, `the panel must trap more than one control, saw ${JSON.stringify(focusable)}`);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    await page.evaluate((id) => document.getElementById(id).focus(), last);
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.id), first, "Tab from the last must wrap to the first");

    await page.evaluate((id) => document.getElementById(id).focus(), first);
    await page.keyboard.press("Shift+Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.id), last, "Shift+Tab from the first must wrap to the last");

    // The panel chrome is deliberately minimal: no reset control, and no second
    // enquiry link under the input. Neither element exists, so neither can be in
    // the tab ring.
    const removedChrome = await page.evaluate(() => ({
      reset: !!document.getElementById("ylAdvReset"),
      footerLinks: !!document.getElementById("ylAdvFooterLinks"),
      footerEnquiryLink: !!document.getElementById("ylAdvEnquiryLink"),
    }));
    assert.deepEqual(removedChrome, { reset: false, footerLinks: false, footerEnquiryLink: false },
      "the panel must carry no Start over control and no footer enquiry link");

    return { focusable, forwardWrap: first, backwardWrap: last };
  });

  await check("dialog.escape-exact-focus-return-and-scroll-restore", async () => {
    const beforeY = await page.evaluate(() => window.scrollY);
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "qaAdvisorTrigger");
    assert.equal(await page.evaluate(() => document.body.style.overflow), "scroll");
    assert.equal(await page.evaluate(() => window.scrollY), beforeY);
    assert.equal(await page.locator("#yl-advisor-panel").getAttribute("aria-hidden"), "true");
    assert.equal(await page.evaluate(() => document.getElementById("yl-advisor-panel").inert), true);
    await page.evaluate(() => {
      document.getElementById("qaAdvisorTrigger")?.remove();
      document.body.style.overflow = "";
      window.scrollTo(0, 0);
    });
    return { returnedTo: "qaAdvisorTrigger", scrollY: beforeY };
  });

  await check("dialog.twenty-open-close-cycles-one-instance", async () => {
    for (let index = 0; index < 20; index += 1) {
      await openAdvisor(page);
      assert.equal(await page.locator("#yl-advisor-panel.open").count(), 1);
      await closeAdvisor(page, false);
      assert.equal(await page.locator("#yl-advisor-panel.open").count(), 0);
    }
    assert.equal(await page.locator("#yl-advisor-panel").count(), 1);
    assert.equal(await page.locator("#yl-advisor-style").count(), 1);
    return { cycles: 20, panels: 1, styleElements: 1 };
  });

  await check("conversation.english-delivery-and-payload", async () => {
    await openAdvisor(page);
    const result = await submitMessage(page, "How long does delivery take?");
    assert.equal(result.userText, "How long does delivery take?");
    assert.equal(result.assistantText, "Delivery time depends on the product, quantity and availability. Submit an enquiry and our team will confirm the estimated lead time.");
    const request = report.diagnostics.advisorRequests.at(-1);
    assert.equal(request.method, "POST");
    assert.equal(request.payload.language, "en");
    assert.equal(request.payload.messages.at(-1).content, "How long does delivery take?");
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, "advisor-after-en-delivery-1440x900.png") });
    return { language: request.payload.language, response: result.assistantText };
  });

  let englishSnapshot;
  await check("language.english-to-chinese-preserves-transcript", async () => {
    englishSnapshot = await conversationSnapshot(page);
    await closeAdvisor(page, false);
    await switchLanguage(page, "zh");
    await openAdvisor(page);
    const after = await conversationSnapshot(page);
    assert.deepEqual(after, englishSnapshot);
    assert.equal(await page.evaluate(() => document.documentElement.lang), "zh-Hans");
    assert.notEqual((await page.locator(".yl-adv-note").textContent()).trim(), "Guidance only. Our team confirms suitability.");
    return { preservedMessages: after.messages.length, interfaceLanguage: "zh" };
  });

  await check("conversation.chinese-delivery-and-future-payload", async () => {
    const result = await submitMessage(page, "交货需要多久？");
    assert.equal(result.userText, "交货需要多久？");
    assert.equal(result.assistantText, "具体交货时间会因产品、数量和库存情况而异。请提交询价，我们的团队会为您确认预计交期。");
    const request = report.diagnostics.advisorRequests.at(-1);
    assert.equal(request.payload.language, "zh");
    assert.equal(request.payload.messages.at(-1).content, "交货需要多久？");
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, "advisor-after-zh-delivery-1440x900.png") });
    return { language: request.payload.language, response: result.assistantText };
  });

  await check("language.chinese-to-english-preserves-transcript-and-future-payload", async () => {
    const before = await conversationSnapshot(page);
    await closeAdvisor(page, false);
    await switchLanguage(page, "en");
    await openAdvisor(page);
    assert.deepEqual(await conversationSnapshot(page), before);
    assert.equal((await page.locator(".yl-adv-note").textContent()).trim(), "Guidance only. Our team confirms suitability.");
    const result = await submitMessage(page, "Can you confirm delivery again?");
    const request = report.diagnostics.advisorRequests.at(-1);
    assert.equal(request.payload.language, "en");
    assert.equal(result.userText, "Can you confirm delivery again?");
    assert.equal(result.assistantText, "Delivery time depends on the product, quantity and availability. Submit an enquiry and our team will confirm the estimated lead time.");
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, "advisor-after-language-roundtrip-1440x900.png") });
    return { preservedMessages: before.messages.length, futureLanguage: request.payload.language };
  });

  await check("persistence.close-reopen-continuity", async () => {
    const before = await conversationSnapshot(page);
    await closeAdvisor(page, false);
    await openAdvisor(page);
    assert.deepEqual(await conversationSnapshot(page), before);
    return { messages: before.messages.length };
  });

  await check("persistence.same-tab-reload-continuity", async () => {
    const before = await conversationSnapshot(page);
    await closeAdvisor(page, false);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.openProductAdvisor === "function" && document.querySelectorAll("#yl-advisor-panel").length === 1);
    await openAdvisor(page);
    assert.deepEqual(await conversationSnapshot(page), before);
    return { messages: before.messages.length, panelInstances: 1 };
  });

  await check("failure.translated-error-retry-without-user-duplication", async () => {
    const userBefore = await page.locator(".yl-msg-user .yl-msg-bubble").count();
    const requestBefore = report.diagnostics.advisorRequests.length;
    await submitMessage(page, "force failure");
    assert.equal(await page.locator(".yl-msg-user .yl-msg-bubble").count(), userBefore + 1);
    assert.equal(await page.locator(".yl-adv-inline-button", { hasText: "Retry" }).count(), 1);
    assert.match(await page.locator(".yl-msg-assistant .yl-msg-bubble").last().textContent(), /retry|enquiry/i);
    await page.locator(".yl-adv-inline-button", { hasText: "Retry" }).click();
    await page.waitForFunction(() => (
      document.getElementById("ylAdvMessages")?.getAttribute("aria-busy") === "false"
      && Array.from(document.querySelectorAll(".yl-msg-assistant .yl-msg-bubble")).at(-1)?.textContent === "Recovered after retry."
    ));
    assert.equal(await page.locator(".yl-msg-assistant .yl-msg-bubble").last().textContent(), "Recovered after retry.");
    assert.equal(await page.locator(".yl-msg-user .yl-msg-bubble").count(), userBefore + 1);
    assert.equal(report.diagnostics.advisorRequests.length, requestBefore + 2);
    return { requests: 2, appendedUserMessages: 1 };
  });

  await check("input.rapid-duplicate-send-is-blocked", async () => {
    const requestBefore = report.diagnostics.advisorRequests.length;
    const userBefore = await page.locator(".yl-msg-user .yl-msg-bubble").count();
    const assistantBefore = await page.locator(".yl-msg-assistant").count();
    await page.evaluate(() => {
      const input = document.getElementById("ylAdvInput");
      input.value = "duplicate send probe";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      const eventOptions = { key: "Enter", code: "Enter", bubbles: true, cancelable: true };
      input.dispatchEvent(new KeyboardEvent("keydown", eventOptions));
      input.dispatchEvent(new KeyboardEvent("keydown", eventOptions));
    });
    await page.waitForFunction((assistantCount) => (
      document.getElementById("ylAdvMessages")?.getAttribute("aria-busy") === "false"
      && document.querySelectorAll(".yl-msg-assistant").length > assistantCount
    ), assistantBefore);
    const matchingUsers = await page.locator(".yl-msg-user .yl-msg-bubble", { hasText: "duplicate send probe" }).count();
    assert.equal(matchingUsers, 1);
    assert.equal(await page.locator(".yl-msg-user .yl-msg-bubble").count(), userBefore + 1);
    assert.equal(report.diagnostics.advisorRequests.length, requestBefore + 1);
    return { requests: 1, userMessages: 1 };
  });

  await check("security.user-and-api-xss-render-as-text", async () => {
    const probe = 'XSS <img src="/qa-xss-user" onerror="window.__qaXss=3"><script>window.__qaXss=4</script>';
    const result = await submitMessage(page, probe);
    assert.equal(result.userText, probe);
    assert.equal(result.assistantText, '<img src="/qa-xss" onerror="window.__qaXss=1"><script>window.__qaXss=2</script>');
    const userBubble = page.locator(".yl-msg-user .yl-msg-bubble").last();
    const assistantBubble = page.locator(".yl-msg-assistant .yl-msg-bubble").last();
    assert.equal(await userBubble.evaluate((element) => element.childElementCount), 0);
    assert.equal(await assistantBubble.evaluate((element) => element.childElementCount), 0);
    assert.equal(await page.evaluate(() => window.__qaXss), undefined);
    assert.equal(await page.locator("#yl-advisor-panel script, #yl-advisor-panel img[src^='/qa-xss']").count(), 0);
    return { userRenderedAsText: true, apiRenderedAsText: true };
  });

  await check("persistence.corrupt-conversation-recovers-in-isolation", async () => {
    await closeAdvisor(page, false);
    await page.evaluate(({ conversationKey }) => {
      sessionStorage.setItem("qaUnrelatedSession", "keep");
      sessionStorage.setItem(conversationKey, "{not valid json");
    }, { conversationKey: CONVERSATION_KEY });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => typeof window.openProductAdvisor === "function");
    const state = await page.evaluate(({ conversationKey }) => ({
      parsed: JSON.parse(sessionStorage.getItem(conversationKey)),
      unrelated: sessionStorage.getItem("qaUnrelatedSession"),
    }), { conversationKey: CONVERSATION_KEY });
    assert.equal(state.unrelated, "keep");
    assert.equal(state.parsed.schemaVersion, 1);
    assert.equal(state.parsed.messages.length, 1);
    assert.equal(state.parsed.messages[0].kind, "greeting");
    return { recoveredMessages: 1, unrelatedSessionValue: state.unrelated };
  });

  // There is no reset control any more. A new job is simply a new message, and
  // the conversation carries on. What this used to guarantee -- that changing
  // topic never clobbers the enquiry summary, the basket or unrelated session
  // state -- still has to hold, so it is asserted against the new behaviour.
  await check("persistence.a-different-job-continues-without-clearing-anything", async () => {
    const sentinel = {
      schemaVersion: 1,
      id: "qa-existing-summary",
      updatedAt: Date.now(),
      language: "en",
      productIds: ["2"],
      productNames: ["Deer™ Brand 129"],
      summaryText: "Existing advisor summary sentinel",
    };
    await page.evaluate(({ summaryKey, value }) => {
      localStorage.setItem("enquiryBasket", JSON.stringify(["2", "999"]));
      sessionStorage.setItem(summaryKey, JSON.stringify(value));
    }, { summaryKey: SUMMARY_KEY, value: sentinel });
    await openAdvisor(page);
    await submitMessage(page, "How long does delivery take?");
    const afterFirst = await conversationSnapshot(page);

    // A clearly different bonding job, with no reset in between.
    await submitMessage(page, "Now I need to bond leather for a completely different job.");
    const state = await page.evaluate(({ conversationKey, summaryKey }) => ({
      conversation: JSON.parse(sessionStorage.getItem(conversationKey)),
      summary: JSON.parse(sessionStorage.getItem(summaryKey)),
      basket: JSON.parse(localStorage.getItem("enquiryBasket")),
      unrelated: sessionStorage.getItem("qaUnrelatedSession"),
    }), { conversationKey: CONVERSATION_KEY, summaryKey: SUMMARY_KEY });

    assert.ok(
      state.conversation.messages.length > afterFirst.messages.length,
      "the new job must extend the conversation, not clear it"
    );
    assert.equal(state.conversation.messages[0].kind, "greeting");
    assert.deepEqual(state.summary, sentinel, "the enquiry summary must survive a topic change");
    assert.deepEqual(state.basket, ["2", "999"], "explicitly attached products must survive");
    assert.equal(state.unrelated, "keep", "unrelated session state must survive");
    assert.equal(await page.locator("#ylAdvReset").count(), 0, "no reset control may exist");
    return {
      messagesBefore: afterFirst.messages.length,
      messagesAfter: state.conversation.messages.length,
      basket: state.basket,
      unrelatedPreserved: true,
    };
  });

  let attachedSummary;
  await check("recommendation.explicit-attachment-unions-without-duplicates", async () => {
    await submitMessage(page, "Please recommend an adhesive for leather.");
    assert.equal(await page.locator(".yl-recommendation").count(), 2);
    const includeButton = page.locator(".yl-rec-actions .yl-adv-inline-button").last();
    // The control is a toggle now, so it reports state through aria-pressed
    // rather than by disabling itself -- pressing it again removes the products.
    assert.equal(await includeButton.isDisabled(), false);
    assert.equal(await includeButton.getAttribute("aria-pressed"), "false");
    await includeButton.click();
    const stored = await page.evaluate(({ summaryKey }) => ({
      basket: JSON.parse(localStorage.getItem("enquiryBasket")),
      summary: JSON.parse(sessionStorage.getItem(summaryKey)),
    }), { summaryKey: SUMMARY_KEY });
    assert.deepEqual(stored.basket, ["2", "999", "1"]);
    assert.equal(new Set(stored.basket).size, stored.basket.length);
    assert.deepEqual(stored.summary.productIds, ["1", "2"]);
    assert.deepEqual(stored.summary.productNames, ["Deer™ Brand 101", "Deer™ Brand 129"]);
    assert.doesNotMatch(stored.summary.summaryText, /Please recommend|delivery|XSS/i);
    assert.equal(await includeButton.getAttribute("aria-pressed"), "true");
    assert.equal(await includeButton.isDisabled(), false, "the toggle must stay operable so it can be undone");
    attachedSummary = stored.summary;
    return { basket: stored.basket, attachedProductIds: stored.summary.productIds };
  });

  await check("enquiry.handoff-is-once-only-editable-summary", async () => {
    await page.locator(".yl-adv-inline-link").last().click();
    await page.waitForFunction(() => location.pathname === "/enquiry" && document.getElementById("eMessage"));
    const message = page.locator("#eMessage");
    await page.waitForFunction((summary) => document.getElementById("eMessage")?.value.includes(summary), attachedSummary.summaryText);
    assert.equal(await message.isEditable(), true);
    await page.evaluate(() => {
      const textarea = document.getElementById("eMessage");
      textarea.setRangeText("\n\nEditable QA note", textarea.value.length, textarea.value.length, "end");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      window.ylRunReady();
      window.ylRunReady();
    });
    const value = await message.inputValue();
    const occurrences = value.split(attachedSummary.summaryText).length - 1;
    assert.equal(occurrences, 1);
    assert.match(value, /Editable QA note$/);
    assert.equal(await page.locator("#yl-advisor-panel.open").count(), 0);
    return { summaryOccurrences: occurrences, editable: true, submitted: false };
  });

  const navigationSequence = ["/", "/products", "/about", "/contact", "/enquiry"];
  const selectorForPath = {
    "/": ".hero",
    "/products": "#catalogueHeading",
    "/about": ".about-hero",
    "/contact": "#contactHeading",
    "/enquiry": "#enquiryHeading",
  };
  for (let index = 0; index < 20; index += 1) {
    const destination = navigationSequence[index % navigationSequence.length];
    await check(`swup.navigation-${String(index + 1).padStart(2, "0")}-${destination === "/" ? "home" : destination.slice(1)}`, async () => {
      await page.evaluate(async (url) => { await window.ylSwup.navigate(url); }, destination);
      await page.waitForFunction((pathname) => location.pathname === pathname, destination);
      await page.locator(selectorForPath[destination]).waitFor();
      const expectedStyles = expectedStylesForRoute(destination);
      await page.waitForFunction((expected) => {
        const actual = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'))
          .map((link) => new URL(link.href, location.href))
          .filter((url) => url.origin === location.origin)
          .map((url) => url.pathname)
          .sort();
        return JSON.stringify(actual) === JSON.stringify(expected);
      }, expectedStyles);
      const actualStyles = await localStylesFor(page);
      assert.deepEqual(actualStyles, expectedStyles);
      assert.equal(await page.locator("#yl-advisor-panel").count(), 1);
      assert.equal(await page.locator("#yl-advisor-root").count(), 1);
      assert.equal(await page.locator("#swup").count(), 1);
      return { destination, styles: actualStyles, advisorInstances: 1 };
    });
  }

  await check("swup.one-advisor-listener-after-twenty-navigations", async () => {
    const requestBefore = report.diagnostics.advisorRequests.length;
    const userBefore = await page.locator(".yl-msg-user .yl-msg-bubble").count();
    await openAdvisor(page);
    await submitMessage(page, "listener probe after twenty navigations");
    assert.equal(report.diagnostics.advisorRequests.length, requestBefore + 1);
    assert.equal(await page.locator(".yl-msg-user .yl-msg-bubble").count(), userBefore + 1);
    assert.equal(await page.locator("#yl-advisor-panel").count(), 1);
    await closeAdvisor(page, false);
    return { navigations: 20, requestsFromOneSend: 1, panels: 1 };
  });

  await check("swup.explicit-route-history-and-conversation-lifecycle", async () => {
    const baseline = await conversationSnapshot(page);
    const lifecycleToken = await page.evaluate(() => {
      window.__qaLifecycleToken = crypto.randomUUID();
      return window.__qaLifecycleToken;
    });
    const routeSequence = [
      { label: "Enquiry→Home", href: "/", selector: ".hero" },
      { label: "Home→Products", href: "/products", selector: "#catalogueHeading" },
      { label: "Products→About", href: "/about", selector: ".about-hero" },
      { label: "About→Products", href: "/products", selector: "#catalogueHeading" },
      { label: "Products→Product Detail", href: "/product-detail?id=1", selector: "#detailPageGrid" },
      { label: "Product Detail→Products", href: "/products", selector: "#catalogueHeading" },
      { label: "Products→Enquiry", href: "/enquiry", selector: "#enquiryHeading" },
      { label: "Enquiry→Products", href: "/products", selector: "#catalogueHeading" },
      { label: "Products→Product Detail (2)", href: "/product-detail?id=1", selector: "#detailPageGrid" },
      { label: "Product Detail→Enquiry", href: "/enquiry", selector: "#enquiryHeading" },
      { label: "Enquiry→Products (2)", href: "/products", selector: "#catalogueHeading" },
    ];
    const audited = [];
    for (const step of routeSequence) {
      await page.evaluate(async (href) => { await window.ylSwup.navigate(href); }, step.href);
      const target = new URL(step.href, BASE_URL);
      await page.waitForFunction((expected) => location.pathname + location.search === expected, target.pathname + target.search);
      await page.locator(step.selector).waitFor();
      const expectedStyles = expectedStylesForRoute(target.pathname);
      assert.deepEqual(await localStylesFor(page), expectedStyles, step.label);
      assert.deepEqual(await conversationSnapshot(page), baseline, step.label);
      assert.equal(await page.evaluate(() => window.ylLang), "en", step.label);
      assert.equal(await page.evaluate(() => window.__qaLifecycleToken), lifecycleToken, step.label);
      assert.equal(await page.locator("#yl-advisor-panel").count(), 1, step.label);
      assert.equal(await page.locator("#yl-advisor-panel.open").count(), 0, step.label);
      assert.equal(await page.locator("#yl-advisor-backdrop.open").count(), 0, step.label);
      assert.equal(await page.evaluate(() => document.body.style.overflow), "", step.label);
      audited.push(step.label);
    }

    await page.evaluate(() => history.back());
    await page.waitForFunction(() => location.pathname === "/enquiry");
    await page.locator("#enquiryHeading").waitFor();
    assert.deepEqual(await conversationSnapshot(page), baseline);
    assert.equal(await page.evaluate(() => window.__qaLifecycleToken), lifecycleToken);
    await page.evaluate(() => history.forward());
    await page.waitForFunction(() => location.pathname === "/products");
    await page.locator("#catalogueHeading").waitFor();
    assert.deepEqual(await conversationSnapshot(page), baseline);
    assert.equal(await page.evaluate(() => window.__qaLifecycleToken), lifecycleToken);
    assert.equal(await page.locator("#yl-advisor-panel").count(), 1);
    return { routes: audited, browserBack: "/enquiry", browserForward: "/products", documentReloads: 0 };
  });

  await desktopContext.close();

  for (const coldEntry of [
    { label: "home", route: "/", marker: ".hero" },
    { label: "about", route: "/about", marker: ".about-hero" },
  ]) {
    const coldLabel = `cold-${coldEntry.label}-to-products`;
    const coldContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await coldContext.addInitScript(() => {
      if (window.top !== window) return;
      const next = Number(sessionStorage.getItem("qaColdDocumentGeneration") || "0") + 1;
      sessionStorage.setItem("qaColdDocumentGeneration", String(next));
      window.__qaColdDocumentGeneration = next;
    });
    await installDeterministicRoutes(coldContext, coldLabel);
    const coldPage = await coldContext.newPage();
    coldPage.setDefaultTimeout(9000);
    instrumentPage(coldPage, coldLabel);
    await check(`swup.cold-${coldEntry.label}-entry-to-products`, async () => {
      await waitForApp(coldPage, coldEntry.route);
      await coldPage.locator(coldEntry.marker).waitFor();
      assert.deepEqual(await localStylesFor(coldPage), expectedStylesForRoute(coldEntry.route));
      assert.equal(await coldPage.evaluate(() => window.__qaColdDocumentGeneration), 1);
      assert.equal(await coldPage.locator("#yl-advisor-panel").count(), 1);
      await coldPage.evaluate(async () => { await window.ylSwup.navigate("/products"); });
      await coldPage.waitForFunction(() => location.pathname === "/products");
      await coldPage.locator("#catalogueHeading").waitFor();
      await coldPage.locator(".product-grid .product-card:not(.skeleton-card)").first().waitFor();
      assert.deepEqual(await localStylesFor(coldPage), expectedStylesForRoute("/products"));
      assert.equal(await coldPage.evaluate(() => window.__qaColdDocumentGeneration), 1);
      assert.equal(await coldPage.locator("#yl-advisor-panel").count(), 1);
      await openAdvisor(coldPage);
      assert.equal(await coldPage.evaluate(() => document.activeElement?.id), "ylAdvInput");
      await closeAdvisor(coldPage, false);
      return { entry: coldEntry.route, destination: "/products", fullReloads: 0, advisorInstances: 1 };
    });
    await coldContext.close();
  }

  const zeroContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await zeroContext.addInitScript(() => {
    if (window.top !== window) return;
    const next = Number(sessionStorage.getItem("qaDocumentGeneration") || "0") + 1;
    sessionStorage.setItem("qaDocumentGeneration", String(next));
    window.__qaDocumentGeneration = next;
  });
  await installDeterministicRoutes(zeroContext, "zero-product-enquiry");
  const zeroPage = await zeroContext.newPage();
  zeroPage.setDefaultTimeout(9000);
  instrumentPage(zeroPage, "zero-product-enquiry");

  await check("input.empty-and-whitespace-submissions-are-blocked", async () => {
    await waitForApp(zeroPage);
    await zeroPage.evaluate(() => localStorage.removeItem("enquiryBasket"));
    await openAdvisor(zeroPage);
    const requestsBefore = report.diagnostics.advisorRequests.length;
    const usersBefore = await zeroPage.locator(".yl-msg-user").count();
    await zeroPage.locator("#ylAdvInput").fill("");
    assert.equal(await zeroPage.locator("#ylAdvSend").isDisabled(), true);
    await zeroPage.locator("#ylAdvInput").press("Enter");
    await zeroPage.locator("#ylAdvInput").fill("   ");
    assert.equal(await zeroPage.locator("#ylAdvSend").isDisabled(), true);
    await zeroPage.locator("#ylAdvInput").press("Enter");
    await zeroPage.waitForTimeout(80);
    assert.equal(report.diagnostics.advisorRequests.length, requestsBefore);
    assert.equal(await zeroPage.locator(".yl-msg-user").count(), usersBefore);
    return { emptyRequests: 0, whitespaceRequests: 0, userMessagesAdded: 0 };
  });

  await check("enquiry.zero-product-link-is-in-place-swup-navigation", async () => {
    // The enquiry link is part of the sentence that offers it, so ask something
    // whose answer actually offers one. A reply that never mentions enquiring
    // correctly renders no link at all.
    await submitMessage(zeroPage, "How long does delivery take?");
    const before = await conversationSnapshot(zeroPage);
    assert.equal(await zeroPage.locator(".yl-adv-inline-link").last().getAttribute("href"), "/enquiry");
    assert.equal(await zeroPage.evaluate(() => window.__qaDocumentGeneration), 1);
    assert.deepEqual(await zeroPage.evaluate(() => JSON.parse(localStorage.getItem("enquiryBasket") || "[]")), []);
    await zeroPage.locator(".yl-adv-inline-link").last().click();
    await zeroPage.waitForFunction(() => location.pathname === "/enquiry" && document.getElementById("eMessage"));
    assert.equal(await zeroPage.evaluate(() => window.__qaDocumentGeneration), 1);
    assert.equal(await zeroPage.evaluate(() => sessionStorage.getItem("qaDocumentGeneration")), "1");
    assert.deepEqual(await zeroPage.evaluate(() => JSON.parse(localStorage.getItem("enquiryBasket") || "[]")), []);
    assert.deepEqual(await conversationSnapshot(zeroPage), before);
    assert.equal(await zeroPage.locator("#eMessage").isEditable(), true);
    assert.equal(await zeroPage.locator("#yl-advisor-panel.open").count(), 0);
    assert.equal(await zeroPage.evaluate(() => document.body.style.overflow), "");
    return { products: 0, documentGenerations: 1, usedSwup: true, conversationPreserved: true };
  });
  await zeroContext.close();

  const exactLanguageContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await installDeterministicRoutes(exactLanguageContext, "exact-language-sequence");
  const exactLanguagePage = await exactLanguageContext.newPage();
  exactLanguagePage.setDefaultTimeout(9000);
  instrumentPage(exactLanguagePage, "exact-language-sequence");

  await check("language.exact-wood-metal-water-swup-roundtrip", async () => {
    await waitForApp(exactLanguagePage);
    await openAdvisor(exactLanguagePage);
    const english = await submitMessage(exactLanguagePage, "I need an adhesive for wood and metal.");
    assert.equal(english.userText, "I need an adhesive for wood and metal.");
    assert.equal(report.diagnostics.advisorRequests.at(-1).payload.language, "en");
    const afterEnglish = await conversationSnapshot(exactLanguagePage);
    const englishIds = afterEnglish.messages.map((message) => message.id);

    await closeAdvisor(exactLanguagePage, false);
    await switchLanguage(exactLanguagePage, "zh");
    await openAdvisor(exactLanguagePage);
    assert.deepEqual(await conversationSnapshot(exactLanguagePage), afterEnglish);
    assert.equal(await exactLanguagePage.locator(".yl-msg-user .yl-msg-bubble").last().textContent(), "I need an adhesive for wood and metal.");
    assert.notEqual((await exactLanguagePage.locator(".yl-adv-note").textContent()).trim(), "Guidance only. Our team confirms suitability.");

    const chinese = await submitMessage(exactLanguagePage, "会接触到水。");
    assert.equal(chinese.userText, "会接触到水。");
    assert.equal(chinese.assistantText, "我已收到您的问题。");
    assert.equal(report.diagnostics.advisorRequests.at(-1).payload.language, "zh");
    assert.equal(report.diagnostics.advisorRequests.at(-1).payload.messages.at(-1).content, "会接触到水。");
    const afterChinese = await conversationSnapshot(exactLanguagePage);
    assert.deepEqual(afterChinese.messages.slice(0, afterEnglish.messages.length).map((message) => message.id), englishIds);
    await exactLanguagePage.evaluate(() => { document.getElementById("ylAdvMessages").scrollTop = 0; });
    await exactLanguagePage.waitForTimeout(350);
    await exactLanguagePage.screenshot({ path: path.join(EVIDENCE_DIR, "advisor-after-en-to-zh-1440x900.png") });

    await closeAdvisor(exactLanguagePage, false);
    await exactLanguagePage.evaluate(async () => { await window.ylSwup.navigate("/about"); });
    await exactLanguagePage.waitForFunction(() => location.pathname === "/about");
    await exactLanguagePage.locator(".about-hero").waitFor();
    assert.equal(await exactLanguagePage.evaluate(() => window.ylLang), "zh");
    await openAdvisor(exactLanguagePage);
    assert.deepEqual(await conversationSnapshot(exactLanguagePage), afterChinese);
    assert.deepEqual(await exactLanguagePage.locator(".yl-msg-user .yl-msg-bubble").allTextContents(), [
      "I need an adhesive for wood and metal.", "会接触到水。",
    ]);

    await closeAdvisor(exactLanguagePage, false);
    await switchLanguage(exactLanguagePage, "en");
    await openAdvisor(exactLanguagePage);
    assert.deepEqual(await conversationSnapshot(exactLanguagePage), afterChinese);
    assert.equal((await exactLanguagePage.locator(".yl-adv-note").textContent()).trim(), "Guidance only. Our team confirms suitability.");
    await exactLanguagePage.evaluate(() => { document.getElementById("ylAdvMessages").scrollTop = 0; });
    await exactLanguagePage.waitForTimeout(350);
    await exactLanguagePage.screenshot({ path: path.join(EVIDENCE_DIR, "advisor-after-zh-to-en-1440x900.png") });
    const future = await submitMessage(exactLanguagePage, "Please continue in English.");
    assert.equal(future.assistantText, "I received your question.");
    assert.equal(report.diagnostics.advisorRequests.at(-1).payload.language, "en");
    return {
      originalEnglishPreserved: true,
      chineseUserPreserved: true,
      currentStepPreserved: afterEnglish.currentStep,
      structuredAnswersPreserved: true,
      swupDestination: "/about",
      futureLanguage: "en",
    };
  });
  await exactLanguageContext.close();

  const failureContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await failureContext.addInitScript(() => {
    const nativeSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = function (handler, delay, ...args) {
      return nativeSetTimeout(handler, delay === 12000 ? 80 : delay, ...args);
    };
  });
  await installDeterministicRoutes(failureContext, "failure-states");
  const failurePage = await failureContext.newPage();
  failurePage.setDefaultTimeout(9000);
  instrumentPage(failurePage, "failure-states");

  await check("failure.timeout-is-translated-retryable-and-preserves-input", async () => {
    await waitForApp(failurePage);
    await openAdvisor(failurePage);
    const result = await submitMessage(failurePage, "qa timeout");
    assert.match(result.assistantText, /too long|retry|enquiry/i);
    assert.equal(await failurePage.locator("#ylAdvInput").inputValue(), "qa timeout");
    assert.equal(await failurePage.locator(".yl-adv-inline-button", { hasText: "Retry" }).count(), 1);
    assert.equal(await failurePage.locator(".yl-adv-inline-link", { hasText: "ubmit an enquiry" }).count() > 0, true);
    await failurePage.waitForTimeout(250);
    return { translated: true, retryAvailable: true, inputPreserved: true };
  });

  await check("failure.invalid-json-is-translated-and-retryable", async () => {
    const result = await submitMessage(failurePage, "qa invalid json");
    assert.match(result.assistantText, /unexpected response/i);
    assert.equal(await failurePage.locator("#ylAdvInput").inputValue(), "qa invalid json");
    assert.equal(await failurePage.locator(".yl-adv-inline-button", { hasText: "Retry" }).count() > 0, true);
    return { translated: true, retryAvailable: true, rawJsonExposed: false };
  });

  await check("failure.missing-fields-is-translated-and-retryable", async () => {
    const result = await submitMessage(failurePage, "qa missing fields");
    assert.match(result.assistantText, /unexpected response/i);
    assert.equal(await failurePage.locator("#ylAdvInput").inputValue(), "qa missing fields");
    assert.equal(await failurePage.locator(".yl-adv-inline-button", { hasText: "Retry" }).count() > 0, true);
    return { translated: true, retryAvailable: true, missingFieldsHidden: true };
  });

  await check("failure.network-offline-is-translated-retryable-and-preserves-input", async () => {
    const failuresBefore = report.diagnostics.expectedRequestFailures.length;
    const result = await submitMessage(failurePage, "qa offline");
    assert.match(result.assistantText, /can't connect|retry|enquiry/i);
    assert.equal(await failurePage.locator("#ylAdvInput").inputValue(), "qa offline");
    assert.equal(await failurePage.locator(".yl-adv-inline-button", { hasText: "Retry" }).count() > 0, true);
    assert.equal(await failurePage.locator(".yl-adv-inline-link", { hasText: "ubmit an enquiry" }).count() > 0, true);
    const failures = report.diagnostics.expectedRequestFailures.slice(failuresBefore);
    assert.equal(failures.length, 1);
    assert.match(failures[0].failure, /ERR_INTERNET_DISCONNECTED/);
    return { translated: true, retryAvailable: true, inputPreserved: true, failure: failures[0].failure };
  });

  await check("failure.in-flight-request-is-aborted-by-swup-navigation", async () => {
    const assistantBefore = await failurePage.locator(".yl-msg-assistant").count();
    const userBefore = await failurePage.locator(".yl-msg-user .yl-msg-bubble").count();
    const failuresBefore = report.diagnostics.expectedRequestFailures.length;
    const pendingRequest = failurePage.waitForRequest((request) => (
      new URL(request.url()).pathname === "/api/advisor.php"
      && request.postData()?.includes("qa interrupted navigation")
    ));
    await failurePage.locator("#ylAdvInput").fill("qa interrupted navigation");
    await failurePage.locator("#ylAdvInput").press("Enter");
    await failurePage.waitForFunction(() => document.getElementById("ylAdvMessages")?.getAttribute("aria-busy") === "true");
    await pendingRequest;
    await failurePage.evaluate(async () => { await window.ylSwup.navigate("/about"); });
    await failurePage.waitForFunction(() => location.pathname === "/about" && document.querySelector(".about-hero"));
    await failurePage.waitForTimeout(550);
    assert.equal(await failurePage.locator("#yl-advisor-panel.open").count(), 0);
    assert.equal(await failurePage.locator(".yl-msg-assistant").count(), assistantBefore);
    assert.equal(await failurePage.locator("#ylAdvMessages").getAttribute("aria-busy"), "false");
    assert.equal(await failurePage.locator("#ylAdvStatus").textContent(), "");
    assert.equal(await failurePage.locator("#ylAdvInput").inputValue(), "qa interrupted navigation");
    assert.equal(await failurePage.locator(".yl-msg-user .yl-msg-bubble").count(), userBefore + 1);
    assert.equal(await failurePage.locator(".yl-msg-user .yl-msg-bubble", { hasText: "qa interrupted navigation" }).count(), 1);
    assert.equal(await failurePage.evaluate(() => document.body.style.overflow), "");
    const failures = report.diagnostics.expectedRequestFailures.slice(failuresBefore);
    assert.equal(failures.length, 1);
    assert.match(failures[0].failure, /ERR_ABORTED/);
    return {
      destination: "/about",
      staleAssistantMessages: 0,
      inputPreserved: true,
      failure: failures[0].failure,
      scrollRestored: true,
    };
  });
  await failureContext.close();

  const mobileContext = await browser.newContext({ viewport: { width: 360, height: 800 } });
  await installDeterministicRoutes(mobileContext, "mobile-360");
  const mobile = await mobileContext.newPage();
  mobile.setDefaultTimeout(9000);
  instrumentPage(mobile, "mobile-360");

  await check("responsive.360px-no-horizontal-overflow", async () => {
    await waitForApp(mobile);
    await openAdvisor(mobile);
    await submitMessage(mobile, "How long does delivery take on mobile?");
    const geometry = await mobile.evaluate(() => {
      const panel = document.getElementById("yl-advisor-panel");
      const rect = panel.getBoundingClientRect();
      return {
        innerWidth,
        documentScrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        panel: { left: rect.left, right: rect.right, width: rect.width, top: rect.top, bottom: rect.bottom },
        inputFontSize: Number.parseFloat(getComputedStyle(document.getElementById("ylAdvInput")).fontSize),
        closeWidth: document.getElementById("ylAdvClose").getBoundingClientRect().width,
        sendWidth: document.getElementById("ylAdvSend").getBoundingClientRect().width,
      };
    });
    assert.ok(geometry.documentScrollWidth <= geometry.innerWidth, JSON.stringify(geometry));
    assert.ok(geometry.panel.left >= -0.5 && geometry.panel.right <= geometry.innerWidth + 0.5, JSON.stringify(geometry));
    assert.ok(geometry.inputFontSize >= 16);
    assert.ok(Math.round(geometry.closeWidth) >= 44);
    assert.ok(Math.round(geometry.sendWidth) >= 44);
    await mobile.waitForTimeout(350);
    await mobile.screenshot({ path: path.join(EVIDENCE_DIR, "advisor-after-mobile-360x800.png") });
    return geometry;
  });

  await check("responsive.mobile-recommendations-and-long-chinese-wrap", async () => {
    await closeAdvisor(mobile, false);
    await switchLanguage(mobile, "zh");
    await openAdvisor(mobile);
    await mobile.waitForFunction(() => typeof PRODUCTS !== "undefined" && PRODUCTS.length > 0);
    const longChinese = "这是一个用于测试移动端换行的很长中文问题，需要确认产品顾问中的文字不会溢出对话气泡，也不会让页面产生横向滚动。";
    await submitMessage(mobile, longChinese);
    const longBubble = mobile.locator(".yl-msg-user .yl-msg-bubble").last();
    assert.equal(await longBubble.textContent(), longChinese);
    const longGeometry = await longBubble.evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      overflowWrap: getComputedStyle(element).overflowWrap,
    }));
    assert.ok(longGeometry.scrollWidth <= longGeometry.clientWidth);
    assert.equal(longGeometry.overflowWrap, "anywhere");

    await submitMessage(mobile, "请推荐适合皮革的胶粘剂。");
    assert.equal(await mobile.locator(".yl-recommendation").count(), 2);
    const cards = await mobile.locator(".yl-recommendation").evaluateAll((elements) => elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, left: rect.left, right: rect.right };
    }));
    const mobileWidth = mobile.viewportSize().width;
    assert.ok(cards.every((card) => card.scrollWidth <= card.clientWidth && card.left >= 0 && card.right <= mobileWidth));
    assert.ok(await mobile.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= innerWidth));
    await mobile.waitForTimeout(350);
    await mobile.screenshot({ path: path.join(EVIDENCE_DIR, "advisor-after-mobile-360x800.png") });
    return { longChineseWrapped: true, recommendationCards: cards.length, horizontalOverflow: false };
  });

  await mobileContext.close();

  const viewportMatrix = [
    { width: 1440, height: 900 },
    { width: 1280, height: 800 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 430, height: 932 },
    { width: 390, height: 844 },
    { width: 360, height: 800 },
    { width: 320, height: 720 },
  ];
  for (const viewport of viewportMatrix) {
    const label = `viewport-${viewport.width}x${viewport.height}`;
    const matrixContext = await browser.newContext({ viewport });
    await installDeterministicRoutes(matrixContext, label);
    const matrixPage = await matrixContext.newPage();
    matrixPage.setDefaultTimeout(9000);
    instrumentPage(matrixPage, label);
    await check(`responsive.matrix-${viewport.width}x${viewport.height}`, async () => {
      await waitForApp(matrixPage);
      await openAdvisor(matrixPage);
      await matrixPage.waitForTimeout(350);
      const geometry = await matrixPage.evaluate(() => {
        const panel = document.getElementById("yl-advisor-panel").getBoundingClientRect();
        const input = document.getElementById("ylAdvInput").getBoundingClientRect();
        const close = document.getElementById("ylAdvClose").getBoundingClientRect();
        const send = document.getElementById("ylAdvSend").getBoundingClientRect();
        return {
          innerWidth,
          innerHeight,
          scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
          panel: { left: panel.left, right: panel.right, top: panel.top, bottom: panel.bottom },
          input: { left: input.left, right: input.right, top: input.top, bottom: input.bottom },
          close: { width: close.width, height: close.height },
          send: { width: send.width, height: send.height },
        };
      });
      assert.ok(geometry.scrollWidth <= geometry.innerWidth, JSON.stringify(geometry));
      assert.ok(geometry.panel.left >= -0.5 && geometry.panel.right <= geometry.innerWidth + 0.5, JSON.stringify(geometry));
      assert.ok(geometry.panel.top >= -0.5 && geometry.panel.bottom <= geometry.innerHeight + 0.5, JSON.stringify(geometry));
      assert.ok(geometry.input.left >= geometry.panel.left && geometry.input.right <= geometry.panel.right);
      assert.ok(Math.round(geometry.close.width) >= 44 && Math.round(geometry.close.height) >= 44);
      assert.ok(Math.round(geometry.send.width) >= 44 && Math.round(geometry.send.height) >= 44);
      return geometry;
    });
    await matrixContext.close();
  }

  const zoomContext = await browser.newContext({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
  await installDeterministicRoutes(zoomContext, "zoom-200-percent");
  const zoomPage = await zoomContext.newPage();
  zoomPage.setDefaultTimeout(9000);
  instrumentPage(zoomPage, "zoom-200-percent");
  await check("responsive.200-percent-zoom-equivalent", async () => {
    await waitForApp(zoomPage);
    await openAdvisor(zoomPage);
    await zoomPage.waitForTimeout(350);
    const geometry = await zoomPage.evaluate(() => {
      const panel = document.getElementById("yl-advisor-panel").getBoundingClientRect();
      const input = document.getElementById("ylAdvInput").getBoundingClientRect();
      const close = document.getElementById("ylAdvClose").getBoundingClientRect();
      const send = document.getElementById("ylAdvSend").getBoundingClientRect();
      return {
        innerWidth,
        innerHeight,
        devicePixelRatio,
        scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        panel: { left: panel.left, right: panel.right, top: panel.top, bottom: panel.bottom },
        input: { left: input.left, right: input.right, top: input.top, bottom: input.bottom },
        close: { width: close.width, height: close.height },
        send: { width: send.width, height: send.height },
      };
    });
    assert.equal(geometry.devicePixelRatio, 2);
    assert.ok(geometry.scrollWidth <= geometry.innerWidth, JSON.stringify(geometry));
    assert.ok(geometry.panel.left >= -0.5 && geometry.panel.right <= geometry.innerWidth + 0.5, JSON.stringify(geometry));
    assert.ok(geometry.panel.top >= -0.5 && geometry.panel.bottom <= geometry.innerHeight + 0.5, JSON.stringify(geometry));
    assert.ok(geometry.input.top >= geometry.panel.top && geometry.input.bottom <= geometry.panel.bottom);
    assert.ok(Math.round(geometry.close.width) >= 44 && Math.round(geometry.send.width) >= 44);
    return { physicalReference: "1280x800 at 200%", ...geometry };
  });
  await zoomContext.close();

  const reducedContext = await browser.newContext({ viewport: { width: 1024, height: 768 }, reducedMotion: "reduce" });
  await installDeterministicRoutes(reducedContext, "reduced-motion");
  const reduced = await reducedContext.newPage();
  reduced.setDefaultTimeout(9000);
  instrumentPage(reduced, "reduced-motion");

  await check("accessibility.prefers-reduced-motion-disables-advisor-and-swup-motion", async () => {
    await waitForApp(reduced);
    await openAdvisor(reduced);
    const styles = await reduced.evaluate(() => ({
      panelTransition: getComputedStyle(document.getElementById("yl-advisor-panel")).transitionDuration,
      backdropTransition: getComputedStyle(document.getElementById("yl-advisor-backdrop")).transitionDuration,
      messageAnimation: getComputedStyle(document.querySelector(".yl-msg")).animationName,
      messageAnimationDuration: getComputedStyle(document.querySelector(".yl-msg")).animationDuration,
      swupTransition: getComputedStyle(document.getElementById("swup")).transitionDuration,
      mediaMatches: matchMedia("(prefers-reduced-motion: reduce)").matches,
    }));
    assert.equal(styles.mediaMatches, true);
    assert.equal(allDurationsAreEffectivelyZero(styles.panelTransition), true);
    assert.equal(allDurationsAreEffectivelyZero(styles.backdropTransition), true);
    assert.equal(allDurationsAreEffectivelyZero(styles.messageAnimationDuration), true);
    assert.equal(allDurationsAreEffectivelyZero(styles.swupTransition), true);
    return styles;
  });

  await reducedContext.close();

  await check("safety.no-real-enquiry-or-external-ai", async () => {
    assert.equal(report.safety.realEnquirySubmissions, 0);
    assert.ok(report.diagnostics.advisorRequests.length > 0);
    assert.ok(report.diagnostics.advisorRequests.every((request) => request.method === "POST"));
    return {
      realEnquirySubmissions: 0,
      interceptedAdvisorRequests: report.diagnostics.advisorRequests.length,
    };
  });

  await check("diagnostics.no-console-or-unexpected-request-failures", async () => {
    assert.deepEqual(report.diagnostics.consoleErrors, []);
    assert.deepEqual(report.diagnostics.consoleWarnings, []);
    assert.deepEqual(report.diagnostics.pageErrors, []);
    assert.deepEqual(report.diagnostics.failedRequests, []);
    assert.deepEqual(report.diagnostics.badHttpResponses, []);
    return { consoleErrors: 0, consoleWarnings: 0, pageErrors: 0, failedRequests: 0, badHttpResponses: 0 };
  });
} catch (error) {
  report.checks.push({ id: "harness.unhandled", status: "fail", durationMs: 0, error: shortError(error) });
} finally {
  if (browser) await browser.close();
  if (phpServer) await phpServer.close();
}

const passed = report.checks.filter((item) => item.status === "pass").length;
const failed = report.checks.filter((item) => item.status === "fail").length;
report.finishedAt = new Date().toISOString();
report.totals = { checks: report.checks.length, passed, failed };

console.log(JSON.stringify(report, null, 2));
if (failed > 0) process.exitCode = 1;
