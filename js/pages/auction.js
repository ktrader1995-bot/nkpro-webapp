window.pageInits = window.pageInits || {};

window.pageInits.auction = function () {
  const data = API.getMock('auction');
  if (!data) return;

  const live = data.is_live;

  // Live banner
  document.getElementById('auc-live-banner')?.classList.toggle('hidden', !live);
  document.getElementById('auc-no-live')?.classList.toggle('hidden', live);

  if (!live) return;

  const lot = data.lot;
  document.getElementById('auc-lot-name').textContent  = lot.name;
  document.getElementById('auc-lot-id').textContent    = lot.id;
  document.getElementById('auc-best-price').textContent = NK.fmt.money(data.current_best);
  document.getElementById('auc-start-price').textContent = NK.fmt.money(lot.start_price);
  document.getElementById('auc-stop-price').textContent  = NK.fmt.money(data.stop_price);

  const dropPct = ((1 - data.current_best / lot.start_price) * 100).toFixed(1);
  document.getElementById('auc-drop-pct').textContent = '−' + dropPct + '%';

  // Log
  const logEl = document.getElementById('auc-log');
  logEl.innerHTML = '';
  data.log.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'log-entry ' + (entry.ours ? 'ours' : 'theirs');
    row.innerHTML = `
      <span class="mono" style="font-size:11px;color:inherit;opacity:0.6">${entry.time}</span>
      <span>${entry.name}</span>
      <span class="font-bold">${NK.fmt.money(entry.price)}</span>
    `;
    logEl.appendChild(row);
  });

  // Participants
  const tBody = document.getElementById('auc-participants-body');
  tBody.innerHTML = '';
  data.participants.forEach(p => {
    const tr = document.createElement('tr');
    if (p.is_me) tr.style.color = 'var(--accent)';
    tr.innerHTML = `
      <td>${p.rank === 1 ? '🥇 1' : p.rank}</td>
      <td>${p.is_me ? '<strong>' + p.name + '</strong>' : p.name}</td>
      <td class="font-bold">${NK.fmt.money(p.price)}</td>
    `;
    tBody.appendChild(tr);
  });

  // Settings defaults
  document.getElementById('auc-stop-input').value  = data.stop_price;
  document.getElementById('auc-step-input').value  = 50000;
};

// Bid button
document.getElementById('auc-bid-btn')?.addEventListener('click', () => {
  const data = API.getMock('auction');
  const step  = parseFloat(document.getElementById('auc-step-input')?.value) || 50000;
  const stop  = parseFloat(document.getElementById('auc-stop-input')?.value) || 0;
  const bid   = data.current_best - step;
  if (bid < stop) { NK.toast('Ставка ниже стоп-цены!', 'error'); return; }
  NK.confirm(`Подать ставку ${NK.fmt.money(bid)}?`, () => {
    NK.send('auction_bid', { lot_id: data.lot.id, price: bid });
    NK.toast('Ставка отправлена!', 'success');
  });
});

// Stop button
document.getElementById('auc-stop-btn')?.addEventListener('click', () => {
  NK.send('auction_stop', {});
  NK.toast('Авто-ставки остановлены', 'info');
});
