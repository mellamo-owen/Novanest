// ============================================================
// NOVANEST - Admin Tasks CRUD + Bid Review + Submission Review
// ============================================================

import { supabase } from "../supabase.js";

const container    = document.getElementById("tasks-container");
const modal        = document.getElementById("task-modal");
const modalTitle   = document.getElementById("modal-title");
const form         = document.getElementById("task-form");
const toastEl      = document.getElementById("toast");
const bidsHost     = document.getElementById("bids-modal-host");

const btnNew       = document.getElementById("btn-new-task");
const btnCancel    = document.getElementById("btn-cancel");
const filterSearch = document.getElementById("filter-search");
const filterStatus = document.getElementById("filter-status");
const filterType   = document.getElementById("filter-type");
const filterCat    = document.getElementById("filter-category");

let allTasks = [];
let bidCounts = {};

document.addEventListener("admin:ready", () => {
  loadTasks();
  wireEvents();
});

async function loadTasks() {
  container.innerHTML = '<div class="admin-empty"><strong>Loading tasks...</strong></div>';

  const [tasksRes, bidsRes] = await Promise.all([
    supabase.from("tasks").select("*").order("created_at", { ascending: false }),
    supabase.from("bids").select("id, task_id, status")
  ]);

  if (tasksRes.error) {
    container.innerHTML = '<div class="admin-empty"><strong>Could not load tasks.</strong>' + tasksRes.error.message + '</div>';
    return;
  }

  allTasks = tasksRes.data || [];
  bidCounts = {};
  (bidsRes.data || []).forEach((b) => {
    if (!bidCounts[b.task_id]) bidCounts[b.task_id] = { total: 0, pending: 0, submitted: 0 };
    bidCounts[b.task_id].total++;
    if (b.status === "Pending") bidCounts[b.task_id].pending++;
    if (b.status === "Submitted") bidCounts[b.task_id].submitted++;
  });

  renderList();
}

function renderList() {
  const term   = (filterSearch.value || "").toLowerCase().trim();
  const status = filterStatus.value;
  const type   = filterType.value;
  const cat    = filterCat.value;

  const filtered = allTasks.filter((t) => {
    if (term && !(t.title || "").toLowerCase().includes(term)) return false;
    if (status && t.status !== status) return false;
    if (type && t.task_type !== type) return false;
    if (cat && t.category !== cat) return false;
    return true;
  });

  if (!filtered.length) {
    container.innerHTML = '<div class="admin-empty"><strong>No tasks found.</strong>Adjust filters or click "New Task" to create one.</div>';
    return;
  }

  container.innerHTML =
    '<div class="admin-table-wrap"><div class="admin-table-scroll">' +
      '<table class="admin-table"><thead><tr>' +
        '<th>Title</th><th>Category</th><th>Type</th><th>Budget</th><th>Slots</th>' +
        '<th>Bids</th><th>Status</th><th>Actions</th>' +
      '</tr></thead><tbody>' + filtered.map(rowHtml).join("") + '</tbody></table>' +
    '</div></div>';
}

function rowHtml(t) {
  const typePill = t.task_type === "Paid"
    ? '<span class="task-type-pill task-type-pill--paid">Paid</span>'
    : '<span class="task-type-pill task-type-pill--volunteer">Volunteer</span>';

  const budget = t.task_type === "Paid" && t.budget
    ? '<span class="task-budget">KSh ' + Number(t.budget).toLocaleString() + '</span>'
    : '<span class="task-budget--volunteer">-</span>';

  const slots = t.slots ? '<span class="task-slots">' + t.slots + '</span>' : '-';

  const counts = bidCounts[t.id] || { total: 0, pending: 0, submitted: 0 };
  let bidsCell = counts.total === 0
    ? '<span style="color:#9ca3af;">0</span>'
    : '<strong>' + counts.total + '</strong>';
  if (counts.pending) bidsCell += ' <span style="color:#b45309;">(' + counts.pending + ' pending)</span>';
  if (counts.submitted) bidsCell += ' <span style="color:#1d4ed8;">(' + counts.submitted + ' submitted)</span>';

  const statusPill = t.status === "Open"
    ? '<span class="task-status-pill task-status-pill--open">Open</span>'
    : t.status === "In Progress"
      ? '<span class="task-status-pill task-status-pill--prog">In Progress</span>'
      : '<span class="task-status-pill task-status-pill--closed">Closed</span>';

  return '<tr data-id="' + t.id + '">' +
    '<td><strong>' + escapeHtml(t.title || "") + '</strong></td>' +
    '<td>' + escapeHtml(t.category || "") + '</td>' +
    '<td>' + typePill + '</td>' +
    '<td>' + budget + '</td>' +
    '<td>' + slots + '</td>' +
    '<td>' + bidsCell + '</td>' +
    '<td>' + statusPill + '</td>' +
    '<td><div class="row-actions">' +
      '<button data-action="bids">Bids</button>' +
      '<button data-action="edit">Edit</button>' +
      '<button data-action="delete" class="danger">Delete</button>' +
    '</div></td>' +
  '</tr>';
}

