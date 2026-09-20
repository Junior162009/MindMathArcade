// TecnoMath Shared API — compatibilidad común sobre Supabase Auth + PostgreSQL
(function () {
  'use strict';
  window.Tecnomath={
  /* TECNOMATH_SUPABASE_SHARED_API_V1 */
  login(username,password){
    return window.TecnomathAuth?.signIn(username,password).then(r=>({success:true,username:r.profile?.username||username})).catch(e=>({success:false,message:e?.message||'Usuario o contraseña incorrectos'}));
  },
  register(username,password,phone){
    const email=String(username||'').trim();
    return Promise.reject(new Error('El registro oficial usa correo electrónico. Abre ACCEDER para crear tu cuenta.'));
  },
  logout(){return window.TecnomathAuth?.signOut();},
  setSession(username){if(window.TecnomathAuth)window.TecnomathAuth.setSession(username);},
  getCurrentUser(){return window.TecnomathAuth?.getSession?.()||null;},
  isAdmin(){return !!window.TecnomathCurrentAdmin;},
  setAdmin(){return !!window.TecnomathCurrentAdmin;},
  unsetAdmin(){window.TecnomathCurrentAdmin=null;},
  getAdminEmails(){return window.TecnomathAuth?[...window.TecnomathAuth.ADMIN_EMAILS]:[];},
  getCoins(){
    if(this.isAdmin())return Infinity;
    const u=this.getCurrentUser(); if(!u)return 0;
    const key='tecnomath_supabase_coins_'+u.username;
    const n=Number(localStorage.getItem(key)||0);
    this._refreshProfileCache(); return Number.isFinite(n)?n:0;
  },
  _refreshProfileCache(){
    if(this._profileRefresh)return this._profileRefresh;
    this._profileRefresh=window.TecnomathAuth?.currentUser().then(async u=>{
      if(!u)return;
      const p=await window.TecnomathAuth.getProfile(u);
      if(!p)return;
      localStorage.setItem('tecnomath_supabase_coins_'+p.username,String(Number(p.coins||0)));
      localStorage.setItem('tecnomath_supabase_xp_'+p.username,String(Number(p.xp||0)));
    }).catch(()=>{}).finally(()=>{this._profileRefresh=null});
    return this._profileRefresh;
  },
  addCoins(n){
    if(this.isAdmin())return true;
    const delta=Math.floor(Number(n)||0); if(!delta)return true;
    const u=this.getCurrentUser(); if(!u||!window.TecnomathAuth)return false;
    window.TecnomathAuth.getClient().then(db=>db.rpc('tecnomath_change_coins',{delta})).then(({data})=>{
      if(data!=null)localStorage.setItem('tecnomath_supabase_coins_'+u.username,String(Number(data)||0));
    }).catch(e=>console.warn('TecnoMath Supabase coins:',e));
    localStorage.setItem('tecnomath_supabase_coins_'+u.username,String(this.getCoins()+delta));
    return true;
  },
  spendCoins(n){
    if(this.isAdmin())return true;
    const amount=Math.floor(Number(n)||0); if(amount<=0)return true;
    if(this.getCoins()<amount)return false;
    return this.addCoins(-amount);
  },
  getGameCoins(id){
    const p=this.getProgress(id); return Number(p.gameCoins||0);
  },
  setGameCoins(id,n){
    const p=this.getProgress(id); p.gameCoins=Math.max(0,Math.floor(Number(n)||0)); this.setProgress(id,p);
  },
  exchangeGlobalToLocal(id,n){
    if(this.isAdmin())return true;
    const amount=Math.floor(Number(n)||0); const local=Math.floor(amount*.9);
    if(this.getCoins()<amount)return false;
    if(!this.spendCoins(amount))return false;
    this.setGameCoins(id,this.getGameCoins(id)+local); return true;
  },
  exchangeLocalToGlobal(id,n){
    if(this.isAdmin())return true;
    const amount=Math.floor(Number(n)||0); if(this.getGameCoins(id)<amount)return false;
    this.setGameCoins(id,this.getGameCoins(id)-amount); this.addCoins(Math.floor(amount*.9)); return true;
  },
  getProgress(id){
    const u=this.getCurrentUser(); if(!u)return {};
    const key='tecnomath_supabase_progress_'+u.username+'_'+id;
    try{return JSON.parse(localStorage.getItem(key)||'{}')}catch(_){return {}}
  },
  setProgress(id,data){
    const u=this.getCurrentUser(); if(!u||!window.TecnomathAuth)return false;
    const value=(data&&typeof data==='object')?data:{};
    localStorage.setItem('tecnomath_supabase_progress_'+u.username+'_'+id,JSON.stringify(value));
    window.TecnomathAuth.currentUser().then(async user=>{
      if(!user)return;
      const db=await window.TecnomathAuth.getClient();
      const {error}=await db.from('tecnomath_game_progress').upsert({user_id:user.id,game_id:String(id),progress:value,updated_at:new Date().toISOString()},{onConflict:'user_id,game_id'});
      if(error)console.warn('TecnoMath Supabase progress:',error);
    }).catch(e=>console.warn('TecnoMath Supabase progress:',e));
    return true;
  },
  updateHighScore(id,score){
    const p=this.getProgress(id); if(!p.highScore||score>p.highScore){p.highScore=score;this.setProgress(id,p)}
  }
};
  // La autenticación y la temática global se gestionan mediante Supabase.
  // index.html usa TecnomathSettings para el evento global.
  function loadEventEffects(){if(window.TecnoMathEventEffects)return;const s=document.createElement('script');s.src=(location.pathname.includes('/pages/')?'../../':'')+'js/fair-effects.js?v=1';s.async=true;document.head.appendChild(s)}
  loadEventEffects();
  function loadGameSubmissionSystem(){if(document.querySelector('script[data-tecnomath-game-submissions]'))return;const s=document.createElement('script');s.src=(location.pathname.includes('/pages/')?'../':'')+'js/game-submissions.js?v=2';s.async=true;s.dataset.tecnomathGameSubmissions='true';document.head.appendChild(s)}
  function loadPublishedGames(){if(document.querySelector('script[data-tecnomath-published-games]'))return;const s=document.createElement('script');s.src=(location.pathname.includes('/pages/')?'../':'')+'js/published-games.js?v=2';s.async=true;s.dataset.tecnomathPublishedGames='true';document.head.appendChild(s)}
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
