/* BanderQuiz: bandera externa como opción principal y emoji como segunda opción. */
(function () {
  'use strict';

  if (!/\/games\/esequiel11%C2%B0\/bandera\.html$/.test(location.pathname) && !/\/games\/esequiel11°\/bandera\.html$/.test(location.pathname)) return;

  let modo = localStorage.getItem('banderquiz-display-mode') || 'externa';

  function emojiDePais(codigo) {
    if (!codigo || codigo.length !== 2) return '🏳️';
    return codigo.toUpperCase().split('').map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');
  }

  function pintar() {
    const display = document.getElementById('flagDisplay');
    const pais = window.__BanderQuizPaisActual;
    if (!display || !pais) return;

    if (modo === 'emoji') {
      display.innerHTML = `<span class="bq-flag-emoji" role="img" aria-label="Bandera de ${pais.nombre}">${emojiDePais(pais.codigo)}</span>`;
    } else {
      display.innerHTML = `<img src="https://flagcdn.com/128x96/${pais.codigo}.png" alt="Bandera de ${pais.nombre}" />`;
    }

    const externa = document.getElementById('bqModoExterno');
    const emoji = document.getElementById('bqModoEmoji');
    if (externa) externa.classList.toggle('active', modo === 'externa');
    if (emoji) emoji.classList.toggle('active', modo === 'emoji');
  }

  function instalar() {
    if (document.getElementById('bqDisplayControls')) return;

    const display = document.getElementById('flagDisplay');
    if (!display) return;

    const controls = document.createElement('div');
    controls.id = 'bqDisplayControls';
    controls.innerHTML = `
      <span class="bq-display-label">Modo de bandera:</span>
      <button type="button" id="bqModoExterno" class="bq-mode active">🖼️ Bandera externa</button>
      <button type="button" id="bqModoEmoji" class="bq-mode">🇨🇴 Emoji</button>
    `;
    display.insertAdjacentElement('afterend', controls);

    document.getElementById('bqModoExterno').addEventListener('click', () => {
      modo = 'externa';
      localStorage.setItem('banderquiz-display-mode', modo);
      pintar();
    });
    document.getElementById('bqModoEmoji').addEventListener('click', () => {
      modo = 'emoji';
      localStorage.setItem('banderquiz-display-mode', modo);
      pintar();
    });
  }

  function esperarJuego() {
    instalar();
    if (window.paisActual) window.__BanderQuizPaisActual = window.paisActual;
    pintar();
  }

  // El juego mantiene paisActual en su script local; interceptamos su renderizado
  // sin cambiar la lógica de respuestas, vidas, letras ni puntuación.
  const originalDefineProperty = Object.defineProperty;
  void originalDefineProperty;

  document.addEventListener('DOMContentLoaded', () => {
    instalar();

    const display = document.getElementById('flagDisplay');
    if (!display) return;

    const observer = new MutationObserver(() => {
      const img = display.querySelector('img');
      if (img) {
        const match = img.src.match(/\/([a-z]{2})\.png(?:\?.*)?$/i);
        if (match) {
          const codigo = match[1].toLowerCase();
          const nombre = img.alt.replace(/^Bandera de\s*/i, '');
          window.__BanderQuizPaisActual = { codigo, nombre };
        }
      }
      if (modo === 'emoji' && window.__BanderQuizPaisActual) pintar();
    });

    observer.observe(display, { childList: true, subtree: true, attributes: true });
    esperarJuego();
  });
})();
