(function(){
'use strict';
const KEY='mathsolve_history';
let uid=null,last='';let timer=null;
function db(){return window.TecnomathFirebase&&window.TecnomathFirebase.database;}
function local(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return[]}}
function writeLocal(v){try{localStorage.setItem(KEY,JSON.stringify(v));if(typeof window.renderHistory==='function')window.renderHistory();setTimeout(enhanceHistory,30)}catch(e){}}

/* ---------- Historial: ver procedimiento y repetir ---------- */
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
  `;document.head.appendChild(s);
}
function showSteps(item){
  ensureHistoryStyles();
  const old=document.getElementById('ms2-history-modal');if(old)old.remove();
  const modal=document.createElement('div');modal.className='ms2-modal';modal.id='ms2-history-modal';
  const steps=Array.isArray(item.steps)?item.steps:(item.steps?[item.steps]:[]);
  const body=steps.length?steps.map((st,i)=>{
    if(typeof st==='string')return `<div class="ms2-step"><span class="ms2-step-num">${i+1}</span>${escapeHtml(st)}</div>`;
    const title=st.title||st.name||'';const text=st.text||st.description||st.content||'';const math=st.math||st.formula||st.operation||'';
    return `<div class="ms2-step"><span class="ms2-step-num">${i+1}</span><strong>${escapeHtml(title)}</strong>${text?`<div>${escapeHtml(text)}</div>`:''}${math?`<div class="ms2-math">${escapeHtml(math)}</div>`:''}</div>`;
  }).join(''):`<div class="empty-history">Este cálculo no tiene pasos guardados.</div>`;
  modal.innerHTML=`<div class="ms2-modal-card"><div class="ms2-modal-head"><div><div class="ms2-modal-title">📚 ${escapeHtml(item.title||'Procedimiento')}</div><div class="ms2-modal-sub">Resultado: ${escapeHtml(item.result==null?'—':String(item.result))}</div></div><button class="ms2-close" type="button">✕</button></div><div class="ms2-modal-body">${body}</div></div>`;
  document.body.appendChild(modal);
  modal.querySelector('.ms2-close').onclick=()=>modal.remove();
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});
  document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){modal.remove();document.removeEventListener('keydown',esc)}});
}
function escapeHtml(v){return String(v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));}
function getHistoryItems(){return local()}
function findInputValue(item,key){
  const source=item.inputs||item.values||item.data||{};
  if(source&&source[key]!=null)return source[key];
  if(item[key]!=null)return item[key];
  return null;
}
function repeatCalculation(item){
  /* Si el cálculo guardó entradas, las restaura en los campos correspondientes. */
  const source=item.inputs||item.values||item.data||{};
  let restored=0;
  document.querySelectorAll('input').forEach(input=>{
    const keys=[input.name,input.id,input.dataset&&input.dataset.key].filter(Boolean);
    let value=null;
    for(const k of keys){value=findInputValue(item,k);if(value!=null)break}
    if(value==null){
      const clean=keys.map(k=>String(k).toLowerCase().replace(/[^a-z0-9]/g,''));
      for(const k of Object.keys(source||{})){const ck=String(k).toLowerCase().replace(/[^a-z0-9]/g,'');if(clean.includes(ck)){value=source[k];break}}
    }
    if(value!=null){input.value=value;restored++}
  });
  if(item.type){
    const tabMap={cos:'cos',seno:'seno',pit:'pit',area:'area',per:'per',ang:'ang'};
    const target=tabMap[item.type]||item.type;
    const btn=document.querySelector(`.tab[onclick*="'${target}'"], .tab[onclick*="${target}"]`);
    if(btn&&typeof window.tab==='function')window.tab(target,btn);
  }
  if(restored){
    showToast('♻️ Datos del cálculo restaurados. Puedes volver a resolverlo.');
    window.scrollTo({top:0,behavior:'smooth'});
  }else{
    showToast('ℹ️ Este registro conserva el procedimiento, pero no los valores de entrada para repetirlo automáticamente.');
    if(item.type)window.scrollTo({top:0,behavior:'smooth'});
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
  const items=getHistoryItems();
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

async function cloudLoad(){if(!uid||!db())return;try{const snap=await db().ref('mathsolve2History/'+uid).orderByChild('createdAt').limitToLast(50).once('value');const arr=[];snap.forEach(x=>arr.unshift(Object.assign({id:x.key},x.val())));if(arr.length){writeLocal(arr)}else if(local().length){await cloudPush(local());}last=JSON.stringify(local());}catch(e){console.warn('MathSolve cloud load:',e)}}
async function cloudPush(items){if(!uid||!db()||!Array.isArray(items))return;const ref=db().ref('mathsolve2History/'+uid);for(const item of items.slice(0,50)){const id=item.id||ref.push().key;const data=Object.assign({},item,{id:undefined,userId:uid,createdAt:item.createdAt||window.TecnomathFirebase.serverTimestamp});delete data.id;await ref.child(id).set(data)}}
async function sync(){if(!uid)return;const now=local();const serialized=JSON.stringify(now);if(serialized===last)return;last=serialized;try{await cloudPush(now);enhanceHistory()}catch(e){console.warn('MathSolve cloud save:',e)}}
function start(user){uid=user&&user.uid||null;last='';if(timer)clearInterval(timer);if(uid){cloudLoad();timer=setInterval(sync,1200);setTimeout(enhanceHistory,300)}}
if(window.TecnomathFirebase&&window.TecnomathFirebase.auth){window.TecnomathFirebase.auth.onAuthStateChanged(start)}else{setTimeout(()=>{if(window.TecnomathFirebase&&window.TecnomathFirebase.auth)window.TecnomathFirebase.auth.onAuthStateChanged(start)},500)}
const observer=new MutationObserver(()=>enhanceHistory());
if(document.body)observer.observe(document.body,{childList:true,subtree:true});else document.addEventListener('DOMContentLoaded',()=>observer.observe(document.body,{childList:true,subtree:true}));
})();