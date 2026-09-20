const planets=[
 {id:0,name:"Marte",emoji:"🔴",distance:"225.000.000 km",gasCost:200,oxygenCost:100},
 {id:1,name:"Júpiter",emoji:"🟠",distance:"778.000.000 km",gasCost:500,oxygenCost:300},
 {id:2,name:"Saturno",emoji:"🪐",distance:"1.427.000.000 km",gasCost:800,oxygenCost:600}
];

const ships=[
 {id:0,name:"Falcon",emoji:"🚀",speed:"100.000 km/h",capacity:8},
 {id:1,name:"Millenium",emoji:"🛸",speed:"150.000 km/h",capacity:4},
 {id:2,name:"Pegazo",emoji:"🚀",speed:"200.000 km/h",capacity:3}
];

const state={
 gas:1000,oxygen:500,planet:null,ship:null,progress:0,
 travelling:false,usedEvents:[]
};

const challengeTypes=["motorOff","overload","motorFailure","asteroidRain"];
const planetGrid=document.getElementById("planetGrid");
const shipGrid=document.getElementById("shipGrid");
const launch=document.getElementById("launch");
const warning=document.getElementById("warning");
const refillPanel=document.getElementById("refillPanel");
const resourceOk=document.getElementById("resourceOk");

function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}

function updateResourceDisplay(){
 document.getElementById("gas").textContent=state.gas;
 document.getElementById("oxygen").textContent=state.oxygen;
 checkResources();
}

planets.forEach(p=>{
 const b=document.createElement("button");
 b.className="card";b.dataset.id=p.id;
 b.innerHTML=`<span class="emoji">${p.emoji}</span><h3>${p.name}</h3>
 <p>📏 ${p.distance}</p><p>⛽ ${p.gasCost} &nbsp; 🫁 ${p.oxygenCost}</p>`;
 b.onclick=()=>selectPlanet(p.id);planetGrid.appendChild(b);
});

ships.forEach(s=>{
 const b=document.createElement("button");
 b.className="card";b.dataset.id=s.id;
 b.innerHTML=`<span class="emoji">${s.emoji}</span><h3>${s.name}</h3>
 <p>⚡ ${s.speed}</p><p>👨‍🚀 Capacidad máxima: ${s.capacity}</p>`;
 b.onclick=()=>selectShip(s.id);shipGrid.appendChild(b);
});

function selectPlanet(id){
 state.planet=planets.find(p=>p.id===id);
 document.querySelectorAll("#planetGrid .card").forEach(c=>c.classList.toggle("selected",Number(c.dataset.id)===id));
 document.getElementById("planetSelected").textContent=state.planet.name;
 validateSetup();checkResources();
}
function selectShip(id){
 state.ship=ships.find(s=>s.id===id);
 document.querySelectorAll("#shipGrid .card").forEach(c=>c.classList.toggle("selected",Number(c.dataset.id)===id));
 document.getElementById("shipSelected").textContent=state.ship.name;
 validateSetup();
}
function validateSetup(){launch.disabled=!(state.planet&&state.ship)}

function checkResources(){
 warning.classList.add("hidden");resourceOk.classList.add("hidden");refillPanel.classList.add("hidden");
 if(!state.planet)return;
 const p=state.planet;
 const missingGas=Math.max(0,p.gasCost-state.gas);
 const missingOxygen=Math.max(0,p.oxygenCost-state.oxygen);
 if(missingGas>0||missingOxygen>0){
   warning.textContent=`No tienes suficientes recursos para viajar a ${p.name}. Necesitas ${p.gasCost} de gasolina y ${p.oxygenCost} de oxígeno.`;
   warning.classList.remove("hidden");
   const missing=[];
   if(missingGas>0)missing.push(`${missingGas} de gasolina`);
   if(missingOxygen>0)missing.push(`${missingOxygen} de oxígeno`);
   document.getElementById("refillInfo").textContent="Te falta: "+missing.join(" y ")+".";
   refillPanel.classList.remove("hidden");
 }else{
   resourceOk.textContent=`✅ Tienes recursos suficientes para viajar a ${p.name}.`;
   resourceOk.classList.remove("hidden");
 }
}
document.getElementById("refillGas").onclick=()=>{state.gas+=500;updateResourceDisplay()};
document.getElementById("refillOxygen").onclick=()=>{state.oxygen+=200;updateResourceDisplay()};
document.getElementById("refillBoth").onclick=()=>{state.gas+=500;state.oxygen+=200;updateResourceDisplay()};

