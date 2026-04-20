window.pageInits = window.pageInits || {};

window.pageInits.search = function () {
  // focus on input when page opens
  setTimeout(() => document.getElementById('search-input')?.focus(), 100);
};

const searchBtn   = document.getElementById('search-btn');
const searchInput = document.getElementById('search-input');
const resultsEl   = document.getElementById('search-results');

async function doSearch() {
  const val = searchInput?.value?.trim();
  if (!val) { NK.toast('Введите номер объявления', 'error'); return; }

  setLoading(true);
  const lots = await API.searchByAnnounce(val);
  setLoading(false);

  if (!lots || lots.length === 0) {
    resultsEl.innerHTML = `
      <div style="text-align:center;padding:32px 0">
        <div style="font-size:32px;margin-bottom:12px">🔍</div>
        <div class="section-title">Ничего не найдено</div>
        <div class="text-muted text-sm mt-2">Проверьте номер объявления</div>
      </div>`;
    return;
  }

  renderResults(lots);
}

function renderResults(lots) {
  resultsEl.innerHTML = '';

  lots.forEach(lot => {
    const card = document.createElement('div');
    card.className = 'card section';

    const typeMap = {
      'ЗЦП': 'ЗЦП', 'Аукцион': 'Аукцион', 'Конкурс': 'Конкурс',
      'Открытый конкурс': 'Конкурс',
    };
    const typeLabel = typeMap[lot.purchase_type] || lot.purchase_type || '—';
    const typeKey   = typeLabel === 'ЗЦП' ? 'ЗЦП' : typeLabel === 'Аукцион' ? 'Аукцион' : 'Конкурс';

    card.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <span class="tender-id mono">${lot.lot_id}</span>
        <span class="badge badge-muted">${typeLabel}</span>
      </div>
      <div class="tender-name" style="font-size:14px;margin-bottom:10px">${lot.name_ru || 'Без названия'}</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        <div class="stat-card" style="padding:10px">
          <div class="stat-label">Начальная цена</div>
          <div style="font-size:15px;font-weight:700;color:var(--accent)">${NK.fmt.money(lot.start_price)}</div>
        </div>
        <div class="stat-card" style="padding:10px">
          <div class="stat-label">Дедлайн</div>
          <div style="font-size:15px;font-weight:700">${NK.fmt.date(lot.deadline) || '—'}</div>
        </div>
      </div>

      ${lot.customer_name ? `<div class="text-muted text-sm mb-3">🏢 ${lot.customer_name}</div>` : ''}
      ${lot.status ? `<div class="mb-3"><span class="badge badge-accent">${lot.status}</span></div>` : ''}

      <div class="divider"></div>

      <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px;font-weight:600">ДОБАВИТЬ В СПИСОК:</div>
      <div class="flex gap-2" style="flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" onclick="addLotTo(${JSON.stringify(lot).replace(/"/g,'&quot;')}, 'ЗЦП')">
          ⚡ ЗЦП
        </button>
        <button class="btn btn-secondary btn-sm" onclick="addLotTo(${JSON.stringify(lot).replace(/"/g,'&quot;')}, 'Аукцион')">
          🔨 Аукцион
        </button>
        <button class="btn btn-secondary btn-sm" onclick="addLotTo(${JSON.stringify(lot).replace(/"/g,'&quot;')}, 'Конкурс')">
          📄 Конкурс
        </button>
        ${lot.url ? `<a class="btn btn-ghost btn-sm" href="${lot.url}" target="_blank">🔗 Портал</a>` : ''}
      </div>
    `;
    resultsEl.appendChild(card);
  });
}

async function addLotTo(lot, purchaseType) {
  const body = {
    lot_id:        String(lot.lot_id),
    purchase_type: purchaseType,
    name_ru:       lot.name_ru || '',
    start_price:   lot.start_price || 0,
    deadline:      lot.deadline || '',
    announce_no:   lot.announce_no || '',
    url:           lot.url || '',
  };

  const res = await API.addLot(body);
  if (res?.ok) {
    NK.toast(`Добавлено в ${purchaseType}!`, 'success');
    // Подсветить кнопку
    event?.target?.classList.add('btn-primary');
  } else {
    // Fallback — отправить через бот
    API.send('add_lot', body);
    NK.toast(`Отправлено в бот → ${purchaseType}`, 'info');
  }
}

function setLoading(on) {
  if (on) {
    resultsEl.innerHTML = `
      <div style="text-align:center;padding:32px 0">
        <div class="text-muted">Ищу на goszakup.gov.kz...</div>
      </div>`;
    if (searchBtn) searchBtn.disabled = true;
  } else {
    if (searchBtn) searchBtn.disabled = false;
  }
}

// Events
searchBtn?.addEventListener('click', doSearch);
searchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
