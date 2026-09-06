/* TecnoMath - evita que el sistema antiguo de eventos sobreescriba la temática global */
(function () {
  'use strict';

  function installGuard() {
    // El nodo tecnomath/evento ya no controla la apariencia global.
    // La única fuente de verdad visual es tecnomath/tematicaActiva.
    const noop = function () {
      console.warn('TecnoMath: evento legado ignorado; la temática global controla la apariencia.');
    };

    if (typeof window.activatePermanentTheme === 'function') {
      window.activatePermanentTheme = noop;
    }
    if (typeof window.activateFairMode === 'function') {
      window.activateFairMode = noop;
    }
    if (typeof window.activateMegaFair === 'function') {
      window.activateMegaFair = noop;
    }
    if (typeof window.loadThemeCSS === 'function') {
      window.loadThemeCSS = noop;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installGuard, { once: true });
  } else {
    installGuard();
  }
})();
