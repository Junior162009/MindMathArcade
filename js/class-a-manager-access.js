/* TecnoMath — acceso visual Clase A al Gestor de Juegos */
(function () {
  'use strict';

  function render(detail) {
    const profile = detail?.profile || window.TecnomathCurrentAdmin;
    if (!window.TecnomathAdminGuard?.isClassA(profile)) return;

    const grid = document.querySelector('.quick-grid');
    if (!grid || grid.querySelector('[data-class-a-manager]')) return;

    const card = document.createElement('a');
    card.className = 'quick-card external class-a-manager-card';
    card.dataset.classAManager = 'true';
    card.href = './games-manager.html';
    card.setAttribute('aria-label', 'Abrir Gestor de Juegos Clase A');
    card.innerHTML =
      '<span class="quick-icon" aria-hidden="true">🎮</span>' +
      '<strong>Gestor de Juegos</strong>' +
      '<small>Agregar, editar, ordenar, ocultar y publicar juegos desde un solo panel.</small>';
    grid.appendChild(card);
  }

  function boot() {
    window.addEventListener('tecnomath:admin-ready', render, { once: true });
    if (window.TecnomathCurrentAdmin) render({ profile: window.TecnomathCurrentAdmin });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
