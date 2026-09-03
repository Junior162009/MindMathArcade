(function(){
'use strict';
const KEY='mathsolve_history';
let uid=null,last='';let timer=null;
function db(){return window.TecnomathFirebase&&window.TecnomathFirebase.database;}
function local(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]}}
function writeLocal(v){try{localStorage.setItem(KEY,JSON.stringify(v));if(typeof window.renderHistory==='function')window.renderHistory();setTimeout(enhanceHistory,30)}catch(e){}}

function ensureHistoryStyles(){
  if(document.getElementById('ms2-history-extra-style'))return;
  const s=document.createElement('style');s.id='ms2-history-extra-style';
  s.textContent=`
    .ms2-history-actions{display:flex;gap:6px;flex-wrap:wrap;flex:none}
    .ms2-history-btn{border:1px solid #344566;background:#18233d;color:#fff;border-radius:10px;padding:8px 10px;font-size:12px;font-weight:800;cursor:pointer}
    .ms2-history-btn.primary{background:linear-gradient(135deg,#7c5cff,#4387ff);border-color:transparent}
    .ms2-history-btn:hover{filter:brightness(1.08);transform:translateY(-1px)}
    .ms2-modal{position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(7px);display:flex;align-items:center;justify-content:center;padding:18px;z-index:99999}
    .ms2-modal-card{width:min(760px,100%);max-height:min(86vh,800px);overflow:auto;background:#0b1223;border:1px solid #33476d;border-radius:20px;box-shadow:0 25px 80px rgba(0,0,0,.55);color:#f5f7ff}
    .ms2-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:18px;border-bottom:1px solid #263754;position:sticky;top:0;background:#0b1223;z-index:2}
    .ms2-modal-title{font-size:20px;font-weight:900}.ms2-modal-sub{color:#aab5d1;font-size:13px;margin-top:4px}
    .ms2-close{border:1px solid #344566;background:#18233d;color:#fff;border-radius:10px;padding:8px 11px;cursor:pointer;font-weight:900}
    .ms2-modal-body{padding:18px}.ms2-step{padding:14px 0;border-bottom:1px solid #263754;line-height:1.65}.ms2-step:last-child{border-bottom:0}
    .ms2-step-num{display:inline-flex;min-width:28px;height:28px;align-items:center;justify-content:center;border-radius:8px;background:rgba(0,217,255,.10);color:#00d9ff;font-weight:900;margin-right:8px}
    .ms2-math{display:block;margin-top:8px;padding:10px 12px;background:#050914;border:1px solid #1e2b47;border-radius:9px;font-weight:800;overflow-x:auto}
    .ms2-inputs{margin:0 0 14px;padding:12px 14px;background:#080e1d;border:1px solid #263754;border-radius:12px;color:#aab5d1;font-size:13px}
    .ms2-inputs b{color:#f5f7ff}
  `;document.head.appendChild(s);
}
function escapeHtml(v){return String(v==null?'':v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));}
function getSteps(item){
  if(Array.isArray(item.steps))return item.steps;
  if(item.steps)return [item.steps];
  return [];
}
function showSteps(item){
  ensureHistoryStyles();
  const old=document.getElementById('ms2-history-modal');if(old)old.remove();
  const modal=document.createElement('div');modal.className='ms2-modal';modal.id='ms2-history-modal';
  const steps=getSteps(item);
  const inputEntries=Object.entries(item.inputs||{});
  const inputHtml=inputEntries.length
    ? `<div class="ms2-inputs"><b>📌 Datos usados:</b> ${inputEntries.map(([k,v])=>`${escapeHtml(k)} = ${escapeHtml(v)}`).join(' · ')}</div>`
    : '';
  const body=steps.length?steps.map((st,i)=>{
    if(typeof st==='string')return `<div class="ms2-step"><span class="ms2-step-num">${i+1}</span>${escapeHtml(st)}</div>`;
    const title=st.title||st.name||'';const text=st.text||st.description||st.content||'';const math=st.math||st.formula||st.operation||'';
    return `<div class="ms2-step"><span class="ms2-step-num">${i+1}</span><strong>${escapeHtml(title)}</strong>${text?`<div>${escapeHtml(text)}</div>`:''}${math?`<div class="ms2-math">${escapeHtml(math)}</div>`:''}</div>`;
  }).join(''):`<div class="empty-history">Este cálculo fue guardado antes de activar el historial detallado. Los nuevos cálculos sí conservarán todos los pasos.</div>`;
  modal.innerHTML=`<div class="ms2-modal-card"><div class="ms2-modal-head"><div><div class="ms2-modal-title">📚 ${escapeHtml(item.title||item.type||'Procedimiento')}</div><div class="ms2-modal-sub">Resultado: ${escapeHtml(item.result==null?'—':String(item.result))}</div></div><button class="ms2-close" type="button">✕</button></div><div class="ms2-modal-body">${inputHtml}${body}</div></div>`;
  document.body.appendChild(modal);
  modal.querySelector('.ms2-close').onclick=()=>modal.remove();
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});
  const esc=e=>{if(e.key==='Escape'){modal.remove();document.removeEventListener('keydown',esc)}};
  document.addEventListener('keydown',esc);
}