function updateProgress(v){
 state.progress=v;
 document.getElementById("progressText").textContent=v+"%";
 document.getElementById("progressBar").style.width=v+"%";
 document.getElementById("shipMarker").style.left=v+"%";
}
function setMissionMessage(title,text){
 document.getElementById("missionStatusTitle").textContent=title;
 document.getElementById("missionStatusText").textContent=text;
}
function randomUnusedEvent(){
 if(state.usedEvents.length===challengeTypes.length) state.usedEvents=[];
 const available=challengeTypes.filter(x=>!state.usedEvents.includes(x));
 const chosen=available[Math.floor(Math.random()*available.length)];
 state.usedEvents.push(chosen);
 return chosen;
}

/* SISTEMA DE MODAL/TEMPORIZADOR
   Primero se muestran las instrucciones.
   El cronómetro SOLO empieza cuando el jugador pulsa "ESTOY LISTO". */
function runTimedChallenge({title,desc,seconds,build,onSubmit,onTimeoutMessage}){
 return new Promise(resolve=>{
   const overlay=document.getElementById("challengeOverlay");
   const area=document.getElementById("challengeArea");
   const feedback=document.getElementById("challengeFeedback");
   const timerEl=document.getElementById("challengeTimer");
   const timeLeftEl=document.getElementById("timeLeft");

   document.getElementById("challengeTitle").textContent=title;
   document.getElementById("challengeDesc").textContent=desc;
   feedback.textContent="";
   timerEl.classList.remove("danger");
   timerEl.classList.add("hidden");
   overlay.classList.remove("hidden");

   let left=seconds;
   let finished=false;
   let timer=null;
   timeLeftEl.textContent=left;

   function finish(success,message){
     if(finished)return;
     finished=true;
     if(timer) clearInterval(timer);

     feedback.textContent=message||"";
     feedback.style.color=success?"#74f0b8":"#ff9aaa";

     setTimeout(()=>{
       overlay.classList.add("hidden");
       timerEl.classList.add("hidden");
       resolve(success);
     },1100);
   }

   /* Pantalla previa para que el jugador lea sin presión */
   area.innerHTML=`
     <div style="
       text-align:center;
       padding:12px 6px 6px;
     ">
       <div style="font-size:46px;margin-bottom:12px">📖</div>
       <h3 style="margin:0 0 10px;font-size:21px">Lee las instrucciones con calma</h3>
       <p style="color:#a8b4d1;line-height:1.55;margin:0 0 18px">
         El tiempo todavía no está corriendo. Cuando hayas entendido el desafío,
         pulsa el botón para comenzar.
       </p>
       <button id="readyChallengeBtn" class="challenge-submit">
         ESTOY LISTO — COMENZAR
       </button>
     </div>
   `;

   area.querySelector("#readyChallengeBtn").onclick=()=>{
     feedback.textContent="";
     area.innerHTML="";

     /* Ahora sí construimos la pregunta */
     build(area,(answer)=>onSubmit(answer,finish,feedback));

     timerEl.classList.remove("hidden");
     timerEl.classList.remove("danger");
     left=seconds;
     timeLeftEl.textContent=left;

     const input=area.querySelector("input");
     if(input)setTimeout(()=>input.focus(),100);

     /* El cronómetro empieza aquí, no antes */
     timer=setInterval(()=>{
       left--;
       timeLeftEl.textContent=left;

       if(left<=5) timerEl.classList.add("danger");

       if(left<=0){
         finish(false,onTimeoutMessage||"⏱️ Se acabó el tiempo.");
       }
     },1000);
   };
 });
}

/* 1. FALLA/APAGADO DE MOTOR: multiplicación */
function challengeMotorOff(){
 const operations=[
   {q:"7 × 8",a:56},{q:"8 × 8",a:64},{q:"7 × 7",a:49},{q:"77 × 88",a:6776}
 ];
 const op=operations[Math.floor(Math.random()*operations.length)];

 return runTimedChallenge({
   title:"🔥 Falla crítica de la nave",
   desc:"El motor se apagará si no corriges la falla. Resuelve la operación antes de que termine el tiempo.",
   seconds:15,
   build:(area,submit)=>{
     area.innerHTML=`
       <div class="big-question">¿Cuánto es ${op.q}?</div>
       <input id="answerInput" class="challenge-input" type="number" placeholder="Escribe tu respuesta">
       <button id="answerBtn" class="challenge-submit">REPARAR MOTOR</button>`;
     const input=area.querySelector("#answerInput");
     area.querySelector("#answerBtn").onclick=()=>submit(input.value);
     input.addEventListener("keydown",e=>{if(e.key==="Enter")submit(input.value)});
   },
   onSubmit:(value,finish,feedback)=>{
     if(Number(value)===op.a) finish(true,"✅ ¡Motor reparado!");
     else{
       feedback.style.color="#ffcf7c";
       feedback.textContent="❌ Respuesta incorrecta. Intenta otra vez.";
     }
   },
   onTimeoutMessage:"💥 El motor se apagó. Misión fallida."
 });
}

