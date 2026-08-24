// Progreso común de Tecnomath. Requiere Firebase Auth y Realtime Database.
(function () {
  const pending = [];
  let startedAt = Date.now();
  let currentGameId = null;

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
      return true;
    }
    await ref.update({ ...data, gameId: gameKey(gameId), lastPlayedAt: timestamp, updatedAt: timestamp });
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
    async load(gameId) {
      const ref = gameRef(gameKey(gameId || currentGameId));
      if (!ref) return null;
      const snapshot = await ref.once('value');
      return snapshot.val();
    }
  };

  const services = getServices();
  if (services) services.auth.onAuthStateChanged(() => flush());
  window.addEventListener('pagehide', () => {
    if (currentGameId) enqueue(currentGameId, { secondsPlayed: Math.max(1, Math.round((Date.now() - startedAt) / 1000)) }, 'save');
  });
  const scriptTag = document.currentScript;
  if (scriptTag && scriptTag.dataset.tecnomathGame) {
    window.TecnomathProgress.start(scriptTag.dataset.tecnomathGame);
  }
})();
