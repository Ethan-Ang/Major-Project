// API_BASE_URL is defined in data.js

document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("adminToken")) {
    window.location.href = "dashboard.html";
  }
});

async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const btn = document.getElementById("loginBtn");
  const errorEl = document.getElementById("loginError");

  btn.textContent = "Signing in…";
  btn.disabled = true;
  errorEl.style.display = "none";

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Invalid username or password.");
    }

    localStorage.setItem("adminToken", data.token);
    window.location.href = "dashboard.html";

  } catch (err) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      errorEl.innerHTML = "Cannot connect to the backend server.<br><small>Make sure the backend is running at <code>localhost:5050</code> — run <code>npm start</code> in the backend folder.</small>";
    } else {
      errorEl.textContent = err.message;
    }
    errorEl.style.display = "block";
    btn.textContent = "Sign In";
    btn.disabled = false;
  }
}
