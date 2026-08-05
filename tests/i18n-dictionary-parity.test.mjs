// Automated parity + quality checks for the UI translation dictionary.
//
// Production falls back safely to English when a key is missing, so a gap is
// not fatal — but a RAW KEY reaching the interface is, and so is a broken
// interpolation placeholder or stray markup inside a plain-text entry. These
// are the classes of defect that only show up in the language nobody on the
// team reads, which is exactly why they need a machine checking them.
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";

const src = fs.readFileSync(new URL("../frontend/js/i18n.js", import.meta.url), "utf8");

// Evaluate the module in a sandbox and capture the dictionary it builds, rather
// than regex-scraping it — that way the test reads exactly what ships.
function loadDict() {
  const sandbox = {
    window: { matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }) },
    document: {
      documentElement: { lang: "en", getAttribute: () => null, setAttribute() {} },
      addEventListener() {},
      querySelectorAll: () => [],
      readyState: "complete",
    },
    localStorage: { getItem: () => null, setItem() {} },
    console,
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(src, sandbox);
  // ylT closes over the dictionary; probing it is enough for value checks, but
  // we also want the key list, so pull the literal out of the source.
  const keys = [...src.matchAll(/^\s*"([a-z0-9_]+(?:\.[a-z0-9_]+)+)":\s*\{/gim)].map(m => m[1]);
  return { t: sandbox.window.ylT, keys, setLang: sandbox.window.ylSetLang, win: sandbox.window };
}

// Parse the { en, zh } pairs directly so both languages can be compared.
function parseEntries() {
  const entries = new Map();
  const dup = [];
  // Entries are one per line. Capture to end-of-line rather than to the first
  // "}" — several values legitimately contain {placeholder} braces, and a
  // brace-terminated body match truncated those entries and reported them as
  // missing when they were perfectly well-formed.
  const re = /^\s*"([a-z0-9_]+(?:\.[a-z0-9_]+)+)":\s*\{(.*)$/gim;
  let m;
  while ((m = re.exec(src))) {
    const key = m[1];
    const body = m[2];
    const en = /(?:^|[,{\s])en:\s*"((?:[^"\\]|\\.)*)"/.exec(body);
    const zh = /(?:^|[,{\s])zh:\s*"((?:[^"\\]|\\.)*)"/.exec(body);
    if (entries.has(key)) dup.push(key);
    entries.set(key, { en: en ? en[1] : undefined, zh: zh ? zh[1] : undefined });
  }
  return { entries, dup };
}

const { entries, dup } = parseEntries();

test("the dictionary parses and is not trivially small", () => {
  assert.ok(entries.size > 250, `only ${entries.size} keys parsed — the parser or the file changed shape`);
});

test("no duplicate keys", () => {
  // A duplicate silently wins over the earlier definition, so the string a
  // developer edits may not be the one that renders.
  assert.deepEqual(dup, [], `duplicated: ${dup.join(", ")}`);
});

test("every key supplies both languages", () => {
  const missingEn = [], missingZh = [];
  for (const [key, v] of entries) {
    if (v.en === undefined) missingEn.push(key);
    if (v.zh === undefined) missingZh.push(key);
  }
  assert.deepEqual(missingEn, [], `missing en: ${missingEn.join(", ")}`);
  assert.deepEqual(missingZh, [], `missing zh: ${missingZh.join(", ")}`);
});

test("no empty values in either language", () => {
  const empty = [];
  for (const [key, v] of entries) {
    if (!String(v.en ?? "").trim()) empty.push(`${key}.en`);
    if (!String(v.zh ?? "").trim()) empty.push(`${key}.zh`);
  }
  assert.deepEqual(empty, [], `empty: ${empty.join(", ")}`);
});

test("no value is just its own key name", () => {
  // ylT falls back to returning the key when lookup fails, so a key-shaped
  // value is indistinguishable from a miss and renders as "common.close".
  const keyish = [];
  for (const [key, v] of entries) {
    for (const lang of ["en", "zh"]) {
      const val = String(v[lang] ?? "").trim();
      if (val === key || /^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/i.test(val)) keyish.push(`${key}.${lang} = "${val}"`);
    }
  }
  assert.deepEqual(keyish, [], `key-shaped values: ${keyish.join(", ")}`);
});

