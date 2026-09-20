// ============================================================
// NOVANEST — Shared form helpers
// ------------------------------------------------------------
// Small utilities used by every public form.
// Keeps each form's JS file short and focused.
// ============================================================

import { supabase } from "./supabase.js";

/**
 * Show a status message at the top of a form.
 */
export function showMessage(formEl, type, text) {
  let box = formEl.querySelector(".form-message");
  if (!box) {
    box = document.createElement("div");
    box.className = "form-message";
    formEl.prepend(box);
  }
  box.className = "form-message form-message--" + type;
  box.textContent = text;
}

/**
 * Remove any existing message from a form.
 */
export function clearMessage(formEl) {
  const box = formEl.querySelector(".form-message");
  if (box) box.remove();
}

/**
 * Disable / enable the submit button while a request is running.
 */
export function setLoading(formEl, isLoading) {
  const btn = formEl.querySelector('button[type="submit"]');
  if (!btn) return;

  if (isLoading) {
    btn.dataset.originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Sending…";
  } else {
    btn.disabled = false;
    if (btn.dataset.originalText) {
      btn.textContent = btn.dataset.originalText;
    }
  }
}

/**
 * Read a form into a plain object.
 * Trims whitespace, converts empty strings to null.
 */
export function getFormData(formEl) {
  const data = {};
  const formData = new FormData(formEl);
  for (const [key, value] of formData.entries()) {
    const trimmed = typeof value === "string" ? value.trim() : value;
    data[key] = trimmed === "" ? null : trimmed;
  }
  return data;
}

/**
 * Insert one row into a Supabase table.
 * Returns a simple { ok, message } object.
 */
export async function insertRow(tableName, row) {
  const { error } = await supabase.from(tableName).insert(row);
  if (error) {
    console.error(`Insert failed into "${tableName}":`, error);
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/**
 * Wire up a public form:
 *   1. Intercept submit
 *   2. Show "Sending…"
 *   3. Insert into Supabase
 *   4. Show success or error
 *   5. Reset the form on success
 *
 * @param {string} formId      - HTML id of the <form>
 * @param {string} tableName   - Supabase table to insert into
 * @param {function} [mapData] - optional data transform before insert
 * @param {string} [successText] - optional custom success message
 */
export function wireForm(formId, tableName, mapData, successText) {
  const formEl = document.getElementById(formId);
  if (!formEl) return;

  formEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage(formEl);
    setLoading(formEl, true);

    const raw = getFormData(formEl);
    const row = mapData ? mapData(raw) : raw;

    const result = await insertRow(tableName, row);
    setLoading(formEl, false);

    if (result.ok) {
      showMessage(
        formEl,
        "success",
        successText || " Thank you! Your submission was received."
      );
      formEl.reset();
    } else {
      showMessage(
        formEl,
        "error",
        " Something went wrong. Please try again in a moment."
      );
    }
  });
}
