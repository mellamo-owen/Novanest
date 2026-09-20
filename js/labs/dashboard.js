// ============================================================
// NOVANEST Labs - Dashboard
// ============================================================

import { supabase } from "../supabase.js";

document.addEventListener("labs:ready", async (e) => {
  const profile = e.detail.profile;
  const userId = e.detail.user.id;
  if (!profile) return;

  setField("full_name", profile.full_name || "-");
  setField("email", profile.email || "-");
  setField("role", profile.role || "-");
  setField("status", profile.status || "-");
  setField("created_at", formatDate(profile.created_at));

  if (profile.temp_password) {
    const noticeBox = document.getElementById("change-password-notice");
    if (noticeBox) {
      noticeBox.innerHTML =
        '<div class="labs-notice">You are using a temporary password. ' +
        '<a href="settings.html">Change your password now</a></div>';
    }
  }

  // Stats for this member
  const [bidsRes, assignRes, payoutsRes] = await Promise.all([
    supabase.from("bids").select("id", { count: "exact", head: true }).eq("member_id", userId),
    supabase.from("bids").select("id", { count: "exact", head: true }).eq("member_id", userId).in("status", ["Approved", "Submitted"]),
    supabase.from("payouts").select("amount").eq("member_id", userId)
  ]);

  const bidsCount = bidsRes.count ?? 0;
  const assignCount = assignRes.count ?? 0;
  const totalEarned = (payoutsRes.data || []).reduce((s, r) => s + Number(r.amount || 0), 0);

  setField("stat-bids", bidsCount);
  setField("stat-assignments", assignCount);
  setField("stat-earned", "KSh " + totalEarned.toLocaleString());
});

function setField(name, value) {
  document.querySelectorAll('[data-labs-field="' + name + '"]').forEach((el) => {
    el.textContent = value;
  });
}

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}
