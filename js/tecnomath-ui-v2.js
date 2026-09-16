/* TecnoMath UI V2 — presentación + navegación moderna */
(function(){'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isDesktop=()=>window.matchMedia('(pointer:fine) and (min-width:821px)').matches;

function setup(){
 const header=$('header'),hero=$('.hero');
 if(header){
   header.classList.add('tm-ui-header');
   const content=$('.header-content',header)||header;
   if(!$('.tm-ui-nav',header)){
     const nav=document.createElement('nav');
     nav.className='tm-ui-nav';
     nav.setAttribute('aria-label','Navegación principal');
     nav.innerHTML='<a class="active" href="#tm-ui-hero">Inicio</a><a href="#projectsContainer">Juegos</a><a href="#sponsorsArea">Patrocinadores</a><a href="#tm-ui-stats">Estadísticas</a>';
     content.appendChild(nav);
   }
   if(!$('.tm-ui-controls',header)){
     const controls=document.createElement('div');
     controls.className='tm-ui-controls';
     controls.innerHTML='<button class="tm-ui-theme" id="tmUiTheme" type="button" aria-label="Cambiar a modo claro" aria-pressed="false">☾</button><button class="tm-ui-menu" id="tmUiMenu" type="button" aria-label="Abrir menú" aria-expanded="false">☰</button>';
     content.appendChild(controls);
   }
   const onScroll=()=>header.classList.toggle('tm-scrolled',window.scrollY>30);
   window.addEventListener('scroll',onScroll,{passive:true});onScroll();
 }

 if(hero){
   hero.id='tm-ui-hero';
   hero.classList.add('tm-ui-hero');
   if(!$('.tm-ui-badge',hero)){
     const badge=document.createElement('div');
     badge.className='tm-ui-badge';
     badge.innerHTML='<span class="tm-ui-dot"></span> PLATAFORMA EDUCATIVA GAMING';
     hero.insertBefore(badge,hero.firstChild);
   }
   if(!$('.tm-ui-hero-actions',hero)){
     const actions=document.createElement('div');
     actions.className='tm-ui-hero-actions';
     actions.innerHTML='<a class="tm-ui-btn tm-ui-primary" href="#projectsContainer">🎮 EXPLORAR JUEGOS</a><a class="tm-ui-btn tm-ui-secondary" href="#tm-ui-stats">📊 VER ESTADÍSTICAS</a>';
     hero.appendChild(actions);
   }
   if(!$('.tm-ui-search',hero)){
     const wrap=document.createElement('div');
     wrap.className='tm-ui-search';
     wrap.innerHTML='<span aria-hidden="true">⌕</span><input id="tmUiSearch" type="search" autocomplete="off" placeholder="Buscar un juego..." aria-label="Buscar un juego">';
     hero.appendChild(wrap);
     $('#tmUiSearch').addEventListener('input',()=>filtrarJuegos($('#tmUiSearch').value));
   }
 }

 const menu=$('#tmUiMenu'),nav=$('.tm-ui-nav');
 if(menu&&nav&&!menu.dataset.bound){
   menu.dataset.bound='1';
   menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');menu.textContent=open?'×':'☰'});
   $$('.tm-ui-nav a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Abrir menú');menu.textContent='☰'}));
 }

 const theme=$('#tmUiTheme');
 if(theme&&!theme.dataset.bound){
   theme.dataset.bound='1';
   const saved=localStorage.getItem('tm-ui-theme');
   if(saved==='light')applyLight(theme,true);else applyLight(theme,false,true);
   theme.addEventListener('click',()=>applyLight(theme,!document.body.classList.contains('tm-light')));
 }

 setupActiveNavigation();
 setupTopButton();
 setupStats();
 setupCursor();
 const footer=$('footer');if(footer)footer.classList.add('tm-footer-enhanced');
 loadAdminPortal();
}

function applyLight(button,on,silent){
 document.body.classList.toggle('tm-light',on);
 localStorage.setItem('tm-ui-theme',on?'light':'dark');
 button.textContent=on?'☀':'☾';
 button.setAttribute('aria-label',on?'Cambiar a modo oscuro':'Cambiar a modo claro');
 button.setAttribute('aria-pressed',String(on));
 if(!silent&&!reduced())button.animate([{transform:'rotate(-12deg) scale(.88)'},{transform:'rotate(0) scale(1)'}],{duration:280,easing:'cubic-bezier(.25,.8,.25,1)'});
}

function filtrarJuegos(term){
 const q=String(term||'').trim().toLowerCase();
 $$('#projectsContainer .project-card').forEach(card=>{card.style.display=!q||(card.textContent||'').toLowerCase().includes(q)?'':'none'});
}

