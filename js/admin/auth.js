// ============================================================
// NOVANEST — Admin auth module
// Fixed: detects login page even with Vercel clean URLs
// ============================================================

import { supabase } from "../supabase.js";

// ---------- 1. LOGIN PAGE LOGIC ----------
const loginForm = document.getElementById("login-form");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearLoginMessage(loginForm);

    const email    = loginForm.email.value.trim();
    const password = loginForm.password.value;

    if (!email || !password) {
      showLoginMessage(loginForm, "error", "Please enter both email and password.");
      return;
    }

    setLoginLoading(loginForm, true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setLoginLoading(loginForm, false);

    if (error) {
      showLoginMessage(loginForm, "error", "Invalid email or password.");
      return;
    }

    const isAdmin = await checkIsAdmin(data.user.id);
    if (!isAdmin) {
      await supabase.auth.signOut();
      showLoginMessage(
        loginForm,
        "error",
        "You are not authorized to access the Novanest CEO dashboard."
      );
      return;
    }

    window.location.href = "dashboard.html";
  });
}

// ---------- 2. SESSION GUARD (fixed for clean URLs) ----------
// Detect the login page robustly, whether the URL is:
//   /admin/login.html  OR  /admin/login  OR  /admin/login/
const path = window.location.pathname.toLowerCase();
const isLoginPage =
  path.endsWith("login") ||
  path.endsWith("login.html") ||
  path.endsWith("login/");

const isAdminPage = path.includes("/admin/") && !isLoginPage;

if (isAdminPage) {
  // Hide the page until we know who the user is.
  document.documentElement.style.visibility = "hidden";
  guardAdminPage();
}

async function guardAdminPage() {
  // 1. Is anyone logged in?
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;

  if (!user) {
    // Not logged in — send to login page.
    window.location.replace("login.html");
    return;
  }

  // 2. Is the logged-in user actually an admin?
  const isAdmin = await checkIsAdmin(user.id);
  if (!isAdmin) {
    await supabase.auth.signOut();
    document.documentElement.style.visibility = "visible";
    document.body.innerHTML = `
      <div style="max-width:520px;margin:5rem auto;padding:2rem;
                  font-family:system-ui;text-align:center;">
        <h1 style="color:#0b1f3a;">Not authorized</h1>
        <p style="color:#6b7280;">
          Your account is not registered as a Novanest administrator.
        </p>
        <p><a href="login.html" style="color:#0284c7;">Back to login →</a></p>
      </div>`;
    return;
  }

  // 3. Authorized — reveal the page.
  document.documentElement.style.visibility = "visible";

  window.__novanestAdmin = { user, logout, supabase };

  document.querySelectorAll("[data-admin-email]").forEach((el) => {
    el.textContent = user.email;
  });

  document.querySelectorAll("[data-logout]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  });

  document.dispatchEvent(new CustomEvent("admin:ready", { detail: { user } }));
}

// ---------- 3. HELPERS ----------
async function checkIsAdmin(userId) {
  const { data, error } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Admin check failed:", error);
    return false;
  }

  return !!data;
}

async function logout() {
  await supabase.auth.signOut();
  window.location.replace("login.html");
}

function showLoginMessage(formEl, type, text) {
  let box = formEl.querySelector(".form-message");
  if (!box) {
    box = document.createElement("div");
    box.className = "form-message";
    formEl.prepend(box);
  }
  box.className = "form-message form-message--" + type;
  box.textContent = text;
}

function clearLoginMessage(formEl) {
  const box = formEl.querySelector(".form-message");
  if (box) box.remove();
}

function setLoginLoading(formEl, isLoading) {
  const btn = formEl.querySelector('button[type="submit"]');
  if (!btn) return;
  if (isLoading) {
    btn.dataset.originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Logging in…";
  } else {
    btn.disabled = false;
    if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
  }
}