/**
 * Yee Lim AI Product Advisor
 * Triggered from a button in the page (not a floating bubble).
 * Exposes window.openProductAdvisor() — call it from any button.
 * Sends the chat history to api/advisor.php, which grounds the answer in the
 * live catalogue and (optionally) forwards it to a hosted LLM. Falls back to a
 * free rule-based matcher server-side when no LLM is configured.
 */
(function () {

  // ─── CSS ──────────────────────────────────────────────────────
  const css = `
    /* Backdrop */
    #yl-advisor-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      z-index: 9990;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.22s cubic-bezier(0.23, 1, 0.32, 1);
    }

    #yl-advisor-backdrop.open {
      opacity: 1;
      pointer-events: all;
    }

    /* Panel — centered on desktop, bottom sheet on mobile */
    #yl-advisor-panel {
      position: fixed;
      z-index: 9991;
      width: 440px;
      height: 600px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, calc(-50% + 20px)) scale(0.97);
      opacity: 0;
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
        min-height: 320px;
        max-height: 78dvh;
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
    /* Brand-red hairline that fades out — ties the advisor to the Yee Lim identity. */
    .yl-adv-header::after {
      content: "";
      position: absolute;
      left: 0; right: 0; bottom: -1px;
      height: 2px;
      background: linear-gradient(90deg, #CC2929 0%, rgba(204,41,41,0.32) 42%, transparent 74%);
    }

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
      padding: 0.7rem 0.95rem;
      border-radius: 12px;
      font-size: 0.875rem;
      line-height: 1.6;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .yl-msg-user .yl-msg-bubble {
      background: #201e18;
      color: #fff;
      border-bottom-right-radius: 4px;
    }

    .yl-msg-assistant .yl-msg-bubble {
      background: #fff;
      border: 1px solid #e6dfd0;
      color: #201e18;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
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
      padding: 0.7rem 0.95rem;
      background: #fff;
      border: 1px solid #e6dfd0;
      border-radius: 12px;
      border-bottom-left-radius: 4px;
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

    .yl-suggestion {
      background: #fff;
      border: 1px solid #e6dfd0;
      border-radius: 8px;
      padding: 0.4rem 0.8rem;
      font-size: 0.79rem;
      font-weight: 500;
      color: #47433b;
      cursor: pointer;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      transition: border-color 0.18s cubic-bezier(0.23,1,0.32,1), color 0.18s, background 0.18s, transform 0.12s;
    }

    .yl-suggestion:hover { border-color: #c9bfaa; color: #201e18; background: #f6f2ea; transform: translateY(-1px); }
    .yl-suggestion:active { transform: scale(0.97); }

    /* Input */
    .yl-adv-footer {
      padding: 0.75rem;
      border-top: 1px solid #e6dfd0;
      background: #fff;
      flex-shrink: 0;
    }

    .yl-adv-input-row {
      display: flex;
      align-items: stretch;
      background: #fbfaf6;
      border: 1px solid #e6dfd0;
      border-radius: 8px;
      overflow: hidden;
      transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
    }

    .yl-adv-input-row:focus-within {
      border-color: #6a655a;
      box-shadow: 0 0 0 3px rgba(32, 30, 24, 0.10);
      background: #fff;
    }

    .yl-adv-input {
      flex: 1;
      padding: 0.7rem 0.9rem;
      border: none;
      background: transparent;
      font-size: 0.875rem;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #201e18;
      outline: none;
      min-width: 0;
    }

    .yl-adv-input::placeholder { color: #8a847a; }

    .yl-adv-send {
      background: #CC2929;
      color: #fff;
      border: none;
      padding: 0 0.875rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
      flex-shrink: 0;
    }

    .yl-adv-send:hover { background: #a82020; }
    .yl-adv-send:disabled { background: #e6dfd0; cursor: not-allowed; }
    .yl-adv-send:disabled svg { opacity: 0.4; }

    .yl-adv-note {
      text-align: center;
      font-size: 0.67rem;
      color: #8a847a;
      margin-top: 0.45rem;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  `;

  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ─── HTML ──────────────────────────────────────────────────────
  const html = `
    <div id="yl-advisor-backdrop"></div>
    <div id="yl-advisor-panel" role="dialog" aria-modal="true" aria-label="Yee Lim Product Advisor">
      <div class="yl-adv-header">
        <div class="yl-adv-mark"><img src="/images/logos/ylai-seal.png" alt="Yee Lim Adhesives"></div>
        <div class="yl-adv-header-text">
          <div class="yl-adv-title">Product Advisor</div>
          <div class="yl-adv-subtitle">
            <span class="yl-status-dot"></span>Yee Lim Adhesives
          </div>
        </div>
        <button class="yl-adv-close" onclick="closeProductAdvisor()" aria-label="Close product advisor">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="yl-adv-messages" id="ylAdvMessages"></div>
      <div class="yl-adv-footer">
        <div class="yl-adv-input-row">
          <input class="yl-adv-input" id="ylAdvInput" type="text"
            aria-label="Ask the product advisor a question"
            placeholder="e.g. What adhesive for tiles in wet areas?"
            maxlength="400" autocomplete="off" />
          <button class="yl-adv-send" id="ylAdvSend" aria-label="Send message" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <div class="yl-adv-note">Suggestions are for guidance only. Yee Lim staff will confirm suitability after enquiry.</div>
      </div>
    </div>
  `;

  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);

  // ─── Elements ──────────────────────────────────────────────────
  const backdrop = document.getElementById("yl-advisor-backdrop");
  const panel    = document.getElementById("yl-advisor-panel");
  const messages = document.getElementById("ylAdvMessages");
  const input    = document.getElementById("ylAdvInput");
  const sendBtn  = document.getElementById("ylAdvSend");

  let history   = [];
  let isLoading = false;
  let greeted   = false;
  let advisorRelease = null;

  // ─── Open / close ──────────────────────────────────────────────
  window.openProductAdvisor = function () {
    backdrop.classList.add("open");
    panel.classList.add("open");
    document.body.style.overflow = "hidden";
    if (!greeted) showGreeting();
    // Trap focus in the dialog, close on Escape, and return focus to the opener
    // on close. Falls back to a plain focus if the shared helper is unavailable.
    if (typeof ylFocusTrap === "function") {
      advisorRelease = ylFocusTrap(panel, {
        onEscape: window.closeProductAdvisor, initialFocus: input, focusDelay: 260,
      });
    } else {
      setTimeout(() => input.focus(), 260);
    }
  };

  window.closeProductAdvisor = function () {
    backdrop.classList.remove("open");
    panel.classList.remove("open");
    document.body.style.overflow = "";
    if (advisorRelease) { advisorRelease(); advisorRelease = null; }
  };

  backdrop.addEventListener("click", window.closeProductAdvisor);

  // ─── Greeting ──────────────────────────────────────────────────
  function showGreeting() {
    greeted = true;
    addMessage("assistant",
      "Hello. I can help you find the right adhesive for your job. Tell me the surfaces you're bonding and the environment, or pick a common question below.",
      [
        "Tiles in wet areas",
        "Foam & upholstery",
        "Marine / outdoor use",
        "Metal bonding",
        "Carpet & flooring",
      ]
    );
  }

  // ─── Add message ───────────────────────────────────────────────
  function addMessage(role, text, suggestions) {
    const wrap   = document.createElement("div");
    wrap.className = `yl-msg yl-msg-${role}`;

    // Assistant messages carry the brand emblem avatar, the hallmark of a real
    // chat UI. User messages stay avatar-less and right-aligned.
    if (role === "assistant") {
      const avatar = document.createElement("div");
      avatar.className = "yl-msg-avatar";
      avatar.innerHTML = '<img src="/images/logos/ylai-seal.png" alt="">';
      wrap.appendChild(avatar);
    }

    const body = document.createElement("div");
    body.className = "yl-msg-body";

    const bubble = document.createElement("div");
    bubble.className = "yl-msg-bubble";
    bubble.innerHTML = formatText(text);
    body.appendChild(bubble);

    if (suggestions && suggestions.length) {
      const chips = document.createElement("div");
      chips.className = "yl-suggestions";
      suggestions.forEach(s => {
        const btn = document.createElement("button");
        btn.className = "yl-suggestion";
        btn.textContent = s;
        btn.addEventListener("click", () => {
          chips.remove();
          sendMessage(s);
        });
        chips.appendChild(btn);
      });
      body.appendChild(chips);
    }

    wrap.appendChild(body);
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
  }

  // Escape HTML first so any markup in the reply (especially once a real LLM is
  // wired up) renders as text, not live HTML. Then apply our limited markdown.
  function escapeAdvHtml(s) {
    return String(s).replace(/[&<>"]/g, ch =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  }

  // Only allow http(s) and site-relative ("/...") links. Anything else
  // (javascript:, data:, etc.) is rejected and rendered as plain text.
  function safeHref(url) {
    const u = String(url).trim();
    return (/^https?:\/\//i.test(u) || u.startsWith("/")) ? u : null;
  }

  function formatText(t) {
    let s = escapeAdvHtml(t);
    // Links: [text](url) — emit an anchor only for safe hrefs, else keep the label.
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, label, url) => {
      const href = safeHref(url);
      return href ? `<a href="${href}">${label}</a>` : label;
    });
    return s
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>(\n|$))+/gs, m => `<ul>${m}</ul>`)
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  // ─── Typing indicator ──────────────────────────────────────────
  function showTyping() {
    const wrap = document.createElement("div");
    wrap.className = "yl-msg yl-msg-assistant";
    wrap.id = "ylAdvTyping";
    wrap.innerHTML =
      '<div class="yl-msg-avatar"><img src="/images/logos/ylai-seal.png" alt=""></div>' +
      '<div class="yl-typing"><span></span><span></span><span></span></div>';
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
    return wrap;
  }

  function hideTyping() {
    const el = document.getElementById("ylAdvTyping");
    if (el) el.remove();
  }

  // ─── Send ──────────────────────────────────────────────────────
  async function sendMessage(text) {
    const content = text.trim();
    if (!content || isLoading) return;

    input.value = "";
    sendBtn.disabled = true;
    isLoading = true;
    document.querySelectorAll(".yl-suggestions").forEach(el => el.remove());

    addMessage("user", content);
    history.push({ role: "user", content });
    showTyping();

    try {
      const res = await fetch(`${API_BASE_URL}/api/advisor.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) throw new Error("Advisor request failed: " + res.status);

      const data  = await res.json();
      const reply = (data && typeof data.reply === "string" && data.reply.trim())
        ? data.reply
        : "I couldn't find an answer for that. Please [submit an enquiry](/enquiry) and our team will help.";

      hideTyping();
      history.push({ role: "assistant", content: reply });
      addMessage("assistant", reply);
    } catch (err) {
      hideTyping();
      addMessage("assistant",
        "Sorry, I can't connect right now. Please [submit an enquiry](/enquiry) directly."
      );
    } finally {
      isLoading = false;
      sendBtn.disabled = !input.value.trim();
      input.focus();
    }
  }

  // ─── Input events ──────────────────────────────────────────────
  input.addEventListener("input", () => {
    sendBtn.disabled = !input.value.trim() || isLoading;
  });

  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input.value);
    }
  });

  sendBtn.addEventListener("click", () => sendMessage(input.value));

})();
