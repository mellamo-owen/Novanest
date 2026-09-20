// ============================================================
// NOVANEST — Public team page
// Shows only team_members with active = true.
// ============================================================

import { supabase } from "./supabase.js";

const container = document.getElementById("team-container");

async function loadTeam() {
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load team:", error);
    container.innerHTML = `
      <div class="projects-state">
        We couldn't load the team right now. Please try again later.
      </div>`;
    return;
  }

  const members = data || [];

  if (members.length === 0) {
    container.innerHTML = `
      <div class="projects-state">
        <strong>Team coming soon.</strong><br />
        We're building our founding team right now.
        <a href="join.html#apply">Apply to join</a>.
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="team-grid">
      ${members.map(teamCard).join("")}
    </div>`;
}

function teamCard(member) {
  const name = escapeHtml(member.name || "Team member");
  const role = escapeHtml(member.role || "");
  const bio  = escapeHtml(member.bio || "");
  const initials = getInitials(member.name || "N");

  // Photo or initials fallback
  const photo = member.photo_url
    ? `<div class="team-card__photo"><img src="${escapeHtml(member.photo_url)}" alt="${name}" loading="lazy" /></div>`
    : `<div class="team-card__photo">${initials}</div>`;

  // Skills split on commas
  const skills = (member.skills || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const skillsHtml = skills.length
    ? `<div class="team-card__skills">${skills.map((s) => `<span class="tag">${escapeHtml(s)}</span>`).join("")}</div>`
    : "";

  // Links — only render when the URL exists
  const links = [
    member.github_url    ? `<a href="${escapeHtml(member.github_url)}"    target="_blank" rel="noopener">GitHub</a>`    : "",
    member.linkedin_url  ? `<a href="${escapeHtml(member.linkedin_url)}"  target="_blank" rel="noopener">LinkedIn</a>`  : "",
    member.portfolio_url ? `<a href="${escapeHtml(member.portfolio_url)}" target="_blank" rel="noopener">Portfolio</a>` : ""
  ].filter(Boolean).join("");

  return `
    <article class="team-card">
      ${photo}
      <h3 class="team-card__name">${name}</h3>
      ${role ? `<div class="team-card__role">${role}</div>` : ""}
      ${bio ? `<p class="team-card__bio">${bio}</p>` : ""}
      ${skillsHtml}
      ${links ? `<div class="team-card__links">${links}</div>` : ""}
    </article>
  `;
}

// Get initials (e.g. "Mickowen Khaseke" → "MK")
function getInitials(fullName) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadTeam();
