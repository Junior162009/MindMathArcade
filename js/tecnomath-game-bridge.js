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
    const feed=document.getElementById('feed');
    if(!results||!game||!feed){setTimeout(start,250);return;}
    let missionStarted=false,submitted=false,wasGameOn=false,lastFeed='';
    let state={correct:0,wrong:0};
    const observer=new MutationObserver(()=>{
      const gameOn=game.classList.contains('on');
      if(gameOn&&!wasGameOn){missionStarted=true;submitted=false;state={correct:0,wrong:0};lastFeed='';}
      wasGameOn=gameOn;
      const text=feed.textContent||'';
      if(text!==lastFeed){
        if(/¡Correcto!/i.test(text)) state.correct++;
        else if(/❌\s*Incorrecto|Incorrecto/i.test(text)) state.wrong++;
        lastFeed=text;
      }
      if(results.classList.contains('on')&&missionStarted&&!submitted){
        const root=central();
        if(!root)return;
        const score=Math.max(0,Number(document.getElementById('score')?.textContent)||0);
        const topic=(document.getElementById('subname')?.textContent||'Quizzer').toLowerCase();
        if(state.correct+state.wrong>0){
          root.gameResult('Quizzer',{correct:state.correct,wrong:state.wrong,games:1,xp:score*2,coins:Math.max(0,Math.floor(score/5)),topic});
          submitted=true;
        }
      }
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
