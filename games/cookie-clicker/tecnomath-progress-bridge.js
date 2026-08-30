/* TecnoMath ↔ Cookie Clicker bridge.
 * Importa el guardado EXISTENTE de Cookie Clicker al UID autenticado.
 * Nunca convierte clics en XP, monedas, aciertos ni partidas educativas.
 * Nunca reemplaza ni borra el guardado original de Cookie Clicker.
 */
(function(){
  'use strict';
  let lastSignature='';
  function services(){return window.TecnomathFirebase&&window.TecnomathFirebase.auth&&window.TecnomathFirebase.database?window.TecnomathFirebase:null}
  function user(){const s=services();return s&&s.auth.currentUser?s.auth.currentUser:null}
  function getSave(){try{return localStorage.getItem('CookieClickerGame')||''}catch(e){return ''}}
  function decode(raw){if(!raw)return '';try{return typeof Base64!=='undefined'&&Base64.decode?Base64.decode(raw):raw}catch(e){}try{return atob(raw)}catch(e){return raw}}
  function signature(raw){return [raw.length,raw.slice(0,32),raw.slice(-32)].join('|')}
  function metrics(text){const pick=re=>{const m=text.match(re);return m?Number(m[1])||0:0};return{cookies:pick(/cookies=(\d+(?:\.\d+)?)/i),totalCookies:pick(/totalCookies=(\d+(?:\.\d+)?)/i),buildings:pick(/buildings=(\d+)/i),upgrades:pick(/upgrades=(\d+)/i),achievements:pick(/achievements=(\d+)/i)}}
  async function migrate(){const s=services(),u=user(),raw=getSave();if(!s||!u||!raw)return;const sig=signature(raw);if(sig===lastSignature)return;const ref=s.database.ref('userProgress/'+u.uid+'/games/cookie-clicker');const old=await ref.once('value'),current=old.val()||{},text=decode(raw),m=metrics(text);await ref.update({gameId:'cookie-clicker',name:'Cookie Clicker',save:raw,saveLength:raw.length,metrics:m,importedFromLocal:true,migratedAt:current.migratedAt||s.serverTimestamp,lastSyncedAt:s.serverTimestamp});lastSignature=sig;window.dispatchEvent(new CustomEvent('tecnomath:cookie-progress-synced',{detail:{uid:u.uid,metrics:m}}))}
  function wait(){if(services()&&user())migrate().catch(e=>console.warn('[TecnoMath] Cookie Clicker: no se pudo migrar el progreso.',e));else setTimeout(wait,1000)}
  wait();setInterval(()=>{if(user())migrate().catch(()=>{})},30000);
})();