function wireEvents() {
  filterSearch.addEventListener("input", renderList);
  filterStatus.addEventListener("change", renderList);
  filterType.addEventListener("change", renderList);
  filterCat.addEventListener("change", renderList);
  btnNew.addEventListener("click", () => openModal());
  btnCancel.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  form.addEventListener("submit", handleSubmit);
  container.addEventListener("click", handleRowClick);
}

function openModal(task) {
  form.reset();
  if (task) {
    modalTitle.textContent = "Edit Task";
    document.getElementById("t-id").value       = task.id;
    document.getElementById("t-title").value    = task.title || "";
    document.getElementById("t-desc").value     = task.description || "";
    document.getElementById("t-cat").value      = task.category || "";
    document.getElementById("t-type").value     = task.task_type || "Volunteer";
    document.getElementById("t-budget").value   = task.budget || "";
    document.getElementById("t-slots").value    = task.slots || 1;
    document.getElementById("t-deadline").value = task.deadline || "";
    document.getElementById("t-status").value   = task.status || "Open";
  } else {
    modalTitle.textContent = "New Task";
    document.getElementById("t-id").value = "";
    document.getElementById("t-slots").value = 1;
    document.getElementById("t-status").value = "Open";
  }
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => document.getElementById("t-title").focus(), 50);
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
}

async function handleSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("t-id").value;
  const taskType = document.getElementById("t-type").value;
  const budgetRaw = document.getElementById("t-budget").value;

  const payload = {
    title:       document.getElementById("t-title").value.trim(),
    description: document.getElementById("t-desc").value.trim() || null,
    category:    document.getElementById("t-cat").value || null,
    task_type:   taskType,
    budget:      taskType === "Paid" && budgetRaw ? Number(budgetRaw) : null,
    slots:       Number(document.getElementById("t-slots").value || 1),
    deadline:    document.getElementById("t-deadline").value || null,
    status:      document.getElementById("t-status").value || "Open"
  };

  if (!payload.title) { showToast("Title is required", "error"); return; }

  const submitBtn = form.querySelector('button[type="submit"]');
  const original = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  try {
    let error;
    if (id) {
      payload.updated_at = new Date().toISOString();
      ({ error } = await supabase.from("tasks").update(payload).eq("id", id));
    } else {
      ({ error } = await supabase.from("tasks").insert(payload));
    }
    if (error) throw error;
    showToast(id ? "Task updated" : "Task created", "success");
    closeModal();
    await loadTasks();
  } catch (err) {
    showToast("Could not save: " + err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = original;
  }
}

async function handleRowClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.closest("tr").dataset.id;
  const task = allTasks.find((t) => t.id === id);
  if (!task) return;

  if (btn.dataset.action === "edit") { openModal(task); return; }
  if (btn.dataset.action === "bids") { showBidsModal(task); return; }

  if (btn.dataset.action === "delete") {
    if (!confirm('Delete "' + task.title + '"? This also removes all its bids.')) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { showToast("Delete failed: " + error.message, "error"); return; }
    showToast("Task deleted", "success");
    await loadTasks();
  }
}

