// ============================================================
// NOVANEST - Main site script
// Mobile menu, config injection, footer year, active nav link.
// ============================================================

import { NOVANEST_CONFIG } from "./config.js";

// 1. Mobile menu toggle
const navToggle = document.querySelector(".nav__toggle");
const navMenu = document.querySelector(".nav__menu");

if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });
}

// 2. Inject config values into [data-config] elements
document.querySelectorAll("[data-config]").forEach((el) => {
  const key = el.getAttribute("data-config");
  if (NOVANEST_CONFIG[key] !== undefined) {
    el.textContent = NOVANEST_CONFIG[key];
  }
});

// 3. Auto-update footer year
const yearEl = document.querySelector("[data-year]");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// 4. Highlight the current page's nav link
const currentFile = window.location.pathname.split("/").pop() || "index.html";
document.querySelectorAll(".nav__menu a").forEach((link) => {
  const target = link.getAttribute("href");
  if (target === currentFile) {
    link.style.color = "var(--color-accent-dark)";
    link.style.fontWeight = "700";
  }
});

// ============================================================
// STAGE 12 — Reveal on scroll + accessibility
// ============================================================

// 1. Reveal-on-scroll: elements with class "reveal" fade in
//    when they enter the viewport. Uses IntersectionObserver.
const revealEls = document.querySelectorAll(".reveal");

if (revealEls.length && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target); // fire once
      }
    });
  }, { threshold: 0.15 });

  revealEls.forEach((el) => io.observe(el));
} else {
  // Fallback: reveal everything immediately
  revealEls.forEach((el) => el.classList.add("is-visible"));
}

// 2. Skip-to-content link
//    Add a keyboard-only link that jumps to the main content.
//    Improves accessibility for screen-reader/keyboard users.
document.addEventListener("DOMContentLoaded", () => {
  const main = document.querySelector("main") || document.querySelector(".hero, .page-header");
  if (!main) return;

  // Give main an id if it doesn't have one
  if (!main.id) main.id = "main-content";

  // Insert skip link at the very top of body
  const skip = document.createElement("a");
  skip.href = "#" + main.id;
  skip.className = "skip-link";
  skip.textContent = "Skip to content";
  document.body.prepend(skip);
});
