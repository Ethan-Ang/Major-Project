# Session Handoff — AI Product Advisor + Local Admin Setup
**Date:** 2026-06-12
**Branch:** `products-admin`
**Latest commit:** `6f9487a` — "Redesign product pages (B2B look) + live AI product advisor" (local, **not pushed**)

---

## What this session covered

1. Carried-over B2B redesign of `products.html`, `product-detail.html`, `compare.html`, `enquiry.html` (Power Adhesives-inspired, Space Grotesk + Inter, ink/red/panel/line design system) — already verified via screenshots in a prior session.
2. Built a **server-side AI product advisor** so the chatbot works on the real cPanel/PHP/MySQL hosting (not just Claude's preview sandbox).
3. Premium restyle of the chatbot widget + small-talk handling so greetings/thanks/"oh okay" don't hit a robotic fallback.
4. Handled a live API key leak (user pasted a real Gemini key in chat) — key was written to local gitignored config only, verified never committed, rotation recommended.
5. Committed everything (`6f9487a`), confirmed `config.php` stays untracked.
6. Set up a **local MySQL 8.4 + PHP server** so the admin panel (`frontend/admin/`) can actually be opened and used with a real database.

---

## AI Product Advisor architecture

```
chatbot.js  →  POST /api/advisor.php  →  (a) hosted LLM (Gemini/Anthropic/OpenAI-compatible)
                                          (b) free rule-based catalogue matcher (fallback)
```

- **`frontend/api/advisor.php`** (new, ~330 lines)
  - Sanitizes incoming chat history (last 12 turns, starts with user, 1000 chars/msg)
  - Loads the live catalogue from the `products` table
  - If `LLM_PROVIDER` + `LLM_API_KEY` are set in `config.php`, calls that provider (`callGemini`, `callAnthropic`, `callOpenAI`) with a system prompt built from the catalogue
  - Always falls back to `ruleBasedReply()` (keyword/synonym scoring + wet/marine/heat boosts) if no key, or the call fails
  - `smallTalkReply()` — handles greetings, thanks, "ok"/"got it", goodbyes, and "what can you do" before product matching, in both the AI system prompt rules and the rule-based fallback
  - No em dashes anywhere in AI output (per house style)

- **`frontend/api/config.example.php`** — documents `LLM_PROVIDER` / `LLM_API_KEY` / `LLM_MODEL` / `LLM_BASE_URL` with commented examples for Gemini (recommended free tier), Groq, OpenAI, Anthropic.

- **`frontend/js/widgets/chatbot.js`**
  - `sendMessage()` now POSTs to `/api/advisor.php` instead of `window.claude.complete()`
  - Full premium restyle: dark `#0e1116` header with red accent border, "YL" mark, Space Grotesk title, light gray message bubbles with hairline borders, refined suggestion chips with hover/active states
  - Em dashes removed from greeting + footer note

---

## ⚠️ API key — action needed

The user pasted a **live Gemini API key in plaintext chat** (and screenshotted it from AI Studio). It is written into the local, gitignored `frontend/api/config.php`:

```php
define("LLM_PROVIDER", "gemini");
define("LLM_API_KEY",  "AQ.Ab8RN6IxSHKJZk6rDeoPLPtN19iDhUfun-6NTrvmb4K_QQgvNw");
define("LLM_MODEL",    "gemini-2.0-flash");
```

- Confirmed `config.php` is gitignored and was **never committed** (verified before and after, and grepped the repo for the key string — not present in any tracked file).
- Gemini free tier has no billing attached, so worst case is rate-limiting, not financial loss — but **the user should rotate this key when convenient** (Google AI Studio → delete key → create new → paste into local `config.php` and, separately, into the live cPanel `config.php` via File Manager).

---

## Local dev environment (set up this session)

Two background processes are running:

| Service | Command | Port |
|---|---|---|
| MySQL 8.4 | `mysqld --datadir=C:\mysql84-data --port=3307` | 3307 |
| PHP built-in server | `php -S localhost:8000 -t frontend` | 8000 |

This matches what `frontend/api/config.php` already expected (`DB_HOST=127.0.0.1`, `DB_PORT=3307`, `DB_NAME=yeelimad_website`, `DB_USER=root`, `DB_PASS=devpassword123`).

**Database:** fresh MySQL 8.4 instance, initialized with `--initialize-insecure`, root password set to `devpassword123`. `database/schema.sql` + `database/seed_products.sql` loaded (12 products, correct UTF-8 ™ symbols — re-imported with `--default-character-set=utf8mb4` to fix initial mojibake).

**Local admin login** (created this session, DB-only, not a live credential):
- Username: `admin`
- Password: `admin123`

### Key URLs (with both services running)

- Site: `http://localhost:8000/products.html` (AI chatbot uses the real Gemini key via `advisor.php`)
- Admin login: `http://localhost:8000/admin/login.html`
- Admin dashboard: `http://localhost:8000/admin/dashboard.html`
- Products API: `http://localhost:8000/api/products.php`

### Restarting next session

If the machine restarts or the background jobs are gone:

```bash
# 1. Start MySQL 8.4 (data dir already initialized at C:\mysql84-data)
"/c/Program Files/MySQL/MySQL Server 8.4/bin/mysqld.exe" \
  --datadir="C:\mysql84-data" \
  --basedir="C:\Program Files\MySQL\MySQL Server 8.4" \
  --port=3307 --console &

# 2. Start PHP server (from project root)
php -S localhost:8000 -t frontend &
```

No re-seeding needed — `C:\mysql84-data` persists the database.

---

## Pending / offered, not yet done

- [ ] Push commit `6f9487a` to `origin/products-admin` and/or open a PR to `main` (offered, no response yet)
- [ ] Rotate the leaked Gemini API key (recommended twice)
- [ ] Add the same `LLM_PROVIDER`/`LLM_API_KEY`/`LLM_MODEL` block to the **live** cPanel `config.php` via File Manager (local-only so far)
- [ ] `enquiries` table/API still missing — `frontend/admin/enquiries.js` expects `GET /api/enquiries.php` (doesn't exist); `enquiry.html` submit form doesn't POST anywhere yet (see [[project-cpanel-php-migration]])
- [ ] Old Node/Express/Mongoose `backend/` is dead code, not yet removed
- `.claude/settings.local.json` shows as modified — unrelated harness/IDE noise, safe to ignore/not commit

---

## Related memory

- [[project-cpanel-php-migration]] — PHP/MySQL pivot, live cPanel access details
- [[project-handoff-products-admin]] — earlier product-detail/compare redesign handoff
- [[project-b2b-products-revamp]] — B2B visual redesign details
