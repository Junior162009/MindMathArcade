// Tecnomath Shared API v2.1
(function() {

    const STORAGE_KEY = 'tecnomath_users';
    const SESSION_KEY = 'tecnomath_session';
    const ADMIN_SESSION_KEY = 'tecnomath_admin_session';
    const COINS_PREFIX = 'tecnomath_coins_';
    const GAME_COINS_PREFIX = 'tecnomath_gamecoins_';
    const PROGRESS_PREFIX = 'tecnomath_progress_';

    // ============================================================
    // ADMINISTRADORES AUTORIZADOS
    // ============================================================
    // IMPORTANTE:
    // El nombre debe coincidir EXACTAMENTE con el usuario de la cuenta.
    //
    // Junior      -> código 1983
    // Nicole      -> código 2024
    // Mateo       -> código 7777
    // Jaider      -> código 8888
    //
    // La relación código -> usuario se valida en index.html.
    // Aquí solamente definimos quiénes pueden ser administradores.
    const ADMIN_USERS = [
        'Junior',
        'Nicole',
        'Mateo',
        'Jaider'
    ];


    // ============================================================
    // USUARIOS LOCALES
    // ============================================================

    function getUsers() {
        const data = localStorage.getItem(STORAGE_KEY);

        if (!data) return [];

        try {
            const users = JSON.parse(data);
            return Array.isArray(users) ? users : [];
        } catch (error) {
            localStorage.removeItem(STORAGE_KEY);
            return [];
        }
    }


    function saveUsers(users) {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(users)
        );
    }


    function findUser(username) {
        const users = getUsers();

        return users.find(
            u => u.username.toLowerCase() === username.toLowerCase()
        );
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


    // ============================================================
    // API PRINCIPAL
    // ============================================================

    window.Tecnomath = {

        // ========================================================
        // LOGIN
        // ========================================================

        login: function(username, password) {

            username = (username || '').trim();
            password = (password || '').trim();

            if (!username || !password) {
                return {
                    success: false,
                    message: 'Usuario y contraseña requeridos'
                };
            }

            const user = findUser(username);

            if (!user || user.password !== password) {
                return {
                    success: false,
                    message: 'Usuario o contraseña incorrectos'
                };
            }

            localStorage.setItem(
                SESSION_KEY,
                JSON.stringify({
                    username: user.username
                })
            );

            // IMPORTANTE:
            // Al iniciar sesión no se conserva un modo admin
            // de otra cuenta.
            localStorage.removeItem(ADMIN_SESSION_KEY);

            return {
                success: true,
                username: user.username
            };
        },


        // ========================================================
        // REGISTRO
        // ========================================================

        register: function(username, password) {

            username = (username || '').trim();
            password = (password || '').trim();

            if (username.length < 3) {
                return {
                    success: false,
                    message: 'El usuario debe tener al menos 3 caracteres'
                };
            }

            if (password.length < 4) {
                return {
                    success: false,
                    message: 'La contraseña debe tener al menos 4 caracteres'
                };
            }

            if (findUser(username)) {
                return {
                    success: false,
                    message: 'Ese usuario ya existe. Usa ENTRAR.'
                };
            }

            const user = createUser(username, password);

            if (!user) {
                return {
                    success: false,
                    message: 'No se pudo crear el usuario'
                };
            }

            localStorage.setItem(
                SESSION_KEY,
                JSON.stringify({
                    username: user.username
                })
            );

            localStorage.removeItem(ADMIN_SESSION_KEY);

            return {
                success: true,
                username: user.username
            };
        },


        // ========================================================
        // LOGOUT
        // ========================================================

        logout: function() {

            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(ADMIN_SESSION_KEY);
        },


        // ========================================================
        // SESIÓN
        // ========================================================

        setSession: function(username) {

            username = (username || '').trim();

            if (!username) return;

            localStorage.setItem(
                SESSION_KEY,
                JSON.stringify({
                    username: username
                })
            );

            // Evita conservar admin de una sesión anterior.
            localStorage.removeItem(ADMIN_SESSION_KEY);
        },


        getCurrentUser: function() {

            const session = localStorage.getItem(SESSION_KEY);

            if (!session) return null;

            try {

                const data = JSON.parse(session);

                const username = data.username;

                if (!username) return null;

                return {
                    username: username
                };

            } catch (e) {

                localStorage.removeItem(SESSION_KEY);

                return null;
            }
        },


        // ========================================================
        // COMPROBAR SI ES ADMIN
        // ========================================================

        isAdmin: function() {

            const user = this.getCurrentUser();

            if (!user) return false;

            const username = user.username.trim().toLowerCase();

            // Solo los usuarios incluidos en ADMIN_USERS
            // pueden ser administradores.
            const authorized = ADMIN_USERS.some(
                admin =>
                    admin.toLowerCase() === username
            );

            if (!authorized) {

                // Si alguien tenía una sesión admin antigua,
                // se elimina inmediatamente.
                if (
                    localStorage.getItem(ADMIN_SESSION_KEY) ===
                    user.username
                ) {
                    localStorage.removeItem(ADMIN_SESSION_KEY);
                }

                return false;
            }

            // El usuario autorizado además debe haber activado
            // correctamente el modo administrador.
            return (
                localStorage.getItem(ADMIN_SESSION_KEY) ===
                user.username
            );
        },


        // ========================================================
        // ACTIVAR ADMIN
        // ========================================================

        setAdmin: function(username) {

            if (!username) return false;

            username = username.trim();

            const authorized = ADMIN_USERS.some(
                admin =>
                    admin.toLowerCase() ===
                    username.toLowerCase()
            );

            if (!authorized) {

                console.warn(
                    '🚫 Usuario NO autorizado como administrador:',
                    username
                );

                localStorage.removeItem(ADMIN_SESSION_KEY);

                return false;
            }

            // Guardamos el nombre real de la cuenta.
            const realAdmin = ADMIN_USERS.find(
                admin =>
                    admin.toLowerCase() ===
                    username.toLowerCase()
            );

            localStorage.setItem(
                ADMIN_SESSION_KEY,
                realAdmin
            );

            console.log(
                '👑 Administrador activado:',
                realAdmin
            );

            return true;
        },


        // ========================================================
        // SALIR DEL MODO ADMIN
        // ========================================================

        unsetAdmin: function(username) {

            const currentAdmin =
                localStorage.getItem(ADMIN_SESSION_KEY);

            if (
                currentAdmin &&
                username &&
                currentAdmin.toLowerCase() ===
                username.toLowerCase()
            ) {
                localStorage.removeItem(
                    ADMIN_SESSION_KEY
                );
            }
        },


        // ========================================================
        // MONEDAS
        // ========================================================

        getCoins: function() {

            if (this.isAdmin()) return Infinity;

            const user = this.getCurrentUser();

            if (!user) return 0;

            const coins =
                localStorage.getItem(
                    COINS_PREFIX + user.username
                );

            return coins
                ? parseInt(coins, 10)
                : 0;
        },


        addCoins: function(amount) {

            if (this.isAdmin()) return true;

            const user = this.getCurrentUser();

            if (!user) return false;

            const current = this.getCoins();

            localStorage.setItem(
                COINS_PREFIX + user.username,
                current + amount
            );

            return true;
        },


        spendCoins: function(amount) {

            if (this.isAdmin()) return true;

            const user = this.getCurrentUser();

            if (!user) return false;

            const current = this.getCoins();

            if (current < amount) return false;

            localStorage.setItem(
                COINS_PREFIX + user.username,
                current - amount
            );

            return true;
        },


        // ========================================================
        // MONEDAS POR JUEGO
        // ========================================================

        getGameCoins: function(gameId) {

            if (this.isAdmin()) return Infinity;

            const user = this.getCurrentUser();

            if (!user) return 0;

            const key =
                GAME_COINS_PREFIX +
                user.username +
                '_' +
                gameId;

            const data =
                localStorage.getItem(key);

            return data
                ? parseInt(data, 10)
                : 0;
        },


        setGameCoins: function(gameId, amount) {

            if (this.isAdmin()) return;

            const user = this.getCurrentUser();

            if (!user) return;

            const key =
                GAME_COINS_PREFIX +
                user.username +
                '_' +
                gameId;

            localStorage.setItem(
                key,
                amount
            );
        },


        // ========================================================
        // CAMBIO GLOBAL → LOCAL
        // ========================================================

        exchangeGlobalToLocal: function(
            gameId,
            globalAmount
        ) {

            if (this.isAdmin()) return true;

            const rate = 0.9;

            const localAmount =
                Math.floor(
                    globalAmount * rate
                );

            if (
                this.getCoins() <
                globalAmount
            ) {
                return false;
            }

            if (
                !this.spendCoins(
                    globalAmount
                )
            ) {
                return false;
            }

            const currentLocal =
                this.getGameCoins(gameId);

            this.setGameCoins(
                gameId,
                currentLocal + localAmount
            );

            return true;
        },


        // ========================================================
        // CAMBIO LOCAL → GLOBAL
        // ========================================================

        exchangeLocalToGlobal: function(
            gameId,
            localAmount
        ) {

            if (this.isAdmin()) return true;

            const rate = 0.9;

            const globalAmount =
                Math.floor(
                    localAmount * rate
                );

            if (
                this.getGameCoins(gameId) <
                localAmount
            ) {
                return false;
            }

            const newLocal =
                this.getGameCoins(gameId) -
                localAmount;

            this.setGameCoins(
                gameId,
                newLocal
            );

            this.addCoins(
                globalAmount
            );

            return true;
        },


        // ========================================================
        // PROGRESO
        // ========================================================

        getProgress: function(gameId) {

            const user =
                this.getCurrentUser();

            if (!user) return {};

            const key =
                PROGRESS_PREFIX +
                user.username +
                '_' +
                gameId;

            const data =
                localStorage.getItem(key);

            if (!data) return {};

            try {
                return JSON.parse(data);
            } catch (e) {
                return {};
            }
        },


        setProgress: function(
            gameId,
            progressData
        ) {

            const user =
                this.getCurrentUser();

            if (!user) return;

            const key =
                PROGRESS_PREFIX +
                user.username +
                '_' +
                gameId;

            localStorage.setItem(
                key,
                JSON.stringify(progressData)
            );
        },


        // ========================================================
        // RÉCORD
        // ========================================================

        updateHighScore: function(
            gameId,
            score
        ) {

            const progress =
                this.getProgress(gameId);

            if (
                !progress.highScore ||
                score > progress.highScore
            ) {

                progress.highScore = score;

                this.setProgress(
                    gameId,
                    progress
                );
            }
        }

    };

})();
