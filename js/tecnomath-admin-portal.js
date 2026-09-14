/* TecnoMath admin crown */
(function(){
'use strict';
const ADMIN_LINK='pages/admin/index.html';
const ADMINS=['delahozbarcelojunior@gmail.com','nicolenatera26@gmail.com','mateobarbosamatos@gmail.com','jandresvf23@gmail.com'];
const ADMIN_NAMES=['junior','nicole','mateo','jaider'];
let isAdmin=false;
function show(v){
 isAdmin=!!v;
 const b=document.getElementById('adminAccessBtn');
 const c=document.getElementById('admin-cloud');
 if(b){b.href=ADMIN_LINK;b.style.setProperty('display',isAdmin?'inline-block':'none','important');b.style.setProperty('visibility',isAdmin?'visible':'hidden','important');b.style.setProperty('opacity',isAdmin?'1':'0','important');b.setAttribute('aria-hidden',isAdmin?'false':'true');b.tabIndex=isAdmin?0:-1;}
 if(c)c.style.setProperty('display','none','important');
}
function localAdmin(){try{const s=JSON.parse(localStorage.getItem('tecnomath_session')||'null');return ADMIN_NAMES.includes(String(s?.username||'').trim().toLowerCase());}catch(e){return false;}}
async function sync(){
 try{
  if(!window.TecnomathAuth){show(localAdmin());return;}
  const u=await window.TecnomathAuth.currentUser();
  if(u){
   const email=String(u.email||'').trim().toLowerCase();
   if(ADMINS.includes(email)){show(true);return;}
   const p=await window.TecnomathAuth.getProfile(u);
   show(p?.role==='admin');return;
  }
  show(localAdmin());
 }catch(e){show(localAdmin());}
}
function start(){
 show(false);sync();
 window.addEventListener('tecnomath:authchange',sync);
 [300,800,1500,3000].forEach(t=>setTimeout(sync,t));
 setInterval(sync,10000);
 const o=new MutationObserver(()=>{const b=document.getElementById('adminAccessBtn');if(!b)return;b.style.setProperty('display',isAdmin?'inline-block':'none','important');b.style.setProperty('visibility',isAdmin?'visible':'hidden','important');b.style.setProperty('opacity',isAdmin?'1':'0','important');});
 if(document.body)o.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','hidden']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
