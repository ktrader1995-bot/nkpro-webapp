window.pageInits = window.pageInits || {};

window.pageInits.zcz = async function () {
  await renderBatchLots();
};

// ── Single ────────────────────────────────────────────────────
const priceInput = document.getElementById('zcz-price');
const startInput = document.getElementById('zcz-start-price');
const discountEl = document.getElementById('zcz-discount');
const warnEl     = document.getElementById('zcz-antidump');

priceInput?.addEventListener('input', updateDiscount);
startInput?.addEventListener('input', updateDiscount);

function updateDiscount() {
  const start = parseFloat(startInput?.value) || 0;
  const price = parseFloat(priceInput?.value) || 0;
  if (!start || !price) { if (discountEl) discountEl.textContent = '—'; return; }
  const pct = (1 - price / start) * 100;
  if (discountEl) discountEl.textContent = pct.toFixed(1) + '%';
  warnEl?.classList.toggle('hidden', pct <= 10);
}

document.getElementById('zcz-submit-btn')?.addEventListener('click', () => {
  const price = parseFloat(priceInput?.value);
  const lotId = document.getElementById('zcz-lot-id')?.value;
  if (!lotId) { NK.toast('Укажите номер лота', 'error'); return; }
  if (!price || price <= 0) { NK.toast('Укажите цену', 'error'); return; }
  NK.confirm('Подписать ЭЦП и подать заявку?', () => {
    API.send('submit_zcz', { lot_id: lotId, price });
  });
});

// ── Batch ─────────────────────────────────────────────────────
let _batchLots = [];

async function renderBatchLots() {
  const container = document.getElementById('zcz-batch-list');
  if (!container) return;
  container.innerHTML = '<div class="text-muted" style="padding:16px">Загрузка...</div>';

  const lots = await API.zczLots();
  _batchLots = Array.isArray(lots) ? lots : [];

  container.innerHTML = '';

  if (!_batchLots.length) {
    container.innerHTML = '<div class="text-muted" style="text-align:center;padding:24px">Список лотов пуст.<br><small>Добавьте лоты через бот (⚡ ЗЦП).</small></div>';
    return;
  }

  _batchLots.forEach(lot => {
    const item = document.createElement('div');
    item.className = 'card';
    item.style.marginBottom = '10px';
    const suggested = lot.our_price || Math.round((lot.start_price || 0) * 0.97);
    item.innerHTML = `
      <div style="display:flex;gap:10px;align-items:flex-start">
        <input type="checkbox" id="cb-${lot.lot_id}" data-lot="${lot.lot_id}" style="margin-top:4px;accent-color:var(--accent)">
        <div style="flex:1;min-width:0">
          <div class="flex justify-between items-center">
            <span class="tender-id mono" style="font-size:10px">${lot.lot_id}</span>
            ${lot.auto_submitted ? '<span class="badge badge-success">Подан</span>' : lot.our_price ? '<span class="badge badge-accent">Цена ✓</span>' : '<span class="badge badge-muted">Нет цены</span>'}
          </div>
          <div class="tender-name" style="font-size:12.5px;margin:4px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${lot.name_ru || 'Без названия'}</div>
          <div class="tender-meta mb-2">
            <span class="tender-price" style="font-size:13px">${NK.fmt.money(lot.start_price)}</span>
            <span class="text-muted">до ${NK.fmt.date(lot.deadline)}</span>
          </div>
          <div class="input-addon">
            <input class="input" type="number" id="batch-price-${lot.lot_id}"
              placeholder="Ваша цена" value="${suggested || ''}"
              style="font-size:13px;padding:8px 44px 8px 12px"
              onchange="saveLotPrice('${lot.lot_id}', this.value)">
            <span class="input-addon-text">₸</span>
          </div>
        </div>
      </div>
    `;
    container.appendChild(item);
  });
}

async function saveLotPrice(lotId, price) {
  await API.setZczPrice(lotId, parseFloat(price), 'ЗЦП');
}

document.getElementById('zcz-select-80')?.addEventListener('click', () => {
  _batchLots.forEach(l => {
    const cb = document.getElementById('cb-' + l.lot_id);
    if (cb && !l.auto_submitted) cb.checked = true;
  });
  NK.toast('Выбраны все доступные лоты', 'info');
});

document.getElementById('zcz-batch-submit')?.addEventListener('click', () => {
  const selected = _batchLots.filter(l => document.getElementById('cb-' + l.lot_id)?.checked);
  if (!selected.length) { NK.toast('Выберите хотя бы один лот', 'error'); return; }

  NK.confirm(`Подать заявки по ${selected.length} лотам?`, () => {
    const payload = selected.map(l => ({
      lot_id: l.lot_id,
      price:  parseFloat(document.getElementById('batch-price-' + l.lot_id)?.value) || l.our_price || l.start_price,
    }));
    API.send('batch_submit_zcz', { lots: payload });
    showProgress(selected);
  });
});

function showProgress(selectedLots) {
  const wrap = document.getElementById('zcz-progress-wrap');
  const bar  = document.getElementById('zcz-progress-bar');
  const list = document.getElementById('zcz-progress-list');
  if (!wrap) return;

  wrap.classList.remove('hidden');
  list.innerHTML = '';
  let done = 0;

  selectedLots.forEach((lot, i) => {
    const row = document.createElement('div');
    row.className = 'flex justify-between items-center';
    row.style.cssText = 'padding:6px 0;border-bottom:1px solid var(--border);font-size:12px';
    row.innerHTML = `<span class="text-muted mono" style="font-size:10px">${lot.lot_id}</span><span class="badge badge-muted">ожидание</span>`;
    list.appendChild(row);

    setTimeout(() => {
      done++;
      if (bar) bar.style.width = (done / selectedLots.length * 100) + '%';
      const badge = row.querySelector('.badge');
      if (badge) {
        badge.className = 'badge badge-success';
        badge.textContent = i === 0 ? '✓ 1-й!' : '✓ отправлено';
      }
      if (done === selectedLots.length) NK.toast('Заявки отправлены в бот!', 'success');
    }, 800 * (i + 1));
  });
}
