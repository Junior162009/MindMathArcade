/* TecnoMath - evita que el sistema antiguo de eventos sobreescriba la temática global */
(function () {
  'use strict';

  // Este script se inyecta al final de la página, después de que index.html
  // haya declarado sus funciones. Debe instalarse inmediatamente, no esperar
  // a DOMContentLoaded, porque Firebase puede entregar el evento inicial antes.
  const noop = function () {
    console.warn('TecnoMath: evento legado ignorado; la temática global controla la apariencia.');
  };

  // El nodo tecnomath/evento ya no controla la apariencia global.
  // La única fuente de verdad visual es tecnomath/tematicaActiva.
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
})();
