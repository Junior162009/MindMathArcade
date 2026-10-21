/* TecnoMath · catálogo publicado, visibilidad y orden centralizado en Supabase */
(function(){
  'use strict';
  const state={db:null,visibility:new Map(),channel:null,base:[],order:[],orderLoaded:false};
  const gameKey=g=>String(g?.url||g?.name||'').trim();

  function applyVisibility(){
    if(typeof projects==='undefined'||typeof renderProjects!=='function')return;
    const finalProjects=[],seen=new Set();
    state.base.forEach(game=>{
      const id=String(game?.id||'').trim();
      const effective=id&&state.visibility.has(id)?state.visibility.get(id):game?.status;
      if(game?.evento||effective==='hidden'||effective==='draft')return;
      const key=gameKey(game).toLowerCase();
      if(!key||seen.has(key))return;
      seen.add(key);finalProjects.push(game);
    });
    // El orden guardado de voting_game_order manda; juegos nuevos quedan al final.
    if(state.orderLoaded&&state.order.length){
      const positions=new Map(state.order.map((key,index)=>[String(key),index]));
      finalProjects.sort((a,b)=>{
        const pa=positions.has(gameKey(a))?positions.get(gameKey(a)):Number.MAX_SAFE_INTEGER;
        const pb=positions.has(gameKey(b))?positions.get(gameKey(b)):Number.MAX_SAFE_INTEGER;
        return pa-pb;
      });
    }
    projects=finalProjects;
    renderProjects(window.currentActiveFilter||'todos');
    if(typeof actualizarFiltros==='function')actualizarFiltros();
  }

  async function loadOrder(){
    if(!state.db)return;
    try{
      const {data,error}=await state.db.rpc('tecnomath_get_setting',{p_key:'voting_game_order'});
      if(error)throw error;
      let value=data;
      if(typeof value==='string'){try{value=JSON.parse(value)}catch(_){value=[]}}
      state.order=Array.isArray(value)?value.map(String):[];
      state.orderLoaded=true;
    }catch(error){
      state.orderLoaded=false;state.order=[];
      console.warn('TecnoMath: no se pudo leer voting_game_order; se conserva el orden del catálogo oficial.',error);
    }
  }

  async function loadVisibility(){
    try{
      if(!window.TecnomathAuth?.getClient)return;
      state.db=await window.TecnomathAuth.getClient();
      await loadOrder();
      const {data,error}=await state.db.from('game_visibility').select('game_id,status,updated_at');
      if(error)throw error;
      state.visibility=new Map((data||[]).map(row=>[String(row.game_id),String(row.status)]));
      applyVisibility();
      if(!state.channel){
        state.channel=state.db.channel('tecnomath-catalog-settings')
          .on('postgres_changes',{event:'*',schema:'public',table:'game_visibility'},payload=>{
            const row=payload.new||payload.old;if(!row?.game_id)return;
            const id=String(row.game_id);
            if(payload.eventType==='DELETE')state.visibility.delete(id);
            else state.visibility.set(id,String(row.status));
            applyVisibility();
          })
          .on('postgres_changes',{event:'*',schema:'public',table:'tecnomath_settings',filter:'key=eq.voting_game_order'},async()=>{
            await loadOrder();applyVisibility();
          })
          .subscribe(status=>console.info('TecnoMath catálogo/orden realtime:',status));
      }
    }catch(error){
      console.warn('TecnoMath: no se pudo cargar la capa de visibilidad o el orden; se conserva el catálogo disponible.',error);
      applyVisibility();
    }
  }

  async function loadPublishedGames(){
    let tries=0;
    const attach=async()=>{
      if(typeof projects==='undefined'||typeof renderProjects!=='function'){
        if(tries++<80)return setTimeout(attach,250);
        console.warn('TecnoMath: el catálogo base todavía no está disponible.');return;
      }
      try{
        const root=location.pathname.includes('/pages/')?'../':'./';
        const response=await fetch(root+'games/published-games.json?v='+Date.now(),{cache:'no-store'});
        let extra=[];
        if(response.ok){const published=await response.json();extra=Array.isArray(published)?published:[]}
        else if(response.status!==404)throw new Error('No se pudo cargar el catálogo de juegos publicados.');
        const base=Array.isArray(projects)?projects.filter(game=>!game?.submissionId):[];
        const combined=typeof combinarJuegos==='function'?combinarJuegos(base,extra):base.concat(extra);
        const merged=[],seen=new Set();
        combined.forEach(game=>{
          const key=gameKey(game).toLowerCase();
          if(!key||seen.has(key))return;
          seen.add(key);merged.push(game);
        });
        state.base=merged;
        // Primero se pinta el catálogo disponible; un error de Supabase no deja la página en blanco.
        applyVisibility();
        await loadVisibility();
      }catch(error){
        console.warn('TecnoMath: no se pudieron cargar los juegos publicados:',error);
        applyVisibility();
      }
    };
    attach();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadPublishedGames,{once:true});
  else loadPublishedGames();
  window.addEventListener('beforeunload',()=>{if(state.channel&&state.db)state.db.removeChannel(state.channel)});
})();