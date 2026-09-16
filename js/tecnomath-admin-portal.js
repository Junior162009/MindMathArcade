/* TecnoMath Admin UI — acceso administrativo fuera de la portada */
(function(){
'use strict';

function removeLegacyAdminUI(){
  ['adminAccessBtn','admin-cloud','admin-panel','tm-ui-admin'].forEach(id=>{
    document.getElementById(id)?.remove();
  });
}

function start(){
  removeLegacyAdminUI();
  const observer=new MutationObserver(()=>removeLegacyAdminUI());
  if(document.body) observer.observe(document.body,{subtree:true,childList:true});
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',start,{once:true});
}else{
  start();
}
})();
