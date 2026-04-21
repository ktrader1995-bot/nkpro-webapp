window.pageInits = window.pageInits || {};
window.pageCleanups = window.pageCleanups || {};

let _auctionLotId = '';
let _auctionTimer = null;

window.pageInits.auction = async function () {
  clearInterval(_auctionTimer);
  await loadAuction();
  _auctionTimer = setInterval(() => {
    // only refresh if still on auction page
    if (document.getElementById('page-auction')?.classList.contains('active')) {
      loadAuction();
    }
  }, 10000);
};

window.pageCleanups.auction = function () {
  clearInterval(_auctionTimer);
  _auctionTimer = null;
};

async function loadAuction() {
  const data = await API.auction(_auctionLotId || undefined);
  if (!data) return;
  _auctionLotId = data.lot?.id || _auctionLotId;
  renderAuction(data);
  updateLastRefreshed();
}

function renderAuction(data) {
  const live = !!data.is_live;

  // Show/hide banners
  document.getElementById('auc-no-live')?.classList.toggle('hidden', live);
  document.getElementById('auc-live-banner')?.classList.toggle('hidden', !live);
  document.getElementById('auc-lot-info')?.classList.toggle('hidden', !live);
  document.getElementById('auc-metrics')?.classList.toggle('hidden', !live);
  document.getElementById('auc-log-card')?.classList.toggle('hidden', !live);
  document.getElementById('auc-participants-card')?.classList.toggle('hidden', !live);

  if (!live) return;

  const lot = data.lot || {};
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  setText('auc-lot-name',    lot.name || '');
  setText('auc-lot-id',      lot.id   || '');
  setText('auc-best-price',  NK.fmt.money(data.current_best));
  setText('auc-start-price', NK.fmt.money(lot.start_price));

  const dropPct = lot.start_price && data.current_best
    ? ((1 - data.current_best / lot.start_price) * 100).toFixed(1)
    : '0.0';
  setText('auc-drop-pct', '−' + dropPct + '%');

  // Log
  const logEl = document.getElementById('auc-log');
  if (logEl) {
    logEl.innerHTML = '';
    (data.log || []).forEach(entry => {
      const row = document.createElement('div');
      row.className = 'log-entry ' + (entry.is_ours ? 'ours' : 'theirs');
      const time = (entry.ts || '').slice(11, 19);
      row.innerHTML = `
        <span class="mono" style="font-size:11px;opacity:0.6">${time}</span>
        <span>${entry.bidder || '—'}</span>
        <span class="font-bold">${NK.fmt.money(entry.price)}</span>
      `;
      logEl.appendChild(row);
    });
  }

  // Participants
  const tBody = document.getElementById('auc-participants-body');
  if (tBody) {
    tBody.innerHTML = '';
    (data.participants || []).forEach(p => {
      const tr = document.createElement('tr');
      if (p.is_ours) tr.style.color = 'var(--accent)';
      tr.innerHTML = `
        <td>${p.rank === 1 ? '🥇 1' : p.rank}</td>
        <td>${p.is_ours ? '<strong>' + (p.bidder || 'Вы') + '</strong>' : (p.bidder || '—')}</td>
        <td class="font-bold">${NK.fmt.money(p.price)}</td>
      `;
      tBody.appendChild(tr);
    });
  }

  // Defaults for stop/step inputs
  const stopInput = document.getElementById('auc-stop-input');
  if (stopInput && !stopInput.value && lot.start_price) {
    stopInput.value = Math.round(lot.start_price * 0.85);
    document.getElementById('auc-stop-price').textContent = NK.fmt.money(stopInput.value);
  }
  const stepInput = document.getElementById('auc-step-input');
  if (stepInput && !stepInput.value) stepInput.value = 50000;
}

function updateLastRefreshed() {
  const el = document.getElementById('auc-last-updated');
  if (el) el.textContent = 'Обновлено: ' + new Date().toLocaleTimeString('ru-RU');
}

// ── Кнопка: Подать ставку ─────────────────────────────────────
document.getElementById('auc-bid-btn')?.addEventListener('click', async () => {
  const data = await API.auction(_auctionLotId);
  if (!data?.is_live) { NK.toast('Аукцион не активен', 'error'); return; }
  const step = parseFloat(document.getElementById('auc-step-input')?.value) || 50000;
  const stop = parseFloat(document.getElementById('auc-stop-input')?.value) || 0;
  const bid  = (data.current_best || 0) - step;
  if (bid < stop) { NK.toast(`Ставка ${NK.fmt.money(bid)} ниже стоп-цены!`, 'error'); return; }
  NK.confirm(`Подать ставку ${NK.fmt.money(bid)}?`, () => {
    API.send('auction_bid', { lot_id: _auctionLotId, price: bid });
    NK.toast('Ставка отправлена в бот', 'success');
  });
});

// ── Кнопка: Стоп ─────────────────────────────────────────────
document.getElementById('auc-stop-btn')?.addEventListener('click', () => {
  NK.confirm('Остановить авто-торги?', () => {
    API.send('auction_stop', {});
    NK.toast('Авто-торги остановлены', 'info');
  });
});

// ── Кнопка: Сохранить настройки ──────────────────────────────
document.getElementById('auc-save-btn')?.addEventListener('click', () => {
  const stop     = parseFloat(document.getElementById('auc-stop-input')?.value) || 0;
  const step     = parseFloat(document.getElementById('auc-step-input')?.value) || 50000;
  const strategy = document.getElementById('auc-strategy')?.value || 'Агрессивная';
  if (!stop) { NK.toast('Укажите стоп-цену', 'error'); return; }
  if (!_auctionLotId) { NK.toast('Нет активного лота', 'error'); return; }
  API.send('auction_setup', { lot_id: _auctionLotId, stop_price: stop, step, strategy });
  NK.toast('Настройки сохранены в бот', 'success');
});

// ── Живое обновление метки стоп-цены ─────────────────────────
document.getElementById('auc-stop-input')?.addEventListener('input', function () {
  const el = document.getElementById('auc-stop-price');
  if (el) el.textContent = NK.fmt.money(parseFloat(this.value) || 0);
});
