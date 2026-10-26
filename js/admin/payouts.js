import { supabase } from "../supabase.js";

const container    = document.getElementById("payouts-container");
const filterSearch = document.getElementById("filter-search");
const toastEl      = document.getElementById("toast");
const btnNew       = document.getElementById("btn-new-payout");

const kpiTotal   = document.getElementById("kpi-total");
const kpiCount   = document.getElementById("kpi-count");
const kpiMembers = document.getElementById("kpi-members");
const kpiMonth   = document.getElementById("kpi-month");

let allRows = [];
let memberMap = {};
let allMembers = [];

document.addEventListener("admin:ready", async () => {
  await loadMembers();
  loadPayouts();
  if (filterSearch) filterSearch.addEventListener("input", render);
  if (btnNew) btnNew.addEventListener("click", openPayModal);
});

async function loadMembers() {
  const { data } = await supabase.from("member_profiles").select("user_id, full_name, email, payment_method, payment_details");
  allMembers = data || [];
  allMembers.forEach(m => memberMap[m.user_id] = m);
}

async function loadPayouts() {
  container.innerHTML = '<div class="admin-empty"><strong>Loading payouts...</strong></div>';
  const { data, error } = await supabase.from("payouts").select("*").order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = '<div class="admin-empty"><strong>Could not load payouts.</strong>' + error.message + '</div>';
    return;
  }
  allRows = data || [];
  computeKPIs();
  render();
}

function computeKPIs() {
  const total = allRows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const count = allRows.length;
  const members = new Set(allRows.map((r) => r.member_id)).size;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = allRows.filter((r) => new Date(r.created_at) >= monthStart).reduce((s, r) => s + Number(r.amount || 0), 0);

  if(kpiTotal) kpiTotal.textContent = "KSh " + total.toLocaleString();
  if(kpiCount) kpiCount.textContent = count.toString();
  if(kpiMembers) kpiMembers.textContent = members.toString();
  if(kpiMonth) kpiMonth.textContent = "KSh " + thisMonth.toLocaleString();
}

function render() {
  const term = (filterSearch?.value || "").toLowerCase().trim();
  const filtered = allRows.filter((r) => {
    if (!term) return true;
    const m = memberMap[r.member_id] || {};
    const hay = [m.full_name, m.email, r.reference, r.method].join(" ").toLowerCase();
    return hay.includes(term);
  });

  if (!filtered.length) {
    container.innerHTML = '<div class="admin-empty"><strong>No payouts found.</strong>Click "Pay Team Member" to record one.</div>';
    return;
  }

  container.innerHTML = '<div class="admin-table-wrap"><div class="admin-table-scroll"><table class="admin-table"><thead><tr>' +
    '<th>Date</th><th>Member</th><th>Amount</th><th>Method</th><th>Reference</th><th>Status</th><th>Receipt</th>' +
    '</tr></thead><tbody>' + filtered.map(rowHtml).join("") + '</tbody></table></div></div>';
}

function rowHtml(r) {
  const m = memberMap[r.member_id] || {};
  return '<tr>' +
    '<td>' + formatDate(r.created_at) + '</td>' +
    '<td><strong>' + escapeHtml(m.full_name || "Unknown") + '</strong><div style="color:#6b7280;font-size:0.75rem;">' + escapeHtml(m.email || "") + '</div></td>' +
    '<td><strong>KSh ' + Number(r.amount || 0).toLocaleString() + '</strong></td>' +
    '<td>' + escapeHtml(r.method || "") + '</td>' +
    '<td>' + escapeHtml(r.reference || "-") + '</td>' +
    '<td><span class="dash-badge dash-badge--verified">' + escapeHtml(r.status || "Paid") + '</span></td>' +
    '<td><button class="btn btn--outline" style="padding:0.2rem 0.5rem; font-size:0.7rem;" onclick="alert(\'Receipt: KSh ' + r.amount + ' paid to ' + m.full_name + ' via ' + r.method + ' on ' + formatDate(r.created_at) + '\')">View Receipt</button></td>' +
  '</tr>';
}

function openPayModal() {
  let options = allMembers.map(m => `<option value="${m.user_id}">${m.full_name} (${m.email})</option>`).join("");
  
  const modalHtml = `
    <div class="modal-backdrop" id="pay-modal" style="position:fixed;inset:0;background:rgba(15,23,42,0.55);display:flex;align-items:flex-start;justify-content:center;padding:2rem 1rem;z-index:100;">
      <div class="modal" style="background:#fff;border-radius:16px;max-width:520px;width:100%;padding:1.75rem;">
        <h3 style="margin-top:0;">Pay Team Member</h3>
        <form id="pay-form" class="form">
          <div><label>Member</label><select id="pay-member" required>${options}</select></div>
          <div><label>Amount (KSh)</label><input id="pay-amount" type="number" required /></div>
          <div><label>Method</label><select id="pay-method"><option>M-Pesa</option><option>Bank</option><option>Cash</option></select></div>
          <div><label>Reference Code</label><input id="pay-ref" type="text" placeholder="e.g. QAB123XYZ" required /></div>
          <button type="submit" class="btn btn--primary" style="margin-top:1rem;">Record Payment & Generate Receipt</button>
        </form>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById("pay-member").addEventListener("change", (e) => {
    const m = memberMap[e.target.value];
    const box = document.getElementById("display-pay-details");
    if (m && m.payment_details) {
      box.innerHTML = `<span style="color:#10B981;font-weight:bold;">${m.payment_method}:</span> ${m.payment_details}`;
    } else {
      box.innerHTML = `<span style="color:#EF4444;">No payment details provided by this member yet.</span>`;
    }
  });

  document.getElementById("pay-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true; btn.textContent = "Saving...";

    const memberId = document.getElementById("pay-member").value;
    const amount = Number(document.getElementById("pay-amount").value);
    const method = document.getElementById("pay-method").value;
    const ref = document.getElementById("pay-ref").value.trim();

    const { error } = await supabase.from("payouts").insert({
      member_id: memberId,
      amount, method, reference: ref,
      status: "Processed - Check Account"
    });

    if (error) { alert(error.message); btn.disabled = false; btn.textContent = "Save"; return; }
    
    // Show Receipt
    const m = memberMap[memberId];
    alert(`✅ PAYMENT RECORDED\n\nPaid: KSh ${amount.toLocaleString()}\nTo: ${m.full_name}\nMethod: ${method}\nRef: ${ref}\n\nMember dashboard updated.`);
    
    document.getElementById("pay-modal").remove();
    loadPayouts();
  });
}

function formatDate(iso) { return iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "-"; }
function escapeHtml(str) { return String(str).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }


