/* TecnoMath · juegos publicados en tiempo real */
(function(){
'use strict';
async function start(){
 let tries=0;
 const attach=async()=>{
  if(typeof projects==='undefined'||typeof renderProjects!=='function'){if(tries++<80)return setTimeout(attach,250);return;}
  try{
   const root=location.pathname.includes('/pages/')?'../':'./';
   let games=[];
   if(window.TecnomathFirebase?.database){
    const snap=await window.TecnomathFirebase.database.ref('publishedGames').once('value');
    const data=snap.val()||{};
    games=Object.entries(data).map(([id,g])=>({
     name:g?.name||'Juego',desc:g?.desc||g?.description||'Juego educativo de TecnoMath',
     url:g?.url||g?.publishedUrl||'',imageUrl:g?.imageUrl||'',icon:g?.icon||'🎮',
     category:g?.category||'otros',deviceCompatibility:g?.deviceCompatibility||'both',
     evento:g?.evento||null,submissionId:g?.submissionId||id,authorName:g?.authorName||'Usuario'
    })).filter(g=>g.url);
   }
   if(!games.length){
    const response=await fetch(root+'games/published-games.json?v='+Date.now(),{cache:'no-store'});
    if(response.ok){const remote=await response.json();games=Array.isArray(remote)?remote:[];}
   }
   const base=Array.isArray(projects)?projects.filter(p=>!p?.submissionId):[];
   projects=typeof combinarJuegos==='function'?combinarJuegos(base,games):base.concat(games);
   renderProjects(window.currentActiveFilter||'todos');
   if(typeof actualizarFiltros==='function')actualizarFiltros();
   console.log('🎮 Juegos publicados cargados:',games.length);
  }catch(e){console.warn('TecnoMath: no se pudieron cargar los juegos publicados:',e)}
 };
 attach();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
