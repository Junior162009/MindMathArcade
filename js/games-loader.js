/* TecnoMath - carga el catálogo separado de juegos */
(function(){
  'use strict';
  async function loadGames(){
    let tries=0;
    const attach=async()=>{
      if(typeof projects==='undefined' || typeof renderProjects!=='function'){
        if(tries++<80) return setTimeout(attach,250);
        return;
      }
      try{
        const root=location.pathname.includes('/pages/')?'../':'./';
        const response=await fetch(root+'data/games.json?v='+Date.now(),{cache:'no-store'});
        if(!response.ok) throw new Error('HTTP '+response.status);
        const remote=await response.json();
        const games=Array.isArray(remote)?remote.filter(g=>g&&g.url):[];
        const base=Array.isArray(projects)?projects.filter(p=>!p?.submissionId):[];
        projects=typeof combinarJuegos==='function'?combinarJuegos(base,games):base.concat(games);
        renderProjects(window.currentActiveFilter||'todos');
        if(typeof actualizarFiltros==='function') actualizarFiltros();
        console.log('🎮 Catálogo externo cargado:',games.length);
      }catch(e){console.warn('TecnoMath: no se pudo cargar data/games.json:',e)}
    };
    attach();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadGames,{once:true});
  else loadGames();
})();
