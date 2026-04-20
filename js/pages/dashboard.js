window.pageInits = window.pageInits || {};

window.pageInits.dashboard = function () {
  const data = API.getMock('dashboard');
  if (!data) return;

  // Stats
  document.getElementById('dash-found').textContent  = data.stats.found;
  document.getElementById('dash-active').textContent = data.stats.active;
  document.getElementById('dash-wins').textContent   = data.stats.wins;
  document.getElementById('dash-sum').textContent    = NK.fmt.money(data.stats.win_sum);

  // AI tip
  document.getElementById('dash-ai-tip').textContent = data.ai_tip;

  // Live auction mini
  const liveBlock = document.getElementById('dash-live');
  if (data.live_auction) {
    liveBlock.classList.remove('hidden');
  } else {
    liveBlock.classList.add('hidden');
  }

  // Tender list
  const list = document.getElementById('dash-tender-list');
  list.innerHTML = '';
  data.recent.forEach(t => {
    const el = document.createElement('div');
    el.className = 'tender-item';
    el.innerHTML = `
      <div class="tender-item-header">
        <span class="tender-id mono">${t.id}</span>
        <span class="badge ${matchBadge(t.match)}">${t.match}%</span>
      </div>
      <div class="tender-name">${t.name}</div>
      <div class="tender-meta">
        <span class="badge badge-muted">${t.type}</span>
        <span class="tender-price">${NK.fmt.money(t.price)}</span>
        <span class="text-muted">до ${NK.fmt.date(t.deadline)}</span>
      </div>
      <div class="tender-actions">
        <button class="btn btn-secondary btn-sm" onclick="NK.toast('ИИ анализирует...', 'info')">Анализ</button>
        <button class="btn btn-primary btn-sm" onclick="navigateTo('zcz')">Подать</button>
      </div>
    `;
    list.appendChild(el);
  });
};

function matchBadge(pct) {
  if (pct >= 85) return 'badge-success';
  if (pct >= 70) return 'badge-accent';
  return 'badge-muted';
}
