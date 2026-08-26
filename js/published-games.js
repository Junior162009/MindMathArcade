/* TecnoMath · incorpora juegos aprobados publicados por backend al catálogo */
(function(){
  'use strict';
  function start(){
    if(!window.firebase?.database)return;
    let tries=0;
    const attach=()=>{
      if(typeof projects==='undefined' || typeof renderProjects!=='function'){
        if(tries++<80)setTimeout(attach,250);
        return;
      }
      firebase.database().ref('publishedGames').on('value',snap=>{
        const remote=Object.values(snap.val()||{}).map(g=>({
          name:String(g.name||'Juego'),desc:String(g.desc||''),url:String(g.url||''),imageUrl:String(g.imageUrl||''),icon:String(g.icon||'🎮'),category:String(g.category||'otros'),deviceCompatibility:String(g.deviceCompatibility||'both'),evento:g.evento??null,authorName:String(g.authorName||'Usuario'),submissionId:String(g.submissionId||'')
        })).filter(g=>g.url);
        try{
          const base=Array.isArray(projects)?projects.filter(p=>!p?.submissionId):[];
          projects=typeof combinarJuegos==='function'?combinarJuegos(base,remote):base.concat(remote);
          renderProjects(window.currentActiveFilter||'todos');
          if(typeof actualizarFiltros==='function')actualizarFiltros();
          console.log('🎮 Juegos publicados cargados:',remote.length);
        }catch(e){console.warn('TecnoMath: no se pudo integrar juegos publicados:',e)}
      },e=>console.warn('TecnoMath: no se pudieron leer juegos publicados:',e));
    };
    attach();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
