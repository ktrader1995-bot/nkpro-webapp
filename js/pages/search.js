window.pageInits = window.pageInits || {};

window.pageInits.search = function () {
  renderResults(API.getMock('search').results);
};

function renderResults(results) {
  const list = document.getElementById('search-results');
  list.innerHTML = '';

  if (!results.length) {
    list.innerHTML = '<div class="text-muted" style="text-align:center;padding:32px 0">Ничего не найдено</div>';
    return;
  }

  results.forEach(t => {
    const el = document.createElement('div');
    el.className = 'tender-item';
    el.innerHTML = `
      <div class="tender-item-header">
        <span class="tender-id mono">${t.id}</span>
        <span class="badge ${matchBadge2(t.match)}">${t.match}%</span>
      </div>
      <div class="tender-name">${t.name}</div>
      <div class="tender-meta">
        <span class="badge badge-muted">${t.type}</span>
        <span class="tender-price">${NK.fmt.money(t.price)}</span>
        <span class="text-muted">до ${NK.fmt.date(t.deadline)}</span>
      </div>
      <div class="tender-actions">
        <button class="btn btn-secondary btn-sm" onclick="NK.toast('ИИ анализирует...', 'info')">Анализ</button>
        <button class="btn btn-primary btn-sm">Подать</button>
      </div>
    `;
    list.appendChild(el);
  });
}

function matchBadge2(pct) {
  if (pct >= 85) return 'badge-success';
  if (pct >= 70) return 'badge-accent';
  return 'badge-muted';
}

// Search handler
document.getElementById('search-input')?.addEventListener('input', function () {
  const q = this.value.toLowerCase();
  const all = API.getMock('search').results;
  renderResults(all.filter(t => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)));
});

// Type filter
document.querySelectorAll('.search-filter-btn')?.forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.search-filter-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    const type = this.dataset.type;
    const all = API.getMock('search').results;
    renderResults(type === 'all' ? all : all.filter(t => t.type === type));
  });
});
