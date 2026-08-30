/* =========================================================
   TecnoMath - Games Loader + navegación global
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
            vistos.add(clave); return true;
        });
    }
    async function cargarCatalogo() {
        if (loaded) return; loaded = true;
        try {
            const response = await fetch(`${CATALOG_URL}?v=${Date.now()}`, {cache:"no-store"});
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (!Array.isArray(data)) return;
            const publicados = data.map(normalizarJuego).filter(Boolean);
            const todos = eliminarDuplicados([...obtenerJuegosBase(), ...publicados]);
            window.projects = todos;
            try { projects = todos; } catch (_) {}
            if (typeof window.renderProjects === "function") window.renderProjects(window.currentActiveFilter || "todos");
            if (typeof window.actualizarFiltros === "function") window.actualizarFiltros();
            console.log(`🎮 TecnoMath: ${publicados.length} juegos publicados cargados.`);
        } catch (error) { console.error("❌ TecnoMath: error cargando data/games.json:", error); }
    }

    /* =========================================================
       🧭 NAVEGACIÓN GLOBAL VERTICAL
       Una sola navegación: comunidad incluye Social.
       Se oculta la barra superior original para evitar duplicados.
       ========================================================= */
    function instalarNavegacionGlobal() {
        if (document.getElementById("tm-global-sidebar")) return;
        const style = document.createElement("style");
        style.id = "tm-global-sidebar-style";
        style.textContent = `
          body.tm-sidebar-ready{padding-left:238px!important}
          body.tm-sidebar-ready>header{display:none!important}
          #tm-global-sidebar{position:fixed;left:0;top:0;bottom:0;width:238px;z-index:10000;background:rgba(8,8,20,.97);border-right:2px solid #ff00ff;box-shadow:8px 0 30px rgba(255,0,255,.18);padding:16px 11px;display:flex;flex-direction:column;overflow-y:auto;font-family:'Press Start 2P',cursive}
          #tm-global-sidebar .tm-brand{display:block;text-decoration:none;color:#00ffff;text-align:center;font-size:12px;line-height:1.7;padding:8px 4px 17px;margin-bottom:8px;border-bottom:1px solid #292943;text-shadow:0 0 10px #00ffff}
          #tm-global-sidebar .tm-section{font-size:6px;color:#666;padding:12px 8px 6px;letter-spacing:1px}
          #tm-global-sidebar a.tm-nav{display:flex;align-items:center;gap:10px;color:#ddd;text-decoration:none;font-size:7px;padding:11px 9px;margin:2px 0;border:1px solid transparent;border-radius:10px;transition:.18s}
          #tm-global-sidebar a.tm-nav:hover,#tm-global-sidebar a.tm-nav.tm-active{color:#00ffff;background:rgba(0,255,255,.08);border-color:rgba(0,255,255,.35);text-shadow:0 0 7px #00ffff;transform:translateX(2px)}
          #tm-global-sidebar .tm-icon{width:25px;text-align:center;font-size:18px;flex:0 0 25px}
          #tm-global-sidebar .tm-user{margin-top:auto;border-top:1px solid #292943;padding:12px 8px;color:#39ff14;font-size:6px;line-height:1.7;min-height:50px}
          #tm-sidebar-toggle{display:none;position:fixed;left:10px;top:10px;z-index:10001;background:#0d0d1a;color:#00ffff;border:2px solid #00ffff;border-radius:10px;padding:9px 12px;font-size:20px;cursor:pointer}
          @media(max-width:760px){body.tm-sidebar-ready{padding-left:0!important;padding-top:56px!important}#tm-global-sidebar{width:245px;transform:translateX(-105%);transition:transform .22s ease;box-shadow:8px 0 35px rgba(255,0,255,.3)}#tm-global-sidebar.tm-open{transform:translateX(0)}#tm-sidebar-toggle{display:block}#tm-global-sidebar .tm-user{margin-top:20px}}
          @media(prefers-reduced-motion:reduce){#tm-global-sidebar *{transition:none!important}}
        `;
        document.head.appendChild(style);
        const side = document.createElement("aside");
        side.id = "tm-global-sidebar";
        side.setAttribute("aria-label","Navegación principal de TecnoMath");
        side.innerHTML = `
          <a class="tm-brand" href="/">🎮 TECNOMATH<br><small>ARCADE</small></a>
          <div class="tm-section">PRINCIPAL</div>
          <a class="tm-nav tm-active" href="/"><span class="tm-icon">🏠</span>Inicio</a>
          <a class="tm-nav" href="#projectsContainer"><span class="tm-icon">🎮</span>Juegos</a>
          <div class="tm-section">COMPETIR</div>
          <a class="tm-nav" href="/pages/competir/"><span class="tm-icon">🏆</span>Ranking global</a>
          <a class="tm-nav" href="/pages/competir/"><span class="tm-icon">⚔️</span>Torneos</a>
          <div class="tm-section">COMUNIDAD</div>
          <a class="tm-nav" href="/pages/social/index.html"><span class="tm-icon">👥</span>Comunidad</a>
          <a class="tm-nav" href="/pages/progreso/index.html"><span class="tm-icon">📈</span>Mi progreso</a>
          <div class="tm-section">CREADORES</div>
          <a class="tm-nav" href="/pages/upload-game.html"><span class="tm-icon">🎮</span>Subir juego</a>
          <a class="tm-nav" href="/pages/tienda/"><span class="tm-icon">🛒</span>Tienda</a>
          <a class="tm-nav" href="/pages/tienda/"><span class="tm-icon">👑</span>Premium</a>
          <div class="tm-user" id="tm-sidebar-user">👤 Invitado</div>
        `;
        const toggle = document.createElement("button");
        toggle.id = "tm-sidebar-toggle"; toggle.type = "button"; toggle.textContent = "☰"; toggle.setAttribute("aria-label","Abrir menú");
        toggle.addEventListener("click",()=>side.classList.toggle("tm-open"));
        document.body.classList.add("tm-sidebar-ready");
        document.body.insertBefore(side, document.body.firstChild);
        document.body.appendChild(toggle);
        side.querySelectorAll("a.tm-nav").forEach(a=>a.addEventListener("click",()=>{if(window.innerWidth<=760)side.classList.remove("tm-open")}));
        const updateUser=()=>{
            const box=document.getElementById("tm-sidebar-user"); if(!box)return;
            let u=null; try{u=window.Tecnomath?.getCurrentUser?.()}catch(_){ }
            if(u) box.innerHTML=`👤 ${String(u.username).replace(/[&<>]/g,"")}<br>🟢 Sesión activa`;
            else box.textContent="👤 Invitado";
        };
        updateUser();
        if(window.firebase?.auth) firebase.auth().onAuthStateChanged(updateUser);
        window.addEventListener("tecnomath:auth",updateUser);
    }

    function iniciar() {
        instalarNavegacionGlobal();
        let intentos=0;
        const esperar=setInterval(()=>{
            intentos++;
            const existe=typeof window.projects!=="undefined"||typeof projects!=="undefined";
            if(existe||intentos>=40){clearInterval(esperar);cargarCatalogo();}
        },100);
    }
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",iniciar,{once:true}); else iniciar();
    window.TecnoMathGamesLoader={reload:async function(){loaded=false;await cargarCatalogo()}};
})();