const TYPE_CONFIG={
  'Ley del Coseno':{section:'cos',fn:'coseno',inputs:['ca','cb','cc']},
  'Ley del Seno':{section:'seno',fn:'seno',inputs:['sa','saa','sbb']},
  'Pitágoras':{section:'pit',fn:'pitagoras',inputs:['pa','pb']},
  'Área':{section:'area',fn:'area',inputs:['aa','ab','ac']},
  'Perímetro':{section:'per',fn:'perimetro',inputs:['pea','peb','pec']},
  'Ángulo C':{section:'ang',fn:'angulo',inputs:['anga','angb','angc']}
};

function captureInputs(type){
  const cfg=TYPE_CONFIG[type]||{};const inputs={};
  (cfg.inputs||[]).forEach(id=>{const el=document.getElementById(id);if(el)inputs[id]=el.value});
  return inputs;
}
function captureSteps(type){
  const map={
    'Ley del Coseno':'rc','Ley del Seno':'rs','Pitágoras':'rp','Área':'ra','Perímetro':'re','Ángulo C':'rg'
  };
  const el=document.getElementById(map[type]);
  if(!el)return [];
  return [...el.querySelectorAll('.step')].map(step=>({
    title:(step.querySelector('.step-title')||{}).textContent||'',
    math:(step.querySelector('.mathline')||{}).textContent||''
  }));
}

function installEnhancedHistory(){
  if(typeof window.saveHistory!=='function')return;
  if(window.saveHistory.__ms2Enhanced)return;
  const originalSave=window.saveHistory;
  function enhancedSaveHistory(type,detail,result){
    const steps=captureSteps(type);
    const inputs=captureInputs(type);
    const history=local();
    history.unshift({
      type,
      title:type,
      detail,
      result,
      inputs,
      values:inputs,
      steps,
      date:new Date().toLocaleString('es-CO')
    });
    try{localStorage.setItem(KEY,JSON.stringify(history.slice(0,50)))}catch(e){}
    if(typeof window.renderHistory==='function')window.renderHistory();
    setTimeout(enhanceHistory,30);
  }
  enhancedSaveHistory.__ms2Enhanced=true;
  enhancedSaveHistory.__original=originalSave;
  window.saveHistory=enhancedSaveHistory;
}

