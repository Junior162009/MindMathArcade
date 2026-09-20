(() => {
  async function addClassAManager() {
    try {
      const a = window.TecnomathAuth;
      if (!a) return;

      const u = await a.currentUser();
      if (!u) return;

      const p = await a.getProfile(u);
      const role = String(p?.role || '').toLowerCase();
      const adminClass = String(
        p?.admin_class ?? p?.class ?? p?.adminClass ?? ''
      ).toUpperCase();

      if (role !== 'admin' || adminClass !== 'A') return;

      const grid = document.querySelector('.quick-grid');
      if (!grid || grid.querySelector('[data-class-a-manager]')) return;

      const x = document.createElement('a');
      x.className = 'quick-card external';
      x.dataset.classA = 'manager';
      x.dataset.classAManager = 'true';
      x.href = './games-manager.html';
      x.innerHTML = '<span class="quick-icon">🎮</span><strong>Gestor de juegos Clase A</strong><small>Agregar, editar, ordenar, ocultar y publicar juegos desde un solo panel.</small>';
      grid.appendChild(x);
    } catch (e) {
      console.warn('Clase A manager access:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addClassAManager, { once: true });
  } else {
    addClassAManager();
  }

  // Auth may finish loading after DOMContentLoaded.
  window.addEventListener('tecnomath:admin-ready', addClassAManager);
  window.addEventListener('tecnomath:auth-ready', addClassAManager);
  window.addEventListener('tecnomath-auth-ready', addClassAManager);
})();