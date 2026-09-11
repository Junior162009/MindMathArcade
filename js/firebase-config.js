// Compatibilidad histórica: este archivo ya NO inicializa Firebase.
// Sistema oficial TecnoMath: Supabase Auth + PostgreSQL.
(function(){
  'use strict';
  if(window.__TECNO_MATH_SUPABASE_BOOTSTRAP__)return;
  window.__TECNO_MATH_SUPABASE_BOOTSTRAP__=true;
  function load(src,attr){return new Promise((resolve,reject)=>{const old=document.querySelector('script['+attr+']');if(old){if(old.dataset.ready==='1')return resolve();old.addEventListener('load',resolve,{once:true});old.addEventListener('error',reject,{once:true});return}const s=document.createElement('script');s.src=src;s.async=false;s.setAttribute(attr,'true');s.onload=()=>{s.dataset.ready='1';resolve()};s.onerror=reject;document.head.appendChild(s)})}
  load('/js/tecnomath-auth.js?v=20260911-4','data-tecnomath-auth-loader').catch(e=>console.warn('TecnoMath Auth:',e));
  load('/js/tecnomath-progress.js?v=7','data-tecnomath-progress-loader').catch(e=>console.warn('TecnoMath Progress:',e));
  window.TecnomathFirebase={
    get auth(){return{get currentUser(){return window.TecnoMathProgress?.getUser?.()||null}}},
    database:null,
    storage:null,
    serverTimestamp:null,
    deprecated:true
  };
})();
