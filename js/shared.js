// Tecnomath Shared API v2.0
(function() {
  const STORAGE_KEY = 'tecnomath_users';
  const SESSION_KEY = 'tecnomath_session';
  const COINS_PREFIX = 'tecnomath_coins_';
  const GAME_COINS_PREFIX = 'tecnomath_gamecoins_';
  const PROGRESS_PREFIX = 'tecnomath_progress_';

  function getUsers() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
      const users = JSON.parse(data);
      return Array.isArray(users) ? users : [];
    } catch (error) {
      // No bloquea el acceso si una versión anterior dejó datos dañados.
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }

  function findUser(username) {
    const users = getUsers();
    return users.find(u => u.username === username);
  }

  function createUser(username, password) {
    const users = getUsers();
    let user = findUser(username);
    if (user) return null;
    user = {
      username: username,
      password: password,
      isAdmin: false,
      created: new Date().toISOString()
    };
    users.push(user);
    saveUsers(users);
    return user;
  }

  window.Tecnomath = {
    login: function(username, password) {
      username = (username || '').trim();
      password = (password || '').trim();
      if (!username || !password) return { success: false, message: 'Usuario y contraseña requeridos' };
      const user = findUser(username);
      if (!user || user.password !== password) {
        return { success: false, message: 'Usuario o contraseña incorrectos' };
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify({ username: user.username }));
      return { success: true, username: user.username };
    },

    register: function(username, password) {
      username = (username || '').trim();
      password = (password || '').trim();
      if (username.length < 3) return { success: false, message: 'El usuario debe tener al menos 3 caracteres' };
      if (password.length < 4) return { success: false, message: 'La contraseña debe tener al menos 4 caracteres' };
      if (findUser(username)) return { success: false, message: 'Ese usuario ya existe. Usa ENTRAR.' };
      const user = createUser(username, password);
      localStorage.setItem(SESSION_KEY, JSON.stringify({ username: user.username }));
      return { success: true, username: user.username };
    },

    logout: function() {
      localStorage.removeItem(SESSION_KEY);
    },

    // La autenticación principal vive en Firebase; los juegos conservan este
    // identificador local para asociar monedas y progreso al perfil correcto.
    setSession: function(username) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ username: username }));
    },

    getCurrentUser: function() {
      const session = localStorage.getItem(SESSION_KEY);
      if (!session) return null;
      try {
        const { username } = JSON.parse(session);
        return username ? { username: username } : null;
      } catch (e) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
    },

    // Comprueba si el usuario actual es administrador
    isAdmin: function() {
      const user = this.getCurrentUser();
      if (!user) return false;
      const currentUser = findUser(user.username);
      return currentUser && currentUser.isAdmin === true;
    },

    // Convierte a un usuario en administrador
    setAdmin: function(username) {
      const users = getUsers();
      let user = users.find(u => u.username === username);
      if (!user) {
        // Solo conserva la marca local del modo administrador; la contraseña
        // de una cuenta autenticada con Firebase nunca se guarda aquí.
        user = { username: username, password: '', isAdmin: true, created: new Date().toISOString() };
        users.push(user);
      } else {
        user.isAdmin = true;
      }
      saveUsers(users);
    },

    // NUEVA FUNCIÓN: Quita los privilegios de administrador
    unsetAdmin: function(username) {
      const users = getUsers();
      const user = users.find(u => u.username === username);
      if (user) {
        user.isAdmin = false;
        saveUsers(users);
      }
    },

    getCoins: function() {
      if (this.isAdmin()) return Infinity;
      const user = this.getCurrentUser();
      if (!user) return 0;
      const coins = localStorage.getItem(COINS_PREFIX + user.username);
      return coins ? parseInt(coins, 10) : 0;
    },

    addCoins: function(amount) {
      if (this.isAdmin()) return true;
      const user = this.getCurrentUser();
      if (!user) return false;
      const current = this.getCoins();
      localStorage.setItem(COINS_PREFIX + user.username, current + amount);
      return true;
    },

    spendCoins: function(amount) {
      if (this.isAdmin()) return true;
      const user = this.getCurrentUser();
      if (!user) return false;
      const current = this.getCoins();
      if (current < amount) return false;
      localStorage.setItem(COINS_PREFIX + user.username, current - amount);
      return true;
    },

    getGameCoins: function(gameId) {
      if (this.isAdmin()) return Infinity;
      const user = this.getCurrentUser();
      if (!user) return 0;
      const key = GAME_COINS_PREFIX + user.username + '_' + gameId;
      const data = localStorage.getItem(key);
      return data ? parseInt(data, 10) : 0;
    },

    setGameCoins: function(gameId, amount) {
      if (this.isAdmin()) return;
      const user = this.getCurrentUser();
      if (!user) return;
      const key = GAME_COINS_PREFIX + user.username + '_' + gameId;
      localStorage.setItem(key, amount);
    },

    exchangeGlobalToLocal: function(gameId, globalAmount) {
      if (this.isAdmin()) return true;
      const rate = 0.9;
      const localAmount = Math.floor(globalAmount * rate);
      if (this.getCoins() < globalAmount) return false;
      if (!this.spendCoins(globalAmount)) return false;
      const currentLocal = this.getGameCoins(gameId);
      this.setGameCoins(gameId, currentLocal + localAmount);
      return true;
    },

    exchangeLocalToGlobal: function(gameId, localAmount) {
      if (this.isAdmin()) return true;
      const rate = 0.9;
      const globalAmount = Math.floor(localAmount * rate);
      if (this.getGameCoins(gameId) < localAmount) return false;
      const newLocal = this.getGameCoins(gameId) - localAmount;
      this.setGameCoins(gameId, newLocal);
      this.addCoins(globalAmount);
      return true;
    },

    getProgress: function(gameId) {
      const user = this.getCurrentUser();
      if (!user) return {};
      const key = PROGRESS_PREFIX + user.username + '_' + gameId;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : {};
    },

    setProgress: function(gameId, progressData) {
      const user = this.getCurrentUser();
      if (!user) return;
      const key = PROGRESS_PREFIX + user.username + '_' + gameId;
      localStorage.setItem(key, JSON.stringify(progressData));
    },

    updateHighScore: function(gameId, score) {
      const progress = this.getProgress(gameId);
      if (!progress.highScore || score > progress.highScore) {
        progress.highScore = score;
        this.setProgress(gameId, progress);
      }
    }
  };
})();
