/* =========================================================
   TecnoMath - Games Loader
   Carga juegos publicados desde data/games.json
   ========================================================= */

(function () {
    "use strict";

    const CATALOG_URL = "data/games.json";

    let loaded = false;

    function normalizarJuego(game) {
        if (!game || typeof game !== "object") {
            return null;
        }

        if (!game.url) {
            return null;
        }

        return {
            name: game.name || "Juego",
            desc: game.desc || "Juego educativo de TecnoMath",
            description: game.description || game.desc || "Juego educativo de TecnoMath",

            category: game.category || "otros",

            url: game.url,

            imageUrl: game.imageUrl || "",
            icon: game.icon || "🎮",

            deviceCompatibility:
                game.deviceCompatibility || "both",

            evento:
                game.evento || null,

            submissionId:
                game.submissionId || null,

            authorName:
                game.authorName || "Usuario",

            sourceType:
                game.sourceType || "url"
        };
    }


    function obtenerJuegosBase() {

        if (typeof window.projects !== "undefined" &&
            Array.isArray(window.projects)) {

            return window.projects.slice();

        }

        if (typeof projects !== "undefined" &&
            Array.isArray(projects)) {

            return projects.slice();

        }

        return [];
    }


    function eliminarDuplicados(juegos) {

        const vistos = new Set();

        return juegos.filter(juego => {

            const clave =
                juego.submissionId ||
                juego.url ||
                juego.name;

            if (vistos.has(clave)) {
                return false;
            }

            vistos.add(clave);

            return true;

        });

    }


    async function cargarCatalogo() {

        if (loaded) {
            return;
        }

        loaded = true;

        try {

            const response = await fetch(
                `${CATALOG_URL}?v=${Date.now()}`,
                {
                    cache: "no-store"
                }
            );

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}`
                );
            }


            const data = await response.json();


            if (!Array.isArray(data)) {

                console.warn(
                    "data/games.json no contiene un array."
                );

                return;
            }


            const juegosPublicados =
                data
                    .map(normalizarJuego)
                    .filter(Boolean);


            const juegosActuales =
                obtenerJuegosBase();


            const todos =
                eliminarDuplicados([
                    ...juegosActuales,
                    ...juegosPublicados
                ]);


            /*
             * Actualizamos la variable global utilizada
             * por el catálogo principal.
             */

            if (typeof window.projects !== "undefined") {
                window.projects = todos;
            }

            try {
                projects = todos;
            } catch (_) {
                // projects puede no ser globalmente reasignable.
            }


            /*
             * Intentamos refrescar el catálogo existente.
             * Si el index ya tiene su propia función,
             * usamos esa función.
             */

            if (
                typeof window.renderProjects === "function"
            ) {

                const filtro =
                    window.currentActiveFilter ||
                    "todos";

                window.renderProjects(filtro);
            }


            if (
                typeof window.actualizarFiltros === "function"
            ) {

                window.actualizarFiltros();
            }


            console.log(
                `🎮 TecnoMath: ${juegosPublicados.length} juegos publicados cargados.`
            );

        } catch (error) {

            console.error(
                "❌ TecnoMath: error cargando data/games.json:",
                error
            );

        }

    }


    function iniciar() {

        /*
         * Esperamos un poco para que el index principal
         * termine de crear su variable projects y sus
         * funciones originales.
         */

        let intentos = 0;

        const esperar = setInterval(() => {

            intentos++;

            const existeCatalogo =
                typeof window.projects !== "undefined" ||
                typeof projects !== "undefined";

            if (
                existeCatalogo ||
                intentos >= 40
            ) {

                clearInterval(esperar);

                cargarCatalogo();

            }

        }, 100);

    }


    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            iniciar,
            {
                once: true
            }
        );

    } else {

        iniciar();

    }


    /*
     * También dejamos disponible una función pública
     * por si el administrador quiere recargar el catálogo.
     */

    window.TecnoMathGamesLoader = {
        reload: async function () {

            loaded = false;

            await cargarCatalogo();

        }
    };

})();