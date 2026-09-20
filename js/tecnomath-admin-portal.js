/* TecnoMath Admin Crown — Supabase role only */
(function(){
'use strict';
const ADMIN_LINK='pages/admin/index.html';
let isAdmin=false;

function removeLegacy(){
  ['adminAccessBtn','admin-cloud','admin-panel'].forEach(id=>document.getElementById(id)?.remove());
}
function ensureCrown(){
  const nav=document.querySelector('.tm-ui-nav');
  if(!nav)return;
  let link=nav.querySelector('#tm-ui-admin');
  if(!link){
    link=document.createElement('a');
    link.id='tm-ui-admin';
    link.href=ADMIN_LINK;
    link.textContent='👑 Admin';
    link.setAttribute('aria-label','Panel administrativo');
    nav.appendChild(link);
  }
  link.hidden=!isAdmin;
  link.setAttribute('aria-hidden',String(!isAdmin));
  link.tabIndex=isAdmin?0:-1;
}
async function sync(){
  removeLegacy();
  try{
    if(!window.TecnomathAuth){isAdmin=false;ensureCrown();return;}
    const user=await window.TecnomathAuth.currentUser();
    if(!user){isAdmin=false;ensureCrown();return;}
    const profile=await window.TecnomathAuth.getProfile(user);
    isAdmin=String(profile?.role||'').toLowerCase()==='admin';
  }catch(error){
    console.warn('TecnoMath admin crown:',error);
    isAdmin=false;
  }
  removeLegacy();
  ensureCrown();
}
function start(){
  removeLegacy();
  sync();
  window.addEventListener('tecnomath:authchange',sync);
  const observer=new MutationObserver(()=>{removeLegacy();ensureCrown();});
  if(document.body)observer.observe(document.body,{subtree:true,childList:true});
  [250,700,1500,3000].forEach(t=>setTimeout(sync,t));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
