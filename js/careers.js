// ============================================================
// NOVANEST — Public careers loader
// Loads only careers with status = 'Open'.
// ============================================================

import { supabase } from "./supabase.js";

const container = document.getElementById("careers-container");

async function loadCareers() {
  const { data, error } = await supabase
    .from("careers")
    .select("*")
    .eq("status", "Open")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load careers:", error);
    container.innerHTML = `
      <div class="projects-state">
        We couldn't load opportunities right now. Please try again later.
      </div>`;
    return;
  }

  const jobs = data || [];

  if (jobs.length === 0) {
    container.innerHTML = `
      <div class="projects-state">
        <strong>No open positions right now.</strong><br />
        Check back soon, or <a href="join.html#apply">send us a general application</a>.
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="careers-list">
      ${jobs.map(careerCard).join("")}
    </div>`;
}

function careerCard(job) {
  const title        = escapeHtml(job.title || "Untitled role");
  const role         = escapeHtml(job.role || "");
  const description  = escapeHtml(job.description || "");
  const requirements = job.requirements ? escapeHtml(job.requirements) : "";
  const statusLabel  = escapeHtml(job.status || "Open");
  const statusClass  = statusLabel.toLowerCase() === "open" ? "open" : "closed";

  return `
    <article class="career-card">
      <div class="career-card__header">
        <div>
          ${role ? `<div class="career-card__role">${role}</div>` : ""}
          <h3 class="career-card__title">${title}</h3>
        </div>
        <span class="career-status career-status--${statusClass}">${statusLabel}</span>
      </div>

      ${description ? `<p class="career-card__desc">${description}</p>` : ""}
      ${requirements ? `<div class="career-card__requirements"><strong>Requirements:</strong>\n${requirements}</div>` : ""}

      <div class="career-card__footer">
        <a class="btn btn--primary" href="join.html#apply">Apply Now</a>
      </div>
    </article>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadCareers();
