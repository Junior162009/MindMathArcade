/* TecnoMath - sincronización de temática global con Firebase */
(function () {
  'use strict';

  const THEMES = {
    normal: { emoji:'📚', colors:{bg:'#060610',card:'#0d0d1a',border:'#1a1a2e',text:'#fff',cyan:'#00FFFF',pink:'#FF00FF',green:'#39FF14',yellow:'#FFE600',gold:'#FFD700'} },
    halloween: { emoji:'🎃', colors:{bg:'#10050a',card:'#1b0b16',border:'#5b1f49',text:'#fff4e6',cyan:'#ff7a00',pink:'#ff3d00',green:'#b6ff00',yellow:'#ff9f00',gold:'#ff6a00'} },
    navidad: { emoji:'🎄', colors:{bg:'#06120d',card:'#0c2118',border:'#1e5b3b',text:'#fff',cyan:'#65e6ff',pink:'#ff3b5c',green:'#39ff7a',yellow:'#ffe66d',gold:'#ffd700'} },
    verano: { emoji:'☀️', colors:{bg:'#071827',card:'#0c2438',border:'#1f6285',text:'#fff',cyan:'#29d9ff',pink:'#ff5ea8',green:'#70ff9a',yellow:'#ffe66d',gold:'#ffd166'} },
    mundial: { emoji:'🏆', colors:{bg:'#07100a',card:'#0e1d11',border:'#355b3a',text:'#fff',cyan:'#4de1ff',pink:'#e8c547',green:'#4cff70',yellow:'#ffe600',gold:'#ffd700'} },
    regreso: { emoji:'🎒', colors:{bg:'#10100a',card:'#1c1c0e',border:'#5d5a24',text:'#fff',cyan:'#5fd7ff',pink:'#ff72b6',green:'#75ff75',yellow:'#ffe600',gold:'#ffcc33'} },
    cumpleanos: { emoji:'🥳', colors:{bg:'#130b18',card:'#21102b',border:'#703c85',text:'#fff',cyan:'#55eaff',pink:'#ff66cc',green:'#75ff8a',yellow:'#ffe66d',gold:'#ffd166'} },
    feria: { emoji:'🎡', colors:{bg:'#130b08',card:'#24130d',border:'#78401f',text:'#fff5e8',cyan:'#39e8ff',pink:'#ff4f81',green:'#7dff5c',yellow:'#ffe04b',gold:'#ffc400'} },
    feriaplus: { emoji:'🔥', colors:{bg:'#160604',card:'#280b08',border:'#8b2919',text:'#fff2e8',cyan:'#4deaff',pink:'#ff3b30',green:'#8cff4d',yellow:'#ffd000',gold:'#ff9d00'} },
    primavera: { emoji:'🌸', colors:{bg:'#100b14',card:'#1e1220',border:'#6f3d68',text:'#fff5fb',cyan:'#66eaff',pink:'#ff72b6',green:'#7dff9b',yellow:'#ffe66d',gold:'#ffd166'} },
    espacio: { emoji:'🚀', colors:{bg:'#050611',card:'#0b1022',border:'#273b72',text:'#f3f6ff',cyan:'#55eaff',pink:'#a76bff',green:'#65ffbf',yellow:'#ffe66d',gold:'#ffd166'} },
    ciencia: { emoji:'🔬', colors:{bg:'#06100e',card:'#0c1c18',border:'#245b4d',text:'#effff9',cyan:'#4deaff',pink:'#ff65c7',green:'#63ff9a',yellow:'#eaff66',gold:'#ffd166'} },
    amoramistad: { emoji:'💖', colors:{bg:'#fff0f7',card:'#ffffff',border:'#ffb4d5',text:'#3b1730',cyan:'#c026d3',pink:'#ff4f9a',green:'#16a085',yellow:'#d97706',gold:'#d4a017'} }
  };

  const THEME_KEY = 'tecnomath:tema-activo';
  const LOVE_CSS_ID = 'tecnomath-amor-amistad-css';
  const LOVE_CSS_HREF = '/css/amor-amistad.css?v=3';
  let listenerAttached = false;

  function validTheme(id) {
    id = String(id || '').trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(THEMES, id) ? id : null;
  }

  function syncLoveCss(id) {
    const existing = document.getElementById(LOVE_CSS_ID);
    if (id === 'amoramistad') {
      if (!existing) {
        const link = document.createElement('link');
        link.id = LOVE_CSS_ID;
        link.rel = 'stylesheet';
        link.href = LOVE_CSS_HREF;
        document.head.appendChild(link);
      } else if (existing.getAttribute('href') !== LOVE_CSS_HREF) {
        existing.setAttribute('href', LOVE_CSS_HREF);
      }
    } else if (existing) existing.remove();
  }

  function createLoveDecor() {
    if (document.getElementById('aa-global-hearts')) return;
    const layer = document.createElement('div');
    layer.id = 'aa-global-hearts';
    layer.className = 'aa-floating-hearts';
    for (let i = 0; i < 18; i++) {
      const heart = document.createElement('span');
      heart.className = 'aa-floating-heart';
      heart.textContent = i % 4 === 0 ? '💗' : (i % 4 === 1 ? '💖' : (i % 4 === 2 ? '💕' : '♥'));
      heart.style.setProperty('--aa-left', `${Math.round(Math.random() * 100)}%`);
      heart.style.setProperty('--aa-size', `${14 + Math.round(Math.random() * 20)}px`);
      heart.style.setProperty('--aa-duration', `${7 + Math.round(Math.random() * 6)}s`);
      heart.style.setProperty('--aa-delay', `${-(Math.random() * 10).toFixed(2)}s`);
      heart.style.setProperty('--aa-drift', `${-45 + Math.round(Math.random() * 90)}px`);
      layer.appendChild(heart);
    }
    document.body.appendChild(layer);
  }

  function removeLoveDecor() {
    const layer = document.getElementById('aa-global-hearts');
    if (layer) layer.remove();
  }

  function apply(id, persist = true) {
    id = validTheme(id) || 'normal';
    const theme = THEMES[id];
    const root = document.documentElement;
    const map = {bg:'--theme-bg',card:'--theme-card',border:'--theme-border',text:'--theme-text',cyan:'--neon-cyan',pink:'--neon-pink',green:'--neon-green',yellow:'--neon-yellow',gold:'--gold'};
    Object.keys(theme.colors).forEach(k => root.style.setProperty(map[k], theme.colors[k]));
    root.dataset.tecnomathTheme = id;
    root.dataset.theme = id;
    if (document.body) {
      document.body.dataset.tecnomathTheme = id;
      document.body.dataset.theme = id;
      document.body.classList.toggle('tema-amor-amistad', id === 'amoramistad');
      if (id === 'amoramistad') createLoveDecor(); else removeLoveDecor();
    }
    syncLoveCss(id);
    if (persist) { try { localStorage.setItem(THEME_KEY, id); } catch (_) {} }
    document.title = `${theme.emoji} TecnoMath · Plataforma Educativa Interactiva`;
    window.dispatchEvent(new CustomEvent('tecnomath:themechange', {detail:{id, theme}}));
  }

  function getCachedTheme() { try { return validTheme(localStorage.getItem(THEME_KEY)); } catch (_) { return null; } }

  function start() {
    apply(getCachedTheme() || 'normal', false);
    if (!window.firebase || !firebase.database) { setTimeout(start, 300); return; }
    if (listenerAttached) return;
    listenerAttached = true;
    try {
      firebase.database().ref('tecnomath/tematicaActiva').on('value', snap => {
        const remoteTheme = validTheme(snap.val());
        if (remoteTheme) apply(remoteTheme); else apply(getCachedTheme() || 'normal');
      }, err => { console.warn('TecnoMath: no se pudo leer la temática global.', err); apply(getCachedTheme() || 'normal'); });
    } catch (err) { console.warn('TecnoMath: error iniciando temática global.', err); apply(getCachedTheme() || 'normal'); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true}); else start();
})();
