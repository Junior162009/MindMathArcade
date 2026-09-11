/* TecnoMath Admin Guard - Supabase */
(async function(){
  'use strict';
  function goLogin(){ location.replace(new URL('../auth.html',location.href).href); }
  try{
    const user=await TecnomathAuth.currentUser();
    if(!user){goLogin();return;}
    const profile=await TecnomathAuth.ensureProfile(user);
    const admin=String(profile?.role||'').toLowerCase()==='admin' || TecnomathAuth.isAdminEmail(user.email);
    if(!admin){document.body.innerHTML='<main style="font-family:Arial;text-align:center;padding:60px"><h1>⛔ Acceso restringido</h1><p>Esta cuenta no tiene permisos de administrador.</p><a href="../index.html">Volver</a></main>';return;}
    window.TecnomathCurrentAdmin=profile;
    document.documentElement.dataset.tecnomathAdmin='true';
    window.dispatchEvent(new CustomEvent('tecnomath:admin-ready',{detail:{user,profile}}));
  }catch(error){console.error(error);goLogin();}
})();
