// Overview (admin home): pulls real products + enquiries and renders KPIs,
// the enquiries chart, catalogue breakdown, and recent leads.
// API_BASE_URL + loadProductsFromBackend()/PRODUCTS come from data.js.

function isNetworkError(err) {
  return err instanceof TypeError;
}

// ─── Auth guard ───────────────────────────────────────────────────
// Validates the token against the server (matching admin.js/products.html)
// instead of only checking that one is present. Without this, an expired or
// revoked token still "worked" here — the dashboard rendered normally because
// none of its own fetches redirect on failure — while Products/Enquiries
// correctly bounced you to login, which looked like a random, page-specific bug.
// Runs immediately on load AND every time admin-spa.js re-executes this script
// after a soft page swap (see admin-spa.js). It is self-contained, so re-running
// it simply re-initialises the dashboard.
(async function initOverview() {
  // Self-select: if this script's async re-execution lands after we've already
  // navigated to another page, its anchor is gone — bail before touching the DOM.
  if (!document.getElementById("greetingTitle")) return;
  const token = localStorage.getItem("adminToken");
  if (!token) { window.location.href = "login.html"; return; }

  // Greet before the first await. This needs only the clock and localStorage,
  // so holding it behind the me.php round-trip meant the page painted the
  // static "Welcome back" from dashboard.html and then visibly rewrote the
  // heading a beat later. Running it synchronously means the correct greeting
  // is there on the first paint and nothing changes under the reader.
  renderGreeting();

  try {
    const res = await fetch(`${API_BASE_URL}/api/me.php`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
  } catch (err) {
    if (!isNetworkError(err)) {
      localStorage.removeItem("adminToken");
      window.location.href = "login.html";
      return;
    }
    // Backend unreachable (not an auth problem): let the page render.
    // loadOverview() already falls back to empty KPIs/chart per section.
  }

  loadOverview();
})();

// logout() lives in admin-spa.js, which every admin page loads. It also
// invalidates the token server-side, which the old per-page copies did not.

// ─── Greeting ─────────────────────────────────────────────────────
function renderGreeting() {
  const title = document.getElementById("greetingTitle");
  if (!title) return; // dashboard swapped out during async init — nothing to render
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const name = localStorage.getItem("adminUsername") || "Yee Lim";
  title.textContent = `${part}, ${name}`;
  document.getElementById("userName").textContent = name;
  document.getElementById("userAv").textContent = initials(name);
  document.getElementById("greetingSub").textContent =
    "Here's what's happening across your catalogue. Today is " +
    new Date().toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
}

// ─── Load + render ────────────────────────────────────────────────
async function loadOverview() {
  let products = [];
  let enquiries = [];

  // demoFallback:false — admin KPIs must reflect live data only, never the
  // bundled public demo catalogue. A dead backend shows an empty dashboard.
  try { products = await loadProductsFromBackend({ demoFallback: false }); } catch (e) { products = []; }
  try {
    const res = await fetch(`${API_BASE_URL}/api/enquiries.php`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }
    });
    if (res.ok) enquiries = await res.json();
  } catch (e) { enquiries = []; }

  // If the fetch resolved after we soft-navigated away from the dashboard, its
  // anchors are gone — bail rather than throw.
  if (!document.getElementById("catList")) return;

  renderKpis(products, enquiries);
  renderCategories(products);
  renderChart(enquiries);
  renderRecent(enquiries);
  renderUnreadBadges(enquiries);
  loadAnalytics();

  if (window.lucide) lucide.createIcons();
}