/* 2. SOBRECARGA: repetir secuencia */
function challengeOverload(){
 const nums=[];
 while(nums.length<3){
   const n=Math.floor(Math.random()*9)+1;
   if(!nums.includes(n))nums.push(n);
 }
 return runTimedChallenge({
   title:"⚡ ¡Sobrecarga detectada!",
   desc:"Apaga los sistemas escribiendo la secuencia exactamente en el mismo orden.",
   seconds:9,
   build:(area,submit)=>{
     area.innerHTML=`
       <div class="sequence">${nums.map(n=>`<span>${n}</span>`).join("")}</div>
       <input id="answerInput" class="challenge-input" placeholder="Ejemplo: 3 7 1">
       <button id="answerBtn" class="challenge-submit">APAGAR SISTEMAS</button>`;
     const input=area.querySelector("#answerInput");
     area.querySelector("#answerBtn").onclick=()=>submit(input.value);
     input.addEventListener("keydown",e=>{if(e.key==="Enter")submit(input.value)});
   },
   onSubmit:(value,finish)=>{
     const cleaned=value.trim().split(/[\s,;-]+/).map(Number);
     const correct=cleaned.length===3 && cleaned.every((n,i)=>n===nums[i]);
     if(correct)finish(true,"✅ Sistemas apagados correctamente.");
     else finish(false,"💥 Secuencia incorrecta. La sobrecarga dañó la nave.");
   },
   onTimeoutMessage:"💥 Se acabó el tiempo. La sobrecarga dañó la nave."
 });
}

/* 3. FALLO DE MOTOR: adivinar número */
function challengeMotorFailure(){
 const code=Math.floor(Math.random()*15)+1;
 return runTimedChallenge({
   title:"🛠️ Fallo del motor",
   desc:"Adivina el código secreto entre 1 y 15. Recibirás pistas después de cada intento.",
   seconds:20,
   build:(area,submit)=>{
     area.innerHTML=`
       <div class="big-question">Código secreto: 1 — 15</div>
       <input id="answerInput" class="challenge-input" type="number" min="1" max="15" placeholder="Introduce tu intento">
       <button id="answerBtn" class="challenge-submit">PROBAR CÓDIGO</button>`;
     const input=area.querySelector("#answerInput");
     area.querySelector("#answerBtn").onclick=()=>submit(input.value);
     input.addEventListener("keydown",e=>{if(e.key==="Enter")submit(input.value)});
   },
   onSubmit:(value,finish,feedback)=>{
     const n=Number(value);
     if(!Number.isInteger(n)||n<1||n>15){
       feedback.style.color="#ffcf7c";feedback.textContent="Ingresa un número entre 1 y 15.";return;
     }
     if(n===code){finish(true,"✅ ¡Código correcto! Motor restaurado.");return;}
     const diff=Math.abs(code-n);
     let closeness=diff<=2?"Muy cerca.":diff<=5?"Cerca.":"Lejos.";
     let direction=n<code?"Prueba un número mayor.":"Prueba un número menor.";
     feedback.style.color="#ffcf7c";
     feedback.textContent=`${closeness} ${direction}`;
   },
   onTimeoutMessage:"💥 El motor no pudo restaurarse a tiempo."
 });
}

/* 4. LLUVIA DE METEORITOS: capital */
function challengeAsteroidRain(){
 const questions=[
   {country:"Estados Unidos",capital:"washington"},
   {country:"Colombia",capital:"bogota"},
   {country:"Chipre",capital:"nicosia"},
   {country:"Argentina",capital:"buenos aires"},
   {country:"Rumania",capital:"bucarest"},
   {country:"Indonesia",capital:"yakarta"}
 ];
 const q=questions[Math.floor(Math.random()*questions.length)];
 const normalize=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();

 return runTimedChallenge({
   title:"☄️ ¡Lluvia de meteoritos!",
   desc:"Para activar el escudo protector, responde correctamente antes de que los meteoritos alcancen la nave.",
   seconds:10,
   build:(area,submit)=>{
     area.innerHTML=`
       <div class="big-question">¿Cuál es la capital de ${q.country}?</div>
       <input id="answerInput" class="challenge-input" placeholder="Escribe la capital">
       <button id="answerBtn" class="challenge-submit">ACTIVAR ESCUDO</button>`;
     const input=area.querySelector("#answerInput");
     area.querySelector("#answerBtn").onclick=()=>submit(input.value);
     input.addEventListener("keydown",e=>{if(e.key==="Enter")submit(input.value)});
   },
   onSubmit:(value,finish,feedback)=>{
     if(normalize(value)===normalize(q.capital))finish(true,"✅ ¡Escudo activado!");
     else{
       feedback.style.color="#ffcf7c";
       feedback.textContent="❌ Respuesta incorrecta. Intenta de nuevo.";
     }
   },
   onTimeoutMessage:"💥 Los meteoritos impactaron la nave. Misión fallida."
 });
}

