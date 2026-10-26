import { supabase } from "../supabase.js";

const container = document.getElementById("labs-earnings-container");
const kpiTotal  = document.getElementById("kpi-total");
const kpiMonth  = document.getElementById("kpi-month");
const kpiCount  = document.getElementById("kpi-count");

document.addEventListener("labs:ready", (e) => {
  loadEarnings(e.detail.user.id);
});

async function loadEarnings(userId) {
  const { data, error } = await supabase.from("payouts").select("*, tasks(title)").eq("member_id", userId).order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = '<div class="labs-empty"><strong>Could not load earnings.</strong></div>';
    return;
  }

  const rows = data || [];
  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = rows.filter((r) => new Date(r.created_at) >= monthStart).reduce((s, r) => s + Number(r.amount || 0), 0);

  kpiTotal.textContent = "KSh " + total.toLocaleString();
  kpiMonth.textContent = "KSh " + thisMonth.toLocaleString();
  kpiCount.textContent = rows.length.toString();

  if (!rows.length) {
    container.innerHTML = '<div class="labs-empty"><strong>No payments yet.</strong></div>';
    return;
  }

  container.innerHTML = '<div class="admin-table-wrap"><div class="admin-table-scroll"><table class="admin-table"><thead><tr>' +
    '<th>Date</th><th>Task / Note</th><th>Amount</th><th>Status</th>' +
    '</tr></thead><tbody>' + rows.map(rowHtml).join("") + '</tbody></table></div></div>';
}

function rowHtml(r) {
  const t = r.tasks || {};
  return '<tr>' +
    '<td>' + formatDate(r.created_at) + '</td>' +
    '<td><strong>' + escapeHtml(t.title || "Task Payout") + '</strong></td>' +
    '<td><strong style="color:#10B981;">KSh ' + Number(r.amount || 0).toLocaleString() + '</strong></td>' +
    '<td><span class="dash-badge dash-badge--new">' + escapeHtml(r.status || "Processing") + '</span></td>' +
  '</tr>';
}

function formatDate(iso) { return iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : ""; }
function escapeHtml(str) { return String(str).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
