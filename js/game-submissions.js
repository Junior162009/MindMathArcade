/* TecnoMath · sistema de envío/aprobación sin Cloud Functions ni Firebase Storage */
(function(){
  'use strict';
  const ADMINS=['delahozbarcelojunior@gmail.com','nicolenatera26@gmail.com','mateobarbosamatos@gmail.com','jandresvf23@gmail.com'];
  const MAX_ZIP=7*1024*1024;
  const MAX_COVER=1024*1024;
  const cloud=()=>window.TecnomathFirebase||{auth:firebase.auth(),database:firebase.database(),serverTimestamp:firebase.database.ServerValue.TIMESTAMP};
  const isAdmin=u=>!!u&&ADMINS.includes(String(u.email||'').trim().toLowerCase());
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const pageRoot=()=>location.pathname.includes('/pages/')?'':'../';
  const bytesToBase64=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=reject;r.readAsDataURL(file)});
  const base64ToBlob=(b64,mime)=>{const bin=atob(b64),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type:mime||'application/octet-stream'});};

  function addStyles(){if(document.getElementById('tm-game-submit-style'))return;const s=document.createElement('style');s.id='tm-game-submit-style';s.textContent=`.tm-upload-btn{border-color:#39ff14!important;color:#39ff14!important;background:transparent!important}.tm-upload-btn:hover{background:rgba(57,255,20,.12)!important;box-shadow:0 0 12px rgba(57,255,20,.35)}.tm-submissions-grid{display:grid;gap:12px}.tm-submission{background:#0d0d1a;border:1px solid #25253c;border-radius:12px;padding:15px}.tm-submission-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.tm-submission h3{margin:0 0 7px}.tm-submission p{color:#aaa;font-size:13px;line-height:1.5}.tm-status{display:inline-block;padding:5px 8px;border-radius:999px;font-size:10px;background:#222;color:#fff}.tm-status.pending{color:#ffe600;border:1px solid #ffe600}.tm-status.approved{color:#39ff14;border:1px solid #39ff14}.tm-status.rejected,.tm-status.publish_error{color:#ff6b81;border:1px solid #ff6b81}.tm-status.published{color:#00ffff;border:1px solid #00ffff}.tm-sub-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.tm-sub-actions button,.tm-sub-actions a{border:1px solid #33334d;background:#17172a;color:#fff;border-radius:8px;padding:8px 10px;text-decoration:none;cursor:pointer}.tm-sub-actions .ok{border-color:#39ff14;color:#39ff14}.tm-sub-actions .danger{border-color:#ff416c;color:#ff8aa2}.tm-count{display:inline-block;margin-left:7px;padding:2px 7px;border-radius:10px;background:#ff416c;color:#fff;font-size:9px}.tm-publish-box{background:#101025;border:1px solid #292943;border-radius:10px;padding:12px;margin-bottom:14px}.tm-publish-box input{width:100%;box-sizing:border-box;background:#080812;color:#fff;border:1px solid #33334d;border-radius:8px;padding:10px;margin:7px 0}.tm-publish-box small{color:#888;display:block;line-height:1.4}`;document.head.appendChild(s)}

  function injectUploadButton(){
    if(/\/pages\/admin\//.test(location.pathname)||/\/pages\/upload-game\.html$/.test(location.pathname))return;
    const nav=document.querySelector('.user-area');if(!nav||document.getElementById('tmUploadGameBtn'))return;
    const a=document.createElement('a');a.id='tmUploadGameBtn';a.className='auth-link tm-upload-btn';a.href=(location.pathname.includes('/pages/')?'upload-game.html':'pages/upload-game.html');a.textContent='🎮 SUBIR JUEGO';a.title='Enviar un juego para revisión';nav.appendChild(a);addStyles();
  }

  function setupUploadPage(){
    if(!/\/pages\/upload-game\.html$/.test(location.pathname))return;
    addStyles();const c=cloud(),form=document.getElementById('gameUploadForm'),status=document.getElementById('uploadStatus'),userBox=document.getElementById('uploadUser'),submit=document.getElementById('submitGame');if(!form)return;
    let currentUser=null;
    c.auth.onAuthStateChanged(u=>{currentUser=u||null;if(!u){userBox.innerHTML='🔒 Debes iniciar sesión para subir un juego. <a href="auth.html" style="color:#00ffff">Iniciar sesión</a>';submit.disabled=true;}else{userBox.innerHTML=`👤 Enviando como <strong>${esc(u.displayName||u.email||'usuario')}</strong> · ${esc(u.email||'')}`;submit.disabled=false;}});
    const show=(msg,type)=>{status.textContent=msg;status.className='status show '+type};
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(!currentUser){show('Debes iniciar sesión antes de enviar el juego.','error');return}
      const zip=document.getElementById('gameZip').files[0],cover=document.getElementById('gameCover').files[0];
      if(!zip||!zip.name.toLowerCase().endsWith('.zip')){show('Selecciona un archivo .zip.','error');return}
      if(zip.size>MAX_ZIP){show('El ZIP supera 7 MB. Este límite permite guardar el envío en Realtime Database sin Storage.','error');return}
      if(cover&&cover.size>MAX_COVER){show('La portada supera 1 MB.','error');return}
      submit.disabled=true;submit.textContent='⏳ PREPARANDO…';
      try{
        const name=document.getElementById('gameName').value.trim(),description=document.getElementById('gameDescription').value.trim(),category=document.getElementById('gameCategory').value;
        const zipBase64=await bytesToBase64(zip);let coverBase64='',coverMime='';if(cover){coverBase64=await bytesToBase64(cover);coverMime=cover.type||'image/jpeg'}
        const ref=c.database.ref('gameSubmissions').push(),id=ref.key;
        const data={name,description,category,authorUid:currentUser.uid,authorName:currentUser.displayName||currentUser.email?.split('@')[0]||'Usuario',authorEmail:currentUser.email||'',status:'pending',zipBase64,zipName:zip.name,zipBytes:zip.size,coverBase64,coverMime,createdAt:c.serverTimestamp};
        await ref.set(data);form.reset();show('✅ Juego enviado. Los 4 administradores lo verán en su panel y podrán aprobarlo.','ok');
      }catch(err){console.error(err);show('❌ No se pudo guardar el juego: '+(err.message||err),'error');}
      submit.disabled=false;submit.textContent='🚀 ENVIAR PARA REVISIÓN';
    });
  }

  async function loadJSZip(){if(window.JSZip)return window.JSZip;return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';s.onload=()=>resolve(window.JSZip);s.onerror=reject;document.head.appendChild(s)});}
  const githubHeaders=token=>({'Accept':'application/vnd.github+json','Authorization':'Bearer '+token,'X-GitHub-Api-Version':'2026-03-10','Content-Type':'application/json'});
  async function githubPut(token,path,content,message){const r=await fetch('https://api.github.com/repos/Junior162009/MindMathArcade/contents/'+path.split('/').map(encodeURIComponent).join('/'),{method:'PUT',headers:githubHeaders(token),body:JSON.stringify({message,content,branch:'main'})});const j=await r.json();if(!r.ok)throw new Error(j.message||('GitHub HTTP '+r.status));return j;}
  async function publishToGitHub(item,token){
    if(!token)throw new Error('Falta el GitHub token del administrador.');
    const JSZipCtor=await loadJSZip(),zip=await JSZipCtor.loadAsync(item.zipBase64,{base64:true}),files=Object.values(zip.files).filter(f=>!f.dir);
    if(files.length>200)throw new Error('El juego contiene demasiados archivos (máximo 200).');
    const folder=(''+(item.name||'juego')+'-'+item.id).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,45)+'-'+item.id.slice(-6);
    let hasIndex=false,count=0;
    for(const file of files){
      let rel=file.name.replace(/\\/g,'/').replace(/^\/+/, '');
      if(rel.includes('..')||rel.startsWith('.github/')||rel.includes('/.github/'))continue;
      if(rel.toLowerCase()==='index.html')hasIndex=true;
      const data=await file.async('base64');await githubPut(token,`games/${folder}/${rel}`,data,`🎮 Publicar juego: ${item.name}`);if(++count>200)throw new Error('Demasiados archivos.');
    }
    if(!hasIndex)throw new Error('El ZIP no contiene index.html en su raíz.');
    let imageUrl='';
    if(item.coverBase64){const ext=(item.coverMime||'image/jpeg').split('/')[1]==='png'?'png':(item.coverMime||'').includes('webp')?'webp':'jpg';await githubPut(token,`games/${folder}/cover.${ext}`,item.coverBase64,`🖼️ Portada: ${item.name}`);imageUrl=`games/${folder}/cover.${ext}`;}
    const base='https://junior162009.github.io/MindMathArcade/';
    const url=base+`games/${folder}/index.html`;
    const image=imageUrl?base+imageUrl:'';
    return {folder,url,imageUrl:image};
  }

  function setupAdminSubmissions(){
    if(!/\/pages\/admin\/index\.html$/.test(location.pathname))return;
    addStyles();
    const wait=()=>{const nav=document.querySelector('.admin-tabs'),main=document.querySelector('main');if(!nav||!main){setTimeout(wait,150);return}if(document.getElementById('tm-game-submissions-tab'))return;
      const tab=document.createElement('button');tab.className='tab';tab.id='tm-game-submissions-tab';tab.dataset.tab='game-submissions';tab.innerHTML='🎮 Juegos enviados <span id="tmPendingCount" class="tm-count">0</span>';nav.appendChild(tab);
      const panel=document.createElement('section');panel.className='tab-panel';panel.id='tab-game-submissions';panel.innerHTML='<section class="panel"><div class="panel-head"><div><h2>🎮 Juegos enviados</h2><p>Los archivos se guardan temporalmente en Realtime Database. No se usa Firebase Storage ni Cloud Functions.</p></div><button id="tmRefreshSubmissions">↻ Actualizar</button></div><div class="tm-publish-box"><strong>🔐 Publicación en GitHub</strong><small>Introduce un Fine-grained Personal Access Token de GitHub con <b>Contents: Read and write</b> para <b>Junior162009/MindMathArcade</b>. El token se mantiene solamente en esta pestaña y nunca se guarda en Firebase.</small><input id="tmGithubToken" type="password" autocomplete="off" placeholder="github_pat_…"><button id="tmClearGithubToken">Limpiar token</button></div><div id="tmSubmissionsList" class="tm-submissions-grid">Cargando…</div></section>';main.appendChild(panel);
      const tokenInput=document.getElementById('tmGithubToken');tokenInput.value=sessionStorage.getItem('tm_github_publish_token')||'';tokenInput.addEventListener('input',()=>{if(tokenInput.value)sessionStorage.setItem('tm_github_publish_token',tokenInput.value);else sessionStorage.removeItem('tm_github_publish_token')});document.getElementById('tmClearGithubToken').onclick=()=>{tokenInput.value='';sessionStorage.removeItem('tm_github_publish_token')};
      const activate=()=>{nav.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));tab.classList.add('active');panel.classList.add('active');load();};
      tab.addEventListener('click',activate);document.getElementById('tmRefreshSubmissions').onclick=load;
      async function load(){const list=document.getElementById('tmSubmissionsList');try{const snap=await cloud().database.ref('gameSubmissions').once('value'),items=Object.entries(snap.val()||{}).map(([id,x])=>({...x,id})).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));const pending=items.filter(x=>x.status==='pending').length;document.getElementById('tmPendingCount').textContent=pending;list.innerHTML=items.length?items.map(x=>{const st=x.status||'pending';return `<article class="tm-submission"><div class="tm-submission-head"><div><h3>${esc(x.name||'Juego sin nombre')}</h3><div>👤 ${esc(x.authorName||'Usuario')} · ${esc(x.authorEmail||'')}</div></div><span class="tm-status ${esc(st)}">${esc(st.toUpperCase())}</span></div><p>${esc(x.description||'Sin descripción')}</p><small>Categoría: ${esc(x.category||'otros')} · Archivo: ${esc(x.zipName||'juego.zip')} · ${Math.round(Number(x.zipBytes||0)/1024/1024*10)/10} MB</small>${x.coverBase64?`<div style="margin-top:10px"><img src="data:${esc(x.coverMime||'image/jpeg')};base64,${esc(x.coverBase64)}" alt="Portada" style="width:90px;height:60px;object-fit:cover;border-radius:8px"></div>`:''}<div class="tm-sub-actions">${x.zipBase64?`<button data-download="${esc(x.id)}">⬇️ Descargar ZIP</button>`:''}${st==='pending'?`<button class="ok" data-approve="${esc(x.id)}">✅ Aprobar</button><button class="danger" data-reject="${esc(x.id)}">❌ Rechazar</button>`:''}${st==='approved'?`<button class="ok" data-publish="${esc(x.id)}">🚀 Publicar en GitHub</button>`:''}${x.publishedUrl?`<a href="${esc(x.publishedUrl)}" target="_blank" rel="noopener">🌐 Ver juego</a>`:''}</div></article>`}).join(''):'No hay solicitudes todavía.';
          list.querySelectorAll('[data-approve]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Aprobar este juego? Después podrás publicarlo en GitHub.'))return;await updateStatus(b.dataset.approve,'approved');});
          list.querySelectorAll('[data-reject]').forEach(b=>b.onclick=async()=>{const reason=prompt('Motivo del rechazo:','No cumple los requisitos de publicación.');if(reason===null)return;await updateStatus(b.dataset.reject,'rejected',reason);});
          list.querySelectorAll('[data-download]').forEach(b=>b.onclick=()=>{const item=items.find(x=>x.id===b.dataset.download);if(!item)return;const blob=base64ToBlob(item.zipBase64,'application/zip'),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=item.zipName||'juego.zip';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)});
          list.querySelectorAll('[data-publish]').forEach(b=>b.onclick=async()=>{const item=items.find(x=>x.id===b.dataset.publish);if(!item)return;const token=tokenInput.value.trim();if(!token){alert('Introduce primero el GitHub token.');tokenInput.focus();return}b.disabled=true;b.textContent='⏳ Publicando…';try{const result=await publishToGitHub(item,token);await cloud().database.ref('gameSubmissions/'+item.id).update({status:'published',publishedUrl:result.url,publishedImageUrl:result.imageUrl||'',publishedPath:'games/'+result.folder,reviewedAt:cloud().serverTimestamp,publishedAt:cloud().serverTimestamp,publishedBy:cloud().auth.currentUser?.uid||''});await cloud().database.ref('publishedGames/'+item.id).set({name:item.name,desc:item.description,url:result.url,imageUrl:result.imageUrl||'',icon:'🎮',category:item.category||'otros',deviceCompatibility:'both',evento:null,authorName:item.authorName||'Usuario',submissionId:item.id,publishedAt:cloud().serverTimestamp});if(typeof window.logAction==='function')window.logAction('publish_game',item.id,result.url);alert('✅ Juego publicado en GitHub.');await load();}catch(e){console.error(e);await cloud().database.ref('gameSubmissions/'+item.id).update({status:'publish_error',publishError:String(e.message||e)});alert('❌ No se pudo publicar: '+(e.message||e));b.disabled=false;b.textContent='🚀 Publicar en GitHub';}});
        }catch(e){list.innerHTML='<span style="color:#ff8aa2">❌ '+esc(e.message)+'</span>'}}
      async function updateStatus(id,status,reason=''){try{const u=cloud().auth.currentUser;await cloud().database.ref('gameSubmissions/'+id).update({status,reviewedBy:u?.uid||'',reviewedByEmail:u?.email||'',reviewedAt:cloud().serverTimestamp,reviewReason:reason||null});if(window.logAction)window.logAction('game_submission_'+status,id,reason||'');await load();}catch(e){alert('No se pudo actualizar: '+e.message)}}
      load();
    };wait();
  }

  function start(){injectUploadButton();setupUploadPage();setupAdminSubmissions();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
