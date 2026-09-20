// ============================================================
// NOVANEST — Support form
// Users submit their M-Pesa transaction code after sending money.
// The CEO verifies contributions manually in the dashboard.
// ============================================================

import { wireForm } from "./forms.js";

wireForm(
  "support-form",
  "support",

  // Transform: convert "amount" from string to number so the
  // database stores it as a numeric value, not text.
  (raw) => ({
    name: raw.name,
    amount: Number(raw.amount),
    transaction_code: raw.transaction_code,
    message: raw.message
  }),

  " Thank you for supporting Novanest! We'll verify your contribution shortly."
);
