// Tecnomath Shared API v1.0
(function() {
  const STORAGE_KEY = 'tecnomath_users';
  const SESSION_KEY = 'tecnomath_session';
  const COINS_KEY = 'tecnomath_coins_';

  // Obtener todos los usuarios guardados
  function getUsers() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  // Guardar lista de usuarios
  function saveUsers(users) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }

  // Buscar usuario por nombre
  function findUser(username) {
    const users = getUsers();
    return users.find(u => u.username === username);
  }

  // Crear o actualizar usuario
  function upsertUser(username, password) {
    const users = getUsers();
    let user = users.find(u => u.username === username);
    if (!user) {
      user = {
        username: username,
        password: password, // en producción usaríamos hash
        created: new Date().toISOString()
      };
      users.push(user);
    } else {
      // actualizar contraseña si es distinta
      user.password = password;
    }
    saveUsers(users);
    return user;
  }

  window.Tecnomath = {
    // Iniciar sesión (registro automático si no existe)
    login: function(username, password) {
      if (!username || !password) return { success: false, message: 'Usuario y contraseña requeridos' };
      const user = upsertUser(username, password);
      localStorage.setItem(SESSION_KEY, JSON.stringify({ username: user.username }));
      return { success: true, username: user.username };
    },

    // Cerrar sesión
    logout: function() {
      localStorage.removeItem(SESSION_KEY);
    },

    // Obtener usuario actual
    getCurrentUser: function() {
      const session = localStorage.getItem(SESSION_KEY);
      if (!session) return null;
      try {
        const { username } = JSON.parse(session);
        const user = findUser(username);
        return user ? { username: user.username } : null;
      } catch(e) {
        return null;
      }
    },

    // Obtener monedas del usuario actual
    getCoins: function() {
      const user = this.getCurrentUser();
      if (!user) return 0;
      const coins = localStorage.getItem(COINS_KEY + user.username);
      return coins ? parseInt(coins, 10) : 0;
    },

    // Sumar monedas
    addCoins: function(amount) {
      const user = this.getCurrentUser();
      if (!user) return false;
      const current = this.getCoins();
      localStorage.setItem(COINS_KEY + user.username, current + amount);
      return true;
    },

    // Gastar monedas (retorna true si tenía suficientes)
    spendCoins: function(amount) {
      const user = this.getCurrentUser();
      if (!user) return false;
      const current = this.getCoins();
      if (current < amount) return false;
      localStorage.setItem(COINS_KEY + user.username, current - amount);
      return true;
    },

    // Progreso por juego (objeto genérico)
    getProgress: function(gameId) {
      const user = this.getCurrentUser();
      if (!user) return {};
      const key = 'tecnomath_progress_' + user.username + '_' + gameId;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : {};
    },

    setProgress: function(gameId, progressData) {
      const user = this.getCurrentUser();
      if (!user) return;
      const key = 'tecnomath_progress_' + user.username + '_' + gameId;
      localStorage.setItem(key, JSON.stringify(progressData));
    },

    // Actualizar mejor puntuación (atajo)
    updateHighScore: function(gameId, score) {
      const progress = this.getProgress(gameId);
      if (!progress.highScore || score > progress.highScore) {
        progress.highScore = score;
        this.setProgress(gameId, progress);
      }
    }
  };
})();
