import { supabase } from "./supabase.js";

const container = document.getElementById("team-container");

async function loadTeam() {
  const { data: members, error } = await supabase.from("team_members").select("*").eq("active", true).order("created_at", { ascending: true });
  if (error || !members) { container.innerHTML = '<div class="projects-state">Could not load team.</div>'; return; }
  if (members.length === 0) { container.innerHTML = '<div class="projects-state"><strong>Team coming soon.</strong></div>'; return; }

  const { data: allBadges } = await supabase.from("member_badges").select("*");
  
  container.innerHTML = '<div class="team-grid">' + members.map(m => {
    const initials = m.name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
    const photo = m.photo_url ? `<img src="${m.photo_url}" alt="${m.name}" style="width:100%;height:100%;object-fit:cover;" />` : initials;
    const skills = (m.skills || "").split(",").map(s=>s.trim()).filter(Boolean);
    
    const myBadges = allBadges ? allBadges.filter(b => b.member_id === m.user_id) : [];
    
    // Reverted to initial 36px size
    const badgeOverlay = myBadges.length > 0 
      ? `<img src="assets/images/verified-badge.png" alt="Verified" style="position:absolute; bottom:-4px; right:-4px; width:36px; height:36px; border-radius:50%; background:#0F172A; padding:3px; border:2px solid #1E293B; object-fit:contain; mix-blend-mode: screen;" title="Verified Skill: ${myBadges[0].skill_name}"/>`
      : "";

    return `
      <article class="team-card" style="background:#0F172A; border:1px solid #1E293B; padding:2rem 1.5rem; border-radius:16px; text-align:center; position:relative;">
        
        <div style="width:100px; height:100px; border-radius:50%; border:3px solid #1E293B; margin:0 auto 1.25rem; background:#0B1120; position:relative; display:flex; align-items:center; justify-content:center; font-size:2rem; font-weight:800; color:#10B981;">
          <div style="width:100%; height:100%; border-radius:50%; overflow:hidden;">
            ${photo}
          </div>
          ${badgeOverlay}
        </div>

        <h3 style="color:#FFF; font-size:1.25rem; margin:0 0 0.25rem;">${m.name}</h3>
        <div style="color:#10B981; font-weight:700; font-size:0.9rem; margin-bottom:1rem;">${m.role}</div>
        <p style="color:#CBD5E1; font-size:0.9rem; line-height:1.6; margin-bottom:1rem;">${m.bio || ""}</p>
        <div style="display:flex; flex-wrap:wrap; gap:0.35rem; justify-content:center;">
          ${skills.map(s=>`<span style="background:#1E293B; color:#E2E8F0; padding:0.25rem 0.6rem; border-radius:999px; font-size:0.75rem;">${s}</span>`).join("")}
        </div>
      </article>
    `;
  }).join("") + '</div>';
}
loadTeam();
