window.pageInits = window.pageInits || {};

window.pageInits.zcz = function () {
  renderBatchLots();
};

// ── Single submit ────────────────────────────────────────────
const priceInput = document.getElementById('zcz-price');
const startInput = document.getElementById('zcz-start-price');
const discountEl = document.getElementById('zcz-discount');
const warnEl     = document.getElementById('zcz-antidump');

priceInput?.addEventListener('input', () => {
  const start = parseFloat(startInput?.value?.replace(/\s/g,'')) || 0;
  const price = parseFloat(priceInput.value?.replace(/\s/g,'')) || 0;
  if (!start || !price) { discountEl.textContent = '—'; return; }
  const pct = (1 - price / start) * 100;
  discountEl.textContent = pct.toFixed(1) + '%';
  if (warnEl) warnEl.classList.toggle('hidden', pct <= 10);
});

document.getElementById('zcz-submit-btn')?.addEventListener('click', () => {
  const price = parseFloat(priceInput?.value?.replace(/\s/g,''));
  const lotId = document.getElementById('zcz-lot-id')?.value;
  if (!price || price <= 0) { NK.toast('Укажите цену', 'error'); return; }
  NK.confirm('Подписать ЭЦП и подать заявку?', () => {
    NK.send('submit_zcz', { lot_id: lotId, price });
    NK.toast('Заявка отправлена!', 'success');
  });
});

// ── Batch ────────────────────────────────────────────────────
function renderBatchLots() {
  const lots = API.getMock('zcz_lots');
  const container = document.getElementById('zcz-batch-list');
  if (!container) return;
  container.innerHTML = '';

  lots.forEach(lot => {
    const item = document.createElement('div');
    item.className = 'card mb-2';
    item.style.marginBottom = '10px';
    item.innerHTML = `
      <div class="checkbox-row" style="padding:0;border:none">
        <input type="checkbox" id="cb-${lot.id}" data-lot="${lot.id}" data-start="${lot.price}">
        <div style="flex:1">
          <div class="flex justify-between items-center">
            <span class="tender-id mono">${lot.id}</span>
            <span class="badge badge-success">${lot.match}%</span>
          </div>
          <div class="tender-name" style="font-size:13px;margin:4px 0">${lot.name}</div>
          <div class="tender-meta">
            <span class="tender-price">${NK.fmt.money(lot.price)}</span>
          </div>
          <div class="input-addon mt-2">
            <input class="input" type="number" placeholder="Ваша цена" value="${lot.suggested}"
              id="batch-price-${lot.id}" style="font-size:13px;padding:8px 44px 8px 12px">
            <span class="input-addon-text">₸</span>
          </div>
        </div>
      </div>
    `;
    container.appendChild(item);
  });

  // "Select all >80%" button
  document.getElementById('zcz-select-80')?.addEventListener('click', () => {
    lots.filter(l => l.match >= 80).forEach(l => {
      const cb = document.getElementById('cb-' + l.id);
      if (cb) cb.checked = true;
    });
    NK.toast('Выбраны тендеры с совпадением ≥80%', 'info');
  });
}

// Batch submit
document.getElementById('zcz-batch-submit')?.addEventListener('click', () => {
  const lots = API.getMock('zcz_lots');
  const selected = lots.filter(l => document.getElementById('cb-' + l.id)?.checked);
  if (!selected.length) { NK.toast('Выберите хотя бы один тендер', 'error'); return; }

  NK.confirm(`Подать заявки по ${selected.length} тендерам?`, () => {
    const payload = selected.map(l => ({
      lot_id: l.id,
      price: parseFloat(document.getElementById('batch-price-' + l.id)?.value) || l.suggested
    }));
    NK.send('batch_submit_zcz', { lots: payload });
    showProgress(selected.length);
  });
});

function showProgress(count) {
  const wrap = document.getElementById('zcz-progress-wrap');
  const bar  = document.getElementById('zcz-progress-bar');
  const list = document.getElementById('zcz-progress-list');
  if (!wrap) return;

  wrap.classList.remove('hidden');
  list.innerHTML = '';
  let done = 0;

  const lots = API.getMock('zcz_lots');
  lots.slice(0, count).forEach((lot, i) => {
    const row = document.createElement('div');
    row.id = 'prog-' + lot.id;
    row.className = 'flex justify-between items-center';
    row.style.cssText = 'padding:6px 0;border-bottom:1px solid var(--border);font-size:12px';
    row.innerHTML = `<span class="text-muted mono">${lot.id}</span><span class="badge badge-muted">ожидание</span>`;
    list.appendChild(row);

    setTimeout(() => {
      done++;
      bar.style.width = (done / count * 100) + '%';
      const badge = row.querySelector('.badge');
      badge.className = 'badge badge-success';
      badge.textContent = i === 0 ? '✓ 1-й!' : '✓ отправлено';
      if (done === count) NK.toast('Все заявки поданы!', 'success');
    }, 1200 * (i + 1));
  });
}
