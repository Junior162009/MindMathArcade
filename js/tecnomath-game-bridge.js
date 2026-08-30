// TecnoMath bridge: conecta juegos educativos existentes al progreso central
// sin tocar su lógica interna ni conceder recompensas al abrirlos.
(function(){
  'use strict';
  const path=String(location.pathname||'');
  const isQuizzer=/\/games\/esequiel11%C2%B0\/quizzer\.html$|\/games\/esequiel11°\/quizzer\.html$/i.test(path);
  if(!isQuizzer) return;

  function central(){return window.TecnoMathProgress&&typeof window.TecnoMathProgress.gameResult==='function'?window.TecnoMathProgress:null;}
  function start(){
    const results=document.getElementById('results');
    const game=document.getElementById('game');
    if(!results||!game){setTimeout(start,250);return;}
    let missionStarted=false;
    let submitted=false;
    let lastFeed='';
    const feed=document.getElementById('feed');
    const observer=new MutationObserver(()=>{
      if(feed){
        const text=feed.textContent||'';
        if(text!==lastFeed && /Correcto|Incorrecto/i.test(text)) lastFeed=text;
      }
      if(game.classList.contains('on')){missionStarted=true;submitted=false;}
      if(results.classList.contains('on')&&missionStarted&&!submitted){
        const root=central();
        if(!root)return;
        const correctText=(lastFeed.match(/Correcto/gi)||[]).length;
        // El juego conserva sus contadores en el DOM/local state; el puente
        // acumula respuestas mediante los botones para obtener el resultado real.
        const state=window.__tmQuizzerBridgeState||{correct:0,wrong:0,xp:0};
        const scoreEl=document.getElementById('score');
        const score=Math.max(0,Number(scoreEl&&scoreEl.textContent)||0);
        const topic=(document.getElementById('subname')?.textContent||'Quizzer').toLowerCase();
        if(state.correct+state.wrong>0){
          root.gameResult('Quizzer',{correct:state.correct,wrong:state.wrong,games:1,xp:score*2,coins:Math.max(0,Math.floor(score/5)),topic});
          submitted=true;
        }
      }
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});

    document.addEventListener('click',e=>{
      const btn=e.target.closest&&e.target.closest('.answer');
      if(!btn)return;
      setTimeout(()=>{
        const s=window.__tmQuizzerBridgeState||(window.__tmQuizzerBridgeState={correct:0,wrong:0,xp:0});
        if(btn.classList.contains('ok'))s.correct++;
        else if(btn.classList.contains('bad'))s.wrong++;
      },0);
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
