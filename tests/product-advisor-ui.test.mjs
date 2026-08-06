import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readFrontend = (relativePath) =>
  readFileSync(new URL(`../frontend/${relativePath}`, import.meta.url), "utf8");

const chatbotRaw = readFrontend("js/widgets/chatbot.js");
const i18nRaw = readFrontend("js/i18n.js");
const enquiryRaw = readFrontend("js/pages/enquiry.js");
const transitionsRaw = readFrontend("js/widgets/page-transitions.js");
const homeHtml = readFrontend("index.html");
const aboutHtml = readFrontend("about.html");

// Source-contract tests are used here because the Advisor is currently a tightly
// coupled browser IIFE rather than an importable module. Comments are removed so
// a TODO or design note cannot accidentally satisfy a behavioural contract.
function withoutComments(source) {
  let output = "";
  let state = "code";
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (state === "line-comment") {
      if (character === "\n" || character === "\r") {
        output += character;
        state = "code";
      }
      continue;
    }
    if (state === "block-comment") {
      if (character === "*" && next === "/") {
        output += " ";
        index += 1;
        state = "code";
      } else if (character === "\n" || character === "\r") {
        output += character;
      }
      continue;
    }
    if (state === "single" || state === "double" || state === "template") {
      output += character;
      if (character === "\\") {
        output += next ?? "";
        index += 1;
      } else if (
        (state === "single" && character === "'") ||
        (state === "double" && character === '"') ||
        (state === "template" && character === "`")
      ) {
        state = "code";
      }
      continue;
    }

    if (character === "/" && next === "/") {
      state = "line-comment";
      index += 1;
    } else if (character === "/" && next === "*") {
      state = "block-comment";
      index += 1;
    } else {
      output += character;
      if (character === "'") state = "single";
      else if (character === '"') state = "double";
      else if (character === "`") state = "template";
    }
  }
  return output;
}

const chatbot = withoutComments(chatbotRaw);
const enquiry = withoutComments(enquiryRaw);
const transitions = withoutComments(transitionsRaw);

function assertContainsAll(source, expectations, context) {
  const missing = expectations.filter((expectation) => !expectation.pattern.test(source));
  assert.deepEqual(
    missing.map((expectation) => expectation.label),
    [],
    `${context}: missing ${missing.map((expectation) => expectation.label).join(", ")}`,
  );
}

