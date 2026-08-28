(() => {
  const $ = id => document.getElementById(id);
  const toast = msg => { const t=$('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(window.__tmToast); window.__tmToast=setTimeout(()=>t.classList.remove('show'),2400); };
  const modal = (id,show=true) => $(id)?.classList.toggle('hidden',!show);
  let user=null, profile={}, posts=[], ranking=[];
  const db = () => window.TecnomathFirebase?.database;
  const auth = () => window.TecnomathFirebase?.auth;
  const initials = name => (name||'TM').trim().slice(0,2).toUpperCase();
  const escapeHtml = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const timeAgo = ts => { if(!ts)return 'Ahora'; const d=Math.max(0,Date.now()-Number(ts)); const m=Math.floor(d/60000); if(m<1)return 'Ahora'; if(m<60)return `Hace ${m} min`; const h=Math.floor(m/60); if(h<24)return `Hace ${h} h`; return `Hace ${Math.floor(h/24)} d`; };

  function setProfile(p={}){
    profile=p||{}; const name=profile.displayName||user?.displayName||'Jugador'; const av=profile.avatar||'🧠';
    ['profileAvatar','composerAvatar','profileTop'].forEach(id=>{const el=$(id);if(el)el.textContent=av;});
    $('profileName').textContent=name; $('helloName').textContent=name.split(' ')[0]; $('profileEmail').textContent=user?.email||'Cuenta TecnoMath';
    $('displayNameInput').value=name; $('avatarInput').value=av;
    $('statPoints').textContent=Number(profile.points||0).toLocaleString('es'); $('statGames').textContent=Number(profile.gamesPlayed||0); $('statFriends').textContent=Number(profile.friendsCount||0); $('streak').textContent=Number(profile.streak||0);
  }
  function requireLogin(){if(!user){modal('loginModal');return false}return true}

  function renderPosts(){
    const box=$('feedList'); let list=posts.slice(); const filter=$('feedFilter').value;
    if(filter==='mine'&&user) list=list.filter(p=>p.uid===user.uid); if(filter==='achievements')list=list.filter(p=>p.tag==='🏆 Logro');
    if(!list.length){box.innerHTML='<div class="loading">Aún no hay publicaciones. ¡Sé el primero en compartir algo! 🚀</div>';return;}
    box.innerHTML=list.map(p=>`<article class="post"><div class="post-head"><button class="avatar">${escapeHtml(p.avatar||initials(p.name))}</button><div class="meta"><b>${escapeHtml(p.name||'Jugador')}</b><small>${escapeHtml(timeAgo(p.createdAt))}</small></div></div><div class="post-body">${p.tag?`<span class="tag">${escapeHtml(p.tag)}</span><br>`:''}${escapeHtml(p.text)}</div><div class="post-actions"><button class="like ${p.likedBy&&user&&p.likedBy[user.uid]?'liked':''}" data-id="${p.id}">❤️ ${Number(p.likes||0)}</button><button data-comment="${p.id}">💬 ${Number(p.commentsCount||0)}</button><button data-share="${p.id}">↗ Compartir</button></div></article>`).join('');
    box.querySelectorAll('.like').forEach(b=>b.onclick=()=>likePost(b.dataset.id));
    box.querySelectorAll('[data-comment]').forEach(b=>b.onclick=()=>toast('💬 Comentarios: próximamente'));
    box.querySelectorAll('[data-share]').forEach(b=>b.onclick=()=>sharePost(b.dataset.id));
  }
  function renderRanking(){const box=$('rankingList'); if(!ranking.length){box.innerHTML='<div class="loading">Sin datos todavía.</div>';return} box.innerHTML=ranking.slice(0,5).map((r,i)=>`<div class="rank"><span class="rank-num">${i+1}</span><button class="avatar">${escapeHtml(r.avatar||initials(r.name))}</button><div class="rank-info"><b>${escapeHtml(r.name||'Jugador')}</b><small>${Number(r.gamesPlayed||0)} juegos</small></div><span class="rank-points">${Number(r.points||0)} ⭐</span></div>`).join('');}

  async function loadProfile(){ if(!user){setProfile({});return} try{const s=await db().ref('users/'+user.uid).once('value');setProfile(s.val()||{});}catch(e){setProfile({});}}
  function subscribePosts(){if(!db())return; db().ref('social/posts').limitToLast(50).on('value',snap=>{const v=snap.val()||{}; posts=Object.entries(v).map(([id,p])=>({id,...p})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));renderPosts();});}
  async function loadRanking(){if(!db())return;try{const s=await db().ref('users').orderByChild('points').limitToLast(8).once('value'); const v=s.val()||{};ranking=Object.values(v).sort((a,b)=>(b.points||0)-(a.points||0));renderRanking();}catch(e){renderRanking();}}
  async function publish(){if(!requireLogin())return; const text=$('postText').value.trim();if(!text){toast('Escribe algo antes de publicar.');return} const btn=$('publishBtn');btn.disabled=true; try{const ref=db().ref('social/posts').push(); await ref.set({uid:user.uid,name:profile.displayName||user.displayName||'Jugador',avatar:profile.avatar||'🧠',text,tag:window.__tmTag||'',likes:0,commentsCount:0,createdAt:window.TecnomathFirebase.serverTimestamp}); $('postText').value='';window.__tmTag='';toast('🎉 Publicación compartida');}catch(e){toast('No se pudo publicar. Revisa tu conexión.')}finally{btn.disabled=false}}
  async function likePost(id){if(!requireLogin())return;const ref=db().ref('social/posts/'+id);try{const s=await ref.once('value'),p=s.val();if(!p)return;const liked=!!(p.likedBy&&p.likedBy[user.uid]);await ref.update({likes:Math.max(0,Number(p.likes||0)+(liked?-1:1)),[`likedBy/${user.uid}`]:liked?null:true});}catch(e){toast('No se pudo actualizar el like.')}}
  async function sharePost(id){const p=posts.find(x=>x.id===id);if(!p)return;const text=`${p.name}: ${p.text}`;try{if(navigator.share)await navigator.share({title:'TecnoMath Social',text});else{await navigator.clipboard.writeText(text);toast('📋 Copiado al portapapeles');}}catch(e){}}
  async function saveProfile(){if(!requireLogin())return;const name=$('displayNameInput').value.trim()||'Jugador';const avatar=$('avatarInput').value.trim()||'🧠';try{await db().ref('users/'+user.uid).update({displayName:name,avatar});profile={...profile,displayName:name,avatar};setProfile(profile);modal('profileModal',false);toast('✅ Perfil actualizado');}catch(e){toast('No se pudo guardar el perfil.')}}

  $('publishBtn').onclick=publish; $('saveProfile').onclick=saveProfile; $('editProfile').onclick=()=>{if(requireLogin())modal('profileModal')}; $('profileTop').onclick=()=>{if(requireLogin())modal('profileModal')}; $('composerAvatar').onclick=()=>{if(requireLogin())modal('profileModal')};
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>modal(b.closest('.modal').id,false));
  document.querySelectorAll('.quick-tags button').forEach(b=>b.onclick=()=>{window.__tmTag=b.dataset.tag;$('postText').focus();toast('Etiqueta seleccionada: '+b.dataset.tag)});
  $('feedFilter').onchange=renderPosts;
  $('bottomCreate').onclick=()=>{if(requireLogin()){$('postText').focus();window.scrollTo({top:150,behavior:'smooth'})}};
  $('searchBtn').onclick=()=>{$('mobileSearch').classList.toggle('open');if($('mobileSearch').classList.contains('open'))$('searchInput').focus()}; $('closeSearch').onclick=()=>{$('mobileSearch').classList.remove('open')};
  $('searchInput').oninput=e=>{const q=e.target.value.toLowerCase().trim();document.querySelectorAll('.post').forEach(p=>p.style.display=!q||p.textContent.toLowerCase().includes(q)?'block':'none')};
  $('menuBtn').onclick=()=>{$('sidebar').classList.toggle('mobile-open')}; $('notifBtn').onclick=()=>toast('🔔 No tienes notificaciones nuevas.'); $('logoutBtn').onclick=()=>auth()?.signOut();
  document.querySelectorAll('.follow').forEach(b=>b.onclick=()=>toast('👥 Las conexiones estarán disponibles pronto.'));

  function start(){
    if(!auth()){setProfile({});renderPosts();return}
    auth().onAuthStateChanged(async u=>{user=u;if(u){await loadProfile();toast('👋 Bienvenido a TecnoMath Social');}else{setProfile({});}loadRanking();});
    subscribePosts();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
