/* TecnoMath Class A Direct Publisher — intercepta el flujo antiguo y exige confirmación real de GitHub. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const slug=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-$/g,'').slice(0,70);
  const say=(m,error=false)=>{const n=$('notice');if(!n)return;n.textContent=m;n.className='notice show'+(error?' error':'');clearTimeout(say.t);say.t=setTimeout(()=>n.className='notice',8000)};
  const val=id=>String($(id)?.value||'').trim();
  const selected=id=>String($(id)?.value||'');
  const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  async function client(){return await window.TecnomathAuth.getClient();}
  async function uploadLogo(db,user,id){
    const file=$('logoFile')?.files?.[0]; if(!file)return null;
    if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))throw Error('El logo debe ser PNG, JPG, WEBP o GIF.');
    if(file.size>2*1024*1024)throw Error('El logo no puede superar 2 MB.');
    const ext=(file.name.split('.').pop()||'png').toLowerCase().replace(/[^a-z0-9]/g,'');
    const path='logos/'+slug(id)+'-'+Date.now()+'.'+ext;
    const {error}=await db.storage.from('game-downloads').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'31536000'});
    if(error)throw error;
    return {path,url:db.storage.from('game-downloads').getPublicUrl(path).data.publicUrl};
  }
  async function makePayload(db,user){
    let id=val('id')||slug(val('name'))||'juego';
    const catalog=await fetch('../../data/games.json?v='+Date.now(),{cache:'no-store'}).then(r=>r.json());
    const existing=catalog.find(g=>String(g.id)===id);
    const editing=val('editingId');
    if(!editing){let base=id,n=2;while(catalog.some(g=>String(g.id)===id)){id=base+'-'+n++;}}
    let folder=slug(val('folder')||id)||id;
    let entry=val('entryFile')||'index.html';
    let url=val('url');
    if(selected('urlType')==='internal'){folder=slug(folder)||id;entry=entry.split('/').pop()||'index.html';url='games/'+folder+'/'+entry;}
    const payload={
      id,name:val('name'),desc:val('description')||'Juego educativo de TecnoMath',description:val('description')||'Juego educativo de TecnoMath',
      icon:val('icon')||'🎮',category:selected('category')||'otros',deviceCompatibility:selected('compatibility')||'both',
      evento:val('event')||null,featured:selected('featured')==='true',order:Number(val('order'))||catalog.length+1,status:'published',
      publishDate:val('publishDate')||new Date().toISOString(),authorName:val('author'),grade:val('grade'),
      allowVoting:selected('allowVoting')!=='false',url,urlType:selected('urlType')||'internal',folder,folderPath:'games/'+folder,entryFile:entry,
      editingId:editing||null
    };
    if(existing && !editing && payload.url===existing.url){
      payload.folder=folder=slug(id);payload.url='games/'+folder+'/'+entry;payload.folderPath='games/'+folder;
    }
    const pkg=$('packageFile')?.files?.[0];
    if(pkg){
      if(!/\.zip$/i.test(pkg.name))throw Error('Selecciona un archivo .ZIP.');
      if(pkg.size>100*1024*1024)throw Error('El ZIP no puede superar 100 MB.');
      const path='class-a-packages/'+user.id+'/'+slug(id)+'-'+Date.now()+'.zip';
      const {error}=await db.storage.from('game-submissions').upload(path,pkg,{contentType:'application/zip',upsert:false,cacheControl:'3600'});
      if(error)throw error;
      payload.packageStoragePath=path;payload.packageFileName=pkg.name;
    }
    const logo=await uploadLogo(db,user,id);
    if(logo){payload.logoStoragePath=logo.path;payload.imageUrl=logo.url;}
    return payload;
  }
  async function publish(e){
    e.preventDefault();e.stopImmediatePropagation();
    try{
      say('⏳ Preparando publicación inmediata…');
      const ready=await window.TecnomathAdminGuard.requireAdmin({redirect:false});
      if(!window.TecnomathAdminGuard.isClassA(ready.profile))throw Error('Solo un administrador Clase A puede publicar.');
      const db=await client();
      const payload=await makePayload(db,ready.user);
      if(!payload.name)throw Error('El nombre es obligatorio.');
      say('⏳ Subiendo paquete y publicando en GitHub…');
      const {data:job,error}=await db.from('tecnomath_catalog_jobs').insert({user_id:ready.user.id,action:'publish',payload,status:'pending',game_id:payload.id}).select('id').single();
      if(error)throw error;
      const {data:result,error:fnError}=await db.functions.invoke('publish-class-a-game',{body:{job_id:job.id}});
      if(fnError)throw fnError;
      if(!result?.ok||!result.commitSha)throw Error(result?.error||'GitHub no confirmó el commit.');
      say('✅ Publicado en GitHub · Commit: '+esc(result.commitSha)+' · Juego: '+esc(result.gamePath)+(result.imagePath?' · Logo: '+esc(result.imagePath):''));
      $('gameForm').reset();$('entryFile').value='index.html';$('icon').value='🎮';$('status').value='published';$('allowVoting').value='true';
      const r=await fetch('../../data/games.json?v='+Date.now(),{cache:'no-store'});if(r.ok)location.reload();
    }catch(err){say('❌ '+(err?.message||err),true)}
  }
  async function hide(id){
    if(!confirm('⚠️ ¿Ocultar este juego?\n\nNo se borrarán sus archivos físicos.'))return;
    try{
      const ready=await window.TecnomathAdminGuard.requireAdmin({redirect:false});if(!window.TecnomathAdminGuard.isClassA(ready.profile))throw Error('Solo Clase A.');
      const db=await client();const {data:job,error}=await db.from('tecnomath_catalog_jobs').insert({user_id:ready.user.id,action:'hide',game_id:id,payload:{reason:'Ocultado desde Gestor Clase A'},status:'pending'}).select('id').single();if(error)throw error;
      say('⏳ Actualizando catálogo en GitHub…');const {data:result,error:fnError}=await db.functions.invoke('publish-class-a-game',{body:{job_id:job.id}});if(fnError)throw fnError;if(!result?.ok)throw Error(result?.error||'GitHub no confirmó el cambio.');say('✅ Ocultado en GitHub · Commit: '+result.commitSha);setTimeout(()=>location.reload(),700);
    }catch(err){say('❌ '+(err?.message||err),true)}
  }
  async function reorder(){
    try{
      const ready=await window.TecnomathAdminGuard.requireAdmin({redirect:false});if(!window.TecnomathAdminGuard.isClassA(ready.profile))throw Error('Solo Clase A.');
      const ids=[...document.querySelectorAll('#orderList .order-item')].map(x=>x.dataset.id).filter(Boolean);
      const db=await client();const {data:job,error}=await db.from('tecnomath_catalog_jobs').insert({user_id:ready.user.id,action:'reorder',payload:{orders:ids.map((id,i)=>({id,order:i+1}))},status:'pending'}).select('id').single();if(error)throw error;
      say('⏳ Guardando orden en GitHub…');const {data:result,error:fnError}=await db.functions.invoke('publish-class-a-game',{body:{job_id:job.id}});if(fnError)throw fnError;if(!result?.ok)throw Error(result?.error||'GitHub no confirmó el orden.');say('✅ Orden publicado en GitHub · Commit: '+result.commitSha);setTimeout(()=>location.reload(),700);
    }catch(err){say('❌ '+(err?.message||err),true)}
  }
  document.addEventListener('submit',e=>{if(e.target?.id==='gameForm')publish(e)},true);
  document.addEventListener('click',e=>{
    const b=e.target.closest('#saveOrder');if(b){e.preventDefault();e.stopImmediatePropagation();reorder();}
  },true);
  const wait=()=>{if(window.TMGM){window.TMGM.hide=hide;}else setTimeout(wait,100)};wait();
})();
