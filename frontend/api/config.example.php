<?php
// Copy this file to config.php and fill in the real database credentials.
// config.php is gitignored and must never be committed.

define("DB_HOST", "localhost");
define("DB_NAME", "yeelimad_website");
define("DB_USER", "your_db_username");
define("DB_PASS", "your_db_password");

// ── Enquiry email notification (recommended) ───────────────────────
// When a customer submits an enquiry it is ALWAYS saved to the database
// (the admin "Enquiries" inbox). If ENQUIRY_NOTIFY_TO is set, the site
// ALSO emails the sales team so a new lead is never missed. The email is
// best-effort: if it fails, the enquiry is still safely saved.
//
// On the LIVE cPanel server, set ENQUIRY_NOTIFY_TO to the Yee Lim inbox
// the client gave us so new leads reach the sales team:
//
//   define("ENQUIRY_NOTIFY_TO", "contact@yeelimadhesives.com.sg"); // Yee Lim sales inbox (client's address)
//   define("ENQUIRY_FROM",      "no-reply@yeelimadhesives.com.sg"); // optional "From" (use a mailbox on this domain)
//   define("SITE_URL",          "https://yeelimadhesives.com.sg");  // your LIVE site URL, for the "Mark as replied" link
//
// SITE_URL is used to build the one-tap "Mark as replied" link inside the
// notification email. Set it to the real public domain. If omitted it is
// guessed from the request host.
//
// Uses PHP mail() (fine for cPanel). For best deliverability use a "From"
// address that is a real mailbox on the site's own domain. If notifications
// land in spam, switch to authenticated SMTP from a real mailbox (PHPMailer).

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
