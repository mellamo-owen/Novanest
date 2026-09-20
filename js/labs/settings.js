// ============================================================
// NOVANEST Labs - Settings page
// ============================================================

import { supabase } from "../supabase.js";

const toastEl = document.getElementById("labs-toast");

document.addEventListener("labs:ready", (e) => {
  const profile = e.detail.profile;

  document.getElementById("profile-name").value = profile.full_name || "";
  document.getElementById("profile-role").value = profile.role || "";

  document.getElementById("change-password-form")
    .addEventListener("submit", handlePasswordChange);

  document.getElementById("update-profile-form")
    .addEventListener("submit", handleProfileUpdate);
});

async function handlePasswordChange(e) {
  e.preventDefault();
  const form = e.target;
  const newPass = form.new_password.value;
  const confirmPass = form.confirm_password.value;

  if (newPass.length < 8) { toast("Password must be at least 8 characters", "error"); return; }
  if (newPass !== confirmPass) { toast("Passwords do not match", "error"); return; }

  const { error } = await supabase.auth.updateUser({ password: newPass });

  if (error) { toast("Could not update password: " + error.message, "error"); return; }

  await supabase
    .from("member_profiles")
    .update({ temp_password: null })
    .eq("user_id", window.__labsMember.user.id);

  form.reset();
  toast("Password updated successfully", "success");
  window.__labsMember.profile.temp_password = null;
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  const form = e.target;
  const full_name = form.full_name.value.trim();
  const role = form.role.value.trim();

  if (!full_name) { toast("Name cannot be empty", "error"); return; }

  const { error } = await supabase
    .from("member_profiles")
    .update({ full_name, role, updated_at: new Date().toISOString() })
    .eq("user_id", window.__labsMember.user.id);

  if (error) { toast("Could not save profile: " + error.message, "error"); return; }

  window.__labsMember.profile.full_name = full_name;
  window.__labsMember.profile.role = role;

  document.querySelectorAll("[data-labs-name]").forEach((el) => {
    el.textContent = full_name;
  });

  toast("Profile saved", "success");
}

function toast(msg, variant) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.className = "labs-toast labs-toast--" + (variant || "success");
  toastEl.classList.add("is-visible");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove("is-visible"), 2800);
}
