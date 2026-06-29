// Tecnomath Shared API v2.0
(function() {
  const STORAGE_KEY = 'tecnomath_users';
  const SESSION_KEY = 'tecnomath_session';
  const COINS_PREFIX = 'tecnomath_coins_';
  const GAME_COINS_PREFIX = 'tecnomath_gamecoins_';
  const PROGRESS_PREFIX = 'tecnomath_progress_';

  function getUsers() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  function saveUsers(users) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }

  function findUser(username) {
    const users = getUsers();
    return users.find(u => u.username === username);
  }

  function upsertUser(username, password) {
    const users = getUsers();
    let user = findUser(username);
    if (!user) {
      user = {
        username: username,
        password: password,
        isAdmin: false,
        created: new Date().toISOString()
      };
      users.push(user);
    } else {
      user.password = password;
    }
    saveUsers(users);
    return user;
  }

  window.Tecnomath = {
    login: function(username, password) {
      if (!username || !password) return { success: false, message: 'Usuario y contraseña requeridos' };
      const user = upsertUser(username, password);
      localStorage.setItem(SESSION_KEY, JSON.stringify({ username: user.username }));
      return { success: true, username: user.username };
    },

    logout: function() {
      localStorage.removeItem(SESSION_KEY);
    },

    getCurrentUser: function() {
      const session = localStorage.getItem(SESSION_KEY);
      if (!session) return null;
      try {
        const { username } = JSON.parse(session);
        const user = findUser(username);
        return user ? { username: user.username } : null;
      } catch (e) {
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
      const user = users.find(u => u.username === username);
      if (user) {
        user.isAdmin = true;
        saveUsers(users);
      }
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
