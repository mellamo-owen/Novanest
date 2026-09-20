// ============================================================
// NOVANEST — Careers admin
// ============================================================

import { supabase } from "../supabase.js";

const container  = document.getElementById("list-container");
const modal      = document.getElementById("career-modal");
const modalTitle = document.getElementById("modal-title");
const form       = document.getElementById("career-form");
const btnNew     = document.getElementById("btn-new-career");
const btnCancel  = document.getElementById("c-cancel");
const toastEl    = document.getElementById("toast");

let allRows = [];

document.addEventListener("admin:ready", () => {
  load();
  wireEvents();
});

async function load() {
  container.innerHTML = `<div class="admin-empty"><strong>Loading…</strong></div>`;
  const { data, error } = await supabase
    .from("careers")
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
  if (!allRows.length) {
    container.innerHTML = `<div class="admin-empty"><strong>No opportunities yet.</strong>Click "New Opportunity" to create one.</div>`;
    return;
  }

  container.innerHTML = allRows.map(cardHtml).join("");
}

function cardHtml(c) {
  const statusCls = c.status === "Open" ? "verified" : "rejected";
  return `
    <article class="msg-card" data-id="${c.id}">
      <div class="msg-card__head">
        <div>
          ${c.role ? `<div class="career-card__role">${escapeHtml(c.role)}</div>` : ""}
          <h3 class="msg-card__title">${escapeHtml(c.title || "")}</h3>
        </div>
        <div>
          <span class="dash-badge dash-badge--${statusCls}">${escapeHtml(c.status || "")}</span>
        </div>
      </div>

      ${c.description ? `<div class="msg-card__body">${escapeHtml(c.description)}</div>` : ""}

      ${c.requirements ? `
        <div class="msg-card__kv">
          <div><strong>Requirements:</strong></div>
          <div style="white-space:pre-wrap;">${escapeHtml(c.requirements)}</div>
        </div>` : ""}

      <div class="msg-card__actions">
        <button data-action="edit" data-id="${c.id}">Edit</button>
        <button data-action="toggle-status" data-id="${c.id}">
          ${c.status === "Open" ? "Close" : "Reopen"}
        </button>
        <button class="danger" data-action="delete" data-id="${c.id}">Delete</button>
      </div>
    </article>`;
}

function wireEvents() {
  btnNew.addEventListener("click", () => openModal());
  btnCancel.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  form.addEventListener("submit", handleSubmit);
  container.addEventListener("click", handleRowClick);
}

function openModal(career = null) {
  form.reset();
  if (career) {
    modalTitle.textContent = "Edit Opportunity";
    document.getElementById("c-id").value     = career.id;
    document.getElementById("c-title").value  = career.title || "";
    document.getElementById("c-role").value   = career.role || "";
    document.getElementById("c-desc").value   = career.description || "";
    document.getElementById("c-reqs").value   = career.requirements || "";
    document.getElementById("c-status").value = career.status || "Open";
  } else {
    modalTitle.textContent = "New Opportunity";
    document.getElementById("c-id").value = "";
    document.getElementById("c-status").value = "Open";
  }
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => document.getElementById("c-title").focus(), 50);
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
}

async function handleSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("c-id").value;

  const payload = {
    title:        document.getElementById("c-title").value.trim(),
    role:         document.getElementById("c-role").value || null,
    description:  document.getElementById("c-desc").value.trim() || null,
    requirements: document.getElementById("c-reqs").value.trim() || null,
    status:       document.getElementById("c-status").value || "Open"
  };

  if (!payload.title) { showToast("Title is required", "error"); return; }

  let error;
  if (id) {
    ({ error } = await supabase.from("careers").update(payload).eq("id", id));
  } else {
    ({ error } = await supabase.from("careers").insert(payload));
  }

  if (error) { showToast("Save failed: " + error.message, "error"); return; }

  showToast(id ? "Opportunity updated" : "Opportunity created");
  closeModal();
  await load();
}

async function handleRowClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  const row = allRows.find((x) => x.id === id);
  if (!row) return;

  const action = btn.dataset.action;

  if (action === "edit") {
    openModal(row);
    return;
  }

  if (action === "toggle-status") {
    const next = row.status === "Open" ? "Closed" : "Open";
    const { error } = await supabase.from("careers").update({ status: next }).eq("id", id);
    if (error) { showToast("Update failed: " + error.message, "error"); return; }
    row.status = next;
    render();
    showToast(`Marked ${next}`);
    return;
  }

  if (action === "delete") {
    if (!confirm(`Delete "${row.title}"?`)) return;
    const { error } = await supabase.from("careers").delete().eq("id", id);
    if (error) { showToast("Delete failed: " + error.message, "error"); return; }
    showToast("Deleted");
    await load();
  }
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