async function runRandomChallenge(){
 const event=randomUnusedEvent();
 if(event==="motorOff")return await challengeMotorOff();
 if(event==="overload")return await challengeOverload();
 if(event==="motorFailure")return await challengeMotorFailure();
 return await challengeAsteroidRain();
}

function missionFailed(){
 state.travelling=false;
 document.getElementById("shipMarker").classList.remove("pulse");
 const card=document.getElementById("missionCard");
 card.classList.add("fail");
 setMissionMessage("💥 MISIÓN FALLIDA","No lograste superar el desafío. La nave no pudo continuar el viaje.");
 document.getElementById("restartMission").classList.remove("hidden");
}

async function startTravel(){
 if(state.travelling)return;
 state.travelling=true;
 document.getElementById("missionCard").classList.remove("fail");
 updateProgress(0);
 const shipMarker=document.getElementById("shipMarker");
 shipMarker.classList.add("pulse");

 setMissionMessage("🚀 ¡Despegue exitoso!","La nave abandona la Tierra...");
 await sleep(1200);

 const checkpoints=[20,40,60,80,100];

 for(const point of checkpoints){
   if(!state.travelling)return;

   updateProgress(point);
   setMissionMessage(
     point<100?"🌌 Viajando por el espacio":"🪐 Aproximación final",
     point<100?`Has completado el ${point}% del recorrido.`:`La nave está llegando a ${state.planet.name}.`
   );
   await sleep(1300);

   /* En 20/40/60/80 hay 65% de probabilidad de desafío */
   if(point<100 && Math.random()<0.65){
     setMissionMessage("⚠️ ¡Problema detectado!","La nave se ha detenido. Debes superar el desafío para continuar.");
     shipMarker.classList.remove("pulse");

     const solved=await runRandomChallenge();

     if(!solved){
       missionFailed();
       return;
     }

     setMissionMessage("✅ Desafío superado","Sistemas restaurados. Continuando la misión...");
     shipMarker.classList.add("pulse");
     await sleep(1100);
   }
 }

 if(!state.travelling)return;

 state.gas-=state.planet.gasCost;
 state.oxygen-=state.planet.oxygenCost;
 updateResourceDisplay();
 shipMarker.classList.remove("pulse");

 setMissionMessage(
   "🏆 ¡Misión completada!",
   `Llegaste a ${state.planet.name} de forma segura. Recursos consumidos: ${state.planet.gasCost} de gasolina y ${state.planet.oxygenCost} de oxígeno.`
 );
 document.getElementById("restartMission").classList.remove("hidden");
 state.travelling=false;
}

launch.onclick=()=>{
 if(!state.planet||!state.ship)return;
 const p=state.planet;

 if(state.gas<p.gasCost||state.oxygen<p.oxygenCost){
   checkResources();refillPanel.scrollIntoView({behavior:"smooth",block:"center"});return;
 }

 document.getElementById("setup").classList.remove("active");
 document.getElementById("mission").classList.add("active");
 document.getElementById("missionTitle").textContent=`Viaje a ${p.name} · ${state.ship.name}`;
 document.getElementById("planetIcon").textContent=p.emoji;
 document.getElementById("shipMarker").textContent=state.ship.emoji;
 document.getElementById("restartMission").classList.add("hidden");
 updateProgress(0);

 setTimeout(startTravel,500);
};

document.getElementById("back").onclick=()=>{
 state.travelling=false;
 document.getElementById("challengeOverlay").classList.add("hidden");
 document.getElementById("shipMarker").classList.remove("pulse");
 document.getElementById("mission").classList.remove("active");
 document.getElementById("setup").classList.add("active");
 checkResources();
};

document.getElementById("restartMission").onclick=()=>{
 state.travelling=false;
 document.getElementById("challengeOverlay").classList.add("hidden");
 document.getElementById("mission").classList.remove("active");
 document.getElementById("setup").classList.add("active");
 updateProgress(0);checkResources();
};

updateResourceDisplay();
