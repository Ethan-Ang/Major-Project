// Safety net: ylEscapeHtml is defined in data.js. If a stale cached data.js is
// served (its ?v= was not bumped after a change), fall back to a local escaper
// and warn, so the page still renders instead of throwing a ReferenceError.
if (typeof window !== "undefined" && typeof window.ylEscapeHtml !== "function") {
  window.ylEscapeHtml = function (s) {
    if (!window.__ylHelperWarned) {
      console.warn("[Yee Lim] ylEscapeHtml missing from data.js (stale cache?). Using fallback. Bump the ?v= on data.js and redeploy.");
      window.__ylHelperWarned = true;
    }
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
}

function comparePageCopy(lang) {
  const copy = {
    en: {
      heading: "Products to compare",
      add: "Add a product",
      search: "Search or browse",
      compareNow: "Compare now",
      clearAll: "Clear all",
      swipe: "Swipe to compare all {count} products",
      rotateTitle: "Rotate for the full comparison",
      rotateBody: "Turn your phone to landscape to see the products side by side with more room and the full controls. You can still swipe the table in portrait.",
      gotIt: "Got it",
      closeHint: "Dismiss",
      remove: "Remove {product} from comparison",
      notSpecified: "Not specified",
      emptyTitle: "Add at least 2 products to compare",
      emptyBody: "Browse the catalogue and click + Compare on the cards you want to compare side by side.",
      emptyAction: "+ Compare",
      browseProducts: "Browse Products",
      productLabel: "Product",
      disclaimer: "Product information is provided for general guidance only. Contact Yee Lim for full technical details."
    },
    zh: {
      heading: "待对比产品",
      add: "添加产品",
      search: "搜索或浏览",
      compareNow: "立即对比",
      clearAll: "清除全部",
      swipe: "滑动查看全部 {count} 款产品",
      rotateTitle: "横屏查看完整对比",
      rotateBody: "请将手机旋转至横屏，以便并排查看产品及完整控制项。竖屏下仍可滑动表格。",
      gotIt: "知道了",
      closeHint: "关闭提示",
      remove: "从对比中移除 {product}",
      notSpecified: "未提供",
      emptyTitle: "请至少添加 2 款产品进行对比",
      emptyBody: "浏览产品目录，并在需要并排对比的产品卡片上点击“+ 对比”。",
      emptyAction: "+ 对比",
      browseProducts: "浏览产品",
      productLabel: "产品",
      disclaimer: "产品信息仅供一般参考。如需完整技术资料，请联系 Yee Lim。"
    }
  };
  return lang === "zh" ? copy.zh : copy.en;
}

function formatComparePageCopy(template, replacements) {
  const values = replacements !== null && typeof replacements === "object"
    ? replacements
    : { count: replacements };
  return String(template).replace(/\{([a-z][a-zA-Z0-9]*)\}/g, function (match, key) {
    return Object.prototype.hasOwnProperty.call(values, key)
      ? String(values[key])
      : match;
  });
}

function emphasizeComparePageAction(body, action) {
  const text = String(body);
  const label = String(action);
  if (!label) return text;
  return text.replace(label, "<strong>" + label + "</strong>");
}

// Loading skeleton (catalogue shimmer style) while product data is fetched.
function renderCompareSkeleton() {
  const content = document.getElementById("comparePageContent");
  if (!content) return;
  content.classList.add("is-loading");
  renderCompareSelectSkeleton();
  const col = '<div aria-hidden="true">' +
    '<div class="skeleton-img" style="border-radius:8px;aspect-ratio:1/1"></div>' +
    '<div class="skeleton-line skeleton-line-title" style="margin-top:0.75rem"></div>' +
    '<div class="skeleton-line skeleton-line-mid"></div>' +
    '<div class="skeleton-line"></div></div>';
  content.innerHTML =
    '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.5rem;max-width:640px">' +
    col + col + '</div>';
}

// Reserve the real selection panel's responsive geometry before catalogue data
// arrives. The count is the visitor's actual local selection; neutral shimmer
// blocks stand in for product content and controls without inventing data.
function renderCompareSelectSkeleton() {
  const el = document.getElementById("compareSelectPanel");
  if (!el) return;
  const copy = comparePageCopy(window.ylLang);
  el.setAttribute("aria-label", copy.heading);
  const count = Math.min(COMPARE_MAX, getCompareList().length);
  if (!count) { el.hidden = true; el.innerHTML = ""; return; }
  el.hidden = false;
  const slotCount = count + (count < COMPARE_MAX ? 1 : 0);
  const slots = Array.from({ length: slotCount }, () => `
    <div class="csel-card csel-skeleton" aria-hidden="true">
      <span class="csel-img skeleton-line"></span>
      <span class="csel-text">
        <span class="skeleton-line skeleton-line-short"></span>
        <span class="skeleton-line skeleton-line-title"></span>
      </span>
    </div>`).join("");
  el.innerHTML = `
    <div class="csel-head">${copy.heading} (${count}/${COMPARE_MAX})</div>
    <div class="csel-body">
      <div class="csel-row">${slots}</div>
      <div class="csel-actions csel-skeleton-actions" aria-hidden="true">
        <span class="skeleton-line"></span><span class="skeleton-line"></span>
      </div>
    </div>`;
}

// Re-runnable across Swup swaps: registered via ylReady, self-selecting on the
// compare content anchor. The catalogue fetch is reused for the session.
function initComparePage() {
  const content = document.getElementById("comparePageContent");
  if (!content) return;

  if (PRODUCTS && PRODUCTS.length) {
    renderComparePage();
  } else {
    renderCompareSkeleton();
    loadProductsFromBackend()
      .catch(err => console.error(err))
      .finally(renderComparePage);
  }

  // Registered once for the app's lifetime; renderComparePage no-ops when the
  // compare content anchor is absent, so these are safe on other pages.
  ylOnce("compare:listeners", () => {
    window.addEventListener("compareUpdated", renderComparePage);
    window.addEventListener("resize", updateCompareScrollHint);
    window.addEventListener("resize", syncCompareRotateHint);
    window.addEventListener("orientationchange", syncCompareRotateHint);
  });
}
ylReady(initComparePage);

// Shared brand-monogram label (uppercased, trademark suffix collapsed) used
// for image-fallback thumbnails in both the header cards and the selection panel.
function cxBrandLabel(brand) {
  return ylEscapeHtml(brand.replace(/™ Brand$/, "™").replace(/™$/, "").toUpperCase());
}

// "Products to compare (n/3)" header panel: one card per product, an add
// slot below 3, and the grouped actions. Mirrors the bottom drawer.
function renderSelectPanel(products) {
  const el = document.getElementById("compareSelectPanel");
  if (!el) return;
  const copy = comparePageCopy(window.ylLang);
  el.setAttribute("aria-label", copy.heading);
  if (!products.length) { el.hidden = true; el.innerHTML = ""; return; }
  el.hidden = false;

  const subtype = p => (typeof productSubtype === "function") ? productSubtype(p) : (p.category || "");

  const cards = products.map(p => {
    const brandLabel = cxBrandLabel(p.brand);
    const hasImg = p.images && p.images.length > 0;
    const img = hasImg
      ? `<img src="${encodeURI(p.images[0])}" alt="" loading="lazy" onerror="ylImageFallback(this,'${brandLabel}')">`
      : `<span class="no-image-mark" aria-hidden="true">${brandLabel}</span>`;
    return `
      <div class="csel-card">
        <span class="csel-img">${img}</span>
        <span class="csel-text">
          <span class="csel-brand">${ylEscapeHtml(brandDisplay(p.brand))}</span>
          <span class="csel-name">${ylEscapeHtml(p.name)}</span>
          <span class="csel-sub">${ylEscapeHtml(window.ylTerm ? window.ylTerm(subtype(p)) : subtype(p))}</span>
        </span>
        <button class="csel-x" onclick="toggleCompare('${p.id}')" aria-label="${formatComparePageCopy(copy.remove, { product: ylEscapeHtml(p.name) })}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`;
  }).join("");

  // Add/Search slot only below 3/3 — completely removed at the cap. Opens the
  // dedicated compare picker (side panel), not a jump back to the catalogue.
  const addSlot = products.length < COMPARE_MAX
    ? `<button class="csel-card csel-add" type="button" onclick="ylCompareAddMore()"><span class="csel-add-icon" aria-hidden="true">+</span><span class="csel-add-text"><strong>${copy.add}</strong><small>${copy.search}</small></span></button>`
    : "";

  el.innerHTML = `
    <div class="csel-head">${copy.heading} (${products.length}/3)</div>
    <div class="csel-body">
      <div class="csel-row">${cards}${addSlot}</div>
      <div class="csel-actions">
        <a class="btn btn-primary csel-compare" href="#comparePageContent">${copy.compareNow}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
        <button class="compare-page-clear" onclick="clearAll()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          ${copy.clearAll}
        </button>
      </div>
    </div>`;
}

function renderComparePage() {
  const list     = getCompareList();
  const products = list.map(id => PRODUCTS.find(p => String(p.id) === String(id))).filter(Boolean);
  const content  = document.getElementById("comparePageContent");
  if (!content) return;
  const copy = comparePageCopy(window.ylLang);
  content.classList.remove("is-loading");

  // The selection panel tracks the raw compare list (0-3 products); it is
  // independent of the "need 2+ to compare" gate below.
  renderSelectPanel(products);

  if (products.length < 2) {
    content.innerHTML = `
      <div class="empty-state">
        <h2>${copy.emptyTitle}</h2>
        <p>${emphasizeComparePageAction(copy.emptyBody, copy.emptyAction)}</p>
        <a href="/products" class="btn btn-primary" style="display:inline-flex;margin-top:1.25rem">${copy.browseProducts}</a>
      </div>`;
    syncCompareRotateHint();
    return;
  }

  const subtype = p => (typeof productSubtype === "function") ? productSubtype(p) : (p.category || "");

  const headerCols = products.map(p => {
    const brandLabel  = cxBrandLabel(p.brand);
    const placeholderSub = ylEscapeHtml(window.ylTerm ? window.ylTerm((p.category && p.category !== "Others") ? p.category : "Adhesive Solution") : ((p.category && p.category !== "Others") ? p.category : "Adhesive Solution"));
    const hasRealImage = p.images && p.images.length > 0;
    const imgContent = hasRealImage
      ? `<img src="${encodeURI(p.images[0])}" alt="${ylEscapeHtml(p.name)}" loading="lazy" onerror="ylImageFallback(this,'${brandLabel}')">`
      : `<span class="compare-img-placeholder">${brandLabel}</span><span class="compare-img-placeholder-sub">${placeholderSub}</span>`;
    return `
      <td class="compare-col-header">
        <div class="compare-col-inner">
          <button class="compare-col-x" type="button" onclick="toggleCompare('${p.id}')" aria-label="${formatComparePageCopy(copy.remove, { product: ylEscapeHtml(p.name) })}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div class="compare-product-img">
            ${imgContent}
          </div>
          <div class="compare-product-brand">${ylEscapeHtml(brandDisplay(p.brand))}</div>
          <a class="compare-product-name" href="/product-detail?id=${encodeURIComponent(p.id)}">${ylEscapeHtml(p.name)}</a>
          <div class="compare-product-sub">${ylEscapeHtml(window.ylTerm ? window.ylTerm(subtype(p)) : subtype(p))}</div>
        </div>
      </td>`;
  }).join("");

  // Real comparison fields only; a missing value renders as an em dash.
  const EMPTY = `<span class="compare-empty-val" aria-label="${copy.notSpecified}">&mdash;</span>`;
  const text = v => (v && String(v).trim()) ? ylEscapeHtml(String(v).trim()) : EMPTY;
  // Chinese: translate each data value; join lists with the full-width comma.
  const termOf = window.ylTerm || (x => x);
  const joinSep = (window.ylLang === "zh") ? "，" : ", ";
  const listVals = arr => (arr && arr.length) ? ylEscapeHtml(arr.map(termOf).join(joinSep)) : EMPTY;
  // The real "Suitable for" method segment of the usage field, when present.
  const methodOf = p => {
    const usage = String(p.usage || "").trim();
    if (!usage || /^(x+|-+|\.+|n\/?a|tbd|none|null)$/i.test(usage)) return "";
    const m = usage.match(/suitable for\s*:\s*/i);
    return (m ? usage.slice(0, m.index) : usage).trim();
  };
  const check = `<span class="compare-check" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>`;
  const icon = d => `<span class="compare-label-ic" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg></span>`;

  const ylTr = function (key, fb) { return (window.ylLang === "zh" && window.ylT) ? (window.ylT(key) || fb) : fb; };
  const specRows = [
    { label: ylTr("common.best_for", "Best for"),
      ic: icon('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>'),
      render: p => listVals(p.industries) },
    { label: ylTr("spec.surfaces", "Surface / Material"),
      ic: icon('<polygon points="12 2 22 8.5 12 15 2 8.5 12 2"/><polyline points="2 13 12 19.5 22 13"/>'),
      render: p => listVals(p.surfaces) },
    { label: ylTr("spec.app_method", "Application Method"),
      ic: icon('<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>'),
      render: p => text(termOf(methodOf(p))) },
    { label: ylTr("compare.category", "Category"),
      ic: icon('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>'),
      render: p => text(termOf(p.category === "Others" ? "Application Equipment" : p.category)) },
    { label: ylTr("compare.key_features", "Key Features"),
      ic: icon('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
      render: p => p.features.length
        ? p.features.map(f => `<div class="compare-feature">${check}${ylEscapeHtml(termOf(f))}</div>`).join("")
        : EMPTY }
  ].map(row => `
    <tr>
      <td class="compare-row-label"><span class="compare-label-wrap">${row.ic}<span>${row.label}</span></span></td>
      ${products.map(p => `<td class="compare-row-value">${row.render(p)}</td>`).join("")}
    </tr>`).join("");

  // Single comparison table at every breakpoint: .cx-scroll makes it
  // horizontally scrollable on narrow viewports while the sticky
  // .compare-row-label column (see products.css) keeps row labels in view.
  // The inline min-width gives each product column room (~220px) so 2-3
  // products scroll cleanly on a phone instead of being crushed flat.
  const minTableWidth = 150 + products.length * 220;

  content.innerHTML = `
    <div class="cx-scrollhint" id="cxScrollHint" hidden>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
      ${formatComparePageCopy(copy.swipe, products.length)}
    </div>
    <div class="compare-page-table-wrap cx-scroll">
      <table class="compare-table" style="min-width:${minTableWidth}px">
        <colgroup>
          <col class="compare-label-col">
          ${products.map(() => "<col>").join("")}
        </colgroup>
        <thead>
          <tr>
            <td class="compare-row-label compare-corner">${copy.productLabel}</td>
            ${headerCols}
          </tr>
        </thead>
        <tbody>
          ${specRows}
        </tbody>
      </table>
    </div>
    <p class="compare-disclaimer">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      ${copy.disclaimer}
    </p>`;

  // Measure after layout so the swipe hint only appears when columns overflow.
  requestAnimationFrame(updateCompareScrollHint);
  syncCompareRotateHint();
}

// Show the swipe hint only when the product columns actually overflow the
// viewport (2-3 products at phone widths). Fades out once the user reaches
// the end of the scroll so it does not nag.
function updateCompareScrollHint() {
  const sc   = document.querySelector(".cx-scroll");
  const hint = document.getElementById("cxScrollHint");
  if (!sc || !hint) return;
  hint.hidden = !(sc.scrollWidth > sc.clientWidth + 4);
  sc.onscroll = () => {
    const atEnd = sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 8;
    hint.style.opacity = atEnd ? "0" : "1";
  };
}

function clearAll() {
  clearCompare();
}

// ── Compare rotate hint (mobile portrait) ────────────────────────
// A wide side-by-side table reads far better in landscape (Canyon does the
// same). On a portrait phone with 2+ products we surface a one-time,
// dismissible prompt — never a blocker: the table is still swipeable in
// portrait, and full add/clear controls return in landscape.
const CMP_PORTRAIT = (typeof window !== "undefined" && window.matchMedia)
  ? window.matchMedia("(max-width: 640px) and (orientation: portrait)")
  : null;

function compareRotateDismissed() {
  try { return sessionStorage.getItem("ylCompareRotateHint") === "dismissed"; }
  catch (e) { return false; }
}

function dismissCompareRotateHint() {
  try { sessionStorage.setItem("ylCompareRotateHint", "dismissed"); } catch (e) {}
  const el = document.getElementById("compareRotateHint");
  if (el) el.remove();
  document.body.classList.remove("cmp-rotate-open");
}

function syncCompareRotateHint() {
  const onComparePage = !!document.getElementById("comparePageContent");
  const hasTable = getCompareList().length >= 2;
  const portrait = CMP_PORTRAIT ? CMP_PORTRAIT.matches : false;
  const existing = document.getElementById("compareRotateHint");

  if (!(onComparePage && hasTable && portrait && !compareRotateDismissed())) {
    if (existing) existing.remove();
    document.body.classList.remove("cmp-rotate-open");
    return;
  }
  if (existing) return;

  const copy = comparePageCopy(window.ylLang);
  const el = document.createElement("div");
  el.id = "compareRotateHint";
  el.className = "cmp-rotate";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-labelledby", "cmpRotateTitle");
  el.innerHTML = `
    <div class="cmp-rotate-backdrop" onclick="dismissCompareRotateHint()"></div>
    <div class="cmp-rotate-card">
      <button class="cmp-rotate-x" type="button" onclick="dismissCompareRotateHint()" aria-label="${copy.closeHint}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <span class="cmp-rotate-ic" aria-hidden="true">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="14" height="10" rx="2"/><path d="M19 9l3 3-3 3"/><path d="M13 12h9"/></svg>
      </span>
      <h2 id="cmpRotateTitle" class="cmp-rotate-title">${copy.rotateTitle}</h2>
      <p class="cmp-rotate-text">${copy.rotateBody}</p>
      <button class="btn btn-primary cmp-rotate-ok" type="button" onclick="dismissCompareRotateHint()">${copy.gotIt}</button>
    </div>`;
  document.body.appendChild(el);
  document.body.classList.add("cmp-rotate-open");
}
// showToast now lives in js/core/app.js (shared).
