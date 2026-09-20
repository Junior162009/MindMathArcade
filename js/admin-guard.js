/* TecnoMath Admin Guard — guardia única para paneles de administración */
(function () {
  'use strict';

  function isClassA(profile) {
    return String(profile?.role || '').toLowerCase() === 'admin' &&
      String(profile?.admin_class || '').toUpperCase() === 'A';
  }

  function isAdmin(profile) {
    return String(profile?.role || '').toLowerCase() === 'admin';
  }

  function loginUrl() {
    return new URL('../auth.html', location.href).href;
  }

  function deny(message) {
    document.body.innerHTML =
      '<main style="font-family:Arial,sans-serif;text-align:center;padding:60px;color:#fff;background:#060610;min-height:100vh">' +
      '<h1>⛔ Acceso restringido</h1><p>' + (message || 'Esta cuenta no tiene permisos de administrador.') +
      '</p><a style="color:#00ffff" href="' + loginUrl() + '">Iniciar sesión</a></main>';
  }

  function requireAdmin(options) {
    options = options || {};
    var redirect = options.redirect !== false;

    return (async function () {
      try {
        if (!window.TecnomathAuth) {
          throw new Error('TecnomathAuth no está disponible. Verifica que tecnoMath-auth.js cargue antes de admin-guard.js.');
        }

        var user = await window.TecnomathAuth.currentUser();
        if (!user) {
          if (redirect) location.replace(loginUrl());
          throw new Error('Sesión no encontrada.');
        }

        var profile = await window.TecnomathAuth.getProfile(user);
        if (!isAdmin(profile)) {
          if (redirect) deny();
          throw new Error('La cuenta no tiene rol de administrador.');
        }

        window.TecnomathCurrentAdmin = profile;
        document.documentElement.dataset.tecnomathAdmin = 'true';

        var detail = { user: user, profile: profile };
        window.dispatchEvent(new CustomEvent('tecnomath:admin-ready', { detail: detail }));

        return detail;
      } catch (error) {
        console.error('TecnoMath Admin Guard:', error);
        throw error;
      }
    })();
  }

  /* Exponer la API INMEDIATAMENTE, antes de iniciar cualquier operación async. */
  window.TecnomathAdminGuard = {
    isAdmin: isAdmin,
    isClassA: isClassA,
    requireAdmin: requireAdmin
  };

  /* Arranque opcional: las páginas pueden llamar requireAdmin por su cuenta. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (document.body?.dataset?.adminGuardAuto === 'true') requireAdmin({ redirect: true }).catch(function () {});
    }, { once: true });
  } else if (document.body?.dataset?.adminGuardAuto === 'true') {
    requireAdmin({ redirect: true }).catch(function () {});
  }
})();
