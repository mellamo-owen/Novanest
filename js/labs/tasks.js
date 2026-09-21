// ============================================================
// NOVANEST Labs - Member task list (read-only)
// ============================================================

import { supabase } from "../supabase.js";

const container    = document.getElementById("labs-tasks-container");
const filterSearch = document.getElementById("labs-filter-search");
const filterType   = document.getElementById("labs-filter-type");
const filterCat    = document.getElementById("labs-filter-cat");

let allTasks = [];

document.addEventListener("labs:ready", () => {
  loadTasks();
  wireEvents();
});

async function loadTasks() {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("status", "Open")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Load tasks error:", error);
    container.innerHTML = '<div class="labs-empty"><strong>Could not load tasks.</strong>Please refresh the page.</div>';
    return;
  }

  allTasks = data || [];
  renderList();
}

function wireEvents() {
  filterSearch.addEventListener("input", renderList);
  filterType.addEventListener("change", renderList);
  filterCat.addEventListener("change", renderList);
}

function renderList() {
  const term = (filterSearch.value || "").toLowerCase().trim();
  const type = filterType.value;
  const cat  = filterCat.value;

  const filtered = allTasks.filter((t) => {
    if (term && !(t.title || "").toLowerCase().includes(term)) return false;
    if (type && t.task_type !== type) return false;
    if (cat && t.category !== cat) return false;
    return true;
  });

  if (!filtered.length) {
    container.innerHTML =
      '<div class="labs-empty">' +
        '<strong>No open tasks right now.</strong>' +
        'Check back soon - new work gets posted regularly.' +
      '</div>';
    return;
  }

  container.innerHTML =
    '<div class="labs-task-grid">' +
      filtered.map(cardHtml).join("") +
    '</div>';

  container.querySelectorAll(".labs-task-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      const task = allTasks.find((t) => t.id === id);
      if (task) showTaskModal(task);
    });
  });
}

function cardHtml(t) {
  const typePill = t.task_type === "Paid"
    ? '<span class="task-type-pill task-type-pill--paid">Paid</span>'
    : '<span class="task-type-pill task-type-pill--volunteer">Volunteer</span>';

  const catPill = t.category ? '<span class="tag">' + escapeHtml(t.category) + '</span>' : '';

  const budget = t.task_type === "Paid" && t.budget
    ? '<span class="labs-task-card__budget">KSh ' + Number(t.budget).toLocaleString() + '</span>'
    : '<span class="labs-task-card__budget--volunteer">Volunteer</span>';

  const deadline = t.deadline
    ? '<span class="labs-task-card__deadline">Due ' + formatDate(t.deadline) + '</span>'
    : '';

  const slots = t.slots
    ? '<span class="labs-task-card__deadline">' + t.slots + ' slot' + (t.slots > 1 ? 's' : '') + '</span>'
    : '';

  return '<article class="labs-task-card" data-id="' + t.id + '">' +
    '<div class="labs-task-card__meta">' + typePill + catPill + slots + '</div>' +
    '<h3 class="labs-task-card__title">' + escapeHtml(t.title || "Untitled") + '</h3>' +
    '<p class="labs-task-card__desc">' + escapeHtml(t.description || "No description provided.") + '</p>' +
    '<div class="labs-task-card__foot">' + budget + deadline + '</div>' +
  '</article>';
}

function showTaskModal(t) {
  const typePill = t.task_type === "Paid"
    ? '<span class="task-type-pill task-type-pill--paid">Paid</span>'
    : '<span class="task-type-pill task-type-pill--volunteer">Volunteer</span>';

  const budget = t.task_type === "Paid" && t.budget
    ? '<div><strong>Budget:</strong> KSh ' + Number(t.budget).toLocaleString() + '</div>'
    : '<div><strong>Type:</strong> Volunteer (unpaid)</div>';

  const deadline = t.deadline
    ? '<div><strong>Deadline:</strong> ' + formatDate(t.deadline) + '</div>'
    : '';

  const slots = t.slots
    ? '<div><strong>Slots:</strong> ' + t.slots + ' member' + (t.slots > 1 ? 's' : '') + '</div>'
    : '';

  const cat = t.category
    ? '<div><strong>Category:</strong> ' + escapeHtml(t.category) + '</div>'
    : '';

  const modalHtml =
    '<div class="modal-backdrop" id="labs-task-modal" style="position:fixed;inset:0;background:rgba(15,23,42,0.55);display:flex;align-items:flex-start;justify-content:center;padding:2rem 1rem;overflow-y:auto;z-index:100;">' +
      '<div class="modal" style="background:#fff;border-radius:16px;max-width:640px;width:100%;padding:1.75rem;box-shadow:0 20px 50px rgba(0,0,0,0.3);">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:0.75rem;">' +
          '<h3 style="margin:0;font-size:1.2rem;color:#1E3A8A;">' + escapeHtml(t.title || "Untitled") + '</h3>' +
          typePill +
        '</div>' +
        '<div style="display:grid;gap:0.35rem;font-size:0.9rem;color:#4b5563;margin-bottom:1rem;">' +
          cat + budget + slots + deadline +
        '</div>' +
        '<div style="background:#f5f8fc;border:1px solid #e5e7eb;border-radius:10px;padding:1rem;font-size:0.9rem;white-space:pre-wrap;color:#1f2937;">' +
          escapeHtml(t.description || "No description provided.") +
        '</div>' +
       '<div style="margin-top:1.25rem;display:flex;gap:0.5rem;flex-wrap:wrap;">' +
  '<button id="labs-task-bid" style="background:#10B981;color:#fff;border:none;padding:0.65rem 1.25rem;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit;">Submit Bid</button>' +
  '<button id="labs-task-close" style="background:#fff;color:#1E3A8A;border:1px solid #1E3A8A;padding:0.65rem 1.25rem;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit;">Close</button>' +
'</div>' +
      '</div>' +
    '</div>';

  const wrapper = document.createElement("div");
  wrapper.innerHTML = modalHtml;
  document.body.appendChild(wrapper);
document.getElementById("labs-task-close").addEventListener("click", () => {
    wrapper.remove();
  });

  document.getElementById("labs-task-bid").addEventListener("click", () => {
    wrapper.remove();
    showBidModal(t);
  });
}

