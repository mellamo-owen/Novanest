// ============================================================
// NOVANEST — Team Members admin
// Full CRUD for team_members, including photo upload.
// ============================================================

import { supabase } from "../supabase.js";

// ---------- DOM ----------
const container    = document.getElementById("team-container");
const modal        = document.getElementById("member-modal");
const modalTitle   = document.getElementById("modal-title");
const form         = document.getElementById("member-form");
const btnNew       = document.getElementById("btn-new-member");
const btnCancel    = document.getElementById("m-cancel");
const filterSearch = document.getElementById("filter-search");
const filterActive = document.getElementById("filter-active");
const photoInput   = document.getElementById("m-photo-file");
const photoPreview = document.getElementById("photo-preview");
const toastEl      = document.getElementById("toast");

// ---------- State ----------
let allMembers = [];
let photoFile = null;

// ---------- Boot ----------
document.addEventListener("admin:ready", () => {
  loadMembers();
  wireEvents();
});

// ============================================================
// 1. LOAD
// ============================================================
async function loadMembers() {
  container.innerHTML = `<div class="admin-empty"><strong>Loading…</strong></div>`;

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = `<div class="admin-empty"><strong>Couldn't load team.</strong>${error.message}</div>`;
    console.error(error);
    return;
  }

  allMembers = data || [];
  renderList();
}

// ============================================================
// 2. RENDER
// ============================================================
function renderList() {
  const term = (filterSearch.value || "").toLowerCase().trim();
  const actv = filterActive.value;

  const filtered = allMembers.filter((m) => {
    if (term && !(m.name || "").toLowerCase().includes(term)) return false;
    if (actv === "true"  && m.active !== true)  return false;
    if (actv === "false" && m.active !== false) return false;
    return true;
  });

  if (!filtered.length) {
    container.innerHTML = `
      <div class="admin-empty">
        <strong>No team members found.</strong>
        Click "Add Member" to create one.
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="admin-table-wrap">
      <div class="admin-table-scroll">
        <table class="admin-table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Role</th>
              <th>Skills</th>
              <th>Visible</th>
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

function rowHtml(m) {
  const initials = getInitials(m.name || "N");
  const photo = m.photo_url
    ? `<img class="thumb" src="${escapeHtml(m.photo_url)}" alt="" style="border-radius:50%;width:40px;height:40px;" />`
    : `<div class="thumb-placeholder" style="border-radius:50%;width:40px;height:40px;">${initials}</div>`;

  const pillClass = m.active ? "is-on" : "";

  return `
    <tr data-id="${m.id}">
      <td>${photo}</td>
      <td><strong>${escapeHtml(m.name || "")}</strong></td>
      <td>${escapeHtml(m.role || "")}</td>
      <td>${escapeHtml(m.skills || "")}</td>
      <td>
        <button class="pill-toggle ${pillClass}" data-action="toggle-active">
          ${m.active ? "Visible" : "Hidden"}
        </button>
      </td>
      <td>
        <div class="row-actions">
          <button data-action="edit">Edit</button>
          <button class="danger" data-action="delete">Delete</button>
        </div>
      </td>
    </tr>`;
}

// ============================================================
// 3. EVENTS
// ============================================================
function wireEvents() {
  filterSearch.addEventListener("input", renderList);
  filterActive.addEventListener("change", renderList);

  btnNew.addEventListener("click", () => openModal());
  btnCancel.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  form.addEventListener("submit", handleSubmit);
  photoInput.addEventListener("change", handlePhotoChange);

  container.addEventListener("click", handleRowClick);
}

// ============================================================
// 4. MODAL
// ============================================================
function openModal(member = null) {
  form.reset();
  photoFile = null;
  updatePhotoPreview(null);
  document.getElementById("m-photo-url").value = "";

  if (member) {
    modalTitle.textContent = "Edit Team Member";
    document.getElementById("m-id").value        = member.id;
    document.getElementById("m-name").value      = member.name || "";
    document.getElementById("m-role").value      = member.role || "";
    document.getElementById("m-bio").value       = member.bio || "";
    document.getElementById("m-skills").value    = member.skills || "";
    document.getElementById("m-photo-url").value = member.photo_url || "";
    document.getElementById("m-github").value    = member.github_url || "";
    document.getElementById("m-linkedin").value  = member.linkedin_url || "";
    document.getElementById("m-portfolio").value = member.portfolio_url || "";
    document.getElementById("m-active").checked  = !!member.active;

    if (member.photo_url) updatePhotoPreview(member.photo_url);
  } else {
    modalTitle.textContent = "Add Team Member";
    document.getElementById("m-id").value = "";
    document.getElementById("m-active").checked = true;
  }

  modal.hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => document.getElementById("m-name").focus(), 50);
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
}

// ============================================================
// 5. PHOTO HANDLING
// ============================================================
function handlePhotoChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  photoFile = file;
  const reader = new FileReader();
  reader.onload = (ev) => updatePhotoPreview(ev.target.result);
  reader.readAsDataURL(file);
}

function updatePhotoPreview(src) {
  if (src) {
    photoPreview.innerHTML = `<img src="${src}" alt="preview" />`;
  } else {
    photoPreview.textContent = "No photo";
  }
}

async function uploadPhoto(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  const filename = `team-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `team/${filename}`;

  const { error } = await supabase.storage
    .from("project-images")
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from("project-images").getPublicUrl(path);
  return data.publicUrl;
}

// ============================================================
// 6. SUBMIT
// ============================================================
async function handleSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("m-id").value;

  const payload = {
    name:          document.getElementById("m-name").value.trim(),
    role:          document.getElementById("m-role").value.trim(),
    bio:           document.getElementById("m-bio").value.trim() || null,
    skills:        document.getElementById("m-skills").value.trim() || null,
    github_url:    document.getElementById("m-github").value.trim() || null,
    linkedin_url:  document.getElementById("m-linkedin").value.trim() || null,
    portfolio_url: document.getElementById("m-portfolio").value.trim() || null,
    active:        document.getElementById("m-active").checked
  };

  if (!payload.name || !payload.role) {
    showToast("Name and role are required", "error");
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  const original = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving…";

  try {
    if (photoFile) {
      payload.photo_url = await uploadPhoto(photoFile);
    } else {
      const existing = document.getElementById("m-photo-url").value;
      if (existing) payload.photo_url = existing;
    }

    let error;
    if (id) {
      ({ error } = await supabase.from("team_members").update(payload).eq("id", id));
    } else {
      ({ error } = await supabase.from("team_members").insert(payload));
    }

    if (error) throw error;

    showToast(id ? "Member updated ✅" : "Member added ✅");
    closeModal();
    await loadMembers();
  } catch (err) {
    console.error(err);
    showToast("Couldn't save: " + err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = original;
  }
}

// ============================================================
// 7. ROW ACTIONS
// ============================================================
async function handleRowClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const id = btn.closest("tr")?.dataset.id;
  const member = allMembers.find((m) => m.id === id);
  if (!member) return;

  const action = btn.dataset.action;

  if (action === "edit") {
    openModal(member);
    return;
  }

  if (action === "delete") {
    if (!confirm(`Remove ${member.name} from the team?`)) return;
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) { showToast("Delete failed: " + error.message, "error"); return; }
    showToast("Member removed");
    await loadMembers();
    return;
  }

  if (action === "toggle-active") {
    const next = !member.active;
    const { error } = await supabase.from("team_members").update({ active: next }).eq("id", id);
    if (error) { showToast("Update failed: " + error.message, "error"); return; }
    member.active = next;
    renderList();
  }
}

// ============================================================
// 8. UTILS
// ============================================================
function getInitials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
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
