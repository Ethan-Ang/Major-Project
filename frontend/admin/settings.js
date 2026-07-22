// ─── Site Settings (CLIENT-006) ───────────────────────────────────
// Admin editor for the site's contact details + enquiry recipient, served by
// api/settings.php. Self-contained (its own auth guard + helpers), matching the
// other admin pages.

function isNetworkError(err) { return err instanceof TypeError; }
function authHeader() { return { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }; }

// Immediately-invoked so it runs on first load AND when admin-spa.js re-executes
// this script after a soft page swap back to Site Settings.
(async function initSettings() {
  // Self-select: bail if this script's async re-execution lands after we've
  // navigated away (its anchor element is no longer in the DOM).
  if (!document.getElementById("saveSettingsBtn")) return;
  const token = localStorage.getItem("adminToken");
  if (!token) { window.location.href = "login.html"; return; }
  try {
    const res = await fetch(`${API_BASE_URL}/api/me.php`, { headers: authHeader() });
    if (!res.ok) throw new Error();
  } catch (err) {
    if (!isNetworkError(err)) {
      localStorage.removeItem("adminToken");
      window.location.href = "login.html";
      return;
    }
  }
  loadSettings();
})();

function logout() {
  localStorage.removeItem("adminToken");
  window.location.href = "login.html";
}

function fields() {
  return Array.from(document.querySelectorAll("[data-key]"));
}

async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/settings.php?scope=admin`, { headers: authHeader() });
    if (!res.ok) throw new Error("status " + res.status);
    const data = await res.json();
    fields().forEach(el => { el.value = data[el.dataset.key] || ""; });
  } catch (err) {
    showError("Could not load settings. Refresh to try again.");
  }
}

async function saveSettings() {
  hideError();
  const payload = {};
  fields().forEach(el => { payload[el.dataset.key] = el.value.trim(); });

  const btn = document.getElementById("saveSettingsBtn");
  btn.disabled = true;
  btn.innerHTML = `<span class="btn-spinner"></span> Saving…`;

  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api/settings.php`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    btn.disabled = false; btn.textContent = "Save changes";
    showError("Could not reach the server. Please try again.");
    return;
  }

  const data = await res.json().catch(() => ({}));
  btn.disabled = false;
  btn.textContent = "Save changes";

  if (!res.ok) {
    showError(data.message || "Could not save. Please check the values and try again.");
    if (data.key) {
      const el = document.querySelector(`[data-key="${data.key}"]`);
      if (el) el.focus();
    }
    return;
  }

  // Refresh the fields from the server's canonical values.
  fields().forEach(el => { el.value = data[el.dataset.key] || ""; });
  flashSaved();
  showToast("Settings saved", "success");
}

function flashSaved() {
  const s = document.getElementById("settingsSaved");
  if (!s) return;
  s.classList.add("show");
  setTimeout(() => s.classList.remove("show"), 2500);
}

function showError(msg) {
  const el = document.getElementById("settingsError");
  if (!el) return; // soft-navigated away before an async error surfaced — no-op
  el.textContent = msg;
  el.style.display = "block";
}
function hideError() {
  document.getElementById("settingsError").style.display = "none";
}

function showToast(message, type = "default") {
  const toast = document.getElementById("adminToast");
  toast.textContent = message;
  toast.className   = `admin-toast show${type === "success" ? " toast-success" : type === "error" ? " toast-error" : ""}`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}