test("interpolation placeholders match across languages", () => {
  // {count}, {max}, {product} … a placeholder present in one language and not
  // the other renders a literal brace to the visitor.
  // Only a placeholder that exists in zh but NOT in en is a defect: nothing
  // would substitute it and a literal "{brace}" would reach the visitor.
  // The reverse is a legitimate translation choice — Chinese carries the unit
  // as an inline measure word, so several zh strings correctly drop {unit}.
  const bad = [], dropped = [];
  for (const [key, v] of entries) {
    const ph = (s) => new Set([...String(s ?? "").matchAll(/\{(\w+)\}/g)].map(m => m[1]));
    const a = ph(v.en), b = ph(v.zh);
    const zhOnly = [...b].filter(x => !a.has(x));
    const enOnly = [...a].filter(x => !b.has(x));
    if (zhOnly.length) bad.push(`${key}: zh uses {${zhOnly.join(",")}} which en never supplies`);
    if (enOnly.length) dropped.push(`${key}: zh omits {${enOnly.join(",")}}`);
  }
  if (dropped.length) {
    console.log(`      note: ${dropped.length} zh string(s) intentionally omit an en placeholder:`);
    dropped.slice(0, 6).forEach(d => console.log(`        ${d}`));
  }
  assert.deepEqual(bad, [], `placeholder would render literally:\n  ${bad.join("\n  ")}`);
});

test("no raw HTML tags inside plain-text entries", () => {
  // These values are written with textContent, so a tag would be shown
  // literally rather than rendered. Keys applied with data-i18n-html are the
  // documented exception (a heading whose copy contains a <br>); the allowlist
  // for those lives in home-about-copy-integrity.test.mjs.
  const htmlKeys = new Set();
  for (const page of ["index.html", "about.html", "products.html", "product-detail.html",
                      "compare.html", "enquiry.html", "contact.html", "404.html"]) {
    const html = fs.readFileSync(new URL(`../frontend/${page}`, import.meta.url), "utf8");
    for (const m of html.matchAll(/data-i18n-html="([a-z0-9_.]+)"/g)) htmlKeys.add(m[1]);
  }
  const tagged = [];
  for (const [key, v] of entries) {
    if (htmlKeys.has(key)) continue;
    for (const lang of ["en", "zh"]) {
      if (/<\/?[a-z][\s\S]*>/i.test(String(v[lang] ?? ""))) tagged.push(`${key}.${lang}`);
    }
  }
  assert.deepEqual(tagged, [], `contains markup but is written with textContent: ${tagged.join(", ")}`);
});

test("Chinese values are actually Chinese where they should be", () => {
  // Catches entries copy-pasted from English and never translated. Values that
  // are legitimately identical across languages (numbers, brand names, symbols)
  // are allowed through by requiring at least one Latin letter to flag.
  const untranslated = [];
  for (const [key, v] of entries) {
    const en = String(v.en ?? "").trim();
    const zh = String(v.zh ?? "").trim();
    if (!en || !zh) continue;
    const hasHan = /[一-鿿]/.test(zh);
    const enHasLetters = /[a-z]{3,}/i.test(en);
    if (enHasLetters && !hasHan && zh === en) untranslated.push(`${key} = "${zh}"`);
  }
  // Reported rather than hard-failed: some entries are intentionally identical
  // (brand names, "OEM", "SG"). Keep the list visible so it cannot grow unseen.
  if (untranslated.length) {
    console.log(`      note: ${untranslated.length} entries identical in both languages:`);
    untranslated.slice(0, 12).forEach(u => console.log(`        ${u}`));
  }
  assert.ok(untranslated.length < 20,
    `${untranslated.length} untranslated entries is too many:\n  ${untranslated.join("\n  ")}`);
});

test("ylT never returns undefined and falls back to English", () => {
  const { t } = loadDict();
  assert.equal(typeof t, "function");
  for (const key of [...entries.keys()].slice(0, 40)) {
    const v = t(key);
    assert.ok(typeof v === "string" && v.length, `${key} returned ${v}`);
  }
  assert.equal(t("definitely.not.a.real.key"), "definitely.not.a.real.key",
    "an unknown key must return the key, which the raw-key UI tests then catch");
});

