/* TecnoMath · acceso de administrador del portal (Supabase) */
(function(){
  'use strict';
  const ADMIN_LINK='pages/admin/index.html';
  let lastAdmin=false;

  function setVisibility(admin){
    const btn=document.getElementById('adminAccessBtn');
    const cloud=document.getElementById('admin-cloud');
    const panel=document.getElementById('admin-panel');
    if(btn){
      btn.href=ADMIN_LINK;
      btn.style.setProperty('display',admin?'inline-block':'none','important');
      btn.setAttribute('aria-hidden',admin?'false':'true');
      btn.tabIndex=admin?0:-1;
    }
    if(cloud) cloud.style.setProperty('display','none','important');
    if(!admin && panel) panel.style.setProperty('display','none','important');
  }

  async function sync(){
    if(!window.TecnomathAuth){setVisibility(false);return;}
    try{
      lastAdmin=!!(await window.TecnomathAuth.isAdmin());
      setVisibility(lastAdmin);
    }catch(e){
      lastAdmin=false;
      console.warn('TecnoMath Admin:',e);
      setVisibility(false);
    }
  }

  function start(){
    setVisibility(false);
    sync();
    window.addEventListener('tecnomath:authchange',sync);
    setTimeout(sync,500);
    setTimeout(sync,1000);
    setTimeout(sync,2500);
    const observer=new MutationObserver(()=>{
      const btn=document.getElementById('adminAccessBtn');
      if(!btn)return;
      const shouldShow=lastAdmin;
      if((!shouldShow && btn.style.display!=='none') || (shouldShow && btn.style.display==='none'))
        btn.style.setProperty('display',shouldShow?'inline-block':'none','important');
    });
    observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['style','class']});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
