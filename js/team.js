import { supabase } from "./supabase.js";

const container = document.getElementById("team-container");

async function loadTeam() {
  const { data: members, error } = await supabase.from("team_members").select("*").eq("active", true).order("created_at", { ascending: true });
  if (error || !members) { container.innerHTML = '<div class="projects-state">Could not load team.</div>'; return; }
  if (members.length === 0) { container.innerHTML = '<div class="projects-state"><strong>Team coming soon.</strong></div>'; return; }

  // Fetch all badges
  const { data: badges } = await supabase.from("member_badges").select("*");
  
  container.innerHTML = '<div class="team-grid">' + members.map(m => {
    const initials = m.name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
    const photo = m.photo_url ? `<img src="${m.photo_url}" alt="${m.name}" />` : initials;
    const skills = (m.skills || "").split(",").map(s=>s.trim()).filter(Boolean);
    
    // Filter badges for this member
    const myBadges = badges ? badges.filter(b => b.member_id === m.user_id) : [];
    const badgeHtml = myBadges.length > 0 ? `
      <div style="margin-top:1rem; border-top:1px solid rgba(255,255,255,0.1); padding-top:1rem;">
        <div style="font-size:0.7rem; text-transform:uppercase; color:#94A3B8; font-weight:700; letter-spacing:1px; margin-bottom:0.5rem;">Verified Skills</div>
        <div style="display:flex; flex-wrap:wrap; gap:0.35rem; justify-content:center;">
          ${myBadges.map(b => `<span style="background:rgba(16,185,129,0.15); color:#10B981; border:1px solid #10B981; padding:0.2rem 0.6rem; border-radius:999px; font-size:0.7rem; font-weight:700;">✓ ${b.skill_name} (${b.tasks_completed})</span>`).join("")}
        </div>
      </div>
    ` : "";

    return `
      <article class="team-card" style="background:#0F172A; border:1px solid #1E293B;">
        <div class="team-card__photo" style="border-color:#1E293B;">${photo}</div>
        <h3 class="team-card__name" style="color:#FFF;">${m.name}</h3>
        <div class="team-card__role" style="color:#10B981;">${m.role}</div>
        <p class="team-card__bio" style="color:#94A3B8;">${m.bio || ""}</p>
        <div class="team-card__skills">${skills.map(s=>`<span class="tag" style="background:#1E293B;color:#FFF;border:none;">${s}</span>`).join("")}</div>
        ${badgeHtml}
      </article>
    `;
  }).join("") + '</div>';
}
loadTeam();
