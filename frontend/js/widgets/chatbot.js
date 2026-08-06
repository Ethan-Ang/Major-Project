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

    /* The full-screen treatment is not a width question alone. A phone in
       landscape is ~720px wide but only ~320px tall, and with the keyboard up
       the centred modal would put the composer behind it. The second clause
       catches exactly that: a short viewport with a coarse pointer. A desktop
       window is never coarse, so it keeps the modal. ylAdvSyncViewport matches
       on the identical query, so CSS and JS can never disagree about which
       treatment is active. */
    @media (max-width: 520px), (max-height: 560px) and (pointer: coarse) {
      /* ADV-002: a dedicated full-screen application panel, not a bottom sheet.
         The 93dvh sheet this replaced left a strip of the live page showing at
         the top, and — because dvh does NOT shrink for the iOS software
         keyboard — left the composer under the keyboard and the enquiry page
         exposed below it the moment the field was focused.

         The panel is a fixed flex column filling the *visible* viewport:
         header and composer are flex:0 0 auto, only the message list scrolls.
         Height normally comes from 100dvh (100vh where dvh is unsupported).
         --yl-adv-top / --yl-adv-height override it only while the keyboard is
         up; ylAdvSyncViewport sets them from window.visualViewport and clears
         them again the moment the keyboard closes, so nothing goes stale. */
      #yl-advisor-panel {
        width: 100%;
        left: 0;
        right: 0;
        top: var(--yl-adv-top, 0px);
        bottom: auto;
        height: 100vh;
        height: var(--yl-adv-height, 100dvh);
        min-height: 0;
        max-height: none;
        padding-bottom: 0;
        border-radius: 0;
        clip-path: none;
        box-shadow: none;
        /* A short rise, no zoom: ~240ms ease-out. */
        transform: translateY(14px);
        transition: transform 0.24s cubic-bezier(0.22, 0.61, 0.36, 1),
                    opacity 0.24s cubic-bezier(0.22, 0.61, 0.36, 1);
      }
      #yl-advisor-panel.open { transform: translateY(0); }

      /* The backdrop is only ever seen during the open/close transition on
         mobile, but it must still track the visible viewport so it never
         reveals an undimmed strip of the page underneath. */
      #yl-advisor-backdrop {
        top: var(--yl-adv-top, 0px);
        height: 100vh;
        height: var(--yl-adv-height, 100dvh);
        bottom: auto;
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

    /* Header — never inside the scrolling region, so it stays put while typing. */
    .yl-adv-header {
      position: relative;
      background: #1a1712;
      padding: 1.1rem 1.15rem 1.05rem;
      display: flex;
      align-items: center;
      gap: 0.8rem;
      flex: 0 0 auto;
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

    /* Messages — the ONLY independently scrolling region in the panel.
       min-height:0 is what stops a long conversation from growing the flex
       column past the panel and pushing the composer off screen. */
    .yl-adv-messages {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      /* One clear gap between conversation turns. Everything that belongs to a
         single assistant response is grouped inside .yl-msg-body instead. */
      gap: 1.5rem;
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
      min-width: 0;
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
    /* One assistant response group: explanation bubble, then the recommendation
       card(s) on the same content edge, ~11px below. The avatar is a sibling of
       this column, so it is never repeated beside the card or the CTA. */
    .yl-msg-body { display: flex; flex-direction: column; gap: 12px; min-width: 0; }

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

    /* Composer — a stable bottom region of the panel, not a pill floating over
       the page. flex:0 0 auto keeps it out of the scrolling region entirely. */
    .yl-adv-footer {
      padding: 0.7rem 0.85rem calc(0.7rem + env(safe-area-inset-bottom, 0px));
      border-top: 1px solid #efe9dc;
      background: #fff;
      flex: 0 0 auto;
    }

    /* Keyboard up: the home indicator is behind the keyboard, so the safe-area
       inset would be padding the composer away from the keyboard for nothing.
       ylAdvSyncViewport adds this class only while the keyboard is actually up. */
    #yl-advisor-panel.yl-adv-kb-open .yl-adv-footer {
      padding-bottom: 0.7rem;
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

    /* A textarea, not an input. Two reasons: it wraps a long message naturally,
       and iOS does not offer the "AutoFill Contact" accessory over a textarea —
       which is what the enquiry page's autocomplete="name|organization|email|tel"
       fields were triggering for a plain text input in the same document. */
    .yl-adv-input {
      flex: 1;
      padding: 0.55rem 0.4rem 0.55rem 0.75rem;
      border: none;
      background: transparent;
      /* 16px minimum: below this, iOS zooms the whole page in the moment the
         field is focused (the reported "makes me zoom in when I type"). */
      font-size: 16px;
      line-height: 1.4;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #201e18;
      outline: none;
      min-width: 0;
      resize: none;
      overflow-y: auto;
      /* One row by default, growing to ~5 before the field itself scrolls. */
      max-height: 116px;
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

    /* Shared action button. The oversized full-width red banner that used to sit
       BELOW the card (a separate block, taller than the card's own content) is
       gone: the recommendation CTA now lives inside the card as .yl-rec-cta, and
       this base is what Retry and the card CTA share. */
    /* Outlined at rest, per the "Recommended CTA design" reference: white
       ground, 1px brand-red border, brand-red label. The red border is what
       makes this read as a button rather than another panel nested inside the
       card — a neutral border was tried and lost that entirely.

       The solid brand red is kept for hover and active, the deliberately
       emphasised states, instead of sitting there permanently.

       Reds are the site's #CC2929, not the reference's #D32F2F: on the pale
       selected/pressed tints #D32F2F measures 4.29:1 and 4.14:1, under the
       4.5:1 AA minimum, while #CC2929 clears it everywhere (5.36 resting,
       4.62 selected) and matches the rest of the site. */
    .yl-adv-cta {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 45px;
      padding: 0.55rem 1rem;
      border-radius: 9px;
      border: 1px solid #CC2929;
      background: #fff;
      color: #CC2929;
      cursor: pointer;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 15px;
      font-weight: 600;
      line-height: 1.25;
      text-decoration: none;
      text-align: center;
      transition: background 0.16s, border-color 0.16s, color 0.16s;
    }
    /* Selected: pale red ground, brand red border and text. Obviously chosen but
       obviously still pressable, because pressing again removes the product. The
       label changes too, so state is never carried by colour alone. */
    .yl-adv-cta[aria-pressed=true] {
      background: #ffe9e9;
      border-color: #CC2929;
      color: #CC2929;
    }
    @media (hover: hover) and (pointer: fine) {
      /* Solid brand red is the emphasis, not the resting weight. */
      .yl-adv-cta:hover { background: #CC2929; border-color: #CC2929; color: #fff; }
      /* An already-selected control must not flip to solid red on hover — that
         would read as "add" when pressing it actually removes. It deepens
         instead, which is still unmistakable feedback (6.25:1). */
      .yl-adv-cta[aria-pressed=true]:hover { background: #ffe9e9; border-color: #a82020; color: #a82020; }
    }
    /* Touch has no hover, so :active is where a phone gets the solid red. */
    .yl-adv-cta:active { background: #a82020; border-color: #a82020; color: #fff; }
    .yl-adv-cta[aria-pressed=true]:active { background: #ffe0e0; border-color: #a82020; color: #a82020; }
    .yl-adv-cta:disabled { color: #6b665e; background: #eee9df; border-color: #e2dccf; cursor: default; }

    /* The CTA inside the card: full usable card width, sat 15px under the
       description so it reads as this recommendation's action rather than a
       banner of its own. */
    .yl-rec-cta { width: 100%; margin-top: 15px; }

    /* Retry is not a recommendation action, so it stays compact and left-aligned
       instead of inheriting the card CTA's full width. */
    .yl-adv-retry { align-self: flex-start; }

    .yl-recommendations { display: grid; gap: 0.5rem; }
    /* Restrained card: hairline border, small radius, no shadow, compact padding.
       Professional rather than decorative, and it carries its own action. */
    .yl-recommendation {
      min-width: 0;
      padding: 14px;
      border: 1px solid #e6dfd0;
      border-radius: 10px;
      background: #fffdf8;
      box-shadow: none;
    }
    /* Strongest text in the card. Long names wrap instead of forcing the panel
       wide (inline-flex would not wrap, so this is a block-level link with the
       24px house target size preserved via padding-free min-height). */
    .yl-rec-name {
      display: block;
      min-height: 24px;
      color: #201e18;
      font-size: 15px;
      font-weight: 700;
      line-height: 1.3;
      text-decoration: none;
      overflow-wrap: anywhere;
    }
    .yl-rec-name:hover { color: #a82020; text-decoration: underline; }
    /* Smaller and muted: a qualifier under the name, not a heading. */
    .yl-rec-meta { margin-top: 10px; color: #8a8378; font-size: 12.5px; line-height: 1.35; overflow-wrap: anywhere; }
    .yl-rec-description { margin: 12px 0 0; color: #4f4a43; font-size: 13.5px; line-height: 1.5; overflow-wrap: anywhere; }
    /* When the catalogue gives no description, the CTA still needs its 14-16px
       breathing room from whatever precedes it. */
    .yl-rec-meta + .yl-rec-cta, .yl-rec-name + .yl-rec-cta { margin-top: 15px; }

    .yl-adv-close:focus-visible,
    .yl-suggestion:focus-visible,
    .yl-adv-cta:focus-visible, .yl-rec-name:focus-visible,
    .yl-adv-send:focus-visible {
      outline: 3px solid #CC2929;
      outline-offset: 2px;
    }

    /* ── Mobile full-screen refinements ──────────────────────────────── */
    @media (max-width: 520px), (max-height: 560px) and (pointer: coarse) {
      /* Safe areas: the top inset matters under Safari's chrome and the notch,
         the side insets matter in landscape. The bottom inset is handled on the
         composer so it can be dropped while the keyboard is up. */
      .yl-adv-header {
        padding-top: calc(1.1rem + env(safe-area-inset-top, 0px));
        padding-left: calc(1.15rem + env(safe-area-inset-left, 0px));
        padding-right: calc(1.15rem + env(safe-area-inset-right, 0px));
      }
      .yl-adv-messages {
        padding-left: calc(1rem + env(safe-area-inset-left, 0px));
        padding-right: calc(1rem + env(safe-area-inset-right, 0px));
      }
      .yl-adv-footer {
        padding-left: calc(0.85rem + env(safe-area-inset-left, 0px));
        padding-right: calc(0.85rem + env(safe-area-inset-right, 0px));
      }

      /* Bottom-anchor the conversation. This is what removes the large beige
         dead zone between the last reply and the composer: the margin resolves
         to 0 as soon as the content overflows, so unlike justify-content:flex-end
         it never makes the top of the transcript unreachable. */
      .yl-adv-messages > .yl-msg:first-child { margin-top: auto; }

      /* Controlled bubble width: a long message must not run edge to edge. */
      .yl-msg-user { max-width: 84%; }
      .yl-msg-assistant { max-width: 94%; }

      .yl-msg-bubble { font-size: 16px; padding: 0.6rem 0.9rem; border-radius: 16px; }
      .yl-rec-name { font-size: 16px; }
      .yl-rec-meta { font-size: 13px; }
      .yl-rec-description { font-size: 14px; }
      .yl-adv-cta { font-size: 15px; }
    }

    @media (max-width: 360px) {
      .yl-adv-header {
        padding-left: calc(0.7rem + env(safe-area-inset-left, 0px));
        padding-right: calc(0.7rem + env(safe-area-inset-right, 0px));
        gap: 0.45rem;
      }
      .yl-adv-messages {
        padding-left: calc(0.7rem + env(safe-area-inset-left, 0px));
        padding-right: calc(0.7rem + env(safe-area-inset-right, 0px));
      }
      /* User bubbles stay at 84% even here — widening them is what made a long
         message nearly touch both sides of the panel. Only the assistant column,
         which has to hold a product card, gets the extra room. */
      .yl-msg-assistant { max-width: 97%; }
      .yl-recommendation { padding: 12px; }
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
          <!-- A textarea rather than <input type="text">. The advisor widget is
               appended to document.body, so this field is not inside and not
               form-associated with the enquiry fields (those pages have no
               <form> element at all). What iOS was reacting to is the enquiry
               page's autocomplete="name|organization|email|tel" inputs elsewhere
               in the same document, which make Safari offer "AutoFill Contact"
               on any text input on the page. A textarea is excluded from that
               heuristic, and it also lets a long message wrap properly. -->
          <textarea class="yl-adv-input" id="ylAdvInput" name="ylAdvisorMessage" rows="1"
            data-i18n-attr="aria-label:advisor.aria_input,placeholder:advisor.placeholder"
            aria-label="${cbT("advisor.aria_input", "Ask the product advisor a question")}"
            placeholder="${cbT("advisor.placeholder", "Message…")}"
            maxlength="1000" autocomplete="off" autocorrect="on"
            autocapitalize="sentences" spellcheck="true" enterkeyhint="send"></textarea>
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
  let releaseFocusTrap = null;
  let bodyLock = null;
  let lockedScrollY = 0;
  let viewportFrame = 0;
  let lastViewportKey = "";
  // Whether the transcript is scrolled to the newest message. New replies only
  // scroll the list when this is true, so a visitor reading back through the
  // conversation is never yanked to the bottom.
  let pinnedToBottom = true;

  const PIN_TOLERANCE_PX = 48;

  function updatePinnedState() {
    pinnedToBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight <= PIN_TOLERANCE_PX;
  }

  /**
   * Jumps the transcript to the newest message.
   *
   * behavior:"auto" is explicit because .yl-adv-messages sets scroll-behavior:
   * smooth. An animated auto-follow fires scroll events all the way down, and
   * updatePinnedState would read those mid-flight positions as the visitor
   * scrolling up -- which silently switched auto-follow off for every later
   * reply. An instant jump lands once, at the bottom, and reads back correctly.
   */
  function jumpConversationToBottom() {
    // Inline scroll-behavior:auto beats the stylesheet's `smooth` for exactly
    // this assignment, then the stylesheet is handed back. scrollTo({behavior:
    // "auto"}) does NOT do this -- per spec "auto" means "use the element's
    // computed scroll-behavior", i.e. smooth again, which is what left the
    // newest reply stranded a few hundred pixels above the fold.
    const previous = messages.style.scrollBehavior;
    messages.style.scrollBehavior = "auto";
    messages.scrollTop = messages.scrollHeight;
    if (previous) messages.style.scrollBehavior = previous;
    else messages.style.removeProperty("scroll-behavior");
    pinnedToBottom = true;
  }

  /** Scrolls the conversation region only — never the panel, never the page. */
  function scrollConversationToLatest(force) {
    if (force) pinnedToBottom = true;
    if (!pinnedToBottom) return;
    jumpConversationToBottom();
  }

  /** Grows the composer with the message, up to the CSS max-height. */
  function autoGrowComposer() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 116) + "px";
    // The composer growing takes height away from the transcript, so the newest
    // message has to be followed down or it slides behind the composer.
    scrollConversationToLatest(false);
  }

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

  /**
   * The enquiry basket in localStorage is the ONLY source of truth for what is
   * attached. There is no second store: every button reads its state back out
   * of the basket, which is what keeps two cards for the same product, a
   * reopened panel and the enquiry page itself all agreeing.
   */
  function recommendationIsIncluded(recommendation) {
    return currentBasket().indexOf(String(recommendation.id)) !== -1;
  }

  /** Recommendations from this response that are currently in the basket. */
  function attachedRecommendations(record) {
    const basket = currentBasket();
    return record.recommendations.filter(function (recommendation) {
      return basket.indexOf(String(recommendation.id)) !== -1;
    });
  }

  /**
   * The control is a toggle, so it is never disabled: pressing it again takes
   * the products back out. aria-pressed carries the state for assistive tech and
   * drives the selected styling, and the label changes too so the state is not
   * signalled by colour alone.
   */
  function setAttachButtonState(button, included) {
    const key = included ? "advisor.recommendation_included" : "advisor.include_recommendation";
    button.dataset.i18n = key;
    button.textContent = cbT(key, included ? "Added to enquiry" : "Add to enquiry");
    button.setAttribute("aria-pressed", included ? "true" : "false");
    button.disabled = false;
  }

  function buildAdvisorSummary(recommendations) {
    return [
      cbT("advisor.summary_title", "Product Advisor summary"),
      "",
      cbT("advisor.summary_recommended", "Recommended products:"),
      recommendations.map(function (recommendation) { return "- " + recommendation.name; }).join("\n"),
    ].join("\n");
  }

  /**
   * Rewrites the enquiry handoff so it always describes exactly the products
   * from this response that are attached right now.
   *
   * Called after every add and every remove, which is what stops the enquiry
   * message being prefilled with prose about a product the visitor has since
   * taken back out. When nothing from this response is attached any more the
   * record is dropped, but only if it was this response that wrote it -- another
   * response's handoff is left alone.
   */
  function syncEnquirySummary(record) {
    const attached = attachedRecommendations(record);
    try {
      if (!attached.length) {
        const raw = sessionStorage.getItem(ENQUIRY_SUMMARY_KEY);
        if (raw) {
          const stored = JSON.parse(raw);
          if (stored && stored.recordId === record.id) sessionStorage.removeItem(ENQUIRY_SUMMARY_KEY);
        }
        return;
      }
      sessionStorage.setItem(ENQUIRY_SUMMARY_KEY, JSON.stringify({
        schemaVersion: ADVISOR_SCHEMA_VERSION,
        id: advisorMessageId(),
        recordId: record.id,
        updatedAt: Date.now(),
        language: advisorLanguage(),
        productIds: attached.map(function (recommendation) { return String(recommendation.id); }),
        productNames: attached.map(function (recommendation) { return recommendation.name; }),
        summaryText: buildAdvisorSummary(attached),
      }));
    } catch (error) { /* a corrupt or full sessionStorage is not worth failing over */ }
  }

  /** Writes the basket back through the shared API, falling back to storage. */
  function writeBasket(ids) {
    if (typeof window.saveBasket === "function") { window.saveBasket(ids); return; }
    localStorage.setItem("enquiryBasket", JSON.stringify(ids));
    window.dispatchEvent(new Event("basketUpdated"));
  }

  /**
   * Adds or removes ONE recommended product, and nothing else.
   *
   * The basket is the single source of truth, so this reads it, changes exactly
   * one id, and writes it back. A Set guarantees a product can never be added
   * twice, and anything the visitor attached by hand elsewhere on the site is
   * untouched. The button's own state is then re-read from the basket rather
   * than assumed, so the UI cannot drift from the data.
   */
  function toggleRecommendation(record, recommendation, button) {
    const id = String(recommendation.id);
    if (!id) return;
    const included = recommendationIsIncluded(recommendation);
    try {
      if (included) {
        writeBasket(currentBasket().filter(function (item) { return item !== id; }));
      } else {
        const union = new Set(currentBasket());
        union.add(id);
        writeBasket(Array.from(union));
      }
      syncEnquirySummary(record);
      setAttachButtonState(button, recommendationIsIncluded(recommendation));
      if (typeof window.announce === "function") {
        window.announce(included
          ? cbT("advisor.recommendation_removed", "Removed from enquiry")
          : cbT("advisor.recommendation_included", "Included in enquiry"));
      }
    } catch (error) {
      if (typeof window.showToast === "function") {
        window.showToast(cbT("advisor.attach_error", "The recommendation could not be added. Please try again."), "error");
      }
    }
  }

  /**
   * Display-only tidy of a catalogue description for the recommendation card.
   *
   * Every rule here removes or normalises wording that is ALREADY in the
   * catalogue. Nothing is added, no application or feature is invented, and the
   * database is not modified -- the product pages still show the supplier's
   * original copy. If any rule does not apply, the text is left exactly as it is.
   *
   *   1. Drop the leading product name. 20 of 31 descriptions open by repeating
   *      it ("Rhino™ Brand 909 is a…", "Deer™ Brand 129, a…"), which wastes the
   *      first line directly under a title that already says it.
   *   2. Hyphenate "solvent based" / "water based". The features column already
   *      stores these as "Solvent-based", so this only makes the two agree.
   *   3. "formulated to work best for" -> "formulated for", and "laminate works"
   *      -> "laminate applications". Both are narrow, exact phrases; no blanket
   *      "works" -> "applications" rule, because "raised works" is a real
   *      construction term and would be mangled by one.
   */
  function tidyRecommendationCopy(text, productName, language) {
    let out = String(text || "").trim();
    if (!out) return "";

    if (productName) {
      const escaped = String(productName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // "NAME is a …" / "NAME, a …" / "NAME 是一款…" / "NAME，…", and the bare
      // "NAME PVC adhesive is …" case, where the name runs straight into the
      // sentence. The trailing \s+ branch is last so a real connector is
      // consumed when there is one; it only ever removes the name itself.
      const stripped = out.replace(
        new RegExp("^" + escaped + "(?:\\s*(?:,|，)\\s*|\\s+is\\s+|\\s*是(?:一款|一种)?\\s*|\\s+)(?:an?\\s+)?", "i"),
        ""
      );
      if (stripped && stripped !== out) out = stripped;
    }

    if (language !== "zh") {
      out = out
        .replace(/\bsolvent based\b/gi, "solvent-based")
        .replace(/\bwater based\b/gi, "water-based")
        .replace(/\bformulated to work best for\b/gi, "formulated for")
        .replace(/\blaminate works\b/gi, "laminate applications");
      out = out.charAt(0).toUpperCase() + out.slice(1);
    }
    return out;
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
      // Surfaces plus the adhesive's base, both straight from verified catalogue
      // fields. The brand is dropped: every product name already begins with it
      // ("Rhino™ Brand 909"), so repeating it here said nothing new.
      const baseFeature = (recommendation.features || []).find(function (feature) {
        return /-based$/i.test(String(feature).trim());
      });
      const metaParts = [];
      if (surfaceNames.length) {
        metaParts.push(surfaceNames.join(advisorLanguage() === "zh" ? "、" : ", "));
      }
      if (baseFeature) {
        const base = String(baseFeature).trim();
        // ylTerm already carries "Solvent-based" -> 溶剂型, so the qualifier is
        // translated on the Chinese site instead of sitting there in English.
        metaParts.push(typeof window.ylTerm === "function" ? window.ylTerm(base) : base);
      }
      meta.textContent = metaParts.join(" · ");
      if (!metaParts.length) meta.remove(); else card.appendChild(meta);
      let descriptionText = recommendation.shortDescription;
      if (advisorLanguage() === "zh") {
        const translated = window.YL_PRODUCT_ZH && window.YL_PRODUCT_ZH[String(recommendation.id)];
        descriptionText = translated && typeof translated.shortDescription === "string"
          ? translated.shortDescription
          : "";
      } else if (product && typeof window.ylPField === "function") {
        descriptionText = window.ylPField(product, "shortDescription");
      }
      descriptionText = tidyRecommendationCopy(
        descriptionText,
        recommendation.name,
        advisorLanguage()
      );
      if (descriptionText) {
        const description = document.createElement("p");
        description.className = "yl-rec-description";
        description.textContent = descriptionText;
        card.appendChild(description);
      }

      // The action belongs to THIS product and lives inside its card, so a
      // response carrying two recommendations shows each one's own state
      // instead of a single banner speaking for both.
      const includeButton = document.createElement("button");
      includeButton.type = "button";
      includeButton.className = "yl-adv-cta yl-rec-cta";
      includeButton.dataset.productId = String(recommendation.id);
      setAttachButtonState(includeButton, recommendationIsIncluded(recommendation));
      includeButton.addEventListener("click", function () {
        toggleRecommendation(record, recommendation, includeButton);
      });
      card.appendChild(includeButton);

      list.appendChild(card);
    });
    body.appendChild(list);
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
    button.className = "yl-adv-cta yl-adv-retry";
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
    // Read the pin state BEFORE appending, otherwise the new node has already
    // changed scrollHeight and every message would look like a scroll-up.
    if (scroll !== false) updatePinnedState();
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
    // The visitor's own message always brings itself into view; a reply only
    // does so when they were already at the bottom.
    if (scroll !== false) scrollConversationToLatest(record.sender === "user");
    return wrap;
  }


  function renderConversation() {
    messages.replaceChildren();
    advisorState.messages.forEach(function (message) { renderMessage(message, false); });
    jumpConversationToBottom();
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
    // Already pinned by the visitor's own message that triggered this request.
    scrollConversationToLatest(false);
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
    autoGrowComposer();
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
    // textarea is listed explicitly: the composer became one so iOS would stop
    // offering Contact AutoFill over it, and without this the trap would skip
    // the very field the dialog exists for.
    const selector = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
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

  /* ── Background scroll lock ────────────────────────────────────────────
   *
   * overflow:hidden on <body> does not lock iOS Safari, and that is the root of
   * three separate symptoms in the recording: the page kept scrolling under the
   * panel, iOS scrolled the document to reveal the focused field (which carried
   * the panel's header up off screen), and closing the advisor left the page at
   * whatever position that scrolling had reached.
   *
   * Pinning <body> with position:fixed at a negative offset genuinely freezes
   * the document, and the remembered offset restores the exact original
   * position. The previous inline values are recorded and put back verbatim, so
   * repeated open/close cycles leave no residue on the element.
   */
  function lockBackgroundScroll() {
    if (bodyLock) return;
    const body = document.body;
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    bodyLock = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    };
    body.style.position = "fixed";
    body.style.top = -lockedScrollY + "px";
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    // Desktop only: replace the width the scrollbar was occupying so the page
    // behind the modal does not reflow sideways as it disappears.
    if (scrollbar > 0) body.style.paddingRight = scrollbar + "px";
  }

  function unlockBackgroundScroll() {
    if (!bodyLock) return;
    const body = document.body;
    body.style.position = bodyLock.position;
    body.style.top = bodyLock.top;
    body.style.left = bodyLock.left;
    body.style.right = bodyLock.right;
    body.style.width = bodyLock.width;
    body.style.overflow = bodyLock.overflow;
    body.style.paddingRight = bodyLock.paddingRight;
    if (!body.getAttribute("style")) body.removeAttribute("style");
    bodyLock = null;
    window.scrollTo(0, lockedScrollY);
  }

  /* ── Visible-viewport / software-keyboard sync ─────────────────────────
   *
   * CSS alone gets the panel to the full visible height: 100dvh tracks Safari's
   * collapsing URL bar. What CSS cannot see is the software keyboard — iOS does
   * not shrink the layout viewport (or dvh) for it, only the visual viewport.
   * So visualViewport is used strictly as a progressive enhancement: while the
   * keyboard is up, two scoped custom properties pin the panel to the visual
   * viewport; the moment it closes they are removed and plain 100dvh takes over
   * again. Nothing is left applied, so the panel cannot get stuck at a stale
   * keyboard-sized height the way it did in the recording.
   */
  // Must stay identical to the two full-screen @media queries in the CSS above.
  const ADVISOR_MOBILE_QUERY = "(max-width: 520px), (max-height: 560px) and (pointer: coarse)";
  const KEYBOARD_MIN_PX = 80;

  function advisorIsMobile() {
    return window.matchMedia(ADVISOR_MOBILE_QUERY).matches;
  }

  function clearViewportVars() {
    if (!lastViewportKey) return;
    [panel, backdrop].forEach(function (element) {
      element.style.removeProperty("--yl-adv-top");
      element.style.removeProperty("--yl-adv-height");
    });
    panel.classList.remove("yl-adv-kb-open");
    lastViewportKey = "";
  }

  function ylAdvSyncViewport() {
    viewportFrame = 0;
    const viewport = window.visualViewport;
    if (!viewport || !advisorIsMobile() || !panel.classList.contains("open")) {
      clearViewportVars();
      return;
    }
    // innerHeight is the layout viewport, which iOS leaves at full height while
    // the keyboard is up; the difference against the visual viewport is the
    // keyboard (plus any accessory bar). Nothing here assumes a keyboard size.
    const layoutHeight = Math.max(window.innerHeight, document.documentElement.clientHeight);
    const keyboard = layoutHeight - viewport.height - viewport.offsetTop;
    if (keyboard <= KEYBOARD_MIN_PX) {
      clearViewportVars();
      return;
    }
    const top = Math.round(viewport.offsetTop);
    const height = Math.round(viewport.height);
    const key = top + ":" + height;
    // Writing the same values again would be a wasted style recalculation, and
    // recalculation can itself fire visualViewport events — this is the guard
    // that keeps the resize/scroll handlers from feeding back into each other.
    if (key === lastViewportKey) return;
    lastViewportKey = key;
    [panel, backdrop].forEach(function (element) {
      element.style.setProperty("--yl-adv-top", top + "px");
      element.style.setProperty("--yl-adv-height", height + "px");
    });
    panel.classList.add("yl-adv-kb-open");
    // Keep the newest reply in view as the keyboard takes the space, but only
    // if the visitor had not deliberately scrolled up to read something.
    if (pinnedToBottom) jumpConversationToBottom();
  }

  function scheduleViewportSync() {
    if (viewportFrame) return;
    viewportFrame = window.requestAnimationFrame(ylAdvSyncViewport);
  }

  window.openProductAdvisor = function () {
    if (panel.classList.contains("open")) { input.focus(); return; }
    const requestedReturnFocus = document.activeElement;
    closeCompetingLayersForAdvisor();
    returnFocus = requestedReturnFocus;
    lockBackgroundScroll();
    backdrop.classList.add("open");
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    panel.removeAttribute("inert");
    panel.inert = false;
    document.body.classList.add("advisor-open");
    jumpConversationToBottom();
    releaseFocusTrap = activateFocusTrap();
    scheduleViewportSync();
  };

  window.closeProductAdvisor = function (restoreFocus) {
    if (!panel.classList.contains("open")) return;
    backdrop.classList.remove("open");
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("inert", "");
    panel.inert = true;
    document.body.classList.remove("advisor-open");
    if (viewportFrame) { window.cancelAnimationFrame(viewportFrame); viewportFrame = 0; }
    clearViewportVars();
    unlockBackgroundScroll();
    if (releaseFocusTrap) { releaseFocusTrap(); releaseFocusTrap = null; }
    if (restoreFocus !== false && returnFocus && typeof returnFocus.focus === "function") {
      try { returnFocus.focus(); } catch (error) {}
    }
    returnFocus = null;
  };

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
    autoGrowComposer();
  });
  // The transcript owns its own scroll position; this is the only thing that
  // decides whether a new reply is allowed to move it.
  messages.addEventListener("scroll", updatePinnedState, { passive: true });
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
  // The basket can change from anywhere (a product page, the enquiry page, a
  // second advisor card for the same product). Every card re-reads its own
  // product's state from the basket, so the panel can never show a stale label.
  window.addEventListener("basketUpdated", function () {
    const basket = currentBasket();
    document.querySelectorAll(".yl-recommendation .yl-rec-cta").forEach(function (button) {
      const id = button.dataset.productId;
      if (id) setAttachButtonState(button, basket.indexOf(id) !== -1);
    });
  });
  /* These are registered exactly once. The whole widget is an IIFE that returns
     early when #yl-advisor-panel already exists, and the root lives outside
     Swup's #swup container, so a repeated bundle evaluation after a page
     transition cannot stack a second set of handlers. Every one of them is
     rAF-throttled into a single ylAdvSyncViewport call per frame. */
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleViewportSync);
    window.visualViewport.addEventListener("scroll", scheduleViewportSync);
  }
  // Orientation change and the mobile/desktop breakpoint both invalidate the
  // cached dimensions, so recompute rather than carrying them across.
  window.addEventListener("orientationchange", function () {
    lastViewportKey = "";
    scheduleViewportSync();
  });
  window.addEventListener("resize", scheduleViewportSync);
  const advisorBreakpoint = window.matchMedia(ADVISOR_MOBILE_QUERY);
  if (typeof advisorBreakpoint.addEventListener === "function") {
    advisorBreakpoint.addEventListener("change", function () {
      clearViewportVars();
      scheduleViewportSync();
    });
  }

  renderConversation();
  if (typeof window.ylApplyI18n === "function") window.ylApplyI18n(panel);
  scheduleCatalogueValidation();

})();
