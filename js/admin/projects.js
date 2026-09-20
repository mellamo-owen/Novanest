// ============================================================
// NOVANEST — Admin Projects CRUD (dashboard)
// Path: js/admin/projects.js
// Used on: /admin/projects.html
// ============================================================

import { supabase } from "../supabase.js";

// ---------- DOM ----------
const container    = document.getElementById("projects-container");
const modal        = document.getElementById("project-modal");
const modalTitle   = document.getElementById("modal-title");
const form         = document.getElementById("project-form");
const toastEl      = document.getElementById("toast");

const btnNew       = document.getElementById("btn-new-project");
const btnCancel    = document.getElementById("btn-cancel");
const filterSearch = document.getElementById("filter-search");
const filterStatus = document.getElementById("filter-status");
const filterPubbed = document.getElementById("filter-published");

const imageInput   = document.getElementById("p-image");
const imagePreview = document.getElementById("image-preview");

// ---------- State ----------
let allProjects = [];
let imageFile = null;

// ---------- Boot ----------
document.addEventListener("admin:ready", () => {
  loadProjects();
  wireEvents();
});

// ============================================================
// 1. LOAD
// ============================================================
async function loadProjects() {
  container.innerHTML = `<div class="admin-empty"><strong>Loading projects…</strong></div>`;

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Load error:", error);
    container.innerHTML = `<div class="admin-empty"><strong>Couldn't load projects.</strong>${error.message}</div>`;
    return;
  }

  allProjects = data || [];
  renderList();
}

