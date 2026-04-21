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
  const isMobile = window.innerWidth < 640;
  isMobile ? renderCards(rows) : renderDesktopTable(rows);
}

function renderDesktopTable(rows) {
  const wrap = document.getElementById('hist-table-wrap');
  const tbody = document.getElementById('hist-table-body');
  const cards = document.getElementById('hist-cards');
  if (wrap)  wrap.style.display  = '';
  if (cards) cards.style.display = 'none';
  if (!tbody) return;

  tbody.innerHTML = '';
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">История пуста</td></tr>';
    return;
  }

  rows.forEach(r => {
    const { method, badgeCls, badgeText, discountPct, status } = rowMeta(r);
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.innerHTML = `
      <td class="mono" style="font-size:10px">${r.lot_id || '—'}</td>
      <td><span class="badge badge-muted">${method}</span></td>
      <td class="font-bold">${NK.fmt.money(r.our_price)}</td>
      <td class="text-muted">${NK.fmt.money(r.start_price)}</td>
      <td class="${status === 'won' ? 'text-success' : 'text-danger'}">${discountPct}</td>
      <td><span class="badge ${badgeCls}">${badgeText}</span></td>
    `;
    tr.addEventListener('click', () => openLotModal(r));
    tbody.appendChild(tr);
  });
}

function renderCards(rows) {
  const wrap  = document.getElementById('hist-table-wrap');
  const cards = document.getElementById('hist-cards');
  if (wrap)  wrap.style.display  = 'none';
  if (!cards) return;
  cards.style.display = '';
  cards.innerHTML = '';

  if (!rows.length) {
    cards.innerHTML = '<div class="text-muted text-sm" style="text-align:center;padding:24px">История пуста</div>';
    return;
  }

  rows.forEach(r => {
    const { method, badgeCls, badgeText, discountPct, status } = rowMeta(r);
    const div = document.createElement('div');
    div.className = 'card';
    div.style.cssText = 'margin-bottom:8px;cursor:pointer';
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
        <div>
          <div class="mono" style="font-size:10px;color:var(--text-muted)">${r.lot_id || '—'}</div>
          <div style="font-size:12px;margin-top:2px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.name_ru || '—'}</div>
        </div>
        <span class="badge ${badgeCls}">${badgeText}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <span class="badge badge-muted" style="margin-right:6px">${method}</span>
          <span class="font-bold" style="font-size:13px">${NK.fmt.money(r.our_price)}</span>
        </div>
        <span class="${status === 'won' ? 'text-success' : 'text-danger'}" style="font-size:12px">${discountPct}</span>
      </div>
    `;
    div.addEventListener('click', () => openLotModal(r));
    cards.appendChild(div);
  });
}

function rowMeta(r) {
  const methodMap = { 'Запрос ценовых предложений': 'ЗЦП', 'Аукцион': 'Аукцион', 'Конкурс': 'Конкурс' };
  const status     = r.status || '';
  const method     = methodMap[r.method || r.purchase_type] || r.method || '—';
  const badgeCls   = status === 'won' ? 'badge-success' : status === 'lost' ? 'badge-danger' : 'badge-warning';
  const badgeText  = status === 'won' ? '✓ Победа' : status === 'lost' ? 'Проигрыш' : status === 'submitted' ? 'Подана' : 'Черновик';
  const discountPct = r.discount_pct ? (r.discount_pct * 100).toFixed(1) + '%'
    : (r.start_price && r.our_price ? ((1 - r.our_price / r.start_price) * 100).toFixed(1) + '%' : '—');
  return { method, badgeCls, badgeText, discountPct, status };
}

// Filters
document.querySelectorAll('.hist-filter-btn')?.forEach(btn => {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.hist-filter-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    loadHistory(this.dataset.filter);
  });
});

// Export — direct download from server
document.getElementById('hist-export-btn')?.addEventListener('click', async () => {
  NK.toast('Генерирую Excel...', 'info');
  try {
    const BASE = window.WEBAPP_API_URL || 'http://localhost:8000';
    const res = await fetch(BASE + '/api/export', {
      headers: {
        'X-Init-Data': window.Telegram?.WebApp?.initData || '',
        'ngrok-skip-browser-warning': 'true',
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const now = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '');
    a.href = url;
    a.download = `nkpro_report_${now}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    NK.toast('Excel скачан!', 'success');
  } catch (e) {
    // Fallback — через бот
    API.send('export_history', {});
    NK.toast('Файл будет отправлен в Telegram', 'info');
  }
});

