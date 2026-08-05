/**
 * Yee Lim AI Product Advisor
 * Triggered from a button in the page (not a floating bubble).
 * Exposes window.openProductAdvisor() — call it from any button.
 * Sends a bounded conversation history plus the live website language to the
 * deterministic, catalogue-grounded api/advisor.php endpoint.
 */
(function () {
  // The widget lives outside #swup and is deliberately persistent. A duplicate
  // bundle evaluation must reuse that shell rather than stacking another modal
  // and another set of document/window listeners.
  if (document.getElementById("yl-advisor-panel")) return;

  // ─── CSS ──────────────────────────────────────────────────────
  const css = `
    /* Backdrop */
    #yl-advisor-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      z-index: 9990;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity 0.22s cubic-bezier(0.23, 1, 0.32, 1);
    }

    #yl-advisor-backdrop.open {
      opacity: 1;
      visibility: visible;
      pointer-events: all;
    }

    /* Panel — centered on desktop, bottom sheet on mobile */
    #yl-advisor-panel {
      position: fixed;
      z-index: 9991;
      /* 440x600 is the live desktop panel. The min() clamps keep it inside a
         short or narrow window instead of overflowing, which a bare 600px
         height would do below about 630px of viewport height. Mobile gets its
         own sheet sizing in the max-width:520px block below, so this is not one
         fixed height applied everywhere. */
      width: min(440px, calc(100vw - 32px));
      height: min(600px, calc(100dvh - 32px));
      top: 50%;
      left: 50%;
      transform: translate(-50%, calc(-50% + 20px)) scale(0.97);
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      background: #1a1712;
      border-radius: 16px;
      /* clip-path rounds the panel reliably even though it is transform-positioned
         (overflow:hidden + border-radius can fail to clip a transformed element in
         some browsers, which let the white panel bg peek at the header corners). */
      clip-path: inset(0 round 16px);
      box-shadow: 0 28px 70px -16px rgba(8,11,16,0.40), 0 0 0 1px rgba(8,11,16,0.04);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: transform 0.26s cubic-bezier(0.23, 1, 0.32, 1),
                  opacity 0.26s cubic-bezier(0.23, 1, 0.32, 1);
    }

    #yl-advisor-panel.open {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
      visibility: visible;
      pointer-events: all;
    }

    @media (max-width: 520px) {
      /* ADV-001: fit the content on open (greeting + chips), never a huge
         blank middle. Grows with the conversation up to 78dvh, then the
         messages list scrolls. Safe-area padded so the input clears the
         home indicator. */
      #yl-advisor-panel {
        width: 100%;
        height: auto;
        /* Near-full-height chat sheet — leaves just a small peek of the dimmed page
           at the very top (so it still reads as a dismissible sheet). The messages
           area flexes to fill, keeping the input pinned at the bottom. */
        min-height: 93dvh;
        max-height: 95dvh;
        padding-bottom: env(safe-area-inset-bottom, 0px);
        top: auto;
        left: 0;
        bottom: 0;
        right: 0;
        border-radius: 16px 16px 0 0;
        clip-path: inset(0 round 16px 16px 0 0);
        transform: translateY(24px) scale(0.99);
      }
      #yl-advisor-panel.open {
        transform: translateY(0) scale(1);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #yl-advisor-panel, #yl-advisor-backdrop {
        transition: none;
        transform: none;
      }
      #yl-advisor-panel.open { transform: none; }
      .yl-adv-messages { scroll-behavior: auto; }
      .yl-msg, .yl-typing span { animation: none; }
    }

    /* Header */
    .yl-adv-header {
      position: relative;
      background: #1a1712;
      padding: 1.1rem 1.15rem 1.05rem;
      display: flex;
      align-items: center;
      gap: 0.8rem;
      flex-shrink: 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    /* (The red header hairline was removed — the quiet bottom border is enough.) */

    .yl-adv-mark {
      width: 40px;
      height: 40px;
      background: #fbfaf6;
      border-radius: 10px;
      box-shadow: 0 2px 9px -3px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(0, 0, 0, 0.05);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }
    .yl-adv-mark img { width: 27px; height: 27px; object-fit: contain; display: block; }

    .yl-adv-header-text {
      flex: 1;
      min-width: 0;
    }

    .yl-adv-title {
      font-family: 'Space Grotesk', 'Inter', sans-serif;
      font-size: 0.95rem;
      font-weight: 600;
      color: #fff;
      line-height: 1.2;
      letter-spacing: -0.01em;
    }

    .yl-adv-subtitle {
      font-size: 0.72rem;
      color: #8a847a;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin-top: 0.15rem;
    }

    .yl-status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #4ade80;
      flex-shrink: 0;
    }

    .yl-adv-close {
      background: none;
      border: none;
      color: #9a938a;
      cursor: pointer;
      width: 44px;
      height: 44px;
      padding: 0.3rem;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.15s, background 0.15s;
      flex-shrink: 0;
    }

    .yl-adv-close:hover { color: #fff; background: rgba(255,255,255,0.1); }

    /* Messages */
    .yl-adv-messages {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      scroll-behavior: smooth;
      background: #f6f2ea;
    }

    .yl-adv-messages::-webkit-scrollbar { width: 4px; }
    .yl-adv-messages::-webkit-scrollbar-thumb { background: #e6dfd0; border-radius: 2px; }

    .yl-adv-status {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .yl-msg {
      display: flex;
      gap: 0.45rem;
      max-width: 90%;
      align-items: flex-start;
      animation: ylMsgIn 0.22s cubic-bezier(0.23,1,0.32,1) both;
    }

    @keyframes ylMsgIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .yl-msg-user  { align-self: flex-end; }
    .yl-msg-assistant { align-self: flex-start; }

    .yl-msg-avatar {
      width: 26px;
      height: 26px;
      flex-shrink: 0;
      border-radius: 7px;
      background: #fff;
      border: 1px solid #e6dfd0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .yl-msg-avatar img { width: 18px; height: 18px; object-fit: contain; display: block; }
    .yl-msg-body { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }

    .yl-msg-bubble {
      padding: 0.6rem 0.85rem;
      border-radius: 15px;
      font-size: 0.85rem;
      line-height: 1.5;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .yl-msg-user .yl-msg-bubble {
      background: #201e18;
      color: #fff;
      border-bottom-right-radius: 5px;
    }

    /* Clean white bubble with a hairline border, no shadow — the old bulk was the
       heavy border + drop shadow, not the white. */
    .yl-msg-assistant .yl-msg-bubble {
      background: #fff;
      color: #201e18;
      border: 1px solid #efe9dc;
      border-bottom-left-radius: 5px;
    }

    .yl-msg-bubble a { color: #CC2929; text-decoration: underline; text-underline-offset: 2px; font-weight: 600; }
    .yl-msg-bubble a:hover { color: #a82020; }
    .yl-msg-bubble strong { font-weight: 700; }
    .yl-msg-bubble ul { margin: 0.35rem 0 0.2rem; padding-left: 1.1rem; }
    .yl-msg-bubble li { margin-bottom: 0.2rem; }

    /* Typing */
    .yl-typing {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0.65rem 0.9rem;
      background: #fff;
      border: 1px solid #efe9dc;
      border-radius: 15px;
      border-bottom-left-radius: 5px;
    }

    .yl-typing span {
      width: 6px;
      height: 6px;
      background: #9a938a;
      border-radius: 50%;
      display: inline-block;
      animation: ylDot 1.2s infinite;
    }

    .yl-typing span:nth-child(2) { animation-delay: 0.2s; }
    .yl-typing span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes ylDot {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
      30% { transform: translateY(-4px); opacity: 1; }
    }

    /* Suggestions */
    .yl-suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    /* Light pill chips — thin border, no shadow, snug padding, so they read as
       quiet quick-replies instead of chunky buttons. */
    .yl-suggestion {
      background: #fff;
      border: 1px solid #eae3d4;
      border-radius: 999px;
      min-height: 44px;
      padding: 0.33rem 0.75rem;
      font-size: 0.78rem;
      font-weight: 500;
      color: #5c574d;
      cursor: pointer;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      transition: border-color 0.18s cubic-bezier(0.23,1,0.32,1), color 0.18s, background 0.18s, transform 0.12s;
    }

    .yl-suggestion:hover { border-color: #c9bfaa; color: #201e18; background: #f6f2ea; transform: translateY(-1px); }
    .yl-suggestion:active { transform: scale(0.97); }

    /* Input */
    .yl-adv-footer {
      padding: 0.7rem 0.85rem calc(0.7rem + env(safe-area-inset-bottom, 0px));
      border-top: 1px solid #efe9dc;
      background: #fff;
      flex-shrink: 0;
    }

    /* Premium composer (Intercom/Nora-style): one soft rounded pill holding the
       field and a circular send button, generous padding, quiet focus ring. */
    .yl-adv-input-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: #fbfaf6;
      border: 1px solid #e6dfd0;
      border-radius: 16px;
      padding: 0.3rem 0.35rem 0.3rem 0.3rem;
      transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
    }

    .yl-adv-input-row:focus-within {
      border-color: #6a655a;
      box-shadow: 0 0 0 3px rgba(106, 101, 90, 0.22);
      background: #fff;
    }

    .yl-adv-input {
      flex: 1;
      padding: 0.55rem 0.4rem 0.55rem 0.75rem;
      border: none;
      background: transparent;
      /* 16px minimum: below this, iOS zooms the whole page in the moment the
         field is focused (the reported "makes me zoom in when I type"). */
      font-size: 16px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #201e18;
      outline: none;
      min-width: 0;
    }

    .yl-adv-input::placeholder { color: #6a655a; }
    /* No outline of its own on purpose. The row above already shows focus
       (border-color + a 3px ring + white ground) via :focus-within, so an
       outline here stacked a second, brand-red ring inside the first and read
       as a validation error rather than a focused field. */

    /* Circular send button (Nora reference) — brand red when armed, quiet grey
       when empty. */
    .yl-adv-send {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      border-radius: 50%;
      background: #CC2929;
      color: #fff;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, transform 0.12s;
    }

    .yl-adv-send:hover:not(:disabled) { background: #a82020; }
    .yl-adv-send:not(:disabled):active { transform: scale(0.92); }
    .yl-adv-send:disabled { background: #ece6d8; color: #c3bcad; cursor: not-allowed; }

    .yl-adv-note {
      text-align: center;
      font-size: 0.67rem;
      color: #6a655a;
      margin-top: 0.45rem;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .yl-adv-head-actions { display: flex; align-items: center; gap: 0.2rem; }

    /* The enquiry action lives inside the sentence that offers it (see
       renderBubbleText), so there is no standalone action row any more. This
       block now styles only the per-recommendation "include in my enquiry"
       control, which is a different action on a different object. */
    .yl-rec-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    /* Inline enquiry link: brand red, underlined, and it wraps with the prose
       rather than sitting in its own box. No min-height, because forcing one on
       an inline element would break the line box on a narrow screen. */
    /* Matches the live site's in-bubble link exactly: brand red, a plain
       underline at the browser's own thickness, 2px offset, 600 weight. An
       explicit text-decoration-thickness made the rule heavier than live. */
    .yl-adv-inline-link {
      color: #CC2929;
      font-weight: 600;
      text-decoration: underline;
      text-underline-offset: 2px;
      cursor: pointer;
    }
    .yl-adv-inline-link:hover { color: #a82020; }
    /* 2px, matching the rest of the site's focus treatment. A 3px ring around a
       few words of running text reads as an error box rather than focus. */
    .yl-adv-inline-link:focus-visible {
      outline: 2px solid #CC2929;
      outline-offset: 2px;
      border-radius: 3px;
    }

    .yl-adv-inline-button {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.55rem 0.8rem;
      border-radius: 9px;
      border: 1px solid #d9d0c0;
      background: #fff;
      color: #a82020;
      cursor: pointer;
      font: 600 0.78rem/1.25 'Inter', sans-serif;
      text-decoration: none;
      text-align: center;
    }
    .yl-adv-inline-button:hover { border-color: #b7aa94; background: #fbfaf6; }
    .yl-adv-inline-button:disabled { color: #6b665e; background: #eee9df; cursor: default; }

    .yl-recommendations { display: grid; gap: 0.5rem; }
    .yl-recommendation {
      min-width: 0;
      padding: 0.7rem;
      border: 1px solid #e6dfd0;
      border-radius: 11px;
      background: #fffdf8;
    }
    .yl-rec-name {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      color: #201e18;
      font-size: 0.82rem;
      font-weight: 700;
      text-decoration: none;
    }
    .yl-rec-name:hover { color: #a82020; text-decoration: underline; }
    .yl-rec-meta { margin-top: 0.18rem; color: #756f65; font-size: 0.72rem; overflow-wrap: anywhere; }
    .yl-rec-description { margin: 0.38rem 0 0; color: #4f4a43; font-size: 0.75rem; line-height: 1.4; }

    .yl-adv-close:focus-visible,
    .yl-suggestion:focus-visible,
    .yl-adv-inline-button:focus-visible, .yl-rec-name:focus-visible,
    .yl-adv-send:focus-visible {
      outline: 3px solid #CC2929;
      outline-offset: 2px;
    }

    @media (max-width: 360px) {
      .yl-adv-header { padding-inline: 0.7rem; gap: 0.45rem; }
      .yl-adv-messages { padding-inline: 0.7rem; }
      .yl-msg { max-width: 96%; }
    }

    /* This must follow the base animation declarations above. Keeping the
       reduced-motion override last prevents the message entrance and typing
       keyframes from winning through source order. */
    @media (prefers-reduced-motion: reduce) {
      .yl-msg, .yl-typing span { animation: none; }
    }
  `;

  const styleEl = document.createElement("style");
  styleEl.id = "yl-advisor-style";
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  const ADVISOR_STORAGE_KEY = "ylProductAdvisorConversation";
  const ENQUIRY_SUMMARY_KEY = "ylProductAdvisorEnquirySummary";
  const ADVISOR_SCHEMA_VERSION = 1;
  const ADVISOR_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
  const REQUEST_TIMEOUT_MS = 12000;
  const MAX_STORED_MESSAGES = 50;
  const allowedActions = new Set(["enquiry"]);
  const allowedActionLabelKeys = new Set(["advisor.submit_enquiry"]);

  function advisorLanguage() {
    return window.ylLang === "zh" ? "zh" : "en";
  }

  function cbT(key, fallback) {
    if (typeof window.ylT === "function") {
      const translated = window.ylT(key);
      if (translated && translated !== key) return translated;
    }
    return fallback;
  }

  function advisorMessageId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "adv-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function cleanString(value, limit) {
    return typeof value === "string" ? value.slice(0, limit) : "";
  }

  function safeInternalHref(url) {
    const value = typeof url === "string" ? url.trim() : "";
    if (!/^\/(?!\/)/.test(value)) return null;
    try {
      const parsed = new URL(value, window.location.origin);
      return parsed.origin === window.location.origin
        ? parsed.pathname + parsed.search + parsed.hash
        : null;
    } catch (error) {
      return null;
    }
  }

  function knownProductIds() {
    try {
      if (typeof PRODUCTS !== "undefined" && Array.isArray(PRODUCTS) && PRODUCTS.length) {
        return new Set(PRODUCTS.map(function (product) { return String(product.id); }));
      }
    } catch (error) {}
    return null;
  }

  function catalogueProductsById() {
    try {
      if (typeof PRODUCTS !== "undefined" && Array.isArray(PRODUCTS) && PRODUCTS.length) {
        return new Map(PRODUCTS.map(function (product) { return [String(product.id), product]; }));
      }
    } catch (error) {}
    return null;
  }

  function validProductId(value, knownIds) {
    const id = String(value == null ? "" : value);
    if (!/^\d+$/.test(id) || Number(id) < 1) return null;
    return knownIds && !knownIds.has(id) ? null : id;
  }

  function sanitiseList(value) {
    if (!Array.isArray(value)) return [];
    return value
      .filter(function (item) { return typeof item === "string" && item.trim(); })
      .slice(0, 20)
      .map(function (item) { return item.slice(0, 160); });
  }

  function exactProductHref(href, id) {
    try {
      const parsed = new URL(href, window.location.origin);
      const allowedPath = parsed.pathname === "/product-detail" || parsed.pathname === "/product-detail.html";
      const keys = Array.from(parsed.searchParams.keys());
      return parsed.origin === window.location.origin && allowedPath && !parsed.hash
        && keys.length === 1 && keys[0] === "id" && parsed.searchParams.get("id") === String(id);
    } catch (error) {
      return false;
    }
  }

  function exactEnquiryHref(href) {
    try {
      const parsed = new URL(href, window.location.origin);
      return parsed.origin === window.location.origin
        && (parsed.pathname === "/enquiry" || parsed.pathname === "/enquiry.html")
        && !parsed.search && !parsed.hash;
    } catch (error) {
      return false;
    }
  }

  function sameStringList(left, right) {
    const expected = sanitiseList(right);
    return Array.isArray(left) && left.length === expected.length
      && left.every(function (value, index) { return value === expected[index]; });
  }

  function recommendationMatchesProduct(recommendation, product) {
    if (!recommendation || !product || String(product.id) !== String(recommendation.id)) return false;
    return recommendation.name === cleanString(product.name, 180).trim()
      && recommendation.brand === cleanString(product.brand, 120).trim()
      && recommendation.shortDescription === cleanString(product.shortDescription || "", 500)
      && recommendation.usageText === cleanString(product.usage || "", 500)
      && sameStringList(recommendation.surfaces, product.surfaces)
      && sameStringList(recommendation.features, product.features)
      && exactProductHref(recommendation.href, recommendation.id);
  }

  function sanitiseRecommendation(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    // Shape validation is separate from catalogue validation. Keeping the
    // syntactically valid ID here lets the explicit post-load validator detect
    // and clean-reset unknown restored IDs instead of silently hiding evidence
    // that the stored record was inconsistent.
    const id = validProductId(value.id, null);
    const name = cleanString(value.name, 180).trim();
    const brand = cleanString(value.brand, 120).trim();
    const href = safeInternalHref(value.href);
    if (!id || !name || !brand || !href || !exactProductHref(href, id)) return null;
    return {
      id: id,
      name: name,
      brand: brand,
      href: href,
      shortDescription: cleanString(value.shortDescription, 500),
      usageText: cleanString(value.usageText, 500),
      surfaces: sanitiseList(value.surfaces),
      features: sanitiseList(value.features),
    };
  }

  function sanitiseAction(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const type = cleanString(value.type, 40);
    const labelKey = cleanString(value.labelKey, 80);
    const href = safeInternalHref(value.href);
    if (!allowedActions.has(type) || !allowedActionLabelKeys.has(labelKey)) return null;
    if (!href || !exactEnquiryHref(href)) return null;
    return { type: type, labelKey: labelKey, href: href };
  }

  function newAdvisorState() {
    return {
      schemaVersion: ADVISOR_SCHEMA_VERSION,
      updatedAt: Date.now(),
      interfaceLanguage: advisorLanguage(),
      currentStep: "initial",
      messages: [],
      structuredAnswers: {},
      recommendedProductIds: [],
    };
  }

  function normaliseStoredMessage(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if (value.sender !== "user" && value.sender !== "assistant") return null;
    if (typeof value.id !== "string" || !value.id || typeof value.originalText !== "string") return null;
    if (value.originalLanguage !== "en" && value.originalLanguage !== "zh") return null;
    if (value.recommendations != null && !Array.isArray(value.recommendations)) return null;
    const rawRecommendations = Array.isArray(value.recommendations) ? value.recommendations : [];
    const recommendations = rawRecommendations.map(sanitiseRecommendation).filter(Boolean).slice(0, 8);
    if (recommendations.length !== rawRecommendations.length) return null;
    const action = sanitiseAction(value.action);
    if (value.action != null && !action) return null;
    return {
      id: value.id.slice(0, 100),
      sender: value.sender,
      originalText: value.originalText.slice(0, 4000),
      originalLanguage: value.originalLanguage,
      createdAt: Number.isFinite(value.createdAt) ? value.createdAt : Date.now(),
      kind: ["greeting", "message", "error"].includes(value.kind) ? value.kind : "message",
      intent: cleanString(value.intent, 80),
      recommendations: recommendations,
      action: action,
      suggestionKeys: Array.isArray(value.suggestionKeys)
        ? value.suggestionKeys.filter(function (key) { return typeof key === "string" && /^advisor\.prompt_/.test(key); }).slice(0, 3)
        : [],
      retryUserMessageId: cleanString(value.retryUserMessageId, 100),
    };
  }

  function restoreAdvisorState() {
    try {
      const raw = sessionStorage.getItem(ADVISOR_STORAGE_KEY);
      if (!raw) return newAdvisorState();
      const parsed = JSON.parse(raw);
      const now = Date.now();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid state");
      if (parsed.schemaVersion !== ADVISOR_SCHEMA_VERSION) throw new Error("old schema");
      if (!Number.isFinite(parsed.updatedAt) || parsed.updatedAt > now + 300000 || now - parsed.updatedAt > ADVISOR_SESSION_TTL_MS) {
        throw new Error("expired state");
      }
      if (parsed.interfaceLanguage !== "en" && parsed.interfaceLanguage !== "zh") throw new Error("invalid language");
      if (typeof parsed.currentStep !== "string" || !parsed.currentStep) throw new Error("invalid step");
      if (!parsed.structuredAnswers || typeof parsed.structuredAnswers !== "object" || Array.isArray(parsed.structuredAnswers)) {
        throw new Error("invalid answers");
      }
      if (!Array.isArray(parsed.messages) || parsed.messages.length > MAX_STORED_MESSAGES) throw new Error("invalid messages");
      if (!Array.isArray(parsed.recommendedProductIds)) throw new Error("invalid recommendations");
      if (parsed.recommendedProductIds.some(function (id) { return !validProductId(id, null); })) {
        throw new Error("invalid recommendation ID");
      }

      const restoredMessages = parsed.messages.map(normaliseStoredMessage);
      if (restoredMessages.some(function (message) { return !message; })) throw new Error("invalid message");
      const recommendedProductIds = Array.from(new Set(parsed.recommendedProductIds
        .map(function (id) { return validProductId(id, null); })
        .filter(Boolean)));
      return {
        schemaVersion: ADVISOR_SCHEMA_VERSION,
        updatedAt: parsed.updatedAt,
        interfaceLanguage: parsed.interfaceLanguage,
        currentStep: parsed.currentStep.slice(0, 80),
        messages: restoredMessages,
        structuredAnswers: Object.assign({}, parsed.structuredAnswers),
        recommendedProductIds: recommendedProductIds,
      };
    } catch (error) {
      try { sessionStorage.removeItem(ADVISOR_STORAGE_KEY); } catch (storageError) {}
      return newAdvisorState();
    }
  }

  let advisorState = restoreAdvisorState();
  let catalogueValidated = knownProductIds() !== null;

  function persistAdvisorState() {
    advisorState.updatedAt = Date.now();
    advisorState.interfaceLanguage = advisorLanguage();
    advisorState.messages = advisorState.messages.slice(-MAX_STORED_MESSAGES);
    try {
      sessionStorage.setItem(ADVISOR_STORAGE_KEY, JSON.stringify(advisorState));
    } catch (error) {}
  }

  function createMessage(sender, originalText, options) {
    const opts = options || {};
    return {
      id: advisorMessageId(),
      sender: sender,
      originalText: String(originalText),
      originalLanguage: opts.originalLanguage || advisorLanguage(),
      createdAt: Date.now(),
      kind: opts.kind || "message",
      intent: opts.intent || "",
      recommendations: opts.recommendations || [],
      action: opts.action || null,
      suggestionKeys: opts.suggestionKeys || [],
      retryUserMessageId: opts.retryUserMessageId || "",
    };
  }

  /* Seven openers, three shown at random, as the live panel does. They are
     i18n keys rather than the hardcoded English/Chinese arrays this replaced,
     so the language switch reaches them like everything else. */
  const ADVISOR_PROMPT_KEYS = [
    "advisor.prompt_recommend",
    "advisor.prompt_foam_metal",
    "advisor.prompt_waterproof",
    "advisor.prompt_export",
    "advisor.prompt_location",
    "advisor.prompt_custom",
    "advisor.prompt_delivery",
  ];

  function pickStarterPrompts() {
    const pool = ADVISOR_PROMPT_KEYS.slice();
    const picked = [];
    while (picked.length < 3 && pool.length) {
      picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return picked;
  }

  function ensureGreeting() {
    if (advisorState.messages.length) return;
    advisorState.messages.push(createMessage("assistant",
      cbT("advisor.greeting", "Hi, I'm Ava, your Yee Lim product advisor. Tell me what you're bonding and the conditions, and I'll suggest the right adhesive."), {
        kind: "greeting",
        suggestionKeys: pickStarterPrompts(),
      }));
    persistAdvisorState();
  }

  ensureGreeting();
  advisorState.interfaceLanguage = advisorLanguage();
  persistAdvisorState();

  const html = `
    <div id="yl-advisor-backdrop" aria-hidden="true"></div>
    <div id="yl-advisor-panel" role="dialog" aria-modal="true" aria-hidden="true" inert tabindex="-1"
      data-i18n-attr="aria-label:advisor.aria_dialog" aria-label="${cbT("advisor.aria_dialog", "Yee Lim Product Advisor")}">
      <div class="yl-adv-header">
        <div class="yl-adv-mark"><img src="/images/logos/ylai-seal.png" alt=""></div>
        <div class="yl-adv-header-text">
          <div class="yl-adv-title">Ava</div>
          <div class="yl-adv-subtitle" data-i18n="advisor.subtitle">${cbT("advisor.subtitle", "Yee Lim Product Advisor")}</div>
        </div>
        <div class="yl-adv-head-actions">
          <button type="button" class="yl-adv-close" id="ylAdvClose" data-i18n-attr="aria-label:advisor.aria_close" aria-label="${cbT("advisor.aria_close", "Close product advisor")}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="yl-adv-messages" id="ylAdvMessages" role="log" aria-live="polite" aria-relevant="additions text" aria-busy="false"></div>
      <div class="yl-adv-status" id="ylAdvStatus" role="status" aria-live="polite" aria-atomic="true"></div>
      <div class="yl-adv-footer">
        <div class="yl-adv-input-row">
          <input class="yl-adv-input" id="ylAdvInput" type="text"
            data-i18n-attr="aria-label:advisor.aria_input,placeholder:advisor.placeholder"
            aria-label="${cbT("advisor.aria_input", "Ask the product advisor a question")}"
            placeholder="${cbT("advisor.placeholder", "Message…")}"
            maxlength="1000" autocomplete="off" />
          <button type="button" class="yl-adv-send" id="ylAdvSend" data-i18n-attr="aria-label:advisor.aria_send" aria-label="${cbT("advisor.aria_send", "Send message")}" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <!-- The footer stays exactly this tall: input, send, one line of note.
             A duplicate enquiry link and a two-line storage notice used to sit
             below this, which grew the footer and gave the same response two
             competing calls to action. The enquiry CTA now belongs to the
             sentence that offers it (see renderBubbleText); the conversation is
             still persisted, just without a permanent paragraph about it. -->
        <div class="yl-adv-note" data-i18n="advisor.note">${cbT("advisor.note", "Guidance only. Our team confirms suitability.")}</div>
      </div>
    </div>`;

  const container = document.createElement("div");
  container.id = "yl-advisor-root";
  container.innerHTML = html;
  document.body.appendChild(container);

  const backdrop = document.getElementById("yl-advisor-backdrop");
  const panel = document.getElementById("yl-advisor-panel");
  const messages = document.getElementById("ylAdvMessages");
  const advisorStatus = document.getElementById("ylAdvStatus");
  const input = document.getElementById("ylAdvInput");
  const sendBtn = document.getElementById("ylAdvSend");
  const closeBtn = document.getElementById("ylAdvClose");

  let isLoading = false;
  let isComposing = false;
  let requestGeneration = 0;
  let activeController = null;
  let returnFocus = null;
  let previousBodyOverflow = null;
  let releaseFocusTrap = null;

  function appendAvatar(parent) {
    const avatar = document.createElement("div");
    avatar.className = "yl-msg-avatar";
    const logo = document.createElement("img");
    logo.src = "/images/logos/ylai-seal.png";
    logo.alt = "";
    avatar.appendChild(logo);
    parent.appendChild(avatar);
  }

  function beforeInternalNavigation() {
    window.closeProductAdvisor(false);
  }

  function currentBasket() {
    try {
      const basket = typeof window.getBasket === "function"
        ? window.getBasket()
        : JSON.parse(localStorage.getItem("enquiryBasket") || "[]");
      return Array.isArray(basket) ? basket.map(String) : [];
    } catch (error) {
      return [];
    }
  }

  function recommendationsAreIncluded(recommendations) {
    const basket = currentBasket();
    return recommendations.length > 0 && recommendations.every(function (recommendation) {
      return basket.includes(String(recommendation.id));
    });
  }

  function setAttachButtonState(button, included) {
    const key = included ? "advisor.recommendation_included" : "advisor.include_recommendation";
    button.dataset.i18n = key;
    button.textContent = cbT(key, included ? "Included in enquiry" : "Include this recommendation in my enquiry");
    button.disabled = included;
  }

  function buildAdvisorSummary(record) {
    const names = record.recommendations.map(function (recommendation) { return recommendation.name; });
    return [
      cbT("advisor.summary_title", "Product Advisor summary"),
      "",
      cbT("advisor.summary_recommended", "Recommended products:"),
      names.map(function (name) { return "- " + name; }).join("\n"),
    ].join("\n");
  }

  function includeRecommendations(record, button) {
    const recommendedProductIds = record.recommendations.map(function (recommendation) {
      return String(recommendation.id);
    });
    if (!recommendedProductIds.length) return;
    const existing = currentBasket();
    const union = new Set(existing);
    recommendedProductIds.forEach(function (id) { union.add(id); });
    const nextBasket = Array.from(union);
    try {
      if (typeof window.saveBasket === "function") window.saveBasket(nextBasket);
      else {
        localStorage.setItem("enquiryBasket", JSON.stringify(nextBasket));
        window.dispatchEvent(new Event("basketUpdated"));
      }
      sessionStorage.setItem(ENQUIRY_SUMMARY_KEY, JSON.stringify({
        schemaVersion: ADVISOR_SCHEMA_VERSION,
        id: advisorMessageId(),
        updatedAt: Date.now(),
        language: advisorLanguage(),
        productIds: recommendedProductIds,
        productNames: record.recommendations.map(function (recommendation) { return recommendation.name; }),
        summaryText: buildAdvisorSummary(record),
      }));
      setAttachButtonState(button, true);
      if (typeof window.announce === "function") {
        window.announce(cbT("advisor.recommendation_included", "Included in enquiry"));
      }
    } catch (error) {
      if (typeof window.showToast === "function") {
        window.showToast(cbT("advisor.attach_error", "The recommendation could not be added. Please try again."), "error");
      }
    }
  }

  function renderRecommendations(record, body) {
    // A restored numeric ID is not proof that a product exists. Recommendation
    // links and attachment controls stay unavailable until the public catalogue
    // has loaded and every stored ID has been checked against it.
    if (!catalogueValidated || !record.recommendations.length) return;
    const list = document.createElement("div");
    list.className = "yl-recommendations";
    record.recommendations.forEach(function (recommendation) {
      const catalogue = catalogueProductsById();
      const product = catalogue && catalogue.get(String(recommendation.id));
      const card = document.createElement("div");
      card.className = "yl-recommendation";
      const link = document.createElement("a");
      link.className = "yl-rec-name";
      link.href = recommendation.href;
      link.textContent = recommendation.name;
      link.addEventListener("click", beforeInternalNavigation);
      card.appendChild(link);
      const meta = document.createElement("div");
      meta.className = "yl-rec-meta";
      const surfaceNames = recommendation.surfaces.map(function (surface) {
        return typeof window.ylTerm === "function" ? window.ylTerm(surface) : surface;
      });
      meta.textContent = recommendation.brand + (surfaceNames.length
        ? " · " + surfaceNames.join(advisorLanguage() === "zh" ? "、" : ", ")
        : "");
      card.appendChild(meta);
      let descriptionText = recommendation.shortDescription;
      if (advisorLanguage() === "zh") {
        const translated = window.YL_PRODUCT_ZH && window.YL_PRODUCT_ZH[String(recommendation.id)];
        descriptionText = translated && typeof translated.shortDescription === "string"
          ? translated.shortDescription
          : "";
      } else if (product && typeof window.ylPField === "function") {
        descriptionText = window.ylPField(product, "shortDescription");
      }
      if (descriptionText) {
        const description = document.createElement("p");
        description.className = "yl-rec-description";
        description.textContent = descriptionText;
        card.appendChild(description);
      }
      list.appendChild(card);
    });
    body.appendChild(list);

    const actions = document.createElement("div");
    actions.className = "yl-rec-actions";
    const includeButton = document.createElement("button");
    includeButton.type = "button";
    includeButton.className = "yl-adv-inline-button";
    setAttachButtonState(includeButton, recommendationsAreIncluded(record.recommendations));
    includeButton.addEventListener("click", function () { includeRecommendations(record, includeButton); });
    actions.appendChild(includeButton);
    body.appendChild(actions);
  }

  /**
   * The only phrases that may become the enquiry link, longest first so a more
   * specific phrase wins over a substring of itself. Every one of these is
   * wording the Advisor's own approved copy already uses; nothing here is taken
   * from a model. Matching is case-insensitive for English and exact for
   * Chinese, which has no case.
   */
  const ENQUIRY_LINK_PHRASES = [
    "submit an enquiry",
    "a general enquiry",
    "the enquiry form",
    "in an enquiry",
    "提交一般询价",
    "提交询价表单",
    "提交询价",
    "在询价中",
  ];

  /** First approved phrase in the text, or null. Returns the real casing. */
  function findEnquiryPhrase(text) {
    const haystack = text.toLowerCase();
    let best = null;
    ENQUIRY_LINK_PHRASES.forEach(function (phrase) {
      const index = haystack.indexOf(phrase.toLowerCase());
      if (index === -1) return;
      // Prefer the earliest match; on a tie the longer phrase wins, which is
      // what keeps "提交一般询价" from being linked as just "提交询价".
      if (!best || index < best.index || (index === best.index && phrase.length > best.length)) {
        best = { index: index, length: phrase.length };
      }
    });
    return best;
  }

  /**
   * Writes the reply into the bubble, turning the approved enquiry phrase into
   * an inline internal link when the response is allowed to offer one.
   *
   * The link is built from DOM text nodes and one anchor whose href comes from
   * the already-sanitised action, never by interpolating markup. Reply text is
   * only ever inserted as a text node, so a model cannot smuggle an element in
   * here. If the reply does not contain an approved phrase, it is rendered as
   * plain text and no action is offered at all -- a greeting has no business
   * carrying an enquiry CTA.
   */
  function renderBubbleText(bubble, text, action) {
    const safeAction = sanitiseAction(action);
    const match = safeAction ? findEnquiryPhrase(text) : null;
    if (!match) {
      bubble.textContent = text;
      return false;
    }

    const before = text.slice(0, match.index);
    const phrase = text.slice(match.index, match.index + match.length);
    const after = text.slice(match.index + match.length);

    if (before) bubble.appendChild(document.createTextNode(before));
    const link = document.createElement("a");
    link.className = "yl-adv-inline-link";
    link.href = safeAction.href;
    link.textContent = phrase;
    link.addEventListener("click", beforeInternalNavigation);
    bubble.appendChild(link);
    if (after) bubble.appendChild(document.createTextNode(after));
    return true;
  }

  function renderSuggestions(record, body) {
    if (!record.suggestionKeys.length) return;
    const chips = document.createElement("div");
    chips.className = "yl-suggestions";
    record.suggestionKeys.forEach(function (key) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "yl-suggestion";
      button.dataset.i18n = key;
      button.textContent = cbT(key, "Ask Ava");
      button.addEventListener("click", function () {
        const prompt = button.textContent;
        record.suggestionKeys = [];
        persistAdvisorState();
        chips.remove();
        sendMessage(prompt);
      });
      chips.appendChild(button);
    });
    body.appendChild(chips);
  }

  function renderRetry(record, body) {
    if (record.kind !== "error" || !record.retryUserMessageId) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "yl-adv-inline-button";
    button.dataset.i18n = "advisor.retry";
    button.textContent = cbT("advisor.retry", "Retry");
    button.addEventListener("click", function () {
      const original = advisorState.messages.find(function (message) {
        return message.id === record.retryUserMessageId && message.sender === "user";
      });
      if (original) sendMessage(original.originalText, original.id);
    });
    body.appendChild(button);
  }

  function renderMessage(record, scroll) {
    const wrap = document.createElement("div");
    wrap.className = "yl-msg yl-msg-" + record.sender;
    wrap.dataset.messageId = record.id;
    if (record.sender === "assistant") appendAvatar(wrap);
    const body = document.createElement("div");
    body.className = "yl-msg-body";
    const bubble = document.createElement("div");
    bubble.className = "yl-msg-bubble";
    renderBubbleText(bubble, record.originalText, record.action);
    body.appendChild(bubble);
    renderRecommendations(record, body);
    renderSuggestions(record, body);
    renderRetry(record, body);
    wrap.appendChild(body);
    messages.appendChild(wrap);
    if (scroll !== false) messages.scrollTop = messages.scrollHeight;
    return wrap;
  }


  function renderConversation() {
    messages.replaceChildren();
    advisorState.messages.forEach(function (message) { renderMessage(message, false); });
    messages.scrollTop = messages.scrollHeight;
  }

  function validateAdvisorStateAgainstCatalogue() {
    const catalogue = catalogueProductsById();
    if (!catalogue) return false;
    let unknownRecommendation = false;
    advisorState.messages.forEach(function (message) {
      message.recommendations.forEach(function (recommendation) {
        const product = catalogue.get(String(recommendation.id));
        if (!recommendationMatchesProduct(recommendation, product)) unknownRecommendation = true;
      });
    });
    advisorState.recommendedProductIds.forEach(function (id) {
      if (!catalogue.has(String(id))) unknownRecommendation = true;
    });

    catalogueValidated = true;
    if (unknownRecommendation) {
      try { sessionStorage.removeItem(ADVISOR_STORAGE_KEY); } catch (error) {}
      advisorState = newAdvisorState();
      ensureGreeting();
    } else {
      persistAdvisorState();
    }
    renderConversation();
    return true;
  }

  function scheduleCatalogueValidation() {
    if (validateAdvisorStateAgainstCatalogue()) return;
    setTimeout(function () {
      if (validateAdvisorStateAgainstCatalogue()) return;
      if (typeof loadProductsFromBackend !== "function") return;
      Promise.resolve(loadProductsFromBackend())
        .then(validateAdvisorStateAgainstCatalogue)
        .catch(function () {
          // Fail closed: messages remain available, but recommendation controls
          // are not rendered without a catalogue against which to verify IDs.
        });
    }, 150);
  }

  function showTyping(generation) {
    const loadingText = cbT("advisor.loading", "Ava is checking the catalogue");
    const wrap = document.createElement("div");
    wrap.className = "yl-msg yl-msg-assistant";
    wrap.id = "ylAdvTyping-" + generation;
    // The transcript is aria-busy while this visual indicator exists, so a
    // nested live status could be suppressed and then removed before AT hears
    // it. Announce through the persistent status region beside the log instead.
    wrap.setAttribute("aria-hidden", "true");
    appendAvatar(wrap);
    const typing = document.createElement("div");
    typing.className = "yl-typing";
    typing.setAttribute("aria-hidden", "true");
    for (let index = 0; index < 3; index += 1) typing.appendChild(document.createElement("span"));
    wrap.appendChild(typing);
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
    advisorStatus.textContent = loadingText;
  }

  function hideTyping(generation) {
    const typing = document.getElementById("ylAdvTyping-" + generation);
    if (typing) typing.remove();
    advisorStatus.textContent = "";
  }

  function removeRetryError(userMessageId) {
    advisorState.messages = advisorState.messages.filter(function (message) {
      return !(message.kind === "error" && message.retryUserMessageId === userMessageId);
    });
  }

  function requestHistory() {
    return advisorState.messages
      .filter(function (message) { return message.kind === "message" && (message.sender === "user" || message.sender === "assistant"); })
      .slice(-12)
      .map(function (message) {
        return { role: message.sender, content: message.originalText.slice(0, 1000) };
      });
  }

  function translatedFailureKey(error, timedOut) {
    if (timedOut) return "advisor.timeout";
    if (error && error.status === 429) return "advisor.rate_limited";
    if (error && error.code === "invalid_response") return "advisor.invalid_response";
    return "advisor.error";
  }

  function failureFallback(key) {
    const copy = {
      "advisor.timeout": "Ava took too long to respond. Please retry or submit an enquiry.",
      "advisor.rate_limited": "There are too many requests right now. Please wait a moment and retry.",
      "advisor.invalid_response": "Ava returned an unexpected response. Please retry or submit an enquiry.",
      "advisor.error": "Sorry, I can't connect right now. Please retry or submit an enquiry directly.",
    };
    return copy[key] || copy["advisor.error"];
  }

  async function sendMessage(text, retryUserMessageId) {
    const content = String(text == null ? "" : text).trim();
    if (!content || isLoading) return;

    let userMessage;
    if (retryUserMessageId) {
      userMessage = advisorState.messages.find(function (message) {
        return message.id === retryUserMessageId && message.sender === "user";
      });
      if (!userMessage) return;
      removeRetryError(retryUserMessageId);
      renderConversation();
    } else {
      userMessage = createMessage("user", content, { originalLanguage: advisorLanguage() });
      advisorState.messages.push(userMessage);
      document.querySelectorAll(".yl-suggestions").forEach(function (element) { element.remove(); });
      renderMessage(userMessage);
    }

    input.value = "";
    isLoading = true;
    sendBtn.disabled = true;
    messages.setAttribute("aria-busy", "true");
    advisorState.interfaceLanguage = advisorLanguage();
    persistAdvisorState();

    const thisRequest = ++requestGeneration;
    const requestLanguage = advisorLanguage();
    const controller = new AbortController();
    activeController = controller;
    let timedOut = false;
    const timeoutId = setTimeout(function () { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT_MS);
    showTyping(thisRequest);

    try {
      const apiRoot = typeof API_BASE_URL !== "undefined" ? API_BASE_URL : "";
      const response = await fetch(apiRoot + "/api/advisor.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          language: requestLanguage,
          messages: requestHistory(),
        }),
      });
      let data;
      try { data = await response.json(); }
      catch (error) { const invalid = new Error("invalid response"); invalid.code = "invalid_response"; throw invalid; }
      if (!response.ok) { const failed = new Error("request failed"); failed.status = response.status; throw failed; }
      if (thisRequest !== requestGeneration) return;
      if (!data || typeof data !== "object" || typeof data.message !== "string" || !data.message.trim()
          || typeof data.intent !== "string" || data.language !== requestLanguage
          || advisorLanguage() !== requestLanguage
          || !Array.isArray(data.recommendations)) {
        const invalid = new Error("invalid response");
        invalid.code = "invalid_response";
        throw invalid;
      }

      const recommendations = data.recommendations.map(sanitiseRecommendation).filter(Boolean).slice(0, 8);
      const responseCatalogue = catalogueProductsById();
      if (recommendations.length !== data.recommendations.length
          || (responseCatalogue && recommendations.some(function (recommendation) {
            return !recommendationMatchesProduct(
              recommendation,
              responseCatalogue.get(String(recommendation.id))
            );
          }))) {
        const invalid = new Error("invalid response");
        invalid.code = "invalid_response";
        throw invalid;
      }
      const action = sanitiseAction(data.action);
      if (!action) {
        const invalid = new Error("invalid response");
        invalid.code = "invalid_response";
        throw invalid;
      }
      const assistantMessage = createMessage("assistant", data.message, {
        originalLanguage: data.language,
        intent: data.intent,
        recommendations: recommendations,
        action: action,
      });
      hideTyping(thisRequest);
      advisorState.messages.push(assistantMessage);
      advisorState.currentStep = data.intent.slice(0, 80);
      advisorState.structuredAnswers.lastIntent = data.intent.slice(0, 80);
      advisorState.recommendedProductIds = Array.from(new Set(advisorState.recommendedProductIds.concat(
        recommendations.map(function (recommendation) { return recommendation.id; })
      )));
      persistAdvisorState();
      renderMessage(assistantMessage);
    } catch (error) {
      if (thisRequest !== requestGeneration) return;
      hideTyping(thisRequest);
      const key = translatedFailureKey(error, timedOut);
      const failure = createMessage("assistant", cbT(key, failureFallback(key)), {
        kind: "error",
        action: { type: "enquiry", labelKey: "advisor.submit_enquiry", href: "/enquiry" },
        retryUserMessageId: userMessage.id,
      });
      advisorState.messages.push(failure);
      persistAdvisorState();
      renderMessage(failure);
      if (!input.value) input.value = userMessage.originalText;
    } finally {
      clearTimeout(timeoutId);
      if (thisRequest === requestGeneration) {
        activeController = null;
        isLoading = false;
        messages.setAttribute("aria-busy", "false");
        advisorStatus.textContent = "";
        sendBtn.disabled = !input.value.trim();
        if (panel.classList.contains("open")) input.focus();
      }
    }
  }

  function activateFocusTrap() {
    const selector = 'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])';
    function focusableElements() {
      return Array.from(panel.querySelectorAll(selector)).filter(function (element) {
        if (element.hasAttribute("inert") || element.getAttribute("aria-hidden") === "true") {
          return false;
        }
        // A control that is not rendered cannot take focus. Without this the
        // trap counts it anyway and Tab lands nowhere, so the wrap silently
        // stops working -- which is what happened once "Start over" and the
        // footer links became conditional on a conversation existing.
        // getClientRects() also covers display:none and a hidden ancestor.
        return !element.hidden && element.getClientRects().length > 0;
      });
    }
    function onKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        window.closeProductAdvisor();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = focusableElements();
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeydown, true);
    input.focus();
    return function () { document.removeEventListener("keydown", onKeydown, true); };
  }

  function closeCompetingLayersForAdvisor() {
    if (document.body.classList.contains("filter-drawer-open")
        && typeof window.closeFilterDrawer === "function") {
      window.closeFilterDrawer(false);
    }
    if ((document.body.classList.contains("cmp-sheet-open")
        || document.getElementById("ylCmpPicker")
        || document.getElementById("cmpSheetBackdrop"))
        && typeof window.ylCleanupCompareOverlays === "function") {
      window.ylCleanupCompareOverlays();
    }
    const drawer = document.getElementById("_navDrawer");
    const hamburger = document.getElementById("_navHamburger");
    if (drawer && drawer.classList.contains("open") && hamburger) hamburger.click();
  }

  window.openProductAdvisor = function () {
    if (panel.classList.contains("open")) { input.focus(); return; }
    const requestedReturnFocus = document.activeElement;
    closeCompetingLayersForAdvisor();
    returnFocus = requestedReturnFocus;
    previousBodyOverflow = document.body.style.overflow;
    backdrop.classList.add("open");
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    panel.removeAttribute("inert");
    panel.inert = false;
    document.body.classList.add("advisor-open");
    document.body.style.overflow = "hidden";
    releaseFocusTrap = activateFocusTrap();
  };

  window.closeProductAdvisor = function (restoreFocus) {
    if (!panel.classList.contains("open")) return;
    backdrop.classList.remove("open");
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("inert", "");
    panel.inert = true;
    document.body.classList.remove("advisor-open");
    ylAdvResetKbStyles();
    document.body.style.overflow = previousBodyOverflow == null ? "" : previousBodyOverflow;
    previousBodyOverflow = null;
    if (releaseFocusTrap) { releaseFocusTrap(); releaseFocusTrap = null; }
    if (restoreFocus !== false && returnFocus && typeof returnFocus.focus === "function") {
      try { returnFocus.focus(); } catch (error) {}
    }
    returnFocus = null;
  };


  function ylAdvResetKbStyles() {
    panel.style.top = "";
    panel.style.bottom = "";
    panel.style.height = "";
    panel.style.minHeight = "";
    panel.style.maxHeight = "";
  }

  function ylAdvKeyboardSync() {
    const viewport = window.visualViewport;
    const mobile = window.matchMedia("(max-width: 520px)").matches;
    if (!viewport || !mobile || !panel.classList.contains("open")) { ylAdvResetKbStyles(); return; }
    const keyboardHeight = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
    if (keyboardHeight <= 80) { ylAdvResetKbStyles(); return; }
    panel.style.top = viewport.offsetTop + "px";
    panel.style.bottom = "auto";
    panel.style.height = viewport.height + "px";
    panel.style.minHeight = "0";
    panel.style.maxHeight = "none";
  }

  window.ylAdvisorBeforeNavigation = function () {
    if (!isLoading) return;
    const pendingUser = advisorState.messages.slice().reverse().find(function (message) {
      return message.sender === "user" && message.kind === "message";
    });
    requestGeneration += 1;
    if (activeController) activeController.abort();
    activeController = null;
    isLoading = false;
    messages.setAttribute("aria-busy", "false");
    advisorStatus.textContent = "";
    messages.querySelectorAll('[id^="ylAdvTyping-"]').forEach(function (element) { element.remove(); });
    if (pendingUser && !input.value) input.value = pendingUser.originalText;
    sendBtn.disabled = !input.value.trim();
  };

  window.ylAdvisorLanguageChanged = function () {
    advisorState.interfaceLanguage = advisorLanguage();
    persistAdvisorState();
    if (typeof window.ylApplyI18n === "function") window.ylApplyI18n(panel);
  };

  input.addEventListener("input", function () {
    sendBtn.disabled = !input.value.trim() || isLoading;
  });
  input.addEventListener("compositionstart", function () { isComposing = true; });
  input.addEventListener("compositionend", function () { isComposing = false; });
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey && !isComposing && !event.isComposing && event.keyCode !== 229) {
      event.preventDefault();
      sendMessage(input.value);
    }
  });
  sendBtn.addEventListener("click", function () { sendMessage(input.value); });
  closeBtn.addEventListener("click", function () { window.closeProductAdvisor(); });
  backdrop.addEventListener("click", function () { window.closeProductAdvisor(); });
  window.addEventListener("basketUpdated", function () {
    document.querySelectorAll(".yl-rec-actions .yl-adv-inline-button").forEach(function (button) {
      const message = button.closest(".yl-msg");
      const record = message && advisorState.messages.find(function (item) { return item.id === message.dataset.messageId; });
      if (record) setAttachButtonState(button, recommendationsAreIncluded(record.recommendations));
    });
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", ylAdvKeyboardSync);
    window.visualViewport.addEventListener("scroll", ylAdvKeyboardSync);
  }

  renderConversation();
  if (typeof window.ylApplyI18n === "function") window.ylApplyI18n(panel);
  scheduleCatalogueValidation();

})();
