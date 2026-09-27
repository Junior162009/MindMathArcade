/* TecnoMath · juegos publicados · catálogo + capa de visibilidad Supabase */
(function(){
  'use strict';

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state={db:null,visibility:new Map(),channel:null,base:[]};

  function applyVisibility(){
    if(typeof projects==='undefined'||typeof renderProjects!=='function')return;
    const finalProjects=[];
    const urls=new Set();
    state.base.forEach(p=>{
      const id=String(p?.id||'').trim();
      const effective=id&&state.visibility.has(id)?state.visibility.get(id):p?.status;
      if(p?.evento)return;
      if(effective==='hidden'||effective==='draft')return;
      const key=String(p?.url||p?.name||'').trim().toLowerCase();
      if(!key||urls.has(key))return;
      urls.add(key);
      finalProjects.push(p);
    });
    projects=finalProjects;
    renderProjects(window.currentActiveFilter||'todos');
    if(typeof actualizarFiltros==='function')actualizarFiltros();
  }

  async function loadVisibility(){
    try{
      if(!window.TecnomathAuth?.getClient)return;
      state.db=await window.TecnomathAuth.getClient();
      const {data,error}=await state.db.from('game_visibility').select('game_id,status,updated_at');
      if(error)throw error;
      state.visibility=new Map((data||[]).map(x=>[String(x.game_id),String(x.status)]));
      applyVisibility();
      if(!state.channel){
        state.channel=state.db.channel('tecnomath-game-visibility')
          .on('postgres_changes',{event:'*',schema:'public',table:'game_visibility'},payload=>{
            const row=payload.new||payload.old;if(!row?.game_id)return;
            const id=String(row.game_id);
            if(payload.eventType==='DELETE')state.visibility.delete(id);
            else state.visibility.set(id,String(row.status));
            applyVisibility();
          })
          .subscribe(status=>console.info('TecnoMath game visibility realtime:',status));
      }
    }catch(e){
      console.warn('TecnoMath: no se pudo cargar la capa de visibilidad; se conserva el catálogo base.',e);
    }
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
        let extra=[];
        if(response.ok){
          const published=await response.json();
          extra=Array.isArray(published)?published:[];
        }else if(response.status!==404){
          throw new Error('No se pudo cargar el catálogo de juegos publicados.');
        }

        const base=Array.isArray(projects)?projects.filter(p=>!p?.submissionId):[];
        const combined=typeof combinarJuegos==='function'?combinarJuegos(base,extra):base.concat(extra);
        const merged=[];
        const urls=new Set();
        combined.forEach(p=>{
          const key=String(p?.url||p?.name||'').trim().toLowerCase();
          if(!key||urls.has(key))return;
          urls.add(key);
          merged.push(p);
        });
        state.base=merged;
        applyVisibility();
        await loadVisibility();
      }catch(e){
        console.warn('TecnoMath: no se pudieron cargar los juegos publicados:',e);
      }
    };
    attach();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadPublishedGames,{once:true});
  else loadPublishedGames();

  window.addEventListener('beforeunload',()=>{
    if(state.channel&&state.db)state.db.removeChannel(state.channel);
  });
})();