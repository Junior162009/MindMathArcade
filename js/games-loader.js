/* =========================================================
   TecnoMath - Games Loader
   ========================================================= */
(function () {
    "use strict";

    /* =========================================================
       UI PREMIUM DEL CATÁLOGO
       Se inyecta desde aquí para no tocar la lógica existente
       de carga/renderizado de juegos.
       ========================================================= */
    function activarCardsGamingPremium() {
        if (!document.head || document.getElementById('tecnomath-premium-cards')) return;

        const style = document.createElement('style');
        style.id = 'tecnomath-premium-cards';
        style.textContent = `
            :root {
                --tm-card-radius: 20px;
                --tm-card-bg: rgba(15, 17, 35, .88);
                --tm-card-border: rgba(0, 255, 255, .18);
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
                    linear-gradient(145deg, rgba(22,25,52,.96), rgba(8,10,23,.96)) padding-box,
                    linear-gradient(135deg, rgba(0,245,255,.42), rgba(168,85,247,.18), rgba(255,43,214,.34)) border-box !important;
                box-shadow:
                    0 14px 30px rgba(0,0,0,.38),
                    0 4px 10px rgba(0,0,0,.25),
                    inset 0 1px 0 rgba(255,255,255,.06) !important;
                color: var(--tm-text) !important;
                transform: translateY(0) scale(1) rotateX(0) rotateY(0);
                transform-style: preserve-3d;
                transition:
                    transform .3s var(--tm-ease),
                    box-shadow .3s var(--tm-ease),
                    border-color .3s var(--tm-ease);
            }

            /* Borde luminoso animado */
            #projectsContainer .project-card::before {
                content: "";
                position: absolute;
                inset: -1px;
                z-index: -2;
                border-radius: inherit;
                background: conic-gradient(from 180deg, transparent 0deg, rgba(0,245,255,.85) 90deg, transparent 170deg, rgba(168,85,247,.9) 260deg, transparent 340deg);
                opacity: .18;
                transition: opacity .3s ease;
                animation: tmCardSpin 7s linear infinite;
            }

            /* Capa de brillo que recorre la tarjeta */
            #projectsContainer .project-card::after {
                content: "";
                position: absolute;
                top: 0;
                left: -130%;
                width: 70%;
                height: 100%;
                pointer-events: none;
                z-index: 5;
                transform: skewX(-20deg);
                background: linear-gradient(90deg, transparent, rgba(255,255,255,.18), transparent);
                transition: left .65s ease;
            }

            @keyframes tmCardSpin { to { transform: rotate(360deg); } }

            #projectsContainer .project-card:hover,
            #projectsContainer .project-card:focus-visible {
                transform: translateY(-8px) scale(1.02);
                border-color: rgba(0,245,255,.65) !important;
                box-shadow:
                    0 24px 48px rgba(0,0,0,.5),
                    0 0 24px rgba(0,245,255,.18),
                    0 0 44px rgba(168,85,247,.12),
                    inset 0 1px 0 rgba(255,255,255,.08) !important;
            }

            #projectsContainer .project-card:hover::before { opacity: .75; }
            #projectsContainer .project-card:hover::after { left: 150%; }

            /* Área visual grande: conserva el logo/imagen completo */
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
                box-shadow: inset 0 -55px 70px rgba(0,0,0,.52) !important;
                transform: translateZ(12px);
            }

            #projectsContainer .project-icon::after {
                content: "";
                position: absolute;
                inset: 0;
                z-index: 2;
                pointer-events: none;
                background: linear-gradient(to top, rgba(7,9,20,.96) 0%, rgba(7,9,20,.58) 28%, rgba(7,9,20,.08) 65%, transparent 100%);
            }

            #projectsContainer .project-icon img {
                display: block;
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
                object-position: center !important;
                border-radius: 0 !important;
                transition: transform .55s var(--tm-ease), filter .55s var(--tm-ease);
                transform: scale(1.001);
            }

            #projectsContainer .project-card:hover .project-icon img {
                transform: scale(1.07);
                filter: saturate(1.08) contrast(1.04);
            }

            /* Emoji fallback: también queda grande y atractivo */
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
                font-family: 'Orbitron', 'Arial', sans-serif !important;
                font-size: clamp(18px, 2.1vw, 25px) !important;
                font-weight: 900 !important;
                line-height: 1.15 !important;
                letter-spacing: .2px;
                text-shadow: 0 2px 12px rgba(0,0,0,.8), 0 0 10px rgba(0,245,255,.12);
                transform: translateZ(24px);
            }

            #projectsContainer .project-desc {
                position: relative;
                z-index: 6;
                display: -webkit-box;
                -webkit-box-orient: vertical;
                -webkit-line-clamp: 3;
                overflow: hidden;
                min-height: 66px;
                margin: 10px 20px 0 !important;
                color: var(--tm-muted) !important;
                font-family: 'Orbitron', 'Arial', sans-serif !important;
                font-size: clamp(12px, 1.25vw, 15px) !important;
                font-weight: 500;
                line-height: 1.55 !important;
                text-align: left !important;
                letter-spacing: .1px;
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

            /* Indicador visual inferior */
            #projectsContainer .project-card .tm-card-footer-line {
                position: absolute;
                left: 20px;
                right: 20px;
                bottom: 13px;
                height: 2px;
                border-radius: 999px;
                background: linear-gradient(90deg, var(--tm-cyan), var(--tm-purple), var(--tm-pink));
                opacity: .55;
                box-shadow: 0 0 12px rgba(0,245,255,.22);
            }

            /* Entrada escalonada */
            #projectsContainer .project-card.tm-premium-enter {
                opacity: 0;
                animation: tmPremiumIn .62s var(--tm-ease) forwards;
                animation-delay: calc(var(--tm-index, 0) * 55ms);
            }

            @keyframes tmPremiumIn {
                from { opacity: 0; transform: translateY(24px) scale(.97); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }

            @media (max-width: 700px) {
                #projectsContainer {
                    grid-template-columns: 1fr !important;
                    gap: 16px !important;
                    padding: 12px 14px 28px !important;
                }
                #projectsContainer .project-card {
                    min-height: 350px !important;
                }
                #projectsContainer .project-icon {
                    flex-basis: 205px;
                    height: 205px !important;
                    min-height: 205px;
                }
                #projectsContainer .project-name {
                    margin-left: 18px !important;
                    margin-right: 18px !important;
                    font-size: 20px !important;
                }
                #projectsContainer .project-desc {
                    margin-left: 18px !important;
                    margin-right: 18px !important;
                    font-size: 13px !important;
                }
            }

            @media (prefers-reduced-motion: reduce) {
                #projectsContainer .project-card,
                #projectsContainer .project-icon img { transition: none !important; }
                #projectsContainer .project-card::before,
                #projectsContainer .project-card::after { animation: none !important; transition: none !important; }
                #projectsContainer .project-card.tm-premium-enter { animation: none !important; opacity: 1 !important; }
            }
        `;
        document.head.appendChild(style);

        const container = document.getElementById('projectsContainer');
        if (!container) return;

        function prepararCards() {
            const cards = container.querySelectorAll('.project-card');
            cards.forEach((card, index) => {
                if (!card.classList.contains('tm-premium-ready')) {
                    card.classList.add('tm-premium-ready', 'tm-premium-enter');
                    card.style.setProperty('--tm-index', Math.min(index, 12));

                    const line = document.createElement('span');
                    line.className = 'tm-card-footer-line';
                    line.setAttribute('aria-hidden', 'true');
                    card.appendChild(line);

                    // Tilt 3D vanilla, sutil y limitado para no molestar.
                    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
                    if (window.matchMedia('(pointer: fine)').matches) {
                        card.addEventListener('pointermove', (event) => {
                            const rect = card.getBoundingClientRect();
                            const x = (event.clientX - rect.left) / rect.width - .5;
                            const y = (event.clientY - rect.top) / rect.height - .5;
                            card.style.transform = `translateY(-8px) scale(1.02) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg)`;
                        });
                        card.addEventListener('pointerleave', () => {
                            card.style.transform = '';
                        });
                    }
                }
            });
        }

        prepararCards();
        const observer = new MutationObserver(prepararCards);
        observer.observe(container, { childList: true });
    }

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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', activarCardsGamingPremium, { once: true });
    } else {
        activarCardsGamingPremium();
    }
})();
