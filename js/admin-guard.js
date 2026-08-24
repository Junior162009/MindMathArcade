/* TecnoMath - guardia de administración */
(function () {
  'use strict';

  // Administradores por correo. Agrega aquí los demás cuando quieras.
  const ADMIN_EMAILS = [
    'delahozbarcelojunior@gmail.com'
  ];

  function firebaseReady() {
    if (!window.TecnomathFirebase) {
      throw new Error('Firebase no está inicializado. Carga js/firebase-config.js antes de admin-guard.js.');
    }
    return window.TecnomathFirebase;
  }

  function isApprovedEmail(user) {
    const email = String(user?.email || '').trim().toLowerCase();
    return ADMIN_EMAILS.includes(email);
  }

  async function getAdminProfile() {
    const cloud = firebaseReady();
    const user = cloud.auth.currentUser;
    if (!user) return null;

    const snapshot = await cloud.database.ref('users/' + user.uid).once('value');
    const profile = snapshot.val() || {};
    const role = String(profile.role || (profile.isAdmin === true ? 'admin' : 'user')).toLowerCase();

    // Un correo aprobado puede entrar aunque todavía no tenga role=admin guardado.
    if (role === 'admin' || isApprovedEmail(user)) {
      return {
        ...profile,
        uid: user.uid,
        email: user.email || profile.email || '',
        role: 'admin'
      };
    }

    return null;
  }

  async function requireAdmin(options = {}) {
    const cloud = firebaseReady();
    const redirect = options.redirect || '../auth.html';

    return new Promise((resolve, reject) => {
      const unsubscribe = cloud.auth.onAuthStateChanged(async user => {
        unsubscribe();
        try {
          if (!user) {
            window.location.replace(redirect);
            return;
          }

          const profile = await getAdminProfile();
          if (!profile) {
            alert('Acceso denegado: necesitas permisos de administrador.');
            window.location.replace('../auth.html');
            return;
          }

          resolve(profile);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  window.TecnomathAdminGuard = {
    getAdminProfile,
    requireAdmin,
    isApprovedEmail
  };
})();
