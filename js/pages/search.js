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

  if (!lots) {
    resultsEl.innerHTML = `<div class="alert alert-danger">Ошибка соединения с сервером.<br><small>Проверьте что webapp_server.py запущен</small></div>`;
    return;
  }

  if (!Array.isArray(lots) || lots.length === 0) {
    resultsEl.innerHTML = `
      <div style="text-align:center;padding:32px 0">
        <div style="font-size:32px;margin-bottom:12px">🔍</div>
        <div class="section-title">Ничего не найдено</div>
        <div class="text-muted text-sm mt-2">Номер: <strong>${val}</strong></div>
      </div>`;
    return;
  }

  renderResults(lots);
}

function renderResults(lots) {
  resultsEl.innerHTML = '';

  lots.forEach((lot, idx) => {
    const card = document.createElement('div');
    card.className = 'card section';
    card.id = `lot-card-${idx}`;

    const suggested = Math.round((lot.start_price || 0) * 0.97);

    card.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <span class="tender-id mono">${lot.lot_id}</span>
        <span class="badge badge-accent">${lot.status || '—'}</span>
      </div>
      <div class="tender-name" style="font-size:14px;margin-bottom:10px">${lot.name_ru || 'Без названия'}</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <div class="stat-card" style="padding:10px">
          <div class="stat-label">Нач. цена</div>
          <div style="font-size:15px;font-weight:700;color:var(--accent)">${NK.fmt.money(lot.start_price)}</div>
        </div>
        <div class="stat-card" style="padding:10px">
          <div class="stat-label">Дедлайн</div>
          <div style="font-size:14px;font-weight:700">${NK.fmt.date(lot.deadline) || '—'}</div>
        </div>
      </div>

      ${lot.customer_name ? `<div class="text-muted text-sm mb-3">🏢 ${lot.customer_name}</div>` : ''}

      <div class="divider"></div>

      <!-- Кнопки выбора типа -->
      <div id="action-btns-${idx}" class="flex gap-2" style="flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" onclick="showSubmitForm(${idx}, 'ЗЦП', ${lot.start_price || 0}, ${suggested})">
          ⚡ Подать ЗЦП
        </button>
        <button class="btn btn-secondary btn-sm" onclick="showSubmitForm(${idx}, 'Аукцион', ${lot.start_price || 0}, ${Math.round((lot.start_price||0)*0.85)})">
          🔨 Аукцион
        </button>
        <button class="btn btn-secondary btn-sm" onclick="showSubmitForm(${idx}, 'Конкурс', ${lot.start_price || 0}, ${suggested})">
          📄 Конкурс
        </button>
        <button class="btn btn-ghost btn-sm" onclick="genTechProposal(${idx})" id="ai-btn-${idx}">
          ✨ ИИ-анализ
        </button>
        ${lot.url ? `<a class="btn btn-ghost btn-sm" href="${lot.url}" target="_blank">🔗</a>` : ''}
      </div>

      <!-- Форма подачи (скрыта) -->
      <div id="submit-form-${idx}" class="hidden" style="margin-top:12px">
        <div class="divider"></div>
        <div id="submit-form-inner-${idx}"></div>
      </div>
    `;

    // Сохраняем lot в data атрибуте
    card.dataset.lot = JSON.stringify(lot);
    resultsEl.appendChild(card);
  });
}

function showSubmitForm(idx, type, startPrice, suggested) {
  const formEl    = document.getElementById(`submit-form-${idx}`);
  const innerEl   = document.getElementById(`submit-form-inner-${idx}`);
  const card      = document.getElementById(`lot-card-${idx}`);
  const lot       = JSON.parse(card.dataset.lot);

  // Если уже открыта та же форма — закрыть
  if (!formEl.classList.contains('hidden') && formEl.dataset.type === type) {
    formEl.classList.add('hidden');
    return;
  }

  formEl.dataset.type = type;
  formEl.classList.remove('hidden');

  if (type === 'ЗЦП') {
    innerEl.innerHTML = `
      <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:10px">⚡ ПОДАЧА ЗЦП</div>
      <div class="input-group">
        <label class="input-label">Ваша цена</label>
        <div class="input-addon">
          <input class="input" type="number" id="price-input-${idx}"
            value="${suggested}" placeholder="0"
            oninput="calcDiscount(${idx}, ${startPrice})">
          <span class="input-addon-text">₸</span>
        </div>
        <div class="tooltip-text" style="margin-top:5px">
          Снижение: <strong id="discount-${idx}">3.0%</strong>
          &nbsp;·&nbsp; от нач. цены ${NK.fmt.money(startPrice)}
        </div>
      </div>
      <div id="antidump-${idx}" class="alert alert-warning hidden">
        ⚠️ Снижение более 10% — потребуется обоснование антидемпинга
      </div>
      <div class="flex gap-2 mt-2">
        <button class="btn btn-primary" style="flex:1" onclick="submitLot(${idx}, 'ЗЦП', ${startPrice})">
          🔐 Подать сейчас
        </button>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('submit-form-${idx}').classList.add('hidden')">✕</button>
      </div>
      <button class="btn btn-secondary btn-full mt-2" onclick="saveForAuto(${idx}, 'ЗЦП', ${startPrice})">
        ⏳ Сохранить → авто-подача при открытии
      </button>
    `;
    calcDiscount(idx, startPrice);

  } else if (type === 'Конкурс') {
    innerEl.innerHTML = `
      <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:10px">📄 ПОДАЧА КОНКУРС</div>

      <div class="input-group">
        <label class="input-label">Ваша цена</label>
        <div class="input-addon">
          <input class="input" type="number" id="price-input-${idx}"
            value="${suggested}" placeholder="0"
            oninput="calcDiscount(${idx}, ${startPrice})">
          <span class="input-addon-text">₸</span>
        </div>
        <div class="tooltip-text" style="margin-top:5px">
          Снижение: <strong id="discount-${idx}">3.0%</strong>
          &nbsp;·&nbsp; от нач. цены ${NK.fmt.money(startPrice)}
        </div>
      </div>

      <div id="antidump-${idx}" class="alert alert-warning hidden">
        ⚠️ Снижение более 10% — потребуется обоснование антидемпинга
      </div>

      <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin:10px 0 6px">ДОКУМЕНТЫ КОМПАНИИ</div>
      <div id="docs-list-${idx}">
        <div class="text-muted text-sm">Загрузка...</div>
      </div>

      <div class="flex gap-2 mt-3">
        <button class="btn btn-primary" style="flex:1" onclick="submitLot(${idx}, 'Конкурс', ${startPrice})">
          🔐 Подать сейчас
        </button>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('submit-form-${idx}').classList.add('hidden')">✕</button>
      </div>
      <button class="btn btn-secondary btn-full mt-2" onclick="saveForAuto(${idx}, 'Конкурс', ${startPrice})">
        ⏳ Сохранить → авто-подача при открытии
      </button>
    `;
    calcDiscount(idx, startPrice);
    loadDocsChecklist(idx);

  } else if (type === 'Аукцион') {
    const stopPrice = Math.round(startPrice * 0.85);
    innerEl.innerHTML = `
      <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:10px">
        🔨 НАСТРОЙКА АВТО-ТОРГОВ
      </div>
      <div class="input-group">
        <label class="input-label">Стоп-цена (минимум)</label>
        <div class="input-addon">
          <input class="input" type="number" id="stop-input-${idx}" value="${stopPrice}">
          <span class="input-addon-text">₸</span>
        </div>
        <div class="tooltip-text">Снижение от нач. цены: ~15%</div>
      </div>
      <div class="input-group">
        <label class="input-label">Шаг снижения</label>
        <div class="input-addon">
          <input class="input" type="number" id="step-input-${idx}" value="50000">
          <span class="input-addon-text">₸</span>
        </div>
      </div>
      <div class="input-group">
        <label class="input-label">Стратегия</label>
        <select class="input" id="strategy-input-${idx}">
          <option>Агрессивная (сразу)</option>
          <option>Выжидательная (последние 30 сек)</option>
          <option>Ручная</option>
        </select>
      </div>
      <div class="alert alert-info" style="margin-top:4px">
        📋 Этап 1: бот подаст заявку при открытии приёма<br>
        🔨 Этап 2: бот начнёт торги когда аукцион стартует
      </div>
      <div class="flex gap-2 mt-2">
        <button class="btn btn-primary" style="flex:1"
          onclick="submitAuction(${idx}, ${startPrice})">
          ⏳ Сохранить → авто-торги
        </button>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('submit-form-${idx}').classList.add('hidden')">
          ✕
        </button>
      </div>
    `;
  }
}

async function loadDocsChecklist(idx) {
  const el = document.getElementById(`docs-list-${idx}`);
  if (!el) return;

  const docs = await API.docs();
  if (!docs || !docs.length) {
    el.innerHTML = `
      <div class="alert alert-warning">
        ⚠️ Документы не загружены.<br>
        <small>Добавьте документы компании через бот (⚙️ Настройки → Документы)</small>
      </div>`;
    return;
  }

  // Обязательные документы для конкурса
  const required = ['Устав', 'Регистрация', 'Справка', 'Техпредложение', 'Ценовое'];
  const uploaded = docs.map(d => d.name);

  el.innerHTML = `<ul class="checklist" style="margin-bottom:8px">` +
    docs.map(d => `
      <li class="checklist-item">
        <div class="check-icon done">✓</div>
        <span style="font-size:12px">${d.name}</span>
        <span class="badge badge-success" style="margin-left:auto;font-size:10px">Готово</span>
      </li>
    `).join('') +
  `</ul>
  <div class="tooltip-text">Загружено ${docs.length} документ(ов). Добавить ещё — через бот.</div>`;
}

function calcDiscount(idx, startPrice) {
  const price     = parseFloat(document.getElementById(`price-input-${idx}`)?.value) || 0;
  const discountEl = document.getElementById(`discount-${idx}`);
  const warnEl     = document.getElementById(`antidump-${idx}`);
  if (!startPrice || !price) return;
  const pct = (1 - price / startPrice) * 100;
  if (discountEl) discountEl.textContent = pct.toFixed(1) + '%';
  warnEl?.classList.toggle('hidden', pct <= 10);
}

async function saveForAuto(idx, type, startPrice) {
  const card  = document.getElementById(`lot-card-${idx}`);
  const lot   = JSON.parse(card.dataset.lot);
  const price = parseFloat(document.getElementById(`price-input-${idx}`)?.value);

  if (!price || price <= 0) { NK.toast('Укажите цену', 'error'); return; }

  // Сохранить лот + цену в БД
  const addRes = await API.addLot({
    lot_id:        String(lot.lot_id),
    purchase_type: type,
    name_ru:       lot.name_ru || '',
    start_price:   lot.start_price || 0,
    deadline:      lot.deadline || '',
    announce_no:   lot.announce_no || '',
    url:           lot.url || '',
  });

  // Сохранить цену
  await API.setZczPrice(String(lot.lot_id), price, type);

  if (addRes?.ok) {
    NK.toast(`Сохранено! Бот подаст при открытии приёма заявок`, 'success');
    // Поменять кнопку на статус
    const btn = card.querySelector(`button[onclick*="saveForAuto"]`);
    if (btn) {
      btn.className = 'btn btn-secondary btn-full mt-2';
      btn.innerHTML = `✅ Сохранено — ${NK.fmt.money(price)} · авто-подача включена`;
      btn.disabled = true;
    }
  } else {
    // Fallback через бот
    API.send('save_for_auto', { lot_id: String(lot.lot_id), price, purchase_type: type });
    NK.toast('Отправлено в бот для сохранения', 'info');
  }
}

function submitLot(idx, type, startPrice) {
  const card    = document.getElementById(`lot-card-${idx}`);
  const lot     = JSON.parse(card.dataset.lot);
  const price   = parseFloat(document.getElementById(`price-input-${idx}`)?.value);

  if (!price || price <= 0) { NK.toast('Укажите цену', 'error'); return; }

  NK.confirm(`Подписать ЭЦП и подать заявку?\n${NK.fmt.money(price)}`, async () => {
    // Добавить в список и сразу подать
    await API.addLot({
      lot_id: String(lot.lot_id),
      purchase_type: type,
      name_ru: lot.name_ru || '',
      start_price: lot.start_price || 0,
      deadline: lot.deadline || '',
      announce_no: lot.announce_no || '',
      url: lot.url || '',
    });

    const action = type === 'ЗЦП' ? 'submit_zcz' : 'submit_konkurs';
    API.send(action, { lot_id: String(lot.lot_id), price });
  });
}

function submitAuction(idx, startPrice) {
  const card     = document.getElementById(`lot-card-${idx}`);
  const lot      = JSON.parse(card.dataset.lot);
  const stopPrice = parseFloat(document.getElementById(`stop-input-${idx}`)?.value);
  const step      = parseFloat(document.getElementById(`step-input-${idx}`)?.value) || 50000;
  const strategy  = document.getElementById(`strategy-input-${idx}`)?.value || '';

  NK.confirm(`Запустить авто-торги?\nСтоп: ${NK.fmt.money(stopPrice)}`, async () => {
    await API.addLot({
      lot_id: String(lot.lot_id),
      purchase_type: 'Аукцион',
      name_ru: lot.name_ru || '',
      start_price: lot.start_price || 0,
      deadline: lot.deadline || '',
      announce_no: lot.announce_no || '',
      url: lot.url || '',
    });

    API.send('auction_setup', {
      lot_id: String(lot.lot_id),
      stop_price: stopPrice,
      step,
      strategy,
    });
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

async function genTechProposal(idx) {
  const card = document.getElementById(`lot-card-${idx}`);
  const lot  = JSON.parse(card.dataset.lot);
  const btn  = document.getElementById(`ai-btn-${idx}`);

  btn.disabled = true;
  btn.textContent = '⏳ Генерирую...';

  // Сначала сохранить лот в БД чтобы бот мог его найти
  await API.addLot({
    lot_id:        String(lot.lot_id),
    purchase_type: 'ЗЦП',
    name_ru:       lot.name_ru || '',
    start_price:   lot.start_price || 0,
    deadline:      lot.deadline || '',
    announce_no:   lot.announce_no || '',
    url:           lot.url || '',
  });

  // Отправить запрос боту — он пришлёт .docx в Telegram
  API.send('gen_tech_proposal', { lot_id: String(lot.lot_id) });

  NK.toast('ИИ анализирует тендер — документ придёт в Telegram', 'success');
  btn.textContent = '✅ Отправлено в бот';
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
