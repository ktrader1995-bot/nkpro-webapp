window.pageInits = window.pageInits || {};

window.pageInits.profile = async function () {
  const data = await API.profile();
  if (!data) return;

  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  setVal('prof-bin',      data.bin);
  setVal('prof-name',     data.name);
  setVal('prof-director', data.director);
  setVal('prof-iik',      data.iik);

  // Keywords
  const kw = Array.isArray(data.keywords) ? data.keywords.join(', ') : (data.keywords || '');
  setVal('prof-keywords', kw);

  // ECP cards
  const ecpEl = document.getElementById('prof-ecp-list');
  if (ecpEl) {
    ecpEl.innerHTML = '';
    (data.ecp || []).forEach(key => {
      const div = document.createElement('div');
      div.className = 'ecp-status';
      div.innerHTML = `
        <div class="ecp-icon ${key.valid ? 'active' : 'inactive'}">${key.valid ? '🔐' : '⚠️'}</div>
        <div style="flex:1">
          <div class="font-bold" style="font-size:13px">${key.label}</div>
          <div class="text-muted text-xs">Тип: ${key.type} · ${key.valid ? 'Файл найден' : 'Файл не найден'}</div>
        </div>
        <span class="badge ${key.valid ? 'badge-success' : 'badge-danger'}">${key.valid ? 'Активен' : 'Не найден'}</span>
      `;
      ecpEl.appendChild(div);
    });
  }
};

// Save
document.getElementById('prof-save-btn')?.addEventListener('click', async () => {
  const body = {
    bin:      document.getElementById('prof-bin')?.value      || '',
    name:     document.getElementById('prof-name')?.value     || '',
    director: document.getElementById('prof-director')?.value || '',
    iik:      document.getElementById('prof-iik')?.value      || '',
    keywords: document.getElementById('prof-keywords')?.value || '',
  };
  const res = await API.saveProfile(body);
  if (res?.ok) {
    NK.toast('Профиль сохранён', 'success');
  } else {
    // Fallback — отправить через бот
    API.send('save_profile', body);
    NK.toast('Отправлено в бот для сохранения', 'info');
  }
});

// ECP upload hint
document.getElementById('prof-ecp-upload')?.addEventListener('click', () => {
  NK.toast('Загрузите ЭЦП через бот командой /ecp', 'info');
});
