// ============================================================
// NOVANEST - CEO Dashboard (Fintech Style)
// ============================================================

import { supabase } from "../supabase.js";

document.addEventListener("admin:ready", () => {
  loadDashboard();
});

async function loadDashboard() {
  const content = document.getElementById("dashboard-container");
  
  try {
    // Fetch high-level counts
    const [
      projectsRes,
      teamRes,
      supportRes,
      clientsRes
    ] = await Promise.all([
      supabase.from("projects").select("id, published", { count: "exact" }),
      supabase.from("team_members").select("id", { count: "exact" }),
      supabase.from("support").select("amount, status"),
      supabase.from("client_inquiries").select("id", { count: "exact" }),
      supabase.from("payouts").select("amount, created_at")
    ]);

    const payoutsData = arguments[0][4].data || [];
    const totalProjects = projectsRes.count || 0;
    const activeTeam = teamRes.count || 0;
    const clientRequests = clientsRes.count || 0;
    
    let totalSupport = 0;
    if (supportRes.data) {
      totalSupport = supportRes.data
        .filter(s => s.status === "Verified")
        .reduce((sum, s) => sum + Number(s.amount || 0), 0);
    }

    content.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card">
          <span class="stat-card__label">Total Projects</span>
          <span class="stat-card__value">${totalProjects}</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__label">Active Team</span>
          <span class="stat-card__value">${activeTeam}</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__label">Client Requests</span>
          <span class="stat-card__value">${clientRequests}</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__label">Verified Support</span>
          <span class="stat-card__value" style="color: #10B981;">KSh ${totalSupport.toLocaleString()}</span>
        </div>
      </div>

      <div class="chart-grid">
        <div class="chart-panel">
          <h3>Support Contributions</h3>
          <canvas id="supportChart"></canvas>
        </div>
        <div class="chart-panel">
          <h3>Project Distribution</h3>
          <canvas id="projectChart"></canvas>
        </div>
      </div>
    `;

    // --- Render Charts ---
    // 1. Doughnut Chart for Projects (Published vs Draft)
    const publishedCount = projectsRes.data.filter(p => p.published).length;
    const draftCount = totalProjects - publishedCount;

    new Chart(document.getElementById("projectChart"), {
      type: "doughnut",
      data: {
        labels: ["Published", "Draft"],
        datasets: [{
          data: [publishedCount, draftCount],
          backgroundColor: ["#10B981", "#1E293B"],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "75%",
        plugins: {
          legend: { labels: { color: "#E2E8F0" } }
        }
      }
    });

    // 2. Line Chart for Support (Fake data based on recent activity for now)
    const ctx = document.getElementById("supportChart").getContext("2d");
    
    // Create a gradient for the line
    let gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, "rgba(16, 185, 129, 0.5)");
    gradient.addColorStop(1, "rgba(16, 185, 129, 0)");

    new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [{
          label: "Support (KSh)",
          data: [0, 0, 0, 0, 0, totalSupport], // Shows real total at the end
          borderColor: "#10B981",
          backgroundColor: gradient,
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: "#0B1120",
          pointBorderColor: "#10B981"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#64748B" } },
          y: { grid: { color: "#1E293B" }, ticks: { color: "#64748B" } }
        }
      }
    });
    const payoutsByDate = {};
    payoutsData.forEach(p => {
      const d = new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (!payoutsByDate[d]) payoutsByDate[d] = 0;
      payoutsByDate[d] += Number(p.amount || 0);
    });
    const pLabels = Object.keys(payoutsByDate).reverse();
    const pData = Object.values(payoutsByDate).reverse();
    const pCtx = document.getElementById("payoutChart").getContext("2d");
    let pGradient = pCtx.createLinearGradient(0, 0, 0, 400);
    pGradient.addColorStop(0, "rgba(59, 130, 246, 0.8)");
    pGradient.addColorStop(1, "rgba(59, 130, 246, 0.1)");
    new Chart(pCtx, {
      type: "bar",
      data: { labels: pLabels.length ? pLabels : ["No Data"], datasets: [{ label: "Payouts (KSh)", data: pData.length ? pData : [0], backgroundColor: pGradient, borderRadius: 6, borderSkipped: false }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: "#64748B" } }, y: { grid: { color: "#1E293B" }, ticks: { color: "#64748B" } } } }
    });


  } catch (err) {
    console.error("Dashboard Error:", err);
    content.innerHTML = "<h2>Error loading dashboard data.</h2>";
  }
}