test("Home and About keys are present for both languages", () => {
  // These pages were brought into the i18n system in this pass; a gap here
  // would show as English text on an otherwise Chinese page.
  const home = [...entries.keys()].filter(k => k.startsWith("home."));
  const about = [...entries.keys()].filter(k => k.startsWith("about."));
  assert.ok(home.length >= 25, `only ${home.length} home.* keys`);
  assert.ok(about.length >= 20, `only ${about.length} about.* keys`);
  for (const k of [...home, ...about]) {
    assert.ok(entries.get(k).en && entries.get(k).zh, `${k} incomplete`);
  }
});

test("switching language runs as a Swup visit, not a page reload", () => {
  // The switch used to call window.location.reload() — a hard refresh, the last
  // one on the site. It is now a Swup visit to the current URL, which gives it
  // the same cross-fade as any page change. That transition is intended: the
  // page genuinely is re-rendering, and showing it reads better than the copy
  // silently mutating under the reader.
  const setLang = /window\.ylSetLang = function[\s\S]*?\n  \};/.exec(src)[0];
  assert.match(setLang, /swup\.navigate\(window\.location\.href, \{ history: "replace" \}\)/,
    "re-render the current URL; replace history so Back still leaves the page");
  assert.match(setLang, /window\.ylLang = lang;/, "language must be live before anything re-renders");
  assert.match(setLang, /window\.scrollTo\(0, y\)/,
    "the transition is wanted; being thrown to the top of the page is not");
  assert.match(setLang, /window\.ylApplyI18n\(document\)/,
    "the navbar and footer sit outside #swup and must be retranslated");
  assert.match(setLang, /ylSyncNavLang\(\)/, "flip the switcher itself");
  // A reload survives only as the fallback where Swup is absent (the 404 page).
  assert.match(setLang, /if \(!swup \|\| typeof swup\.navigate !== "function"\) \{\s*\n\s*window\.location\.reload\(\);/,
    "reload only as a fallback");
});

test("applying i18n in English restores the original copy in place", () => {
  // The engine used to `return` whenever the language was not Chinese, on the
  // assumption that English IS the markup. True on a cold load; false once the
  // language can change without one — switching back found no English left.
  assert.doesNotMatch(src, /if \(window\.ylLang !== "zh"\) return;/,
    "the early return made English a one-way trip");
  // The restore itself is asserted by the dictionary-source-of-truth test
  // below; a DOM snapshot alone is NOT a valid restore for JS-built markup.
  assert.match(src, /el\.textContent = \(en !== undefined\) \? en : el\.dataset\.i18nEn;/,
    "restore from the dictionary, falling back to the snapshot only if absent");
});

test("restoring English reads the dictionary, never a DOM snapshot", () => {
  // FIELD BUG: the English restore cached el.textContent on first run and
  // treated it as "the original English". For JS-built markup (navbar, footer,
  // advisor) that snapshot is whatever language the page was BUILT in — so a
  // page loaded in Chinese cached Chinese as its English, and switching to
  // English faithfully restored Chinese. The result was a Chinese navbar над
  // English page content. The dictionary is the source of truth.
  assert.match(src, /window\.ylTEn = function \(key\)/, "an English-specific lookup must exist");
  assert.match(src, /var en = window\.ylTEn\(key\);\s*\n\s*el\.textContent = \(en !== undefined\) \? en : el\.dataset\.i18nEn;/,
    "dictionary first, DOM snapshot only as a fallback");
  assert.match(src, /var enAttr = window\.ylTEn\(key\);/, "same rule for translated attributes");
});

