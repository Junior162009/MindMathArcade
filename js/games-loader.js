/* =========================================================
   TecnoMath - Games Loader + Premium Gaming UI
   ========================================================= */
(function () {
    "use strict";

    const CATALOG_URL = "data/games.json";
    let loaded = false;

    /* =========================================================
       META / OPEN GRAPH
       Se agregan dinámicamente para no duplicar etiquetas existentes.
       ========================================================= */
    function asegurarMeta(name, content, property) {
        if (!document.head) return;
        const selector = property
            ? `meta[property="${property}"]`
            : `meta[name="${name}"]`;
        let meta = document.head.querySelector(selector);
        if (!meta) {
            meta = document.createElement("meta");
            if (property) meta.setAttribute("property", property);
            else meta.setAttribute("name", name);
            document.head.appendChild(meta);
        }
        meta.setAttribute("content", content);
    }

    function prepararOpenGraph() {
        asegurarMeta(null, "TecnoMath | Plataforma Educativa Interactiva", "og:title");
        asegurarMeta(null, "Descubre juegos educativos, retos matemáticos y experiencias interactivas en TecnoMath.", "og:description");
        asegurarMeta(null, "https://tecnomath.online/img/mindmath.png", "og:image");
        asegurarMeta(null, "website", "og:type");
        asegurarMeta(null, "https://tecnomath.online/", "og:url");
    }

    /* =========================================================
       UI PREMIUM DEL CATÁLOGO
       Todo es vanilla CSS/JS y se aplica también a tarjetas
       creadas dinámicamente por renderProjects().
       ========================================================= */
    function activarCardsGamingPremium() {
        prepararOpenGraph();

        if (!document.head || document.getElementById("tecnomath-premium-cards")) return;

        const style = document.createElement("style");
        style.id = "tecnomath-premium-cards";
        style.textContent = `
            :root {
                --tm-card-radius: 20px;
                --tm-cyan: #00f5ff;
                --tm-purple: #a855f7;
                --tm-pink: #ff2bd6;
                --tm-text: #ffffff;
                --tm-muted: #c2c8dc;
                --tm-ease: cubic-bezier(.25,.8,.25,1);
            }

            #projectsContainer {
                width: min(1280px, 100%);
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)) !important;
                gap: 22px !important;
                padding: 18px 20px 38px !important;
                perspective: 1200px;
            }

            #projectsContainer .project-card {
                position: relative;
                isolation: isolate;
                overflow: hidden;
                min-height: 390px !important;
                padding: 0 0 22px !important;
                align-items: stretch !important;
                justify-content: flex-start !important;
                gap: 0 !important;
                border: 1px solid transparent !important;
                border-radius: var(--tm-card-radius) !important;
                background:
                    linear-gradient(145deg, rgba(18,22,45,.72), rgba(7,10,24,.78)) padding-box,
                    linear-gradient(135deg, rgba(0,245,255,.55), rgba(168,85,247,.3), rgba(255,43,214,.5)) border-box !important;
                backdrop-filter: blur(18px);
                -webkit-backdrop-filter: blur(18px);
                box-shadow:
                    0 15px 35px rgba(0,0,0,.45),
                    inset 0 1px 0 rgba(255,255,255,.07) !important;
                color: var(--tm-text) !important;
                transform: translateY(0) scale(1) rotateX(0) rotateY(0);
                transform-style: preserve-3d;
                transition: transform .3s var(--tm-ease), box-shadow .3s var(--tm-ease), border-color .3s ease;
                will-change: transform;
            }

            #projectsContainer .project-card::before {
                content: "";
                position: absolute;
                inset: -2px;
                z-index: -2;
                border-radius: inherit;
                background: conic-gradient(from 180deg, transparent 0deg, rgba(0,245,255,.9) 90deg, transparent 160deg, rgba(168,85,247,.95) 245deg, transparent 315deg, rgba(255,43,214,.8) 350deg, transparent 360deg);
                opacity: .3;
                animation: tmCardSpin 9s linear infinite;
                pointer-events: none;
            }

            #projectsContainer .project-card::after {
                content: "";
                position: absolute;
                top: -10%;
                left: -140%;
                width: 65%;
                height: 120%;
                z-index: 20;
                pointer-events: none;
                transform: skewX(-20deg);
                background: linear-gradient(90deg, transparent, rgba(255,255,255,.2), transparent);
                transition: left .7s ease;
            }

            @keyframes tmCardSpin { to { transform: rotate(360deg); } }

            #projectsContainer .project-card:hover,
            #projectsContainer .project-card:focus-visible {
                transform: translateY(-8px) scale(1.02);
                border-color: rgba(0,245,255,.75) !important;
                box-shadow:
                    0 25px 55px rgba(0,0,0,.55),
                    0 0 25px rgba(0,245,255,.2),
                    0 0 50px rgba(168,85,247,.12),
                    inset 0 1px 0 rgba(255,255,255,.1) !important;
                outline: none;
            }

            #projectsContainer .project-card:hover::before { opacity: .85; }
            #projectsContainer .project-card:hover::after { left: 155%; }

            #projectsContainer .project-icon {
                position: relative;
                flex: 0 0 235px;
                width: 100% !important;
                height: 235px !important;
                min-height: 235px;
                margin: 0 !important;
                border: 0 !important;
                border-radius: var(--tm-card-radius) var(--tm-card-radius) 0 0 !important;
                overflow: hidden !important;
                background:
                    radial-gradient(circle at 50% 25%, rgba(0,245,255,.13), transparent 48%),
                    linear-gradient(145deg, #171a35, #080a18) !important;
                box-shadow: inset 0 -60px 75px rgba(0,0,0,.58) !important;
                transform: translateZ(12px);
            }

            #projectsContainer .project-icon::after {
                content: "";
                position: absolute;
                inset: 0;
                z-index: 2;
                pointer-events: none;
                background: linear-gradient(to top, rgba(5,7,18,.97) 0%, rgba(5,7,18,.58) 28%, rgba(5,7,18,.08) 65%, transparent 100%);
            }

            #projectsContainer .project-icon img {
                display: block;
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
                object-position: center !important;
                border-radius: 0 !important;
                transition: transform .55s var(--tm-ease), filter .55s var(--tm-ease);
            }

            #projectsContainer .project-card:hover .project-icon img {
                transform: scale(1.07);
                filter: saturate(1.1) contrast(1.04);
            }

            #projectsContainer .project-icon span {
                position: relative;
                z-index: 1;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: clamp(70px, 12vw, 110px) !important;
                line-height: 1;
                text-shadow: 0 0 30px rgba(0,245,255,.35);
            }

            #projectsContainer .project-name {
                position: relative;
                z-index: 6;
                margin: -42px 20px 0 !important;
                min-height: 48px;
                justify-content: flex-start !important;
                text-align: left !important;
                align-items: center;
                gap: 8px;
                color: #fff !important;
                font-family: 'Orbitron', Arial, sans-serif !important;
                font-size: clamp(18px, 2.1vw, 25px) !important;
                font-weight: 900 !important;
                line-height: 1.2 !important;
                text-shadow: 0 2px 12px rgba(0,0,0,.9), 0 0 12px rgba(0,245,255,.15);
                transform: translateZ(24px);
            }

            #projectsContainer .project-desc,
            #projectsContainer .card-description {
                position: relative;
                z-index: 6;
                display: -webkit-box;
                -webkit-box-orient: vertical;
                -webkit-line-clamp: 3;
                overflow: hidden;
                min-height: 66px;
                margin: 10px 20px 0 !important;
                color: var(--tm-muted) !important;
                font-family: 'Orbitron', Arial, sans-serif !important;
                font-size: clamp(12px, 1.25vw, 15px) !important;
                font-weight: 500;
                line-height: 1.55 !important;
                text-align: left !important;
                transform: translateZ(18px);
            }

            #projectsContainer .event-badge {
                flex: 0 0 auto;
                font-family: 'Orbitron', Arial, sans-serif !important;
                font-size: 11px !important;
                font-weight: 800;
                padding: 5px 8px !important;
                border-radius: 999px !important;
                border: 1px solid rgba(255,230,0,.75) !important;
                background: rgba(255,230,0,.13) !important;
                box-shadow: 0 0 14px rgba(255,230,0,.18);
            }

            #projectsContainer .tm-card-footer-line {
                position: absolute;
                left: 20px;
                right: 20px;
                bottom: 13px;
                height: 2px;
                border-radius: 999px;
                background: linear-gradient(90deg, var(--tm-cyan), var(--tm-purple), var(--tm-pink));
                opacity: .55;
                box-shadow: 0 0 12px rgba(0,245,255,.22);
                pointer-events: none;
            }

            #projectsContainer .project-card.tm-premium-enter {
                opacity: 0;
                animation: tmPremiumIn .62s var(--tm-ease) forwards;
                animation-delay: calc(var(--tm-index, 0) * 55ms);
            }

            @keyframes tmPremiumIn {
                from { opacity: 0; transform: translateY(24px) scale(.97); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }

            /* Favoritos */
            .tm-favorite {
                position: absolute;
                top: 13px;
                right: 13px;
                z-index: 50;
                width: 42px;
                height: 42px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid rgba(255,255,255,.22);
                border-radius: 50%;
                background: rgba(3,5,15,.68);
                color: #fff;
                font-size: 24px;
                line-height: 1;
                cursor: pointer;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                transition: transform .2s ease, box-shadow .2s ease, color .2s ease, background .2s ease;
            }
            .tm-favorite:hover { transform: scale(1.1); box-shadow: 0 0 20px rgba(255,43,214,.45); }
            .tm-favorite.active { color: var(--tm-pink); background: rgba(255,43,214,.16); text-shadow: 0 0 12px var(--tm-pink); box-shadow: 0 0 18px rgba(255,43,214,.4); }

            /* Buscador */
            .tm-game-search-wrapper {
                position: relative;
                z-index: 30;
                width: min(900px, calc(100% - 30px));
                margin: 18px auto 8px;
            }
            .tm-game-search {
                width: 100%;
                min-height: 54px;
                padding: 0 52px 0 20px;
                border: 1px solid rgba(0,245,255,.35);
                border-radius: 16px;
                outline: none;
                color: #fff;
                background: rgba(8,10,24,.72);
                backdrop-filter: blur(14px);
                -webkit-backdrop-filter: blur(14px);
                font-family: 'Orbitron', Arial, sans-serif;
                font-size: 14px;
                box-shadow: 0 0 20px rgba(0,0,0,.25), inset 0 0 15px rgba(0,245,255,.03);
                transition: border-color .25s ease, box-shadow .25s ease;
            }
            .tm-game-search::placeholder { color: #7f849a; }
            .tm-game-search:focus { border-color: var(--tm-cyan); box-shadow: 0 0 22px rgba(0,245,255,.16); }
            .tm-search-icon { position: absolute; right: 18px; top: 50%; transform: translateY(-50%); font-size: 21px; pointer-events: none; }
            .tm-no-results { grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: #9096aa; font-family: 'Orbitron', Arial, sans-serif; font-size: 14px; }

            /* Volver arriba */
            #tm-back-to-top {
                position: fixed;
                right: 22px;
                bottom: 22px;
                z-index: 9990;
                width: 52px;
                height: 52px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid rgba(0,245,255,.5);
                border-radius: 50%;
                opacity: 0;
                visibility: hidden;
                transform: translateY(20px) scale(.8);
                color: var(--tm-cyan);
                background: rgba(8,10,24,.82);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                box-shadow: 0 0 20px rgba(0,245,255,.15);
                font-size: 23px;
                cursor: pointer;
                transition: opacity .25s ease, visibility .25s ease, transform .25s ease, box-shadow .25s ease;
            }
            #tm-back-to-top.visible { opacity: 1; visibility: visible; transform: translateY(0) scale(1); }
            #tm-back-to-top:hover { color: #fff; transform: translateY(-4px) scale(1.08); box-shadow: 0 0 25px rgba(0,245,255,.45); }

            .project-card.tm-search-hidden { display: none !important; }

            @media (max-width: 700px) {
                #projectsContainer { grid-template-columns: 1fr !important; gap: 16px !important; padding: 12px 14px 28px !important; }
                #projectsContainer .project-card { min-height: 350px !important; }
                #projectsContainer .project-icon { flex-basis: 205px; height: 205px !important; min-height: 205px; }
                #projectsContainer .project-name { margin-left: 18px !important; margin-right: 18px !important; font-size: 20px !important; }
                #projectsContainer .project-desc, #projectsContainer .card-description { margin-left: 18px !important; margin-right: 18px !important; font-size: 13px !important; }
                .tm-game-search-wrapper { width: calc(100% - 24px); }
                #tm-back-to-top { right: 15px; bottom: 15px; }
            }

            @media (prefers-reduced-motion: reduce) {
                #projectsContainer .project-card,
                #projectsContainer .project-icon img,
                #tm-back-to-top { transition: none !important; }
                #projectsContainer .project-card::before,
                #projectsContainer .project-card::after,
                #projectsContainer .project-card.tm-premium-enter { animation: none !important; }
                #projectsContainer .project-card.tm-premium-enter { opacity: 1 !important; }
            }
        `;
        document.head.appendChild(style);

        const container = document.getElementById("projectsContainer");
        if (!container) return;

        const FAVORITES_KEY = "tecnomath_favorite_games";
        let favorites = new Set();
        try {
            const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
            if (Array.isArray(stored)) favorites = new Set(stored);
        } catch (_) {}

        function saveFavorites() {
            try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites])); } catch (_) {}
        }

        function getGameId(card) {
            const href = card.getAttribute("href");
            if (href) return `url:${href}`;
            return `name:${(card.querySelector(".project-name")?.textContent || "Juego").trim().toLowerCase()}`;
        }

        function addFavorite(card) {
            if (card.querySelector(".tm-favorite")) return;
            const id = getGameId(card);
            const button = document.createElement("button");
            button.type = "button";
            button.className = "tm-favorite";
            button.setAttribute("aria-label", "Agregar a favoritos");
            button.setAttribute("title", "Agregar a favoritos");

            function update() {
                const active = favorites.has(id);
                button.classList.toggle("active", active);
                button.textContent = active ? "♥" : "♡";
                button.setAttribute("aria-pressed", String(active));
                button.setAttribute("aria-label", active ? "Quitar de favoritos" : "Agregar a favoritos");
                button.setAttribute("title", active ? "Quitar de favoritos" : "Agregar a favoritos");
            }

            update();
            button.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (favorites.has(id)) favorites.delete(id);
                else favorites.add(id);
                saveFavorites();
                update();
            });
            card.appendChild(button);
        }

        function addTilt(card) {
            if (card.dataset.tmTiltReady || !window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
            card.dataset.tmTiltReady = "true";
            let frame = 0;
            card.addEventListener("pointermove", (event) => {
                if (frame) cancelAnimationFrame(frame);
                frame = requestAnimationFrame(() => {
                    const rect = card.getBoundingClientRect();
                    const x = (event.clientX - rect.left) / rect.width - .5;
                    const y = (event.clientY - rect.top) / rect.height - .5;
                    card.style.transform = `translateY(-8px) scale(1.02) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg)`;
                });
            });
            card.addEventListener("pointerleave", () => {
                if (frame) cancelAnimationFrame(frame);
                card.style.transform = "";
            });
        }

        function prepararCards() {
            const cards = container.querySelectorAll(".project-card");
            cards.forEach((card, index) => {
                const image = card.querySelector(".project-icon img");
                if (image) {
                    image.loading = "lazy";
                    image.decoding = "async";
                }

                const desc = card.querySelector(".project-desc");
                if (desc) desc.classList.add("card-description");

                if (!card.classList.contains("tm-premium-ready")) {
                    card.classList.add("tm-premium-ready", "tm-premium-enter");
                    card.style.setProperty("--tm-index", Math.min(index, 12));
                    const line = document.createElement("span");
                    line.className = "tm-card-footer-line";
                    line.setAttribute("aria-hidden", "true");
                    card.appendChild(line);
                    addFavorite(card);
                    addTilt(card);
                }
            });
        }

        function createSearch() {
            if (document.querySelector(".tm-game-search-wrapper")) return;
            const wrapper = document.createElement("div");
            wrapper.className = "tm-game-search-wrapper";
            wrapper.innerHTML = `
                <input id="tm-game-search" class="tm-game-search" type="search" autocomplete="off" spellcheck="false" placeholder="Buscar juego, materia o desafío..." aria-label="Buscar juegos">
                <span class="tm-search-icon" aria-hidden="true">🔎</span>
            `;
            container.parentNode.insertBefore(wrapper, container);
            const input = wrapper.querySelector("#tm-game-search");
            input.addEventListener("input", () => filterGames(input.value));
        }

        function filterGames(value) {
            const query = value.trim().toLowerCase();
            const cards = [...container.querySelectorAll(".project-card")];
            let visible = 0;
            cards.forEach((card) => {
                const text = `${card.textContent} ${card.getAttribute("href") || ""}`.toLowerCase();
                const match = !query || text.includes(query);
                card.classList.toggle("tm-search-hidden", !match);
                if (match) visible++;
            });

            let empty = container.querySelector(".tm-no-results");
            if (!visible && query) {
                if (!empty) {
                    empty = document.createElement("div");
                    empty.className = "tm-no-results";
                    container.appendChild(empty);
                }
                empty.textContent = `🎮 No encontramos juegos para "${value.trim()}"`;
            } else if (empty) empty.remove();
        }

        function createBackToTop() {
            if (document.getElementById("tm-back-to-top")) return;
            const button = document.createElement("button");
            button.id = "tm-back-to-top";
            button.type = "button";
            button.textContent = "↑";
            button.setAttribute("aria-label", "Volver arriba");
            button.setAttribute("title", "Volver arriba");
            document.body.appendChild(button);
            const update = () => button.classList.toggle("visible", window.scrollY > 500);
            window.addEventListener("scroll", update, { passive: true });
            button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
            update();
        }

        createSearch();
        createBackToTop();
        prepararCards();
        const observer = new MutationObserver(prepararCards);
        observer.observe(container, { childList: true, subtree: true });
    }

    /* =========================================================
       Autenticación / corona de administrador
       ========================================================= */
    function cargarAutenticacion() {
        if (window.TecnomathAuth || document.querySelector("script[data-tecnomath-auth]")) return;
        const script = document.createElement("script");
        script.src = "/js/tecnomath-auth.js?v=20260911-7";
        script.dataset.tecnomathAuth = "true";
        script.async = false;
        document.head.appendChild(script);
    }
    cargarAutenticacion();

    function sincronizarCoronaAdmin() {
        const oldCloud = document.getElementById("admin-cloud");
        if (oldCloud) { oldCloud.style.display = "none"; oldCloud.setAttribute("aria-hidden", "true"); }
        let crown = document.getElementById("admin-crown");
        if (!crown) {
            crown = document.createElement("a");
            crown.id = "admin-crown";
            crown.href = "/pages/admin/supabase.html";
            crown.title = "Abrir panel de administración";
            crown.setAttribute("aria-label", "Abrir panel de administración");
            crown.textContent = "👑";
            Object.assign(crown.style, {
                display: "none", position: "fixed", bottom: "20px", right: "20px", zIndex: "1001",
                width: "58px", height: "58px", borderRadius: "50%", alignItems: "center", justifyContent: "center",
                textDecoration: "none", fontSize: "32px", lineHeight: "58px", textAlign: "center", cursor: "pointer",
                background: "linear-gradient(145deg,#ffe600,#ff9d00)", border: "2px solid #fff0a8",
                boxShadow: "0 0 14px #ffe600,0 0 30px rgba(255,230,0,.55)", transition: "transform .2s ease,box-shadow .2s ease"
            });
            crown.addEventListener("mouseenter", () => { crown.style.transform = "scale(1.1)"; });
            crown.addEventListener("mouseleave", () => { crown.style.transform = "scale(1)"; });
            document.body.appendChild(crown);
        }
        const mostrar = (user, profile) => {
            const admin = !!user && (window.TecnomathAuth.isAdminEmail?.(user.email) || profile?.role === "admin");
            crown.style.display = admin ? "flex" : "none";
            window.TecnomathCurrentAdmin = admin ? (profile || { username: window.TecnomathAuth.adminUsername?.(user) || "Admin", role: "admin" }) : null;
        };
        window.TecnomathAuth.refreshAccount().then(({ user, profile }) => mostrar(user, profile)).catch(async () => {
            try { mostrar(await window.TecnomathAuth.currentUser(), null); } catch (_) { crown.style.display = "none"; }
        });
        window.TecnomathAuth.authState((user, profile) => mostrar(user, profile)).catch(() => {});
    }

    function esperarAuthYAdmin() {
        let intentos = 0;
        const timer = setInterval(() => {
            intentos++;
            if (window.TecnomathAuth && document.body) {
                clearInterval(timer);
                sincronizarCoronaAdmin();
            } else if (intentos >= 100) clearInterval(timer);
        }, 100);
    }
    esperarAuthYAdmin();

    /* =========================================================
       Carga del catálogo existente — no elimina juegos.
       ========================================================= */
    function normalizarJuego(game) {
        if (!game || typeof game !== "object" || !game.url) return null;
        return {
            name: game.name || "Juego",
            desc: game.desc || "Juego educativo de TecnoMath",
            description: game.description || game.desc || "Juego educativo de TecnoMath",
            category: game.category || "otros",
            url: game.url,
            imageUrl: game.imageUrl || "",
            icon: game.icon || "🎮",
            deviceCompatibility: game.deviceCompatibility || "both",
            evento: game.evento || null,
            submissionId: game.submissionId || null,
            authorName: game.authorName || "Usuario",
            sourceType: game.sourceType || "url"
        };
    }

    function obtenerJuegosBase() {
        if (Array.isArray(window.projects)) return window.projects.slice();
        if (typeof projects !== "undefined" && Array.isArray(projects)) return projects.slice();
        return [];
    }

    function eliminarDuplicados(juegos) {
        const vistos = new Set();
        return juegos.filter((j) => {
            const key = j.submissionId || j.url || j.name;
            if (vistos.has(key)) return false;
            vistos.add(key);
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
            if (typeof window.renderProjects === "function") window.renderProjects(window.currentActiveFilter || "todos");
            if (typeof window.actualizarFiltros === "function") window.actualizarFiltros();
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
        document.addEventListener("DOMContentLoaded", () => {
            activarCardsGamingPremium();
            iniciar();
        }, { once: true });
    } else {
        activarCardsGamingPremium();
        iniciar();
    }

    window.TecnoMathGamesLoader = {
        reload: async function () {
            loaded = false;
            await cargarCatalogo();
        }
    };
})();