function findInputValue(item,key){
  const source=item.inputs||item.values||item.data||{};
  if(source&&source[key]!=null)return source[key];
  if(item[key]!=null)return item[key];
  return null;
}
function repeatCalculation(item){
  const cfg=TYPE_CONFIG[item.type||item.title]||{};
  const source=item.inputs||item.values||item.data||{};
  let restored=0;
  const ids=cfg.inputs||Object.keys(source);
  ids.forEach(id=>{
    const input=document.getElementById(id);if(!input)return;
    const value=findInputValue(item,id);
    if(value!=null){input.value=value;restored++}
  });
  if(cfg.section&&typeof window.tab==='function'){
    const btn=[...document.querySelectorAll('.tab')].find(b=>String(b.getAttribute('onclick')||'').includes(`'${cfg.section}'`));
    window.tab(cfg.section,btn);
  }
  if(restored){
    showToast('♻️ Datos cargados. Pulsa CALCULAR PROCEDIMIENTO para volver a resolverlo.');
    setTimeout(()=>{
      const first=cfg.inputs&&document.getElementById(cfg.inputs[0]);
      if(first)first.focus();
      window.scrollTo({top:document.querySelector('.card')?.offsetTop||0,behavior:'smooth'});
    },80);
  }else{
    showToast('ℹ️ Este registro es antiguo y no tiene datos para repetirlo automáticamente.');
  }
}
function showToast(msg){
  let t=document.querySelector('.toast');
  if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}
  t.textContent=msg;t.classList.add('show');clearTimeout(t._tm);t._tm=setTimeout(()=>t.classList.remove('show'),2600);
}
function enhanceHistory(){
  ensureHistoryStyles();
  const list=document.querySelector('.history-list');if(!list)return;
  const items=local();
  const rows=[...list.querySelectorAll('.history-item')];
  rows.forEach((row,index)=>{
    if(row.querySelector('.ms2-history-actions'))return;
    const item=items[index];if(!item)return;
    const actions=document.createElement('div');actions.className='ms2-history-actions';
    const view=document.createElement('button');view.type='button';view.className='ms2-history-btn primary';view.textContent='📚 Ver pasos';view.onclick=()=>showSteps(item);
    const repeat=document.createElement('button');repeat.type='button';repeat.className='ms2-history-btn';repeat.textContent='♻️ Repetir';repeat.onclick=()=>repeatCalculation(item);
    actions.append(view,repeat);row.appendChild(actions);
  });
}

async function cloudLoad(){
  if(!uid||!db())return;
  try{
    const snap=await db().ref('mathsolve2History/'+uid).orderByChild('createdAt').limitToLast(50).once('value');
    const arr=[];
    snap.forEach(x=>arr.unshift(Object.assign({id:x.key},x.val())));
    if(arr.length){writeLocal(arr)}
    else if(local().length){await cloudPush(local());}
    last=JSON.stringify(local());
  }catch(e){console.warn('MathSolve cloud load:',e)}
}
async function cloudPush(items){
  if(!uid||!db()||!Array.isArray(items))return;
  const ref=db().ref('mathsolve2History/'+uid);
  for(const item of items.slice(0,50)){
    const id=item.id||ref.push().key;
    const data=Object.assign({},item,{id:undefined,userId:uid,createdAt:item.createdAt||window.TecnomathFirebase.serverTimestamp});
    delete data.id;
    await ref.child(id).set(data);
  }
}
async function sync(){
  if(!uid)return;
  const now=local();const serialized=JSON.stringify(now);
  if(serialized===last)return;
  last=serialized;
  try{await cloudPush(now);enhanceHistory()}catch(e){console.warn('MathSolve cloud save:',e)}
}
function start(user){
  uid=user&&user.uid||null;last='';
  if(timer)clearInterval(timer);
  if(uid){cloudLoad();timer=setInterval(sync,1200);setTimeout(enhanceHistory,300)}
}

if(window.TecnomathFirebase&&window.TecnomathFirebase.auth){window.TecnomathFirebase.auth.onAuthStateChanged(start)}
else{setTimeout(()=>{if(window.TecnomathFirebase&&window.TecnomathFirebase.auth)window.TecnomathFirebase.auth.onAuthStateChanged(start)},500)}

function boot(){
  installEnhancedHistory();
  setTimeout(enhanceHistory,100);
  const observer=new MutationObserver(()=>{installEnhancedHistory();enhanceHistory()});
  observer.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();