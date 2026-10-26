import { supabase } from "./supabase.js";

const container = document.getElementById("team-container");

async function loadTeam() {
  const { data: members, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error || !members) {
    container.innerHTML = '<div class="projects-state">Could not load team.</div>';
    return;
  }

  if (members.length === 0) {
    container.innerHTML = '<div class="projects-state"><strong>Team coming soon.</strong></div>';
    return;
  }

  const { data: allBadges } = await supabase.from("member_badges").select("*");
  
  container.innerHTML = '<div class="team-grid">' + members.map(m => {
    const initials = m.name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
    const photo = m.photo_url ? `<img src="${m.photo_url}" alt="${m.name}" style="width:100%;height:100%;object-fit:cover;" />` : initials;
    const skills = (m.skills || "").split(",").map(s=>s.trim()).filter(Boolean);
    
    // Check for badges
    const myBadges = allBadges ? allBadges.filter(b => b.member_id === m.user_id) : [];
    
    // Generate Badge HTML with the image
    let badgeHtml = "";
    if (myBadges.length > 0) {
      badgeHtml = `
        <div style="margin-top:1.5rem; padding-top:1.5rem; border-top:1px solid rgba(255,255,255,0.1); text-align:center;">
          <div style="font-size:0.7rem; text-transform:uppercase; color:#94A3B8; font-weight:700; letter-spacing:1px; margin-bottom:0.75rem;">Verified Skills</div>
          <div style="display:flex; flex-wrap:wrap; gap:1rem; justify-content:center;">
            ${myBadges.map(b => `
              <div style="display:flex; flex-direction:column; align-items:center; gap:0.25rem;">
                <img src="assets/images/verified-badge.png" alt="Verified" style="width:64px; height:64px; object-fit:contain;" />
                <span style="font-size:0.75rem; color:#E2E8F0; font-weight:600;">${b.skill_name}</span>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }

    return `
      <article class="team-card">
        <div style="width:100px; height:100px; border-radius:50%; overflow:hidden; border:3px solid #1E293B; margin:0 auto 1.25rem; background:#0B1120; display:flex; align-items:center; justify-content:center; font-size:2rem; font-weight:800; color:#10B981;">
          ${photo}
        </div>
        <h3 style="color:#FFF; font-size:1.25rem; margin:0 0 0.25rem;">${m.name}</h3>
        <div style="color:#10B981; font-weight:700; font-size:0.9rem; margin-bottom:1rem;">${m.role}</div>
        <p style="color:#CBD5E1; font-size:0.9rem; line-height:1.6; margin-bottom:1rem;">${m.bio || ""}</p>
        <div style="display:flex; flex-wrap:wrap; gap:0.35rem; justify-content:center;">
          ${skills.map(s=>`<span style="background:#1E293B; color:#E2E8F0; padding:0.25rem 0.6rem; border-radius:999px; font-size:0.75rem;">${s}</span>`).join("")}
        </div>
        ${badgeHtml}
      </article>
    `;
  }).join("") + '</div>';
}

loadTeam();
