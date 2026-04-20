window.pageInits = window.pageInits || {};

let historyFilter = 'all';

window.pageInits.history = function () {
  const data = API.getMock('history');
  if (!data) return;

  // Stats
  document.getElementById('hist-total').textContent  = data.stats.total;
  document.getElementById('hist-wins').textContent   = data.stats.wins;
  document.getElementById('hist-conv').textContent   = data.stats.conv.toFixed(1) + '%';
  document.getElementById('hist-sum').textContent    = NK.fmt.money(data.stats.sum);

  renderTable(data.rows);

  // Competitors
  const compEl = document.getElementById('hist-competitors');
  compEl.innerHTML = '';
  data.competitors.forEach((c, i) => {
    const row = document.createElement('div');
    row.className = 'flex justify-between items-center';
    row.style.cssText = 'padding:8px 0;border-bottom:1px solid var(--border);font-size:13px';
    row.innerHTML = `
      <span style="color:var(--text-secondary)">${i + 1}. ${c.name}</span>
      <span><strong>${c.wins}</strong>/${c.meetings} встреч</span>
    `;
    compEl.appendChild(row);
  });

  // Filters
  document.querySelectorAll('.hist-filter-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.hist-filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      historyFilter = this.dataset.filter;
      const filtered = historyFilter === 'all'
        ? data.rows
        : data.rows.filter(r => r.result === historyFilter);
      renderTable(filtered);
    });
  });
};

function renderTable(rows) {
  const tbody = document.getElementById('hist-table-body');
  tbody.innerHTML = '';
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono" style="font-size:11px">${r.id}</td>
      <td><span class="badge badge-muted">${r.method}</span></td>
      <td class="font-bold">${NK.fmt.money(r.our)}</td>
      <td class="text-muted">${NK.fmt.money(r.winner)}</td>
      <td class="${r.result === 'win' ? 'text-success' : 'text-danger'}">${r.gap}</td>
      <td><span class="badge ${r.result === 'win' ? 'badge-success' : r.result === 'loss' ? 'badge-danger' : 'badge-warning'}">${r.result === 'win' ? '✓ Победа' : r.result === 'loss' ? 'Проигрыш' : 'В рассмотрении'}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// Export
document.getElementById('hist-export-btn')?.addEventListener('click', () => {
  NK.send('export_history', {});
  NK.toast('Запрос на экспорт отправлен', 'info');
});
