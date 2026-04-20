// Communication layer between Web App and Telegram bot
// Real data arrives via tg.onEvent('web_app_data') from the bot

window.API = (() => {
  const listeners = {};
  const cache = {};

  function on(event, cb) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(cb);
  }

  function emit(event, data) {
    listeners[event]?.forEach(cb => cb(data));
  }

  // Receive data from bot
  window.Telegram?.WebApp?.onEvent('web_app_data', ({ data }) => {
    try {
      const msg = JSON.parse(data);
      cache[msg.type] = msg.payload;
      emit(msg.type, msg.payload);
    } catch (e) {
      console.error('[API] parse error', e);
    }
  });

  // Request data from bot
  function request(action, params = {}) {
    NK.send(action, params);
  }

  // ── Mock data for dev/preview ──────────────────────────────
  const MOCK = {
    dashboard: {
      stats: { found: 47, active: 3, wins: 12, win_sum: 84_500_000 },
      ai_tip: 'Сегодня высокая активность в категории "Строительные материалы". Рекомендую снизить цену на 5–7% для повышения шансов.',
      live_auction: null,
      recent: [
        { id: 'ZCZ-2025-441892', name: 'Поставка щебня фракции 20-40 для ремонта дорог', price: 12_400_000, type: 'ЗЦП', deadline: '2025-04-28', match: 94 },
        { id: 'ZCZ-2025-440127', name: 'Офисные принадлежности для государственных нужд', price: 890_000, type: 'ЗЦП', deadline: '2025-04-25', match: 87 },
        { id: 'AUC-2025-439983', name: 'Технологическое оборудование для лаборатории', price: 35_200_000, type: 'Аукцион', deadline: '2025-04-30', match: 72 },
        { id: 'KON-2025-438710', name: 'Разработка информационной системы учёта', price: 18_000_000, type: 'Конкурс', deadline: '2025-05-10', match: 65 },
      ]
    },
    search: {
      results: [
        { id: 'ZCZ-2025-441892', name: 'Поставка щебня фракции 20-40 для ремонта дорог', price: 12_400_000, type: 'ЗЦП', deadline: '2025-04-28', match: 94 },
        { id: 'ZCZ-2025-441015', name: 'Канцелярские товары для школ', price: 3_200_000, type: 'ЗЦП', deadline: '2025-04-26', match: 88 },
        { id: 'ZCZ-2025-440127', name: 'Офисные принадлежности', price: 890_000, type: 'ЗЦП', deadline: '2025-04-25', match: 87 },
        { id: 'AUC-2025-439983', name: 'Технологическое оборудование для лаборатории', price: 35_200_000, type: 'Аукцион', deadline: '2025-04-30', match: 72 },
        { id: 'KON-2025-438710', name: 'Разработка информационной системы учёта', price: 18_000_000, type: 'Конкурс', deadline: '2025-05-10', match: 65 },
      ]
    },
    zcz_lots: [
      { id: 'ZCZ-2025-441892', name: 'Поставка щебня фракции 20-40', price: 12_400_000, match: 94, suggested: 11_780_000 },
      { id: 'ZCZ-2025-441015', name: 'Канцелярские товары для школ',  price: 3_200_000,  match: 88, suggested: 3_040_000  },
      { id: 'ZCZ-2025-440127', name: 'Офисные принадлежности',         price: 890_000,   match: 87, suggested: 845_000    },
    ],
    auction: {
      lot: { id: 'AUC-2025-439983', name: 'Технологическое оборудование для лаборатории', start_price: 35_200_000 },
      current_best: 33_150_000,
      stop_price: 30_000_000,
      is_live: true,
      my_last: 33_440_000,
      participants: [
        { rank: 1, name: 'ТОО "АльфаТехно"', price: 33_150_000, is_me: false },
        { rank: 2, name: 'ТОО "NK PRO"',      price: 33_440_000, is_me: true  },
        { rank: 3, name: 'ТОО "БетаТорг"',   price: 33_900_000, is_me: false },
      ],
      log: [
        { time: '10:42:15', name: 'АльфаТехно', price: 33_150_000, ours: false },
        { time: '10:41:50', name: 'NK PRO',      price: 33_440_000, ours: true  },
        { time: '10:41:20', name: 'БетаТорг',   price: 33_900_000, ours: false },
        { time: '10:40:55', name: 'АльфаТехно', price: 34_100_000, ours: false },
      ]
    },
    konkurs: {
      lot: { id: 'KON-2025-438710', name: 'Разработка информационной системы учёта', price: 18_000_000, deadline: '2025-05-10' },
      ai: { win_chance: 68, price_rec: 16_200_000, comment: 'Хороший шанс победы. Усильте раздел «Опыт работы» — конкуренты обычно слабы в этом критерии.' },
      criteria: [
        { name: 'Цена', weight: 60, our_score: 75 },
        { name: 'Опыт (лет)', weight: 25, our_score: 80 },
        { name: 'Срок исполнения', weight: 15, our_score: 60 },
      ],
      docs: [
        { name: 'Устав компании', done: true },
        { name: 'Справка о регистрации', done: true },
        { name: 'Техническое предложение', done: false },
        { name: 'Ценовое предложение', done: false },
        { name: 'Справка об отсутствии задолженности', done: true },
      ]
    },
    history: {
      stats: { total: 38, wins: 12, conv: 31.6, sum: 84_500_000 },
      rows: [
        { id: 'ZCZ-2025-441015', method: 'ЗЦП',     our: 3_040_000, winner: 2_980_000, gap: '-2%',  result: 'loss' },
        { id: 'ZCZ-2025-440990', method: 'ЗЦП',     our: 1_200_000, winner: 1_200_000, gap: '0%',   result: 'win'  },
        { id: 'AUC-2025-439100', method: 'Аукцион', our: 8_450_000, winner: 8_100_000, gap: '-4%',  result: 'loss' },
        { id: 'ZCZ-2025-438800', method: 'ЗЦП',     our: 5_600_000, winner: 5_600_000, gap: '0%',   result: 'win'  },
        { id: 'KON-2025-437500', method: 'Конкурс', our:16_900_000, winner:16_900_000, gap: '0%',   result: 'win'  },
      ],
      competitors: [
        { name: 'ТОО "АльфаТехно"', meetings: 8, wins: 5 },
        { name: 'ТОО "БетаТорг"',   meetings: 6, wins: 2 },
        { name: 'ИП Сейткалиев',    meetings: 4, wins: 1 },
      ]
    },
    profile: {
      company: { bin: '123456789012', name: 'ТОО "NK PRO"', director: 'Нурланов К.', iik: 'KZ123456789' },
      ecp: [
        { type: 'AUTH', label: 'AUTH_RSA.p12', valid: true, expires: '2026-03-15' },
        { type: 'SIGN', label: 'RSA.p12',      valid: true, expires: '2026-03-15' },
      ],
      keywords: 'щебень, канцтовары, офисная мебель, строительные материалы',
      notifications: { new_tender: true, result: true, auction_start: true }
    }
  };

  function getMock(key) {
    return structuredClone(MOCK[key] ?? null);
  }

  return { on, emit, request, getMock, cache };
})();
