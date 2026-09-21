// ============================================================
// NOVANEST Labs - My Assignments
// Shows bids with status Approved / Submitted / Done for this member.
// Member can mark Submitted with a link + notes.
// ============================================================

import { supabase } from "../supabase.js";

const container = document.getElementById("labs-assignments-container");

document.addEventListener("labs:ready", (e) => {
  loadAssignments(e.detail.user.id);
});

async function loadAssignments(userId) {
  const { data, error } = await supabase
    .from("bids")
    .select("*, tasks(title, category, task_type, budget, description)")
    .eq("member_id", userId)
    .in("status", ["Approved", "Submitted", "Done"])
    .order("approved_at", { ascending: false });

  if (error) {
    console.error("Load assignments error:", error);
    container.innerHTML = '<div class="labs-empty"><strong>Could not load assignments.</strong>Please refresh.</div>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML =
      '<div class="labs-empty"><strong>No active assignments.</strong>Once an admin approves your bid, it appears here. Browse <a href="tasks.html">open tasks</a> to bid on something new.</div>';
    return;
  }

  container.innerHTML =
    '<div class="labs-assign-grid">' + data.map((b) => cardHtml(b)).join("") + '</div>';

  container.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const bid = data.find((x) => x.id === id);
      if (bid && action === "submit") showSubmitModal(bid);
    });
  });
}

function cardHtml(b) {
  const t = b.tasks || {};
  const deadlineInfo = computeDeadline(b.deadline, b.status);

  const statusBadge = b.status === "Done"
    ? '<span class="labs-assign-badge labs-assign-badge--done">Done</span>'
    : b.status === "Submitted"
      ? '<span class="labs-assign-badge labs-assign-badge--submitted">Submitted</span>'
      : '<span class="labs-assign-badge labs-assign-badge--approved">Approved</span>';

  const budgetLine = (t.task_type === "Paid" && t.budget)
    ? '<div style="font-size:0.85rem;color:#065f46;font-weight:600;">Agreed: KSh ' + Number(b.amount || t.budget).toLocaleString() + '</div>'
    : '<div style="font-size:0.85rem;color:#0369a1;font-weight:600;">Volunteer</div>';

  const overdueClass =
    deadlineInfo.state === "overdue" ? " labs-assign-card--overdue" :
    deadlineInfo.state === "warning" ? " labs-assign-card--soon" : "";

  const deadlineClass =
    deadlineInfo.state === "overdue" ? " labs-assign-card__deadline--urgent" :
    deadlineInfo.state === "warning" ? " labs-assign-card__deadline--warning" : "";

  // Submit button only when Approved
  const submitBtn = b.status === "Approved"
    ? '<button class="labs-assign-btn--submit" data-action="submit" data-id="' + b.id + '">Mark as Submitted</button>'
    : '';

  const submittedInfo = b.submission_url
    ? '<div style="font-size:0.85rem;color:#6b7280;word-break:break-all;">Submitted: <a href="' + escapeHtml(b.submission_url) + '" target="_blank" rel="noopener">' + escapeHtml(b.submission_url) + '</a></div>'
    : '';

  return '<article class="labs-assign-card' + overdueClass + '">' +
    '<div class="labs-assign-card__head">' +
      '<div>' +
        '<h3 class="labs-assign-card__title">' + escapeHtml(t.title || "Task") + '</h3>' +
        '<div class="labs-assign-card__meta">' + escapeHtml(t.category || "") + (t.task_type ? ' - ' + escapeHtml(t.task_type) : '') + '</div>' +
      '</div>' +
      statusBadge +
    '</div>' +
    budgetLine +
    '<div class="labs-assign-card__deadline' + deadlineClass + '">' +
      '<strong>Deadline:</strong> ' + deadlineInfo.label +
    '</div>' +
    '<div class="labs-assign-card__proposal">' + escapeHtml(b.proposal || "") + '</div>' +
    submittedInfo +
    '<div class="labs-assign-card__foot">' + submitBtn + '</div>' +
  '</article>';
}

function computeDeadline(iso, status) {
  if (!iso) return { state: "none", label: "Not set" };

  const deadline = new Date(iso + "T23:59:59");
  const now = new Date();
  const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

  const formatted = deadline.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

  if (status === "Submitted" || status === "Done") {
    return { state: "ok", label: formatted + " - submitted on time" };
  }

  if (diffDays < 0) {
    return { state: "overdue", label: formatted + " - OVERDUE by " + Math.abs(diffDays) + " day(s)" };
  }
  if (diffDays === 0) {
    return { state: "warning", label: formatted + " - due TODAY" };
  }
  if (diffDays <= 3) {
    return { state: "warning", label: formatted + " - due in " + diffDays + " day(s)" };
  }
  return { state: "ok", label: formatted };
}

// ---------- Submit modal ----------
function showSubmitModal(bid) {
  const modalHtml =
    '<div class="modal-backdrop" id="submit-modal" style="position:fixed;inset:0;background:rgba(15,23,42,0.55);display:flex;align-items:flex-start;justify-content:center;padding:2rem 1rem;overflow-y:auto;z-index:100;">' +
      '<div class="modal" style="background:#fff;border-radius:16px;max-width:560px;width:100%;padding:1.75rem;box-shadow:0 20px 50px rgba(0,0,0,0.3);">' +
        '<h3 style="margin:0 0 0.5rem;font-size:1.15rem;color:#1E3A8A;">Submit Your Work</h3>' +
        '<p style="color:#6b7280;font-size:0.9rem;margin:0 0 1rem;">' + escapeHtml((bid.tasks && bid.tasks.title) || "Task") + '</p>' +
        '<form id="submit-form" class="form">' +
          '<div><label for="sub-url">Deliverable link</label>' +
            '<input id="sub-url" name="submission_url" type="url" placeholder="https:// (Google Drive, GitHub, Figma, etc.)" required /></div>' +
          '<div><label for="sub-notes">Notes for the admin</label>' +
            '<textarea id="sub-notes" name="submission_notes" placeholder="Brief description of what you delivered"></textarea></div>' +
          '<div style="display:flex;gap:0.5rem;margin-top:0.5rem;">' +
            '<button type="submit" style="background:#10B981;color:#fff;border:none;padding:0.65rem 1.25rem;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit;">Submit</button>' +
            '<button type="button" id="sub-cancel" style="background:#fff;color:#1E3A8A;border:1px solid #1E3A8A;padding:0.65rem 1.25rem;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit;">Cancel</button>' +
          '</div>' +
        '</form>' +
      '</div>' +
    '</div>';

  const wrapper = document.createElement("div");
  wrapper.innerHTML = modalHtml;
  document.body.appendChild(wrapper);

  document.getElementById("sub-cancel").addEventListener("click", () => wrapper.remove());

  document.getElementById("submit-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const submission_url = form.submission_url.value.trim();
    const submission_notes = form.submission_notes.value.trim() || null;

    if (!submission_url) { alert("A deliverable link is required."); return; }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    const { error } = await supabase
      .from("bids")
      .update({
        status: "Submitted",
        submission_url,
        submission_notes,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", bid.id);

    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";

    if (error) { alert("Could not submit: " + error.message); return; }

    wrapper.remove();
    alert("Work submitted. The admin will review it.");
    window.location.reload();
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
