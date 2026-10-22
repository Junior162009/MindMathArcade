/* BIT RUSH — educational grade selector. Keeps the existing game engine intact. */
(function(){
  'use strict';
  const G=[['transicion','Transición','primaria'],['1','1.º','primaria'],['2','2.º','primaria'],['3','3.º','primaria'],['4','4.º','primaria'],['5','5.º','primaria'],['6','6.º','secundaria'],['7','7.º','secundaria'],['8','8.º','secundaria'],['9','9.º','secundaria'],['10','10.º','bachillerato'],['11','11.º','bachillerato']];
  // Banco generado: 80 preguntas únicas por operación y grado (240 por grado).
  // Se usa un mazo sin reemplazo para que una pregunta no vuelva a salir hasta agotar el grado.
  const gradeKeys=G.map(x=>x[0]);
  const levelIndex={transicion:0,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'11':11};
  const addMax=[10,10,20,50,100,500,1000,2000,5000,10000,50000,100000];
  const mulMax=[10,10,10,12,20,30,50,80,100,200,500,1000];
  const opLabels=['➕ SUMA','➖ RESTA','✖️ MULTIPLICACIÓN'];
  function makeOptions(answer,seed){
    const opts=[String(answer)];
    const deltas=[1,2,3,4,5,7,9,11,13,17,19,23];
    for(let k=0;opts.length<4;k++){
      const delta=deltas[(seed+k)%deltas.length];
      const candidate=answer+((k%2===0)?delta:-delta);
      if(candidate!==answer&&!opts.includes(String(candidate)))opts.push(String(candidate));
    }
    // Mezcla determinista suficiente para no fijar la respuesta en una posición.
    for(let i=opts.length-1;i>0;i--){const j=(seed*7+i*3)%(i+1);[opts[i],opts[j]]=[opts[j],opts[i]]}
    return opts;
  }
  function createBank(grade){
    const idx=levelIndex[grade]??3, max=addMax[idx], factor=Math.max(10,mulMax[idx]), list=[];
    const addSeen=new Set(), subSeen=new Set(), mulSeen=new Set();
    for(let i=0;i<80;i++){
      let a=1+((i*37+idx*11)%(max+1));
      let b=1+((i*53+idx*17)%(max+1));
      let key=a+'+'+b;
      while(addSeen.has(key)){a=a%(max+1)+1;b=(b+1)%(max+1);key=a+'+'+b}
      addSeen.add(key);
      let ans=a+b, opts=makeOptions(ans,i+idx*83);
      list.push([a+' + '+b+' = ?',opts,opts.indexOf(String(ans)),a+' + '+b+' = '+ans+'.',opLabels[0]]);

      // En Transición a 4.º se practica resta sin resultados negativos.
      let subA,subB;
      if(idx<=4){
        subB=1+((i*29+idx*7)%Math.max(2,max));
        subA=subB+((i*41+idx*13)%Math.max(2,max));
      }else{
        subA=1+((i*41+idx*13)%(max+1));
        subB=1+((i*29+idx*19)%(max+1));
        if(idx>=6 && i%4===0) subA=-(1+((i*11+idx)%(max||1)));
      }
      key=subA+'-'+subB;
      while(subSeen.has(key)){subA++;if(idx<=4&&subA<subB)subA=subB;key=subA+'-'+subB}
      subSeen.add(key);ans=subA-subB;opts=makeOptions(ans,i+idx*97+19);
      list.push([subA+' - '+subB+' = ?',opts,opts.indexOf(String(ans)),subA+' - '+subB+' = '+ans+'.',opLabels[1]]);

      // Multiplicación solo desde 5.º en adelante.
      if(idx>=5){
        a=1+((i*17+idx*7)%factor);
        b=1+((Math.floor(i/Math.max(1,factor))+i*3)%factor);
        key=a+'×'+b;
        while(mulSeen.has(key)){b=b%factor+1;key=a+'×'+b}
        mulSeen.add(key);ans=a*b;opts=makeOptions(ans,i+idx*113+37);
        list.push([a+' × '+b+' = ?',opts,opts.indexOf(String(ans)),a+' × '+b+' = '+ans+'.',opLabels[2]]);
      }
    }
    return list;
  }
  const banks=Object.fromEntries(gradeKeys.map(grade=>[grade,createBank(grade)]));
  const difficulty={transicion:'Inicial',1:'Inicial',2:'Básico',3:'Básico',4:'Básico',5:'Intermedio',6:'Intermedio',7:'Intermedio',8:'Avanzado',9:'Avanzado',10:'Preuniversitario',11:'Preuniversitario'};
  const colors={primaria:'#20c997',secundaria:'#3b82f6',bachillerato:'#8b5cf6'};
  let selected=null,originalStart=null;
  function addStyles(){const s=document.createElement('style');s.textContent=`#educationMenu{margin:0 auto 22px;max-width:900px;padding:22px;border-radius:24px;background:linear-gradient(145deg,#111b35,#0b1226);border:1px solid rgba(255,255,255,.12);box-shadow:0 18px 50px rgba(0,0,0,.28)}#educationMenu h2{margin:0 0 6px;font-size:clamp(26px,5vw,42px);text-align:center}#educationMenu .sub{display:block;text-align:center;opacity:.75;margin-bottom:20px}.eduLevels{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.eduLevel{border:2px solid transparent;border-radius:18px;padding:18px 12px;color:#fff;background:rgba(255,255,255,.07);cursor:pointer;font-weight:800;font-size:18px;min-height:84px}.eduLevel small{display:block;font-weight:500;opacity:.75;margin-top:4px}.eduLevel.active{border-color:var(--edu-color);background:rgba(255,255,255,.13)}#gradePanel{display:none;margin-top:18px}.gradeTitle{text-align:center;font-weight:800;margin-bottom:12px}.grades{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.gradeBtn{border:1px solid rgba(255,255,255,.12);border-radius:14px;background:#17213c;color:#fff;padding:14px 8px;min-height:54px;font-size:17px;font-weight:800;cursor:pointer}.gradeBtn.selected{outline:3px solid var(--edu-color);background:rgba(255,255,255,.12)}#gradeStart{display:none;width:100%;margin-top:16px;border:0;border-radius:16px;padding:16px;font-size:19px;font-weight:900;cursor:pointer;background:linear-gradient(90deg,var(--edu-color),#fff);color:#08101f}.gradeInfo{text-align:center;margin-top:10px;font-size:14px;opacity:.75}@media(max-width:650px){#educationMenu{padding:16px;border-radius:18px}.eduLevels{grid-template-columns:1fr}.grades{grid-template-columns:repeat(3,1fr)}.gradeBtn{font-size:15px;padding:12px 5px}.eduLevel{min-height:70px}}`;document.head.appendChild(s)}
  function build(){const menu=document.getElementById('menu');if(!menu)return;addStyles();const box=document.createElement('div');box.id='educationMenu';box.innerHTML='<h2>🎮 BIT RUSH</h2><span class="sub">Selecciona tu nivel educativo y grado</span><div class="eduLevels"><button class="eduLevel" data-level="primaria" style="--edu-color:#20c997">🟢 PRIMARIA<small>Transición · 1.º a 5.º</small></button><button class="eduLevel" data-level="secundaria" style="--edu-color:#3b82f6">🔵 SECUNDARIA<small>6.º a 9.º</small></button><button class="eduLevel" data-level="bachillerato" style="--edu-color:#8b5cf6">🟣 BACHILLERATO<small>10.º y 11.º</small></button></div><div id="gradePanel"><div class="gradeTitle">Ahora selecciona tu grado</div><div class="grades"></div><div class="gradeInfo" id="gradeInfo">Selecciona un grado para continuar.</div><button id="gradeStart">▶ JUGAR BIT RUSH</button></div>';menu.insertBefore(box,menu.firstChild);const levels=[...box.querySelectorAll('.eduLevel')],grades=box.querySelector('.grades'),panel=box.querySelector('#gradePanel'),go=box.querySelector('#gradeStart');levels.forEach(b=>b.onclick=()=>{selected=null;const level=b.dataset.level;levels.forEach(x=>x.classList.remove('active'));b.classList.add('active');box.style.setProperty('--edu-color',colors[level]);grades.innerHTML=G.filter(x=>x[2]===level).map(x=>`<button class="gradeBtn" data-grade="${x[0]}">${x[1]}</button>`).join('');panel.style.display='block';go.style.display='none';box.querySelector('#gradeInfo').textContent='Selecciona un grado para continuar.';grades.querySelectorAll('.gradeBtn').forEach(g=>g.onclick=()=>{selected=G.find(x=>x[0]===g.dataset.grade);grades.querySelectorAll('.gradeBtn').forEach(x=>x.classList.remove('selected'));g.classList.add('selected');go.style.display='block';box.querySelector('#gradeInfo').textContent=`${selected[1]} · ${difficulty[selected[0]]}`})});originalStart=document.getElementById('start')?.onclick;const old=document.getElementById('start');if(old){old.style.display='none';old.setAttribute('aria-hidden','true')}go.onclick=()=>{if(!selected)return;window.BITRUSH_SELECTED_GRADE=selected[0];window.BITRUSH_SELECTED_EDUCATION_LEVEL=selected[2];localStorage.setItem('bitrush_selected_grade',selected[0]);localStorage.setItem('bitrush_selected_education_level',selected[2]);if(typeof originalStart==='function')originalStart()};const again=document.getElementById('again');if(again)again.onclick=()=>{selected=null;levels.forEach(x=>x.classList.remove('active'));grades.innerHTML='';panel.style.display='none';go.style.display='none';document.getElementById('result').classList.add('hidden');document.getElementById('menu').classList.remove('hidden')};[...menu.children].filter(x=>x!==box&&x.id!=='start').forEach(x=>x.style.display='none')}
  const decks={};function shuffledCopy(items){const copy=items.slice();for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}return copy}function install(){const original=window.getQuestion;if(typeof original!=='function')return;window.getQuestion=function(){const grade=window.BITRUSH_SELECTED_GRADE||localStorage.getItem('bitrush_selected_grade')||'3';const bank=banks[grade]||[];if(bank.length){if(!decks[grade]||decks[grade].length===0)decks[grade]=shuffledCopy(bank);const b=decks[grade].pop();return {text:b[0],opts:shuffledCopy(b[1]),correct:b[1][b[2]],tip:b[3],category:b[4]+' · '+(difficulty[grade]||'PROGRESIVO')}}return original()}}
  function init(){if(!document.getElementById('menu'))return;build();install();window.BITRUSH_SELECTION_READY=true}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
