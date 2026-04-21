window.pageInits = window.pageInits || {};

window.pageInits.konkurs = async function () {
  await Promise.all([loadDocs(), loadLots()]);
};

async function loadDocs() {
  const el = document.getElementById('kon-docs-list');
  if (!el) return;
  const docs = await API.docs();
  if (!docs || !docs.length) {
    el.innerHTML = '<li class="checklist-item"><span class="text-muted">Документы не загружены</span></li>';
    return;
  }
  el.innerHTML = '';
  docs.forEach(d => {
    const li = document.createElement('li');
    li.className = 'checklist-item';
    li.innerHTML = `
      <div class="check-icon done">✓</div>
      <div style="flex:1">
        <div style="font-size:13px">${d.name}</div>
        <div class="text-muted text-xs">${d.category || ''}</div>
      </div>
      <span class="badge badge-success">Готово</span>
    `;
    el.appendChild(li);
  });
}

async function loadLots() {
  const el = document.getElementById('kon-lots-list');
  if (!el) return;

  const lots = await API.konkursLots();
  if (!lots || !lots.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div>Нет конкурсных лотов</div>
        <div class="text-muted text-xs mt-2">Найдите тендер через Поиск и добавьте его</div>
      </div>
    `;
    return;
  }

  el.innerHTML = '';
  lots.forEach(lot => renderKonLot(lot, el));
}

function renderKonLot(lot, container) {
  const card = document.createElement('div');
  card.className = 'card section';
  card.dataset.lotId = lot.lot_id;

  const startPrice = lot.start_price ? NK.fmt.money(lot.start_price) : '—';
  const ourPrice   = lot.our_price   ? NK.fmt.money(lot.our_price)   : '';
  const deadline   = lot.deadline    ? NK.fmt.date(lot.deadline)      : '—';
  const inputVal   = lot.our_price   ? Math.round(lot.our_price)      : '';

  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div class="tender-id mono">${lot.lot_id}</div>
      <button class="btn btn-ghost btn-sm" style="padding:2px 6px;color:var(--danger)"
        onclick="deleteKonLot('${lot.lot_id}', this)">✕</button>
    </div>
    <div class="tender-name" style="margin:6px 0 4px">${lot.name_ru || 'Без названия'}</div>
    <div class="tender-meta">
      <span class="tender-price">${startPrice}</span>
      <span class="text-muted">до ${deadline}</span>
    </div>

    <div style="margin-top:12px;display:flex;gap:8px;align-items:flex-end">
      <div class="input-group" style="flex:1;margin:0">
        <label class="input-label">Цена заявки (₸)</label>
        <input class="input kon-price-field" type="number" value="${inputVal}"
          placeholder="${lot.start_price ? Math.round(lot.start_price * 0.97) : ''}">
      </div>
    </div>

    <div id="kon-discount-${lot.lot_id}" class="tooltip-text" style="margin-top:4px"></div>

    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn btn-secondary kon-gen-btn" style="flex:1">
        ✨ Техпредложение
      </button>
      <button class="btn btn-primary kon-submit-btn" style="flex:1">
        🔐 Подать
      </button>
    </div>

    <div id="kon-auto-info-${lot.lot_id}" class="alert alert-info" style="display:none;margin-top:8px">
      ⏳ Авто-подача настроена
    </div>
  `;

  container.appendChild(card);

  const priceInput = card.querySelector('.kon-price-field');
  const discountEl = card.querySelector(`#kon-discount-${lot.lot_id}`);

  priceInput.addEventListener('input', () => {
    const price = parseFloat(priceInput.value);
    if (!lot.start_price || !price) { discountEl.textContent = ''; return; }
    const pct = ((lot.start_price - price) / lot.start_price * 100).toFixed(1);
    discountEl.textContent = `Снижение: ${pct}%` + (pct > 25 ? ' ⚠️ Слишком большое!' : '');
    discountEl.style.color = pct > 25 ? 'var(--danger)' : 'var(--text-secondary)';
  });

  card.querySelector('.kon-gen-btn').addEventListener('click', () => {
    NK.toast('ИИ генерирует техпредложение...', 'info');
    API.send('gen_tech_proposal', { lot_id: lot.lot_id });
  });

  card.querySelector('.kon-submit-btn').addEventListener('click', () => {
    const price = parseFloat(priceInput.value);
    if (!price) { NK.toast('Укажите цену', 'error'); return; }
    NK.confirm(`Подать конкурсную заявку по лоту ${lot.lot_id}?`, async () => {
      const res = await API.setZczPrice(lot.lot_id, price, 'Конкурс');
      if (res?.ok) {
        NK.toast('Цена сохранена. Бот подаст заявку автоматически.', 'success');
        card.querySelector(`#kon-auto-info-${lot.lot_id}`).style.display = 'block';
      } else {
        API.send('submit_konkurs', { lot_id: lot.lot_id, price });
        NK.toast('Отправлено в бот', 'success');
      }
    });
  });
}

async function deleteKonLot(lotId, btn) {
  NK.confirm(`Удалить лот ${lotId} из списка?`, async () => {
    const res = await API.deleteLot(lotId, 'Конкурс');
    if (res?.ok) {
      btn.closest('.card').remove();
      NK.toast('Лот удалён', 'success');
    } else {
      NK.toast('Ошибка удаления', 'error');
    }
  });
}
