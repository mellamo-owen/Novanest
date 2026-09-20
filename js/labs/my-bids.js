// ============================================================
// NOVANEST Labs - My Bids page
// ============================================================

import { supabase } from "../supabase.js";

const container = document.getElementById("labs-bids-container");

document.addEventListener("labs:ready", (e) => {
  loadBids(e.detail.user.id);
});

async function loadBids(userId) {
  const { data, error } = await supabase
    .from("bids")
    .select("*, tasks(title, category, task_type, budget, status)")
    .eq("member_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Load bids error:", error);
    container.innerHTML = '<div class="labs-empty"><strong>Could not load bids.</strong>Please refresh.</div>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML =
      '<div class="labs-empty">' +
        '<strong>No bids yet.</strong>' +
        'Browse <a href="tasks.html">open tasks</a> and submit a proposal.' +
      '</div>';
    return;
  }

  container.innerHTML = data.map(cardHtml).join("");
}

function cardHtml(b) {
  const t = b.tasks || {};
  const statusPill = statusBadge(b.status);

  const amount = b.amount
    ? '<div><strong>Your price:</strong> KSh ' + Number(b.amount).toLocaleString() + '</div>'
    : '';

  const timeline = b.timeline
    ? '<div><strong>Timeline:</strong> ' + escapeHtml(b.timeline) + '</div>'
    : '';

  const deadline = b.deadline
    ? '<div><strong>Deadline:</strong> ' + formatDate(b.deadline) + '</div>'
    : '';

  const taskMeta =
    '<div style="color:#6b7280;font-size:0.85rem;">' +
      escapeHtml(t.category || "") +
      (t.task_type ? ' - ' + escapeHtml(t.task_type) : '') +
    '</div>';

  return '<div class="labs-card" style="margin-bottom:1rem;">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;margin-bottom:0.5rem;">' +
      '<div>' +
        '<h2 style="margin:0 0 0.25rem;">' + escapeHtml(t.title || "Task") + '</h2>' +
        taskMeta +
      '</div>' +
      statusPill +
    '</div>' +
    '<div style="display:grid;gap:0.3rem;font-size:0.9rem;color:#4b5563;margin-bottom:0.75rem;">' +
      amount + timeline + deadline +
    '</div>' +
    '<div style="background:#f5f8fc;border:1px solid #e5e7eb;border-radius:10px;padding:0.85rem;font-size:0.9rem;white-space:pre-wrap;color:#1f2937;">' +
      escapeHtml(b.proposal || "") +
    '</div>' +
    '<div style="color:#6b7280;font-size:0.75rem;margin-top:0.6rem;">Submitted ' + formatDate(b.created_at) + '</div>' +
  '</div>';
}

function statusBadge(status) {
  const s = (status || "Pending").toLowerCase();
  let cls = "dash-badge--pending";
  if (s === "approved") cls = "dash-badge--verified";
  else if (s === "rejected") cls = "dash-badge--rejected";

  return '<span class="dash-badge ' + cls + '">' + escapeHtml(status) + '</span>';
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
