// ============================================================
// NOVANEST — Admin sidebar renderer
// Injects the same sidebar HTML into every admin page.
// Change it here once → all pages update.
// ============================================================

export function renderSidebar(activePage) {
  const items = [
    { href: "dashboard.html",    label: "Dashboard" },
    { href: "projects.html",     label: "Projects" },
     { href: "tasks.html",        label: "Tasks" },
    { href: "applications.html", label: "Team Applications" },
    { href: "team.html",         label: "Team Members" },
    { href: "careers.html",      label: "Careers" },
    { href: "payouts.html",      label: "Payouts" },
    { href: "support.html",      label: "Support" },
    { href: "tutoring.html",     label: "Tutoring" },
    { href: "clients.html",      label: "Client Requests" },
    { href: "messages.html",     label: "Messages" },
    { href: "settings.html",     label: "Settings" }
   
  ];

  const navHtml = items
    .map((item) => {
      const active = item.href === activePage ? "is-active" : "";
      return `<a href="${item.href}" class="${active}">${item.label}</a>`;
    })
    .join("");

  const sidebar = document.createElement("aside");
  sidebar.className = "admin-sidebar";
  sidebar.innerHTML = `
    <div class="admin-sidebar__brand">
      NOVA<span>NEST</span> <em>Admin</em>
    </div>
    <nav class="admin-nav">
      ${navHtml}
    </nav>
    <div class="admin-sidebar__footer">
      <div class="admin-sidebar__email">
        Signed in as <strong data-admin-email>…</strong>
      </div>
      <button class="btn btn--outline" data-logout>Logout</button>
    </div>
  `;

  // Insert as the first child of <body>
  document.body.prepend(sidebar);
}

// Auto-detect the active page from the URL filename
export function currentPage() {
  const file = window.location.pathname.split("/").pop();
  return file || "dashboard.html";
}
