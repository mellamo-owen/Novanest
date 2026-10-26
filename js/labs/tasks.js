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
    container.innerHTML = '<div class="labs-empty"><strong>Could not load tasks.</strong></div>';
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
    container.innerHTML = '<div class="labs-empty"><strong>No open tasks right now.</strong>Check back soon.</div>';
    return;
  }

  container.innerHTML = '<div class="labs-task-grid">' + filtered.map(cardHtml).join("") + '</div>';

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

  const deadline = t.deadline ? '<div><strong>Deadline:</strong> ' + formatDate(t.deadline) + '</div>' : '';
  const slots = t.slots ? '<div><strong>Slots:</strong> ' + t.slots + ' member' + (t.slots > 1 ? 's' : '') + '</div>' : '';
  const cat = t.category ? '<div><strong>Category:</strong> ' + escapeHtml(t.category) + '</div>' : '';

  const modalHtml =
    '<div class="modal-backdrop" id="labs-task-modal" style="position:fixed;inset:0;background:rgba(15,23,42,0.85);backdrop-filter:blur(4px);display:flex;align-items:flex-start;justify-content:center;padding:2rem 1rem;overflow-y:auto;z-index:100;">' +
      '<div class="modal" style="background:#0F172A;border:1px solid #1E293B;border-radius:16px;max-width:640px;width:100%;padding:2rem;box-shadow:0 20px 50px rgba(0,0,0,0.5);">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1rem;">' +
          '<h3 style="margin:0;font-size:1.4rem;color:#FFFFFF;">' + escapeHtml(t.title || "Untitled") + '</h3>' + typePill +
        '</div>' +
        '<div style="display:grid;gap:0.5rem;font-size:0.95rem;color:#94A3B8;margin-bottom:1.5rem;">' + cat + budget + slots + deadline + '</div>' +
        '<div style="background:#0B1120;border:1px solid #1E293B;border-radius:10px;padding:1.25rem;font-size:0.95rem;white-space:pre-wrap;color:#E2E8F0;margin-bottom:1.5rem;">' +
          escapeHtml(t.description || "No description provided.") +
        '</div>' +
        '<div style="display:flex;gap:0.75rem;flex-wrap:wrap;">' +
          '<button id="labs-task-bid" style="background:#10B981;color:#fff;border:none;padding:0.85rem 1.5rem;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit;flex:1;">Submit Bid</button>' +
          '<button id="labs-task-close" style="background:transparent;color:#E2E8F0;border:1px solid #334155;padding:0.85rem 1.5rem;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit;">Close</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  const wrapper = document.createElement("div");
  wrapper.innerHTML = modalHtml;
  document.body.appendChild(wrapper);

  document.getElementById("labs-task-close").addEventListener("click", () => wrapper.remove());
  document.getElementById("labs-task-bid").addEventListener("click", () => {
    wrapper.remove();
    showBidModal(t);
  });
}

function showBidModal(task) {
  const isPaid = task.task_type === "Paid" && task.budget;

  const budgetLine = isPaid
    ? '<div><strong>Client budget:</strong> KSh ' + Number(task.budget).toLocaleString() + '</div>'
    : '<div><strong>This is a volunteer task.</strong></div>';

  const modalHtml =
    '<div class="modal-backdrop" id="labs-bid-modal" style="position:fixed;inset:0;background:rgba(15,23,42,0.85);backdrop-filter:blur(4px);display:flex;align-items:flex-start;justify-content:center;padding:2rem 1rem;overflow-y:auto;z-index:100;">' +
      '<div class="modal" style="background:#0F172A;border:1px solid #1E293B;border-radius:16px;max-width:560px;width:100%;padding:2rem;box-shadow:0 20px 50px rgba(0,0,0,0.5);">' +
        '<h3 style="margin:0 0 0.5rem;font-size:1.3rem;color:#FFFFFF;">Submit a Bid</h3>' +
        '<p style="color:#94A3B8;font-size:0.95rem;margin:0 0 1.5rem;">' + escapeHtml(task.title) + '</p>' +
        '<div style="font-size:0.95rem;color:#E2E8F0;margin-bottom:1.5rem;padding:1rem;background:#0B1120;border-radius:8px;">' + budgetLine + '</div>' +
        '<form id="labs-bid-form" class="form">' +
          '<div><label style="color:#E2E8F0;" for="bid-amount">Your price (KSh)' + (isPaid ? '' : ' - optional') + '</label>' +
          '<input style="background:#0B1120;border:1px solid #334155;color:#fff;" id="bid-amount" name="amount" type="number" min="0" step="1" /></div>' +
          '<div style="margin-top:1rem;"><label style="color:#E2E8F0;" for="bid-timeline">Estimated timeline</label>' +
          '<input style="background:#0B1120;border:1px solid #334155;color:#fff;" id="bid-timeline" name="timeline" type="text" placeholder="e.g. 3 days" /></div>' +
          '<div style="margin-top:1rem;"><label style="color:#E2E8F0;" for="bid-proposal">Your proposal *</label>' +
          '<textarea style="background:#0B1120;border:1px solid #334155;color:#fff;" id="bid-proposal" name="proposal" required rows="4"></textarea></div>' +
          '<div style="display:flex;gap:0.5rem;margin-top:1.5rem;">' +
            '<button type="submit" style="background:#10B981;color:#fff;border:none;padding:0.85rem 1.5rem;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit;flex:1;">Submit Bid</button>' +
            '<button type="button" id="bid-cancel" style="background:transparent;color:#E2E8F0;border:1px solid #334155;padding:0.85rem 1.5rem;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit;">Cancel</button>' +
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

    if (!proposal) { alert("Proposal is required."); return; }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    const { error } = await supabase.from("bids").insert({
      task_id: task.id,
      member_id: window.__labsMember.user.id,
      proposal, amount, timeline,
      status: "Pending"
    });

    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Bid";

    if (error) {
      if (error.code === "23505") alert("You have already placed a bid on this task.");
      else alert("Could not submit bid: " + error.message);
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
