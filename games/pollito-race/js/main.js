(() => {
"use strict";

const $ = id => document.getElementById(id);
const screens = [...document.querySelectorAll(".screen")];

const CONFIG = {
  facil:   { player: 18, penalty: 7, rivals: [9, 11] },
  normal:  { player: 16, penalty: 8, rivals: [12, 14] },
  dificil: { player: 14, penalty: 9, rivals: [15, 17] }
};

const CATEGORY = {
  matematicas: {label:"🔴 MATEMÁTICAS", color:"#ff435d"},
  espanol: {label:"🔵 ESPAÑOL", color:"#4b91ff"},
  sociales: {label:"🟡 SOCIALES", color:"#f4c842"},
  aleatorio: {label:"🎲 ALEATORIO", color:"#a46bff"}
};

const state = {
  category:"matematicas",
  difficulty:"facil",
  questions:[],
  used:new Set(),
  current:null,
  locked:true,
  round:0,
  player:0,
  rivals:[0,0],
  correct:0,
  wrong:0,
  streak:0,
  lives:3,
  score:0,
  finished:false
};

function show(id){
  screens.forEach(s=>s.classList.toggle("active",s.id===id));
  $("hud").classList.toggle("hidden",id!=="race");
  window.scrollTo(0,0);
}

function shuffle(items){
  const a=[...items];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function setSelection(){
  $("selection").textContent =
    CATEGORY[state.category].label+" · "+state.difficulty.toUpperCase()+
    " · 3 carriles · 4 opciones";
}

async function loadQuestions(){
  if(state.questions.length) return;
  const response=await fetch("./data/questions.json",{cache:"no-store"});
  if(!response.ok) throw new Error("HTTP "+response.status);
  const data=await response.json();
  if(!Array.isArray(data) || data.length<12) throw new Error("Banco insuficiente");

  data.forEach((q,i)=>{
    if(!q.question || !Array.isArray(q.options) || q.options.length!==4 ||
       new Set(q.options).size!==4 || !Number.isInteger(q.correct) ||
       q.correct<0 || q.correct>3 ||
       !["matematicas","espanol","sociales"].includes(q.category)){
      throw new Error("Pregunta inválida #"+(i+1));
    }
  });
  state.questions=data;
}

function availableQuestions(){
  let list=state.questions.filter(q=>
    state.category==="aleatorio" || q.category===state.category
  );
  const difficulty=list.filter(q=>q.difficulty===state.difficulty);
  if(difficulty.length>=4) list=difficulty;
  return list;
}

function resetGame(){
  state.used=new Set();
  state.current=null;
  state.locked=true;
  state.round=0;
  state.player=0;
  state.rivals=[0,0];
  state.correct=0;
  state.wrong=0;
  state.streak=0;
  state.lives=3;
  state.score=0;
  state.finished=false;
  render();
}

function render(){
  $("hudProgress").textContent=Math.round(state.player)+"%";
  $("hudLives").textContent=state.lives>0?"❤️".repeat(state.lives):"0";
  $("hudScore").textContent=state.score;
  $("correctCount").textContent=state.correct;
  $("wrongCount").textContent=state.wrong;
  $("streak").textContent=state.streak?("x"+Math.min(4,state.streak)):"0";
  $("score").textContent=state.score;
  $("progressText").textContent=Math.round(state.player)+"%";
  $("progressBar").style.width=state.player+"%";

  $("player").style.left=(8+state.player*0.78)+"%";
  $("rival1").style.left=(8+state.rivals[0]*0.78)+"%";
  $("rival2").style.left=(8+state.rivals[1]*0.78)+"%";
}

function chooseQuestion(){
  const pool=availableQuestions();
  if(!pool.length) throw new Error("No hay preguntas para esta configuración");

  let candidates=pool.filter(q=>!state.used.has(q.question));
  if(!candidates.length){
    state.used.clear();
    candidates=pool;
  }

  const q=candidates[Math.floor(Math.random()*candidates.length)];
  state.current=q;
  state.used.add(q.question);

  $("questionNumber").textContent="Pregunta "+(state.round+1);
  $("question").textContent=q.question;
  $("categoryBadge").textContent=CATEGORY[q.category].label;
  $("categoryBadge").style.background=CATEGORY[q.category].color;
  $("feedback").textContent="";
  $("feedback").className="feedback";
  $("answers").replaceChildren();

  const options=shuffle(q.options.map((text,index)=>({text,index})));
  options.forEach(option=>{
    const button=document.createElement("button");
    button.className="answer";
    button.type="button";
    button.textContent=option.text;
    button.dataset.answerIndex=String(option.index);
    button.addEventListener("click",()=>answer(option.index,button),{once:true});
    $("answers").appendChild(button);
  });
}

function answer(index,clicked){
  if(state.locked || state.finished || !state.current) return;
  state.locked=true;

  document.querySelectorAll(".answer").forEach(b=>b.disabled=true);
  const isCorrect=index===state.current.correct;

  if(isCorrect){
    state.correct++;
    state.streak++;
    const multiplier=Math.min(4,state.streak);
    const points=100+(multiplier>1?50*multiplier:0);
    state.score+=points;
    state.player=Math.min(100,state.player+CONFIG[state.difficulty].player+Math.min(3,state.streak-1));
    clicked.classList.add("correct");
    $("feedback").className="feedback good";
    $("feedback").textContent="¡CORRECTO! 🐔💨 +"+points+" puntos · racha x"+multiplier;
    $("raceMessage").textContent="⚡ ¡Tu pollito acelera!";
    $("player").classList.add("bump");
    setTimeout(()=>$("player").classList.remove("bump"),400);
  }else{
    state.wrong++;
    state.streak=0;
    state.lives=Math.max(0,state.lives-1);
    state.player=Math.max(0,state.player-CONFIG[state.difficulty].penalty);
    clicked.classList.add("wrong");
    document.querySelectorAll(".answer").forEach(b=>{
      if(Number(b.dataset.answerIndex)===state.current.correct) b.classList.add("correct");
    });
    $("feedback").className="feedback bad";
    $("feedback").textContent="¡INCORRECTO! 😵 Correcta: "+state.current.options[state.current.correct];
    $("raceMessage").textContent=state.lives
      ?"💥 Pierdes distancia, pero sigues en carrera."
      :"💥 Sin vidas. Todavía puedes terminar la carrera.";
    $("player").classList.add("shake");
    setTimeout(()=>$("player").classList.remove("shake"),400);
  }

  advanceRivals();
  render();

  const result=checkFinish();
  if(result) return;

  setTimeout(()=>{
    if(state.finished) return;
    state.round++;
    state.locked=false;
    chooseQuestion();
  },650);
}

function advanceRivals(){
  const cfg=CONFIG[state.difficulty];
  const catchup=Math.max(0,state.player-state.rivals[0]);
  state.rivals[0]=Math.min(100,state.rivals[0]+cfg.rivals[0]+(catchup>25?1:0));
  state.rivals[1]=Math.min(100,state.rivals[1]+cfg.rivals[1]+(catchup>35?1:0));
}

function checkFinish(){
  const p=state.player, r1=state.rivals[0], r2=state.rivals[1];
  if(p<100 && r1<100 && r2<100) return false;

  let position=1;
  const opponents=[r1,r2];
  if(p<100) position=1+opponents.filter(x=>x>=100).length;
  else position=1+opponents.filter(x=>x>p).length;

  finish(position);
  return true;
}

function finish(position){
  state.finished=true;
  state.locked=true;

  const bonus=position===1?300:position===2?150:50;
  state.score+=bonus;

  const title=position===1?"🏆 ¡GANASTE!":position===2?"🥈 ¡SEGUNDO LUGAR!":"🥉 ¡TERCER LUGAR!";
  $("resultEmoji").textContent=position===1?"🏆":position===2?"🥈":"🥉";
  $("resultTitle").textContent=title;
  $("resultText").textContent=position===1
    ?"¡Excelente! Tu pollito cruzó la meta primero."
    :"¡Buen trabajo! Practica y vuelve a correr para mejorar tu posición.";
  $("resultPosition").textContent=position+".º";
  $("resultCorrect").textContent=state.correct;
  $("resultWrong").textContent=state.wrong;
  $("resultScore").textContent=state.score;

  saveRecord(position);
  show("result");
}

function saveRecord(position){
  try{
    const records=JSON.parse(localStorage.getItem("pollitoRaceRecords")||"[]");
    records.push({
      score:state.score,
      position,
      correct:state.correct,
      wrong:state.wrong,
      category:CATEGORY[state.category].label,
      difficulty:state.difficulty,
      date:new Date().toLocaleDateString("es-CO")
    });
    records.sort((a,b)=>b.score-a.score);
    localStorage.setItem("pollitoRaceRecords",JSON.stringify(records.slice(0,10)));
  }catch(error){ console.warn("Récord no guardado",error); }
}

function renderRecords(){
  let records=[];
  try{records=JSON.parse(localStorage.getItem("pollitoRaceRecords")||"[]");}catch(_){records=[];}
  $("recordsList").innerHTML="";
  if(!records.length){
    $("recordsList").innerHTML="<p style='color:#98a2b3'>Todavía no hay récords.</p>";
    return;
  }
  records.forEach((r,i)=>{
    const item=document.createElement("div");
    item.className="record";
    item.innerHTML="<span>#"+(i+1)+" · "+r.category+"<small>"+r.difficulty+" · "+r.correct+" correctas · "+r.date+"</small></span><b>"+r.score+" pts</b>";
    $("recordsList").appendChild(item);
  });
}

async function startRace(){
  try{
    await loadQuestions();
    resetGame();
    state.category=state.category;
    $("raceCategory").textContent=CATEGORY[state.category].label;
    $("raceMessage").textContent="🏁 ¡Prepárate! La carrera empieza ahora.";
    show("race");

    const overlay=document.createElement("div");
    overlay.className="countdown";
    overlay.innerHTML="<strong>3</strong><span>¡PREPÁRATE!</span>";
    document.body.appendChild(overlay);

    let n=3;
    const tick=()=>{
      if(n>0){
        overlay.querySelector("strong").textContent=n;
        n--;
        setTimeout(tick,500);
      }else{
        overlay.querySelector("strong").textContent="🏁";
        overlay.querySelector("span").textContent="¡CORRE!";
        setTimeout(()=>{
          overlay.remove();
          state.locked=false;
          chooseQuestion();
          render();
        },500);
      }
    };
    tick();
  }catch(error){
    console.error(error);
    alert("No se pudo iniciar la carrera. Revisa el banco de preguntas.");
  }
}

document.querySelectorAll("[data-cat]").forEach(button=>{
  button.addEventListener("click",()=>{
    document.querySelectorAll("[data-cat]").forEach(x=>x.classList.remove("active"));
    button.classList.add("active");
    state.category=button.dataset.cat;
    setSelection();
  });
});

document.querySelectorAll("[data-diff]").forEach(button=>{
  button.addEventListener("click",()=>{
    document.querySelectorAll("[data-diff]").forEach(x=>x.classList.remove("active"));
    button.classList.add("active");
    state.difficulty=button.dataset.diff;
    setSelection();
  });
});

$("play").addEventListener("click",()=>show("setup"));
$("categories").addEventListener("click",()=>show("setup"));
$("back").addEventListener("click",()=>show("home"));
$("start").addEventListener("click",startRace);
$("again").addEventListener("click",()=>show("setup"));
$("menu").addEventListener("click",()=>show("home"));

document.querySelectorAll("[data-modal]").forEach(button=>{
  button.addEventListener("click",()=>{
    $(button.dataset.modal).classList.add("open");
    if(button.dataset.modal==="records") renderRecords();
  });
});
document.querySelectorAll("[data-close]").forEach(button=>{
  button.addEventListener("click",()=>$(button.dataset.close).classList.remove("open"));
});
document.querySelectorAll(".modal").forEach(modal=>{
  modal.addEventListener("click",e=>{
    if(e.target===modal) modal.classList.remove("open");
  });
});
$("clearRecords").addEventListener("click",()=>{
  localStorage.removeItem("pollitoRaceRecords");
  renderRecords();
});

setSelection();
})();