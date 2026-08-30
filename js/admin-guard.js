/* TecnoMath - reconocimiento automático de administradores */
(function () {
  'use strict';

  const ADMIN_EMAILS = [
    'delahozbarcelojunior@gmail.com',
    'nicolenatera26@gmail.com',
    'mateobarbosamatos@gmail.com',
    'jandresvf23@gmail.com'
  ];

  const ADMIN_NAMES = {
    'delahozbarcelojunior@gmail.com': 'Junior',
    'nicolenatera26@gmail.com': 'Nicole',
    'mateobarbosamatos@gmail.com': 'Mateo',
    'jandresvf23@gmail.com': 'Jaider'
  };

  let adminClaimRefreshPromise = null;
  let adminClaimRefreshUid = null;

  function firebaseReady() {
    if (!window.TecnomathFirebase) throw new Error('Firebase no está inicializado.');
    return window.TecnomathFirebase;
  }

  function normalizedEmail(user) { return String(user && user.email || '').trim().toLowerCase(); }
  function isApprovedEmail(user) { return ADMIN_EMAILS.includes(normalizedEmail(user)); }

  async function refreshAdminClaim(user, expectedAdmin) {
    if (!user) return null;
    if (adminClaimRefreshPromise && adminClaimRefreshUid === user.uid) return adminClaimRefreshPromise;

    adminClaimRefreshUid = user.uid;
    adminClaimRefreshPromise = (async () => {
      try {
        const tokenResult = await user.getIdTokenResult();
        const shouldBeAdmin = expectedAdmin === true;
        const hasCorrectClaim = shouldBeAdmin
          ? tokenResult.claims && tokenResult.claims.admin === true
          : !(tokenResult.claims && tokenResult.claims.admin === true);

        // Evita llamadas y refrescos innecesarios cuando el token ya está correcto.
        if (hasCorrectClaim) return tokenResult;

        // El callable valida el rol directamente en RTDB antes de tocar el claim.
        if (typeof firebase.functions !== 'function') {
          await new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-tecnomath-functions-client]');
            if (existing) {
              existing.addEventListener('load', resolve, { once: true });
              existing.addEventListener('error', reject, { once: true });
              return;
            }
            const script = document.createElement('script');
            script.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-functions-compat.js';
            script.async = true;
            script.dataset.tecnomathFunctionsClient = 'true';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        if (typeof firebase.functions === 'function') {
          await firebase.functions().httpsCallable('syncAdminClaim')({});
          // Los custom claims nuevos solo llegan al ID token después de refrescarlo.
          return await user.getIdTokenResult(true);
        }

        return tokenResult;
      } catch (error) {
        console.warn('TecnoMath: no se pudo sincronizar/refrescar el claim admin:', error);
        return null;
      } finally {
        if (adminClaimRefreshUid === user.uid) {
          adminClaimRefreshPromise = null;
          adminClaimRefreshUid = null;
        }
      }
    })();

    return adminClaimRefreshPromise;
  }

  async function getAdminProfile(userArg) {
    const cloud = firebaseReady(), user = userArg || cloud.auth.currentUser;
    if (!user) return null;
    const email = normalizedEmail(user);
    if (ADMIN_EMAILS.includes(email)) {
      const ref = cloud.database.ref('users/' + user.uid), snapshot = await ref.once('value');
      const current = snapshot.val() || {}, username = current.username || ADMIN_NAMES[email] || email.split('@')[0];
      await ref.update({username, email:user.email, role:'admin', isAdmin:true, provider:user.providerData&&user.providerData[0]?user.providerData[0].providerId:'firebase'});
      return Object.assign({}, current, {uid:user.uid, username, email:user.email, role:'admin', isAdmin:true});
    }
    const snapshot = await cloud.database.ref('users/' + user.uid).once('value'), profile=snapshot.val()||{}, role=String(profile.role||'').toLowerCase();
    return role==='admin'||profile.isAdmin===true?Object.assign({},profile,{uid:user.uid,role:'admin',isAdmin:true}):null;
  }

  async function prepareAdminProfile(user, profile) {
    if (!profile) return null;
    await refreshAdminClaim(user, String(profile.role || '').toLowerCase() === 'admin' || profile.isAdmin === true);
    return profile;
  }

  async function initializeAdminRecognition() {
    const cloud = firebaseReady();
    return new Promise(resolve=>{const unsubscribe=cloud.auth.onAuthStateChanged(async user=>{unsubscribe();if(!user)return resolve(null);try{const profile=await getAdminProfile(user);if(profile){await prepareAdminProfile(user,profile);window.TecnomathCurrentAdmin=profile;window.TecnomathIsAdmin=true;document.documentElement.classList.add('is-admin');if(document.body)document.body.classList.add('is-admin');window.dispatchEvent(new CustomEvent('tecnomath:admin-ready',{detail:profile}));}else{await refreshAdminClaim(user,false);}resolve(profile);}catch(error){console.error('TecnoMath: error reconociendo administrador:',error);resolve(null);}});});
  }

  async function requireAdmin(options) {
    options=options||{};const cloud=firebaseReady(),redirect=options.redirect||'../auth.html';
    return new Promise((resolve,reject)=>{const unsubscribe=cloud.auth.onAuthStateChanged(async user=>{unsubscribe();try{if(!user){window.location.replace(redirect);return}const profile=await getAdminProfile(user);if(!profile){await refreshAdminClaim(user,false);alert('Acceso denegado: necesitas permisos de administrador.');window.location.replace(redirect);return}await prepareAdminProfile(user,profile);window.TecnomathCurrentAdmin=profile;window.TecnomathIsAdmin=true;resolve(profile);}catch(error){console.error('TecnoMath admin guard:',error);reject(error);}});});
  }

  window.TecnomathAdminGuard={ADMIN_EMAILS,ADMIN_NAMES,isApprovedEmail,getAdminProfile,initializeAdminRecognition,requireAdmin,refreshAdminClaim};

  function startRecognition(){try{if(window.TecnomathFirebase)initializeAdminRecognition();else window.addEventListener('tecnomath:firebase-ready',initializeAdminRecognition,{once:true});}catch(error){console.error('TecnoMath admin initialization:',error);}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startRecognition,{once:true});else startRecognition();

  function initAdminSidebar(){
    if(!/\/pages\/admin\/index\.html$/.test(location.pathname)&&!/\/pages\/admin\/?$/.test(location.pathname))return;
    if(document.getElementById('adminSidebarToggle'))return;
    const nav=document.querySelector('.admin-tabs');if(!nav)return;
    const button=document.createElement('button');button.id='adminSidebarToggle';button.type='button';button.className='admin-sidebar-toggle';button.setAttribute('aria-label','Mostrar u ocultar menú');button.setAttribute('aria-expanded','false');button.innerHTML='<span></span><span></span><span></span>';document.body.appendChild(button);
    const backdrop=document.createElement('button');backdrop.id='adminSidebarBackdrop';backdrop.type='button';backdrop.setAttribute('aria-label','Cerrar menú');document.body.appendChild(backdrop);
    const setOpen=open=>{document.body.classList.toggle('admin-sidebar-open',open);button.setAttribute('aria-expanded',String(open));};
    button.addEventListener('click',()=>setOpen(!document.body.classList.contains('admin-sidebar-open')));backdrop.addEventListener('click',()=>setOpen(false));
    nav.addEventListener('click',event=>{const tab=event.target.closest('.tab');if(tab&&window.matchMedia('(max-width: 800px)').matches)setOpen(false)});window.addEventListener('keydown',event=>{if(event.key==='Escape')setOpen(false)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initAdminSidebar,{once:true});else initAdminSidebar();

  function loadGameSubmissionsAdmin(){
    if(!/\/pages\/admin\/index\.html$/.test(location.pathname))return;
    if(document.querySelector('script[data-tecnomath-game-submissions]'))return;
    const script=document.createElement('script');script.src='../../js/game-submissions.js?v=offline-v1';script.async=false;script.dataset.tecnomathGameSubmissions='true';document.head.appendChild(script);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadGameSubmissionsAdmin,{once:true});else loadGameSubmissionsAdmin();

  if(/\/games\/esequiel11%C2%B0\/bandera\.html$/.test(location.pathname)||/\/games\/esequiel11°\/bandera\.html$/.test(location.pathname)){
    const loadBanderQuizDisplay=()=>{if(document.querySelector('script[data-tecnomath-banderquiz-display]'))return;const script=document.createElement('script');script.src='/js/banderquiz-display.js?v=2';script.async=false;script.dataset.tecnomathBanderquizDisplay='true';document.head.appendChild(script)};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadBanderQuizDisplay,{once:true});else loadBanderQuizDisplay();
  }
})();