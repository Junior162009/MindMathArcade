/* TecnoMath - sincronización de temática global con Firebase */
(function () {
  'use strict';

  const THEMES = {
    normal: { emoji:'📚', colors:{bg:'#060610',card:'#0d0d1a',border:'#1a1a2e',text:'#fff',cyan:'#00FFFF',pink:'#FF00FF',green:'#39FF14',yellow:'#FFE600',gold:'#FFD700'} },
    halloween: { emoji:'🎃', colors:{bg:'#10050a',card:'#1b0b16',border:'#5b1f49',text:'#fff4e6',cyan:'#ff7a00',pink:'#ff3d00',green:'#b6ff00',yellow:'#ff9f00',gold:'#ff6a00'} },
    navidad: { emoji:'🎄', colors:{bg:'#06120d',card:'#0c2118',border:'#1e5b3b',text:'#fff',cyan:'#65e6ff',pink:'#ff3b5c',green:'#39ff7a',yellow:'#ffe66d',gold:'#ffd700'} },
    verano: { emoji:'☀️', colors:{bg:'#071827',card:'#0c2438',border:'#1f6285',text:'#fff',cyan:'#29d9ff',pink:'#ff5ea8',green:'#70ff9a',yellow:'#ffe66d',gold:'#ffd166'} },
    mundial: { emoji:'🏆', colors:{bg:'#07100a',card:'#0e1d11',border:'#355b3a',text:'#fff',cyan:'#4de1ff',pink:'#e8c547',green:'#4cff70',yellow:'#ffe600',gold:'#ffd700'} },
    regreso: { emoji:'🎒', colors:{bg:'#10100a',card:'#1c1c0e',border:'#5d5a24',text:'#fff',cyan:'#5fd7ff',pink:'#ff72b6',green:'#75ff75',yellow:'#ffe600',gold:'#ffcc33'} }
  };

  function apply(id) {
    id = String(id || 'normal').toLowerCase();
    const theme = THEMES[id] || THEMES.normal;
    const root = document.documentElement;
    const map = {bg:'--theme-bg',card:'--theme-card',border:'--theme-border',text:'--theme-text',cyan:'--neon-cyan',pink:'--neon-pink',green:'--neon-green',yellow:'--neon-yellow',gold:'--gold'};
    Object.keys(theme.colors).forEach(k => root.style.setProperty(map[k], theme.colors[k]));
    root.dataset.tecnomathTheme = id;
    if (document.body) document.body.dataset.tecnomathTheme = id;
    document.title = `${theme.emoji} TecnoMath · Plataforma de Juegos Educativos`;
    window.dispatchEvent(new CustomEvent('tecnomath:themechange', {detail:{id, theme}}));
  }

  function start() {
    apply('normal');
    if (!window.firebase || !firebase.database) {
      setTimeout(start, 300);
      return;
    }
    try {
      firebase.database().ref('tecnomath/tematicaActiva').on('value', snap => apply(snap.val() || 'normal'), err => {
        console.warn('TecnoMath: no se pudo leer la temática global.', err);
        apply('normal');
      });
    } catch (err) {
      console.warn('TecnoMath: error iniciando temática global.', err);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
