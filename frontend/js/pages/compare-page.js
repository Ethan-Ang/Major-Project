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
      compareHint: "Select at least 2 products to compare",
      selectHint: "Add {count} more product to start comparing.",
      clearAll: "Clear all",
      swipe: "Swipe to compare all {count} products",
      rotateTitle: "Rotate for the full comparison",
      rotateBody: "Turn your phone to landscape to see the products side by side with more room and the full controls. You can still swipe the table in portrait.",
      gotIt: "Got it",
      closeHint: "Dismiss",
      remove: "Remove {product} from comparison",
      notSpecified: "Not specified",
      emptyTitle: "Compare products side by side",
      emptyBody: "Add two or three products to compare their key specifications in one table.",
      emptyTitleOne: "One more product to compare",
      emptyBodyOne: "You have 1 of the 2 products needed. Add another and the comparison table appears here.",
      emptyNote: "Up to 3 products at a time.",
      emptyPreview: "What you will compare",
      addProducts: "Add Products",
      browseCatalogue: "Browse Catalogue",
      productLabel: "Product",
      caption: "Side-by-side comparison of {count} products. Each column is a product; each row is a specification.",
      disclaimer: "Product information is provided for general guidance only. Contact Yee Lim for full technical details."
    },
    zh: {
      heading: "待对比产品",
      add: "添加产品",
      search: "搜索或浏览",
      compareNow: "立即对比",
      compareHint: "请至少选择 2 款产品进行对比",
      selectHint: "再添加 {count} 款产品即可开始对比。",
      clearAll: "清除全部",
      swipe: "滑动查看全部 {count} 款产品",
      rotateTitle: "横屏查看完整对比",
      rotateBody: "请将手机旋转至横屏，以便并排查看产品及完整控制项。竖屏下仍可滑动表格。",
      gotIt: "知道了",
      closeHint: "关闭提示",
      remove: "从对比中移除 {product}",
      notSpecified: "未提供",
      emptyTitle: "并排对比产品",
      emptyBody: "添加 2 至 3 款产品，即可在同一张表格中对照关键规格。",
      emptyTitleOne: "还差一款产品即可开始对比",
      emptyBodyOne: "已选择 1 款，至少需要 2 款。再添加一款，对比表格即会显示在此处。",
      emptyNote: "每次最多对比 3 款产品。",
      emptyPreview: "可对比的内容",
      addProducts: "添加产品",
      browseCatalogue: "浏览产品目录",
      productLabel: "产品",
      caption: "{count} 款产品并排对比。每一列为一款产品，每一行为一项规格。",
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
  el.classList.toggle("csel-solo", count < 2);
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

// The comparison table's row labels and their icons, in table order. Shared by
// the real table and the empty state's preview sketch, so the preview can never
// promise a row the table does not actually have.
function compareSpecMeta() {
  const ylTr = function (key, fb) { return (window.ylLang === "zh" && window.ylT) ? (window.ylT(key) || fb) : fb; };
  const icon = d => `<span class="compare-label-ic" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg></span>`;
  return [
    { key: "industries", label: ylTr("common.best_for", "Best for"),
      ic: icon('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>') },
    { key: "surfaces", label: ylTr("spec.surfaces", "Surface / Material"),
      ic: icon('<polygon points="12 2 22 8.5 12 15 2 8.5 12 2"/><polyline points="2 13 12 19.5 22 13"/>') },
    { key: "method", label: ylTr("spec.app_method", "Application Method"),
      ic: icon('<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>') },
    { key: "category", label: ylTr("compare.category", "Category"),
      ic: icon('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>') },
    // Named "Key Benefits" to match the product detail page. The same data used
    // to appear as "Key Features" here, "Key Benefits" there and
    // "Characteristics" in the spec table, which read as three different things.
    { key: "features", label: ylTr("detail.key_benefits", "Key Benefits"),
      ic: icon('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>') }
  ];
}

// Under two products there is no table to draw, and the page used to be three
// centred lines adrift in an empty canvas. This is the same information in a
// real panel: what the page does, the two ways to fill it, and a decorative
// sketch of the table's shape (row labels are the real ones; the value cells
// are neutral bars, never invented data) so the layout reads as waiting for a
// selection rather than as unfinished.
function renderCompareEmptyState(products, copy) {
  const one = products.length === 1;
  const title = one ? copy.emptyTitleOne : copy.emptyTitle;
  const body  = one ? copy.emptyBodyOne : copy.emptyBody;
  // Zero selected is the only state with actions of its own, because the
  // selection panel (and its add slot) is not rendered at all. Two intents, in
  // hierarchy: the primary opens the SAME picker the add slot opens, for anyone
  // who already knows roughly what they want; the outlined secondary goes to
  // the catalogue for anyone who wants to filter and read detail pages first.
  // From one product on, the add slot is the add interaction, so neither is
  // repeated down here.
  const actions = one ? "" : `
        <div class="cmp-empty-actions">
          <button type="button" class="btn btn-primary" onclick="ylCompareAddMore()">${copy.addProducts}</button>
          <a href="/products" class="btn btn-outline">${copy.browseCatalogue}</a>
        </div>`;
  // Bar widths differ per row so the sketch reads as content, not as a loading
  // skeleton (which shimmers and is uniform).
  const barWidths = [["78%", "62%"], ["58%", "84%"], ["70%", "52%"], ["46%", "66%"], ["88%", "72%"]];
  const rows = compareSpecMeta().map((row, i) => `
    <div class="cmp-ghost-row">
      <span class="cmp-ghost-label">${row.ic}<span>${row.label}</span></span>
      <span class="cmp-ghost-cell"><span class="cmp-ghost-bar" style="width:${barWidths[i][0]}"></span></span>
      <span class="cmp-ghost-cell"><span class="cmp-ghost-bar" style="width:${barWidths[i][1]}"></span></span>
    </div>`).join("");

  // .cmp-empty-one is hidden on portrait phones, where the selection panel above
  // is on screen and carries the one-line hint instead. The zero-product panel
  // has no such counterpart (the selection panel is hidden with nothing picked),
  // so it stays at every width or the page would be empty under its heading.
  return `
    <div class="cmp-empty${one ? " cmp-empty-one" : ""}">
      <div class="cmp-empty-copy">
        <span class="cmp-empty-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="7" height="16" rx="1"/><rect x="14" y="4" width="7" height="16" rx="1"/></svg>
        </span>
        <h2>${title}</h2>
        <p>${body}</p>${actions}
        <p class="cmp-empty-note">${copy.emptyNote}</p>
      </div>
      <div class="cmp-empty-preview" aria-hidden="true">
        <p class="cmp-empty-preview-cap">${copy.emptyPreview}</p>
        <div class="cmp-ghost">
          <div class="cmp-ghost-row cmp-ghost-head">
            <span class="cmp-ghost-label cmp-ghost-corner">${copy.productLabel}</span>
            <span class="cmp-ghost-slot${one ? " is-filled" : ""}">${one ? `<span class="cmp-ghost-slot-name">${ylEscapeHtml(products[0].name)}</span>` : ""}</span>
            <span class="cmp-ghost-slot"></span>
          </div>
          ${rows}
        </div>
      </div>
    </div>`;
}

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
  // Portrait phones hide this panel because it repeats the table's columns.
  // Below two products there IS no table, and the empty state carries no
  // controls, so hiding it left the phone with nothing on screen: neither the
  // product already picked nor any way to add the second. This flag keeps it
  // visible in exactly that gap (see the <=640 rule in products.css).
  el.classList.toggle("csel-solo", products.length < 2);
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

  // "Compare now" only means something once there are two columns to draw. Below
  // that it stays in place, neutral and inert, so the panel's layout does not
  // shift as products are added and the control's own state says what is
  // missing. A real <button disabled> rather than an aria-disabled anchor: the
  // browser then handles clicks, Enter/Space and tab order for free.
  const canCompare = products.length >= 2;
  const compareArrow = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
  const compareNow = canCompare
    ? `<a class="btn btn-primary csel-compare" href="#comparePageContent">${copy.compareNow}${compareArrow}</a>`
    : `<button type="button" class="btn btn-primary csel-compare" disabled title="${copy.compareHint}" aria-label="${copy.compareHint}">${copy.compareNow}${compareArrow}</button>`;

  // Portrait phones only (see products.css): there the explanatory panel below
  // is hidden, so this single line carries what is still missing. On wider
  // screens that panel says the same thing beside the preview, and showing both
  // would be the same sentence twice.
  const hint = canCompare ? "" : `
    <p class="csel-hint">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      ${formatComparePageCopy(copy.selectHint, { count: 2 - products.length })}
    </p>`;

  el.innerHTML = `
    <div class="csel-head">${copy.heading} (${products.length}/3)</div>
    <div class="csel-body">
      <div class="csel-row">${cards}${addSlot}</div>
      ${hint}
      <div class="csel-actions">
        ${compareNow}
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
    content.innerHTML = renderCompareEmptyState(products, copy);
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
    // scope="col" so a screen reader announces the product name against every
    // value in its column. Previously every cell in this table was a <td>, so
    // "Leather" was read with no indication of which product or which spec row
    // it belonged to (WCAG 2.2 AA, 1.3.1 Info and Relationships).
    return `
      <th scope="col" class="compare-col-header">
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
      </th>`;
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

  // Labels and icons come from compareSpecMeta (shared with the empty-state
  // preview); only the value renderers live here, keyed by row.
  const renderers = {
    industries: p => listVals(p.industries),
    surfaces:   p => listVals(p.surfaces),
    method:     p => text(termOf(methodOf(p))),
    category:   p => text(termOf(p.category === "Others" ? "Application Equipment" : p.category)),
    features:   p => {
      // Only genuine claims, matching what the label now promises. The spec
      // rows above already carry the base, method, sizes and characteristics,
      // so listing them again here repeated the same values twice on one page.
      const claim = typeof isKeyBenefitClaim === "function" ? isKeyBenefitClaim : (() => true);
      const benefits = (p.features || []).filter(claim);
      return benefits.length
        ? benefits.map(f => `<div class="compare-feature">${check}${ylEscapeHtml(termOf(f))}</div>`).join("")
        : EMPTY;
    }
  };
  const specRows = compareSpecMeta().map(meta => ({ ...meta, render: renderers[meta.key] })).map(row => `
    <tr>
      <th scope="row" class="compare-row-label"><span class="compare-label-wrap">${row.ic}<span>${row.label}</span></span></th>
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
        <caption class="sr-only">${formatComparePageCopy(copy.caption, products.length)}</caption>
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
