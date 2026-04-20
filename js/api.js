// API layer: real HTTP requests to FastAPI server + tg.sendData() for actions

window.API = (() => {
  // В .env бота: WEBAPP_API_URL=https://your-server:8000
  // Здесь хардкодим дефолт — замени на свой адрес после деплоя
  const BASE_URL = window.WEBAPP_API_URL || 'http://localhost:8000';

  // ── HTTP helpers ───────────────────────────────────────────
  async function get(path, params = {}) {
    const url = new URL(BASE_URL + path);
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') url.searchParams.set(k, v); });
    try {
      const res = await fetch(url, {
        headers: {
          'X-Init-Data': window.Telegram?.WebApp?.initData || '',
          'ngrok-skip-browser-warning': 'true',
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn(`[API] GET ${path} failed:`, e.message);
      return null;
    }
  }

  async function post(path, body = {}) {
    try {
      const res = await fetch(BASE_URL + path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Init-Data': window.Telegram?.WebApp?.initData || '',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn(`[API] POST ${path} failed:`, e.message);
      return null;
    }
  }

  // ── Endpoints ──────────────────────────────────────────────
  const api = {
    dashboard:    ()              => get('/api/dashboard'),
    tenders:      (q, type)       => get('/api/tenders', { q, type }),
    zczLots:      ()              => get('/api/zcz/lots'),
    setZczPrice:  (lot_id, price, purchase_type) => post('/api/zcz/price', { lot_id, price, purchase_type }),
    auction:      (lot_id)        => get('/api/auction', { lot_id }),
    history:      (filter)        => get('/api/history', { filter }),
    profile:      ()              => get('/api/profile'),
    saveProfile:  (body)          => post('/api/profile', body),
    konkursLots:  ()              => get('/api/konkurs/lots'),
    searchByAnnounce: (no)        => get('/api/search', { announce_no: no }),
    addLot:       (body)          => post('/api/add_lot', body),
  };

  // ── Bot actions via tg.sendData() ─────────────────────────
  function send(action, payload = {}) {
    const data = JSON.stringify({ action, ...payload });
    if (window.Telegram?.WebApp?.sendData) {
      window.Telegram.WebApp.sendData(data);
    } else {
      console.log('[API] sendData (dev):', data);
      NK.toast('Действие: ' + action, 'info');
    }
  }

  // ── Fallback mock data (если сервер недоступен) ────────────
  const MOCK = {
    dashboard: {
      stats: { found: 0, active: 0, wins: 0, win_sum: 0, conv: 0 },
      monthly: [], by_type: [], competitors: [], recent: [],
      ai_tip: 'Сервер API недоступен. Запустите webapp_server.py на вашем сервере.',
    },
  };

  async function safeGet(endpointFn, mockKey) {
    const data = await endpointFn();
    if (data === null && mockKey) {
      console.warn(`[API] Using mock for ${mockKey}`);
      return structuredClone(MOCK[mockKey] ?? {});
    }
    return data;
  }

  return { ...api, send, safeGet, get, post };
})();
