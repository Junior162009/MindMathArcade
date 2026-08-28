/* TecnoMath · juegos publicados en tiempo real */
(function(){
'use strict';
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
  }catch(e){console.warn('TecnoMath: no se pudieron cargar los juegos publicados:',e)}
 };
 attach();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
