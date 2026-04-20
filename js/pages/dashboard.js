window.pageInits = window.pageInits || {};

let _winChart = null;
let _typeChart = null;

window.pageInits.dashboard = async function () {
  showDashboardSkeleton();
  const data = await API.safeGet(API.dashboard, 'dashboard');
  if (!data) return;

  renderStats(data.stats);
  renderCharts(data.monthly, data.by_type);
  renderTenderList(data.recent);
  document.getElementById('dash-ai-tip').textContent = data.ai_tip || '—';

  // Live auction indicator
  const liveBlock = document.getElementById('dash-live');
  liveBlock?.classList.toggle('hidden', !data.live_auction);
};

// ── Stats ────────────────────────────────────────────────────
function renderStats(stats) {
  document.getElementById('dash-found').textContent  = stats.found  ?? 0;
  document.getElementById('dash-active').textContent = stats.active ?? 0;
  document.getElementById('dash-wins').textContent   = stats.wins   ?? 0;
  document.getElementById('dash-sum').textContent    = NK.fmt.money(stats.win_sum);
  const convEl = document.getElementById('dash-conv');
  if (convEl) convEl.textContent = (stats.conv ?? 0).toFixed(1) + '%';
}

// ── Charts ───────────────────────────────────────────────────
function renderCharts(monthly, byType) {
  renderWinChart(monthly);
  renderTypeChart(byType);
}

function renderWinChart(monthly) {
  const canvas = document.getElementById('chart-wins');
  if (!canvas || !monthly?.length) {
    document.getElementById('chart-wins-wrap')?.classList.add('hidden');
    return;
  }

  if (_winChart) _winChart.destroy();

  const labels = monthly.map(m => {
    const [y, mo] = m.month.split('-');
    return new Date(y, mo - 1).toLocaleDateString('ru', { month: 'short' });
  });

  _winChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Заявок',
          data: monthly.map(m => m.total),
          backgroundColor: 'rgba(200,245,66,0.15)',
          borderColor: 'rgba(200,245,66,0.4)',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Побед',
          data: monthly.map(m => m.wins),
          backgroundColor: 'rgba(52,211,153,0.5)',
          borderColor: 'rgba(52,211,153,0.8)',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#7c8190', font: { family: 'Manrope', size: 11 }, boxWidth: 10 } },
      },
      scales: {
        x: { ticks: { color: '#7c8190', font: { size: 11 } }, grid: { color: '#22252e' } },
        y: { ticks: { color: '#7c8190', font: { size: 11 }, stepSize: 1 }, grid: { color: '#22252e' } },
      },
    },
  });
}

function renderTypeChart(byType) {
  const canvas = document.getElementById('chart-type');
  if (!canvas || !byType?.length) {
    document.getElementById('chart-type-wrap')?.classList.add('hidden');
    return;
  }

  if (_typeChart) _typeChart.destroy();

  _typeChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: byType.map(t => t.purchase_type || 'Прочее'),
      datasets: [{
        data: byType.map(t => t.cnt),
        backgroundColor: ['rgba(200,245,66,0.7)', 'rgba(52,211,153,0.7)', 'rgba(251,191,36,0.7)'],
        borderColor: '#141519',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#7c8190', font: { family: 'Manrope', size: 11 }, boxWidth: 10, padding: 12 },
        },
      },
    },
  });
}

// ── Tender list ──────────────────────────────────────────────
function renderTenderList(tenders) {
  const list = document.getElementById('dash-tender-list');
  if (!list) return;
  list.innerHTML = '';

  if (!tenders?.length) {
    list.innerHTML = '<div class="text-muted" style="text-align:center;padding:24px 0">Тендеры не найдены.<br><small>Запустите мониторинг в боте.</small></div>';
    return;
  }

  tenders.forEach(t => {
    const el = document.createElement('div');
    el.className = 'tender-item';
    const typeMap = { 'Запрос ценовых предложений': 'ЗЦП', 'Аукцион': 'Аукцион', 'Конкурс': 'Конкурс' };
    const typeLabel = typeMap[t.purchase_type] || t.purchase_type || '—';
    el.innerHTML = `
      <div class="tender-item-header">
        <span class="tender-id mono">${t.lot_id}</span>
        <span class="badge badge-muted">${typeLabel}</span>
      </div>
      <div class="tender-name">${t.name_ru || 'Без названия'}</div>
      <div class="tender-meta">
        <span class="tender-price">${NK.fmt.money(t.start_price)}</span>
        <span class="text-muted">до ${NK.fmt.date(t.deadline)}</span>
      </div>
      <div class="tender-actions">
        <button class="btn btn-secondary btn-sm" onclick="NK.toast('Откройте тендер в боте для анализа', 'info')">Анализ</button>
        <button class="btn btn-primary btn-sm" onclick="openZczWithLot('${t.lot_id}', ${t.start_price || 0})">Подать</button>
      </div>
    `;
    list.appendChild(el);
  });
}

function openZczWithLot(lotId, startPrice) {
  navigateTo('zcz');
  setTimeout(() => {
    const lotInput   = document.getElementById('zcz-lot-id');
    const startInput = document.getElementById('zcz-start-price');
    if (lotInput)   lotInput.value   = lotId;
    if (startInput) startInput.value = startPrice;
  }, 100);
}

// ── Skeleton ─────────────────────────────────────────────────
function showDashboardSkeleton() {
  ['dash-found','dash-active','dash-wins'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '...';
  });
  const sum = document.getElementById('dash-sum');
  if (sum) sum.textContent = '...';
}
