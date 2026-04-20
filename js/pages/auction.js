window.pageInits = window.pageInits || {};

let _auctionLotId = '';
let _auctionRefresh = null;

window.pageInits.auction = async function () {
  clearInterval(_auctionRefresh);
  await loadAuction();
  // Автообновление каждые 10 сек если аукцион живой
  _auctionRefresh = setInterval(async () => {
    const data = await API.auction(_auctionLotId);
    if (data?.is_live) renderAuction(data);
  }, 10000);
};

async function loadAuction() {
  const data = await API.auction();
  if (!data) return;
  _auctionLotId = data.lot?.id || '';
  renderAuction(data);
}

function renderAuction(data) {
  const live = data.is_live;

  document.getElementById('auc-live-banner')?.classList.toggle('hidden', !live);
  document.getElementById('auc-no-live')?.classList.toggle('hidden', live);

  if (!live) return;

  const lot = data.lot || {};
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  setText('auc-lot-name',    lot.name || '');
  setText('auc-lot-id',      lot.id   || '');
  setText('auc-best-price',  NK.fmt.money(data.current_best));
  setText('auc-start-price', NK.fmt.money(lot.start_price));

  const dropPct = lot.start_price
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
    logEl.scrollTop = 0;
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

  // Stop price default
  const stopInput = document.getElementById('auc-stop-input');
  if (stopInput && !stopInput.value && lot.start_price) {
    stopInput.value = Math.round(lot.start_price * 0.85);
  }
  const setText2 = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText2('auc-stop-price', NK.fmt.money(parseFloat(document.getElementById('auc-stop-input')?.value)));
}

// Bid
document.getElementById('auc-bid-btn')?.addEventListener('click', async () => {
  const data = await API.auction(_auctionLotId);
  if (!data?.is_live) { NK.toast('Аукцион не активен', 'error'); return; }
  const step = parseFloat(document.getElementById('auc-step-input')?.value) || 50000;
  const stop = parseFloat(document.getElementById('auc-stop-input')?.value) || 0;
  const bid  = (data.current_best || 0) - step;
  if (bid < stop) { NK.toast('Ставка ниже стоп-цены!', 'error'); return; }
  NK.confirm(`Подать ставку ${NK.fmt.money(bid)}?`, () => {
    API.send('auction_bid', { lot_id: _auctionLotId, price: bid });
    NK.toast('Ставка отправлена в бот', 'success');
  });
});

// Stop
document.getElementById('auc-stop-btn')?.addEventListener('click', () => {
  API.send('auction_stop', {});
  NK.toast('Авто-торги остановлены', 'info');
});

// Update stop price label on input
document.getElementById('auc-stop-input')?.addEventListener('input', function () {
  const el = document.getElementById('auc-stop-price');
  if (el) el.textContent = NK.fmt.money(parseFloat(this.value) || 0);
});
