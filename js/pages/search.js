window.pageInits = window.pageInits || {};

window.pageInits.search = async function () {
  await loadResults();
};

async function loadResults(q = '', type = '') {
  const list = document.getElementById('search-results');
  list.innerHTML = '<div class="text-muted" style="text-align:center;padding:24px">Загрузка...</div>';
  const data = await API.tenders(q, type);
  renderResults(Array.isArray(data) ? data : []);
}

function renderResults(tenders) {
  const list = document.getElementById('search-results');
  list.innerHTML = '';

  if (!tenders.length) {
    list.innerHTML = '<div class="text-muted" style="text-align:center;padding:32px 0">Ничего не найдено</div>';
    return;
  }

  const typeMap = { 'Запрос ценовых предложений': 'ЗЦП', 'Аукцион': 'Аукцион', 'Конкурс': 'Конкурс' };

  tenders.forEach(t => {
    const typeLabel = typeMap[t.purchase_type] || t.purchase_type || '—';
    const el = document.createElement('div');
    el.className = 'tender-item';
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
        <button class="btn btn-secondary btn-sm" onclick="NK.toast('Откройте в боте для анализа', 'info')">Анализ ИИ</button>
        <button class="btn btn-primary btn-sm" onclick="openZczWithLot('${t.lot_id}', ${t.start_price || 0})">Подать</button>
      </div>
    `;
    list.appendChild(el);
  });
}

// Search input
let _searchTimer = null;
document.getElementById('search-input')?.addEventListener('input', function () {
  clearTimeout(_searchTimer);
  const q = this.value;
  const activeType = document.querySelector('.search-filter-btn.active')?.dataset.type || '';
  _searchTimer = setTimeout(() => loadResults(q, activeType === 'all' ? '' : activeType), 350);
});

// Type filters
document.querySelectorAll('.search-filter-btn')?.forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.search-filter-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    const q = document.getElementById('search-input')?.value || '';
    const type = this.dataset.type === 'all' ? '' : this.dataset.type;
    loadResults(q, type);
  });
});
