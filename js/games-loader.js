/* =========================================================
   TecnoMath - Games Loader
   ========================================================= */
(function () {
    "use strict";

    function cargarAutenticacion() {
        if (window.TecnomathAuth) return;
        if (document.querySelector('script[data-tecnomath-auth]')) return;
        const script = document.createElement('script');
        script.src = '/js/tecnomath-auth.js?v=20260911-7';
        script.dataset.tecnomathAuth = 'true';
        script.async = false;
        document.head.appendChild(script);
    }
    cargarAutenticacion();

    function sincronizarCoronaAdmin() {
        const oldCloud = document.getElementById('admin-cloud');
        if (oldCloud) { oldCloud.style.display = 'none'; oldCloud.setAttribute('aria-hidden', 'true'); }
        let crown = document.getElementById('admin-crown');
        if (!crown) {
            crown = document.createElement('a'); crown.id = 'admin-crown';
            crown.href = '/pages/admin/supabase.html'; crown.title = 'Abrir panel de administración';
            crown.setAttribute('aria-label', 'Abrir panel de administración'); crown.textContent = '👑';
            Object.assign(crown.style,{display:'none',position:'fixed',bottom:'20px',right:'20px',zIndex:'1001',width:'58px',height:'58px',borderRadius:'50%',alignItems:'center',justifyContent:'center',textDecoration:'none',fontSize:'32px',lineHeight:'58px',textAlign:'center',cursor:'pointer',background:'linear-gradient(145deg,#ffe600,#ff9d00)',border:'2px solid #fff0a8',boxShadow:'0 0 14px #ffe600,0 0 30px rgba(255,230,0,.55)',transition:'transform .2s ease,box-shadow .2s ease'});
            crown.addEventListener('mouseenter',()=>{crown.style.transform='scale(1.1)';});
            crown.addEventListener('mouseleave',()=>{crown.style.transform='scale(1)';});
            document.body.appendChild(crown);
        }
        const mostrar=(user,profile)=>{const admin=!!user&&(window.TecnomathAuth.isAdminEmail?.(user.email)||profile?.role==='admin');crown.style.display=admin?'flex':'none';window.TecnomathCurrentAdmin=admin?(profile||{username:window.TecnomathAuth.adminUsername?.(user)||'Admin',role:'admin'}):null;};
        window.TecnomathAuth.refreshAccount().then(({user,profile})=>mostrar(user,profile)).catch(async()=>{try{mostrar(await window.TecnomathAuth.currentUser(),null);}catch(_){crown.style.display='none';}});
        window.TecnomathAuth.authState((user,profile)=>mostrar(user,profile)).catch(()=>{});
    }
    function esperarAuthYAdmin(){let intentos=0;const timer=setInterval(()=>{intentos++;if(window.TecnomathAuth&&document.body){clearInterval(timer);sincronizarCoronaAdmin();}else if(intentos>=100)clearInterval(timer);},100);}
    esperarAuthYAdmin();

    const CATALOG_URL="data/games.json"; let loaded=false;
    function normalizarJuego(game){if(!game||typeof game!=="object"||!game.url)return null;return{name:game.name||"Juego",desc:game.desc||"Juego educativo de TecnoMath",description:game.description||game.desc||"Juego educativo de TecnoMath",category:game.category||"otros",url:game.url,imageUrl:game.imageUrl||"",icon:game.icon||"🎮",deviceCompatibility:game.deviceCompatibility||"both",evento:game.evento||null,submissionId:game.submissionId||null,authorName:game.authorName||"Usuario",sourceType:game.sourceType||"url"};}
    function obtenerJuegosBase(){if(Array.isArray(window.projects))return window.projects.slice();if(typeof projects!=="undefined"&&Array.isArray(projects))return projects.slice();return[];}
    function eliminarDuplicados(juegos){const vistos=new Set();return juegos.filter(j=>{const k=j.submissionId||j.url||j.name;if(vistos.has(k))return false;vistos.add(k);return true;});}
    async function cargarCatalogo(){if(loaded)return;loaded=true;try{const r=await fetch(`${CATALOG_URL}?v=${Date.now()}`,{cache:"no-store"});if(!r.ok)throw new Error(`HTTP ${r.status}`);const data=await r.json();if(!Array.isArray(data))return;const publicados=data.map(normalizarJuego).filter(Boolean),todos=eliminarDuplicados([...obtenerJuegosBase(),...publicados]);window.projects=todos;try{projects=todos;}catch(_){}if(typeof window.renderProjects==="function")window.renderProjects(window.currentActiveFilter||"todos");if(typeof window.actualizarFiltros==="function")window.actualizarFiltros();}catch(error){console.error("❌ TecnoMath: error cargando data/games.json:",error);}}
    function iniciar(){let intentos=0;const esperar=setInterval(()=>{intentos++;const existe=typeof window.projects!=="undefined"||typeof projects!=="undefined";if(existe||intentos>=40){clearInterval(esperar);cargarCatalogo();}},100);}
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",iniciar,{once:true});else iniciar();
    window.TecnoMathGamesLoader={reload:async function(){loaded=false;await cargarCatalogo();}};
})();
