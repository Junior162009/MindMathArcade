(() => {
"use strict";
const $ = (id) => document.getElementById(id);
const screens = [...document.querySelectorAll(".screen")];
const EMOJI_CDN = "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/";
const CONFIG = {
  facil: { advance: 10, speed: 1.05 },
  normal: { advance: 10, speed: 1.25 },
  dificil: { advance: 10, speed: 1.5 }
};
const CATEGORY = {
  matematicas: { label: "🔴 MATEMÁTICAS", color: "#ff435d" },
  espanol: { label: "🔵 ESPAÑOL", color: "#4b91ff" },
  sociales: { label: "🟡 SOCIALES", color: "#f4c842" },
  aleatorio: { label: "🎲 ALEATORIO", color: "#a46bff" }
};
const VALID_CATEGORIES = new Set(["matematicas", "espanol", "sociales"]);
const VALID_DIFFICULTIES = new Set(["facil", "normal", "dificil"]);
const VEHICLES = ["🚗", "🚕", "🚌", "🚙"];
const state = {
  category: "matematicas", difficulty: "facil", questions: [], used: new Set(), current: null,
  locked: true, round: 0, correct: 0, wrong: 0, streak: 0, bestCombo: 0,
  lives: 3, score: 0, finished: false, level: 1, distance: 0,
  countdownTimer: null, nextQuestionTimer: null
};
let audioContext = null;
function show(id){ screens.forEach(s=>s.classList.toggle("active",s.id===id)); $("hud").classList.toggle("hidden",id!=="race"); window.scrollTo({top:0,behavior:"instant"}); }
function shuffle(items){ const a=[...items]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function emojiCode(emoji){ return [...emoji].map(c=>c.codePointAt(0).toString(16)).join("-"); }
function emojiImg(emoji,label,cls="emoji-sprite"){ const src=`${EMOJI_CDN}${emojiCode(emoji)}.svg`; return `<img class="${cls}" src="${src}" alt="${label}" loading="eager" referrerpolicy="no-referrer">`; }
function setSelection(){ $("selection").textContent=`${CATEGORY[state.category].label} · ${state.difficulty.toUpperCase()} · 1 pollo · 3 vidas`; }
function validateQuestions(data){
  if(!Array.isArray(data)||!data.length) throw new Error("questions.json no contiene un banco de preguntas válido.");
  const errors=[];
  data.forEach((q,i)=>{
    if(!q||typeof q!=="object"){errors.push(`Pregunta #${i+1}: objeto inválido.`);return;}
    if(!VALID_CATEGORIES.has(q.category)) errors.push(`Pregunta #${i+1}: categoría inválida.`);
    if(!VALID_DIFFICULTIES.has(q.difficulty)) errors.push(`Pregunta #${i+1}: dificultad inválida.`);
    if(typeof q.question!=="string"||!q.question.trim()) errors.push(`Pregunta #${i+1}: texto vacío.`);
    if(!Array.isArray(q.options)||q.options.length!==4) errors.push(`Pregunta #${i+1}: debe tener 4 opciones.`);
    if(!Number.isInteger(q.correct)||q.correct<0||q.correct>3) errors.push(`Pregunta #${i+1}: correct inválido.`);
  });
  if(errors.length) throw new Error("Banco de preguntas inválido:\n"+errors.join("\n"));
}
async function loadQuestions(){
  if(state.questions.length) return;
  const response=await fetch("./data/questions.json",{cache:"no-store"});
  if(!response.ok) throw new Error(`No se pudo cargar questions.json (HTTP ${response.status}).`);
  const data=await response.json(); validateQuestions(data); state.questions=data;
}
function availableQuestions(){
  let pool=state.questions.filter(q=>state.category==="aleatorio"||q.category===state.category);
  const same=pool.filter(q=>q.difficulty===state.difficulty);
  if(same.length>=4) pool=same;
  return pool;
}
function resetGame(){
  clearTimers(); state.used.clear(); state.current=null; state.locked=true; state.round=0;
  state.correct=0;state.wrong=0;state.streak=0;state.bestCombo=0;state.lives=3;state.score=0;
  state.finished=false;state.level=1;state.distance=0;
  $("answers").replaceChildren(); $("feedback").textContent=""; $("raceMessage").textContent="Preparando partida…";
  $("player").className="runner player-runner"; $("player").innerHTML=emojiImg("🐔","Pollo jugador");
  document.querySelectorAll(".wrong-car").forEach(car=>car.remove());
  render();
}
function render(){
  state.distance=state.correct*CONFIG[state.difficulty].advance;
  $("hudLevel").textContent=state.level; $("hudLives").textContent=state.lives>0?"❤️".repeat(state.lives):"0";
  $("hudScore").textContent=state.score; $("hudDistance").textContent=state.distance+"m";
  $("raceLives").textContent=state.lives>0?"❤️".repeat(state.lives):"0"; $("streak").textContent=state.streak?"x"+state.streak:"0";
  $("score").textContent=state.score; $("raceDistance").textContent=state.distance+"m";
  const progress=Math.min(100,state.correct*10); $("progressText").textContent=progress+"%"; $("progressBar").style.width=progress+"%";
  // El pollo permanece siempre en el mismo carril/posición.
  $("player").style.left="13%";
}
function chooseQuestion(){
  const pool=availableQuestions(); if(!pool.length) throw new Error("No hay preguntas para esta configuración.");
  let candidates=pool.filter(q=>!state.used.has(q.question)); if(!candidates.length){state.used.clear();candidates=pool;}
  state.current=candidates[Math.floor(Math.random()*candidates.length)]; state.used.add(state.current.question);
  $("questionNumber").textContent="Pregunta "+(state.round+1); $("question").textContent=state.current.question;
  $("categoryBadge").textContent=CATEGORY[state.current.category].label; $("categoryBadge").style.background=CATEGORY[state.current.category].color;
  $("feedback").textContent=""; $("feedback").className="feedback"; $("answers").replaceChildren();
  shuffle(state.current.options.map((text,index)=>({text,index}))).forEach(option=>{
    const b=document.createElement("button"); b.className="answer"; b.type="button"; b.textContent=option.text; b.dataset.answerIndex=String(option.index);
    b.addEventListener("click",()=>answer(option.index,b),{once:true}); $("answers").appendChild(b);
  });
}
function initAudio(){ try{audioContext ||= new (window.AudioContext||window.webkitAudioContext)(); if(audioContext.state==="suspended") audioContext.resume();}catch(_){audioContext=null;} }
function beep(freq,duration,type="sine"){ if(!audioContext)return; try{const o=audioContext.createOscillator(),g=audioContext.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.045,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);o.connect(g);g.connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+duration);}catch(_){} }
function animateRunner(cls){const el=$("player");el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);window.setTimeout(()=>el.classList.remove(cls),700);}
function spawnCrashCar(){
  const lane=$("track .lane:first-child"); if(!lane)return;
  const car=document.createElement("div"); car.className="traffic wrong-car"; car.innerHTML=emojiImg(VEHICLES[Math.floor(Math.random()*VEHICLES.length)],"Vehículo que atropella al pollo","emoji-sprite vehicle-emoji");
  car.style.animationDuration=`${Math.max(.55,1.05/state.level/CONFIG[state.difficulty].speed)}s`;
  lane.appendChild(car);
  car.addEventListener("animationend",()=>{car.remove();},{once:true});
}
function impactEffect(){
  const el=document.createElement("div");el.className="impact";el.innerHTML=emojiImg("💥","Impacto","impact-emoji");document.body.appendChild(el);window.setTimeout(()=>el.remove(),700);
  $("track").classList.remove("hit-state");void $("track").offsetWidth;$("track").classList.add("hit-state");animateRunner("hit");beep(110,.18,"sawtooth");beep(70,.25,"square");
}
function answer(index,clicked){
  if(state.locked||state.finished||!state.current)return; state.locked=true; document.querySelectorAll(".answer").forEach(b=>b.disabled=true);
  const q=state.current, correct=index===q.correct;
  if(correct){
    state.correct++;state.streak++;state.bestCombo=Math.max(state.bestCombo,state.streak);state.level=Math.min(10,1+Math.floor(state.correct/3));
    const mult=Math.min(5,state.streak),points=100+50*mult+state.level*10;state.score+=points;clicked.classList.add("correct");
    $("feedback").className="feedback good";$("feedback").textContent=`¡CORRECTO! 🐔💨 +${points} puntos · combo x${mult}`;
    $("raceMessage").textContent="⚡ ¡Correcto! El carril queda despejado y el pollo avanza.";animateRunner("bump");beep(660,.08);beep(880,.1);
  }else{
    state.wrong++;state.streak=0;state.lives=Math.max(0,state.lives-1);clicked.classList.add("wrong");
    document.querySelectorAll(".answer").forEach(b=>{if(Number(b.dataset.answerIndex)===q.correct)b.classList.add("correct");});
    $("feedback").className="feedback bad";$("feedback").textContent=`¡INCORRECTO! La respuesta era: ${q.options[q.correct]}`;
    $("raceMessage").textContent=state.lives?"🚗💥 ¡Respuesta incorrecta! Un carro entra al carril y atropella al pollo.":"🚗💥 ¡Última vida perdida!";
    spawnCrashCar();impactEffect();
  }
  render();
  if(state.lives<=0){state.nextQuestionTimer=window.setTimeout(()=>finishGame(true),900);return;}
  if(state.correct>=10){state.nextQuestionTimer=window.setTimeout(()=>finishGame(false),700);return;}
  state.nextQuestionTimer=window.setTimeout(()=>{state.round++;state.locked=false;chooseQuestion();},correct?650:950);
}
function startCountdown(){
  clearTimers();const overlay=document.createElement("div");overlay.className="countdown";overlay.innerHTML="<strong>3</strong><span>¡PREPÁRATE!</span>";document.body.appendChild(overlay);let n=3;
  const tick=()=>{if(state.finished){overlay.remove();return;}if(n>0){overlay.querySelector("strong").textContent=n;overlay.querySelector("span").textContent=n===3?"¡PREPÁRATE!":"¡LISTO!";beep(300,.08);n--;state.countdownTimer=setTimeout(tick,650);}else{overlay.querySelector("strong").textContent="GO!";overlay.querySelector("span").textContent="¡RESPONDE Y SOBREVIVE!";beep(800,.12);state.countdownTimer=setTimeout(()=>{overlay.remove();state.locked=false;chooseQuestion();},500);}};tick();
}
function finishGame(gameOver){
  if(state.finished)return;state.finished=true;state.locked=true;clearTimers();
  const won=!gameOver&&state.correct>=10;const bonus=won?300+state.level*25:0;state.score+=bonus;render();
  $("resultEmoji").textContent=won?"🏆":"💀";$("resultTitle").textContent=won?"¡SOBREVIVISTE AL TRÁFICO!":"GAME OVER";
  $("resultText").textContent=won?`¡Lo lograste! El único pollo respondió 10 preguntas y llegó a salvo. +${bonus} puntos.`:"Una respuesta incorrecta provocó el atropello. ¡Vuelve a intentarlo!";
  $("resultScore").textContent=state.score;$("resultCorrect").textContent=state.correct;$("resultWrong").textContent=state.wrong;$("resultDistance").textContent=state.distance+"m";$("resultCombo").textContent=state.bestCombo;$("resultLevel").textContent=state.level;saveRecord(won);show("result");
}
function saveRecord(won){try{const key="chikenRaceRecords",records=JSON.parse(localStorage.getItem(key)||"[]");records.push({score:state.score,won,correct:state.correct,wrong:state.wrong,distance:state.distance,combo:state.bestCombo,level:state.level,category:state.category,difficulty:state.difficulty,date:new Date().toLocaleDateString("es-CO")});records.sort((a,b)=>b.score-a.score);localStorage.setItem(key,JSON.stringify(records.slice(0,10)));}catch(_) {}}
function renderRecords(){
  let records=[];try{records=JSON.parse(localStorage.getItem("chikenRaceRecords")||"[]");}catch(_){records=[];}
  $("recordsList").replaceChildren();if(!records.length){const p=document.createElement("p");p.className="records-empty";p.textContent="Todavía no hay récords.";$("recordsList").appendChild(p);return;}
  records.forEach((r,i)=>{const item=document.createElement("div");item.className="record";const info=document.createElement("span");info.textContent=`#${i+1} · ${r.won?"🏆 GANADA":"💀 GAME OVER"}`;const small=document.createElement("small");small.textContent=`${(CATEGORY[r.category]?.label||r.category)} · ${r.correct} correctas · ${r.date}`;info.appendChild(small);const score=document.createElement("b");score.textContent=r.score+" pts";item.append(info,score);$("recordsList").appendChild(item);});
}
function startRace(){
  initAudio();loadQuestions().then(()=>{resetGame();$("raceCategory").textContent=CATEGORY[state.category].label;$("raceMessage").textContent="🛣️ El pollo permanece en su carril. Responde bien y no aparece ningún carro.";show("race");startCountdown();}).catch(err=>{console.error(err);alert(err.message||"No se pudo iniciar CHIKEN RACE.");});
}
function clearTimers(){if(state.countdownTimer)clearTimeout(state.countdownTimer);if(state.nextQuestionTimer)clearTimeout(state.nextQuestionTimer);state.countdownTimer=null;state.nextQuestionTimer=null;document.querySelectorAll(".countdown").forEach(e=>e.remove());}
function bind(){
  $("play").addEventListener("click",()=>show("setup"));$("categories").addEventListener("click",()=>show("setup"));$("back").addEventListener("click",()=>show("home"));$("start").addEventListener("click",startRace);$("again").addEventListener("click",startRace);$("menu").addEventListener("click",()=>show("home"));
  document.querySelectorAll("[data-cat]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-cat]").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.category=b.dataset.cat;setSelection();}));
  document.querySelectorAll("[data-diff]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-diff]").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.difficulty=b.dataset.diff;setSelection();}));
  document.querySelectorAll("[data-modal]").forEach(b=>b.addEventListener("click",()=>{$(b.dataset.modal).classList.add("open");if(b.dataset.modal==="records")renderRecords();}));
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.close).classList.remove("open")));
  document.querySelectorAll(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.remove("open");}));
  $("clearRecords").addEventListener("click",()=>{localStorage.removeItem("chikenRaceRecords");renderRecords();});
  setSelection();
}
document.addEventListener("DOMContentLoaded",bind);
})();