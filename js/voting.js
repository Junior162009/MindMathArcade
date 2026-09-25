(function(){'use strict';
const CATALOG_URL='../data/games.json';
const EXCLUDED_VOTING_GAMES=new Set(["Eco Recolector","MathSolve","MathSolve 2","Tower Game","2048","Pacman","Run 3","Tower Building","Tappy Tower","Stickman Archer","2048 Merge","Endless Car Race","Hexagon Fall","Rocket Pult","Cookie Clicker","Quiz: Reseña Crítica","TecnoMath Aula"]);
const $=id=>document.getElementById(id);
const state={db:null,games:[],counts:new Map(),grades:[],students:[],channel:null,ignoredBroadcastIds:new Set(),selectedGame:null};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gid=g=>String(g.url||g.name||'').trim();
const money=n=>Number(n||0).toLocaleString('es-CO');
const live=(k,t)=>{$('liveStatus').className='live-badge '+(k||'');$('liveStatus').innerHTML='<i></i> '+esc(t)};
const toast=(a,b)=>{const d=document.createElement('div');d.className='toast';d.innerHTML='<strong>'+esc(a)+'</strong><span>'+esc(b)+'</span>';$('toastRegion').appendChild(d);setTimeout(()=>d.remove(),4200)};
function sorted(){return state.games.map(g=>({...g,id:gid(g),votes:Number(state.counts.get(gid(g))||0)})).sort((a,b)=>b.votes-a.votes||a.name.localeCompare(b.name,'es'))}
function renderStats(rows){const total=rows.reduce((s,g)=>s+g.votes,0);$('totalGames').textContent=money(rows.length);$('totalVotes').textContent=money(total);$('leaderName').textContent=rows[0]?.name||'—';$('averageVotes').textContent=money(rows.length?Math.round(total/rows.length):0)}
function renderGames(){const q=$('search').value.trim().toLowerCase(),cat=$('categoryFilter').value,all=sorted(),max=Math.max(1,...all.map(g=>g.votes)),rows=all.filter(g=>(!q||String(g.name+' '+(g.desc||'')+' '+(g.category||'')).toLowerCase().includes(q))&&(cat==='all'||g.category===cat));if(!rows.length){$('gamesGrid').innerHTML='<div class="empty">No encontramos juegos con esos filtros.</div>';return}$('gamesGrid').innerHTML=rows.map(g=>{const pos=all.findIndex(x=>x.id===g.id)+1,pct=Math.round(g.votes/max*100),img=g.imageUrl?'<img src="../'+esc(g.imageUrl.replace(/^\.\//,''))+'" alt="Imagen de '+esc(g.name)+'" loading="lazy" onerror="this.style.display=\'none\'">':'<span class="game-fallback">'+esc(g.icon||'🎮')+'</span>';return '<article class="game-card top'+(pos<=3?pos:'0')+'"><div class="game-thumb">'+img+'</div><h3 class="game-title">'+esc(g.name)+'</h3><p class="game-desc">'+esc(g.desc||g.description||'Juego educativo de TecnoMath.')+'</p><div class="meta-line"><span>❤️ '+money(g.votes)+' votos</span><span>'+pct+'%</span></div><div class="bar"><span style="width:'+pct+'%"></span></div><div class="card-actions"><button class="vote-btn" data-vote="'+esc(g.id)+'">❤️ VOTAR</button><a class="play-btn" href="'+esc(g.url)+'">🎮 JUGAR</a></div></article>'}).join('')}
async function loadCatalog(){const r=await fetch(CATALOG_URL+'?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('No se pudo cargar el catálogo ('+r.status+').');const data=await r.json();if(!Array.isArray(data))throw Error('Catálogo inválido.');state.games=data.filter(g=>g&&g.name&&g.url&&!EXCLUDED_VOTING_GAMES.has(String(g.name).trim())&&(!g.evento||String(g.evento).trim().toLowerCase()==='null'));const cats=[...new Set(state.games.map(g=>g.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));$('categoryFilter').innerHTML='<option value="all">Todas las categorías</option>'+cats.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('')}
async function loadCounts(){const r=await state.db.from('game_vote_counts').select('game_id,votes');if(r.error)throw r.error;state.counts=new Map((r.data||[]).map(x=>[String(x.game_id),Number(x.votes||0)]))}
async function loadGrades(){const r=await state.db.from('tecnomath_voting_grades').select('id,grade,group_name,label').eq('active',true).order('grade').order('group_name');if(r.error)throw r.error;state.grades=r.data||[];const select=$('voterGrade');select.innerHTML='<option value="">Selecciona tu grado</option>'+state.grades.map(g=>'<option value="'+esc(g.id)+'">'+esc(g.label)+'</option>').join('');select.addEventListener('change',()=>loadStudents(select.value));} async function loadStudents(gradeId){const select=$('voterStudent');state.students=[];select.disabled=true;select.innerHTML='<option value="">Cargando estudiantes…</option>';if(!gradeId){select.innerHTML='<option value="">Primero selecciona tu grado</option>';return}const r=await state.db.from('tecnomath_voting_students').select('id,full_name').eq('grade_id',gradeId).eq('active',true).order('full_name');if(r.error)throw r.error;state.students=r.data||[];select.innerHTML='<option value="">Selecciona tu nombre</option>'+state.students.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.full_name)+'</option>').join('');select.disabled=state.students.length===0;if(!state.students.length)select.innerHTML='<option value="">No hay estudiantes cargados para este grado</option>'}
async function refreshView(){const rows=sorted();renderStats(rows);renderGames()}
function openVote(id){const g=state.games.find(x=>gid(x)===id);if(!g)return;state.selectedGame=g;$('voteGameName').textContent=g.name;$('voterGrade').value='';$('voterStudent').innerHTML='<option value="">Primero selecciona tu grado</option>';$('voterStudent').disabled=true;$('voteModal').classList.add('open');$('voterGrade').focus()}
function closeVote(){$('voteModal').classList.remove('open');state.selectedGame=null}
async function submitVote(){const b=$('confirmVoteBtn'),gradeId=$('voterGrade').value,studentId=$('voterStudent').value;if(!state.selectedGame)return;if(!gradeId){toast('⚠️ Falta el grado','Selecciona tu grado.');return}if(!studentId){toast('⚠️ Falta el estudiante','Selecciona tu nombre de la lista.');$('voterStudent').focus();return}const student=state.students.find(s=>String(s.id)===String(studentId));if(!student){toast('⚠️ Estudiante inválido','Vuelve a seleccionar tu nombre.');return}const name=student.full_name;b.disabled=true;b.textContent='REGISTRANDO…';try{const r=await state.db.functions.invoke('submit-game-vote',{body:{voter_name:name,grade_id:gradeId,student_id:studentId,game_id:gid(state.selectedGame)}});if(r.error){let msg=r.error.message||'No se pudo registrar el voto.';if(r.data?.error)msg=r.data.error;if(r.status===409||r.data?.duplicate){toast('ℹ️ Voto ya registrado',msg);return}throw Error(msg)}if(!r.data?.ok)throw Error(r.data?.error||'No se pudo registrar el voto.');if(r.data.vote?.id!=null)state.ignoredBroadcastIds.add(String(r.data.vote.id));await loadCounts();await refreshView();closeVote();toast('❤️ Voto registrado','El ranking se actualizará automáticamente.')}catch(e){console.error('TecnoMath voting:',e);toast('⚠️ No se pudo registrar',e.message||'Inténtalo nuevamente.')}finally{b.disabled=false;b.textContent='REGISTRAR VOTO'}}
async function subscribe(){if(state.channel)await state.db.removeChannel(state.channel);state.channel=state.db.channel('tecnomath-voting').on('broadcast',{event:'VOTE'},async p=>{const voteId=String(p?.payload?.vote_id||'');const id=String(p?.payload?.game_id||'');if(!id)return;if(voteId&&state.ignoredBroadcastIds.has(voteId)){state.ignoredBroadcastIds.delete(voteId);return}try{await loadCounts();await refreshView()}catch(e){console.error('TecnoMath voting realtime refresh:',e)}}).subscribe(s=>{if(s==='SUBSCRIBED')live('','VOTACIONES EN VIVO');else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(s))live('warn','RECONECTANDO…')})}
function bind(){$('search').addEventListener('input',renderGames);$('categoryFilter').addEventListener('change',renderGames);$('refreshBtn').addEventListener('click',async()=>{try{await loadCounts();await refreshView();toast('↻ Actualizado','Datos sincronizados con Supabase.')}catch(e){console.error(e);toast('⚠️ Error','No pudimos actualizar las votaciones.')}});$('gamesGrid').addEventListener('click',e=>{const b=e.target.closest('[data-vote]');if(b)openVote(b.dataset.vote)});$('cancelVoteBtn').onclick=closeVote;$('confirmVoteBtn').onclick=submitVote;$('voteModal').addEventListener('click',e=>{if(e.target.id==='voteModal')closeVote()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeVote()});window.addEventListener('beforeunload',()=>state.channel&&state.db.removeChannel(state.channel))}
async function createVotingClient(){
  if(!window.supabase?.createClient){
    await new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/dist/umd/supabase.min.js';
      s.onload=resolve;
      s.onerror=()=>reject(new Error('No se pudo cargar la biblioteca de Supabase.'));
      document.head.appendChild(s);
    });
  }
  return window.supabase.createClient('https://xdszveoxdrdnwwzzvkav.supabase.co','sb_publishable_xwUE0aN1g0rb7aOLyXPAsA_kOAX9bOA',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
async function boot(){
  try{
    live('warn','CONECTANDO…');
    await loadCatalog();
    state.db=await createVotingClient();
    await loadGrades();
    await loadCounts();
    bind();
    await refreshView();
    await subscribe();
  }catch(e){
    console.error('TecnoMath voting boot:',e);
    const detail=e?.message||String(e);
    live('error','ERROR DE CONEXIÓN');
    $('gamesGrid').innerHTML='<div class="empty">⚠️ No pudimos conectar con el sistema de votaciones.<br><small>'+esc(detail)+'</small><br><button class="ghost-btn" onclick="location.reload()">Reintentar</button></div>';
  }
}
boot();})();