const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#0b0c0f');
  tg.setBackgroundColor('#0b0c0f');
}

// ── Navigation ───────────────────────────────────────────────
const pages = {};
const navItems = document.querySelectorAll('[data-page]');

function navigateTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('[data-page]').forEach(n => n.classList.remove('active'));

  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');

  document.querySelectorAll(`[data-page="${pageId}"]`).forEach(n => n.classList.add('active'));

  if (window.pageInits?.[pageId]) window.pageInits[pageId]();
}

navItems.forEach(item => {
  item.addEventListener('click', () => {
    navigateTo(item.dataset.page);
  });
});

// ── Telegram back button ─────────────────────────────────────
tg?.BackButton?.onClick?.(() => {
  navigateTo('dashboard');
  tg.BackButton.hide();
});

// ── Helpers ──────────────────────────────────────────────────
window.NK = {
  tg,

  fmt: {
    money(n) {
      if (!n && n !== 0) return '—';
      if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' млн ₸';
      return n.toLocaleString('ru') + ' ₸';
    },
    date(iso) {
      if (!iso) return '—';
      return new Date(iso).toLocaleDateString('ru', { day: '2-digit', month: 'short' });
    },
    pct(a, b) {
      if (!a || !b) return '—';
      return ((1 - a / b) * 100).toFixed(1) + '%';
    },
    num(n) {
      return n?.toLocaleString('ru') ?? '—';
    }
  },

  send(action, payload = {}) {
    const data = JSON.stringify({ action, ...payload });
    if (tg?.sendData) {
      tg.sendData(data);
    } else {
      console.log('[NK] sendData:', data);
    }
  },

  toast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = 'nk-toast nk-toast-' + type;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
  },

  confirm(msg, cb) {
    if (tg?.showConfirm) {
      tg.showConfirm(msg, ok => { if (ok) cb(); });
    } else if (window.confirm(msg)) {
      cb();
    }
  }
};

// ── Toast CSS injection ──────────────────────────────────────
const toastStyle = document.createElement('style');
toastStyle.textContent = `
.nk-toast {
  position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%) translateY(12px);
  background: #1c1e25; border: 1px solid #2a2e38; color: #e2e4ea;
  padding: 10px 18px; border-radius: 100px; font-size: 13px; font-weight: 600;
  z-index: 9999; opacity: 0; transition: all 0.25s ease; white-space: nowrap;
  box-shadow: 0 4px 24px rgba(0,0,0,0.4);
}
.nk-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.nk-toast.nk-toast-success { border-color: rgba(52,211,153,0.3); color: #34d399; }
.nk-toast.nk-toast-error   { border-color: rgba(248,113,113,0.3); color: #f87171; }
`;
document.head.appendChild(toastStyle);

// ── Init ─────────────────────────────────────────────────────
navigateTo('dashboard');
