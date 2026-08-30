/* TecnoMath · juegos publicados + acceso visible a Ranking y Torneos */
(function(){
'use strict';
function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}
function competitionUI(){
 if(document.getElementById('tecnomath-competition-widget'))return;
 const style=document.createElement('style');style.textContent=`#tecnomath-competition-widget{max-width:900px;margin:18px auto;padding:18px;border:2px solid #ff00ff;border-radius:18px;background:linear-gradient(135deg,#12122a,#20204a);box-shadow:0 0 25px #ff00ff33;color:#fff;font-family:Arial,sans-serif}#tecnomath-competition-widget h2{margin:0 0 8px;color:#00ffff}#tm-comp-actions{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}#tm-comp-actions a{background:#ff00ff;color:#fff;text-decoration:none;padding:11px 15px;border-radius:10px;font-weight:700}#tm-comp-actions a:nth-child(2){background:#00b894;color:#06120f}.tm-rank{display:grid;grid-template-columns:42px 1fr auto auto;gap:8px;align-items:center;padding:8px;border-radius:8px;background:#ffffff08;margin:5px 0}.tm-medal{font-size:20px}.tm-reward{color:#ffe600;font-weight:700}.tm-tournaments{margin-top:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:9px}.tm-tour{padding:12px;background:#ffffff0b;border:1px solid #ffffff18;border-radius:10px}.tm-tour button{margin-top:8px;border:0;border-radius:8px;padding:8px 10px;font-weight:700;cursor:pointer}`;document.head.appendChild(style);
 const box=document.createElement('section');box.id='tecnomath-competition-widget';box.innerHTML=`<h2>🏆 Ranking y Torneos</h2><p>Compite con usuarios reales de TecnoMath y gana 🪙 monedas según tu puesto.</p><div id="tm-comp-actions"><a href="/pages/competir/">🏆 VER RANKING GLOBAL</a><a href="/pages/competir/">⚔️ VER TORNEOS</a></div><h3>🌍 Top Global</h3><div id="tm-global-ranking">Cargando ranking...</div><h3>⚔️ Torneos</h3><div id="tm-tournaments" class="tm-tournaments">Cargando torneos...</div>`;
 const target=document.querySelector('.filters')||document.querySelector('.hero')||document.body;target.parentNode.insertBefore(box,target.nextSibling);
 const rewards=['🥇 500 🪙','🥈 300 🪙','🥉 200 🪙'];
 function renderRank(list){const el=document.getElementById('tm-global-ranking');if(!list.length){el.innerHTML='<p>Aún no hay jugadores clasificados.</p>';return}el.innerHTML=list.slice(0,10).map((x,i)=>`<div class="tm-rank"><span class="tm-medal">${i<3?['🥇','🥈','🥉'][i]:'#'+(i+1)}</span><strong>${esc(x.name)}</strong><span>${Number(x.score||0)} pts</span><span class="tm-reward">${rewards[i]||'🏅 50 🪙'}</span></div>`).join('')}
 function renderTours(list){const el=document.getElementById('tm-tournaments');if(!list.length){el.innerHTML='<p>No hay torneos publicados todavía.</p>';return}el.innerHTML=list.slice(0,8).map(t=>`<div class="tm-tour"><strong>⚔️ ${esc(t.name||'Torneo TecnoMath')}</strong><p>${t.status==='active'?'🟢 En curso':'🟡 Próximamente'}</p><b>Premios:</b> 🥇 500 · 🥈 300 · 🥉 200 🪙<br><button onclick="location.href='/pages/competir/'">Ver torneo</button></div>`).join('')}
 window.addEventListener('load',async()=>{try{if(!window.firebase?.firestore){await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js');}if(!window.TecnoMathCompetition)await loadScript('/js/tecnomath-competition.js?v=2');if(window.TecnoMathCompetition){firebase.auth().onAuthStateChanged(()=>{window.TecnoMathCompetition.top(null,renderRank,10);window.TecnoMathCompetition.active(renderTours)});}}catch(e){console.warn('Competición no disponible',e)}});
}
function esc(s){return String(s||'Jugador').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function start(){
 let tries=0;
 const attach=async()=>{
  if(typeof projects==='undefined'||typeof renderProjects!=='function'){if(tries++<80)return setTimeout(attach,250);return;}
  try{
   const root=location.pathname.includes('/pages/')?'../':'./';
   let firebaseGames=[];
   if(window.TecnomathFirebase?.database){
    const snap=await window.TecnomathFirebase.database.ref('publishedGames').once('value');
    const data=snap.val()||{};
    firebaseGames=Object.entries(data).map(([id,g])=>({name:g?.name||'Juego',desc:g?.desc||g?.description||'Juego educativo de TecnoMath',url:g?.url||g?.publishedUrl||'',imageUrl:g?.imageUrl||'',icon:g?.icon||'🎮',category:g?.category||'otros',deviceCompatibility:g?.deviceCompatibility||'both',evento:g?.evento||null,submissionId:g?.submissionId||id,authorName:g?.authorName||'Usuario'})).filter(g=>g.url);
   }
   let localGames=[];
   const response=await fetch(root+'games/published-games.json?v='+Date.now(),{cache:'no-store'});
   if(response.ok){const remote=await response.json();localGames=Array.isArray(remote)?remote:[];}
   const merged=[...localGames,...firebaseGames];
   const seen=new Set();
   const games=merged.filter(g=>{const key=(g?.url||'').trim().toLowerCase();if(!g?.url||seen.has(key))return false;seen.add(key);return true;});
   const base=Array.isArray(projects)?projects.filter(p=>!p?.submissionId):[];
   const combined=typeof combinarJuegos==='function'?combinarJuegos(base,games):base.concat(games);
   const finalProjects=[];const urls=new Set();
   combined.forEach(p=>{const key=(p?.url||p?.name||'').trim().toLowerCase();if(!key||urls.has(key))return;urls.add(key);finalProjects.push(p);});
   projects=finalProjects;
   renderProjects(window.currentActiveFilter||'todos');
   if(typeof actualizarFiltros==='function')actualizarFiltros();
   competitionUI();
  }catch(e){console.warn('TecnoMath: no se pudieron cargar los juegos publicados:',e)}
 };
 attach();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
