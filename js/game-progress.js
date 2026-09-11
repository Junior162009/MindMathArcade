// TecnoMath Game Progress Compatibility Layer v4
// El guardado de progreso ya no vive aquí: todo pasa por js/tecnomath-progress.js.
(function(){
  'use strict';
  let currentGameId=null,startedAt=Date.now();
  const DEFAULT_EVENTS={halloween:{id:'halloween',name:'Halloween',code:'HALLOWEEN',emoji:'🎃'},navidad:{id:'navidad',name:'Navidad',code:'NAVIDAD',emoji:'🎄'},verano:{id:'verano',name:'Verano',code:'VERANO',emoji:'☀️'},mundial:{id:'mundial',name:'Mundial',code:'MUNDIAL',emoji:'🏆'},regreso:{id:'regreso',name:'Regreso a clases',code:'REGRESO',emoji:'🎒'}};
  const THEMES={normal:{emoji:'📚',className:'theme-normal',colors:{bg:'#060610',card:'#0d0d1a',border:'#1a1a2e',text:'#ffffff',cyan:'#00FFFF',pink:'#FF00FF',green:'#39FF14',yellow:'#FFE600',gold:'#FFD700'}},halloween:{emoji:'🎃',className:'theme-halloween',colors:{bg:'#10050a',card:'#1b0b16',border:'#5b1f49',text:'#fff4e6',cyan:'#ff7a00',pink:'#ff3d00',green:'#b6ff00',yellow:'#ff9f00',gold:'#ff6a00'}},navidad:{emoji:'🎄',className:'theme-navidad',colors:{bg:'#06120d',card:'#0c2118',border:'#1e5b3b',text:'#ffffff',cyan:'#65e6ff',pink:'#ff3b5c',green:'#39ff7a',yellow:'#ffe66d',gold:'#ffd700'}},verano:{emoji:'☀️',className:'theme-verano',colors:{bg:'#071827',card:'#0c2438',border:'#1f6285',text:'#ffffff',cyan:'#29d9ff',pink:'#ff5ea8',green:'#70ff9a',yellow:'#ffe66d',gold:'#ffd166'}},mundial:{emoji:'🏆',className:'theme-mundial',colors:{bg:'#07100a',card:'#0e1d11',border:'#355b3a',text:'#ffffff',cyan:'#4de1ff',pink:'#e8c547',green:'#4cff70',yellow:'#ffe600',gold:'#ffd700'}},regreso:{emoji:'🎒',className:'theme-regreso',colors:{bg:'#10100a',card:'#1c1c0e',border:'#5d5a24',text:'#ffffff',cyan:'#5fd7ff',pink:'#ff72b6',green:'#75ff75',yellow:'#ffe600',gold:'#ffcc33'}}};
  function services(){if(!window.firebase||!firebase.auth||!firebase.database)return null;return{auth:firebase.auth(),db:firebase.database()}}
  function central(){return window.TecnoMathProgress||null}
  function gameKey(id){return central()?.normalizeGameId?central().normalizeGameId(id):String(id||'unknown').replace(/[^a-z0-9_-]/gi,'-').toLowerCase()}
  async function waitCentral(){for(let i=0;i<80&&!central();i++)await new Promise(r=>setTimeout(r,100));return central()}
  async function getEvents(){const s=services(),base={...DEFAULT_EVENTS};if(!s)return base;try{const snap=await s.db.ref('tecnomath/eventos').once('value'),remote=snap.val()||{};Object.keys(remote).forEach(k=>{base[k]={...(base[k]||{id:k}),...remote[k],id:k}})}catch(e){console.warn('No se pudieron cargar los eventos remotos.',e)}return base}
  async function unlockEvent(eventId,code){const s=services(),u=s?.auth?.currentUser;if(!u)return{ok:false,reason:'login_required'};const events=await getEvents(),event=events[String(eventId).toLowerCase()];if(!event||event.active===false)return{ok:false,reason:'inactive'};if(String(code||'').trim().toUpperCase()!==String(event.code||'').trim().toUpperCase())return{ok:false,reason:'invalid_code'};await s.db.ref('userProgress/'+u.uid+'/events/'+gameKey(event.id)).set({unlocked:true,name:event.name||event.id,unlockedAt:firebase.database.ServerValue.TIMESTAMP});return{ok:true,event}}
  async function isEventUnlocked(eventId){const s=services(),u=s?.auth?.currentUser;if(!s||!u)return false;const v=(await s.db.ref('userProgress/'+u.uid+'/events/'+gameKey(eventId)).once('value')).val();return!!(v&&v.unlocked)}
  function applyTheme(id){id=String(id||'normal').toLowerCase();const t=THEMES[id]||THEMES.normal,root=document.documentElement,body=document.body,map={bg:'--theme-bg',card:'--theme-card',border:'--theme-border',text:'--theme-text',cyan:'--neon-cyan',pink:'--neon-pink',green:'--neon-green',yellow:'--neon-yellow',gold:'--gold'};Object.entries(t.colors).forEach(([k,v])=>root.style.setProperty(map[k],v));Object.values(THEMES).forEach(x=>body&&body.classList.remove(x.className));if(body){body.classList.add(t.className);body.dataset.tecnomathTheme=id}root.dataset.tecnomathTheme=id;root.style.setProperty('--tecnomath-theme',id);root.style.setProperty('--theme-emoji',JSON.stringify(t.emoji));window.dispatchEvent(new CustomEvent('tecnomath:themechange',{detail:{id,theme:t}}))}
  function watchTheme(){const s=services();if(!s)return;const ref=s.db.ref('tecnomath/tematicaActiva');ref.on('value',snap=>applyTheme(snap.val()||'normal'),()=>applyTheme('normal'))}
  const gameApi={
    async start(id){currentGameId=gameKey(id);startedAt=Date.now();const c=await waitCentral();return c?.start?c.start(currentGameId):false},
    async save(id,data){const c=await waitCentral();return c?.save?c.save(gameKey(id||currentGameId),data||{}):false},
    async saveSnapshot(id,key,fields){try{const value=JSON.parse(localStorage.getItem(key)||'{}'),snapshot=fields?fields.reduce((r,k)=>{if(Object.prototype.hasOwnProperty.call(value,k))r[k]=value[k];return r},{}):value;return this.save(id,{snapshot})}catch(_){return false}},
    async load(id){const c=await waitCentral();return c?.load?c.load(gameKey(id||currentGameId)):null},
    async savePlayTime(seconds){const c=await waitCentral(),id=gameKey(currentGameId);const d=c?.read?c.read():{};d.secondsPlayed=(Number(d.secondsPlayed)||0)+Math.max(0,Math.round(Number(seconds)||0));return c?.save?c.save(id,d):false},
    events:{list:getEvents,unlock:unlockEvent,isUnlocked:isEventUnlocked}
  };
  if(!window.TecnomathProgress)window.TecnomathProgress=gameApi;else window.TecnomathGameProgress=gameApi;
  const tag=document.currentScript;
  if(tag&&tag.dataset.tecnomathGame){currentGameId=gameKey(tag.dataset.tecnomathGame);waitCentral().then(c=>{if(c?.start)c.start(currentGameId)})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchTheme,{once:true});else watchTheme();
  window.TecnomathTheme={apply:applyTheme,watch:watchTheme,themes:THEMES};
})();
