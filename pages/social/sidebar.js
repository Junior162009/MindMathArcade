/* TecnoMath Social — lógica robusta de la barra lateral */
(() => {
  'use strict';

  function initSidebar(){
    const sidebar=document.getElementById('sidebar');
    const menuBtn=document.getElementById('menuBtn');
    if(!sidebar||!menuBtn||sidebar.dataset.logicReady==='true') return;
    sidebar.dataset.logicReady='true';

    let backdrop=document.getElementById('sidebarBackdrop');
    if(!backdrop){
      backdrop=document.createElement('div');
      backdrop.id='sidebarBackdrop';
      backdrop.className='sidebar-backdrop';
      backdrop.setAttribute('aria-hidden','true');
      document.body.appendChild(backdrop);
    }

    const isMobile=()=>window.matchMedia('(max-width:700px)').matches;
    const setState=(open)=>{
      const shouldOpen=Boolean(open)&&isMobile();
      sidebar.classList.toggle('mobile-open',shouldOpen);
      backdrop.classList.toggle('open',shouldOpen);
      document.body.classList.toggle('sidebar-locked',shouldOpen);
      menuBtn.classList.toggle('menu-btn-open',shouldOpen);
      menuBtn.setAttribute('aria-expanded',String(shouldOpen));
      menuBtn.setAttribute('aria-label',shouldOpen?'Cerrar menú':'Abrir menú');
      backdrop.setAttribute('aria-hidden',String(!shouldOpen));
    };

    const close=()=>setState(false);
    const toggle=()=>setState(!sidebar.classList.contains('mobile-open'));

    menuBtn.setAttribute('aria-controls','sidebar');
    menuBtn.setAttribute('aria-expanded','false');
    // Captura antes del handler antiguo de social.js para evitar doble toggle.
    menuBtn.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();toggle();},true);
    backdrop.addEventListener('click',close);

    sidebar.querySelectorAll('.nav-item').forEach(link=>{
      link.addEventListener('click',()=>{
        sidebar.querySelectorAll('.nav-item').forEach(item=>item.classList.remove('active'));
        link.classList.add('active');
        close();
      });
    });

    const updateActive=()=>{
      const hash=window.location.hash;
      if(!hash) return;
      sidebar.querySelectorAll('.nav-item').forEach(item=>{
        item.classList.toggle('active',item.getAttribute('href')===hash);
      });
    };

    window.addEventListener('hashchange',updateActive);
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&sidebar.classList.contains('mobile-open')){
        close();
        menuBtn.focus();
      }
    });

    window.addEventListener('resize',()=>{
      if(!isMobile()) close();
    },{passive:true});

    document.addEventListener('click',event=>{
      if(!sidebar.classList.contains('mobile-open')) return;
      const target=event.target.closest?.('a[href^="#"]');
      if(target && !sidebar.contains(target)) close();
    },true);

    updateActive();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initSidebar,{once:true});
  else initSidebar();
})();
