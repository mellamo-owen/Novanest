// ============================================================
// NOVANEST — CEO Dashboard Overview
// ------------------------------------------------------------
// Loads live stats from Supabase and renders:
//   1. Welcome hero
//   2. Stat cards (projects, team, applications, support, etc.)
//   3. Recent activity panels (support + applications)
//
// Waits for the "admin:ready" event fired by auth.js so we
// know the user is authenticated before fetching.
// ============================================================

import { supabase } from "../supabase.js";

// ---------- 1. Boot ----------
document.addEventListener("admin:ready", () => {
  const content = document.querySelector(".admin-content");
  if (!content) return;

  // Show skeleton while we fetch
  content.innerHTML = renderSkeleton();

  // Kick off the data load
  loadDashboard(content);
});

// ---------- 2. Fetch and render ----------
async function loadDashboard(content) {
  try {
    // ---------- 2a. Parallel counts ----------
    const [
      projectsTotal,
      projectsPublished,
      teamActive,
      appsPending,
      careersOpen,
      tutoringTotal,
      clientsTotal,
      messagesTotal,
      supportPending,
      supportVerifiedRows,
      recentSupport,
      recentApps
    ] = await Promise.all([
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("published", true),
      supabase.from("team_members").select("id", { count: "exact", head: true }).eq("active", true),
      supabase.from("team_applications").select("id", { count: "exact", head: true }).eq("status", "Pending"),
      supabase.from("careers").select("id", { count: "exact", head: true }).eq("status", "Open"),
      supabase.from("tutoring_inquiries").select("id", { count: "exact", head: true }),
      supabase.from("client_inquiries").select("id", { count: "exact", head: true }),
      supabase.from("contact_messages").select("id", { count: "exact", head: true }),
      supabase.from("support").select("id", { count: "exact", head: true }).eq("status", "Pending"),
      supabase.from("support").select("amount").eq("status", "Verified"),
      supabase.from("support").select("name, amount, transaction_code, status, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("team_applications").select("full_name, role, status, created_at").order("created_at", { ascending: false }).limit(5)
    ]);

    // ---------- 2b. Compute sums ----------
    const verifiedTotal = (supportVerifiedRows.data || [])
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const counts = {
      projectsTotal:      projectsTotal.count     ?? 0,
      projectsPublished:  projectsPublished.count ?? 0,
      teamActive:         teamActive.count        ?? 0,
      appsPending:        appsPending.count       ?? 0,
      careersOpen:        careersOpen.count       ?? 0,
      tutoringTotal:      tutoringTotal.count     ?? 0,
      clientsTotal:       clientsTotal.count      ?? 0,
      messagesTotal:      messagesTotal.count     ?? 0,
      supportPending:     supportPending.count    ?? 0,
      verifiedTotal
    };

    // ---------- 2c. Render ----------
    content.innerHTML = `
      ${renderHero()}
      ${renderStatGrid(counts)}
      <div class="dash-section">
        <h3 class="dash-section__title">Recent Support Submissions</h3>
        ${renderRecentSupport(recentSupport.data || [])}
      </div>
      <div class="dash-section">
        <h3 class="dash-section__title">Recent Team Applications</h3>
        ${renderRecentApplications(recentApps.data || [])}
      </div>
    `;
  } catch (err) {
    console.error("Dashboard error:", err);
    content.innerHTML = `
      <div class="admin-welcome">
        <h2>Couldn't load dashboard</h2>
        <p>Please refresh the page. If the problem continues, check the browser console.</p>
      </div>`;
  }
}

// ---------- 3. HTML builders ----------

function renderSkeleton() {
  return `
    <div class="dash-loading">
      <div class="dash-skeleton"></div>
      <div class="dash-skeleton"></div>
      <div class="dash-skeleton"></div>
      <div class="dash-skeleton"></div>
    </div>`;
}

function renderHero() {
  return `
    <div class="dash-hero">
      <h2>Welcome back </h2>
      <p>Here's the current state of Novanest — numbers refresh on every visit.</p>
    </div>`;
}

function renderStatGrid(c) {
  const cards = [
    {label: "Total Projects",      value: c.projectsTotal,     href: "projects.html" },
    {label: "Published",           value: c.projectsPublished, href: "projects.html" },
    {label: "Active Team",         value: c.teamActive,        href: "team.html" },
    {label: "Pending Applications",value: c.appsPending,       href: "applications.html", variant: c.appsPending > 0 ? "warn" : "" },
    {label: "Open Careers",        value: c.careersOpen,       href: "careers.html" },
    {label: "Tutoring Inquiries",  value: c.tutoringTotal,     href: "tutoring.html" },
    {label: "Client Requests",   value: c.clientsTotal,      href: "clients.html" },
    {label: "Contact Messages",    value: c.messagesTotal,     href: "messages.html" },
    {label: "Pending Support",     value: c.supportPending,    href: "support.html", variant: c.supportPending > 0 ? "warn" : "" },
    {label: "Verified Support",    value: "KSh " + c.verifiedTotal.toLocaleString(), href: "support.html", variant: "ok" }
  ];

  return `
    <div class="stat-grid">
      ${cards.map(statCard).join("")}
    </div>`;
}

function statCard({label, value, href, variant }) {
  const variantClass = variant ? `stat-card--${variant}` : "";
  return `
    <a class="stat-card ${variantClass}" href="${href}">
      
      <span class="stat-card__label">${label}</span>
      <span class="stat-card__value">${value}</span>
    </a>`;
}

function renderRecentSupport(rows) {
  if (!rows.length) {
    return `
      <div class="recent-table">
        <div class="recent-table__empty">No support submissions yet.</div>
      </div>`;
  }

  return `
    <div class="recent-table">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Name</th>
            <th>Amount</th>
            <th>Reference</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r) => `
            <tr>
              <td>${formatDate(r.created_at)}</td>
              <td>${escapeHtml(r.name || "")}</td>
              <td>KSh ${Number(r.amount || 0).toLocaleString()}</td>
              <td>${escapeHtml(r.transaction_code || "")}</td>
              <td>${statusBadge(r.status)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function renderRecentApplications(rows) {
  if (!rows.length) {
    return `
      <div class="recent-table">
        <div class="recent-table__empty">No applications yet.</div>
      </div>`;
  }

  return `
    <div class="recent-table">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Applicant</th>
            <th>Role</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r) => `
            <tr>
              <td>${formatDate(r.created_at)}</td>
              <td>${escapeHtml(r.full_name || "")}</td>
              <td>${escapeHtml(r.role || "")}</td>
              <td>${statusBadge(r.status)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

// ---------- 4. Utilities ----------

function statusBadge(status) {
  const s = (status || "").toLowerCase();
  let cls = "pending";
  if (s === "verified" || s === "approved") cls = "verified";
  else if (s === "rejected") cls = "rejected";
  else if (s === "new") cls = "new";
  return `<span class="dash-badge dash-badge--${cls}">${escapeHtml(status || "")}</span>`;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
