// ============================================================
// NOVANEST — Contact page scripts
// Handles: general contact form + client website request form.
// ============================================================

import { wireForm } from "./forms.js";

// ---------- 1. General contact form ----------
wireForm(
  "contact-form",
  "contact_messages",
  null,
  " Thanks! Your message has been sent. We'll reply soon."
);

// ---------- 2. Client (website) request form ----------
wireForm(
  "client-form",
  "client_inquiries",
  null,
  "Got it! We received your website request and will be in touch."
);
