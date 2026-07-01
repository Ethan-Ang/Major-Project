// Mobile admin navigation. At narrow widths the sidebar is hidden as static
// chrome and reused as a slide-in drawer instead, so admins on a phone can still
// move between Overview / Products / Enquiries and sign out. Desktop is untouched
// (the topbar, overlay, and close button are display:none above 768px via CSS).
// Reuses the existing .admin-sidebar markup as the drawer body. No dependencies.
(function () {
  const layout  = document.querySelector(".admin-layout");
  const sidebar = document.querySelector(".admin-sidebar");
  const main    = document.querySelector(".admin-main");
  if (!layout || !sidebar || !main) return; // not an app-shell page (e.g. login)

  sidebar.id = sidebar.id || "adminSidebar";

  // Sticky top bar with the hamburger (mobile only).
  const topbar = document.createElement("header");
  topbar.className = "admin-topbar";
  topbar.innerHTML =
    '<button class="admin-burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="' + sidebar.id + '">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' +
    '</button>' +
    '<span class="admin-topbar-brand"><span class="admin-topbar-mark"><img src="/images/logos/ylai-seal.png" alt=""></span>Yee Lim Admin</span>';
  main.insertBefore(topbar, main.firstChild);

  // Backdrop behind the open drawer.
  const overlay = document.createElement("div");
  overlay.className = "admin-drawer-overlay";
  document.body.appendChild(overlay);

  // Close (X) inside the drawer.
  const closeBtn = document.createElement("button");
  closeBtn.className = "admin-drawer-close";
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close menu");
  closeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  sidebar.appendChild(closeBtn);

  const burger = topbar.querySelector(".admin-burger");

  function open() {
    sidebar.classList.add("open");
    overlay.classList.add("show");
    burger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }
  function close() {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
    burger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  burger.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", close);
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  // A link tap navigates, but closing first keeps state clean for same-page anchors.
  sidebar.querySelectorAll(".admin-nav a").forEach(a => a.addEventListener("click", close));
  // If the viewport grows back to desktop while open, reset so nothing is stuck.
  window.addEventListener("resize", () => { if (window.innerWidth > 768) close(); });
})();
