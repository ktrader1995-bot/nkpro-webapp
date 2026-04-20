window.pageInits = window.pageInits || {};

window.pageInits.profile = function () {
  const data = API.getMock('profile');
  if (!data) return;

  // Company fields
  document.getElementById('prof-bin').value      = data.company.bin      || '';
  document.getElementById('prof-name').value     = data.company.name     || '';
  document.getElementById('prof-director').value = data.company.director || '';
  document.getElementById('prof-iik').value      = data.company.iik      || '';

  // ECP cards
  const ecpEl = document.getElementById('prof-ecp-list');
  ecpEl.innerHTML = '';
  data.ecp.forEach(key => {
    const div = document.createElement('div');
    div.className = 'ecp-status';
    div.innerHTML = `
      <div class="ecp-icon ${key.valid ? 'active' : 'inactive'}">${key.valid ? '🔐' : '⚠️'}</div>
      <div style="flex:1">
        <div class="font-bold" style="font-size:13px">${key.label}</div>
        <div class="text-muted text-xs">Тип: ${key.type} · Действует до ${key.expires}</div>
      </div>
      <span class="badge ${key.valid ? 'badge-success' : 'badge-danger'}">${key.valid ? 'Активен' : 'Истёк'}</span>
    `;
    ecpEl.appendChild(div);
  });

  // Keywords
  document.getElementById('prof-keywords').value = data.keywords || '';

  // Notifications
  document.getElementById('notif-new').checked   = data.notifications.new_tender;
  document.getElementById('notif-result').checked = data.notifications.result;
  document.getElementById('notif-auc').checked   = data.notifications.auction_start;
};

// Save company
document.getElementById('prof-save-btn')?.addEventListener('click', () => {
  const payload = {
    bin:      document.getElementById('prof-bin')?.value,
    name:     document.getElementById('prof-name')?.value,
    director: document.getElementById('prof-director')?.value,
    iik:      document.getElementById('prof-iik')?.value,
    keywords: document.getElementById('prof-keywords')?.value,
  };
  NK.send('save_profile', payload);
  NK.toast('Профиль сохранён', 'success');
});

// Upload ECP
document.getElementById('prof-ecp-upload')?.addEventListener('click', () => {
  NK.toast('Загрузите ЭЦП через бот командой /ecp', 'info');
});
