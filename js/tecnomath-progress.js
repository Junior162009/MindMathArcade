// TecnoMath Central Progress v3 - local-first + Firebase per authenticated user.
(function () {
  'use strict';

  const KEY = 'tecnomath_progress_v2';
  const META_KEY = 'tecnomath_progress_meta_v3';
  const DEFAULTS = {
    xp: 0, coins: 0, level: 1, streak: 0, lastDay: null,
    games: 0, correct: 0, wrong: 0, topics: {}, achievements: []
  };
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyCfY0VT4fQ5emX4R2LdUXU3FxjBTtY7Gzc',
    authDomain: 'tecnomath-sync-6058a.firebaseapp.com',
    databaseURL: 'https://tecnomath-sync-6058a-default-rtdb.firebaseio.com',
    projectId: 'tecnomath-sync-6058a',
    storageBucket: 'tecnomath-sync-6058a.firebasestorage.app',
    messagingSenderId: '237823560752',
    appId: '1:237823560752:web:adc1e5b396b5a0e0d671f5'
  };

  let firebaseReady = false;
  let syncing = false;
  let restoring = false;
  let authUser = null;
  let firebasePromise = null;

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }

  function read() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      return normalize({ ...cloneDefaults(), ...saved });
    } catch (_) {
      return cloneDefaults();
    }
  }

  function normalize(d) {
    d.xp = Math.max(0, Number(d.xp) || 0);
    d.coins = Math.max(0, Number(d.coins) || 0);
    d.level = levelFor(d.xp);
    d.streak = Math.max(0, Number(d.streak) || 0);
    d.games = Math.max(0, Number(d.games) || 0);
    d.correct = Math.max(0, Number(d.correct) || 0);
    d.wrong = Math.max(0, Number(d.wrong) || 0);
    d.topics = d.topics && typeof d.topics === 'object' ? d.topics : {};
    d.achievements = Array.isArray(d.achievements) ? [...new Set(d.achievements)] : [];
    return d;
  }

  function save(d) {
    d = normalize(d);
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (_) {}
    try { window.dispatchEvent(new CustomEvent('tecnomath:progress', { detail: d })); } catch (_) {}
    return d;
  }

  function levelFor(xp) {
    return Math.floor(Math.sqrt(Math.max(0, Number(xp) || 0) / 100)) + 1;
  }

  function today() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getMeta() {
    try {
      const m = JSON.parse(localStorage.getItem(META_KEY) || '{}');
      return {
        clientId: m.clientId || ('tm-' + Math.random().toString(36).slice(2) + Date.now().toString(36)),
        seq: Number(m.seq) || 0,
        pending: Array.isArray(m.pending) ? m.pending : []
      };
    } catch (_) {
      return { clientId: 'tm-' + Math.random().toString(36).slice(2), seq: 0, pending: [] };
    }
  }

  function saveMeta(m) {
    try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch (_) {}
  }

  function addPendingEvent(delta) {
    const m = getMeta();
    m.seq += 1;
    const id = `${m.clientId}-${m.seq}`;
    m.pending.push({ id, delta });
    // Keep a bounded retry queue. The aggregate is always saved locally even if the queue cannot be persisted.
    if (m.pending.length > 500) m.pending = m.pending.slice(-500);
    saveMeta(m);
    return id;
  }

  function achievementUpdate(d) {
    const total = d.correct + d.wrong;
    const accuracy = total ? Math.round(d.correct / total * 100) : 0;
    const checks = [
      ['first_win', d.correct >= 1],
      ['century', d.correct >= 100],
      ['streak3', d.streak >= 3],
      ['master', d.level >= 10],
      ['precision', accuracy >= 90 && d.correct >= 20],
      ['gamer', d.games >= 10]
    ];
    checks.forEach(([id, ok]) => {
      if (ok && !d.achievements.includes(id)) d.achievements.push(id);
    });
  }

  function buildDelta(r) {
    const correct = Math.max(0, Number(r.correct || 0));
    const wrong = Math.max(0, Number(r.wrong || 0));
    const games = Math.max(0, Number(r.games || 0));
    return {
      xp: Math.max(0, Number(r.xp ?? correct * 25)),
      coins: Math.max(0, Number(r.coins ?? correct * 5)),
      games, correct, wrong,
      topic: r.topic ? String(r.topic) : null,
      topicGames: games
    };
  }

  function applyDelta(d, delta) {
    const out = normalize({ ...d, topics: { ...(d.topics || {}) }, achievements: [...(d.achievements || [])] });
    const now = today();
    if (delta.games > 0 || delta.correct > 0 || delta.wrong > 0) {
      if (out.lastDay !== now) {
        out.streak = out.lastDay ? out.streak + 1 : 1;
        out.lastDay = now;
      }
    }
    out.xp += delta.xp;
    out.coins += delta.coins;
    out.games += delta.games;
    out.correct += delta.correct;
    out.wrong += delta.wrong;
    if (delta.topic) {
      const t = out.topics[delta.topic] || { correct: 0, wrong: 0, games: 0 };
      t.correct = Math.max(0, Number(t.correct) || 0) + delta.correct;
      t.wrong = Math.max(0, Number(t.wrong) || 0) + delta.wrong;
      t.games = Math.max(0, Number(t.games) || 0) + delta.topicGames;
      out.topics[delta.topic] = t;
    }
    out.level = levelFor(out.xp);
    achievementUpdate(out);
    return out;
  }

  function record(r = {}) {
    const delta = buildDelta(r);
    const d = applyDelta(read(), delta);
    save(d);
    // A real result is the only operation that enters the cloud event queue.
    if (delta.games || delta.correct || delta.wrong || delta.xp || delta.coins) addPendingEvent(delta);
    scheduleSync();
    return d;
  }

  function gameResult(game, stats = {}) {
    const payload = { ...stats, games: stats.games ?? 1, topic: stats.topic || game };
    return record(payload);
  }

  // Kept for backwards compatibility. Opening a game never grants XP or a free match.
  function trackPlay() {
    return read();
  }

  function installAutoTracking() {
    // Intentionally disabled: progress must come from real game results, not page opens.
  }

  function getServices() {
    if (!window.firebase || !firebase.auth || !firebase.database) return null;
    return { auth: firebase.auth(), db: firebase.database() };
  }

  function ensureFirebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = new Promise((resolve) => {
      const existing = getServices();
      if (existing) {
        try { if (firebase.apps && firebase.apps.length === 0) firebase.initializeApp(FIREBASE_CONFIG); } catch (_) {}
        firebaseReady = !!getServices();
        resolve(firebaseReady);
        return;
      }

      const scripts = [
        'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
        'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js',
        'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js'
      ];
      let index = 0;
      const loadNext = () => {
        if (index >= scripts.length) {
          try {
            if (window.firebase && (!firebase.apps || !firebase.apps.length)) firebase.initializeApp(FIREBASE_CONFIG);
            firebaseReady = !!getServices();
          } catch (e) { console.warn('TecnoMath: Firebase no pudo inicializarse.', e); firebaseReady = false; }
          resolve(firebaseReady);
          return;
        }
        const src = scripts[index++];
        if (document.querySelector(`script[src="${src}"]`)) { loadNext(); return; }
        const s = document.createElement('script');
        s.src = src; s.async = false;
        s.onload = loadNext;
        s.onerror = () => { console.warn('TecnoMath: no se pudo cargar Firebase:', src); loadNext(); };
        document.head.appendChild(s);
      };
      loadNext();
    });
    return firebasePromise;
  }

  function globalRef() {
    const s = getServices();
    return s && authUser ? s.db.ref('userProgress/' + authUser.uid + '/global') : null;
  }

  function mergeCloudLocal(local, cloud) {
    const c = cloud && typeof cloud === 'object' ? cloud : {};
    const out = normalize({ ...cloneDefaults(), ...local });
    out.xp = Math.max(out.xp, Number(c.xp) || 0);
    out.coins = Math.max(out.coins, Number(c.coins) || 0);
    out.games = Math.max(out.games, Number(c.games) || 0);
    out.correct = Math.max(out.correct, Number(c.correct) || 0);
    out.wrong = Math.max(out.wrong, Number(c.wrong) || 0);
    out.streak = Math.max(out.streak, Number(c.streak) || 0);
    out.lastDay = out.lastDay || c.lastDay || null;
    const topics = { ...(out.topics || {}) };
    Object.entries(c.topics || {}).forEach(([name, value]) => {
      const t = topics[name] || { correct: 0, wrong: 0, games: 0 };
      topics[name] = {
        correct: Math.max(Number(t.correct) || 0, Number(value?.correct) || 0),
        wrong: Math.max(Number(t.wrong) || 0, Number(value?.wrong) || 0),
        games: Math.max(Number(t.games) || 0, Number(value?.games) || 0)
      };
    });
    out.topics = topics;
    out.achievements = [...new Set([...(out.achievements || []), ...(Array.isArray(c.achievements) ? c.achievements : [])])];
    out.level = levelFor(out.xp);
    achievementUpdate(out);
    return out;
  }

  async function restore() {
    await ensureFirebase();
    const ref = globalRef();
    if (!ref || restoring) return read();
    restoring = true;
    try {
      const snap = await ref.once('value');
      const cloud = snap.val();
      const merged = mergeCloudLocal(read(), cloud);
      save(merged);
      // Do not manufacture a new game/result during restore. Only reconcile state.
      if (!cloud || JSON.stringify(stripMeta(cloud)) !== JSON.stringify(stripMeta(merged))) {
        await ref.update(stripMeta(merged));
      }
      window.dispatchEvent(new CustomEvent('tecnomath:cloud-restored', { detail: merged }));
      return merged;
    } catch (e) {
      console.warn('TecnoMath: no se pudo restaurar progreso desde Firebase.', e);
      return read();
    } finally {
      restoring = false;
    }
  }

  function stripMeta(d) {
    return {
      xp: Number(d.xp) || 0,
      coins: Number(d.coins) || 0,
      level: levelFor(d.xp),
      streak: Number(d.streak) || 0,
      lastDay: d.lastDay || null,
      games: Number(d.games) || 0,
      correct: Number(d.correct) || 0,
      wrong: Number(d.wrong) || 0,
      topics: d.topics || {},
      achievements: Array.isArray(d.achievements) ? d.achievements : [],
      updatedAt: firebase?.database?.ServerValue?.TIMESTAMP || Date.now()
    };
  }

  async function sync() {
    await ensureFirebase();
    const ref = globalRef();
    if (!ref || syncing || restoring) return false;
    syncing = true;
    try {
      // First reconcile aggregate state without adding anything twice.
      const current = await ref.once('value');
      const cloud = current.val() || {};
      let local = mergeCloudLocal(read(), cloud);
      save(local);

      const m = getMeta();
      const pending = [...m.pending];
      for (const event of pending) {
        await ref.transaction((currentGlobal) => {
          const g = currentGlobal && typeof currentGlobal === 'object' ? currentGlobal : {};
          const processed = { ...(g.processedEvents || {}) };
          if (processed[event.id]) return g;
          const next = mergeCloudLocal(g, {});
          const updated = applyDelta(next, event.delta);
          const clean = stripMeta(updated);
          clean.processedEvents = processed;
          clean.processedEvents[event.id] = true;
          return clean;
        });
      }

      // Remove successfully sent events only after all transactions complete.
      const after = await ref.once('value');
      const cloudAfter = after.val() || {};
      const processed = cloudAfter.processedEvents || {};
      m.pending = m.pending.filter(e => !processed[e.id]);
      saveMeta(m);
      local = mergeCloudLocal(read(), cloudAfter);
      save(local);
      window.dispatchEvent(new CustomEvent('tecnomath:cloud-status', { detail: { state: 'saved', uid: authUser.uid } }));
      return true;
    } catch (e) {
      console.warn('TecnoMath: sincronización cloud no disponible; se conserva el progreso local.', e);
      window.dispatchEvent(new CustomEvent('tecnomath:cloud-status', { detail: { state: 'offline', error: e } }));
      return false;
    } finally {
      syncing = false;
    }
  }

  let syncTimer = null;
  function scheduleSync() {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => { sync().catch(() => {}); }, 250);
  }

  function bindAuth() {
    const s = getServices();
    if (!s) return;
    s.auth.onAuthStateChanged(async (user) => {
      authUser = user || null;
      if (!authUser) {
        window.dispatchEvent(new CustomEvent('tecnomath:cloud-status', { detail: { state: 'signed-out' } }));
        return;
      }
      await restore();
      await sync();
    });
  }

  async function init() {
    await ensureFirebase();
    bindAuth();
    installAutoTracking();
  }

  window.TecnoMathProgress = {
    read,
    save,
    record,
    gameResult,
    trackPlay,
    installAutoTracking,
    sync,
    restore,
    levelFor,
    reset() {
      const fresh = cloneDefaults();
      save(fresh);
      // Reset is local only; it never deletes cloud data accidentally.
      return fresh;
    }
  };

  init().catch((e) => console.warn('TecnoMath: inicialización del progreso local/cloud falló.', e));
})();
