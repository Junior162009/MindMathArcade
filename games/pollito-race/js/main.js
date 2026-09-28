(() => {
"use strict";
const $ = id => document.getElementById(id);
const S = {
  cat:"matematicas", diff:"facil", qs:[], q:null, used:new Set(),
  round:0, score:0, ok:0, bad:0, streak:0, lives:3,
  p:0, r1:0, r2:0, locked:true, started:0, finished:false
};
const CFG = {
  facil:{adv:15,pen:5,rv:[0.52,0.60]},
  normal:{adv:14,pen:6,rv:[0.68,0.76]},
  dificil:{adv:12,pen:7,rv:[0.82,0.92]}
};
const CAT = {
  matematicas:"🔴 MATEMÁTICAS", espanol:"🔵 ESPAÑOL",
  sociales:"🟡 SOCIALES", aleatorio:"🎲 ALEATORIO"
};
let timer=null;

const shuffle = a => [...a].sort(() => Math.random() - 0.5);

function screen(id){
  document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));
  $(id).classList.add("active");
  $("topHud").hidden = id !== "race";
  window.scrollTo({top:0,behavior:"smooth"});
}
function modal(id,on){ $(id).classList.toggle("open",on); }

async function loadQuestions(){
  if(S.qs.length) return;
  const r = await fetch("data/questions.json",{cache:"no-store"});
  if(!r.ok) throw new Error("No se pudo cargar questions.json");
  const data = await r.json();
  if(!Array.isArray(data) || data.length < 12) throw new Error("Banco de preguntas insuficiente");
  data.forEach((q,n)=>{
    if(!q.question || !Array.isArray(q.options) || q.options.length !== 4 ||
       !Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) {
      throw new Error("Pregunta inválida en posición "+(n+1));
    }
  });
  S.qs=data;
}
function pool(){
  const base=S.qs.filter(q=>S.cat==="aleatorio" || q.category===S.cat);
  const byDifficulty=base.filter(q=>q.difficulty===S.diff);
  return byDifficulty.length >= 4 ? byDifficulty : base;
}
function nextQuestion(){
  const p=pool();
  if(!p.length){ endGame("error"); return; }
  let available=p.filter(q=>!S.used.has(q.question));
  if(!available.length){S.used.clear();available=p;}
  S.q=available[Math.floor(Math.random()*available.length)];
  S.used.add(S.q.question);
  $("qnum").textContent="Pregunta "+(S.round+1);
  $("q").textContent=S.q.question;
  $("qcat").textContent=CAT[S.q.category];
  $("answers").innerHTML="";
  $("feedback").textContent="";
  $("feedback").className="feedback";

  shuffle(S.q.options.map((text,index)=>({text,index}))).forEach(item=>{
    const b=document.createElement("button");
    b.type="button";
    b.className="answer";
    b.textContent=item.text;
    b.dataset.index=item.index;
    b.onclick=()=>answer(item.index,b);
    $("answers").appendChild(b);
  });
}
function hud(){
  $("miniProgress").textContent=Math.round(S.p)+"%";
  $("miniLives").textContent=S.lives ? "❤️".repeat(S.lives) : "0";
  $("miniScore").textContent=S.score;
  $("ok").textContent=S.ok;
  $("bad").textContent=S.bad;
  $("streak").textContent=S.streak ? "x"+Math.min(4,S.streak) : "0";
  $("score").textContent=S.score;
  $("bar").style.width=S.p+"%";
  $("p").style.left=(8+S.p*.78)+"%";
  $("r1").style.left=(8+S.r1*.78)+"%";
  $("r2").style.left=(8+S.r2*.78)+"%";
}
function feedback(text,type){
  $("feedback").className="feedback "+type;
  $("feedback").textContent=text;
}
function answer(index,button){
  if(S.locked || S.finished || !S.q) return;
  S.locked=true;
  document.querySelectorAll(".answer").forEach(x=>x.disabled=true);
  const correct=index===S.q.correct;

  if(correct){
    S.ok++; S.streak++;
    const mult=Math.min(4,S.streak);
    const pts=100 + (mult>1 ? 50*mult : 0);
    S.score+=pts;
    S.p=Math.min(100,S.p+CFG[S.diff].adv+Math.min(3,S.streak-1));
    button.classList.add("correct");
    feedback("¡CORRECTO! 🐔💨 +"+pts+" puntos · racha x"+mult,"ok");
    $("trackmsg").textContent="⚡ ¡Tu pollito acelera!";
    $("p").classList.add("run");
    setTimeout(()=>$("p").classList.remove("run"),650);
  }else{
    S.bad++; S.streak=0; S.lives=Math.max(0,S.lives-1);
    S.p=Math.max(0,S.p-CFG[S.diff].pen);
    button.classList.add("wrong");
    document.querySelectorAll(".answer").forEach(x=>{
      if(Number(x.dataset.index)===S.q.correct) x.classList.add("correct");
    });
    feedback("¡INCORRECTO! 😵 Correcta: "+S.q.options[S.q.correct],"bad");
    $("trackmsg").textContent=S.lives
      ? "💥 Pierdes distancia. ¡Todavía puedes remontar!"
      : "💥 Te quedaste sin vidas, pero puedes terminar la carrera.";
    $("p").classList.add("hit");
    setTimeout(()=>$("p").classList.remove("hit"),450);
  }

  hud();
  if(S.p>=100){ endGame("player"); return; }
  setTimeout(()=>{
    if(S.finished)return;
    S.round++;
    S.locked=false;
    nextQuestion();
  },900);
}
function rivals(){
  if(S.locked || S.finished) return;
  const c=CFG[S.diff], t=(Date.now()-S.started)/1000;
  S.r1=Math.min(100,S.r1+c.rv[0]*(1+Math.sin(t*.65)*.08));
  S.r2=Math.min(100,S.r2+c.rv[1]*(1+Math.cos(t*.55)*.08));
  hud();
  if(S.r1>=100 || S.r2>=100) endGame("rival");
}
function countdown(done){
  const box=document.createElement("div");
  box.className="countdown";
  box.innerHTML="<strong>3</strong><span>¡PREPÁRATE!</span>";
  document.body.appendChild(box);
  let n=3;
  const tick=()=>{
    if(n>0){box.querySelector("strong").textContent=n; n--; setTimeout(tick,650);}
    else{
      box.querySelector("strong").textContent="🏁";
      box.querySelector("span").textContent="¡CORRE!";
      setTimeout(()=>{box.remove();done();},650);
    }
  };
  tick();
}
function endGame(reason){
  if(S.finished)return;
  S.finished=true; S.locked=true; clearInterval(timer); timer=null;

  let position=1;
  if(reason==="rival"){
    position=1 + [S.r1,S.r2].filter(v=>v>S.p).length;
  }else if(reason==="player"){
    position=1 + [S.r1,S.r2].filter(v=>v>S.p).length;
  }else{
    position=3;
  }

  const bonus=position===1?300:position===2?150:50;
  S.score+=bonus;
  saveRecord(position);

  const title=position===1 ? "🏆 ¡GANASTE LA CARRERA!" :
              position===2 ? "🥈 ¡SEGUNDO LUGAR!" :
              "🥉 ¡TERCER LUGAR!";
  $("resultTitle").textContent=title;
  $("resultSub").textContent=reason==="rival" && position>1
    ? "Un rival llegó primero. ¡Aprende de tus errores y vuelve a intentarlo!"
    : position===1
      ? "¡Excelente trabajo! Tu pollito cruzó primero la meta."
      : "¡Buen trabajo! Sigue practicando para mejorar tu posición.";
  $("pos").textContent=position+".º";
  $("resOk").textContent=S.ok;
  $("resBad").textContent=S.bad;
  $("resScore").textContent=S.score;
  screen("result");
  if(position===1) confetti();
}
function confetti(){
  const layer=document.createElement("div");
  layer.className="confetti";
  for(let i=0;i<45;i++){
    const x=document.createElement("i");
    x.textContent=["★","•","◆","✦"][i%4];
    x.style.left=(Math.random()*100)+"%";
    x.style.animationDelay=(Math.random()*.8)+"s";
    x.style.setProperty("--dx",(Math.random()*160-80)+"px");
    layer.appendChild(x);
  }
  document.body.appendChild(layer);
  setTimeout(()=>layer.remove(),3000);
}
function saveRecord(pos){
  try{
    const a=JSON.parse(localStorage.getItem("pollitoRaceRecords")||"[]");
    a.push({score:S.score,pos,ok:S.ok,bad:S.bad,cat:CAT[S.cat],
      diff:S.diff,date:new Date().toLocaleDateString("es-CO")});
    a.sort((x,y)=>y.score-x.score);
    localStorage.setItem("pollitoRaceRecords",JSON.stringify(a.slice(0,8)));
  }catch(e){console.warn("No se pudieron guardar récords",e);}
}
function showRecords(){
  let a=[];
  try{a=JSON.parse(localStorage.getItem("pollitoRaceRecords")||"[]");}catch(e){}
  $("recordsList").innerHTML=a.length
    ? a.map((r,i)=>'<div class="record"><span>#'+(i+1)+' '+r.cat+
      '<small>'+r.diff+' · '+r.ok+' correctas · '+r.date+'</small></span><b>'+r.score+' pts</b></div>').join("")
    : '<p style="color:#8f98a8">Todavía no hay récords. ¡Corre tu primera carrera!</p>';
}
async function start(){
  try{
    await loadQuestions();
    clearInterval(timer);
    Object.assign(S,{used:new Set(),round:0,score:0,ok:0,bad:0,streak:0,lives:3,
      p:0,r1:0,r2:0,locked:true,finished:false,started:0});
    $("raceCat").textContent=CAT[S.cat];
    $("trackmsg").textContent="Prepárate…";
    screen("race"); hud();
    countdown(()=>{
      if(S.finished)return;
      S.started=Date.now();
      S.locked=false;
      nextQuestion();
      timer=setInterval(rivals,500);
    });
  }catch(e){
    console.error(e);
    alert("No se pudo cargar el banco de preguntas. Revisa data/questions.json.");
  }
}

