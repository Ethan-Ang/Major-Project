// API_BASE_URL is defined in data.js

let lockoutTimer = null; // live countdown interval while rate-limited (429)
let isLocked = false;    // submits are ignored while a lockout is counting down

// Page load: a valid token means we are already signed in, so go straight to the
// dashboard without ever flashing the login form.
document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("adminToken")) {
    window.location.href = "dashboard.html";
  }
});

// The browser fires this the moment the connection drops. Surface it immediately
// rather than waiting for the user to submit into a void.
window.addEventListener("offline", () => {
  if (!isLocked) showState("offline");
});

/* ─── banner + field helpers ─────────────────────────────────────────── */

const BANNERS = {
  validation: "bnValidation",
  auth:       "bnAuth",
  lockout:    "bnLockout",
  dbdown:     "bnDbdown",
  srv500:     "bnSrv500",
  offline:    "bnOffline",
};

// Show exactly one banner (or none). Central mapping point for section 4 of the
// spec: response condition -> state -> the banner that carries its copy.
function showState(state) {
  Object.values(BANNERS).forEach((id) => {
    document.getElementById(id).hidden = true;
  });
  if (state && BANNERS[state]) {
    document.getElementById(BANNERS[state]).hidden = false;
  }
}

function clearBanners() {
  showState(null);
}

// Blame the inputs (red label + underline + "…is required" hint) only for the
// two user-fault states: empty fields and wrong credentials.
function flagField(id, invalid) {
  document.getElementById(id).classList.toggle("is-invalid", invalid);
}
function clearFieldFlags() {
  flagField("fieldUsername", false);
  flagField("fieldPassword", false);
}

// Shake the form once. Reserved for validation + wrong credentials; system
// errors never shake. Re-triggerable by removing and re-adding the class.
function shakeForm() {
  const wrap = document.getElementById("loginPanelInner");
  if (!wrap) return;
  wrap.classList.remove("is-shake");
  void wrap.offsetWidth; // reflow so the animation can restart
  wrap.classList.add("is-shake");
}

function setBusy(btn, busy) {
  btn.classList.toggle("is-busy", busy);
  btn.disabled = busy;
}

/* ─── lockout countdown (429) ────────────────────────────────────────── */

function formatLockout(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Disable Sign In and run a live countdown off the server's exact remaining
// seconds. When it reaches zero the lockout has truly cleared, so return to
// Default and re-enable the button.
function startLockoutCountdown(seconds, btn) {
  if (lockoutTimer) { clearInterval(lockoutTimer); lockoutTimer = null; }
  isLocked = true;
  let remaining = Math.max(1, Math.floor(Number(seconds) || 0));

  const countEl = document.getElementById("lockoutCount");
  setBusy(btn, false);   // not the in-flight spinner…
  btn.disabled = true;   // …but still disabled while locked
  showState("lockout");
  countEl.textContent = formatLockout(remaining);

  lockoutTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(lockoutTimer);
      lockoutTimer = null;
      isLocked = false;
      clearBanners();
      btn.disabled = false;
      return;
    }
    countEl.textContent = formatLockout(remaining);
  }, 1000);
}

/* ─── submit flow ────────────────────────────────────────────────────── */

async function handleLogin(event) {
  event.preventDefault();

  // Submitting while locked out is ignored; the button stays disabled.
  if (isLocked) return;

  const usernameEl = document.getElementById("username");
  const passwordEl = document.getElementById("password");
  const username = usernameEl.value.trim();
  const password = passwordEl.value;
  const btn = document.getElementById("loginBtn");

  // Any new submit clears the previous banner + field flags first.
  clearBanners();
  clearFieldFlags();

  // 1. Client validation before any network call.
  if (username === "" || password === "") {
    flagField("fieldUsername", username === "");
    flagField("fieldPassword", password === "");
    showState("validation");
    shakeForm();
    (username === "" ? usernameEl : passwordEl).focus();
    return;
  }

  // 2. In-flight: spinner + "Authenticating…", button disabled.
  setBusy(btn, true);

  try {
    const response = await fetch(`${API_BASE_URL}/api/login.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json().catch(() => ({}));

    // 3. Branch on the response.
    switch (response.status) {
      case 200: {
        // Success is the redirect itself, so keep the spinner up (no flash back
        // to idle) and never show a separate "signed in" screen.
        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("adminUsername", username);
        window.location.href = "dashboard.html";
        return;
      }

      case 400: {
        // Server fallback if the client `required` check was bypassed.
        setBusy(btn, false);
        flagField("fieldUsername", username === "");
        flagField("fieldPassword", password === "");
        showState("validation");
        shakeForm();
        return;
      }

      case 401: {
        setBusy(btn, false);
        flagField("fieldUsername", true);
        flagField("fieldPassword", true);
        showState("auth");
        shakeForm();
        passwordEl.value = "";     // clear password, keep username
        usernameEl.focus();
        return;
      }

      case 429: {
        // retryAfter (body) or the Retry-After header carries the exact seconds.
        const retry = data.retryAfter || response.headers.get("Retry-After") || 0;
        startLockoutCountdown(retry, btn);
        return;
      }

      case 503: {
        setBusy(btn, false);
        showState("dbdown"); // our fault: never flag fields, never shake
        return;
      }

      default: {
        // 500 and any other non-success status: generic system error.
        setBusy(btn, false);
        showState("srv500");
        return;
      }
    }
  } catch (err) {
    // The fetch itself rejected (offline, DNS, timeout): no HTTP status arrived.
    setBusy(btn, false);
    showState("offline");
  }
}