// ---------- Bids modal (with submission review) ----------
async function showBidsModal(task) {
  bidsHost.innerHTML = '';

  const { data: bids, error } = await supabase
    .from("bids")
    .select("*")
    .eq("task_id", task.id)
    .order("created_at", { ascending: false });

  if (error) { showToast("Could not load bids: " + error.message, "error"); return; }

  const memberIds = (bids || []).map((b) => b.member_id);
  let memberMap = {};
  if (memberIds.length) {
    const { data: profiles } = await supabase
      .from("member_profiles")
      .select("user_id, full_name, email, role")
      .in("user_id", memberIds);
    (profiles || []).forEach((p) => { memberMap[p.user_id] = p; });
  }

  const listHtml = (!bids || bids.length === 0)
    ? '<div style="padding:1rem;text-align:center;color:#6b7280;">No bids yet on this task.</div>'
    : bids.map((b) => bidRowHtml(b, memberMap[b.member_id])).join("");

  const modalHtml =
    '<div class="modal-backdrop" id="bids-modal" style="position:fixed;inset:0;background:rgba(15,23,42,0.55);display:flex;align-items:flex-start;justify-content:center;padding:2rem 1rem;overflow-y:auto;z-index:100;">' +
      '<div class="modal" style="background:#fff;border-radius:16px;max-width:760px;width:100%;padding:1.75rem;box-shadow:0 20px 50px rgba(0,0,0,0.3);">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:0.75rem;">' +
          '<h3 style="margin:0;font-size:1.15rem;color:#1E3A8A;">Bids for: ' + escapeHtml(task.title || "") + '</h3>' +
          '<button id="bids-close" style="background:#fff;color:#1E3A8A;border:1px solid #1E3A8A;padding:0.4rem 0.9rem;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;">Close</button>' +
        '</div>' +
        '<div style="font-size:0.85rem;color:#6b7280;margin-bottom:1rem;">' +
          'Task type: ' + escapeHtml(task.task_type || "Volunteer") +
          (task.task_type === "Paid" && task.budget ? ' - Budget: KSh ' + Number(task.budget).toLocaleString() : '') +
          ' - Slots: ' + (task.slots || 1) +
        '</div>' +
        '<div style="display:grid;gap:0.75rem;">' + listHtml + '</div>' +
      '</div>' +
    '</div>';

  bidsHost.innerHTML = modalHtml;
  document.getElementById("bids-close").addEventListener("click", () => { bidsHost.innerHTML = ''; });

  bidsHost.querySelectorAll("button[data-bid-action]").forEach((b) => {
    b.addEventListener("click", () => handleBidAction(b.dataset.bidAction, b.dataset.bidId, task, bids));
  });
}

