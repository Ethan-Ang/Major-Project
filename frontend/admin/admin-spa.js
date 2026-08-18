// admin-spa.js — SPA shell for the multi-page admin console.
//
// The admin is a set of standalone HTML pages (not a bundled SPA like the public
// site). This turns navigation between them into an in-place content swap under a
// persistent sidebar, with a quiet opacity cross-fade, using Swup v4.
//
// How it works:
//   • Each admin page keeps its own self-contained <script> INSIDE the #adminSwap
//     container (alongside that page's content + modals). On every swap we
//     re-execute that script so the destination page initialises exactly as it
//     would on a fresh load. Each page script runs its init immediately and uses
//     `var` for top-level state, so re-execution on a return visit is safe.
//   • Chrome that lives OUTSIDE the container (sidebar, toast) persists across
//     swaps, so its dynamic bits (active nav item, username, unread badge, icons)
//     are refreshed here on each view.
//   • login.html is NOT a participating page, so signing in / bouncing to login is
//     always a real full navigation — the auth boundary is never soft.
//
// If Swup is unavailable the admin still works: every link is just a normal
// full-page navigation.
(function () {
  var API = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "";
  var PAGES = ["dashboard", "products", "enquiries", "downloads", "filters", "settings"];

  function pageOf(path) {
    var m = String(path).match(/\/([\w-]+)\.html$/);
    return m ? m[1] : "";
  }

  // ── Sign out ──────────────────────────────────────────────────────
  // Defined once here because every admin page loads this file. It used to be
  // copy-pasted into all six page scripts, and every copy only cleared
  // localStorage — which hides the token from this browser but leaves its row
  // in admin_tokens valid until it expires, so a copied token kept working
  // after "signing out". api/logout.php deletes that row.
  //
  // Fire-and-forget with keepalive: the POST is allowed to outlive the
  // navigation on the last line, so sign-out still feels instant. The local
  // clear and the redirect happen regardless of whether the request lands,
  // so a server that is down or unreachable can never strand a signed-in UI.
  window.logout = function () {
    var token = localStorage.getItem("adminToken");
    if (token && typeof fetch === "function") {
      try {
        fetch(API + "/api/logout.php", {
          method: "POST",
          headers: { Authorization: "Bearer " + token },
          keepalive: true
        }).catch(function () { /* offline — the local session is gone anyway */ });
      } catch (e) { /* fetch threw synchronously — fall through to the local clear */ }
    }
    localStorage.removeItem("adminToken");
    window.location.href = "login.html";
  };

  function setActiveNav() {
    var here = pageOf(location.pathname);
    var links = document.querySelectorAll(".admin-nav a");
    for (var i = 0; i < links.length; i++) {
      var m = (links[i].getAttribute("href") || "").match(/([\w-]+)\.html/);
      links[i].classList.toggle("active", !!m && m[1] === here);
    }
  }

  function setUser() {
    var n = localStorage.getItem("adminUsername");
    if (!n) return;
    var nameEl = document.getElementById("userName");
    var avEl = document.getElementById("userAv");
    if (nameEl) nameEl.textContent = n;
    if (avEl) {
      avEl.textContent = n.trim().split(/\s+/).slice(0, 2)
        .map(function (w) { return w[0] || ""; }).join("").toUpperCase() || "YL";
    }
  }

  function drawIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      try { window.lucide.createIcons(); } catch (e) { /* icon lib not ready */ }
    }
  }

  // Sidebar "new leads" badge, owned by the shell so it stays consistent on every
  // page (the pages that show their own count still update the same element).
  function refreshUnread() {
    var badge = document.getElementById("unreadBadge");
    if (!badge) return;
    var token = localStorage.getItem("adminToken");
    if (!token) return;
    fetch(API + "/api/enquiries.php", { headers: { Authorization: "Bearer " + token } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (list) {
        if (!Array.isArray(list)) return;
        var n = list.filter(function (e) { return !e.replied; }).length;
        badge.textContent = n;
        badge.style.display = n > 0 ? "inline-flex" : "none";
      })
      .catch(function () { /* offline / signed out — leave it hidden */ });
  }

  // Clicking the sidebar again before a swap has finished starts a second visit
  // while the first page script is still awaiting its auth check, so two inits
  // race: two calls to me.php, two table fetches, and a loading state that stays
  // visible far longer than the ~150ms it should. The page scripts' existing
  // "is my anchor element still in the DOM" guard cannot catch it, because for
  // Products -> Products the element is present for both.
  //
  // Every swap bumps this counter. A page script takes a token when it starts
  // and checks it after each await; if the number moved, a newer visit owns the
  // page and the older init returns without fetching or rendering.
  var pageGen = 0;
  window.ylPageToken = function () { return pageGen; };
  window.ylPageSuperseded = function (token) { return token !== pageGen; };

  // Re-execute <script> tags inside a freshly-swapped container. Scripts inserted
  // via innerHTML are inert; cloning + replacing each one forces the browser to run
  // it again. External src scripts re-fetch (from cache) and re-run.
  function runScripts(container) {
    if (!container) return;
    var list = container.querySelectorAll("script");
    for (var i = 0; i < list.length; i++) {
      var old = list[i];
      var s = document.createElement("script");
      for (var a = 0; a < old.attributes.length; a++) {
        s.setAttribute(old.attributes[a].name, old.attributes[a].value);
      }
      if (!old.src) s.textContent = old.textContent;
      old.parentNode.replaceChild(s, old);
    }
  }

  function refreshChrome() {
    setActiveNav();
    setUser();
    refreshUnread();
    drawIcons();
  }

  function onReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  // Initial load: the page's own script has already run (it's inline in the
  // container); just sync the persistent chrome.
  onReady(refreshChrome);

  // ── Swup ──────────────────────────────────────────────────────────
  onReady(function () {
    if (typeof Swup === "undefined") return;

    function isAdminPage(url) {
      try { return PAGES.indexOf(pageOf(new URL(url, location.origin).pathname)) !== -1; }
      catch (e) { return false; }
    }

    var swup = new Swup({
      containers: ["#adminSwap"],
      animationSelector: '[class*="admin-transition-"]',
      // Only soft-navigate between the admin app pages; login, the live-site link,
      // and anything external fall back to a normal full navigation.
      ignoreVisit: function (url) { return !isAdminPage(url); }
    });

    swup.hooks.on("content:replace", function () {
      // Bumped BEFORE the new scripts run, so the incoming init takes the fresh
      // token and any init still in flight from the previous visit sees a stale one.
      pageGen++;
      runScripts(document.getElementById("adminSwap"));
      refreshChrome();
      window.scrollTo(0, 0);
    });
  });
})();
