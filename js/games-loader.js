/* TecnoMath · Catálogo dinámico */
(function(){'use strict';
const CATALOG='data/games.json';
function loadAuth(){return new Promise((resolve,reject)=>{if(window.TecnomathAuth)return resolve();const old=document.querySelector('script[data-tecnomath-auth]');if(old){old.addEventListener('load',resolve,{once:true});old.addEventListener('error',()=>reject(new Error('No se pudo cargar la autenticación TecnoMath.')),{once:true});return}const s=document.createElement('script');s.src='js/tecnomath-auth.js?v=20260914';s.dataset.tecnomathAuth='true';s.onload=resolve;s.onerror=()=>reject(new Error('No se pudo cargar la autenticación TecnoMath.'));document.head.appendChild(s)});}
function loadAdminPortal(){return new Promise((resolve)=>{if(document.querySelector('script[data-tecnomath-admin-portal]'))return resolve();const s=document.createElement('script');s.src='js/tecnomath-admin-portal.js?v=20260914';s.dataset.tecnomathAdminPortal='true';s.onload=resolve;s.onerror=()=>resolve();document.head.appendChild(s)})}
function addMeta(property,content){let m=document.head.querySelector(`meta[property="${property}"]`);if(!m){m=document.createElement('meta');m.setAttribute('property',property);document.head.appendChild(m)}m.content=content}
addMeta('og:title','TecnoMath | Plataforma Educativa Interactiva');addMeta('og:description','Juegos educativos, retos matemáticos y experiencias interactivas en TecnoMath.');addMeta('og:image','https://tecnomath.online/img/mindmath.png');addMeta('og:type','website');
const nativeFetch=window.fetch.bind(window);
window.fetch=function(input,init){try{const u=typeof input==='string'?input:input&&input.url||'';if(/(?:^|\/)juegos\.json(?:\?|$)/i.test(u)){const replacement=new URL(CATALOG,location.href).href;return nativeFetch(replacement,init)}}catch(e){}return nativeFetch(input,init)};
async function loadCatalog(){try{const r=await nativeFetch(`${CATALOG}?v=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw Error(`HTTP ${r.status}`);const data=await r.json();if(!Array.isArray(data))throw Error('games.json debe ser una lista');window.TecNoMathCatalog=data;console.log(`📚 Catálogo oficial: ${data.length} juegos`)}catch(e){console.warn('No se pudo cargar el catálogo oficial:',e.message)}}
async function boot(){await loadCatalog();try{await loadAuth();await loadAdminPortal()}catch(e){console.error('TecnoMath Auth:',e)}}
boot();
window.TecnoMathCatalogReload=loadCatalog;
})();
