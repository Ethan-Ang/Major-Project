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

  renderGreeting();
  loadOverview();
})();

function logout() {
  localStorage.removeItem("adminToken");
  window.location.href = "login.html";
}

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
  if (cap && a.conversion) {
    cap.textContent = `${a.conversion.views} views · ${a.conversion.enquiries} enquiries`;
  }
}

function renderTopProducts(rows) {
  const el = document.getElementById("topProducts");
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = '<div class="overview-empty">No product views yet. Views are recorded as visitors browse the catalogue.</div>';
    return;
  }
  const max = Math.max(...rows.map(r => r.views), 1);
  el.innerHTML = rows.map(r => `
    <div class="cat-item">
      <div class="cat-row"><b>${escapeHtml(r.name)}</b><span>${r.views}</span></div>
      <div class="cat-track"><div class="cat-fill ink" style="width:${Math.round((r.views / max) * 100)}%"></div></div>
    </div>
  `).join("");
}

function renderViewsTrend(rows) {
  // Fill 14 contiguous days so gaps render as zero rather than distort the line.
  const days = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    days.push({ key: d.toISOString().slice(0, 10), count: 0 });
  }
  rows.forEach(r => {
    const slot = days.find(d => d.key === String(r.date).slice(0, 10));
    if (slot) slot.count = r.views;
  });

  const values = days.map(d => d.count);
  const total  = values.reduce((a, b) => a + b, 0);
  const maxV   = Math.max(1, ...values);
  const W = 600, top = 12, bottom = 150, padX = 8, step = (W - padX * 2) / 13;
  const pts = values.map((v, i) => [Math.round(padX + i * step), Math.round(bottom - (v / maxV) * (bottom - top))]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0]},${bottom} L${pts[0][0]},${bottom} Z`;

  const lineEl = document.getElementById("viewsLine"); if (lineEl) lineEl.setAttribute("d", line);
  const areaEl = document.getElementById("viewsAreaPath"); if (areaEl) areaEl.setAttribute("d", area);
  const totalEl = document.getElementById("viewsTotal"); if (totalEl) totalEl.textContent = total;
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

  // dot on the last (today) point
  const last = pts[pts.length - 1];
  const dot = document.getElementById("chartDot");
  dot.setAttribute("cx", last[0]); dot.setAttribute("cy", last[1]); dot.style.display = "block";

  document.getElementById("chartTotal").textContent = total7;
  const cap = document.getElementById("chartCap");
  const todayCount = values[values.length - 1];
  // Only a small green "+N today" when there really are new leads today; otherwise
  // blank, so the 7-day number never sits next to a contradictory "none today".
  cap.textContent = todayCount > 0 ? `▲ ${todayCount} today` : "";
  cap.style.color = "var(--green)";

  document.getElementById("chartLabels").innerHTML =
    days.map(d => `<span>${d.date.toLocaleDateString("en-SG", { weekday: "short" })}</span>`).join("");
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
