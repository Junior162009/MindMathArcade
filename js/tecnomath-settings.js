/* TecnoMath — Configuración global v2 · Supabase */
(function(){
  'use strict';
  const THEMES=['normal','halloween','navidad','verano','mundial','regreso','cumpleanos','feria','feriaplus','primavera','espacio','ciencia','amoramistad'];
  function db(){return window.TecnomathAuth?.getClient?.()||null}
  async function get(){const c=db();if(!c)throw new Error('TecnomathAuth no está disponible');const {data,error}=await c.rpc('tecnomath_get_settings');if(error)throw error;return data||{event:{},theme:'normal'}}
  async function getEvent(){return (await get()).event||{}}
  async function getTheme(){const t=(await get()).theme;return THEMES.includes(String(t))?String(t):'normal'}
  async function set(key,value){const c=db();if(!c)throw new Error('TecnomathAuth no está disponible');const {data,error}=await c.rpc('tecnomath_set_setting',{p_key:key,p_value:value});if(error)throw error;return data}
  async function setEvent(event){return set('event',event||{})}
  async function setTheme(theme){theme=String(theme||'normal').trim().toLowerCase();if(!THEMES.includes(theme))throw new Error('Temática no válida');return set('theme',theme)}
  function subscribeEvents(callback){const c=db();if(!c)throw new Error('TecnomathAuth no está disponible');return c.channel('tecnomath-global-events').on('postgres_changes',{event:'*',schema:'public',table:'tecnomath_settings'},payload=>{if(payload?.new?.key==='event'||payload?.old?.key==='event')callback(payload?.new?.key==='event'?payload.new.value:null)}).subscribe()}
  window.TecnomathSettings={get,getEvent,getTheme,set,setEvent,setTheme,subscribeEvents,themes:THEMES.slice()};
})();
