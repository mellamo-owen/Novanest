// ============================================================
// NOVANEST - Open Roles Welcome Popup
// Shows once per browser session on public pages.
// Clicking a role goes to /join.html#apply
// ============================================================

(function () {
  // ---------- Guard ----------
  // Only on public pages (not /admin/ or /labs/)
  const path = window.location.pathname.toLowerCase();
  if (path.includes("/admin/") || path.includes("/labs/")) return;

  // Don't show on the join page itself (they are already there to apply)
  if (path.endsWith("/join.html") || path.endsWith("/join")) return;

  // Show only once per browser session
  if (sessionStorage.getItem("nv_roles_popup_seen") === "1") return;

  // ---------- Roles ----------
  const roles = [
    { name: "Developer",               icon: "D" },
    { name: "Tutor",                   icon: "T" },
    { name: "Designer",                icon: "A" },
    { name: "Advertiser / Marketer",   icon: "M" },
    { name: "Content Creator",         icon: "C" },
    { name: "Media / Video",           icon: "V" },
    { name: "Business / Outreach",     icon: "B" },
    { name: "Other",                   icon: "O" }
  ];

  // ---------- Build popup ----------
  const overlay = document.createElement("div");
  overlay.className = "roles-popup";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "roles-popup-title");

  const roleLinks = roles
    .map((r) => {
      return (
        '<a class="roles-popup__role" href="join.html#apply">' +
          '<span class="roles-popup__role-icon">' + r.icon + '</span>' +
          '<span>' + r.name + '</span>' +
        '</a>'
      );
    })
    .join("");

  overlay.innerHTML =
    '<div class="roles-popup__box">' +
      '<button class="roles-popup__close" type="button" aria-label="Close">&times;</button>' +
      '<span class="roles-popup__eyebrow">We are hiring</span>' +
      '<h2 class="roles-popup__title" id="roles-popup-title">Build with Novanest</h2>' +
      '<p class="roles-popup__sub">' +
        'We are recruiting across all departments. Developers, tutors, designers, ' +
        'marketers, content creators and more. Every role is open - apply and ' +
        'our founder will personally review your application.' +
      '</p>' +
      '<div class="roles-popup__grid">' + roleLinks + '</div>' +
      '<div class="roles-popup__actions">' +
        '<a href="join.html#apply" class="roles-popup__btn roles-popup__btn--primary">Apply Now</a>' +
        '<button type="button" class="roles-popup__btn roles-popup__btn--ghost" data-popup-dismiss>Maybe Later</button>' +
      '</div>' +
    '</div>';

  // ---------- Show ----------
  function show() {
    document.body.appendChild(overlay);
    // Trigger transition on next frame
    requestAnimationFrame(() => overlay.classList.add("is-visible"));
    document.body.style.overflow = "hidden";
  }

  // ---------- Hide ----------
  function hide() {
    overlay.classList.remove("is-visible");
    document.body.style.overflow = "";
    sessionStorage.setItem("nv_roles_popup_seen", "1");
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 350);
  }

  // ---------- Wire events ----------
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) hide(); // click outside the box
    if (e.target.matches("[data-popup-dismiss]")) hide();
    if (e.target.matches(".roles-popup__close")) hide();
  });

  // ESC key closes
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.parentNode) hide();
  });

  // ---------- Trigger ----------
  // Wait a moment so the page loads first, then slide in.
  window.addEventListener("load", () => {
    setTimeout(show, 1200);
  });
})();
