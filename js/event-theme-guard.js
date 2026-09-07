/* TecnoMath - el evento legado NO controla la temática visual */
(function () {
  'use strict';

  function boot() {
    // Guardamos las funciones originales de index.html antes de bloquear
    // el sistema antiguo. Así podemos reutilizar sus lluvias, confeti,
    // notificaciones y efectos, pero usando tematicaActiva como fuente real.
    const original = {
      activatePermanentTheme: window.activatePermanentTheme,
      activateFairMode: window.activateFairMode,
      activateMegaFair: window.activateMegaFair,
      deactivateFairMode: window.deactivateFairMode,
      loadThemeCSS: window.loadThemeCSS,
      deactivateVisualEffects: window.deactivateVisualEffects,
      updateFavicon: window.updateFavicon,
      renderProjects: window.renderProjects
    };

    const themes = [
      'normal','halloween','navidad','verano','mundial','regreso',
      'cumpleanos','feria','feriaplus','primavera','espacio','ciencia'
    ];

    const isTheme = id => themes.includes(String(id || '').trim().toLowerCase());

    // Bloqueamos únicamente las llamadas provenientes de tecnomath/evento.
    // El resto de la página puede seguir usando estas funciones normalmente.
    const noop = function () {
      console.warn('TecnoMath: evento legado ignorado; manda tematicaActiva.');
    };
    window.activatePermanentTheme = noop;
    window.activateFairMode = noop;
    window.activateMegaFair = noop;

    // Cuando cambia la temática global, reutilizamos los efectos existentes.
    function applyGlobalTheme(themeName) {
      themeName = String(themeName || 'normal').trim().toLowerCase();
      if (!isTheme(themeName)) themeName = 'normal';

      // La capa theme-sync.js controla colores/fondo.
      // Aquí solo recuperamos los efectos dinámicos (lluvia/confeti/anuncio).
      if (themeName === 'normal') {
        if (typeof original.deactivateFairMode === 'function') original.deactivateFairMode(false);
        if (typeof original.loadThemeCSS === 'function') original.loadThemeCSS(null);
        if (typeof original.deactivateVisualEffects === 'function') original.deactivateVisualEffects();
        if (typeof original.updateFavicon === 'function') original.updateFavicon('🎮');
        if (typeof original.renderProjects === 'function') original.renderProjects(window.currentActiveFilter || 'todos');
        return;
      }

      const configs = {
        halloween: ['🎃 TECNOMATH HALLOWEEN 🎃','🎃 ¡MODO HALLOWEEN ACTIVADO! 🦇',['#FF6600','#FFA500','#800080','#000000','#FF4500'],['🎃','🧛','🦇','🧙','🕷️','🕸️','👻','💀']],
        navidad: ['🎄 TECNOMATH NAVIDAD 🎄','🎄 ¡FELIZ NAVIDAD! 🎅',['#FF0000','#FFFFFF','#00FF00','#FFD700','#008000'],['🎄','🎅','🧝','🎁','⛄','🦌','🌟','🔔']],
        cumpleanos: ['🥳 TECNOMATH CUMPLEAÑOS 🥳','🎂 ¡FELIZ CUMPLEAÑOS! 🎉',['#FF1493','#FFD700','#00BFFF','#FF4500','#32CD32'],['🎂','🎈','🎉','🥳','🎁','🎊','🎵','🕺']],
        mundial: ['🏆 TECNOMATH MUNDIAL 🏆','⚽ ¡MODO MUNDIAL ACTIVADO! 🌍',['#FFD700','#009A3E','#FFFFFF','#008000','#FF4500'],['⚽','🏆','🌍','🇦🇷','🇧🇷','🇫🇷','🇪🇸','🇩🇪','🥅']]
      };

      if (configs[themeName] && typeof original.activatePermanentTheme === 'function') {
        const c = configs[themeName];
        original.activatePermanentTheme(c[0], c[1], c[2], c[3], themeName, false);
        return;
      }

      // Feria conserva sus efectos especiales originales.
      if (themeName === 'feria' && typeof original.activateFairMode === 'function') {
        original.activateFairMode(false);
        return;
      }
      if (themeName === 'feriaplus' && typeof original.activateMegaFair === 'function') {
        original.activateMegaFair(false);
        return;
      }

      // Temáticas nuevas que ya tienen configuración en index.html.
      if (['primavera','espacio','ciencia','verano','regreso'].includes(themeName) && typeof window.getEventConfig === 'function' && typeof original.activatePermanentTheme === 'function') {
        const c = window.getEventConfig(themeName);
        if (c) original.activatePermanentTheme(c.title, c.notification, c.confettiColors, c.emojis, themeName, false);
        return;
      }

      // Si una temática no tiene efectos especiales, mantenemos el fondo global.
      if (typeof original.loadThemeCSS === 'function') original.loadThemeCSS(themeName);
    }

    // Escuchamos SOLAMENTE la fuente global.
    if (window.firebase && firebase.database) {
      firebase.database().ref('tecnomath/tematicaActiva').on('value', snap => {
        const theme = isTheme(snap.val()) ? String(snap.val()).trim().toLowerCase() : 'normal';
        applyGlobalTheme(theme);
      });
    }
  }

  // index.html declara sus funciones antes de cargar los scripts del final.
  // Ejecutamos después del parseo, pero antes de una nueva recarga de evento.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0), {once:true});
  } else {
    setTimeout(boot, 0);
  }
})();
