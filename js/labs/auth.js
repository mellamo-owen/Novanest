// ============================================================
// NOVANEST Labs - Member auth module
// ============================================================

import { supabase } from "../supabase.js";

// ---------- 1. LOGIN PAGE ----------
const loginForm = document.getElementById("labs-login-form");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage(loginForm);

    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;

    if (!email || !password) {
      showMessage(loginForm, "error", "Please enter both email and password.");
      return;
    }

    setLoading(loginForm, true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(loginForm, false);

    if (error) {
      showMessage(loginForm, "error", "Invalid email or password.");
      return;
    }

    const { data: profile, error: profileErr } = await supabase
      .from("member_profiles")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (profileErr || !profile) {
      await supabase.auth.signOut();
      showMessage(loginForm, "error", "This account is not registered as a Novanest Labs member.");
      return;
    }

    window.location.href = "dashboard.html";
  });
}

// ---------- 2. SESSION GUARD ----------
const path = window.location.pathname.toLowerCase();
const isLoginPage = path.endsWith("login") || path.endsWith("login.html") || path.endsWith("login/");
const isLabsPage = path.includes("/labs/") && !isLoginPage;

if (isLabsPage) {
  document.documentElement.style.visibility = "hidden";
  guardLabsPage();
}

async function guardLabsPage() {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData && sessionData.session ? sessionData.session.user : null;

  if (!user) { window.location.replace("login.html"); return; }

  const { data: profile } = await supabase
    .from("member_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    window.location.replace("login.html");
    return;
  }

  document.documentElement.style.visibility = "visible";

  window.__labsMember = { user, profile, logout, supabase };

  document.querySelectorAll("[data-labs-name]").forEach((el) => {
    el.textContent = profile.full_name || user.email;
  });

  document.querySelectorAll("[data-labs-logout]").forEach((btn) => {
    btn.addEventListener("click", (e) => { e.preventDefault(); logout(); });
  });

  document.dispatchEvent(new CustomEvent("labs:ready", { detail: { user, profile } }));
}

// ---------- 3. HELPERS ----------
async function logout() {
  await supabase.auth.signOut();
  window.location.replace("login.html");
}

function showMessage(formEl, type, text) {
  let box = formEl.querySelector(".form-message");
  if (!box) {
    box = document.createElement("div");
    box.className = "form-message";
    formEl.prepend(box);
  }
  box.className = "form-message form-message--" + type;
  box.textContent = text;
}

function clearMessage(formEl) {
  const box = formEl.querySelector(".form-message");
  if (box) box.remove();
}

function setLoading(formEl, isLoading) {
  const btn = formEl.querySelector('button[type="submit"]');
  if (!btn) return;
  if (isLoading) {
    btn.dataset.originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Signing in...";
  } else {
    btn.disabled = false;
    if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
  }
}