// ─── Product analytics ────────────────────────────────────────────
// Pulls aggregated view stats from the admin-only analytics endpoint and
// renders the most-viewed list + a 14-day views trend. Best-effort: on any
// failure the section shows an honest "unavailable" state, never fake numbers.
async function loadAnalytics() {
  const listEl = document.getElementById("topProducts");
  if (!listEl) return;
  const trendCol = document.getElementById("analyticsTrend");
  const cap = document.getElementById("convCap");

  let a = null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/analytics.php`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }
    });
    if (res.ok) a = await res.json();
  } catch (e) { a = null; }

  if (!document.getElementById("topProducts")) return; // swapped away mid-fetch

  if (!a) {
    listEl.style.gridColumn = "1 / -1";
    listEl.innerHTML = '<div class="overview-empty">Analytics unavailable right now.</div>';
    if (trendCol) trendCol.style.display = "none";
    if (cap) cap.textContent = "";
    return;
  }

  const hasViews = Array.isArray(a.topProducts) && a.topProducts.length > 0;
  if (!hasViews) {
    // No data yet: one calm centred message, not a stray "0" and a flat line.
    if (trendCol) trendCol.style.display = "none";
    if (cap) cap.textContent = "";
    listEl.style.gridColumn = "1 / -1";
    listEl.innerHTML =
      '<div class="analytics-empty">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>' +
      '<div class="ae-title">No product views yet</div>' +
      '<div class="ae-sub">Views are recorded automatically as visitors browse the catalogue. This fills in once the site has traffic.</div>' +
      '</div>';
    return;
  }

  // Have data: restore the two-column layout and render.
  listEl.style.gridColumn = "";
  if (trendCol) trendCol.style.display = "";
  renderTopProducts(a.topProducts);
  renderViewsTrend(a.viewsTrend || []);
  // This card is about product viewing only, so the summary stays view-only.
  if (cap && a.conversion) {
    cap.textContent = `${a.conversion.views} views`;
  }
}

function renderTopProducts(rows) {
  const el = document.getElementById("topProducts");
  if (!el) return;
  const label = '<div class="analytics-col-label">Most-viewed products</div>';
  if (!rows.length) {
    el.innerHTML = label + '<div class="overview-empty">No product views yet. Views are recorded as visitors browse the catalogue.</div>';
    return;
  }
  const max = Math.max(...rows.map(r => r.views), 1);
  el.innerHTML = label + rows.map(r => `
    <div class="cat-item">
      <div class="cat-row"><b>${escapeHtml(r.name)}</b><span>${r.views}</span></div>
      <div class="cat-track"><div class="cat-fill ink" style="width:${Math.round((r.views / max) * 100)}%"></div></div>
    </div>
  `).join("");
}

// Local-calendar day key. Deliberately not toISOString(): in UTC+8 that turns
// local midnight into the *previous* UTC date, so real days silently fell into
// no slot and the trend under-counted.
function dayKey(d) {
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

// 30-day views trend, drawn from the real per-day counts in analytics.php.
// The headline number is the sum of exactly the points on the line, so it
// always matches the real 30-day window analytics.php also uses for the
// card's top-right "views" figure and the most-viewed list.
// `var`, not `const`: admin-spa.js re-executes this whole script on every soft
// return to the dashboard, and a repeated top-level `const` would throw.
// The viewBox is tall (300) so the graph can fill the height of the analytics
// column without the stretched viewBox distorting the line out of proportion.
var TREND_DAYS = 30, TREND_W = 600, TREND_H = 300, TREND_TOP = 18, TREND_BOTTOM = 282,
    TREND_PAD_L = 44, TREND_PAD_R = 8;

// Round up to a "nice" axis ceiling (1/2/5/10 × a power of ten) so the y-axis
// reads 0/5/10/15/20-style instead of an arbitrary data maximum.
function niceMax(v) {
  if (v <= 5) return 5;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / pow;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return niceNorm * pow;
}

function renderViewsTrend(rows) {
  // Fill 30 contiguous days so gaps render as zero rather than distort the line.
  const days = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    days.push({ date: d, key: dayKey(d), count: 0 });
  }
  rows.forEach(r => {
    const slot = days.find(d => d.key === String(r.date).slice(0, 10));
    if (slot) slot.count = Number(r.views) || 0;
  });

  const values  = days.map(d => d.count);
  const total   = values.reduce((a, b) => a + b, 0);
  const gridMax = niceMax(Math.max(1, ...values));
  const step    = (TREND_W - TREND_PAD_L - TREND_PAD_R) / (TREND_DAYS - 1);
  const pts = values.map((v, i) => [
    +(TREND_PAD_L + i * step).toFixed(1),
    +(TREND_BOTTOM - (v / gridMax) * (TREND_BOTTOM - TREND_TOP)).toFixed(1)
  ]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0]},${TREND_BOTTOM} L${pts[0][0]},${TREND_BOTTOM} Z`;

  const lineEl  = document.getElementById("viewsLine");
  const areaEl  = document.getElementById("viewsAreaPath");
  const totalEl = document.getElementById("viewsTotal");
  if (lineEl)  lineEl.setAttribute("d", line);
  if (areaEl)  areaEl.setAttribute("d", area);
  if (totalEl) totalEl.textContent = total;

  renderTrendGrid(gridMax);
  renderTrendPoints(pts);
  renderTrendLabels("viewsLabels", days, pts, TREND_W);
  bindChartHover("viewsChart", "viewsTip", "viewsDot", days, pts, TREND_W, TREND_H, "view", "views");
  animateTrend(lineEl, areaEl);
}

