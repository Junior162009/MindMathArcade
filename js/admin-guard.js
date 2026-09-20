/* TecnoMath Admin Guard — Supabase único sistema de autorización */
(function () {
  'use strict';

  let readyPromise = null;

  function goLogin() {
    location.replace(new URL('../auth.html', location.href).href);
  }

  async function requireAdmin(options = {}) {
    if (readyPromise) return readyPromise;

    readyPromise = (async () => {
      const auth = window.TecnomathAuth;
      if (!auth) throw new Error('El sistema de autenticación no está disponible.');

      const user = await auth.currentUser();
      if (!user) {
        if (options.redirect !== false) goLogin();
        throw new Error('Debes iniciar sesión.');
      }

      const profile = await auth.getProfile(user);
      if (!profile || String(profile.role || '').toLowerCase() !== 'admin') {
        document.documentElement.dataset.tecnomathAdmin = 'false';
        if (options.redirect !== false) {
          document.body.innerHTML = '<main style="font-family:Arial;text-align:center;padding:60px;background:#060610;color:#fff;min-height:100vh"><h1>⛔ Acceso restringido</h1><p>Esta cuenta no tiene permisos de administrador.</p><a href="../index.html" style="color:#00ffff">Volver</a></main>';
        }
        throw new Error('Esta cuenta no tiene permisos de administrador.');
      }

      const detail = { user, profile };
      window.TecnomathCurrentAdmin = profile;
      window.TecnomathCurrentAdminUser = user;
      document.documentElement.dataset.tecnomathAdmin = 'true';
      window.dispatchEvent(new CustomEvent('tecnomath:admin-ready', { detail }));
      return detail;
    })().catch(error => {
      console.error('TecnoMath Admin Guard:', error);
      throw error;
    });

    return readyPromise;
  }

  function isClassA(profile) {
    const p = profile || window.TecnomathCurrentAdmin;
    return String(p?.role || '').toLowerCase() === 'admin' &&
      String(p?.admin_class ?? p?.class ?? p?.adminClass ?? '').toUpperCase() === 'A';
  }

  window.TecnomathAdminGuard = { requireAdmin, isClassA };

  // Admin pages can call this without depending on DOM timing.
  requireAdmin({ redirect: true }).catch(() => {});
})();
