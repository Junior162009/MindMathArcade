/* TecnoMath - reconocimiento automático de administradores */
(function () {
  'use strict';

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

  function firebaseReady() {
    if (!window.TecnomathFirebase) throw new Error('Firebase no está inicializado.');
    return window.TecnomathFirebase;
  }

  function normalizedEmail(user) {
    return String(user && user.email || '').trim().toLowerCase();
  }

  function isApprovedEmail(user) {
    return ADMIN_EMAILS.includes(normalizedEmail(user));
  }

  async function getAdminProfile(userArg) {
    const cloud = firebaseReady();
    const user = userArg || cloud.auth.currentUser;
    if (!user) return null;

    const email = normalizedEmail(user);
    if (ADMIN_EMAILS.includes(email)) {
      const ref = cloud.database.ref('users/' + user.uid);
      const snapshot = await ref.once('value');
      const current = snapshot.val() || {};
      const username = current.username || ADMIN_NAMES[email] || email.split('@')[0];

      await ref.update({
        username: username,
        email: user.email,
        role: 'admin',
        isAdmin: true,
        provider: user.providerData && user.providerData[0]
          ? user.providerData[0].providerId
          : 'firebase'
      });

      return Object.assign({}, current, {
        uid: user.uid,
        username: username,
        email: user.email,
        role: 'admin',
        isAdmin: true
      });
    }

    const snapshot = await cloud.database.ref('users/' + user.uid).once('value');
    const profile = snapshot.val() || {};
    const role = String(profile.role || '').toLowerCase();
    return role === 'admin' || profile.isAdmin === true
      ? Object.assign({}, profile, { uid: user.uid, role: 'admin', isAdmin: true })
      : null;
  }

  // Reconoce al administrador inmediatamente después del login,
  // tanto con Google como con correo/contraseña.
  async function initializeAdminRecognition() {
    const cloud = firebaseReady();
    return new Promise(function (resolve) {
      const unsubscribe = cloud.auth.onAuthStateChanged(async function (user) {
        unsubscribe();
        if (!user) return resolve(null);

        try {
          const profile = await getAdminProfile(user);
          if (profile) {
            window.TecnomathCurrentAdmin = profile;
            window.TecnomathIsAdmin = true;
            document.documentElement.classList.add('is-admin');
            if (document.body) document.body.classList.add('is-admin');
            window.dispatchEvent(new CustomEvent('tecnomath:admin-ready', {
              detail: profile
            }));
          }
          resolve(profile);
        } catch (error) {
          console.error('TecnoMath: error reconociendo administrador:', error);
          resolve(null);
        }
      });
    });
  }

  async function requireAdmin(options) {
    options = options || {};
    const cloud = firebaseReady();
    const redirect = options.redirect || '../auth.html';

    return new Promise(function (resolve, reject) {
      const unsubscribe = cloud.auth.onAuthStateChanged(async function (user) {
        unsubscribe();
        try {
          if (!user) {
            window.location.replace(redirect);
            return;
          }

          const profile = await getAdminProfile(user);
          if (!profile) {
            alert('Acceso denegado: necesitas permisos de administrador.');
            window.location.replace(redirect);
            return;
          }

          window.TecnomathCurrentAdmin = profile;
          window.TecnomathIsAdmin = true;
          resolve(profile);
        } catch (error) {
          console.error('TecnoMath admin guard:', error);
          reject(error);
        }
      });
    });
  }

  window.TecnomathAdminGuard = {
    ADMIN_EMAILS: ADMIN_EMAILS,
    ADMIN_NAMES: ADMIN_NAMES,
    isApprovedEmail: isApprovedEmail,
    getAdminProfile: getAdminProfile,
    initializeAdminRecognition: initializeAdminRecognition,
    requireAdmin: requireAdmin
  };

  // Ejecutar también en el index principal: no hay que abrir /admin primero.
  function startRecognition() {
    try {
      if (window.TecnomathFirebase) initializeAdminRecognition();
      else window.addEventListener('tecnomath:firebase-ready', initializeAdminRecognition, { once: true });
    } catch (error) {
      console.error('TecnoMath admin initialization:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startRecognition, { once: true });
  } else {
    startRecognition();
  }
})();
