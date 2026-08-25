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
})();
