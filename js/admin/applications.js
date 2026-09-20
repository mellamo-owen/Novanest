// ============================================================
// NOVANEST — Team Applications admin
// ------------------------------------------------------------
// • List all applications with search + filters
// • Set status: Under Review / Rejected
// • Approve → creates a team_members row + marks approved
// ============================================================

import { supabase } from "../supabase.js";

// ---------- DOM ----------
const container    = document.getElementById("applications-container");
const filterSearch = document.getElementById("filter-search");
const filterStatus = document.getElementById("filter-status");
const filterRole   = document.getElementById("filter-role");
const approveModal = document.getElementById("approve-modal");
const approveForm  = document.getElementById("approve-form");
const toastEl      = document.getElementById("toast");

// ---------- State ----------
let allApps = [];

// ---------- Boot ----------
document.addEventListener("admin:ready", () => {
  loadApplications();
  wireEvents();
});

// ============================================================
// 1. LOAD
// ============================================================
async function loadApplications() {
  container.innerHTML = `<div class="admin-empty"><strong>Loading…</strong></div>`;

  const { data, error } = await supabase
    .from("team_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = `<div class="admin-empty"><strong>Couldn't load applications.</strong>${error.message}</div>`;
    console.error(error);
    return;
  }

  allApps = data || [];
  renderList();
}

