/* TecnoMath Admin Guard — guardia única para paneles de administración */
(function () {
  'use strict';
  function isAdmin(profile) { return String(profile?.role || '').toLowerCase() === 'admin'; }
  function isClassA(profile) { return isAdmin(profile) && String(profile?.admin_class || '').toUpperCase() === 'A'; }
  function loginUrl() { return new URL('../auth.html', location.href).href; }
  function renderDenied(message) {
    const main=document.createElement('main');
    main.style.cssText='font-family:Arial,sans-serif;text-align:center;padding:60px;color:#fff;background:#060610;min-height:100vh';
    const title=document.createElement('h1'); title.textContent='⛔ Acceso restringido';
    const text=document.createElement('p'); text.textContent=message||'Esta cuenta no tiene permisos de administrador.';
    const link=document.createElement('a'); link.style.color='#00ffff'; link.href=loginUrl(); link.textContent='Iniciar sesión';
    main.append(title,text,link); document.body.replaceChildren(main);
  }
  function waitForAuth(timeoutMs=8000){
    if(window.TecnomathAuth) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-tecnomath-admin-auth-loader]');
      const done=()=>window.TecnomathAuth?resolve():reject(new Error('TecnomathAuth no está disponible.'));
      if(existing){
        existing.addEventListener('load',done,{once:true});
        existing.addEventListener('error',()=>reject(new Error('No se pudo cargar TecnoMath Auth.')),{once:true});
        return;
      }
      const script=document.createElement('script');
      script.src=new URL('../js/tecnomath-auth.js?v=20260920-audit',location.href).href;
      script.async=false; script.dataset.tecnomathAdminAuthLoader='true';
      script.addEventListener('load',done,{once:true});
      script.addEventListener('error',()=>reject(new Error('No se pudo cargar TecnoMath Auth.')),{once:true});
      document.head.appendChild(script);
      window.setTimeout(()=>{if(!window.TecnomathAuth)reject(new Error('Tiempo agotado cargando TecnoMath Auth.'));},timeoutMs);
    });
  }
  function requireAdmin(options){
    options=options||{}; const redirect=options.redirect!==false;
    return (async()=>{
      try{
        await waitForAuth();
        const user=await window.TecnomathAuth.currentUser();
        if(!user){if(redirect)location.replace(loginUrl());throw new Error('Sesión no encontrada.');}
        const profile=await window.TecnomathAuth.getProfile(user);
        if(!isAdmin(profile)){if(redirect)renderDenied();throw new Error('La cuenta no tiene rol de administrador.');}
        window.TecnomathCurrentAdmin=profile; window.TecnomathCurrentUser=user;
        document.documentElement.dataset.tecnomathAdmin='true';
        const detail={user,profile}; window.dispatchEvent(new CustomEvent('tecnomath:admin-ready',{detail}));
        return detail;
      }catch(error){console.error('TecnoMath Admin Guard:',error);throw error;}
    })();
  }
  window.TecnomathAdminGuard={isAdmin,isClassA,requireAdmin};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(document.body?.dataset?.adminGuardAuto==='true')requireAdmin({redirect:true}).catch(()=>{});},{once:true});
  else if(document.body?.dataset?.adminGuardAuto==='true')requireAdmin({redirect:true}).catch(()=>{});
})();