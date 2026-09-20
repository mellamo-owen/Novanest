// ============================================================
// NOVANEST — Contact messages admin
// ============================================================

import { supabase } from "../supabase.js";

const container    = document.getElementById("list-container");
const filterSearch = document.getElementById("filter-search");
const filterStatus = document.getElementById("filter-status");
const toastEl      = document.getElementById("toast");

let allRows = [];

document.addEventListener("admin:ready", () => {
  load();
  wireEvents();
});

async function load() {
  container.innerHTML = `<div class="admin-empty"><strong>Loading…</strong></div>`;
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = `<div class="admin-empty"><strong>Couldn't load.</strong>${error.message}</div>`;
    return;
  }
  allRows = data || [];
  render();
}

function render() {
  const term = (filterSearch.value || "").toLowerCase().trim();
  const status = filterStatus.value;

  const filtered = allRows.filter((r) => {
    if (term) {
      const hay = `${r.name || ""} ${r.subject || ""} ${r.email || ""}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    if (status && r.status !== status) return false;
    return true;
  });

  if (!filtered.length) {
    container.innerHTML = `<div class="admin-empty"><strong>No messages found.</strong></div>`;
    return;
  }

  container.innerHTML = filtered.map(cardHtml).join("");
}

function cardHtml(r) {
  return `
    <article class="msg-card" data-id="${r.id}">
      <div class="msg-card__head">
        <div>
          <h3 class="msg-card__title">${escapeHtml(r.subject || "(no subject)")}</h3>
          <div class="msg-card__meta">
            ${escapeHtml(r.name || "")} • ${escapeHtml(r.email || "")}
            ${r.phone ? " • " + escapeHtml(r.phone) : ""}
            • ${formatDate(r.created_at)}
          </div>
        </div>
        <div>
          <span class="dash-badge dash-badge--${statusCls(r.status)}">${escapeHtml(r.status || "")}</span>
        </div>
      </div>

      <div class="msg-card__body">${escapeHtml(r.message || "")}</div>

      <div class="msg-card__actions">
        <a href="mailto:${escapeHtml(r.email || "")}">Reply by Email</a>
        <select class="inline-select" data-action="set-status" data-id="${r.id}">
          <option value="">Change status…</option>
          <option value="New">New</option>
          <option value="Read">Read</option>
          <option value="Archived">Archived</option>
        </select>
        <button class="danger" data-action="delete" data-id="${r.id}">Delete</button>
      </div>
    </article>`;
}

function wireEvents() {
  filterSearch.addEventListener("input", render);
  filterStatus.addEventListener("change", render);
  container.addEventListener("change", handleStatusChange);
  container.addEventListener("click", handleClick);
}

async function handleStatusChange(e) {
  if (e.target.dataset.action !== "set-status") return;
  const value = e.target.value;
  if (!value) return;

  const { error } = await supabase
    .from("contact_messages")
    .update({ status: value })
    .eq("id", e.target.dataset.id);

  if (error) { showToast("Failed: " + error.message, "error"); return; }
  const r = allRows.find((x) => x.id === e.target.dataset.id);
  if (r) r.status = value;
  render();
  showToast("Status updated");
}

async function handleClick(e) {
  const btn = e.target.closest("button[data-action='delete']");
  if (!btn) return;
  if (!confirm("Delete this message?")) return;

  const { error } = await supabase.from("contact_messages").delete().eq("id", btn.dataset.id);
  if (error) { showToast("Delete failed: " + error.message, "error"); return; }
  showToast("Deleted");
  await load();
}

function statusCls(s) {
  const v = (s || "").toLowerCase();
  if (v === "read")     return "review";
  if (v === "archived") return "rejected";
  return "new";
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function showToast(msg, variant = "success") {
  toastEl.textContent = msg;
  toastEl.className = "toast toast--" + variant;
  toastEl.classList.add("is-visible");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove("is-visible"), 2500);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
