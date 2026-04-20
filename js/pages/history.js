window.pageInits = window.pageInits || {};

window.pageInits.history = async function () {
  await loadHistory('all');
};

async function loadHistory(filter) {
  const data = await API.history(filter);
  if (!data) return;

  // Stats
  const s = data.stats || {};
  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setText('hist-total', s.total ?? 0);
  setText('hist-wins',  s.wins  ?? 0);
  setText('hist-conv',  (s.conv ?? 0).toFixed(1) + '%');
  setText('hist-sum',   NK.fmt.money(s.win_sum));

  // Table
  renderTable(data.rows || []);

  // Competitors
  const compEl = document.getElementById('hist-competitors');
  if (compEl) {
    compEl.innerHTML = '';
    if (!(data.competitors || []).length) {
      compEl.innerHTML = '<div class="text-muted text-sm">Данные появятся после аукционов</div>';
    } else {
      data.competitors.forEach((c, i) => {
        const row = document.createElement('div');
        row.className = 'flex justify-between items-center';
        row.style.cssText = 'padding:8px 0;border-bottom:1px solid var(--border);font-size:13px';
        row.innerHTML = `
          <span class="text-muted">${i + 1}. ${c.name || c.bidder || '—'}</span>
          <span><strong>${c.wins ?? 0}</strong>/${c.meetings ?? c.bids ?? 0} встреч</span>
        `;
        compEl.appendChild(row);
      });
    }
  }
}

function renderTable(rows) {
  const tbody = document.getElementById('hist-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">История пуста</td></tr>';
    return;
  }

  const methodMap = { 'Запрос ценовых предложений': 'ЗЦП', 'Аукцион': 'Аукцион', 'Конкурс': 'Конкурс' };

  rows.forEach(r => {
    const method = methodMap[r.method || r.purchase_type] || r.method || '—';
    const status = r.status;
    const badgeCls = status === 'won' ? 'badge-success' : status === 'lost' ? 'badge-danger' : 'badge-warning';
    const badgeText = status === 'won' ? '✓ Победа' : status === 'lost' ? 'Проигрыш' : status === 'submitted' ? 'Подана' : 'Черновик';

    const discountPct = r.discount_pct ? (r.discount_pct * 100).toFixed(1) + '%' : '—';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono" style="font-size:10px">${r.lot_id || '—'}</td>
      <td><span class="badge badge-muted">${method}</span></td>
      <td class="font-bold">${NK.fmt.money(r.our_price)}</td>
      <td class="text-muted">${NK.fmt.money(r.start_price)}</td>
      <td class="${status === 'won' ? 'text-success' : 'text-danger'}">${discountPct}</td>
      <td><span class="badge ${badgeCls}">${badgeText}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// Filters
document.querySelectorAll('.hist-filter-btn')?.forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.hist-filter-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    loadHistory(this.dataset.filter);
  });
});

// Export
document.getElementById('hist-export-btn')?.addEventListener('click', () => {
  API.send('export_history', {});
  NK.toast('Запрос на экспорт отправлен в бот', 'info');
});
