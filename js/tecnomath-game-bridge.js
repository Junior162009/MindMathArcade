// TecnoMath Game Bridge: integración masiva y segura de progreso/saves.
(function(){
  'use strict';
  const path=String(location.pathname||'');
  const gameMatch=path.match(/\/games\/([^/]+)(?:\/|$)/i);
  const gameId=gameMatch?decodeURIComponent(gameMatch[1]).replace(/[^a-z0-9_-]/gi,'-').toLowerCase():'unknown-game';
  const central=()=>window.TecnoMathProgress&&typeof window.TecnoMathProgress.gameResult==='function'?window.TecnoMathProgress:null;
  const v3=()=>window.TecnoMathProgressV3;

  // Capa masiva de saves: conserva el save local y crea una copia cloud por UID.
  // Nunca reemplaza un save local existente con uno remoto.
  function localSnapshot(){const out={};try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k==null)continue;out[k]=localStorage.getItem(k)}}catch(_){}return out}
  let lastSignature='';
  async function cloudSave(){
    const f=window.TecnomathFirebase,u=f?.auth?.currentUser;if(!f||!u||!f.database)return;
    const snap=localSnapshot(),sig=JSON.stringify(snap);if(sig===lastSignature)return;lastSignature=sig;
    try{
      const ref=f.database.ref('userProgress/'+u.uid+'/games/'+gameId);
      const old=(await ref.once('value')).val()||{};
      const payload={gameId,localStorage:snap,localStorageKeys:Object.keys(snap),updatedAt:f.serverTimestamp,autoBackup:true};
      if(!old.migratedAt)payload.migratedAt=f.serverTimestamp;
      await ref.update(payload);
      if(v3()?.saveGame)await v3().saveGame(gameId,{localStorage:snap,updatedAt:Date.now(),source:'mass-game-bridge'});
    }catch(e){console.warn('[TecnoMath] save cloud:',e)}
  }
  async function restoreCloud(){
    const f=window.TecnomathFirebase,u=f?.auth?.currentUser;if(!f||!u||!f.database)return;
    try{
      const s=await f.database.ref('userProgress/'+u.uid+'/games/'+gameId+'/localStorage').once('value'),remote=s.val();
      if(!remote||typeof remote!=='object')return;
      // Solo restaura claves que NO existen localmente. El save local siempre gana.
      Object.entries(remote).forEach(([k,val])=>{try{if(localStorage.getItem(k)===null&&typeof val==='string')localStorage.setItem(k,val)}catch(_){}});
      if(v3()?.saveGame)await v3().saveGame(gameId,{localStorage:localSnapshot(),updatedAt:Date.now(),restoredFromCloud:true});
      window.dispatchEvent(new CustomEvent('tecnomath:game-save-restored',{detail:{gameId}}));
    }catch(e){console.warn('[TecnoMath] restore cloud:',e)}
  }
  function bootMassSave(){
    if(!gameMatch)return;
    let attempts=0;
    const wait=()=>{if(window.TecnomathFirebase?.auth?.currentUser){restoreCloud().then(cloudSave).catch(()=>{});setInterval(()=>cloudSave().catch(()=>{}),30000);return}if(++attempts<60)setTimeout(wait,1000)};wait();
    addEventListener('beforeunload',()=>{cloudSave().catch(()=>{})});
    addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')cloudSave().catch(()=>{})});
  }
  bootMassSave();

  // Cookie Clicker conserva su bridge especializado.
  if(/\/games\/cookie-clicker\//i.test(path)){
    if(!document.querySelector('script[data-tecnomath-cookie-bridge]')){const s=document.createElement('script');s.src='/games/cookie-clicker/tecnomath-progress-bridge.js?v=3';s.async=true;s.dataset.tecnomathCookieBridge='true';document.head.appendChild(s)}
    return;
  }

  // Quizzer: resultados educativos reales.
  const isQuizzer=/\/games\/esequiel11%C2%B0\/quizzer\.html$|\/games\/esequiel11°\/quizzer\.html$/i.test(path);
  if(!isQuizzer)return;
  function startQuiz(){const results=document.getElementById('results'),game=document.getElementById('game'),feed=document.getElementById('feed');if(!results||!game||!feed){setTimeout(startQuiz,250);return}let missionStarted=false,submitted=false,wasGameOn=false,lastFeed='',state={correct:0,wrong:0};const observer=new MutationObserver(()=>{const gameOn=game.classList.contains('on');if(gameOn&&!wasGameOn){missionStarted=true;submitted=false;state={correct:0,wrong:0};lastFeed=''}wasGameOn=gameOn;const text=feed.textContent||'';if(text!==lastFeed){if(/¡Correcto!/i.test(text))state.correct++;else if(/❌\s*Incorrecto|Incorrecto/i.test(text))state.wrong++;lastFeed=text}if(results.classList.contains('on')&&missionStarted&&!submitted){const root=central();if(!root)return;const score=Math.max(0,Number(document.getElementById('score')?.textContent)||0),topic=(document.getElementById('subname')?.textContent||'Quizzer').toLowerCase();if(state.correct+state.wrong>0){root.gameResult('Quizzer',{correct:state.correct,wrong:state.wrong,games:1,xp:score*2,coins:Math.max(0,Math.floor(score/5)),topic});submitted=true}}});observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startQuiz,{once:true});else startQuiz();
})();
