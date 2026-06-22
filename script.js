// ===== STATE =====
let expenses = JSON.parse(localStorage.getItem('exp_expenses') || '[]');
let budget = parseFloat(localStorage.getItem('exp_budget') || '0');

const CAT_EMOJI = {
  Food:'🍔', Transport:'🚌', Shopping:'🛍', Health:'🏥',
  Entertainment:'🎬', Education:'📚', Utilities:'💡', Other:'📦'
};
const CAT_COLORS = [
  '#22c55e','#3b82f6','#a855f7','#ef4444',
  '#eab308','#f97316','#06b6d4','#6b7280'
];

// ===== INIT =====
window.onload = () => {
  const now = new Date();
  document.getElementById('monthLabel').textContent =
    now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  document.getElementById('expDate').value = now.toISOString().split('T')[0];

  if (expenses.length === 0) seedData();
  if (budget > 0) document.getElementById('budgetInput').value = budget;
  refresh();
};

function seedData() {
  const today = new Date();
  const d = (offset) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() - offset);
    return dt.toISOString().split('T')[0];
  };
  expenses = [
    { id:1, desc:'Grocery Shopping', amount:1200, category:'Food', date:d(0) },
    { id:2, desc:'Uber to Office', amount:250, category:'Transport', date:d(1) },
    { id:3, desc:'Netflix Subscription', amount:649, category:'Entertainment', date:d(2) },
    { id:4, desc:'Online Course', amount:999, category:'Education', date:d(3) },
    { id:5, desc:'Electricity Bill', amount:850, category:'Utilities', date:d(4) },
    { id:6, desc:'Doctor Visit', amount:500, category:'Health', date:d(5) },
    { id:7, desc:'New Clothes', amount:1500, category:'Shopping', date:d(6) },
    { id:8, desc:'Restaurant Dinner', amount:780, category:'Food', date:d(7) },
  ];
  budget = 15000;
  save();
}

function save() {
  localStorage.setItem('exp_expenses', JSON.stringify(expenses));
  localStorage.setItem('exp_budget', budget.toString());
}

// ===== MODAL =====
function openModal() { document.getElementById('modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal').classList.add('hidden'); }

// ===== ADD =====
function addExpense() {
  const desc = document.getElementById('expDesc').value.trim();
  const amount = parseFloat(document.getElementById('expAmount').value);
  const category = document.getElementById('expCat').value;
  const date = document.getElementById('expDate').value;
  if (!desc || isNaN(amount) || amount <= 0 || !date) {
    alert('Please fill all fields with valid values.'); return;
  }
  expenses.unshift({ id: Date.now(), desc, amount, category, date });
  save(); closeModal(); refresh();
  document.getElementById('expDesc').value = '';
  document.getElementById('expAmount').value = '';
}

function deleteExpense(id) {
  expenses = expenses.filter(e => e.id !== id);
  save(); refresh();
}

function setBudget() {
  budget = parseFloat(document.getElementById('budgetInput').value) || 0;
  save(); refresh();
}

// ===== REFRESH =====
function refresh() {
  updateStats();
  updateProgress();
  drawChart();
  renderTable();
}

function updateStats() {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = budget - total;
  document.getElementById('statBudget').textContent = `₹${fmt(budget)}`;
  document.getElementById('statSpent').textContent = `₹${fmt(total)}`;
  document.getElementById('statRemaining').textContent = `₹${fmt(remaining)}`;
  document.getElementById('statCount').textContent = expenses.length;
  document.getElementById('statRemaining').style.color =
    remaining < 0 ? '#ef4444' : '#22c55e';
}

function updateProgress() {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const pct = budget > 0 ? Math.min((total / budget) * 100, 100) : 0;
  const bar = document.getElementById('progressBar');
  bar.style.width = pct + '%';
  bar.style.background = pct > 90 ? '#ef4444' : pct > 70 ? '#eab308' : '#22c55e';
  document.getElementById('progressPct').textContent = `${pct.toFixed(1)}% used`;
  document.getElementById('progressNote').textContent =
    budget > 0 ? `₹${fmt(budget - total)} remaining` : 'Set a budget above';
}

// ===== CHART =====
function drawChart() {
  const canvas = document.getElementById('catChart');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, cx = W/2, cy = H/2, R = Math.min(W,H)/2 - 20;

  ctx.clearRect(0, 0, W, H);

  // Group by category
  const cats = {};
  expenses.forEach(e => { cats[e.category] = (cats[e.category] || 0) + e.amount; });
  const entries = Object.entries(cats);
  const total = entries.reduce((s,[,v]) => s + v, 0);

  if (total === 0) {
    ctx.fillStyle = '#7b82a0';
    ctx.font = '14px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data yet', cx, cy);
    document.getElementById('catLegend').innerHTML = '';
    return;
  }

  let startAngle = -Math.PI / 2;
  const allCats = Object.keys(CAT_EMOJI);
  entries.forEach(([cat, val], i) => {
    const slice = (val / total) * 2 * Math.PI;
    const colorIdx = allCats.indexOf(cat);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = CAT_COLORS[colorIdx % CAT_COLORS.length];
    ctx.fill();
    ctx.strokeStyle = '#1a1d27';
    ctx.lineWidth = 2;
    ctx.stroke();
    startAngle += slice;
  });

  // Center hole
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.55, 0, 2 * Math.PI);
  ctx.fillStyle = '#1a1d27';
  ctx.fill();

  // Legend
  document.getElementById('catLegend').innerHTML = entries.map(([cat, val], i) => {
    const colorIdx = allCats.indexOf(cat);
    const color = CAT_COLORS[colorIdx % CAT_COLORS.length];
    return `<div class="legend-item">
      <div class="legend-dot" style="background:${color}"></div>
      <span class="legend-label">${cat}</span>
      <span class="legend-value">₹${fmt(val)}</span>
    </div>`;
  }).join('');
}

// ===== TABLE =====
function renderTable() {
  const filter = document.getElementById('filterCat').value;
  const filtered = filter === 'All' ? expenses : expenses.filter(e => e.category === filter);
  const el = document.getElementById('expenseTable');
  if (filtered.length === 0) {
    el.innerHTML = '<div class="no-data">No transactions found.</div>';
    return;
  }
  el.innerHTML = filtered.map(e => `
    <div class="expense-row">
      <span class="expense-emoji">${CAT_EMOJI[e.category] || '📦'}</span>
      <div class="expense-info">
        <div class="expense-desc">${escHtml(e.desc)}</div>
        <div class="expense-meta">${e.category} · ${formatDate(e.date)}</div>
      </div>
      <span class="expense-amount">−₹${fmt(e.amount)}</span>
      <button class="expense-del" onclick="deleteExpense(${e.id})">✕</button>
    </div>
  `).join('');
}

// ===== UTILS =====
function fmt(n) { return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function formatDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
