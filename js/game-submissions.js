/* TecnoMath · sistema de envío y aprobación de juegos */
(function(){
  'use strict';
  const ADMINS=['delahozbarcelojunior@gmail.com','nicolenatera26@gmail.com','mateobarbosamatos@gmail.com','jandresvf23@gmail.com'];
  const MAX_ZIP=20*1024*1024;
  const EMAILJS={serviceId:'',templateId:'',publicKey:''};
  const cloud=()=>window.TecnomathFirebase||{auth:firebase.auth(),database:firebase.database(),serverTimestamp:firebase.database.ServerValue.TIMESTAMP};
  const isAdmin=u=>!!u&&ADMINS.includes(String(u.email||'').trim().toLowerCase());
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const pageRoot=()=>location.pathname.includes('/pages/')?'':'../';

  function addStyles(){if(document.getElementById('tm-game-submit-style'))return;const s=document.createElement('style');s.id='tm-game-submit-style';s.textContent=`.tm-upload-btn{border-color:#39ff14!important;color:#39ff14!important;background:transparent!important}.tm-upload-btn:hover{background:rgba(57,255,20,.12)!important;box-shadow:0 0 12px rgba(57,255,20,.35)}.tm-submissions-grid{display:grid;gap:12px}.tm-submission{background:#0d0d1a;border:1px solid #25253c;border-radius:12px;padding:15px}.tm-submission-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.tm-submission h3{margin:0 0 7px}.tm-submission p{color:#aaa;font-size:13px;line-height:1.5}.tm-status{display:inline-block;padding:5px 8px;border-radius:999px;font-size:10px;background:#222;color:#fff}.tm-status.pending{color:#ffe600;border:1px solid #ffe600}.tm-status.approved{color:#39ff14;border:1px solid #39ff14}.tm-status.rejected,.tm-status.publish_error{color:#ff6b81;border:1px solid #ff6b81}.tm-status.published{color:#00ffff;border:1px solid #00ffff}.tm-sub-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.tm-sub-actions button,.tm-sub-actions a{border:1px solid #33334d;background:#17172a;color:#fff;border-radius:8px;padding:8px 10px;text-decoration:none;cursor:pointer}.tm-sub-actions .ok{border-color:#39ff14;color:#39ff14}.tm-sub-actions .danger{border-color:#ff416c;color:#ff8aa2}.tm-count{display:inline-block;margin-left:7px;padding:2px 7px;border-radius:10px;background:#ff416c;color:#fff;font-size:9px}`;document.head.appendChild(s)}

  function injectUploadButton(){
    if(/\/pages\/admin\//.test(location.pathname)||/\/pages\/upload-game\.html$/.test(location.pathname))return;
    const nav=document.querySelector('.user-area');if(!nav||document.getElementById('tmUploadGameBtn'))return;
    const a=document.createElement('a');a.id='tmUploadGameBtn';a.className='auth-link tm-upload-btn';a.href=(location.pathname.includes('/pages/')?'upload-game.html':'pages/upload-game.html');a.textContent='🎮 SUBIR JUEGO';a.title='Enviar un juego para revisión';nav.appendChild(a);addStyles();
  }

  async function sendAdminEmails(data){
    if(!EMAILJS.serviceId||!EMAILJS.templateId||!EMAILJS.publicKey){
      try{await cloud().database.ref('gameSubmissions/'+data.id).update({emailStatus:'not_configured'});}catch(_){ }
      return false;
    }
    for(const email of ADMINS){
      try{
        await fetch('https://api.emailjs.com/api/v1.0/email/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service_id:EMAILJS.serviceId,template_id:EMAILJS.templateId,user_id:EMAILJS.publicKey,template_params:{to_email:email,game_name:data.name,author_name:data.authorName,author_email:data.authorEmail,description:data.description,submission_id:data.id,dashboard_url:new URL('admin/index.html',location.origin+'/pages/').href}})});
      }catch(e){console.warn('EmailJS:',e)}
      await new Promise(r=>setTimeout(r,1100));
    }
    try{await cloud().database.ref('gameSubmissions/'+data.id).update({emailStatus:'sent'});}catch(_){ }
    return true;
  }

  function setupUploadPage(){
    if(!/\/pages\/upload-game\.html$/.test(location.pathname))return;
    addStyles();const c=cloud(),form=document.getElementById('gameUploadForm'),status=document.getElementById('uploadStatus'),userBox=document.getElementById('uploadUser'),submit=document.getElementById('submitGame');if(!form)return;
    let currentUser=null;
    c.auth.onAuthStateChanged(u=>{currentUser=u||null;if(!u){userBox.innerHTML='🔒 Debes iniciar sesión para subir un juego. <a href="auth.html" style="color:#00ffff">Iniciar sesión</a>';submit.disabled=true;}else{userBox.innerHTML=`👤 Enviando como <strong>${esc(u.displayName||u.email||'usuario')}</strong> · ${esc(u.email||'')}`;submit.disabled=false;}});
    const show=(msg,type)=>{status.textContent=msg;status.className='status show '+type};
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(!currentUser){show('Debes iniciar sesión antes de enviar el juego.','error');return;}
      const zip=document.getElementById('gameZip').files[0],cover=document.getElementById('gameCover').files[0];
      if(!zip||!zip.name.toLowerCase().endsWith('.zip')){show('Selecciona un archivo .zip.','error');return}
      if(zip.size>MAX_ZIP){show('El ZIP supera el límite de 20 MB.','error');return}
      if(cover&&cover.size>4*1024*1024){show('La portada supera 4 MB.','error');return}
      submit.disabled=true;submit.textContent='⏳ SUBIENDO…';
      try{
        const ref=c.database.ref('gameSubmissions').push(),id=ref.key,storage=firebase.storage(),base=`gameSubmissions/${currentUser.uid}/${id}`;
        const zipSnap=await storage.ref(base+'/game.zip').put(zip,{contentType:'application/zip'});let coverUrl='';
        if(cover){const snap=await storage.ref(base+'/cover'+(cover.type==='image/png'?'.png':cover.type==='image/webp'?'.webp':'.jpg')).put(cover,{contentType:cover.type});coverUrl=await snap.ref.getDownloadURL();}
        const name=document.getElementById('gameName').value.trim(),description=document.getElementById('gameDescription').value.trim(),category=document.getElementById('gameCategory').value;
        const data={name,description,category,authorUid:currentUser.uid,authorName:currentUser.displayName||currentUser.email?.split('@')[0]||'Usuario',authorEmail:currentUser.email||'',status:'pending',storagePath:zipSnap.ref.fullPath,coverUrl,createdAt:c.serverTimestamp};
        await ref.set(data);data.id=id;await sendAdminEmails(data);form.reset();show('✅ Juego enviado correctamente. Los administradores recibirán la solicitud y deberán aprobarla antes de publicarlo.','ok');
      }catch(err){console.error(err);show('❌ No se pudo enviar el juego: '+(err.message||err),'error');submit.disabled=false;submit.textContent='🚀 ENVIAR PARA REVISIÓN';return}
      submit.disabled=false;submit.textContent='🚀 ENVIAR PARA REVISIÓN';
    });
  }

  function setupAdminSubmissions(){
    if(!/\/pages\/admin\/index\.html$/.test(location.pathname))return;
    addStyles();
    const wait=()=>{const nav=document.querySelector('.admin-tabs'),main=document.querySelector('main');if(!nav||!main){setTimeout(wait,150);return}if(document.getElementById('tm-game-submissions-tab'))return;
      const tab=document.createElement('button');tab.className='tab';tab.id='tm-game-submissions-tab';tab.dataset.tab='game-submissions';tab.innerHTML='🎮 Juegos enviados <span id="tmPendingCount" class="tm-count">0</span>';nav.appendChild(tab);
      const panel=document.createElement('section');panel.className='tab-panel';panel.id='tab-game-submissions';panel.innerHTML='<section class="panel"><div class="panel-head"><div><h2>🎮 Juegos enviados</h2><p>Revisa y autoriza los juegos enviados por usuarios. La publicación final en <code>games/</code> se realiza mediante el proceso seguro de backend.</p></div><button id="tmRefreshSubmissions">↻ Actualizar</button></div><div id="tmSubmissionsList" class="tm-submissions-grid">Cargando…</div></section>';main.appendChild(panel);
      const activate=()=>{nav.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));tab.classList.add('active');panel.classList.add('active');load();};
      tab.addEventListener('click',activate);document.getElementById('tmRefreshSubmissions').onclick=load;
      async function load(){const list=document.getElementById('tmSubmissionsList');try{const snap=await cloud().database.ref('gameSubmissions').once('value'),items=Object.entries(snap.val()||{}).map(([id,x])=>({...x,id})).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));const pending=items.filter(x=>x.status==='pending').length;document.getElementById('tmPendingCount').textContent=pending;list.innerHTML=items.length?items.map(x=>{const st=x.status||'pending';return `<article class="tm-submission"><div class="tm-submission-head"><div><h3>${esc(x.name||'Juego sin nombre')}</h3><div>👤 ${esc(x.authorName||'Usuario')} · ${esc(x.authorEmail||'')}</div></div><span class="tm-status ${esc(st)}">${esc(st.toUpperCase())}</span></div><p>${esc(x.description||'Sin descripción')}</p><small>Categoría: ${esc(x.category||'otros')} · ID: ${esc(x.id)}</small>${x.coverUrl?`<div style="margin-top:10px"><img src="${esc(x.coverUrl)}" alt="Portada" style="width:90px;height:60px;object-fit:cover;border-radius:8px"></div>`:''}<div class="tm-sub-actions">${x.storagePath?`<button data-download="${esc(x.storagePath)}">⬇️ Descargar ZIP</button>`:''}${st==='pending'?`<button class="ok" data-approve="${esc(x.id)}">✅ Aprobar</button><button class="danger" data-reject="${esc(x.id)}">❌ Rechazar</button>`:''}${x.publishedUrl?`<a href="${esc(x.publishedUrl)}" target="_blank" rel="noopener">🌐 Ver juego</a>`:''}</div></article>`}).join(''):'No hay solicitudes todavía.';
          list.querySelectorAll('[data-approve]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Aprobar este juego para publicación?'))return;await updateStatus(b.dataset.approve,'approved');});
          list.querySelectorAll('[data-reject]').forEach(b=>b.onclick=async()=>{const reason=prompt('Motivo del rechazo:','No cumple los requisitos de publicación.');if(reason===null)return;await updateStatus(b.dataset.reject,'rejected',reason);});
          list.querySelectorAll('[data-download]').forEach(b=>b.onclick=async()=>{try{const url=await firebase.storage().ref(b.dataset.download).getDownloadURL();window.open(url,'_blank','noopener')}catch(e){alert('No se pudo obtener el archivo: '+e.message)}});
        }catch(e){list.innerHTML='<span style="color:#ff8aa2">❌ '+esc(e.message)+'</span>'}}
      async function updateStatus(id,status,reason=''){try{const u=cloud().auth.currentUser;await cloud().database.ref('gameSubmissions/'+id).update({status,reviewedBy:u?.uid||'',reviewedByEmail:u?.email||'',reviewedAt:cloud().serverTimestamp,reviewReason:reason||null});if(window.adminProfile&&typeof window.logAction==='function')window.logAction('game_submission_'+status,id,reason||'');await load();}catch(e){alert('No se pudo actualizar: '+e.message)}}
      load();
    };wait();
  }

  function start(){injectUploadButton();setupUploadPage();setupAdminSubmissions();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
