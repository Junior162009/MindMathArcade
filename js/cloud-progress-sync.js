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
      lastSignature=sig(local());ready=true;status(keys.length?'saved':'ready',keys.length?'Progreso restaurado':'Listo para guardar');
    }catch(e){console.warn('TecnoMath: no se pudo restaurar el progreso desde Firebase.',e);ready=true;status('offline','Sin conexión; usando guardado local');}
    finally{restoring=false;}
  }

  function start(user){
    if(!user){uid=null;ready=false;lastSignature='';status('signed-out','Sin cuenta conectada');return;}
    if(uid===user.uid&&ready)return;
    uid=user.uid;ready=false;restore().then(function(){ready=true;push(false);});
  }
  function flush(){if(uid&&ready&&!restoring&&!syncing)push(true);}
  function init(){
    var s=services();if(!s){status('waiting','Esperando Firebase…');setTimeout(init,300);return;}
    status('waiting','Esperando cuenta…');s.auth.onAuthStateChanged(start);
    timer=setInterval(function(){if(uid&&ready&&!restoring&&!syncing)push(false);},5000);
    window.addEventListener('pagehide',flush);window.addEventListener('beforeunload',flush);
    window.TecnomathCloudSync={sync:function(){return push(true);},restore:restore,getGameId:function(){return gameId;},getStatus:function(){return window.TecnomathCloudSyncStatus||'unknown';}};
  }
  window.TecnomathCloudSync={getGameId:function(){return gameId;}};init();
})();