// ---------- Bid modal ----------
function showBidModal(task) {
  const isPaid = task.task_type === "Paid" && task.budget;

  const budgetLine = isPaid
    ? '<div><strong>Client budget:</strong> KSh ' + Number(task.budget).toLocaleString() + '</div>'
    : '<div><strong>This is a volunteer task.</strong> You may still submit a bid to be considered.</div>';

  const modalHtml =
    '<div class="modal-backdrop" id="labs-bid-modal" style="position:fixed;inset:0;background:rgba(15,23,42,0.55);display:flex;align-items:flex-start;justify-content:center;padding:2rem 1rem;overflow-y:auto;z-index:100;">' +
      '<div class="modal" style="background:#fff;border-radius:16px;max-width:560px;width:100%;padding:1.75rem;box-shadow:0 20px 50px rgba(0,0,0,0.3);">' +
        '<h3 style="margin:0 0 0.5rem;font-size:1.15rem;color:#1E3A8A;">Submit a Bid</h3>' +
        '<p style="color:#6b7280;font-size:0.9rem;margin:0 0 1rem;">' + escapeHtml(task.title) + '</p>' +
        '<div style="font-size:0.9rem;color:#4b5563;margin-bottom:1rem;">' + budgetLine + '</div>' +
        '<form id="labs-bid-form" class="form">' +
          '<div>' +
            '<label for="bid-amount">Your price (KSh)' + (isPaid ? '' : ' - optional') + '</label>' +
            '<input id="bid-amount" name="amount" type="number" min="0" step="1" ' + (isPaid ? '' : '') + ' />' +
          '</div>' +
          '<div>' +
            '<label for="bid-timeline">Estimated timeline</label>' +
            '<input id="bid-timeline" name="timeline" type="text" placeholder="e.g. 3 days" />' +
          '</div>' +
          '<div>' +
            '<label for="bid-proposal">Your proposal *</label>' +
            '<textarea id="bid-proposal" name="proposal" required placeholder="How you plan to do this, why you are the right person, and what you will deliver"></textarea>' +
          '</div>' +
          '<div style="display:flex;gap:0.5rem;margin-top:0.5rem;">' +
            '<button type="submit" style="background:#10B981;color:#fff;border:none;padding:0.65rem 1.25rem;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit;">Submit Bid</button>' +
            '<button type="button" id="bid-cancel" style="background:#fff;color:#1E3A8A;border:1px solid #1E3A8A;padding:0.65rem 1.25rem;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit;">Cancel</button>' +
          '</div>' +
        '</form>' +
      '</div>' +
    '</div>';

  const wrapper = document.createElement("div");
  wrapper.innerHTML = modalHtml;
  document.body.appendChild(wrapper);

  document.getElementById("bid-cancel").addEventListener("click", () => wrapper.remove());

  document.getElementById("labs-bid-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const amount = form.amount.value ? Number(form.amount.value) : null;
    const timeline = form.timeline.value.trim() || null;
    const proposal = form.proposal.value.trim();

    if (!proposal) {
      alert("Proposal is required.");
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    const { error } = await supabase.from("bids").insert({
      task_id: task.id,
      member_id: window.__labsMember.user.id,
      proposal,
      amount,
      timeline,
      status: "Pending"
    });

    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Bid";

    if (error) {
      if (error.code === "23505") {
        alert("You have already placed a bid on this task.");
      } else {
        alert("Could not submit bid: " + error.message);
      }
      return;
    }

    wrapper.remove();
    alert("Bid submitted. The admin will review it soon.");
  });
}
  


function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
