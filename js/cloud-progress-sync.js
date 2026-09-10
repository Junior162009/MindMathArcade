// TecnoMath - sincronización cloud por cuenta y por juego.
(function () {
  'use strict';
  if (window.TecnomathCloudSync) return;

  var ROOT='userProgress';
  var LEGACY='localState';
  var META_KEY='__tecnomath_cloud_sync_meta__';
  var EXCLUDED={'tecnomath_session':1,'tecnomath_users':1,'tecnomath_progress_v2':1,'tecnomath_progress_meta_v3':1,'firebaseui::rememberedAccounts':1};
  var uid=null,ready=false,syncing=false,restoring=false,timer=null;
  var gameId=getGameId(),lastSignature='',lastWrite=0;
  var worldUiReady=false,worldFlags={},worldFlagsLoaded=false;

  function getGameId(){
    var m=String(location.pathname||'').match(/\/games\/([^\/]+)/i);
    if(!m)return 'site';
    try{return decodeURIComponent(m[1]).toLowerCase();}catch(_){return m[1].toLowerCase();}
  }
  function services(){return window.firebase&&firebase.auth&&firebase.database?{auth:firebase.auth(),db:firebase.database()}:null;}
  function enc(k){try{return btoa(unescape(encodeURIComponent(k))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');}catch(_){return null;}}
  function dec(k){try{var s=k.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return decodeURIComponent(escape(atob(s)));}catch(_){return null;}}
  function allowed(k){return !!k&&k!==META_KEY&&!EXCLUDED[k]&&k.indexOf('firebase:')!==0&&k.indexOf('firebaseui::')!==0;}
  function local(){var o={};for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(!allowed(k))continue;try{var e=enc(k);if(e)o[e]=localStorage.getItem(k);}catch(_){}}return o;}
  function sig(o){try{return JSON.stringify(o);}catch(_){return '';}}
  function root(){var s=services();return s&&uid?s.db.ref(ROOT+'/'+uid):null;}
  function game(){var r=root();return r?r.child('games').child(gameId):null;}
  function status(state,message){window.TecnomathCloudSyncStatus=state;window.TecnomathCloudSyncMessage=message||'';try{window.dispatchEvent(new CustomEvent('tecnomath:cloud-status',{detail:{state:state,message:message||'',gameId:gameId}}));}catch(_){} }
  function saveMeta(){try{localStorage.setItem(META_KEY,JSON.stringify({version:2,gameId:gameId,lastCloudWrite:lastWrite}));}catch(_){} }

  function migrateWorldMapLocal(){
    if(gameId!=='laura10°')return;
    var current=localStorage.getItem('banderquiz_mundo_beta_v3');
    var old=localStorage.getItem('banderquiz_mundo_beta_v2');
    if(!current&&old){
      try{
        var parsed=JSON.parse(old);
        if(parsed&&typeof parsed==='object'){
          localStorage.setItem('banderquiz_mundo_beta_v3',JSON.stringify(parsed));
          status('ready','Progreso local anterior recuperado');
        }
      }catch(_){ }
    }
  }

  async function push(force,state){
    var r=game();if(!r||syncing||restoring||!ready)return false;
    state=state||local();var s=sig(state);if(!force&&s===lastSignature)return true;
    syncing=true;status('syncing','Sincronizando…');
    try{
      var updates={},keys=Object.keys(state);
      for(var i=0;i<keys.length;i++){updates['state/'+keys[i]+'/value']=state[keys[i]];updates['state/'+keys[i]+'/updatedAt']=firebase.database.ServerValue.TIMESTAMP;}
      updates['meta/updatedAt']=firebase.database.ServerValue.TIMESTAMP;updates['meta/version']=2;updates['meta/gameId']=gameId;
      await r.update(updates);lastSignature=s;lastWrite=Date.now();saveMeta();status('saved','Guardado en la nube');return true;
    }catch(e){console.warn('TecnoMath: no se pudo guardar el progreso en Firebase.',e);status('offline','Guardado local; nube no disponible');return false;}
    finally{syncing=false;}
  }

  async function restore(){
    var r=game();if(!r||restoring)return;
    restoring=true;status('syncing','Cargando progreso…');
    try{
      var cloud=(await r.once('value')).val();
      if(!cloud||!cloud.state){var legacy=(await root().child(LEGACY).once('value')).val()||{};if(Object.keys(legacy).length)cloud={state:legacy,meta:{version:1,legacy:true}};}
      var state=cloud&&cloud.state?cloud.state:{},keys=Object.keys(state);
      for(var i=0;i<keys.length;i++){var e=keys[i],k=dec(e),item=state[e];if(!k||!allowed(k)||!item||!Object.prototype.hasOwnProperty.call(item,'value'))continue;try{localStorage.setItem(k,String(item.value));}catch(_){} }
      migrateWorldMapLocal();
      lastSignature=sig(local());ready=true;status(keys.length?'saved':'ready',keys.length?'Progreso restaurado':'Listo para guardar');
    }catch(e){console.warn('TecnoMath: no se pudo restaurar el progreso desde Firebase.',e);migrateWorldMapLocal();ready=true;status('offline','Sin conexión; usando guardado local');}
    finally{restoring=false;}
  }

  function start(user){
    if(!user){uid=null;ready=false;lastSignature='';status('signed-out','Sin cuenta conectada');return;}
    if(uid===user.uid&&ready)return;
    uid=user.uid;ready=false;restore().then(function(){ready=true;push(false);});
  }
  function flush(){if(uid&&ready&&!restoring&&!syncing)push(true);}

  function worldStyles(){
    if(document.getElementById('tm-world-save-style'))return;
    var s=document.createElement('style');s.id='tm-world-save-style';s.textContent=`
      #tm-world-tools{position:fixed;z-index:25;right:14px;top:86px;display:flex;gap:8px;align-items:center}
      #tm-world-save,#tm-world-list{border:1px solid rgba(255,255,255,.14);background:rgba(13,18,39,.94);color:#fff;border-radius:13px;padding:10px 13px;font-weight:900;cursor:pointer;box-shadow:0 12px 35px rgba(0,0,0,.35);backdrop-filter:blur(12px)}
      #tm-world-save{background:linear-gradient(135deg,#f5c518,#ff8a00);color:#111;border:0}
      #tm-world-save:disabled{opacity:.7;cursor:wait}
      #tm-world-cloud{position:fixed;z-index:25;left:14px;top:86px;background:rgba(13,18,39,.88);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:8px 11px;color:#b9c0d8;font-size:.78rem;font-weight:800;backdrop-filter:blur(12px)}
      #tm-world-panel{position:fixed;z-index:60;inset:0;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.62);backdrop-filter:blur(8px)}
      #tm-world-panel.show{display:flex}
      #tm-world-panel-card{width:min(620px,100%);max-height:min(78vh,720px);overflow:hidden;background:#11172e;border:1px solid rgba(255,255,255,.14);border-radius:24px;box-shadow:0 30px 90px rgba(0,0,0,.65);padding:20px}
      #tm-world-panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
      #tm-world-panel-title{font-size:1.25rem;font-weight:950}
      #tm-world-panel-count{color:#aeb7d0;font-size:.82rem;margin-top:3px}
      #tm-world-panel-close{border:0;background:#252d48;color:#fff;border-radius:11px;padding:9px 12px;font-weight:900;cursor:pointer}
      #tm-world-search{width:100%;border:2px solid #303957;background:#080d20;color:#fff;border-radius:13px;padding:11px 13px;outline:0;margin-bottom:12px}
      #tm-world-search:focus{border-color:#f5c518}
      #tm-world-list-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;overflow:auto;max-height:56vh;padding-right:4px}
      .tm-world-country{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:9px 10px;font-weight:800;min-width:0}
      .tm-world-country-flag{font-size:1.55rem;line-height:1;font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif;flex:0 0 auto}
      .tm-world-country-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #tm-world-empty{text-align:center;color:#aeb7d0;padding:28px 10px;grid-column:1/-1}
      @media(max-width:700px){#tm-world-tools{right:10px;top:112px;left:10px;justify-content:flex-end}#tm-world-save,#tm-world-list{padding:9px 10px;font-size:.78rem}#tm-world-cloud{left:10px;top:112px;max-width:44vw}#tm-world-list-grid{grid-template-columns:1fr 1fr}#tm-world-panel-card{padding:16px}}
      @media(max-width:430px){#tm-world-list-grid{grid-template-columns:1fr}.tm-world-country{padding:8px}}
    `;document.head.appendChild(s);
  }

  function worldName(name){
    try{if(typeof window.spanishName==='function')return window.spanishName(name)}catch(_){}
    return name;
  }

  function findWorldFlag(name){
    var keys=[name,worldName(name)];
    if(name==='United States of America')keys.push('United States');
    if(name==='Congo')keys.push('Republic of the Congo');
    for(var i=0;i<keys.length;i++){
      var e=worldFlags[norm(keys[i])];
      if(e)return e;
    }
    return null;
  }

  function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,"'").replace(/\s+/g,' ').trim();}

  async function loadWorldFlags(){
    if(worldFlagsLoaded)return;
    worldFlagsLoaded=true;
    try{
      var r=await fetch('https://cdn.jsdelivr.net/npm/country-flag-emoji-json@2.0.0/dist/index.json');
      if(!r.ok)throw new Error('flags');
      var list=await r.json();
      for(var i=0;i<(list||[]).length;i++){var e=list[i];if(!e||!e.name)continue;worldFlags[norm(e.name)]=e;if(e.code)worldFlags[norm(e.code)]=e;}
      refreshWorldList();
    }catch(e){console.warn('TecnoMath: no se pudieron cargar las banderas del listado.',e);}
  }

  function getWorldState(){
    try{var s=JSON.parse(localStorage.getItem('banderquiz_mundo_beta_v3')||'{"done":[],"score":0,"streak":0}');return s&&Array.isArray(s.done)?s:{done:[]};}catch(_){return {done:[]};}
  }

  function refreshWorldList(){
    var grid=document.getElementById('tm-world-list-grid'),count=document.getElementById('tm-world-panel-count');
    if(!grid)return;
    var state=getWorldState(),done=state.done.slice().sort(function(a,b){return worldName(a).localeCompare(worldName(b),'es');});
    if(count)count.textContent=done.length+' / 195 países encontrados';
    var q=norm((document.getElementById('tm-world-search')||{}).value||'');
    grid.innerHTML='';
    var shown=0;
    for(var i=0;i<done.length;i++){
      var name=worldName(done[i]);
      if(q&&!norm(name).includes(q))continue;
      var entry=findWorldFlag(done[i]);
      var row=document.createElement('div');row.className='tm-world-country';
      var flag=document.createElement('span');flag.className='tm-world-country-flag';flag.textContent=entry&&entry.emoji?entry.emoji:'🏳️';
      var label=document.createElement('span');label.className='tm-world-country-name';label.textContent=name;
      row.append(flag,label);grid.appendChild(row);shown++;
    }
    if(!shown){var empty=document.createElement('div');empty.id='tm-world-empty';empty.textContent=done.length?'No hay países que coincidan con la búsqueda.':'Todavía no has encontrado países.';grid.appendChild(empty);}
  }

  function worldUi(){
    if(gameId!=='laura10°'||worldUiReady)return;
    worldUiReady=true;worldStyles();
    var tools=document.createElement('div');tools.id='tm-world-tools';
    var saveBtn=document.createElement('button');saveBtn.id='tm-world-save';saveBtn.textContent='☁️ Guardar';
    var listBtn=document.createElement('button');listBtn.id='tm-world-list';listBtn.textContent='🗺️ Mis países';
    tools.append(saveBtn,listBtn);document.body.appendChild(tools);
    var cloud=document.createElement('div');cloud.id='tm-world-cloud';cloud.textContent='☁️ Esperando cuenta…';document.body.appendChild(cloud);
    var panel=document.createElement('div');panel.id='tm-world-panel';panel.innerHTML='<section id="tm-world-panel-card"><div id="tm-world-panel-head"><div><div id="tm-world-panel-title">🌎 Países encontrados</div><div id="tm-world-panel-count">0 / 195 países encontrados</div></div><button id="tm-world-panel-close">Cerrar ✕</button></div><input id="tm-world-search" placeholder="🔎 Buscar un país…" autocomplete="off"><div id="tm-world-list-grid"></div></section>';document.body.appendChild(panel);
    saveBtn.onclick=async function(){
      if(saveBtn.disabled)return;
      saveBtn.disabled=true;saveBtn.textContent='⏳ Guardando…';
      var ok=await push(true);
      saveBtn.textContent=ok?'✓ Guardado':'⚠️ Reintentar';
      setTimeout(function(){saveBtn.disabled=false;saveBtn.textContent='☁️ Guardar'},1600);
      refreshWorldList();
    };
    listBtn.onclick=function(){panel.classList.add('show');refreshWorldList();if(!worldFlagsLoaded)loadWorldFlags();};
    document.getElementById('tm-world-panel-close').onclick=function(){panel.classList.remove('show')};
    panel.addEventListener('click',function(e){if(e.target===panel)panel.classList.remove('show')});
    document.getElementById('tm-world-search').addEventListener('input',refreshWorldList);
    window.addEventListener('keydown',function(e){if(e.key==='Escape')panel.classList.remove('show')});
    window.addEventListener('tecnomath:cloud-status',function(e){
      if(e.detail?.gameId!=='laura10°')return;
      var msg=e.detail.message||'';
      if(e.detail.state==='saved')cloud.textContent='☁️ Guardado en tu cuenta';
      else if(e.detail.state==='syncing')cloud.textContent='☁️ '+msg;
      else if(e.detail.state==='offline')cloud.textContent='📱 '+msg;
      else if(e.detail.state==='signed-out')cloud.textContent='🔐 Inicia sesión en TecnoMath';
      else cloud.textContent='☁️ '+(msg||'Listo para guardar');
      refreshWorldList();
    });
    refreshWorldList();loadWorldFlags();
  }

  function init(){
    var s=services();if(!s){status('waiting','Esperando Firebase…');setTimeout(init,300);return;}
    status('waiting','Esperando cuenta…');s.auth.onAuthStateChanged(start);
    timer=setInterval(function(){if(uid&&ready&&!restoring&&!syncing)push(false);},5000);
    window.addEventListener('pagehide',flush);window.addEventListener('beforeunload',flush);
    window.TecnomathCloudSync={sync:function(){return push(true);},restore:restore,getGameId:function(){return gameId;},getStatus:function(){return window.TecnomathCloudSyncStatus||'unknown';}};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',worldUi);else setTimeout(worldUi,0);
  }
  window.TecnomathCloudSync={getGameId:function(){return gameId;}};init();
})();
