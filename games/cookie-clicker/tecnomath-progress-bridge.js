/* TecnoMath ↔ Cookie Clicker bridge.
 * No modifica la partida original de Cookie Clicker ni reemplaza su guardado.
 * Importa una vez el progreso existente del jugador al perfil autenticado y,
 * después, actualiza métricas globales periódicamente.
 */
(function(){
  'use strict';
  const KEY='tecnomath_cookie_clicker_import_v1';
  let imported=false;
  function central(){return window.TecnoMathProgress&&typeof window.TecnoMathProgress.gameResult==='function'?window.TecnoMathProgress:null}
  function user(){try{return window.TecnomathFirebase&&window.TecnomathFirebase.auth.currentUser}catch(e){return null}}
  function readSave(){
    try{
      // Cookie Clicker guarda el save principal en este localStorage.
      const raw=localStorage.getItem('CookieClickerGame');
      if(!raw)return null;
      return raw;
    }catch(e){return null}
  }
  function parseSave(raw){
    try{
      const text=decodeURIComponent(escape(atob(raw)));
      return text;
    }catch(e){return raw}
  }
  function estimate(text){
    if(!text)return null;
    // No se modifica el save. Solo extraemos métricas seguras de la cadena.
    const cookies=(text.match(/cookies=(\d+(?:\.\d+)?)/i)||[])[1];
    const total=(text.match(/totalCookies=(\d+(?:\.\d+)?)/i)||[])[1];
    const buildings=(text.match(/buildings=(\d+)/i)||[])[1];
    const upgrades=(text.match(/upgrades=(\d+)/i)||[])[1];
    return {cookies:Number(cookies)||0,totalCookies:Number(total)||0,buildings:Number(buildings)||0,upgrades:Number(upgrades)||0};
  }
  async function sync(){
    const c=central(),u=user();
    if(!c||!u)return;
    const raw=readSave();
    if(!raw)return;
    const parsed=parseSave(raw),m=estimate(parsed);
    if(!m)return;
    const first=!localStorage.getItem(KEY);
    const existing=localStorage.getItem(KEY);
    const signature=String(raw.length)+'|'+String(m.totalCookies)+'|'+String(m.buildings)+'|'+String(m.upgrades);
    if(existing===signature&&!first)return;
    // Cookie Clicker no es un juego educativo de respuestas: no inventamos
    // aciertos/errores ni damos XP por clics. Solo registramos que existe una
    // partida y sus métricas como datos del juego.
    await c.record({game:'Cookie Clicker',games:1,topic:'Otros',cookieClicker:{cookies:m.cookies,totalCookies:m.totalCookies,buildings:m.buildings,upgrades:m.upgrades},source:'existing-local-save'});
    localStorage.setItem(KEY,signature);
  }
  function wait(){if(central()&&user())sync().catch(()=>{});else setTimeout(wait,1000)}
  wait();
  // Sincroniza cambios del save cada 30 segundos sin tocar la lógica original.
  setInterval(()=>{if(user())sync().catch(()=>{})},30000);
})();
