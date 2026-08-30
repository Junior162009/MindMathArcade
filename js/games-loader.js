/* =========================================================
   TecnoMath - Games Loader
   ========================================================= */
(function () {
    "use strict";
    const CATALOG_URL = "data/games.json";
    let loaded = false;

    function normalizarJuego(game) {
        if (!game || typeof game !== "object" || !game.url) return null;
        return {
            name: game.name || "Juego",
            desc: game.desc || "Juego educativo de TecnoMath",
            description: game.description || game.desc || "Juego educativo de TecnoMath",
            category: game.category || "otros", url: game.url,
            imageUrl: game.imageUrl || "", icon: game.icon || "🎮",
            deviceCompatibility: game.deviceCompatibility || "both",
            evento: game.evento || null, submissionId: game.submissionId || null,
            authorName: game.authorName || "Usuario", sourceType: game.sourceType || "url"
        };
    }

    function obtenerJuegosBase() {
        if (Array.isArray(window.projects)) return window.projects.slice();
        if (typeof projects !== "undefined" && Array.isArray(projects)) return projects.slice();
        return [];
    }

    function eliminarDuplicados(juegos) {
        const vistos = new Set();
        return juegos.filter(juego => {
            const clave = juego.submissionId || juego.url || juego.name;
            if (vistos.has(clave)) return false;
            vistos.add(clave);
            return true;
        });
    }

    async function cargarCatalogo() {
        if (loaded) return;
        loaded = true;
        try {
            const response = await fetch(`${CATALOG_URL}?v=${Date.now()}`, { cache: "no-store" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (!Array.isArray(data)) return;

            const publicados = data.map(normalizarJuego).filter(Boolean);
            const todos = eliminarDuplicados([...obtenerJuegosBase(), ...publicados]);
            window.projects = todos;
            try { projects = todos; } catch (_) {}

            if (typeof window.renderProjects === "function") {
                window.renderProjects(window.currentActiveFilter || "todos");
            }
            if (typeof window.actualizarFiltros === "function") window.actualizarFiltros();
            console.log(`🎮 TecnoMath: ${publicados.length} juegos publicados cargados.`);
        } catch (error) {
            console.error("❌ TecnoMath: error cargando data/games.json:", error);
        }
    }

    function iniciar() {
        let intentos = 0;
        const esperar = setInterval(() => {
            intentos++;
            const existe = typeof window.projects !== "undefined" || typeof projects !== "undefined";
            if (existe || intentos >= 40) {
                clearInterval(esperar);
                cargarCatalogo();
            }
        }, 100);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }

    window.TecnoMathGamesLoader = {
        reload: async function () {
            loaded = false;
            await cargarCatalogo();
        }
    };
})();
