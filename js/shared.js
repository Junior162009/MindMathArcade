// TecnoMath Shared API v3.1 - administración y sincronización de temática por Firebase
(function () {
  'use strict';
  const STORAGE_KEY='tecnomath_users', SESSION_KEY='tecnomath_session';
  const COINS_PREFIX='tecnomath_coins_', GAME_COINS_PREFIX='tecnomath_gamecoins_', PROGRESS_PREFIX='tecnomath_progress_';
  const ADMIN_EMAILS=['delahozbarcelojunior@gmail.com','nicolenatera26@gmail.com','mateobarbosamatos@gmail.com','jandresvf23@gmail.com'];
  const ADMIN_NAMES={'delahozbarcelojunior@gmail.com':'Junior','nicolenatera26@gmail.com':'Nicole','mateobarbosamatos@gmail.com':'Mateo','jandresvf23@gmail.com':'Jaider'};
  function getUsers(){const d=localStorage.getItem(STORAGE_KEY);if(!d)return[];try{const u=JSON.parse(d);return Array.isArray(u)?u:[]}catch(e){localStorage.removeItem(STORAGE_KEY);return[]}}
  function saveUsers(u){localStorage.setItem(STORAGE_KEY,JSON.stringify(u))}
  function findUser(n){return getUsers().find(u=>String(u.username||'').toLowerCase()===String(n||'').toLowerCase())}
  function createUser(username,password){const users=getUsers();if(findUser(username))return null;const u={username,password,role:'user',isAdmin:false,created:new Date().toISOString()};users.push(u);saveUsers(users);return u}
  function firebaseUser(){try{return window.firebase?.auth?.().currentUser||null}catch(_){return null}}
  function isAdminEmail(email){return ADMIN_EMAILS.includes(String(email||'').trim().toLowerCase())}
  function isAdmin(){const u=firebaseUser();return !!u&&isAdminEmail(u.email)}
  function adminUsername(user){const e=String(user?.email||'').trim().toLowerCase();return ADMIN_NAMES[e]||e.split('@')[0].replace(/[^a-z0-9._-]/g,'')||'Admin'}
  async function ensureFirebaseProfile(user){if(!user||!isAdminEmail(user.email)||!window.firebase?.database)return null;const ref=firebase.database().ref('users/'+user.uid);const snap=await ref.once('value');const current=snap.val()||{};const data={...current,username:current.username||adminUsername(user),email:user.email,role:'admin',isAdmin:true,provider:user.providerData?.[0]?.providerId||'firebase',updatedAt:firebase.database.ServerValue.TIMESTAMP};await ref.update(data);localStorage.setItem(SESSION_KEY,JSON.stringify({username:data.username}));return data}
  window.Tecnomath={
    login(username,password){username=(username||'').trim();password=(password||'').trim();if(!username||!password)return{success:false,message:'Usuario y contraseña requeridos'};const u=findUser(username);if(!u||u.password!==password)return{success:false,message:'Usuario o contraseña incorrectos'};localStorage.setItem(SESSION_KEY,JSON.stringify({username:u.username}));return{success:true,username:u.username}},
    register(username,password){username=(username||'').trim();password=(password||'').trim();if(username.length<3)return{success:false,message:'El usuario debe tener al menos 3 caracteres'};if(password.length<4)return{success:false,message:'La contraseña debe tener al menos 4 caracteres'};if(findUser(username))return{success:false,message:'Ese usuario ya existe. Usa ENTRAR.'};const u=createUser(username,password);if(!u)return{success:false,message:'No se pudo crear el usuario'};localStorage.setItem(SESSION_KEY,JSON.stringify({username:u.username}));return{success:true,username:u.username}},
    logout(){localStorage.removeItem(SESSION_KEY)},setSession(username){if(username)localStorage.setItem(SESSION_KEY,JSON.stringify({username:String(username).trim()}))},
    getCurrentUser(){const s=localStorage.getItem(SESSION_KEY);if(!s)return null;try{const d=JSON.parse(s);return d.username?{username:d.username}:null}catch(_){localStorage.removeItem(SESSION_KEY);return null}},
    isAdmin,setAdmin(){return isAdmin()},unsetAdmin(){},getAdminEmails(){return [...ADMIN_EMAILS]},ensureFirebaseProfile,
    getCoins(){if(isAdmin())return Infinity;const u=this.getCurrentUser();if(!u)return 0;const c=localStorage.getItem(COINS_PREFIX+u.username);return c?parseInt(c,10):0},
    addCoins(n){if(isAdmin())return true;const u=this.getCurrentUser();if(!u)return false;localStorage.setItem(COINS_PREFIX+u.username,this.getCoins()+n);return true},
    spendCoins(n){if(isAdmin())return true;const u=this.getCurrentUser();if(!u)return false;const c=this.getCoins();if(c<n)return false;localStorage.setItem(COINS_PREFIX+u.username,c-n);return true},
    getGameCoins(id){if(isAdmin())return Infinity;const u=this.getCurrentUser();if(!u)return 0;const d=localStorage.getItem(GAME_COINS_PREFIX+u.username+'_'+id);return d?parseInt(d,10):0},
    setGameCoins(id,n){if(isAdmin())return;const u=this.getCurrentUser();if(u)localStorage.setItem(GAME_COINS_PREFIX+u.username+'_'+id,n)},
    exchangeGlobalToLocal(id,n){if(isAdmin())return true;const local=Math.floor(n*.9);if(this.getCoins()<n||!this.spendCoins(n))return false;this.setGameCoins(id,this.getGameCoins(id)+local);return true},
    exchangeLocalToGlobal(id,n){if(isAdmin())return true;const global=Math.floor(n*.9);if(this.getGameCoins(id)<n)return false;this.setGameCoins(id,this.getGameCoins(id)-n);this.addCoins(global);return true},
    getProgress(id){const u=this.getCurrentUser();if(!u)return{};const d=localStorage.getItem(PROGRESS_PREFIX+u.username+'_'+id);if(!d)return{};try{return JSON.parse(d)}catch(_){return{}}},
    setProgress(id,data){const u=this.getCurrentUser();if(u)localStorage.setItem(PROGRESS_PREFIX+u.username+'_'+id,JSON.stringify(data))},
    updateHighScore(id,score){const p=this.getProgress(id);if(!p.highScore||score>p.highScore){p.highScore=score;this.setProgress(id,p)}}
  };
  function dashboardUrl(){return /\/pages\//.test(location.pathname)?new URL('admin/index.html',location.href).href:new URL('pages/admin/index.html',location.href).href}
  function setupAdminBridge(){if(!window.firebase?.auth||!window.firebase?.database)return;let readyAdmin=false;firebase.auth().onAuthStateChanged(async user=>{readyAdmin=!!user&&isAdminEmail(user.email);if(!user)return;if(readyAdmin){try{await ensureFirebaseProfile(user)}catch(error){console.error('TecnoMath: error sincronizando admin',error)}const button=document.querySelector('#admin-cloud');if(button){button.style.display='block';button.innerHTML='👑';button.title='Panel de Control';button.setAttribute('aria-label','Abrir Panel de Control')}}});document.addEventListener('click',event=>{const button=event.target.closest?.('#admin-cloud'),user=firebase.auth().currentUser;if(!button||!user||(!readyAdmin&&!isAdminEmail(user.email)))return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();location.assign(dashboardUrl())},true)}
  setupAdminBridge();
  function setupThemeBridge(){
    if(!window.firebase?.database)return;
    const MAP={
      normal:null,
      halloween:['🎃 TECNOMATH HALLOWEEN 🎃','🎃 ¡MODO HALLOWEEN ACTIVADO! 🦇',['#FF6600','#FFA500','#800080','#000000','#FF4500'],['🎃','🧛','🦇','🧙','🕷️','🕸️','👻','💀']],
      navidad:['🎄 TECNOMATH NAVIDAD 🎄','🎄 ¡FELIZ NAVIDAD! 🎅',['#FF0000','#FFFFFF','#00FF00','#FFD700','#008000'],['🎄','🎅','🧝','🎁','⛄','🦌','🌟','🔔']],
      mundial:['🏆 TECNOMATH MUNDIAL 🏆','⚽ ¡MODO MUNDIAL ACTIVADO! 🌍',['#FFD700','#009A3E','#FFFFFF','#008000','#FF4500'],['⚽','🏆','🌍','🇦🇷','🇧🇷','🇫🇷','🇪🇸','🇩🇪','🥅']],
      cumpleanos:['🥳 TECNOMATH CUMPLEAÑOS 🥳','🎂 ¡FELIZ CUMPLEAÑOS! 🎉',['#FF1493','#FFD700','#00BFFF','#FF4500','#32CD32'],['🎂','🎈','🎉','🥳','🎁','🎊','🎵','🕺']],
      feria:['TECNOMATH FERIA','🎉 ¡BIENVENIDO AL MODO FERIA! 🎈',null,['🎡','🎠','🎪','🎟️','🍿','🎈','🏆','🎯']],
      feriaplus:['🔥 TECNOMATH MEGA FERIA 🔥','🔥 ¡MEGA FERIA ACTIVADA! 🔥',null,['🔥','🎡','🎢','🚀','⭐','🏆','💥','🎯']],
      primavera:['PRIMAVERA EN TECNOMATH','¡La aventura florece! Bienvenido a Primavera.',['#ff91b5','#fff3a6','#8ce6c5','#ffffff'],[]],
      espacio:['MISIÓN ESPACIAL TECNOMATH','Misión iniciada: explora, calcula y despega.',['#8977ff','#62d8ff','#c7edff','#f087ff'],[]],
      ciencia:['LABORATORIO TECNOMATH','Experimento activado: aprende, prueba y descubre.',['#38d6c6','#7cecff','#a7f071','#ffffff'],[]]
    };
    let last='__unset__';
    const apply=theme=>{theme=String(theme||'normal').toLowerCase();if(theme==='normal'||!MAP[theme]){if(last==='normal')return;last='normal';if(typeof window.deactivateFairMode==='function'&&window.fairMode)window.deactivateFairMode(false);if(typeof window.deactivateVisualEffects==='function')window.deactivateVisualEffects();if(typeof window.loadThemeCSS==='function')window.loadThemeCSS(null);if(typeof window.updateFavicon==='function')window.updateFavicon('🎮');const t=document.getElementById('mainTitle');if(t)t.textContent='TECNOMATH';if(typeof window.renderProjects==='function')window.renderProjects(window.currentActiveFilter||'todos');return}const c=MAP[theme];last=theme;if(theme==='feria'&&typeof window.activateFairMode==='function'){window.activateFairMode(false);return}if(theme==='feriaplus'&&typeof window.activateMegaFair==='function'){window.activateMegaFair(false);return}if(typeof window.activatePermanentTheme==='function')window.activatePermanentTheme(c[0],c[1],c[2],c[3],theme,false)};
    firebase.database().ref('tecnomath/tematicaActiva').on('value',snap=>{const theme=snap.val()||'normal';let tries=0;const wait=()=>{if(typeof window.activatePermanentTheme==='function'||typeof window.renderProjects==='function'||theme==='normal')apply(theme);else if(tries++<100)setTimeout(wait,100)};wait()},error=>console.warn('TecnoMath: no se pudo leer la temática global:',error.code));
  }
  setupThemeBridge();
  function loadEventEffects(){if(window.TecnoMathEventEffects)return;const s=document.createElement('script');s.src=(location.pathname.includes('/pages/')?'../../':'')+'js/fair-effects.js?v=1';s.async=true;document.head.appendChild(s)}
  loadEventEffects();
  function loadGameSubmissionSystem(){if(document.querySelector('script[data-tecnomath-game-submissions]'))return;const s=document.createElement('script');s.src=(location.pathname.includes('/pages/')?'../':'')+'js/game-submissions.js?v=2';s.async=true;s.dataset.tecnomathGameSubmissions='true';document.head.appendChild(s)}
  function loadPublishedGames(){if(document.querySelector('script[data-tecnomath-published-games]'))return;const s=document.createElement('script');s.src=(location.pathname.includes('/pages/')?'../':'')+'js/published-games.js?v=1';s.async=true;s.dataset.tecnomathPublishedGames='true';document.head.appendChild(s)}
  loadGameSubmissionSystem();loadPublishedGames();

  // 📈 MI PROGRESO — acceso visible desde el index principal.
  function setupProgressNavigation(){
    const isMainIndex=/(^|\/)index\.html?$/.test(location.pathname)||location.pathname.endsWith('/');
    if(!isMainIndex||document.getElementById('progressNavBtn'))return;
    const style=document.createElement('style');style.id='tecnomath-progress-nav-styles';style.textContent=`#progressNavBtn{display:inline-flex;align-items:center;justify-content:center;gap:5px;font-family:'Press Start 2P',cursive;font-size:clamp(4px,1.5vw,6px);color:#39FF14;background:transparent;border:1px solid #39FF14;padding:6px 9px;border-radius:6px;text-decoration:none;line-height:1.2;transition:transform .2s,background .2s,box-shadow .2s}#progressNavBtn:hover{background:rgba(57,255,20,.1);box-shadow:0 0 12px #39FF14;transform:translateY(-1px)}@media(max-width:768px){#progressNavBtn{padding:7px 8px}}`;document.head.appendChild(style);
    const userArea=document.querySelector('.user-area');
    if(userArea){const link=document.createElement('a');link.id='progressNavBtn';link.href='pages/progreso/index.html';link.textContent='📈 MI PROGRESO';link.title='Mi Progreso';link.setAttribute('aria-label','Abrir Mi Progreso');userArea.insertBefore(link,userArea.firstChild);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setupProgressNavigation,{once:true});else setupProgressNavigation();

  // ============================================================
  // 🌐 TECNOMATH SOCIAL — NAVEGACIÓN DESDE EL INDEX PRINCIPAL
  // Se inyecta desde shared.js para no duplicar ni alterar el catálogo.
  // ============================================================
  function setupSocialNavigation(){
    const isMainIndex = /(^|\/)index\.html?$/.test(location.pathname) || location.pathname.endsWith('/');
    if(!isMainIndex) return;
    const socialUrl='pages/social/index.html';

    const style=document.createElement('style');
    style.id='tecnomath-social-nav-styles';
    style.textContent=`
      #socialNavBtn{display:inline-flex;align-items:center;justify-content:center;gap:5px;font-family:'Press Start 2P',cursive;font-size:clamp(4px,1.5vw,6px);color:#00FFFF;background:transparent;border:1px solid #00FFFF;padding:6px 9px;border-radius:6px;text-decoration:none;line-height:1.2;transition:transform .2s,background .2s,box-shadow .2s}
      #socialNavBtn:hover{background:rgba(0,255,255,.1);box-shadow:0 0 12px #00FFFF;transform:translateY(-1px)}
      #tecnomathBottomNav{display:none}
      @media(max-width:768px){
        body{padding-bottom:74px}
        #tecnomathBottomNav{position:fixed;left:0;right:0;bottom:0;z-index:10000;display:grid;grid-template-columns:repeat(4,1fr);gap:2px;padding:7px max(6px,env(safe-area-inset-left)) calc(7px + env(safe-area-inset-bottom)) max(6px,env(safe-area-inset-right));background:rgba(6,6,16,.96);backdrop-filter:blur(14px);border-top:2px solid #00FFFF;box-shadow:0 -8px 25px rgba(0,0,0,.35)}
        #tecnomathBottomNav a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:52px;color:#aaa;text-decoration:none;font-family:'Press Start 2P',cursive;font-size:7px;border-radius:8px;transition:.2s}
        #tecnomathBottomNav a:hover,#tecnomathBottomNav a:focus{color:#00FFFF;background:rgba(0,255,255,.08);text-shadow:0 0 8px #00FFFF}
        #tecnomathBottomNav .social-active{color:#00FFFF;border:1px solid rgba(0,255,255,.35);text-shadow:0 0 8px #00FFFF}
        #socialNavBtn{padding:7px 8px}
      }
    `;
    document.head.appendChild(style);
    style.textContent += '\n      /* SOCIAL SOLO ARRIBA */\n      #tecnomathBottomNav{display:none !important}\n      body{padding-bottom:0 !important}\n    ';

    function createLink(id,text,href,icon){const a=document.createElement('a');a.id=id;a.href=href;a.className='social-nav-link';a.innerHTML=`<span style="font-size:21px;line-height:1">${icon}</span><span>${text}</span>`;return a}

    const userArea=document.querySelector('.user-area');
    if(userArea && !document.getElementById('socialNavBtn')){
      const link=document.createElement('a');
      link.id='socialNavBtn';link.href=socialUrl;link.textContent='🌐 SOCIAL';link.title='TecnoMath Social';link.setAttribute('aria-label','Abrir TecnoMath Social');
      userArea.insertBefore(link,userArea.firstChild);
    }

    if(!document.getElementById('tecnomathBottomNav')){
      const nav=document.createElement('nav');nav.id='tecnomathBottomNav';nav.setAttribute('aria-label','Navegación móvil');
      const home=createLink('tmBottomHome','INICIO','#','🏠');
      const games=createLink('tmBottomGames','JUEGOS','#projectsContainer','🎮');
      const social=createLink('tmBottomSocial','SOCIAL',socialUrl,'🌐');social.classList.add('social-active');
      const profile=createLink('tmBottomProfile','PERFIL','pages/profile.html','👤');
      home.addEventListener('click',e=>{e.preventDefault();window.scrollTo({top:0,behavior:'smooth'})});
      games.addEventListener('click',e=>{e.preventDefault();document.getElementById('projectsContainer')?.scrollIntoView({behavior:'smooth',block:'start'})});
      nav.append(home,games,social,profile);document.body.appendChild(nav);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setupSocialNavigation,{once:true});
  else setupSocialNavigation();
})();
