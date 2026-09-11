/* TecnoMath Auth - Supabase Auth migration layer */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://xdszveoxdrdnwwzzvkav.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_xwUE0aN1g0rb7aOLyXPAsA_kOAX9bOA';
  const ADMIN_EMAILS = [
    'delahozbarcelojunior@gmail.com',
    'nicolenatera26@gmail.com',
    'mateobarbosamatos@gmail.com',
    'jandresvf23@gmail.com'
  ];
  const ADMIN_NAMES = {
    'delahozbarcelojunior@gmail.com': 'Junior',
    'nicolenatera26@gmail.com': 'Nicole',
    'mateobarbosamatos@gmail.com': 'Mateo',
    'jandresvf23@gmail.com': 'Jaider'
  };
  const SESSION_KEY = 'tecnomath_session';

  function loadSupabase() {
    return new Promise((resolve, reject) => {
      if (window.supabase?.createClient) return resolve();
      const existing = document.querySelector('script[data-tecnomath-supabase]');
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/dist/umd/supabase.min.js';
      script.async = false;
      script.dataset.tecnomathSupabase = 'true';
      script.onload = resolve;
      script.onerror = () => reject(new Error('No se pudo cargar Supabase.'));
      document.head.appendChild(script);
    });
  }

  let clientPromise = null;
  function getClient() {
    if (!clientPromise) clientPromise = loadSupabase().then(() => window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY));
    return clientPromise;
  }

  function emailOf(user) { return String(user?.email || '').trim().toLowerCase(); }
  function isAdminEmail(email) { return ADMIN_EMAILS.includes(String(email || '').trim().toLowerCase()); }
  function adminUsername(user) {
    const email = emailOf(user);
    return ADMIN_NAMES[email] || email.split('@')[0].replace(/[^a-z0-9._-]/g, '') || 'Admin';
  }

  async function getProfile(user) {
    if (!user) return null;
    const db = await getClient();
    const { data, error } = await db.from('tecnomath_profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function ensureProfile(user, username, extra = {}) {
    if (!user) return null;
    const db = await getClient();
    const email = emailOf(user);
    const admin = isAdminEmail(email);
    const current = await getProfile(user).catch(() => null);
    const fallbackUsername = admin ? adminUsername(user) : (username || user.user_metadata?.username || email.split('@')[0]);
    const payload = {
      id: user.id,
      username: String(current?.username || fallbackUsername).trim(),
      display_name: current?.display_name || extra.display_name || fallbackUsername,
      phone: current?.phone || extra.phone || user.phone || null,
      role: admin ? 'admin' : 'user'
    };
    const { data, error } = await db.from('tecnomath_profiles').upsert(payload, { onConflict: 'id' }).select().single();
    if (error) throw error;
    return data;
  }

  async function currentUser() {
    const db = await getClient();
    const { data, error } = await db.auth.getUser();
    if (error) return null;
    return data.user || null;
  }

  async function signIn(email, password) {
    const db = await getClient();
    const { data, error } = await db.auth.signInWithPassword({ email: String(email).trim(), password });
    if (error) throw error;
    const profile = await ensureProfile(data.user);
    setSession(profile.username);
    return { user: data.user, profile };
  }

  async function signUp(email, password, username, phone) {
    const db = await getClient();
    const redirectTo = new URL('./auth.html', window.location.href).href;
    const { data, error } = await db.auth.signUp({
      email: String(email).trim(),
      password,
      options: { emailRedirectTo: redirectTo, data: { username: String(username).trim(), phone: phone || null } }
    });
    if (error) throw error;
    if (data.user) await ensureProfile(data.user, username, { phone });
    if (data.session && data.user) setSession(username);
    return data;
  }

  async function signOut() {
    const db = await getClient();
    await db.auth.signOut();
    localStorage.removeItem(SESSION_KEY);
  }

  async function sendRecovery(email) {
    const db = await getClient();
    const redirectTo = new URL('./auth.html?mode=recovery', window.location.href).href;
    const { error } = await db.auth.resetPasswordForEmail(String(email).trim(), { redirectTo });
    if (error) throw error;
  }

  async function updatePassword(password) {
    const db = await getClient();
    const { error } = await db.auth.updateUser({ password });
    if (error) throw error;
  }

  async function updateEmail(email) {
    const db = await getClient();
    const { error } = await db.auth.updateUser({ email: String(email).trim() });
    if (error) throw error;
  }

  function setSession(username) {
    if (username) localStorage.setItem(SESSION_KEY, JSON.stringify({ username: String(username).trim() }));
  }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }
  function getSession() {
    try {
      const data = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      return data?.username ? { username: data.username } : null;
    } catch (_) { clearSession(); return null; }
  }

  async function isAdmin() {
    const user = await currentUser();
    if (!user) return false;
    const profile = await getProfile(user).catch(() => null);
    return isAdminEmail(user.email) || profile?.role === 'admin';
  }

  async function authState(callback) {
    const db = await getClient();
    const { data } = db.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user || null;
      if (!user) { clearSession(); callback(null, null); return; }
      try {
        const profile = await ensureProfile(user);
        setSession(profile.username);
        callback(user, profile);
      } catch (error) {
        console.error('TecnoMath: no se pudo cargar el perfil Supabase:', error);
        callback(user, null);
      }
    });
    return data.subscription;
  }

  window.TecnomathAuth = {
    SUPABASE_URL, ADMIN_EMAILS, ADMIN_NAMES,
    getClient, currentUser, getProfile, ensureProfile,
    signIn, signUp, signOut, sendRecovery, updatePassword, updateEmail,
    isAdmin, authState, setSession, clearSession, getSession,
    isAdminEmail, adminUsername
  };

  // API compatible con partes antiguas de TecnoMath que solo necesitan
  // sesión, usuario actual y reconocimiento de admin.
  const previous = window.Tecnomath || {};
  window.Tecnomath = Object.assign({}, previous, {
    setSession,
    logout: clearSession,
    getCurrentUser: getSession,
    getAdminEmails: () => [...ADMIN_EMAILS],
    isAdmin: () => {
      const cached = window.TecnomathCurrentAdmin;
      return !!cached || isAdminEmail(window.TecnomathAuthCachedEmail);
    },
    setAdmin: () => !!window.TecnomathCurrentAdmin,
    unsetAdmin: clearSession
  });
})();
