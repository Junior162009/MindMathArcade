/* TecnoMath · corona de administrador (Supabase) */
(function(){
  'use strict';
  const ADMIN_LINK='pages/admin/index.html';
  const FALLBACK_ADMINS=['delahozbarcelojunior@gmail.com','nicolenatera26@gmail.com','mateobarbosamatos@gmail.com','jandresvf23@gmail.com'];
  let lastAdmin=false;

  function setVisibility(admin){
    lastAdmin=!!admin;
    const btn=document.getElementById('adminAccessBtn');
    const cloud=document.getElementById('admin-cloud');
    const panel=document.getElementById('admin-panel');
    if(btn){
      btn.href=ADMIN_LINK;
      btn.style.setProperty('display',lastAdmin?'inline-block':'none','important');
      btn.style.setProperty('visibility',lastAdmin?'visible':'hidden','important');
      btn.style.setProperty('opacity',lastAdmin?'1':'0','important');
      btn.setAttribute('aria-hidden',lastAdmin?'false':'true');
      btn.tabIndex=lastAdmin?0:-1;
    }
    if(cloud) cloud.style.setProperty('display','none','important');
    if(!lastAdmin && panel) panel.style.setProperty('display','none','important');
  }

  function loadAuth(){
    return new Promise((resolve,reject)=>{
      if(window.TecnomathAuth)return resolve();
      const old=document.querySelector('script[data-tecnomath-auth]');
      if(old){old.addEventListener('load',resolve,{once:true});old.addEventListener('error',reject,{once:true});return;}
      const s=document.createElement('script');
      s.src='js/tecnomath-auth.js?v=20260914-admin';
      s.dataset.tecnomathAuth='true';
      s.onload=resolve;
      s.onerror=()=>reject(new Error('No se pudo cargar TecnoMath Auth.'));
      document.head.appendChild(s);
    });
  }

  async function sync(){
    try{
      await loadAuth();
      const user=await window.TecnomathAuth.currentUser();
      if(!user){setVisibility(false);return;}
      const email=String(user.email||'').trim().toLowerCase();
      const configured=(window.TecnomathAuth.ADMIN_EMAILS||FALLBACK_ADMINS).map(e=>String(e).trim().toLowerCase());
      if(configured.includes(email)){setVisibility(true);return;}
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
    setTimeout(sync,300);
    setTimeout(sync,800);
    setTimeout(sync,1500);
    setTimeout(sync,3000);
    setInterval(sync,10000);
    const observer=new MutationObserver(()=>{
      const btn=document.getElementById('adminAccessBtn');
      if(!btn)return;
      const shouldShow=lastAdmin;
      const visible=btn.style.display!=='none' && btn.style.visibility!=='hidden' && btn.style.opacity!=='0';
      if(visible!==shouldShow || btn.href!==new URL(ADMIN_LINK,location.href).href){
        btn.href=ADMIN_LINK;
        btn.style.setProperty('display',shouldShow?'inline-block':'none','important');
        btn.style.setProperty('visibility',shouldShow?'visible':'hidden','important');
        btn.style.setProperty('opacity',shouldShow?'1':'0','important');
        btn.tabIndex=shouldShow?0:-1;
      }
    });
    if(document.body)observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','hidden']});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