function bidRowHtml(b, member) {
  const name = member ? member.full_name : "Unknown member";
  const email = member ? member.email : "";
  const role = member ? member.role : "";

  let statusPill;
  if (b.status === "Approved") statusPill = '<span class="dash-badge dash-badge--verified">Approved</span>';
  else if (b.status === "Rejected") statusPill = '<span class="dash-badge dash-badge--rejected">Rejected</span>';
  else if (b.status === "Submitted") statusPill = '<span class="dash-badge dash-badge--new">Submitted</span>';
  else if (b.status === "Done") statusPill = '<span class="dash-badge" style="background:#e0e7ff;color:#3730a3;">Done</span>';
  else statusPill = '<span class="dash-badge dash-badge--pending">Pending</span>';

  const amount = b.amount ? '<div><strong>Price:</strong> KSh ' + Number(b.amount).toLocaleString() + '</div>' : '';
  const timeline = b.timeline ? '<div><strong>Timeline:</strong> ' + escapeHtml(b.timeline) + '</div>' : '';
  const deadline = b.deadline ? '<div><strong>Assigned deadline:</strong> ' + formatDate(b.deadline) + '</div>' : '';

  // Submission block
  let submissionBlock = "";
  if (b.submission_url) {
    submissionBlock =
      '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:0.75rem;margin-top:0.6rem;font-size:0.9rem;">' +
        '<div style="font-weight:700;color:#1e40af;margin-bottom:0.4rem;">Deliverable submitted' + (b.submitted_at ? ' on ' + formatDate(b.submitted_at) : '') + '</div>' +
        '<div style="word-break:break-all;"><strong>Link:</strong> <a href="' + escapeHtml(b.submission_url) + '" target="_blank" rel="noopener">' + escapeHtml(b.submission_url) + '</a></div>' +
        (b.submission_notes ? '<div style="margin-top:0.4rem;white-space:pre-wrap;">' + escapeHtml(b.submission_notes) + '</div>' : '') +
      '</div>';
  }

  const reviewNotes = b.review_notes
    ? '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:0.6rem;margin-top:0.5rem;font-size:0.85rem;"><strong>Review note:</strong> ' + escapeHtml(b.review_notes) + '</div>'
    : '';

  // Actions
  const actions = [];
  if (b.status === "Pending") {
    actions.push('<button class="success" data-bid-action="approve" data-bid-id="' + b.id + '">Approve</button>');
    actions.push('<button class="danger" data-bid-action="reject" data-bid-id="' + b.id + '">Reject</button>');
  } else if (b.status === "Approved") {
    actions.push('<button class="danger" data-bid-action="reject" data-bid-id="' + b.id + '">Reject</button>');
    actions.push('<button data-bid-action="reset" data-bid-id="' + b.id + '">Reset to Pending</button>');
  } else if (b.status === "Submitted") {
    actions.push('<button class="success" data-bid-action="done" data-bid-id="' + b.id + '">Mark Done</button>');
    actions.push('<button class="danger" data-bid-action="request-changes" data-bid-id="' + b.id + '">Request Changes</button>');
  } else if (b.status === "Rejected") {
    actions.push('<button data-bid-action="reset" data-bid-id="' + b.id + '">Reset to Pending</button>');
  }

  return '<div style="border:1px solid #e5e7eb;border-radius:12px;padding:1rem;background:#fafbfd;">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;margin-bottom:0.5rem;">' +
      '<div>' +
        '<strong style="color:#1E3A8A;">' + escapeHtml(name) + '</strong>' +
        (role ? ' <span style="color:#059669;font-size:0.85rem;">(' + escapeHtml(role) + ')</span>' : '') +
        '<div style="color:#6b7280;font-size:0.8rem;">' + escapeHtml(email) + ' - ' + formatDate(b.created_at) + '</div>' +
      '</div>' +
      statusPill +
    '</div>' +
    '<div style="display:grid;gap:0.25rem;font-size:0.9rem;color:#4b5563;margin-bottom:0.5rem;">' + amount + timeline + deadline + '</div>' +
    '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:0.75rem;font-size:0.9rem;white-space:pre-wrap;color:#1f2937;">' + escapeHtml(b.proposal || "") + '</div>' +
    submissionBlock +
    reviewNotes +
    '<div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.75rem;">' + actions.join("") + '</div>' +
  '</div>';
}

async function handleBidAction(action, bidId, task, allBids) {
  const bid = allBids.find((b) => b.id === bidId);
  if (!bid) return;

  if (action === "approve") {
    const input = prompt("Set the submission deadline (YYYY-MM-DD):", task.deadline || "");
    if (!input) return;
    if (!input.match(/^\d{4}-\d{2}-\d{2}$/)) { alert("Use format YYYY-MM-DD, e.g. 2026-12-31"); return; }

    const { error } = await supabase.from("bids").update({
      status: "Approved",
      deadline: input,
      approved_at: new Date().toISOString()
    }).eq("id", bidId);
    if (error) { showToast("Approve failed: " + error.message, "error"); return; }
    showToast("Bid approved", "success");
  }

  else if (action === "reject") {
    if (!confirm("Reject this bid?")) return;
    const { error } = await supabase.from("bids").update({
      status: "Rejected", approved_at: null
    }).eq("id", bidId);
    if (error) { showToast("Reject failed: " + error.message, "error"); return; }
    showToast("Bid rejected", "success");
  }

  else if (action === "reset") {
    if (!confirm("Reset this bid back to Pending?")) return;
    const { error } = await supabase.from("bids").update({
      status: "Pending", approved_at: null, deadline: null, review_notes: null
    }).eq("id", bidId);
    if (error) { showToast("Reset failed: " + error.message, "error"); return; }
    showToast("Reset to Pending", "success");
  }

  else if (action === "done") {
    if (!confirm("Mark this submission as Done? Member will see it as complete.")) return;
    const { error } = await supabase.from("bids").update({
      status: "Done",
      reviewed_at: new Date().toISOString()
    }).eq("id", bidId);
    if (error) { showToast("Could not mark Done: " + error.message, "error"); return; }
    showToast("Marked Done", "success");
  }

  else if (action === "log-payment") {
    showPaymentModal(bid, task, async () => {
      showToast("Payment recorded", "success");
      await loadTasks();
      await showBidsModal(task);
    });
    return;
  }

  if (action === "request-changes") {
    const notes = prompt("What changes are needed? (this will be visible to the member)");
    if (!notes) return;
    const { error } = await supabase.from("bids").update({
      status: "Approved",
      review_notes: notes,
      reviewed_at: new Date().toISOString()
    }).eq("id", bidId);
    if (error) { showToast("Could not request changes: " + error.message, "error"); return; }
    showToast("Changes requested", "success");
  }

  await loadTasks();
  await showBidsModal(task);
}

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function showToast(msg, variant) {
  toastEl.textContent = msg;
  toastEl.className = "toast toast--" + (variant || "success");
  toastEl.classList.add("is-visible");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove("is-visible"), 2800);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ============================================================
