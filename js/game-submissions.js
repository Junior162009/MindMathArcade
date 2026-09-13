/* TecnoMath · acceso a subida de juegos · Supabase */
(function(){'use strict';
 function uploadButton(){
  if(/\/pages\/(admin\/|upload-game\.html)/.test(location.pathname))return;
  const n=document.querySelector('.user-area');
  if(!n||document.getElementById('tmUploadGameBtn'))return;
  const a=document.createElement('a');a.id='tmUploadGameBtn';a.className='auth-link tm-upload-btn';a.href=location.pathname.includes('/pages/')?'upload-game.html':'pages/upload-game.html';a.textContent='🎮 SUBIR JUEGO';
  n.appendChild(a);
  if(!document.getElementById('tm-submit-style')){const s=document.createElement('style');s.id='tm-submit-style';s.textContent='.tm-upload-btn{border-color:#39ff14!important;color:#39ff14!important}';document.head.appendChild(s)}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',uploadButton,{once:true});else uploadButton();
})();