function setupStats(){
 let stats=$('#tm-ui-stats');
 if(!stats){
   stats=document.createElement('section');
   stats.id='tm-ui-stats';
   stats.className='tm-ui-stats';
   stats.setAttribute('aria-label','Estadísticas del portal');
   stats.innerHTML='<h3>TECNO<span>MATH</span> EN NÚMEROS</h3><div class="tm-ui-stat-grid"><div class="tm-ui-stat"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h3M13 11h3M8 15h3M13 15h3"/></svg><strong data-stat="games">0</strong><span>JUEGOS</span></div><div class="tm-ui-stat"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/></svg><strong data-stat="categories">0</strong><span>CATEGORÍAS</span></div><div class="tm-ui-stat"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19V9l8-4 8 4v10M8 19v-6h8v6"/><path d="M3 19h18"/></svg><strong data-stat="sponsors">0</strong><span>PATROCINADORES</span></div></div>';
   const anchor=$('.hero'),projects=$('#projectsContainer'),footer=$('footer');
   if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(stats,anchor.nextSibling);else if(projects&&projects.parentNode)projects.parentNode.insertBefore(stats,projects);else if(footer)footer.parentNode.insertBefore(stats,footer);
 }
 actualizarEstadisticas();
 const observer=new MutationObserver(()=>actualizarEstadisticas());
 const projects=$('#projectsContainer'),sponsors=$('#sponsorsArea');
 if(projects)observer.observe(projects,{childList:true,subtree:true});
 if(sponsors)observer.observe(sponsors,{childList:true,subtree:true});
}

function actualizarEstadisticas(){
 const projects=$$('#projectsContainer .project-card');
 const sponsors=$$('#sponsorsArea .sponsor-card');
 const categories=new Set();
 projects.forEach(card=>{
   const category=card.dataset.category||card.getAttribute('data-category')||card.querySelector('[data-category]')?.getAttribute('data-category');
   const desc=card.querySelector('.project-desc');
   if(category)categories.add(category);else if(desc&&desc.textContent.trim())categories.add(desc.textContent.trim());
 });
 const values={games:projects.length,categories:categories.size,sponsors:sponsors.length};
 Object.entries(values).forEach(([key,target])=>{
   const el=$(`[data-stat="${key}"]`);if(!el)return;
   const previous=Number(el.dataset.value||0);
   if(previous===target)return;
   el.dataset.value=String(target);
   if(reduced()){el.textContent=String(target);return;}
   animateNumber(el,previous,target);
 });
}

function animateNumber(el,from,to){
 const start=performance.now(),duration=650;
 const tick=now=>{
   const p=Math.min(1,(now-start)/duration),e=1-Math.pow(1-p,3),value=Math.round(from+(to-from)*e);
   el.textContent=String(value);
   if(p<1)requestAnimationFrame(tick);
 };
 requestAnimationFrame(tick);
}

function setupActiveNavigation(){
 const links=$$('.tm-ui-nav a');
 if(!links.length||!('IntersectionObserver' in window))return;
 const map=new Map(links.map(a=>[a.getAttribute('href'),a]));
 const sections=['#tm-ui-hero','#projectsContainer','#sponsorsArea','#tm-ui-stats'].map(id=>$(id)).filter(Boolean);
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){links.forEach(a=>a.classList.remove('active'));const link=map.get('#'+entry.target.id);if(link)link.classList.add('active')}}),{rootMargin:'-25% 0px -60% 0px',threshold:0});
 sections.forEach(section=>observer.observe(section));
}

function setupTopButton(){
 if($('#tm-ui-top'))return;
 const b=document.createElement('button');
 b.id='tm-ui-top';b.type='button';b.textContent='↑';b.setAttribute('aria-label','Volver arriba');
 document.body.appendChild(b);
 b.addEventListener('click',()=>window.scrollTo({top:0,behavior:reduced()?'auto':'smooth'}));
 window.addEventListener('scroll',()=>b.classList.toggle('visible',window.scrollY>500),{passive:true});
}

function setupCursor(){
 if(!isDesktop()||reduced()||$('.tm-cursor-dot'))return;
 const dot=document.createElement('span'),ring=document.createElement('span');
 dot.className='tm-cursor-dot';ring.className='tm-cursor-ring';
 document.body.append(dot,ring);
 let x=window.innerWidth/2,y=window.innerHeight/2,rx=x,ry=y,visible=false;
 const render=()=>{rx+=(x-rx)*.16;ry+=(y-ry)*.16;dot.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;ring.style.transform=`translate(${rx}px,${ry}px) translate(-50%,-50%)`;requestAnimationFrame(render)};
 document.addEventListener('mousemove',e=>{x=e.clientX;y=e.clientY;if(!visible){visible=true;dot.style.opacity='1';ring.style.opacity='1'}});
 document.addEventListener('mouseleave',()=>{dot.style.opacity='0';ring.style.opacity='0'});
 document.addEventListener('mouseover',e=>{if(e.target.closest('a,button,input,[role="button"]'))document.body.classList.add('tm-cursor-active');else document.body.classList.remove('tm-cursor-active')});
 render();
}

function loadAdminPortal(){
 if(window.__TECNO_MATH_ADMIN_PORTAL__)return;
 window.__TECNO_MATH_ADMIN_PORTAL__=true;
 const src='js/tecnomath-admin-portal.js?v=20260914-1';
 if(document.querySelector('script[data-tecnomath-admin-portal]'))return;
 const s=document.createElement('script');s.src=src;s.defer=false;s.dataset.tecnomathAdminPortal='true';s.onerror=()=>{console.warn('No se pudo cargar el controlador admin moderno.')};document.head.appendChild(s);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();