// ── Lot detail modal ─────────────────────────────────────────
async function openLotModal(row) {
  const modal = document.getElementById('lot-modal');
  if (!modal) return;

  document.getElementById('modal-lot-id').textContent   = row.lot_id || '—';
  document.getElementById('modal-lot-name').textContent = row.name_ru || row.lot_id || '—';

  // Badges
  const status    = row.status || '';
  const badgeCls  = status === 'won' ? 'badge-success' : status === 'lost' ? 'badge-danger' : 'badge-warning';
  const badgeText = status === 'won' ? '✓ Победа' : status === 'lost' ? 'Проигрыш' : status === 'submitted' ? 'Подана' : 'Черновик';
  const method    = row.method || row.purchase_type || '—';
  document.getElementById('modal-badges').innerHTML = `
    <span class="badge ${badgeCls}">${badgeText}</span>
    <span class="badge badge-muted">${method}</span>
  `;

  // Stats
  const disc = row.start_price && row.our_price
    ? ((1 - row.our_price / row.start_price) * 100).toFixed(1) + '%' : '—';
  document.getElementById('modal-stats').innerHTML = `
    <div class="stat-card" style="padding:10px">
      <div class="stat-label">Нач. цена</div>
      <div style="font-weight:700;font-size:13px">${NK.fmt.money(row.start_price)}</div>
    </div>
    <div class="stat-card" style="padding:10px">
      <div class="stat-label">Наша цена</div>
      <div style="font-weight:700;font-size:13px;color:var(--accent)">${NK.fmt.money(row.our_price)}</div>
    </div>
    <div class="stat-card" style="padding:10px">
      <div class="stat-label">Снижение</div>
      <div style="font-weight:700;font-size:13px">${disc}</div>
    </div>
  `;

  // Clear dynamic sections
  document.getElementById('modal-auction-section').classList.add('hidden');
  document.getElementById('modal-apps-section').classList.add('hidden');

  modal.classList.remove('hidden');

  // Load details from server
  const detail = await API.lotDetail(row.lot_id);
  if (!detail) return;

  // Auction log
  if (detail.auction_log?.length) {
    const logEl = document.getElementById('modal-auction-log');
    logEl.innerHTML = '';
    detail.auction_log.forEach(e => {
      const div = document.createElement('div');
      div.className = 'log-entry ' + (e.is_ours ? 'ours' : 'theirs');
      const time = (e.ts || '').slice(11, 19);
      div.innerHTML = `
        <span class="mono" style="font-size:11px;opacity:0.6">${time}</span>
        <span>${e.bidder || '—'}</span>
        <span class="font-bold">${NK.fmt.money(e.price)}</span>
      `;
      logEl.appendChild(div);
    });
    document.getElementById('modal-auction-section').classList.remove('hidden');
  }

  // Applications list
  if (detail.applications?.length) {
    const appsEl = document.getElementById('modal-apps-list');
    appsEl.innerHTML = '';
    detail.applications.forEach(a => {
      const s = a.status || '';
      const cls = s === 'won' ? 'badge-success' : s === 'lost' ? 'badge-danger' : 'badge-warning';
      const txt = s === 'won' ? 'Победа' : s === 'lost' ? 'Проигрыш' : s === 'submitted' ? 'Подана' : s;
      const div = document.createElement('div');
      div.style.cssText = 'display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px';
      div.innerHTML = `
        <span class="text-muted">${(a.created_at || '').slice(0, 10)}</span>
        <span>${NK.fmt.money(a.our_price)}</span>
        <span class="badge ${cls}">${txt}</span>
      `;
      appsEl.appendChild(div);
    });
    document.getElementById('modal-apps-section').classList.remove('hidden');
  }
}

function closeLotModal(event) {
  if (event && event.target !== document.getElementById('lot-modal')) return;
  document.getElementById('lot-modal')?.classList.add('hidden');
}