test("every JS-built shell component can retranslate in place", () => {
  // Anything interpolating a translation at build time AND living outside #swup
  // needs data-i18n, or it is frozen in the language the page was loaded in.
  const nav = fs.readFileSync(new URL("../frontend/js/widgets/navbar.js", import.meta.url), "utf8");
  const foot = fs.readFileSync(new URL("../frontend/js/widgets/footer.js", import.meta.url), "utf8");
  const chat = fs.readFileSync(new URL("../frontend/js/widgets/chatbot.js", import.meta.url), "utf8");

  // the mobile drawer duplicates the desktop links and was missed the first time
  const drawer = /drawerEl\.innerHTML = links\.map[\s\S]{0,240}?\.join\(""\);/.exec(nav)[0];
  assert.match(drawer, /data-i18n="\$\{l\.key\}"/, "mobile drawer links need keys too");

  for (const [name, code] of [["footer.js", foot], ["chatbot.js", chat]]) {
    const used = [...new Set([...code.matchAll(/\$\{(?:T|cbT)\("([a-z0-9_.]+)"/g)].map(m => m[1]))];
    // data-i18n-attr may carry SEVERAL pairs in one attribute
    // ("aria-label:a.b,placeholder:c.d"), so collect every key, not just the first.
    const tagged = [
      ...[...code.matchAll(/data-i18n="([a-z0-9_.]+)"/g)].map(m => m[1]),
      ...[...code.matchAll(/data-i18n-attr="([^"]+)"/g)]
        .flatMap(m => m[1].split(",").map(pair => (pair.split(":")[1] || "").trim())),
    ];
    const missing = used.filter(k => !tagged.includes(k));
    assert.deepEqual(missing, [],
      `${name}: these render a translation with no data-i18n, so they freeze at build-time language:\n  ${missing.join("\n  ")}`);
  }
});

test("the persistent navbar can retranslate without being rebuilt", () => {
  const nav = fs.readFileSync(new URL("../frontend/js/widgets/navbar.js", import.meta.url), "utf8");
  // Nav labels are interpolated at build time, so without data-i18n only a full
  // reload could change their language — and the navbar sits outside #swup.
  assert.match(nav, /data-i18n="\$\{l\.key\}"/, "nav links carry their key");
  assert.match(nav, /data-i18n="nav\.enquiry"/);
  assert.match(nav, /window\.ylSyncNavLang = function/,
    "the switcher advertises the OTHER language, so it must be flipped imperatively");
  const pt = fs.readFileSync(new URL("../frontend/js/widgets/page-transitions.js", import.meta.url), "utf8");
  assert.match(pt, /window\.ylApplyI18n\(document\)/, "document scope reaches the shell");
  assert.match(pt, /window\.ylSyncNavLang\(\)/);
});

test("no render-time label is frozen at script-load language", () => {
  // A module-level `const X = ylTr(...)` captures whatever language was active
  // the one time the script ran. Invisible while switching reloaded the page;
  // a stale label the moment it stopped.
  const files = ["js/pages/products.js", "js/pages/product-detail.js",
                 "js/pages/compare-page.js", "js/pages/enquiry.js", "js/widgets/compare.js"];
  const frozen = [];
  for (const f of files) {
    const code = fs.readFileSync(new URL(`../frontend/${f}`, import.meta.url), "utf8");
    for (const m of code.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(.*)$/gm)) {
      const [, name, rhs] = m;
      // A function expression is fine — it re-reads the language on every call.
      // Only an immediately-evaluated lookup freezes a value.
      if (/^\s*(?:function\b|\(|[A-Za-z_$][\w$]*\s*=>)/.test(rhs)) continue;
      if (/\b(?:ylTr|ylT|cmpT|cmpTf)\s*\(/.test(rhs)) frozen.push(`${f}: ${name}`);
    }
  }
  assert.deepEqual(frozen, [],
    `these capture a translation at load time and must become functions:\n  ${frozen.join("\n  ")}`);
});

test("no render path emits a hardcoded English string the dictionary can translate", () => {
  // FIELD BUG: the Downloads tab's WhatsApp button was the literal text
  // "Talk to Yee Lim" — it never went through the translator at all, so it sat
  // in English in the middle of Chinese copy. Its sibling used ylTr but carried
  // no data-i18n, so it froze at build-time language. Both are now wired.
  const english = new Map();
  for (const [key, v] of entries) {
    const en = String(v.en ?? "").trim();
    if (en.length >= 8 && !en.includes("{")) english.set(en, key);
  }
  const files = ["js/pages/product-detail.js", "js/pages/products.js",
                 "js/pages/compare-page.js", "js/pages/enquiry.js", "js/widgets/compare.js"];
  const offenders = [];
  for (const f of files) {
    const code = fs.readFileSync(new URL(`../frontend/${f}`, import.meta.url), "utf8");
    const lines = code.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Only template-literal markup lines; skip comments and ylTr fallbacks,
      // which are legitimate (the key is right there beside them).
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
      if (/ylTr\(|cmpT\(|cmpTf\(|eqT\(|cbT\(|data-i18n/.test(line)) continue;
      // A `ylLang === "zh" ? … : …` block IS translated; its English branch just
      // happens to sit on a later line. Look back for the guard before flagging.
      if (lines.slice(Math.max(0, i - 14), i).some(l => /ylLang\s*===\s*"zh"/.test(l))) continue;
      for (const [en, key] of english) {
        if (line.includes(">" + en + "<") || new RegExp("^\\s*" + en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$").test(line)) {
          offenders.push(`${f}: "${en}" (key ${key})`);
        }
      }
    }
  }
  assert.deepEqual(offenders, [],
    `hardcoded English that has a translation:\n  ${offenders.join("\n  ")}`);
});

test("the Product Advisor preserves its conversation on a language change", () => {
  // Original user and assistant messages are content, not chrome: they remain
  // in their original language while controls retranslate and future requests
  // use the newly selected website language.
  const chat = fs.readFileSync(new URL("../frontend/js/widgets/chatbot.js", import.meta.url), "utf8");
  assert.match(chat, /window\.ylAdvisorLanguageChanged = function/);
  const handler = /window\.ylAdvisorLanguageChanged\s*=\s*function[\s\S]*?\n\s*\};/.exec(chat)?.[0] || "";
  assert.doesNotMatch(handler, /replaceChildren\(|messages\.(?:textContent|innerHTML)\s*=/,
    "language switching must not clear or regenerate the transcript");
  assert.match(handler, /advisorState\.interfaceLanguage\s*=\s*advisorLanguage\(\)/,
    "record the new interface language without changing conversation content");
  assert.match(chat, /const requestLanguage\s*=\s*advisorLanguage\(\)/,
    "capture the live website language for each request");
  assert.match(chat, /language:\s*requestLanguage/,
    "future API requests must send the captured live website language");
  assert.match(src, /if \(typeof window\.ylAdvisorLanguageChanged === "function"\) window\.ylAdvisorLanguageChanged\(\);/,
    "the language switch must call it");
});

test("no element is owned by both the settings injector and i18n", () => {
  // FIELD BUG: the contact email link carried data-yl-email (app.js writes the
  // real address in at runtime) AND data-i18n (writes a translated phrase).
  // Both set textContent, so whichever ran last won: English showed the
  // address, Chinese replaced it with the phrase, and coming back to English
  // left the phrase — the address vanished entirely.
  // Contact details are DATA, identical in every language. One owner only.
  const pages = ["index.html", "about.html", "products.html", "product-detail.html",
                 "compare.html", "enquiry.html", "contact.html", "404.html"];
  const clashes = [];
  for (const page of pages) {
    const html = fs.readFileSync(new URL(`../frontend/${page}`, import.meta.url), "utf8")
      .replace(/<!--[\s\S]*?-->/g, "");   // comments quote the markup they replaced
    for (const tag of html.matchAll(/<[a-z][^>]*>/gi)) {
      const t = tag[0];
      // data-yl-email/address take a "text" mode that rewrites textContent;
      // data-yl-wa/phone only rewrite href/text via the same pass.
      const writesText = /data-yl-(email|address|phone)\b/.test(t);
      if (writesText && /data-i18n="/.test(t)) {
        clashes.push(`${page}: ${t.slice(0, 110)}`);
      }
    }
  }
  assert.deepEqual(clashes, [],
    `these elements have two owners writing textContent:\n  ${clashes.join("\n  ")}`);
});

test("every data-i18n attribute in the public pages resolves to a real key", () => {
  // The other direction: markup asking for a key that does not exist renders
  // the raw key string to the visitor.
  const pages = ["index.html", "about.html", "products.html", "product-detail.html",
                 "compare.html", "enquiry.html", "contact.html"];
  const missing = [];
  for (const page of pages) {
    const html = fs.readFileSync(new URL(`../frontend/${page}`, import.meta.url), "utf8");
    const used = new Set();
    for (const m of html.matchAll(/data-i18n="([^"]+)"/g)) used.add(m[1]);
    for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
      m[1].split(",").forEach(pair => {
        const key = (pair.split(":")[1] || "").trim();
        if (key) used.add(key);
      });
    }
    for (const key of used) if (!entries.has(key)) missing.push(`${page}: ${key}`);
  }
  assert.deepEqual(missing, [], `markup references undefined keys:\n  ${missing.join("\n  ")}`);
});
