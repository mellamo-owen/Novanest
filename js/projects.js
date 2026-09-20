// ============================================================
// NOVANEST — Public projects loader (Novanest Labs page)
// Path: js/projects.js
// Used on: /projects.html
// ============================================================

import { supabase } from "./supabase.js";

// ---------- DOM ----------
const container = document.getElementById("projects-container");
const filterBar = document.getElementById("projects-filter");

// ---------- State ----------
let allProjects = [];
let activeCategory = "all";

// ---------- Load once ----------
async function loadProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("published", true)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load projects:", error);
    container.innerHTML = `
      <div class="projects-state">
        We couldn't load projects right now. Please try again later.
      </div>`;
    return;
  }

  allProjects = data || [];

  if (allProjects.length === 0) {
    container.innerHTML = `
      <div class="projects-state">
        <strong>Projects coming soon.</strong><br />
        We're currently building in Novanest Labs.
      </div>`;
    return;
  }

  buildFilter(allProjects);
  renderProjects();
}

// ---------- Category filter ----------
function buildFilter(projects) {
  const categories = [...new Set(
    projects.map((p) => p.category).filter(Boolean)
  )].sort();

  filterBar.innerHTML = `<button class="is-active" data-category="all">All</button>`;

  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.textContent = cat;
    btn.dataset.category = cat;
    filterBar.appendChild(btn);
  });

  filterBar.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    filterBar.querySelectorAll("button").forEach((b) =>
      b.classList.remove("is-active")
    );
    btn.classList.add("is-active");

    activeCategory = btn.dataset.category;
    renderProjects();
  });
}

// ---------- Render ----------
function renderProjects() {
  const visible =
    activeCategory === "all"
      ? allProjects
      : allProjects.filter((p) => p.category === activeCategory);

  if (visible.length === 0) {
    container.innerHTML = `
      <div class="projects-state">No projects in this category yet.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="projects-grid">
      ${visible.map(projectCard).join("")}
    </div>`;
}

function projectCard(p) {
  const title       = escapeHtml(p.title || "Untitled project");
  const description = escapeHtml(p.description || "");
  const category    = escapeHtml(p.category || "");
  const statusLabel = escapeHtml(p.status || "Concept");

  const featuredBadge = p.featured
    ? `<span class="featured-badge">Featured</span>`
    : "";

  const categoryPill = category
    ? `<span class="card__tag">${category}</span>`
    : "";

  const statusPill = `
    <span class="status-pill status-pill--${statusClass(p.status)}">
      ${statusLabel}
    </span>`;

  const techs = Array.isArray(p.technologies) && p.technologies.length
    ? `<div class="tag-list">
        ${p.technologies.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
      </div>`
    : "";

  const image = p.image_url
    ? `<div class="project-card__image">
         <img src="${escapeHtml(p.image_url)}" alt="${title} screenshot" loading="lazy" />
       </div>`
    : `<div class="project-card__image">${title}</div>`;

  const actionButtons = [
    p.live_url   ? `<a class="btn btn--primary" href="${escapeHtml(p.live_url)}" target="_blank" rel="noopener">Try Demo</a>` : "",
    p.github_url ? `<a class="btn btn--outline" href="${escapeHtml(p.github_url)}" target="_blank" rel="noopener">GitHub</a>` : ""
  ].join("");

  return `
    <article class="project-card">
      ${image}
      <div class="project-card__body">
        <div class="project-card__meta">
          ${featuredBadge}
          ${categoryPill}
          ${statusPill}
        </div>
        <h3 class="project-card__title">${title}</h3>
        <p class="project-card__desc">${description}</p>
        ${techs}
        ${actionButtons ? `<div class="project-card__actions">${actionButtons}</div>` : ""}
      </div>
    </article>`;
}

// ---------- Utils ----------
function statusClass(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("concept"))     return "concept";
  if (s.includes("development")) return "dev";
  if (s.includes("live"))        return "live";
  if (s.includes("archived"))    return "archived";
  return "concept";
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------- Go ----------
loadProjects();