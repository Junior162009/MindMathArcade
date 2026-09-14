/* TecnoMath · acceso de administrador del portal (Supabase) */
(function(){
  'use strict';
  const ADMIN_LINK='pages/admin/index.html';
  async function sync(){
    if(!window.TecnomathAuth)return;
    try{
      const admin=await window.TecnomathAuth.isAdmin();
      const cloud=document.getElementById('admin-cloud');
      const panel=document.getElementById('admin-panel');
      const btn=document.getElementById('adminAccessBtn');
      if(cloud) cloud.style.display=admin?'block':'none';
      if(btn){btn.style.display=admin?'block':'none';btn.href=ADMIN_LINK;}
      if(!admin && panel) panel.style.display='none';
    }catch(e){
      console.warn('TecnoMath Admin:',e);
      const cloud=document.getElementById('admin-cloud');
      const btn=document.getElementById('adminAccessBtn');
      if(cloud) cloud.style.display='none';
      if(btn) btn.style.display='none';
    }
  }
  function start(){
    sync();
    window.addEventListener('tecnomath:authchange',sync);
    setTimeout(sync,1000);
    setTimeout(sync,2500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