// Horizontal gridlines + their value labels, scaled to the real data range —
// reuses the same faint line style already used elsewhere on the dashboard.
// The lines are SVG, the value labels are HTML: the chart stretches to fill its
// column (preserveAspectRatio="none"), which would squash SVG <text>.
function renderTrendGrid(gridMax) {
  const g = document.getElementById("viewsGrid");
  const yl = document.getElementById("viewsYLabels");
  if (!g) return;
  const steps = 4; // 0, 1/4, 1/2, 3/4, max — five labels
  let lines = "", labels = "";
  for (let s = 0; s <= steps; s++) {
    const val = Math.round((gridMax * s) / steps);
    const y = TREND_BOTTOM - (s / steps) * (TREND_BOTTOM - TREND_TOP);
    lines += `<line class="trend-grid-line" x1="${TREND_PAD_L}" y1="${y}" x2="${TREND_W}" y2="${y}"/>`;
    labels += `<span style="top:${((y / TREND_H) * 100).toFixed(2)}%">${val}</span>`;
  }
  g.innerHTML = lines;
  if (yl) yl.innerHTML = labels;
}

// A small marker on each day, so the shape of the series stays readable.
function renderTrendPoints(pts) {
  const g = document.getElementById("viewsPoints");
  if (!g) return;
  g.innerHTML = pts.map(p => `<circle class="trend-point" cx="${p[0]}" cy="${p[1]}" r="2.6"/>`).join("");
}

// Picks ~5 evenly spaced indices ending on the most recent day, so a longer
// series (30 days) doesn't crowd the axis with as many labels as a short one.
function pickLabelIndices(n, target) {
  target = target || 5;
  const step = Math.max(1, Math.round((n - 1) / (target - 1)));
  const idxs = [];
  for (let i = n - 1; i >= 0; i -= step) idxs.push(i);
  return idxs.reverse();
}

function renderTrendLabels(elId, days, pts, W) {
  const el = document.getElementById(elId);
  if (!el) return;
  const idxs = pickLabelIndices(days.length, 5);
  let html = "";
  idxs.forEach(i => {
    const pct = (pts[i][0] / W) * 100;
    const align = pct > 85 ? "translateX(-100%)" : pct < 8 ? "none" : "translateX(-50%)";
    html += `<span style="left:${pct}%;transform:${align}">` +
      days[i].date.toLocaleDateString("en-SG", { day: "numeric", month: "short" }) + "</span>";
  });
  el.innerHTML = html;
}

