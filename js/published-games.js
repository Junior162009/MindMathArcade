/* TecnoMath · juegos publicados · fuente pública versionada */
(function(){
  'use strict';

  function esc(s){
    return String(s??'').replace(/[&<>"']/g,c=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  async function loadPublishedGames(){
    let tries=0;
    const attach=async()=>{
      if(typeof projects==='undefined'||typeof renderProjects!=='function'){
        if(tries++<80)return setTimeout(attach,250);
        console.warn('TecnoMath: el catálogo base todavía no está disponible.');
        return;
      }
      try{
        const root=location.pathname.includes('/pages/')?'../':'./';
        const response=await fetch(root+'games/published-games.json?v='+Date.now(),{cache:'no-store'});
        if(!response.ok){
          if(response.status===404){
            console.info('TecnoMath: no existe games/published-games.json; se conserva el catálogo base.');
            return;
          }
          throw new Error('No se pudo cargar el catálogo de juegos publicados.');
        }
        const published=await response.json();
        const extra=Array.isArray(published)?published:[];
        const base=Array.isArray(projects)?projects.filter(p=>!p?.submissionId):[];
        const combined=typeof combinarJuegos==='function'?combinarJuegos(base,extra):base.concat(extra);
        const finalProjects=[];
        const urls=new Set();
        combined.forEach(p=>{
          const key=String(p?.url||p?.name||'').trim().toLowerCase();
          if(!key||urls.has(key))return;
          if(p?.status==='hidden'||p?.status==='draft')return;
          urls.add(key);
          finalProjects.push(p);
        });
        projects=finalProjects;
        renderProjects(window.currentActiveFilter||'todos');
        if(typeof actualizarFiltros==='function')actualizarFiltros();
      }catch(e){
        console.warn('TecnoMath: no se pudieron cargar los juegos publicados:',e);
      }
    };
    attach();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',loadPublishedGames,{once:true});
  }else{
    loadPublishedGames();
  }
})();