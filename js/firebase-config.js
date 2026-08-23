// Configuración compartida de Firebase para la autenticación y los perfiles.
(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyCfY0VT4fQ5emX4R2LdUXU3FxjBTtY7Gzc",
    authDomain: "tecnomath-sync-6058a.firebaseapp.com",
    databaseURL: "https://tecnomath-sync-6058a-default-rtdb.firebaseio.com",
    projectId: "tecnomath-sync-6058a",
    storageBucket: "tecnomath-sync-6058a.firebasestorage.app",
    messagingSenderId: "237823560752",
    appId: "1:237823560752:web:adc1e5b396b5a0e0d671f5"
  };

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  window.TecnomathFirebase = {
    auth: firebase.auth(),
    database: firebase.database(),
    serverTimestamp: firebase.database.ServerValue.TIMESTAMP
  };
})();