function renderList() {
  const term   = (filterSearch.value || "").toLowerCase().trim();
  const status = filterStatus.value;
  const pub    = filterPubbed.value;

  const filtered = allProjects.filter((p) => {
    if (term && !(p.title || "").toLowerCase().includes(term)) return false;
    if (status && p.status !== status) return false;
    if (pub === "true"  && p.published !== true)  return false;
    if (pub === "false" && p.published !== false) return false;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="admin-empty">
        <strong>No projects found.</strong>
        Try adjusting the filters or click "Add Project" to create one.
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
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Published</th>
              <th>Featured</th>
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

function rowHtml(p) {
  const thumb = p.image_url
    ? `<img class="thumb" src="${escapeHtml(p.image_url)}" alt="" />`
    : `<div class="thumb-placeholder">N/A</div>`;

  const pubClass  = p.published ? "is-on" : "";
  const featClass = p.featured  ? "is-featured" : "";

  return `
    <tr data-id="${p.id}">
      <td>${thumb}</td>
      <td><strong>${escapeHtml(p.title || "")}</strong></td>
      <td>${escapeHtml(p.category || "")}</td>
      <td>${escapeHtml(p.status || "")}</td>
      <td>
        <button class="pill-toggle ${pubClass}" data-action="toggle-published">
          ${p.published ? "Published" : "Draft"}
        </button>
      </td>
      <td>
        <button class="pill-toggle ${featClass}" data-action="toggle-featured">
          ${p.featured ? "Featured" : "Normal"}
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
// 2. EVENTS
// ============================================================
function wireEvents() {
  filterSearch.addEventListener("input", renderList);
  filterStatus.addEventListener("change", renderList);
  filterPubbed.addEventListener("change", renderList);

  btnNew.addEventListener("click", () => openModal());
  btnCancel.addEventListener("click", closeModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  form.addEventListener("submit", handleSubmit);
  imageInput.addEventListener("change", handleImageChange);
  container.addEventListener("click", handleRowClick);
}

// ============================================================
// 3. MODAL
// ============================================================
function openModal(project = null) {
  form.reset();
  imageFile = null;
  updateImagePreview(null);

  if (project) {
    modalTitle.textContent = "Edit Project";
    document.getElementById("p-id").value           = project.id;
    document.getElementById("p-title").value        = project.title || "";
    document.getElementById("p-description").value  = project.description || "";
    document.getElementById("p-category").value     = project.category || "";
    document.getElementById("p-status").value       = project.status || "Concept";
    document.getElementById("p-tech").value         = (project.technologies || []).join(", ");
    document.getElementById("p-github").value       = project.github_url || "";
    document.getElementById("p-live").value         = project.live_url || "";
    document.getElementById("p-featured").checked   = !!project.featured;
    document.getElementById("p-published").checked  = !!project.published;

    if (project.image_url) updateImagePreview(project.image_url);
  } else {
    modalTitle.textContent = "Add Project";
    document.getElementById("p-id").value = "";
  }

  modal.hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => document.getElementById("p-title").focus(), 50);
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
}

// ============================================================
// 4. IMAGE
// ============================================================
function handleImageChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  imageFile = file;

  const reader = new FileReader();
  reader.onload = (ev) => updateImagePreview(ev.target.result);
  reader.readAsDataURL(file);
}

function updateImagePreview(src) {
  if (src) {
    imagePreview.innerHTML = `<img src="${src}" alt="preview" />`;
  } else {
    imagePreview.textContent = "No image";
  }
}

async function uploadImage(file) {
  const ext      = file.name.split(".").pop().toLowerCase();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path     = `covers/${filename}`;

  const { error } = await supabase.storage
    .from("project-images")
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) throw error;

  const { data } = supabase.storage
    .from("project-images")
    .getPublicUrl(path);

  return data.publicUrl;
}

// ============================================================
// 5. SUBMIT
// ============================================================
async function handleSubmit(e) {
  e.preventDefault();

  const id = document.getElementById("p-id").value;

  const techRaw = document.getElementById("p-tech").value;
  const technologies = techRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const payload = {
    title:        document.getElementById("p-title").value.trim(),
    description:  document.getElementById("p-description").value.trim() || null,
    category:     document.getElementById("p-category").value || null,
    status:       document.getElementById("p-status").value || "Concept",
    technologies,
    github_url:   document.getElementById("p-github").value.trim() || null,
    live_url:     document.getElementById("p-live").value.trim() || null,
    featured:     document.getElementById("p-featured").checked,
    published:    document.getElementById("p-published").checked
  };

  if (!payload.title) {
    showToast("Title is required", "error");
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  const original = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving…";

  try {
    if (imageFile) {
      payload.image_url = await uploadImage(imageFile);
    }

    let error;
    if (id) {
      ({ error } = await supabase.from("projects").update(payload).eq("id", id));
    } else {
      ({ error } = await supabase.from("projects").insert(payload));
    }

    if (error) throw error;

    showToast(id ? "Project updated ✅" : "Project created ✅", "success");
    closeModal();
    await loadProjects();
  } catch (err) {
    console.error("Save error:", err);
    showToast("Couldn't save: " + err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = original;
  }
}

// ============================================================
// 6. ROW ACTIONS
// ============================================================
async function handleRowClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const row = btn.closest("tr");
  const id  = row?.dataset.id;
  if (!id) return;

  const project = allProjects.find((p) => p.id === id);
  if (!project) return;

  const action = btn.dataset.action;

  if (action === "edit") {
    openModal(project);
    return;
  }

  if (action === "delete") {
    if (!confirm(`Delete "${project.title}"? This cannot be undone.`)) return;

    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) { showToast("Delete failed: " + error.message, "error"); return; }
    showToast("Project deleted", "success");
    await loadProjects();
    return;
  }

  if (action === "toggle-published") {
    const next = !project.published;
    const { error } = await supabase.from("projects").update({ published: next }).eq("id", id);
    if (error) { showToast("Update failed: " + error.message, "error"); return; }
    project.published = next;
    renderList();
    return;
  }

  if (action === "toggle-featured") {
    const next = !project.featured;
    const { error } = await supabase.from("projects").update({ featured: next }).eq("id", id);
    if (error) { showToast("Update failed: " + error.message, "error"); return; }
    project.featured = next;
    renderList();
    return;
  }
}

// ============================================================
// 7. UTILS
// ============================================================
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