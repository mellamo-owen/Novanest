// ============================================================
// NOVANEST - Admin Payouts list
// ============================================================

import { supabase } from "../supabase.js";

const container    = document.getElementById("payouts-container");
const filterSearch = document.getElementById("filter-search");
const toastEl      = document.getElementById("toast");

const kpiTotal   = document.getElementById("kpi-total");
const kpiCount   = document.getElementById("kpi-count");
const kpiMembers = document.getElementById("kpi-members");
const kpiMonth   = document.getElementById("kpi-month");

let allRows = [];
let memberMap = {};

document.addEventListener("admin:ready", () => {
  load();
  filterSearch.addEventListener("input", render);
});

async function load() {
  container.innerHTML = '<div class="admin-empty"><strong>Loading payouts...</strong></div>';

  const { data, error } = await supabase
    .from("payouts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = '<div class="admin-empty"><strong>Could not load payouts.</strong>' + error.message + '</div>';
    return;
  }

  allRows = data || [];

  // Fetch member names
  const ids = [...new Set(allRows.map((r) => r.member_id).filter(Boolean))];
  if (ids.length) {
    const { data: profiles } = await supabase
      .from("member_profiles")
      .select("user_id, full_name, email")
      .in("user_id", ids);
    memberMap = {};
    (profiles || []).forEach((p) => { memberMap[p.user_id] = p; });
  }

  computeKPIs();
  render();
}

function computeKPIs() {
  const total = allRows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const count = allRows.length;
  const members = new Set(allRows.map((r) => r.member_id)).size;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = allRows
    .filter((r) => new Date(r.created_at) >= monthStart)
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  kpiTotal.textContent = "KSh " + total.toLocaleString();
  kpiCount.textContent = count.toString();
  kpiMembers.textContent = members.toString();
  kpiMonth.textContent = "KSh " + thisMonth.toLocaleString();
}

function render() {
  const term = (filterSearch.value || "").toLowerCase().trim();

  const filtered = allRows.filter((r) => {
    if (!term) return true;
    const m = memberMap[r.member_id] || {};
    const hay = [m.full_name, m.email, r.reference, r.method, r.notes].join(" ").toLowerCase();
    return hay.includes(term);
  });

  if (!filtered.length) {
    container.innerHTML = '<div class="admin-empty"><strong>No payouts found.</strong>Log payments from the Tasks page.</div>';
    return;
  }

  container.innerHTML =
    '<div class="admin-table-wrap"><div class="admin-table-scroll">' +
      '<table class="admin-table"><thead><tr>' +
        '<th>Date</th><th>Member</th><th>Amount</th><th>Method</th>' +
        '<th>Reference</th><th>Notes</th><th>Status</th>' +
      '</tr></thead><tbody>' + filtered.map(rowHtml).join("") + '</tbody></table>' +
    '</div></div>';
}

function rowHtml(r) {
  const m = memberMap[r.member_id] || {};
  const name = m.full_name || "Unknown member";
  const email = m.email || "";
  const date = formatDate(r.created_at);
  const amount = "KSh " + Number(r.amount || 0).toLocaleString();

  return '<tr>' +
    '<td>' + date + '</td>' +
    '<td><strong>' + escapeHtml(name) + '</strong><div style="color:#6b7280;font-size:0.75rem;">' + escapeHtml(email) + '</div></td>' +
    '<td><strong>' + amount + '</strong></td>' +
    '<td>' + escapeHtml(r.method || "") + '</td>' +
    '<td>' + escapeHtml(r.reference || "-") + '</td>' +
    '<td>' + escapeHtml(r.notes || "-") + '</td>' +
    '<td><span class="dash-badge dash-badge--verified">' + escapeHtml(r.status || "Paid") + '</span></td>' +
  '</tr>';
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
