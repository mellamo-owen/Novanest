// ============================================================
// NOVANEST — Team application form
// Applications go into team_applications with status = "Pending".
// The CEO reviews them in the admin dashboard (later stage).
// ============================================================

import { wireForm } from "./forms.js";

wireForm(
  "join-form",
  "team_applications",
  null,
  " Application received! We'll review it and get back to you."
);