test("the active conversation is a bounded, versioned same-tab session", () => {
  assertContainsAll(chatbot, [
    { label: "sessionStorage read", pattern: /sessionStorage\.getItem\s*\(/ },
    { label: "sessionStorage write", pattern: /sessionStorage\.setItem\s*\(/ },
    { label: "schema version", pattern: /schemaVersion|schema_version/ },
    { label: "updated timestamp", pattern: /updatedAt|updated_at/ },
    { label: "interface language", pattern: /interfaceLanguage|interface_language/ },
    { label: "current step", pattern: /currentStep|current_step/ },
    { label: "structured answers", pattern: /structuredAnswers|structured_answers/ },
    { label: "recommended product IDs", pattern: /recommendedProductIds|recommended_product_ids/ },
    { label: "message ID", pattern: /messageId|message_id|\bid\s*:/ },
    { label: "original message text", pattern: /originalText|original_text/ },
    { label: "original message language", pattern: /originalLanguage|original_language/ },
  ], "persisted Advisor state");

  assert.doesNotMatch(chatbot, /localStorage\.(?:setItem|getItem)\s*\([^)]*(?:conversation|advisor)/i,
    "anonymous Advisor conversations must end with the browser-tab session");
});

test("restoration validates corrupt, stale, or incompatible session data", () => {
  assertContainsAll(chatbot, [
    { label: "JSON parse guard", pattern: /JSON\.parse\s*\(/ },
    { label: "schema compatibility check", pattern: /schemaVersion|schema_version/ },
    { label: "expiry check", pattern: /updatedAt|updated_at/ },
    { label: "clean recovery", pattern: /sessionStorage\.removeItem\s*\(/ },
    { label: "restored product ID validation", pattern: /recommendedProductIds|recommended_product_ids/ },
  ], "session restoration");
});

// The visible "Start over" control was removed: the panel chrome is now just
// the title and the close button, and a new job is simply a new message. The
// guarantee that outlived it -- the Advisor may drop its OWN session key but
// must never wipe unrelated browser storage -- still holds and is what this
// asserts. Behavioural cover for "a different job continues without clearing
// anything" lives in product-advisor-browser-qa.mjs.
test("the Advisor clears only its own session state, never unrelated storage", () => {
  assert.match(chatbot, /sessionStorage\.removeItem\s*\(\s*ADVISOR_STORAGE_KEY\s*\)/,
    "the Advisor must drop its own session key by name");
  assert.doesNotMatch(chatbot, /(?:sessionStorage|localStorage)\.clear\s*\(/,
    "the Advisor must not erase unrelated browser storage");
  assert.doesNotMatch(chatbot, /localStorage\.removeItem\s*\(\s*["']enquiryBasket["']\s*\)/,
    "the Advisor must not clear products the visitor attached to an enquiry");
});

test("the panel carries no reset control or duplicate enquiry link", () => {
  // Both were regressions against the reference design: a permanent "Start over"
  // in the header, and a second enquiry link plus a storage paragraph under the
  // input. The enquiry CTA belongs to the message that offered it.
  assert.doesNotMatch(chatbot, /id="ylAdvReset"/,
    "no Start over control may be rendered");
  assert.doesNotMatch(chatbot, /id="ylAdvFooterLinks"|id="ylAdvEnquiryLink"/,
    "no permanent enquiry link may sit below the input");
  assert.doesNotMatch(chatbot, /yl-adv-privacy/,
    "the storage notice must not occupy permanent space in the panel");

  // The footer is exactly the input row plus the one-line guidance note.
  const footer = /<div class="yl-adv-footer">[\s\S]*?\n      <\/div>/.exec(chatbot);
  assert.ok(footer, "the footer block must exist");
  assert.match(footer[0], /yl-adv-input-row/, "the footer keeps the message input");
  assert.match(footer[0], /advisor\.note/, "the footer keeps the guidance note");
  assert.doesNotMatch(footer[0], /advisor\.submit_enquiry/,
    "the footer must not carry its own enquiry CTA");
});

test("language switching preserves the transcript and sends the live language", () => {
  assert.match(chatbot, /const requestLanguage\s*=\s*advisorLanguage\(\)/,
    "every Advisor request must capture the currently selected website language");
  assert.match(chatbot, /\blanguage\s*:\s*requestLanguage\b/,
    "every Advisor request must identify its captured website language");
  assert.match(chatbot, /\bmessages\s*:/,
    "the request must retain conversation context");

  const languageHandler = /window\.ylAdvisorLanguageChanged\s*=\s*function[\s\S]*?\n\s*\};/.exec(chatbot)?.[0] ?? "";
  assert.ok(languageHandler, "the persistent widget needs a language-change hook");
  assert.doesNotMatch(languageHandler, /replaceChildren\s*\(|textContent\s*=\s*["']{2}|innerHTML\s*=\s*["']{2}/,
    "switching language must not delete or regenerate earlier messages");
  assert.match(languageHandler, /interfaceLanguage|interface_language|persist|save/i,
    "the new interface language must be recorded without changing structured context");
});

test("translated Advisor chrome covers handoff, progress, and failures", () => {
  // "Start over" and the storage notice are no longer part of the panel, so
  // their keys are gone from the dictionary too rather than lingering unused.
  // Everything the panel still renders must remain bilingual.
  const requiredCopy = [
    ["Submit an enquiry", "提交询价"],
    // The attach control is a toggle now, so both of its labels must be
    // bilingual: the wording is what communicates the state, not the colour.
    ["Add to enquiry", "加入询价"],
    ["Added to enquiry", "已加入询价"],
    ["Guidance only. Our team confirms suitability.", "仅供参考，具体适用性以我们团队确认为准。"],
    ["Retry", "重试"],
  ];

  for (const [english, chinese] of requiredCopy) {
    assert.ok(i18nRaw.includes(english) && i18nRaw.includes(chinese),
      `Advisor dictionary must provide both languages for: ${english}`);
  }
  assert.match(i18nRaw, /advisor\.[a-z0-9_]*(?:loading|sending|thinking)[a-z0-9_]*["']?\s*:/i,
    "loading status must be translated");
  assert.match(i18nRaw, /advisor\.[a-z0-9_]*timeout[a-z0-9_]*["']?\s*:/i,
    "timeout errors must be translated");
});

test("structured API actions are allowlisted and rendered as safe internal links", () => {
  assert.match(chatbot, /\.action\b|\[\s*["']action["']\s*\]/,
    "the frontend must consume the API's structured action rather than backend HTML");
  assert.match(chatbot, /(?:allowed|allowlist|supported)[A-Za-z]*(?:Action|Actions)|new Set\s*\([^)]*(?:enquiry|product)/i,
    "only known action types may create interactive controls");
  assert.match(chatbot, /\/\^\\\/\(\?!\\\/\)\/|startsWith\s*\(["']\/["']\)[\s\S]{0,120}!\s*\w+\.startsWith\s*\(["']\/\/["']\)/,
    "action hrefs must be root-relative and reject protocol-relative // links");
  assert.doesNotMatch(chatbot, /innerHTML\s*=\s*(?:data|action|reply|message)\b/i,
    "API-provided text or actions must not be assigned directly to innerHTML");
});

test("requests can time out and stale responses cannot mutate the conversation", () => {
  assertContainsAll(chatbot, [
    { label: "AbortController", pattern: /new AbortController\s*\(/ },
    { label: "fetch signal", pattern: /\bsignal\s*:/ },
    { label: "timeout abort", pattern: /setTimeout\s*\([\s\S]{0,180}\.abort\s*\(/ },
    { label: "timer cleanup", pattern: /clearTimeout\s*\(/ },
    { label: "translated timeout path", pattern: /advisor\.[a-z0-9_]*timeout/i },
    { label: "request generation token", pattern: /request(?:Id|ID|Generation|Token)|responseGeneration/i },
  ], "request lifecycle");
  assert.match(chatbot, /(?:request(?:Id|ID|Generation|Token)|responseGeneration)[\s\S]{0,160}(?:!==|!=|===|==)/i,
    "a response must be compared with the current request generation before rendering");
});

test("IME composition and rapid duplicate submissions are guarded", () => {
  assert.match(chatbot, /(?:isComposing|compositionstart|compositionend)/,
    "Enter during Chinese IME composition must not submit a partial message");
  assert.match(chatbot, /if\s*\([^)]*(?:isLoading|pending|submitting)[^)]*\)\s*return/,
    "a second submission must be ignored while one is pending");
  assert.match(chatbot, /sendBtn\.disabled\s*=\s*true/,
    "the send control must visibly disable while submitting");
});

test("the closed modal is inert and the live transcript has accessible semantics", () => {
  assertContainsAll(chatbotRaw, [
    { label: "dialog role", pattern: /role=["']dialog["']/ },
    { label: "modal semantics", pattern: /aria-modal=["']true["']/ },
    { label: "translated accessible name", pattern: /advisor\.(?:aria_dialog|dialog_label|title)/ },
    { label: "message log", pattern: /role=["']log["']/ },
    { label: "live updates", pattern: /aria-live=["'](?:polite|assertive)["']/ },
    { label: "closed aria-hidden state", pattern: /aria-hidden=["']true["']|setAttribute\s*\(["']aria-hidden["']/ },
    { label: "closed inert state", pattern: /\binert\b/ },
    { label: "announced loading status", pattern: /role=["']status["']|aria-busy/ },
  ], "Advisor accessibility");
});

test("open and close preserve the exact opener and prior scroll-lock state", () => {
  assert.match(chatbot, /document\.activeElement/,
    "opening must remember the exact triggering control");
  assert.match(chatbot, /(?:opener|trigger|returnFocus)[\s\S]{0,100}\.focus\s*\(/i,
    "closing must return focus to that exact control");
  assert.match(chatbot, /(?:previous|prior|original)[A-Za-z]*(?:Overflow|Scroll|Body)/i,
    "the widget must remember rather than overwrite a pre-existing scroll lock");
  assert.match(chatbot, /onEscape\s*:\s*window\.closeProductAdvisor|(?:key|code)\s*===?\s*["']Escape["']/,
    "Escape must close the dialog");
});

test("recommendations attach to Enquiry only after an explicit deduplicating action", () => {
  assert.match(chatbot, /enquiryBasket/,
    "the explicit include action must use the existing Enquiry basket");
  assert.match(chatbot, /(?:new Set\s*\(|\.includes\s*\()[\s\S]{0,180}(?:recommendedProductIds|recommendations)/,
    "recommended IDs must be unioned without duplicates");
  assert.match(chatbot, /advisor\.(?:include_recommendation|includeRecommendation)/,
    "automatic attachment is forbidden; a translated explicit action is required");
  assert.match(chatbot, /sessionStorage\.setItem\s*\([^)]*(?:summary|enquiry)/i,
    "the handoff must store a concise editable summary, not submit the transcript");
});

test("Enquiry consumes the pending summary once without replacing customer text", () => {
  assert.match(enquiry, /sessionStorage\.getItem\s*\([^)]*(?:summary|enquiry)/i,
    "the Enquiry page must consume the explicit Advisor handoff");
  assert.match(enquiry, /eMessage[\s\S]{0,280}(?:\+=|\.value\s*=\s*[^;]*\.value|existing)/i,
    "the editable summary must be appended while preserving existing message text");
  assert.match(enquiry, /dispatchEvent\s*\(\s*new Event\s*\(["']input["']/,
    "inserting the summary must update the existing character counter");

  const removal = enquiry.search(/sessionStorage\.removeItem\s*\([^)]*(?:summary|enquiry)/i);
  const successfulResponse = enquiry.search(/if\s*\(\s*!\s*res\.ok\s*\)/);
  assert.ok(removal > successfulResponse && successfulResponse >= 0,
    "the pending summary must remain recoverable until the enquiry succeeds");
});

test("the Advisor is a single persistent shell instance across Swup visits", () => {
  assert.match(chatbot, /getElementById\s*\(["']yl-advisor-panel["']\)[\s\S]{0,120}(?:return|remove|reuse)/i,
    "loading the bundle twice must not create a second Advisor instance");
  assert.match(transitions, /content:replace/,
    "Swup replacement must run the shared page lifecycle");
  assert.doesNotMatch(transitions, /document\.querySelector\s*\(["']#yl-advisor-panel["']\)\.remove\s*\(/,
    "the persistent conversation shell must remain outside Swup replacement");
});

test("Swup synchronises each destination's local stylesheet before revealing it", () => {
  assertContainsAll(transitions, [
    { label: "incoming document fetch", pattern: /fetch\s*\(/ },
    { label: "incoming HTML parser", pattern: /DOMParser/ },
    { label: "stylesheet discovery", pattern: /link\s*\[\s*rel\s*=\s*["']stylesheet["']\s*\]|link\[rel=["']stylesheet["']\]/ },
    { label: "same-origin check", pattern: /\.origin\s*===?\s*(?:window\.)?location\.origin|sameOrigin/i },
    { label: "stylesheet load wait", pattern: /(?:addEventListener|\.onload)\s*\(?.{0,20}["']load["']|new Promise/ },
    { label: "stale local stylesheet removal", pattern: /\.remove\s*\(\)/ },
  ], "Swup stylesheet lifecycle");
  assert.match(transitions, /(?:visit:start|content:replace)[\s\S]{0,500}(?:sync|style)/i,
    "stylesheet synchronisation must be wired into navigation, not left unused");
});

test("Home and About cold entries load the complete Swup application bundle", () => {
  const requiredScripts = [
    "/js/i18n-products.js",
    "/js/data.js",
    "/js/widgets/compare.js",
    "/js/widgets/custom-select.js",
    "/js/pages/products.js",
    "/js/pages/product-detail.js",
    "/js/pages/compare-page.js",
    "/js/pages/enquiry.js",
    "/js/pages/contact.js",
    "/js/widgets/chatbot.js",
    "/js/widgets/page-transitions.js",
  ];

  for (const [page, html] of [["index.html", homeHtml], ["about.html", aboutHtml]]) {
    const missing = requiredScripts.filter((script) => !html.includes(script));
    assert.deepEqual(missing, [],
      `${page} cannot cold-enter all Swup routes; missing ${missing.join(", ")}`);
  }
});

test("the enquiry attach control is a toggle, not a one-way disabled button", () => {
  // It used to set button.disabled once the products were attached, which left
  // no way to take them back out from the Advisor.
  const state = /function setAttachButtonState\([\s\S]*?\n  \}/.exec(chatbot);
  assert.ok(state, "setAttachButtonState must exist");
  assert.match(state[0], /aria-pressed/, "the state must be exposed via aria-pressed");
  assert.doesNotMatch(state[0], /button\.disabled\s*=\s*included/,
    "the control must not disable itself when selected");
  assert.match(chatbot, /function removeRecommendations\(/,
    "there must be a path back out of the enquiry");
  assert.match(chatbot, /function toggleRecommendations\(/,
    "the click handler must toggle");
  assert.match(chatbot, /toggleRecommendations\(record, includeButton\)/,
    "the button must be wired to the toggle, not to include only");
});

test("removing a recommendation subtracts from the one basket, it does not replace it", () => {
  const remove = /function removeRecommendations\([\s\S]*?\n  \}\n\n/.exec(chatbot);
  assert.ok(remove, "removeRecommendations must exist");
  // Filtering the existing basket is what keeps manually chosen products safe.
  assert.match(remove[0], /currentBasket\(\)\.filter\(/,
    "removal must filter the existing basket, never overwrite it");
  assert.match(remove[0], /saveBasket/, "it must go through the shared basket writer");
  assert.doesNotMatch(remove[0], /localStorage\.setItem\("enquiryBasket", JSON\.stringify\(ids/,
    "it must not write its own competing basket");
});
