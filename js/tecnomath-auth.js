/* TecnoMath Auth — Supabase único sistema oficial */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://xdszveoxdrdnwwzzvkav.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_xwUE0aN1g0rb7aOLyXPAsA_kOAX9bOA';
  const PROD_AUTH_URL = 'https://tecnomath.online/pages/auth.html';
  const PROD_RECOVERY_URL = 'https://tecnomath.online/pages/auth.html?mode=recovery';
  const ADMIN_EMAILS = ['delahozbarcelojunior@gmail.com','nicolenatera26@gmail.com','mateobarbosamatos@gmail.com','jandresvf23@gmail.com'];
  const ADMIN_NAMES = {
    'delahozbarcelojunior@gmail.com':'Junior',
    'nicolenatera26@gmail.com':'Nicole',
    'mateobarbosamatos@gmail.com':'Mateo',
    'jandresvf23@gmail.com':'Jaider'
  };
  const SESSION_KEY = 'tecnomath_session';

  function loadSupabase() {
    return new Promise((resolve, reject) => {
      if (window.supabase?.createClient) return resolve();
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/dist/umd/supabase.min.js';
      s.async = false;
      s.dataset.tecnomathSupabase = 'true';
      s.onload = resolve;
      s.onerror = () => reject(new Error('No se pudo cargar Supabase.'));
      document.head.appendChild(s);
    });
  }

  let clientPromise = null;
  function getClient() {
    if (!clientPromise) {
      clientPromise = loadSupabase().then(() => window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: 'pkce'
        }
      }));
    }
    return clientPromise;
  }

  const emailOf = u => String(u?.email || '').trim().toLowerCase();
  const isAdminEmail = e => ADMIN_EMAILS.includes(String(e || '').trim().toLowerCase());
  const cleanUsername = u => String(u || '').trim().replace(/\s+/g, '');
  function adminUsername(u) {
    const e = emailOf(u);
    return ADMIN_NAMES[e] || e.split('@')[0].replace(/[^a-z0-9._-]/gi, '') || 'Admin';
  }

  function setSession(username) {
    const value = cleanUsername(username);
    if (value) localStorage.setItem(SESSION_KEY, JSON.stringify({ username: value }));
  }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }
  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch (_) { clearSession(); return null; }
  }

  async function currentUser() {
    const db = await getClient();
    const { data, error } = await db.auth.getUser();
    if (error) return null;
    return data.user || null;
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
    const existing = await getProfile(user);
    if (existing) {
      setSession(existing.username);
      return existing;
    }

    const email = emailOf(user);
    const admin = isAdminEmail(email);
    const metadataUsername = user.user_metadata?.username;
    const fallback = admin ? adminUsername(user) : (username || metadataUsername || email.split('@')[0]);
    const base = cleanUsername(fallback) || ('usuario_' + user.id.slice(0, 8));
    const payload = {
      id: user.id,
      username: base,
      display_name: extra.display_name || base,
      phone: extra.phone || user.phone || null,
      role: admin ? 'admin' : 'user'
    };
    const { data, error } = await db.from('tecnomath_profiles').insert(payload).select().single();
    if (error) {
      // Si otro evento creó el perfil al mismo tiempo, recuperarlo en vez de romper el login.
      const recovered = await getProfile(user).catch(() => null);
      if (recovered) { setSession(recovered.username); return recovered; }
      throw error;
    }
    setSession(data.username);
    return data;
  }

  async function refreshAccount() {
    const user = await currentUser();
    if (!user) {
      clearSession();
      window.TecnomathCurrentAdmin = null;
      return { user: null, profile: null };
    }
    const profile = await ensureProfile(user);
    setSession(profile?.username);
    window.TecnomathCurrentAdmin = profile?.role === 'admin' || isAdminEmail(user.email) ? profile : null;
    return { user, profile };
  }

  async function signIn(email, password) {
    const db = await getClient();
    const { data, error } = await db.auth.signInWithPassword({ email: String(email).trim(), password });
    if (error) throw error;
    const profile = await ensureProfile(data.user);
    setSession(profile.username);
    window.TecnomathCurrentAdmin = profile?.role === 'admin' || isAdminEmail(data.user.email) ? profile : null;
    return { user: data.user, profile };
  }

  async function signUp(email, password, username, phone) {
    const clean = cleanUsername(username);
    if (!/^[a-zA-Z0-9._-]{3,20}$/.test(clean)) throw new Error('El usuario debe tener 3 a 20 caracteres: letras, números, punto, guion o guion bajo.');
    const db = await getClient();
    const { data: existing } = await db.from('tecnomath_profiles').select('id').ilike('username', clean).limit(1);
    if (existing?.length) throw new Error('Ese nombre de usuario ya está ocupado.');
    const { data, error } = await db.auth.signUp({
      email: String(email).trim(),
      password,
      options: { emailRedirectTo: PROD_AUTH_URL, data: { username: clean, phone: phone || null } }
    });
    if (error) throw error;
    if (data.user && data.session) await ensureProfile(data.user, clean, { phone });
    return data;
  }

  async function signOut() {
    const db = await getClient();
    const { error } = await db.auth.signOut({ scope: 'local' });
    clearSession();
    window.TecnomathCurrentAdmin = null;
    if (error) throw error;
  }

  async function sendRecovery(email) {
    const db = await getClient();
    const { error } = await db.auth.resetPasswordForEmail(String(email).trim(), { redirectTo: PROD_RECOVERY_URL });
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
  async function updateProfile(changes = {}) {
    const user = await currentUser();
    if (!user) throw new Error('Debes iniciar sesión.');
    const db = await getClient();
    const safe = {};
    if (changes.username !== undefined) safe.username = cleanUsername(changes.username);
    if (changes.display_name !== undefined) safe.display_name = String(changes.display_name).trim();
    if (changes.phone !== undefined) safe.phone = changes.phone ? String(changes.phone).trim() : null;
    const { data, error } = await db.from('tecnomath_profiles').update(safe).eq('id', user.id).select().single();
    if (error) throw error;
    setSession(data.username);
    return data;
  }

  async function saveGameProgress(gameId, progress) {
    const user = await currentUser();
    if (!user) return null;
    const db = await getClient();
    const { data, error } = await db.rpc('tecnomath_save_game_progress', {
      p_game_id: String(gameId).trim(),
      p_progress: progress ?? {}
    });
    if (error) throw error;
    return data;
  }

  async function getGameProgress(gameId) {
    const user = await currentUser();
    if (!user) return null;
    const db = await getClient();
    const { data, error } = await db.rpc('tecnomath_get_game_progress', { p_game_id: String(gameId).trim() });
    if (error) throw error;
    return data || null;
  }

  async function deleteGameProgress(gameId) {
    const user = await currentUser();
    if (!user) return false;
    const db = await getClient();
    const { error } = await db.from('tecnomath_game_progress').delete().eq('user_id', user.id).eq('game_id', String(gameId).trim());
    if (error) throw error;
    return true;
  }

  async function isAdmin() {
    const { user, profile } = await refreshAccount();
    return !!user && (isAdminEmail(user.email) || profile?.role === 'admin');
  }

  async function authState(callback) {
    const db = await getClient();
    const { data } = db.auth.onAuthStateChange((event, session) => {
      const user = session?.user || null;
      if (!user) {
        clearSession();
        window.TecnomathCurrentAdmin = null;
        callback(null, null, event);
        return;
      }
      setTimeout(async () => {
        try {
          const profile = await ensureProfile(user);
          window.TecnomathCurrentAdmin = profile?.role === 'admin' || isAdminEmail(user.email) ? profile : null;
          callback(user, profile, event);
        } catch (e) {
          console.error('TecnoMath Supabase profile sync:', e);
          callback(user, null, event);
        }
      }, 0);
    });
    return data.subscription;
  }

  window.TecnomathAuth = {
    SUPABASE_URL, PROD_AUTH_URL, PROD_RECOVERY_URL, ADMIN_EMAILS, ADMIN_NAMES,
    getClient, currentUser, getProfile, ensureProfile, refreshAccount,
    signIn, signUp, signOut, sendRecovery, updatePassword, updateEmail, updateProfile,
    saveGameProgress, getGameProgress, deleteGameProgress,
    isAdmin, authState, setSession, clearSession, getSession, isAdminEmail, adminUsername
  };

  window.Tecnomath = Object.assign({}, window.Tecnomath || {}, {
    setSession, logout: signOut,
    getCurrentUser: getSession,
    getAdminEmails: () => [...ADMIN_EMAILS],
    isAdmin: () => !!window.TecnomathCurrentAdmin,
    setAdmin: () => !!window.TecnomathCurrentAdmin,
    unsetAdmin: clearSession,
    saveGameProgress, getGameProgress
  });

  function syncPortalFromSupabase() {
    if (!(location.pathname === '/' || location.pathname.endsWith('/index.html'))) return;
    authState((user, profile) => {
      const display = document.getElementById('userDisplay');
      const authLink = document.getElementById('authLink');
      const logoutBtn = document.getElementById('logoutBtn');
      if (!user) {
        if (display) display.textContent = 'Invitado';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (authLink) { authLink.href = 'pages/auth.html'; authLink.textContent = '🔑 ACCEDER'; }
        return;
      }
      const username = cleanUsername(profile?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'Usuario');
      setSession(username);
      if (display) display.textContent = username;
      if (authLink) { authLink.href = 'pages/profile.html'; authLink.textContent = '👤 PERFIL'; }
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncPortalFromSupabase, { once: true });
  else syncPortalFromSupabase();
})();
