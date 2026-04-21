// ── Notifications ─────────────────────────────────────────────
const SEEN_KEY = 'nkpro_seen_notifs';

function getSeenIds() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); }
  catch { return new Set(); }
}

function saveSeenIds(set) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
}

async function loadNotifications() {
  const items = await API.notifications();
  if (!items || !items.length) {
    document.getElementById('notif-list').innerHTML =
      '<div class="text-muted text-sm" style="padding:16px;text-align:center">Нет уведомлений</div>';
    return;
  }

  const seen   = getSeenIds();
  const unread = items.filter(n => !seen.has(n.id));

  // Badge
  const badge = document.getElementById('notif-badge');
  if (badge) {
    badge.textContent = unread.length;
    badge.classList.toggle('hidden', unread.length === 0);
  }

  renderNotifications(items, seen);
}

function renderNotifications(items, seen) {
  const list = document.getElementById('notif-list');
  if (!list) return;
  list.innerHTML = '';

  items.forEach(n => {
    const isUnread = !seen.has(n.id);
    const div = document.createElement('div');
    div.className = 'notif-item' + (isUnread ? ' unread' : '');

    const date = n.ts ? n.ts.slice(0, 10) : '';
    const price = n.price ? NK.fmt.money(n.price) : '';

    div.innerHTML = `
      <div class="notif-icon">${n.icon}</div>
      <div class="notif-text">
        <div>${n.text}</div>
        ${price ? `<div style="color:var(--accent);font-weight:600;font-size:12px">${price}</div>` : ''}
        <div class="notif-time">${n.type} · ${date}</div>
      </div>
      ${isUnread ? '<div style="width:7px;height:7px;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:4px"></div>' : ''}
    `;

    div.addEventListener('click', () => {
      const s = getSeenIds();
      s.add(n.id);
      saveSeenIds(s);
      div.classList.remove('unread');
      div.querySelector('div[style*="border-radius:50%"]')?.remove();
      updateBadge();
    });

    list.appendChild(div);
  });
}

function updateBadge() {
  const list   = document.getElementById('notif-list');
  const badge  = document.getElementById('notif-badge');
  if (!list || !badge) return;
  const count = list.querySelectorAll('.notif-item.unread').length;
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);
}

function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const opening = panel.classList.contains('hidden');
  panel.classList.toggle('hidden');
  if (opening) loadNotifications();
}

function markAllRead() {
  const items = document.getElementById('notif-list')?.querySelectorAll('.notif-item');
  const seen  = getSeenIds();
  items?.forEach(el => {
    el.classList.remove('unread');
    el.querySelector('div[style*="border-radius:50%"]')?.remove();
  });
  // Persist all current IDs
  document.getElementById('notif-list')?.querySelectorAll('.notif-item').forEach(el => {
    // ids were set via API, re-load to persist properly
  });
  document.getElementById('notif-badge')?.classList.add('hidden');

  // Re-fetch and mark all seen
  API.notifications().then(items => {
    if (!items) return;
    const s = getSeenIds();
    items.forEach(n => s.add(n.id));
    saveSeenIds(s);
  });
}

// Close panel when clicking outside
document.addEventListener('click', e => {
  const panel = document.getElementById('notif-panel');
  const bell  = document.getElementById('notif-bell');
  if (panel && !panel.contains(e.target) && !bell?.contains(e.target)) {
    panel.classList.add('hidden');
  }
});

// Auto-load badge on startup (after API is ready)
window.addEventListener('load', () => {
  setTimeout(loadNotifications, 800);
});
