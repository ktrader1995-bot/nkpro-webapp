window.pageInits = window.pageInits || {};

window.pageInits.konkurs = function () {
  const data = API.getMock('konkurs');
  if (!data) return;

  const { lot, ai, criteria, docs } = data;

  // Lot info
  document.getElementById('kon-lot-name').textContent    = lot.name;
  document.getElementById('kon-lot-id').textContent      = lot.id;
  document.getElementById('kon-lot-price').textContent   = NK.fmt.money(lot.price);
  document.getElementById('kon-lot-deadline').textContent = NK.fmt.date(lot.deadline);

  // AI analysis
  const chanceEl = document.getElementById('kon-ai-chance');
  chanceEl.textContent = ai.win_chance + '%';
  chanceEl.className = 'stat-value ' + (ai.win_chance >= 60 ? 'success' : ai.win_chance >= 40 ? 'accent' : 'danger');

  document.getElementById('kon-ai-comment').textContent = ai.comment;
  document.getElementById('kon-ai-price').textContent   = NK.fmt.money(ai.price_rec);
  document.getElementById('kon-price-input').value      = ai.price_rec;

  // Criteria bars
  const critEl = document.getElementById('kon-criteria');
  critEl.innerHTML = '';
  criteria.forEach(c => {
    const div = document.createElement('div');
    div.className = 'progress-wrap';
    div.innerHTML = `
      <div class="progress-header">
        <span class="progress-label">${c.name} <span class="text-muted">(вес ${c.weight}%)</span></span>
        <span class="progress-pct ${c.our_score >= 70 ? 'text-success' : 'text-warning'}">${c.our_score}/100</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${c.our_score >= 70 ? 'success' : ''}" style="width:${c.our_score}%"></div>
      </div>
    `;
    critEl.appendChild(div);
  });

  // Docs checklist
  const docsEl = document.getElementById('kon-docs');
  docsEl.innerHTML = '';
  docs.forEach(d => {
    const li = document.createElement('li');
    li.className = 'checklist-item';
    li.innerHTML = `
      <div class="check-icon ${d.done ? 'done' : 'todo'}">${d.done ? '✓' : '○'}</div>
      <span style="${d.done ? '' : 'color:var(--text-secondary)'}">${d.name}</span>
      ${d.done ? '<span class="badge badge-success" style="margin-left:auto">Готово</span>' : '<button class="btn btn-ghost btn-sm" style="margin-left:auto">Загрузить</button>'}
    `;
    docsEl.appendChild(li);
  });
};

// Generate proposal
document.getElementById('kon-gen-btn')?.addEventListener('click', () => {
  NK.toast('ИИ генерирует техпредложение...', 'info');
  setTimeout(() => NK.toast('Готово! Документ создан', 'success'), 2000);
  NK.send('gen_tech_proposal', {});
});

// Submit
document.getElementById('kon-submit-btn')?.addEventListener('click', () => {
  const price = parseFloat(document.getElementById('kon-price-input')?.value);
  if (!price) { NK.toast('Укажите цену', 'error'); return; }
  NK.confirm('Подписать ЭЦП и подать заявку на конкурс?', () => {
    NK.send('submit_konkurs', { lot_id: 'KON-2025-438710', price });
    NK.toast('Заявка подана!', 'success');
  });
});
