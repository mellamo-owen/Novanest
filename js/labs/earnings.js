import { supabase } from "../supabase.js";

const container = document.getElementById("labs-earnings-container");
const kpiTotal  = document.getElementById("kpi-total");
const kpiMonth  = document.getElementById("kpi-month");
const kpiCount  = document.getElementById("kpi-count");

document.addEventListener("labs:ready", (e) => {
  loadEarnings(e.detail.user.id);
});

async function loadEarnings(userId) {
  const { data, error } = await supabase.from("payouts").select("*, tasks(title)").eq("member_id", userId).order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = '<div class="labs-empty"><strong>Could not load earnings.</strong></div>';
    return;
  }

  const rows = data || [];
  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = rows.filter((r) => new Date(r.created_at) >= monthStart).reduce((s, r) => s + Number(r.amount || 0), 0);

  kpiTotal.textContent = "KSh " + total.toLocaleString();
  kpiMonth.textContent = "KSh " + thisMonth.toLocaleString();
  kpiCount.textContent = rows.length.toString();

  if (!rows.length) {
    container.innerHTML = '<div class="labs-empty"><strong>No payments yet.</strong></div>';
    return;
  }

  container.innerHTML = '<div class="admin-table-wrap"><div class="admin-table-scroll"><table class="admin-table"><thead><tr>' +
    '<th>Date</th><th>Task / Note</th><th>Amount</th><th>Status</th>' +
    '</tr></thead><tbody>' + rows.map(rowHtml).join("") + '</tbody></table></div></div>';

  // Render the Chart
  const ctx = document.getElementById('earningsChart').getContext('2d');
  const chartData = [...rows].reverse();
  const labels = chartData.map(r => new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
  const amounts = chartData.map(r => Number(r.amount || 0));
  
  let gradient = ctx.createLinearGradient(0, 0, 0, 250);
  gradient.addColorStop(0, '#10B981');
  gradient.addColorStop(1, 'rgba(16, 185, 129, 0.2)');

  new Chart(ctx, {
    type: 'bar',
    data: { labels: labels, datasets: [{ label: 'Payout Amount (KSh)', data: amounts, backgroundColor: gradient, borderRadius: 6, borderSkipped: false }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: '#94A3B8' } }, y: { grid: { color: '#1E293B' }, ticks: { color: '#94A3B8' } } } }
  });
}

'<td data-label="Date">' + formatDate(r.created_at) + '</td>' +'<td data-label="Task"><strong>' + escapeHtml(t.title || 'Task Payout') + '</strong></td>' + '<td data-label="Amount"><strong style="color:#10B981;">KSh ' + Number(r.amount || 0).toLocaleString() + '</strong></td>' + '<td data-label="Status"><span class="dash-badge dash-badge--new">' + escapeHtml(r.status || 'Processing') + '</span></td>' + '</tr>';
}

function formatDate(iso) { return iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : ""; }
function escapeHtml(str) { return String(str).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }

