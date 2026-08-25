// Progreso global de Tecnomath. Requiere Firebase Auth + Realtime Database.
(function () {
  const pending = [];
  let startedAt = Date.now();
  let currentGameId = null;

  const DEFAULT_EVENTS = {
    halloween: { id: 'halloween', name: 'Halloween', code: 'HALLOWEEN', emoji: '🎃' },
    navidad: { id: 'navidad', name: 'Navidad', code: 'NAVIDAD', emoji: '🎄' },
    verano: { id: 'verano', name: 'Verano', code: 'VERANO', emoji: '☀️' },
    mundial: { id: 'mundial', name: 'Mundial', code: 'MUNDIAL', emoji: '🏆' },
    regreso: { id: 'regreso', name: 'Regreso a clases', code: 'REGRESO', emoji: '🎒' }
  };

  function getServices() {
    if (!window.firebase || !firebase.auth || !firebase.database) return null;
    return { auth: firebase.auth(), database: firebase.database() };
  }

  function getUser() {
    const services = getServices();
    return services && services.auth.currentUser;
  }

  function gameKey(gameId) {
    return String(gameId || 'unknown').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
  }

  function gameRef(gameId) {
    const services = getServices();
    const user = getUser();
    if (!services || !user) return null;
    return services.database.ref('userProgress/' + user.uid + '/games/' + gameKey(gameId));
  }

  function totalsRef() {
    const services = getServices();
    const user = getUser();
    if (!services || !user) return null;
    return services.database.ref('userProgress/' + user.uid + '/totals');
  }

  async function write(gameId, data, mode) {
    const ref = gameRef(gameId);
    if (!ref) return false;
    const timestamp = firebase.database.ServerValue.TIMESTAMP;
    if (mode === 'start') {
      await ref.transaction(current => ({
        ...(current || {}),
        gameId: gameKey(gameId),
        sessions: ((current && current.sessions) || 0) + 1,
        firstPlayedAt: (current && current.firstPlayedAt) || timestamp,
        lastPlayedAt: timestamp,
        updatedAt: timestamp
      }));
      const totals = totalsRef();
      if (totals) await totals.transaction(current => ({
        ...(current || {}),
        totalSessions: ((current && current.totalSessions) || 0) + 1,
        gamesStarted: Math.max(((current && current.gamesStarted) || 0), 0),
        lastGame: gameKey(gameId),
        lastPlayedAt: timestamp,
        updatedAt: timestamp
      }));
      return true;
    }
    await ref.update({ ...data, gameId: gameKey(gameId), lastPlayedAt: timestamp, updatedAt: timestamp });
    return true;
  }

  async function addPlayTime(seconds) {
    const totals = totalsRef();
    if (!totals || !Number.isFinite(seconds) || seconds <= 0) return false;
    const safeSeconds = Math.min(Math.round(seconds), 86400);
    await totals.transaction(current => ({
      ...(current || {}),
      totalSeconds: ((current && current.totalSeconds) || 0) + safeSeconds,
      totalMinutes: Math.floor((((current && current.totalSeconds) || 0) + safeSeconds) / 60),
      updatedAt: firebase.database.ServerValue.TIMESTAMP
    }));
    return true;
  }

  async function flush() {
    while (pending.length && getUser()) {
      const task = pending.shift();
      try { await write(task.gameId, task.data, task.mode); }
      catch (error) { console.warn('No se pudo sincronizar el progreso de Tecnomath.', error); }
    }
  }

  function enqueue(gameId, data, mode) {
    if (!getUser()) { pending.push({ gameId, data, mode }); return Promise.resolve(false); }
    return write(gameId, data, mode).catch(error => {
      console.warn('No se pudo sincronizar el progreso de Tecnomath.', error);
      return false;
    });
  }

  async function getEvents() {
    const services = getServices();
    const base = { ...DEFAULT_EVENTS };
    if (!services) return base;
    try {
      const snap = await services.database.ref('tecnomath/eventos').once('value');
      const remote = snap.val() || {};
      Object.keys(remote).forEach(key => {
        base[key] = { ...(base[key] || { id: key }), ...remote[key], id: key };
      });
    } catch (error) {
      console.warn('No se pudieron cargar los eventos remotos.', error);
    }
    return base;
  }

  async function unlockEvent(eventId, code) {
    const user = getUser();
    if (!user) return { ok: false, reason: 'login_required' };
    const events = await getEvents();
    const event = events[String(eventId).toLowerCase()];
    if (!event || event.active === false) return { ok: false, reason: 'inactive' };
    if (String(code || '').trim().toUpperCase() !== String(event.code || '').trim().toUpperCase()) {
      return { ok: false, reason: 'invalid_code' };
    }
    await getServices().database.ref('userProgress/' + user.uid + '/events/' + gameKey(event.id)).set({
      unlocked: true,
      name: event.name || event.id,
      unlockedAt: firebase.database.ServerValue.TIMESTAMP
    });
    return { ok: true, event };
  }

  async function isEventUnlocked(eventId) {
    const services = getServices();
    const user = getUser();
    if (!services || !user) return false;
    const snap = await services.database.ref('userProgress/' + user.uid + '/events/' + gameKey(eventId)).once('value');
    return !!(snap.val() && snap.val().unlocked);
  }

  /* =========================================================
     TEMÁTICA GLOBAL
     Lee tecnomath/tematicaActiva y la aplica al index y a
     cualquier página que cargue este archivo.
     ========================================================= */
  const THEME_DATA = {
    normal: {
      emoji: '📚',
      className: 'theme-normal',
      colors: { bg: '#060610', card: '#0d0d1a', border: '#1a1a2e', text: '#ffffff', cyan: '#00FFFF', pink: '#FF00FF', green: '#39FF14', yellow: '#FFE600', gold: '#FFD700' }
    },
    halloween: {
      emoji: '🎃',
      className: 'theme-halloween',
      colors: { bg: '#10050a', card: '#1b0b16', border: '#5b1f49', text: '#fff4e6', cyan: '#ff7a00', pink: '#ff3d00', green: '#b6ff00', yellow: '#ff9f00', gold: '#ff6a00' }
    },
    navidad: {
      emoji: '🎄',
      className: 'theme-navidad',
      colors: { bg: '#06120d', card: '#0c2118', border: '#1e5b3b', text: '#ffffff', cyan: '#65e6ff', pink: '#ff3b5c', green: '#39ff7a', yellow: '#ffe66d', gold: '#ffd700' }
    },
    verano: {
      emoji: '☀️',
      className: 'theme-verano',
      colors: { bg: '#071827', card: '#0c2438', border: '#1f6285', text: '#ffffff', cyan: '#29d9ff', pink: '#ff5ea8', green: '#70ff9a', yellow: '#ffe66d', gold: '#ffd166' }
    },
    mundial: {
      emoji: '🏆',
      className: 'theme-mundial',
      colors: { bg: '#07100a', card: '#0e1d11', border: '#355b3a', text: '#ffffff', cyan: '#4de1ff', pink: '#e8c547', green: '#4cff70', yellow: '#ffe600', gold: '#ffd700' }
    },
    regreso: {
      emoji: '🎒',
      className: 'theme-regreso',
      colors: { bg: '#10100a', card: '#1c1c0e', border: '#5d5a24', text: '#ffffff', cyan: '#5fd7ff', pink: '#ff72b6', green: '#75ff75', yellow: '#ffe600', gold: '#ffcc33' }
    }
  };

  function applyGlobalTheme(themeId) {
    const id = String(themeId || 'normal').toLowerCase();
    const theme = THEME_DATA[id] || THEME_DATA.normal;
    const root = document.documentElement;
    const body = document.body;

    Object.entries(theme.colors).forEach(([key, value]) => {
      const map = {
        bg: '--theme-bg', card: '--theme-card', border: '--theme-border', text: '--theme-text',
        cyan: '--neon-cyan', pink: '--neon-pink', green: '--neon-green', yellow: '--neon-yellow', gold: '--gold'
      };
      root.style.setProperty(map[key], value);
    });

    Object.keys(THEME_DATA).forEach(key => body && body.classList.remove(THEME_DATA[key].className));
    if (body) {
      body.classList.add(theme.className);
      body.dataset.tecnomathTheme = id;
    }
    root.dataset.tecnomathTheme = id;
    root.style.setProperty('--tecnomath-theme', id);
    root.style.setProperty('--theme-emoji', JSON.stringify(theme.emoji));

    document.title = `${theme.emoji} TecnoMath · Plataforma de Juegos Educativos`;

    window.dispatchEvent(new CustomEvent('tecnomath:themechange', { detail: { id, theme } }));
  }

  function watchGlobalTheme() {
    const services = getServices();
    if (!services) return;
    const ref = services.database.ref('tecnomath/tematicaActiva');
    ref.on('value', snap => applyGlobalTheme(snap.val() || 'normal'), error => {
      console.warn('No se pudo sincronizar la temática global de TecnoMath.', error);
      applyGlobalTheme('normal');
    });
  }

  function initGlobalTheme() {
    applyGlobalTheme('normal');
    const start = () => watchGlobalTheme();
    if (window.firebase && firebase.database) start();
    else setTimeout(start, 250);
  }

  window.TecnomathTheme = {
    apply: applyGlobalTheme,
    watch: watchGlobalTheme,
    themes: THEME_DATA
  };

  window.TecnomathProgress = {
    start(gameId) {
      currentGameId = gameKey(gameId);
      startedAt = Date.now();
      return enqueue(currentGameId, {}, 'start');
    },
    save(gameId, data) {
      return enqueue(gameKey(gameId || currentGameId), data || {}, 'save');
    },
    saveSnapshot(gameId, storageKey, fields) {
      try {
        const value = JSON.parse(localStorage.getItem(storageKey) || '{}');
        const snapshot = fields ? fields.reduce((result, key) => {
          if (Object.prototype.hasOwnProperty.call(value, key)) result[key] = value[key];
          return result;
        }, {}) : value;
        return this.save(gameId, { snapshot });
      } catch (error) {
        console.warn('No se pudo preparar el progreso local.', error);
        return Promise.resolve(false);
      }
    },
    load(gameId) {
      const ref = gameRef(gameKey(gameId || currentGameId));
      if (!ref) return Promise.resolve(null);
      return ref.once('value').then(snapshot => snapshot.val());
    },
    savePlayTime(seconds) { return addPlayTime(seconds); },
    events: {
      list: getEvents,
      unlock: unlockEvent,
      isUnlocked: isEventUnlocked
    }
  };

  const services = getServices();
  if (services) services.auth.onAuthStateChanged(() => flush());

  window.addEventListener('pagehide', () => {
    if (currentGameId) {
      const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      enqueue(currentGameId, { secondsPlayed: seconds }, 'save');
      addPlayTime(seconds).catch(() => {});
    }
  });

  const scriptTag = document.currentScript;
  if (scriptTag && scriptTag.dataset.tecnomathGame) {
    window.TecnomathProgress.start(scriptTag.dataset.tecnomathGame);
  }

  initGlobalTheme();
})();