// Payment logging (Stage C2)
// ============================================================

function showPaymentModal(bid, task, onSaved) {
  const defaultAmount = bid.amount || (task && task.budget) || 0;

  const modalHtml =
    '<div class="modal-backdrop" id="payment-modal" style="position:fixed;inset:0;background:rgba(15,23,42,0.55);display:flex;align-items:flex-start;justify-content:center;padding:2rem 1rem;overflow-y:auto;z-index:100;">' +
      '<div class="modal" style="background:#fff;border-radius:16px;max-width:520px;width:100%;padding:1.75rem;box-shadow:0 20px 50px rgba(0,0,0,0.3);">' +
        '<h3 style="margin:0 0 0.5rem;font-size:1.15rem;color:#1E3A8A;">Log Payment</h3>' +
        '<p style="color:#6b7280;font-size:0.9rem;margin:0 0 1rem;">' + escapeHtml((task && task.title) || "") + '</p>' +
        '<form id="payment-form" class="form">' +
          '<div><label for="pay-amount">Amount (KSh) *</label>' +
            '<input id="pay-amount" name="amount" type="number" min="1" step="1" value="' + defaultAmount + '" required /></div>' +
          '<div><label for="pay-method">Payment method</label>' +
            '<select id="pay-method" name="method">' +
              '<option>M-Pesa</option>' +
              '<option>Bank transfer</option>' +
              '<option>Cash</option>' +
              '<option>Other</option>' +
            '</select></div>' +
          '<div><label for="pay-ref">Reference / transaction code</label>' +
            '<input id="pay-ref" name="reference" type="text" placeholder="e.g. QAB123XYZ" /></div>' +
          '<div><label for="pay-notes">Notes (optional)</label>' +
            '<textarea id="pay-notes" name="notes"></textarea></div>' +
          '<div style="display:flex;gap:0.5rem;margin-top:0.5rem;">' +
            '<button type="submit" class="btn btn--primary">Record Payment</button>' +
            '<button type="button" id="pay-cancel" class="btn btn--outline">Cancel</button>' +
          '</div>' +
        '</form>' +
      '</div>' +
    '</div>';

  const wrapper = document.createElement("div");
  wrapper.innerHTML = modalHtml;
  document.body.appendChild(wrapper);

  document.getElementById("pay-cancel").addEventListener("click", () => wrapper.remove());

  document.getElementById("payment-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const amount = Number(form.amount.value);
    const method = form.method.value;
    const reference = form.reference.value.trim() || null;
    const notes = form.notes.value.trim() || null;

    if (!amount || amount <= 0) { alert("Enter a valid amount."); return; }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    const { error } = await supabase.from("payouts").insert({
      bid_id: bid.id,
      task_id: task.id,
      member_id: bid.member_id,
      amount, method, reference, notes,
      status: "Paid"
    });

    submitBtn.disabled = false;
    submitBtn.textContent = "Record Payment";

    if (error) { alert("Could not save payment: " + error.message); return; }

    wrapper.remove();
    if (onSaved) onSaved();
  });
}