document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{
  document.querySelectorAll("[data-cat]").forEach(x=>x.classList.remove("active"));
  b.classList.add("active"); S.cat=b.dataset.cat;
  $("selection").textContent=CAT[S.cat]+" · "+S.diff.toUpperCase()+" · 3 carriles · 4 opciones";
});
document.querySelectorAll("[data-diff]").forEach(b=>b.onclick=()=>{
  document.querySelectorAll("[data-diff]").forEach(x=>x.classList.remove("active"));
  b.classList.add("active"); S.diff=b.dataset.diff;
  $("selection").textContent=CAT[S.cat]+" · "+S.diff.toUpperCase()+" · 3 carriles · 4 opciones";
});
$("play").onclick=$("categories").onclick=()=>screen("setup");
$("start").onclick=start;
$("back").onclick=()=>screen("home");
$("home").onclick=()=>screen("home");
$("again").onclick=()=>screen("setup");
$("clear").onclick=()=>{localStorage.removeItem("pollitoRaceRecords");showRecords();};
$("selection").textContent=CAT[S.cat]+" · FÁCIL · 3 carriles · 4 opciones";
document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{
  modal(b.dataset.open,true);
  if(b.dataset.open==="records")showRecords();
});
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>modal(b.dataset.close,false));
document.querySelectorAll(".modal").forEach(m=>m.onclick=e=>{if(e.target===m)modal(m.id,false);});
})();