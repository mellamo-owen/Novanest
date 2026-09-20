// ============================================================
// NOVANEST — Support Verification admin
// ------------------------------------------------------------
// • Lists support contributions
// • Verify / Reject actions
// • Computes live KPI totals (verified only)
// ============================================================

import { supabase } from "../supabase.js";

// ---------- DOM ----------
const container    = document.getElementById("support-container");
const filterSearch = document.getElementById("filter-search");
const filterStatus = document.getElementById("filter-status");
const toastEl      = document.getElementById("toast");

const kpiTotal      = document.getElementById("kpi-total");
const kpiSupporters = document.getElementById("kpi-supporters");
const kpiMonth      = document.getElementById("kpi-month");
const kpiPending    = document.getElementById("kpi-pending");

// ---------- State ----------
let allRows = [];

// ---------- Boot ----------
document.addEventListener("admin:ready", () => {
  loadSupport();
  wireEvents();
});

// ============================================================
// 1. LOAD
// ============================================================
async function loadSupport() {
  container.innerHTML = `<div class="admin-empty"><strong>Loading…</strong></div>`;

  const { data, error } = await supabase
    .from("support")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    container.innerHTML = `<div class="admin-empty"><strong>Couldn't load support entries.</strong>${error.message}</div>`;
    return;
  }

  allRows = data || [];
  computeKPIs();
  renderList();
}

// ============================================================
// 2. KPIs
// ============================================================
function computeKPIs() {
  const verified = allRows.filter((r) => r.status === "Verified");
  const pending  = allRows.filter((r) => r.status === "Pending");

  const total = verified.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  // This calendar month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = verified
    .filter((r) => new Date(r.created_at) >= monthStart)
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  kpiTotal.textContent      = "KSh " + total.toLocaleString();
  kpiSupporters.textContent = verified.length.toString();
  kpiMonth.textContent      = "KSh " + thisMonth.toLocaleString();
  kpiPending.textContent    = pending.length.toString();
}

// ============================================================
// 3. RENDER
// ============================================================
function renderList() {
  const term   = (filterSearch.value || "").toLowerCase().trim();
  const status = filterStatus.value;

  const filtered = allRows.filter((r) => {
    if (term) {
      const hay = `${r.name || ""} ${r.transaction_code || ""}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    if (status && r.status !== status) return false;
    return true;
  });

  if (!filtered.length) {
    container.innerHTML = `
      <div class="admin-empty">
        <strong>No support entries found.</strong>
        Adjust filters or wait for new submissions.
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="admin-table-wrap">
      <div class="admin-table-scroll">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Amount</th>
              <th>Reference</th>
              <th>Message</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(rowHtml).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
}

function rowHtml(r) {
  const statusCls = statusClass(r.status);
  const amount    = Number(r.amount || 0).toLocaleString();
  const message   = r.message
    ? escapeHtml(r.message.length > 60 ? r.message.slice(0, 60) + "…" : r.message)
    : "—";

  // Actions depend on current status
  const actions = [];
  if (r.status !== "Verified") {
    actions.push(`<button class="success" data-action="verify" data-id="${r.id}">Verify</button>`);
  }
  if (r.status !== "Rejected") {
    actions.push(`<button class="danger" data-action="reject" data-id="${r.id}">Reject</button>`);
  }
  if (r.status !== "Pending") {
    actions.push(`<button data-action="reset" data-id="${r.id}">Reset to Pending</button>`);
  }

  return `
    <tr data-id="${r.id}">
      <td>${formatDate(r.created_at)}</td>
      <td><strong>${escapeHtml(r.name || "")}</strong></td>
      <td>KSh ${amount}</td>
      <td><code>${escapeHtml(r.transaction_code || "")}</code></td>
      <td>${message}</td>
      <td>
        <span class="dash-badge dash-badge--${statusCls}">
          ${escapeHtml(r.status || "")}
        </span>
      </td>
      <td>
        <div class="row-actions">
          ${actions.join("")}
        </div>
      </td>
    </tr>`;
}

// ============================================================
// 4. EVENTS
// ============================================================
function wireEvents() {
  filterSearch.addEventListener("input", renderList);
  filterStatus.addEventListener("change", renderList);

  container.addEventListener("click", handleRowClick);
}

async function handleRowClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const id = btn.closest("tr")?.dataset.id;
  const row = allRows.find((r) => r.id === id);
  if (!row) return;

  const action = btn.dataset.action;

  if (action === "verify") {
    if (!confirm(`Verify ${row.name}'s contribution of KSh ${row.amount}?`)) return;
    await setStatus(id, "Verified");
    return;
  }

  if (action === "reject") {
    if (!confirm(`Reject ${row.name}'s contribution?`)) return;
    await setStatus(id, "Rejected");
    return;
  }

  if (action === "reset") {
    if (!confirm("Reset this entry back to Pending?")) return;
    await setStatus(id, "Pending");
    return;
  }
}

async function setStatus(id, status) {
  const update = { status };

  // When verified, stamp verified_at; otherwise clear it
  if (status === "Verified") {
    update.verified_at = new Date().toISOString();
  } else {
    update.verified_at = null;
  }

  const { error } = await supabase
    .from("support")
    .update(update)
    .eq("id", id);

  if (error) {
    showToast("Update failed: " + error.message, "error");
    return;
  }

  const row = allRows.find((r) => r.id === id);
  if (row) {
    row.status = status;
    row.verified_at = update.verified_at;
  }

  computeKPIs();
  renderList();
  showToast(`Marked as ${status}`);
}

// ============================================================
// 5. UTILS
// ============================================================
function statusClass(status) {
  const s = (status || "").toLowerCase();
  if (s === "verified") return "verified";
  if (s === "rejected") return "rejected";
  if (s === "new")      return "new";
  return "pending";
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function showToast(msg, variant = "success") {
  toastEl.textContent = msg;
  toastEl.className = "toast toast--" + variant;
  toastEl.classList.add("is-visible");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove("is-visible"), 2800);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
