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
    const response = await fetch(`${API_BASE_URL}/api/login.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Invalid username or password.");
    }

    localStorage.setItem("adminToken", data.token);
    localStorage.setItem("adminUsername", username);
    window.location.href = "dashboard.html";

  } catch (err) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      errorEl.textContent = "Cannot connect to the login server. Please check that api/login.php has been uploaded correctly.";
    } else {
      errorEl.textContent = err.message;
    }

    errorEl.style.display = "block";
    btn.textContent = "Sign In";
    btn.disabled = false;
  }
}