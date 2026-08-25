/* TecnoMath - guardia única de administración basada en Firebase */
(function () {
  'use strict';

  // Correos autorizados para convertirse automáticamente en administradores
  // al iniciar sesión con Google o con correo/contraseña.
  const ADMIN_EMAILS = [
    'delahozbarcelojunior@gmail.com',
    'nicolenatera26@gmail.com',
    'mateobarbosamatos@gmail.com',
    'jandresvf23@gmail.com'
  ];

  function firebaseReady() {
    if (!window.TecnomathFirebase) throw new Error('Firebase no está inicializado.');
    return window.TecnomathFirebase;
  }

  function isApprovedEmail(user) {
    return ADMIN_EMAILS.includes(String(user?.email || '').trim().toLowerCase());
  }

  async function getAdminProfile() {
    const cloud = firebaseReady();
    const user = cloud.auth.currentUser;
    if (!user) return null;

    if (isApprovedEmail(user)) {
      const ref = cloud.database.ref('users/' + user.uid);
      const snapshot = await ref.once('value');
      const current = snapshot.val() || {};
      const email = String(user.email || '').trim().toLowerCase();
      const defaultUsername = email === 'nicolenatera26@gmail.com'
        ? 'Nicole'
        : email === 'mateobarbosamatos@gmail.com'
          ? 'Mateo'
          : email === 'jandresvf23@gmail.com'
            ? 'Jaider'
            : 'Junior';
      const username = current.username || defaultUsername;
      await ref.update({
        username,
        email: user.email,
        role: 'admin',
        isAdmin: true,
        provider: user.providerData?.[0]?.providerId || 'firebase',
        updatedAt: cloud.serverTimestamp
      });
      return { ...current, uid: user.uid, username, email: user.email, role: 'admin', isAdmin: true };
    }

    const snapshot = await cloud.database.ref('users/' + user.uid).once('value');
    const profile = snapshot.val() || {};
    const role = String(profile.role || (profile.isAdmin === true ? 'admin' : 'user')).toLowerCase();
    return role === 'admin' ? { ...profile, uid: user.uid, role: 'admin' } : null;
  }

  async function requireAdmin(options = {}) {
    const cloud = firebaseReady();
    const redirect = options.redirect || '../auth.html';
    return new Promise((resolve, reject) => {
      const unsubscribe = cloud.auth.onAuthStateChanged(async user => {
        unsubscribe();
        try {
          if (!user) { window.location.replace(redirect); return; }
          const profile = await getAdminProfile();
          if (!profile) {
            alert('Acceso denegado: necesitas permisos de administrador.');
            window.location.replace(redirect);
            return;
          }
          resolve(profile);
        } catch (error) {
          console.error('TecnoMath admin guard:', error);
          reject(error);
        }
      });
    });
  }

  window.TecnomathAdminGuard = { getAdminProfile, requireAdmin, isApprovedEmail, ADMIN_EMAILS };
})();
