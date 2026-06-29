// API_BASE_URL is defined in data.js

let lockoutTimer = null; // live countdown interval while rate-limited

document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("adminToken")) {
    window.location.href = "dashboard.html";
  }
});

// "7:42" when a minute or more remains, otherwise "42s".
function formatLockout(sec) {
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  return `${sec}s`;
}

// Disable Sign In and show a live countdown from the server's exact retryAfter
// seconds. When it reaches zero the lockout has really cleared, so re-enable.
function startLockoutCountdown(seconds, btn, errorEl) {
  if (lockoutTimer) { clearInterval(lockoutTimer); lockoutTimer = null; }
  let remaining = Math.max(1, Math.floor(Number(seconds) || 0));
  btn.disabled = true;
  btn.textContent = "Locked";

  const render = () => {
    errorEl.textContent = `Too many login attempts. Try again in ${formatLockout(remaining)}.`;
    errorEl.style.display = "block";
  };
  render();

  lockoutTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(lockoutTimer);
      lockoutTimer = null;
      errorEl.style.display = "none";
      errorEl.textContent = "";
      btn.disabled = false;
      btn.textContent = "Sign In";
      return;
    }
    render();
  }, 1000);
}

async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const btn = document.getElementById("loginBtn");
  const errorEl = document.getElementById("loginError");

  // If a lockout countdown is running, ignore submit attempts until it clears.
  if (lockoutTimer) return;

  btn.textContent = "Signing in…";
  btn.disabled = true;
  errorEl.style.display = "none";

  try {
    const response = await fetch(`${API_BASE_URL}/api/login.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json().catch(() => ({}));

    // Rate limited: show the real remaining time as a live countdown and keep the
    // button disabled until it hits zero (do not throw).
    if (response.status === 429) {
      startLockoutCountdown(data.retryAfter, btn, errorEl);
      return;
    }

    if (!response.ok) {
      throw new Error(data.message || "Invalid username or password.");
    }

    localStorage.setItem("adminToken", data.token);
    localStorage.setItem("adminUsername", username);
    window.location.href = "dashboard.html";

  } catch (err) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      errorEl.textContent = "Cannot reach the server right now. Please check your connection and try again.";
    } else {
      errorEl.textContent = err.message;
    }

    errorEl.style.display = "block";
    btn.textContent = "Sign In";
    btn.disabled = false;
  }
}