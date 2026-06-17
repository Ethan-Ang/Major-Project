<?php
// Copy this file to config.php and fill in the real database credentials.
// config.php is gitignored and must never be committed.

define("DB_HOST", "localhost");
define("DB_NAME", "yeelimad_website");
define("DB_USER", "your_db_username");
define("DB_PASS", "your_db_password");

// ── Enquiry emails (recommended) ───────────────────────────────────
// When a customer submits an enquiry it is ALWAYS saved to the database
// (the admin "Enquiries" inbox). On top of that the site sends, best-effort
// (if a send fails, the enquiry is still safely saved):
//   1. A notification to the sales team  — only if ENQUIRY_NOTIFY_TO is set.
//   2. A confirmation to the customer    — always attempted; includes their
//      reference number (e.g. YL-2026-0042) and the products they asked about.
//
// On the LIVE cPanel server, set these so leads reach the team and the
// confirmation looks like it comes from Yee Lim:
//
//   define("ENQUIRY_NOTIFY_TO", "contact@yeelimadhesives.com.sg"); // Yee Lim sales inbox (client's address)
//   define("ENQUIRY_FROM",      "no-reply@yeelimadhesives.com.sg"); // "From" — MUST be a real mailbox on THIS domain
//   define("SITE_URL",          "https://yeelimadhesives.com.sg");  // your LIVE site URL, for the "Mark as replied" link
//
// SITE_URL is used to build the one-tap "Mark as replied" link inside the
// notification email. Set it to the real public domain. If omitted it is
// guessed from the request host.
//
// ── Deliverability (so the emails don't land in spam) ──────────────
// The site sends via PHP mail() (fine for cPanel) and sets the From and the
// envelope sender (Return-Path) to ENQUIRY_FROM, so the message aligns with
// SPF for your domain. For this to actually pass, publish DNS for the domain
// in ENQUIRY_FROM:
//   • SPF  — a TXT record on the domain authorising your host's mail servers,
//            e.g.  v=spf1 +mx +a include:_spf.<your-host> ~all
//            (cPanel can add this for you: Email Deliverability → Manage).
//   • DKIM — enable in cPanel (Email Deliverability → it generates the key and
//            the TXT record to publish). Signs outgoing mail so it isn't forged.
//   • Use an ENQUIRY_FROM mailbox that really exists on the domain.
// If mail still lands in spam after SPF + DKIM, switch to authenticated SMTP
// from a real mailbox (PHPMailer) — same domain, even better alignment.

// ── AI Product Advisor (optional) ──────────────────────────────────
// Leave LLM_PROVIDER empty (or omit these lines) to use the free, built-in
// catalogue matcher — the chatbot still works, it just isn't conversational.
//
// To turn on a real conversational AI, set a provider + key below. The key
// lives only here on the server and is never sent to the browser.
//
// RECOMMENDED — Google Gemini (has a free tier, no credit card):
//   1. Visit  https://aistudio.google.com/apikey  → sign in → "Create API key"
//   2. Uncomment and fill in:
//        define("LLM_PROVIDER", "gemini");
//        define("LLM_API_KEY",  "paste-your-gemini-key-here");
//        define("LLM_MODEL",    "gemini-2.0-flash");   // optional
//
// Other options (same pattern, pick ONE provider):
//   Groq  (free, very fast):
//        define("LLM_PROVIDER", "openai");
//        define("LLM_API_KEY",  "your-groq-key");
//        define("LLM_BASE_URL", "https://api.groq.com/openai/v1");
//        define("LLM_MODEL",    "llama-3.3-70b-versatile");
//   OpenAI:
//        define("LLM_PROVIDER", "openai");
//        define("LLM_API_KEY",  "your-openai-key");
//        define("LLM_BASE_URL", "https://api.openai.com/v1");
//        define("LLM_MODEL",    "gpt-4o-mini");
//   Anthropic (Claude):
//        define("LLM_PROVIDER", "anthropic");
//        define("LLM_API_KEY",  "your-anthropic-key");
//        define("LLM_MODEL",    "claude-haiku-4-5");
//
// Requires PHP cURL + outbound HTTPS (standard on Vodien cPanel).
