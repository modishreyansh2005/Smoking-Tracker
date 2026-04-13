let logs = JSON.parse(localStorage.getItem('smk_logs') || '[]');
let viewMonth = new Date().getMonth();
let viewYear = new Date().getFullYear();

function save() {
  localStorage.setItem('smk_logs', JSON.stringify(logs));
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function addCigarette() {
  logs.push({ ts: Date.now(), date: todayStr() });
  save();
  renderToday();
  if (document.getElementById('panel-monthly').classList.contains('active')) {
    renderMonthly();
  }
}

function removeCigarette(ts) {
  logs = logs.filter(l => l.ts !== ts);
  save();
  renderToday();
  if (document.getElementById('panel-monthly').classList.contains('active')) {
    renderMonthly();
  }
}

function switchTab(tab) {
  const tabs = document.querySelectorAll('.tab');
  tabs[0].classList.toggle('active', tab === 'today');
  tabs[1].classList.toggle('active', tab === 'monthly');
  document.getElementById('panel-today').classList.toggle('active', tab === 'today');
  document.getElementById('panel-monthly').classList.toggle('active', tab === 'monthly');
  document.getElementById('fab-wrap').style.display = tab === 'today' ? '' : 'none';
  if (tab === 'monthly') renderMonthly();
}

function changeMonth(delta) {
  viewMonth += delta;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderMonthly();
}

function renderToday() {
  const now = new Date();
  document.getElementById('date-label').textContent = now.toLocaleDateString('en-IN', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  const today = logs.filter(l => l.date === todayStr());
  const weekAgo = Date.now() - 7 * 86400000;
  const week = logs.filter(l => l.ts >= weekAgo);

  document.getElementById('today-count').textContent = today.length;
  document.getElementById('week-count').textContent = week.length;
  document.getElementById('total-count').textContent = logs.length;

  const pct = Math.min(100, Math.round(today.length / 10 * 100));
  document.getElementById('goal-bar').style.width = pct + '%';
  document.getElementById('goal-pct').textContent = pct + '%';

  const list = document.getElementById('log-list');
  list.querySelectorAll('.log-item').forEach(e => e.remove());
  document.getElementById('empty-msg').style.display = today.length ? 'none' : 'block';

  [...today].reverse().forEach((l, i) => {
    const div = document.createElement('div');
    div.className = 'log-item';
    const t = new Date(l.ts);
    const time = t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    div.innerHTML = `
      <div class="log-left">
        <div class="log-dot"></div>
        <div class="log-time">${time}</div>
      </div>
      <div class="log-right">
        <div class="log-num">#${today.length - i}</div>
        <button class="log-delete" onclick="removeCigarette(${l.ts})" title="Remove">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    `;
    list.appendChild(div);
  });
}

function renderMonthly() {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('month-title').textContent = months[viewMonth] + ' ' + viewYear;

  const dayCounts = {};
  logs.forEach(l => {
    const d = new Date(l.ts);
    if (d.getMonth() === viewMonth && d.getFullYear() === viewYear) {
      dayCounts[l.date] = (dayCounts[l.date] || 0) + 1;
    }
  });

  const vals = Object.values(dayCounts);
  const total = vals.reduce((a, b) => a + b, 0);
  const activeDays = vals.length;
  const peak = vals.length ? Math.max(...vals) : 0;
  const avg = activeDays ? (total / activeDays).toFixed(1) : 0;

  document.getElementById('m-total').textContent = total;
  document.getElementById('m-avg').textContent = avg;
  document.getElementById('m-peak').textContent = peak;

  // Heatmap calendar
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';
  const maxVal = peak || 1;
  const todayS = todayStr();

  for (let i = 0; i < firstDay; i++) {
    const e = document.createElement('div');
    e.className = 'cal-cell empty';
    grid.appendChild(e);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = viewYear + '-' + String(viewMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const count = dayCounts[ds] || 0;
    const heat = count === 0 ? 0
      : count <= maxVal * 0.25 ? 1
      : count <= maxVal * 0.5 ? 2
      : count <= maxVal * 0.75 ? 3
      : 4;
    const cell = document.createElement('div');
    cell.className = 'cal-cell heat-' + heat + (ds === todayS ? ' today' : '');
    cell.innerHTML = `<span class="day-num">${d}</span>${count > 0 ? `<span class="day-count">${count}</span>` : ''}`;
    grid.appendChild(cell);
  }

  // Week-by-week bars
  const weekBars = document.getElementById('week-bars');
  weekBars.innerHTML = '';
  const weeks = [];
  let weekNum = 1;
  let weekTotal = 0;
  let col = new Date(viewYear, viewMonth, 1).getDay();

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = viewYear + '-' + String(viewMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    weekTotal += (dayCounts[ds] || 0);
    col++;
    if (col % 7 === 0 || d === daysInMonth) {
      weeks.push({ label: 'Wk ' + weekNum, val: weekTotal });
      weekNum++;
      weekTotal = 0;
    }
  }

  const maxWeek = Math.max(...weeks.map(w => w.val), 1);
  weeks.forEach(w => {
    const pct = Math.round(w.val / maxWeek * 100);
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <span class="bar-row-label">${w.label}</span>
      <div class="bar-row-bg"><div class="bar-row-fill" style="width:${pct}%"></div></div>
      <span class="bar-row-val">${w.val}</span>
    `;
    weekBars.appendChild(row);
  });
}

// Init
renderToday();