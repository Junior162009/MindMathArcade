/* TecnoMath · corona de administrador (Supabase) */
(function(){
  'use strict';
  const ADMIN_LINK='pages/admin/index.html';
  let lastAdmin=false;

  function setVisibility(admin){
    lastAdmin=!!admin;
    const btn=document.getElementById('adminAccessBtn');
    const cloud=document.getElementById('admin-cloud');
    const panel=document.getElementById('admin-panel');
    if(btn){
      btn.href=ADMIN_LINK;
      btn.style.setProperty('display',lastAdmin?'inline-block':'none','important');
      btn.setAttribute('aria-hidden',lastAdmin?'false':'true');
      btn.tabIndex=lastAdmin?0:-1;
    }
    if(cloud) cloud.style.setProperty('display','none','important');
    if(!lastAdmin && panel) panel.style.setProperty('display','none','important');
  }

  async function sync(){
    if(!window.TecnomathAuth){setVisibility(false);return;}
    try{
      const user=await window.TecnomathAuth.currentUser();
      if(!user){setVisibility(false);return;}
      const email=String(user.email||'').trim().toLowerCase();
      const admins=(window.TecnomathAuth.ADMIN_EMAILS||[]).map(e=>String(e).trim().toLowerCase());
      if(admins.includes(email)){setVisibility(true);return;}
      const profile=await window.TecnomathAuth.getProfile(user);
      setVisibility(profile?.role==='admin');
    }catch(e){
      console.warn('TecnoMath Admin:',e);
      setVisibility(false);
    }
  }

  function start(){
    setVisibility(false);
    sync();
    window.addEventListener('tecnomath:authchange',sync);
    setTimeout(sync,500);
    setTimeout(sync,1200);
    setTimeout(sync,2500);
    const observer=new MutationObserver(()=>{
      const btn=document.getElementById('adminAccessBtn');
      if(!btn)return;
      const visible=btn.style.display!=='none';
      if(visible!==lastAdmin)btn.style.setProperty('display',lastAdmin?'inline-block':'none','important');
    });
    if(document.body)observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['style','class']});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
