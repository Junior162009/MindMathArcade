/* TecnoMath Admin — Supabase único sistema oficial */
(function () {
  'use strict';
  const SUPABASE_URL = 'https://xdszveoxdrdnwwzzvkav.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_xwUE0aN1g0rb7aOLyXPAsA_kOAX9bOA';
  let db = null;
  let users = [];
  let progress = [];

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const date = v => v ? new Date(v).toLocaleString('es-CO', {dateStyle:'short', timeStyle:'short'}) : '—';
  const json = v => { try { return JSON.parse(v || '{}'); } catch (_) { return {}; } };
  function msg(text, type='ok') { const e=$('message'); if(e){e.textContent=text;e.className='message '+type;} }

  async function client() {
    if (window.TecnomathAuth?.getClient) {
      db = await window.TecnomathAuth.getClient();
      return db;
    }
    if (db) return db;
    if (!window.supabase?.createClient) throw new Error('Supabase todavía no está listo.');
    db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce'}});
    return db;
  }

  async function ensureAdmin(){
    const c=await client();
    let {data:{user}}=await c.auth.getUser();
    // La sesión puede tardar unos milisegundos en recuperarse al cambiar de página.
    if(!user){
      await new Promise(r=>setTimeout(r,500));
      ({data:{user}}=await c.auth.getUser());
    }
    if(!user) throw new Error('Debes iniciar sesión.');
    const {data:p,error}=await c.from('tecnomath_profiles').select('id,username,role').eq('id',user.id).maybeSingle();
    if(error) throw error;
    const allow=['delahozbarcelojunior@gmail.com','nicolenatera26@gmail.com','mateobarbosamatos@gmail.com','jandresvf23@gmail.com'];
    if(p?.role!=='admin' && !allow.includes(String(user.email||'').toLowerCase())) throw new Error('No tienes permisos de administrador.');
    return {user,profile:p};
  }
  async function rpc(name,args={}) { const c=await client(); const {data,error}=await c.rpc(name,args); if(error) throw error; return data; }
  async function loadUsers(){ users=await rpc('tecnomath_admin_list_users'); renderUsers(); stats(); }
  async function loadProgress(){ progress=await rpc('tecnomath_admin_list_progress',{p_limit:1000,p_offset:0}); renderProgress(); stats(); }
  async function loadLogs(){ const rows=await rpc('tecnomath_admin_list_logs',{p_limit:100}); $('logs').innerHTML=rows.length?rows.map(x=>`<div class="log"><strong>${esc(x.action)}</strong><span>${esc(x.admin_username||'Admin')} · ${date(x.created_at)}</span><small>${esc(JSON.stringify(x.details||{}))}</small></div>`).join(''):'<div class="log">No hay actividad todavía.</div>'; $('statLogs').textContent=rows.length; }
  async function loadSettings(){ const c=await client(); const {data,error}=await c.from('tecnomath_settings').select('key,value,updated_at').in('key',['theme','event']); if(error) throw error; const map=Object.fromEntries((data||[]).map(x=>[x.key,x])); const ev=map.event?.value||{}; $('eventTitle').value=ev.title||''; $('eventDescription').value=ev.description||''; $('eventImage').value=ev.image||ev.imageUrl||''; $('eventLink').value=ev.link||''; $('eventActive').value=String(ev.active!==false); }
  function stats(){ $('statUsers').textContent=users.length; $('statAdmins').textContent=users.filter(x=>x.role==='admin').length; $('statGames').textContent=new Set(progress.map(x=>x.game_id)).size; }
  function renderUsers(){ const q=($('search').value||'').toLowerCase(), role=$('roleFilter').value; const rows=users.filter(x=>(!q||`${x.username||''} ${x.email||''}`.toLowerCase().includes(q))&&(role==='all'||x.role===role)); $('usersBody').innerHTML=rows.length?rows.map(x=>`<tr><td><strong>${esc(x.username||'—')}</strong></td><td>${esc(x.email||'—')}</td><td><span class="badge ${x.role==='admin'?'admin':'user'}">${x.role==='admin'?'ADMIN':'USUARIO'}</span></td><td>${date(x.created_at)}</td><td><button class="mini" data-edit="${x.id}">Editar</button></td></tr>`).join(''):'<tr><td colspan="5">No hay usuarios.</td></tr>'; document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEdit(b.dataset.edit)); }
  function renderProgress(){ const q=($('progressSearch').value||'').toLowerCase(); const rows=progress.filter(x=>!q||`${x.username||''} ${x.game_id||''}`.toLowerCase().includes(q)); $('progressBody').innerHTML=rows.length?rows.map(x=>{const p=json(x.progress);return `<tr><td>${esc(x.username||'—')}</td><td>${esc(x.game_id)}</td><td>${Number(p.sessions||p.games||0)}</td><td>${Number(p.time||p.timePlayed||0)} s</td><td>${date(x.updated_at)}</td></tr>`}).join(''):'<tr><td colspan="5">No hay progreso.</td></tr>'; }
  function openEdit(id){ const u=users.find(x=>x.id===id); if(!u)return; $('editUid').value=u.id; $('editUsername').value=u.username||''; $('editDisplay').value=u.display_name||''; $('editPhone').value=u.phone||''; $('editRole').value=u.role||'user'; $('editDialog').showModal(); }
  async function saveUser(e){ e.preventDefault(); try{await rpc('tecnomath_admin_update_profile',{p_user_id:$('editUid').value,p_username:$('editUsername').value,p_display_name:$('editDisplay').value,p_phone:$('editPhone').value,p_role:$('editRole').value}); $('editDialog').close(); msg('Usuario actualizado.'); await loadUsers();}catch(err){msg(err.message||'No se pudo actualizar.','error');} }
  async function saveEvent(e){e.preventDefault();try{await rpc('tecnomath_admin_save_setting',{p_key:'event',p_value:{title:$('eventTitle').value.trim(),description:$('eventDescription').value.trim(),image:$('eventImage').value.trim(),link:$('eventLink').value.trim(),active:$('eventActive').value==='true'}});msg('Evento guardado en Supabase.');}catch(err){msg(err.message||'No se pudo guardar.','error');}}
  function download(name,data){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  function bind(){
    document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.quick-card').forEach(x=>x.classList.remove('active'));$('tab-'+b.dataset.tab)?.classList.add('active');b.classList.add('active');});
    $('search').oninput=renderUsers; $('roleFilter').onchange=renderUsers; $('progressSearch').oninput=renderProgress;
    $('refresh').onclick=loadUsers; $('refreshProgress').onclick=loadProgress; $('refreshLogs').onclick=loadLogs;
    $('eventForm').onsubmit=saveEvent; $('saveUser').onclick=saveUser;
    $('backupUsers').onclick=()=>download('tecnomath-usuarios.json',users); $('backupProgress').onclick=()=>download('tecnomath-progreso.json',progress); $('backupEvent').onclick=()=>download('tecnomath-evento.json',{title:$('eventTitle').value,description:$('eventDescription').value,image:$('eventImage').value,link:$('eventLink').value,active:$('eventActive').value==='true'}); $('backupAll').onclick=()=>download('tecnomath-respaldo.json',{users,progress,event:{title:$('eventTitle').value,description:$('eventDescription').value,image:$('eventImage').value,link:$('eventLink').value,active:$('eventActive').value==='true'}});
    $('logout').onclick=async()=>{try{await (window.TecnomathAuth?.signOut ? window.TecnomathAuth.signOut() : (await client()).auth.signOut({scope:'local'}));}finally{location.href='../../pages/auth.html';}};
  }
  async function start(){
    try{
      bind();
      const a=await ensureAdmin();
      $('adminName').textContent=a.profile?.username||a.user.email;
      await Promise.all([loadUsers(),loadProgress(),loadLogs(),loadSettings()]);
      msg('Panel Supabase conectado.');
    }catch(e){
      console.error(e);
      msg(e.message||'No autorizado.','error');
      // No cerrar la sesión ni mandar al login inmediatamente: si la sesión está recuperándose,
      // dejamos el mensaje visible para evitar el bucle corona → login → regreso.
    }
  }
  window.TecnoMathAdmin={start};
})();