// ============================================================
// 2. RENDER
// ============================================================
function renderList() {
  const term   = (filterSearch.value || "").toLowerCase().trim();
  const status = filterStatus.value;
  const role   = filterRole.value;

  const filtered = allApps.filter((a) => {
    if (term) {
      const hay = `${a.full_name || ""} ${a.email || ""}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    if (status && a.status !== status) return false;
    if (role && a.role !== role) return false;
    return true;
  });

  if (!filtered.length) {
    container.innerHTML = `
      <div class="admin-empty">
        <strong>No applications found.</strong>
        Adjust filters or wait for new submissions.
      </div>`;
    return;
  }

  container.innerHTML = `<div class="app-list">${filtered.map(cardHtml).join("")}</div>`;
}

function cardHtml(a) {
  const statusCls = statusClass(a.status);
  const date = formatDate(a.created_at);

  const portfolio = a.portfolio_url
    ? `<a href="${escapeHtml(a.portfolio_url)}" target="_blank" rel="noopener">${escapeHtml(a.portfolio_url)}</a>`
    : "—";

  // Build the visible action buttons depending on current status
  const actions = [];
  if (a.status !== "Under Review" && a.status !== "Approved") {
    actions.push(`<button data-action="review" data-id="${a.id}">Mark Under Review</button>`);
  }
  if (a.status !== "Approved") {
    actions.push(`<button class="success" data-action="approve" data-id="${a.id}">Approve</button>`);
  }
  if (a.status !== "Rejected" && a.status !== "Approved") {
    actions.push(`<button class="danger" data-action="reject" data-id="${a.id}">Reject</button>`);
  }
  if (a.status === "Approved") {
    actions.push(`<button data-action="view-member" data-id="${a.id}">View Team Member</button>`);
  }

  return `
    <article class="app-card" data-id="${a.id}">
      <div class="app-card__head">
        <div>
          <h3 class="app-card__name">${escapeHtml(a.full_name || "Unknown")}</h3>
          <div class="app-card__meta">
            ${escapeHtml(a.email || "")}
            ${a.phone ? " • " + escapeHtml(a.phone) : ""}
            ${a.country ? " • " + escapeHtml(a.country) : ""}
          </div>
          <div class="app-card__meta">Applied ${date}</div>
        </div>
        <div>
          <span class="status-badge status-badge--${statusCls}">${escapeHtml(a.status || "")}</span>
        </div>
      </div>

      ${a.role ? `<div class="app-card__role">${escapeHtml(a.role)}</div>` : ""}

      ${a.skills ? section("Skills", a.skills) : ""}
      ${a.experience ? section("Experience", a.experience) : ""}
      ${a.motivation ? section("Why Novanest", a.motivation) : ""}
      ${a.availability ? section("Availability", a.availability) : ""}
      <div class="app-card__section">
        <h4>Portfolio</h4>
        <p>${portfolio}</p>
      </div>

      <div class="app-card__actions">
        ${actions.join("")}
      </div>
    </article>`;
}

function section(title, content) {
  return `
    <div class="app-card__section">
      <h4>${title}</h4>
      <p>${escapeHtml(content)}</p>
    </div>`;
}

// ============================================================
// 3. EVENTS
// ============================================================
function wireEvents() {
  filterSearch.addEventListener("input", renderList);
  filterStatus.addEventListener("change", renderList);
  filterRole.addEventListener("change", renderList);

  container.addEventListener("click", handleCardClick);

  approveForm.addEventListener("submit", handleApproveSubmit);
  document.getElementById("ap-cancel").addEventListener("click", closeModal);
  approveModal.addEventListener("click", (e) => {
    if (e.target === approveModal) closeModal();
  });
}

async function handleCardClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const id = btn.dataset.id;
  const app = allApps.find((x) => x.id === id);
  if (!app) return;

  const action = btn.dataset.action;

  if (action === "review") {
    await setStatus(id, "Under Review");
    return;
  }

  if (action === "reject") {
    if (!confirm(`Reject ${app.full_name}'s application?`)) return;
    await setStatus(id, "Rejected");
    return;
  }

  if (action === "approve") {
    openApproveModal(app);
    return;
  }

  if (action === "view-member") {
    window.location.href = "team.html";
  }
}

async function setStatus(id, status) {
  const { error } = await supabase
    .from("team_applications")
    .update({ status })
    .eq("id", id);

  if (error) {
    showToast("Failed: " + error.message, "error");
    return;
  }

  const app = allApps.find((x) => x.id === id);
  if (app) app.status = status;
  renderList();
  showToast(`Marked as ${status}`);
}

// ============================================================
// 4. APPROVE MODAL
// ============================================================
function openApproveModal(app) {
  document.getElementById("ap-id").value       = app.id;
  document.getElementById("ap-name").value     = app.full_name || "";
  document.getElementById("ap-role").value     = app.role || "";
  document.getElementById("ap-bio").value      = app.specialization
    ? `${app.specialization} specialist.`
    : "";
  document.getElementById("ap-skills").value   = app.skills || "";
  document.getElementById("ap-photo").value    = "";
  document.getElementById("ap-github").value   = app.portfolio_url && app.portfolio_url.includes("github")
    ? app.portfolio_url
    : "";
  document.getElementById("ap-linkedin").value = app.portfolio_url && app.portfolio_url.includes("linkedin")
    ? app.portfolio_url
    : "";

  approveModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  approveModal.hidden = true;
  document.body.style.overflow = "";
}

async function handleApproveSubmit(e) {
  e.preventDefault();

  const id      = document.getElementById("ap-id").value;
  const name    = document.getElementById("ap-name").value.trim();
  const role    = document.getElementById("ap-role").value.trim();
  const bio     = document.getElementById("ap-bio").value.trim();
  const skills  = document.getElementById("ap-skills").value.trim();
  const photo   = document.getElementById("ap-photo").value.trim();
  const github  = document.getElementById("ap-github").value.trim();
  const linkedin = document.getElementById("ap-linkedin").value.trim();

  if (!name || !role) {
    showToast("Name and role are required", "error");
    return;
  }

  // 1. Insert into team_members
  const { error: memberErr } = await supabase.from("team_members").insert({
    name,
    role,
    bio: bio || null,
    skills: skills || null,
    photo_url: photo || null,
    github_url: github || null,
    linkedin_url: linkedin || null,
    active: true
  });

  if (memberErr) {
    console.error(memberErr);
    showToast("Couldn't create team member: " + memberErr.message, "error");
    return;
  }

  // 2. Mark the application as Approved
  const { error: appErr } = await supabase
    .from("team_applications")
    .update({ status: "Approved" })
    .eq("id", id);

  if (appErr) {
    console.error(appErr);
    showToast("Team member created but application status update failed.", "error");
    return;
  }

  const app = allApps.find((x) => x.id === id);
  if (app) app.status = "Approved";

  closeModal();
  renderList();
  showToast("Approved ✅ — added to team members");
}

// ============================================================
// 5. UTILS
// ============================================================
function statusClass(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("review"))   return "review";
  if (s.includes("approved")) return "approved";
  if (s.includes("rejected")) return "rejected";
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