// Shared hover tooltip for both the Enquiries and Product Analytics charts:
// nearest day, its date, and its count (view or enquiry). One listener per
// chart element (each is a fresh DOM node after every soft page swap, so
// returning to the dashboard never stacks duplicate handlers). The whole
// chart width is the hover target — no need to land on the exact line.
function bindChartHover(chartElId, tipElId, dotElId, days, pts, W, H, unitSingular, unitPlural) {
  const chart = document.getElementById(chartElId);
  if (!chart) return;
  chart._trend = { days, pts, W, H, unitSingular, unitPlural: unitPlural || `${unitSingular}s` };

  if (chart._trendBound) return;
  chart._trendBound = true;

  const tip = document.getElementById(tipElId);
  const dot = document.getElementById(dotElId);

  function show(e) {
    const data = chart._trend;
    if (!data || !tip || !dot) return;
    const box = chart.getBoundingClientRect();
    if (!box.width) return;
    const last = data.pts.length - 1;
    const i = Math.max(0, Math.min(last, Math.round(((e.clientX - box.left) / box.width) * last)));
    const p = data.pts[i], d = data.days[i];

    dot.setAttribute("cx", p[0]);
    dot.setAttribute("cy", p[1]);
    dot.style.display = "block";

    const unitText = d.count === 1 ? data.unitSingular : data.unitPlural;
    tip.innerHTML = `<b>${d.count} ${unitText}</b><span>` +
      escapeHtml(d.date.toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short" })) + "</span>";
    const pct = (p[0] / data.W) * 100;
    tip.style.left = pct + "%";
    tip.style.top = ((p[1] / data.H) * 100) + "%";
    tip.style.transform =
      (pct > 85 ? "translate(-100%,-125%)" : pct < 8 ? "translate(0,-125%)" : "translate(-50%,-125%)");
    tip.hidden = false;
  }

  function hide() {
    if (tip) tip.hidden = true;
    if (dot) dot.style.display = "none";
  }

  chart.addEventListener("pointermove", show);
  chart.addEventListener("pointerleave", hide);
  chart.addEventListener("pointercancel", hide);
}

// One quiet draw-in on load. No looping animation.
function animateTrend(lineEl, areaEl) {
  if (!lineEl || !areaEl) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let len = 0;
  try { len = lineEl.getTotalLength(); } catch (e) { return; }
  if (!len) return;

  lineEl.style.transition = "none";
  lineEl.style.strokeDasharray = len;
  lineEl.style.strokeDashoffset = len;
  areaEl.style.transition = "none";
  areaEl.style.opacity = "0";

  requestAnimationFrame(function () {
    lineEl.style.transition = "stroke-dashoffset 0.7s ease-out";
    lineEl.style.strokeDashoffset = "0";
    areaEl.style.transition = "opacity 0.7s ease-out";
    areaEl.style.opacity = "1";
  });
}

// ─── KPIs ─────────────────────────────────────────────────────────
function renderKpis(products, enquiries) {
  const total = products.length;
  const available = products.filter(p => p.status === "Available").length;
  const pct = total ? Math.round((available / total) * 100) : 0;

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recentCount = enquiries.filter(e => parseDate(e.date) >= weekAgo).length;
  const newLeads = enquiries.filter(e => !e.replied).length;

  countUp("kpiTotal", total);
  countUp("kpiAvailable", available);
  countUp("kpiNew", recentCount);
  countUp("kpiUnread", newLeads);

  document.getElementById("kpiAvailPct").innerHTML = `<i data-lucide="arrow-up-right"></i>${pct}%`;
  document.getElementById("kpiNewDelta").innerHTML = `<i data-lucide="arrow-up-right"></i>+${recentCount}`;
  const tag = document.getElementById("kpiUnreadTag");
  tag.textContent = newLeads > 0 ? "Needs reply" : "All replied";
}

// ─── Catalogue breakdown ──────────────────────────────────────────
function renderCategories(products) {
  const el = document.getElementById("catList");
  if (!products.length) {
    el.innerHTML = `<div class="overview-empty">No products yet.</div>`;
    return;
  }
  const counts = {};
  products.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
  const order = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = order[0][1];
  // Neutral quantity bars — the red stays reserved for actions/alerts.
  const fills = ["ink", "slate", "slate"];

  el.innerHTML = order.map(([cat, n], i) => `
    <div class="cat-item">
      <div class="cat-row"><b>${escapeHtml(cat)}</b><span>${n}</span></div>
      <div class="cat-track"><div class="cat-fill ${fills[i % fills.length]}" style="width:${Math.round((n / max) * 100)}%"></div></div>
    </div>
  `).join("") + `
    <div class="cat-total"><span>Total catalogue</span><b>${products.length} products</b></div>
  `;
}

// ─── Chart: enquiries per day, last 7 days ────────────────────────
function renderChart(enquiries) {
  const days = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    days.push({ date: d, count: 0 });
  }
  enquiries.forEach(e => {
    const t = new Date(parseDate(e.date)); t.setHours(0, 0, 0, 0);
    const slot = days.find(d => d.date.getTime() === t.getTime());
    if (slot) slot.count++;
  });

  const values = days.map(d => d.count);
  const total7 = values.reduce((a, b) => a + b, 0);
  const maxV = Math.max(1, ...values);

  const W = 600, H = 200, padX = 20, top = 20, bottom = 190;
  const step = (W - padX * 2) / 6;
  const pts = values.map((v, i) => {
    const x = padX + i * step;
    const y = bottom - (v / maxV) * (bottom - top);
    return [Math.round(x), Math.round(y)];
  });

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0]},${bottom} L${pts[0][0]},${bottom} Z`;

  document.getElementById("chartLine").setAttribute("d", line);
  document.getElementById("chartArea").setAttribute("d", area);

  // Permanent dot on the last (today) point — separate from the hover dot below,
  // so hovering elsewhere and moving away never hides this "today" marker.
  const last = pts[pts.length - 1];
  const dot = document.getElementById("chartDot");
  dot.setAttribute("cx", last[0]); dot.setAttribute("cy", last[1]); dot.style.display = "block";

  document.getElementById("chartTotal").textContent = total7;
  const cap = document.getElementById("chartCap");
  const todayCount = values[values.length - 1];
  // The secondary figure is always present so the 7-day total never floats on
  // its own: green "▲ N today" when leads came in today, a quiet grey "0 today"
  // when none did.
  cap.textContent = todayCount > 0 ? `▲ ${todayCount} today` : "0 today";
  cap.style.color = todayCount > 0 ? "var(--green)" : "var(--muted-2)";

  document.getElementById("chartLabels").innerHTML =
    days.map(d => `<span>${d.date.toLocaleDateString("en-SG", { weekday: "short" })}</span>`).join("");

  bindChartHover("chartHover", "chartTip", "chartHoverDot", days, pts, W, H, "enquiry", "enquiries");
}

// ─── Recent enquiries ─────────────────────────────────────────────
function renderRecent(enquiries) {
  const el = document.getElementById("recentEnq");
  if (!enquiries.length) {
    el.innerHTML = `<div class="overview-empty">No enquiries yet. New leads from the website will appear here.</div>`;
    return;
  }
  const avClasses = ["a", "b", "c"];
  el.innerHTML = enquiries.slice(0, 4).map((e, i) => {
    const tags = (e.products || []).slice(0, 2)
      .map(p => `<span class="enq-tag">${escapeHtml(p)}</span>`).join("");
    const more = (e.products || []).length > 2 ? `<span class="enq-tag">+${e.products.length - 2}</span>` : "";
    return `
      <div class="enq-item" onclick="location.href='enquiries.html'">
        <div class="enq-av ${avClasses[i % avClasses.length]}">${initials(e.name)}</div>
        <div class="enq-main">
          <div class="enq-row-top">
            <span class="enq-row-name">${escapeHtml(e.name)}</span>
            ${e.replied ? "" : '<span class="enq-new">New</span>'}
          </div>
          <div class="enq-company">${escapeHtml(e.company || "")}</div>
          <div class="enq-tags">${tags}${more}</div>
        </div>
        <div class="enq-side">
          <span class="enq-time">${timeAgo(parseDate(e.date))}</span>
          <button class="enq-reply" title="Reply by email"
            onclick="event.stopPropagation();window.location.href='mailto:${e.email}?subject=Re: Your enquiry to Yee Lim Adhesives'">
            <i data-lucide="reply"></i>
          </button>
        </div>
      </div>`;
  }).join("");
}

function renderUnreadBadges(enquiries) {
  const newLeads = enquiries.filter(e => !e.replied).length;
  const nav = document.getElementById("navUnread");
  if (nav && newLeads > 0) {
    nav.textContent = newLeads;
    nav.style.display = "inline-flex"; // matches the CSS flex-centered badge
  }
}

// ─── Helpers ──────────────────────────────────────────────────────
function parseDate(s) {
  if (!s) return 0;
  // MySQL "YYYY-MM-DD HH:MM:SS" → treat as local time
  const iso = String(s).replace(" ", "T");
  const t = Date.parse(iso);
  return isNaN(t) ? 0 : t;
}

function timeAgo(ms) {
  if (!ms) return "";
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day}d ago`;
  return new Date(ms).toLocaleDateString("en-SG", { day: "numeric", month: "short" });
}

function initials(name) {
  return String(name || "")
    .trim().split(/\s+/).slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "?";
}

function countUp(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const dur = 650, start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
