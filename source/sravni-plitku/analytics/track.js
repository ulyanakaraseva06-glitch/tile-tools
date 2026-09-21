/* ================================================================
   analytics/track.js — клиентский трекинг (ЭТАП 04).
   Создаёт window.SP_ANALYTICS и шлёт события на track_event.php.

   ГЛАВНОЕ ПРАВИЛО: аналитика НИКОГДА не ломает визуализатор.
   Любая ошибка трекинга молча проглатывается (try/catch + .catch).
   Гость (без window.SP_USER.id) не трекается.
================================================================ */
(function () {
  'use strict';
  if (window.SP_ANALYTICS) return;

  var ENDPOINT = 'analytics/api/track_event.php';
  var enabled  = !!(window.SP_USER && window.SP_USER.id);
  var csrf     = (window.SP_USER && window.SP_USER.csrf) || '';

  /* ---- sessionKey: берём из localStorage или создаём новый ---- */
  var sessionKey = '';
  try {
    sessionKey = localStorage.getItem('sp_session_key') || '';
  } catch (e) { sessionKey = ''; }
  if (!sessionKey) {
    sessionKey = 'sp_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    try { localStorage.setItem('sp_session_key', sessionKey); } catch (e) {}
  }

  /* ---- информация об устройстве (отправляется в каждом событии,
          сервер использует её при первом INSERT сессии) ---- */
  function getDeviceInfo() {
    var d = {};
    try {
      d.viewport_w   = window.innerWidth || null;
      d.viewport_h   = window.innerHeight || null;
      d.screen_w     = (window.screen && window.screen.width)  || null;
      d.screen_h     = (window.screen && window.screen.height) || null;
      d.referrer     = document.referrer || null;
      d.landing_path = location.pathname || null;
      var p = new URLSearchParams(location.search);
      d.utm_source   = p.get('utm_source')   || null;
      d.utm_medium   = p.get('utm_medium')   || null;
      d.utm_campaign = p.get('utm_campaign') || null;
    } catch (e) {}
    return d;
  }

  var device = getDeviceInfo();

  /* ---- низкоуровневая отправка ---- */
  function send(eventName, payload) {
    if (!enabled) return;
    try {
      var body = {
        csrf:       csrf,
        sessionKey: sessionKey,
        eventName:  String(eventName || ''),
        payload:    payload || {}
      };
      // device кладём в payload один раз — для апдейта строки сессии на сервере
      if (!body.payload.device) body.payload.device = device;
      if (!body.payload.page_path) body.payload.page_path = location.pathname;

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true
      }).catch(function () {});   // сетевые ошибки игнорируем
    } catch (e) { /* молча */ }
  }

  /* ---- debounce: для шумных событий (поиск, фильтры) ---- */
  var timers = {};
  function trackDebounced(eventName, payload, delay) {
    if (!enabled) return;
    delay = delay || 700;
    try {
      if (timers[eventName]) clearTimeout(timers[eventName]);
      timers[eventName] = setTimeout(function () {
        timers[eventName] = null;
        send(eventName, payload);
      }, delay);
    } catch (e) {}
  }

  window.SP_ANALYTICS = {
    enabled:        enabled,
    sessionKey:     sessionKey,
    getDeviceInfo:  getDeviceInfo,
    track:          function (eventName, payload) { try { send(eventName, payload); } catch (e) {} },
    trackDebounced: trackDebounced
  };

  /* ---- автоматические события при загрузке страницы ---- */
  try {
    send('session_start', {});
    send('page_view', {});
  } catch (e) {}
})();
