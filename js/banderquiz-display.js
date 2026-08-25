/* BanderQuiz: bandera externa como opción principal y emoji como segunda opción. */
(function () {
  'use strict';

  if (!/\/games\/esequiel11%C2%B0\/bandera\.html$/.test(location.pathname) && !/\/games\/esequiel11°\/bandera\.html$/.test(location.pathname)) return;

  let modo = localStorage.getItem('banderquiz-display-mode') || 'externa';
  let pintando = false;

  function emojiDePais(codigo) {
    if (!codigo || codigo.length !== 2) return '🏳️';
    return codigo.toUpperCase().split('').map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');
  }

  function pintar() {
    if (pintando) return;
    const display = document.getElementById('flagDisplay');
    const pais = window.__BanderQuizPaisActual;
    if (!display || !pais) return;

    pintando = true;
    if (modo === 'emoji') {
      display.innerHTML = `<span class="bq-flag-emoji" role="img" aria-label="Bandera de ${pais.nombre}">${emojiDePais(pais.codigo)}</span>`;
    } else {
      display.innerHTML = `<img src="https://flagcdn.com/128x96/${pais.codigo}.png" alt="Bandera de ${pais.nombre}" />`;
    }

    const externa = document.getElementById('bqModoExterno');
    const emoji = document.getElementById('bqModoEmoji');
    if (externa) externa.classList.toggle('active', modo === 'externa');
    if (emoji) emoji.classList.toggle('active', modo === 'emoji');
    setTimeout(() => { pintando = false; }, 0);
  }

  function instalar() {
    if (document.getElementById('bqDisplayControls')) return;

    const display = document.getElementById('flagDisplay');
    if (!display) return;

    const style = document.createElement('style');
    style.id = 'bq-display-style';
    style.textContent = `
      #bqDisplayControls{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin:-8px 0 12px}
      .bq-display-label{color:#aaa;font-size:13px}
      .bq-mode{border:1px solid #555;background:#1e1e1e;color:#fff;border-radius:20px;padding:7px 12px;font-size:13px;cursor:pointer}
      .bq-mode:hover{background:#333}
      .bq-mode.active{border-color:#f0c040;color:#f0c040;box-shadow:0 0 10px rgba(240,192,64,.2)}
      .bq-flag-emoji{font-size:clamp(90px,18vw,150px);line-height:1;filter:drop-shadow(0 4px 10px rgba(0,0,0,.55))}
    `;
    document.head.appendChild(style);

    const controls = document.createElement('div');
    controls.id = 'bqDisplayControls';
    controls.innerHTML = `
      <span class="bq-display-label">Modo de bandera:</span>
      <button type="button" id="bqModoExterno" class="bq-mode">🖼️ Bandera externa</button>
      <button type="button" id="bqModoEmoji" class="bq-mode">😀 Emoji</button>
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

  function iniciar() {
    instalar();
    const display = document.getElementById('flagDisplay');
    if (!display) return;

    const capturarBandera = () => {
      if (pintando) return;
      const img = display.querySelector('img');
      if (!img) return;
      const match = img.src.match(/\/([a-z]{2})\.png(?:\?.*)?$/i);
      if (match) {
        window.__BanderQuizPaisActual = {
          codigo: match[1].toLowerCase(),
          nombre: img.alt.replace(/^Bandera de\s*/i, '')
        };
      }
      if (modo === 'emoji' && window.__BanderQuizPaisActual) pintar();
      else {
        const externa = document.getElementById('bqModoExterno');
        const emoji = document.getElementById('bqModoEmoji');
        if (externa) externa.classList.add('active');
        if (emoji) emoji.classList.remove('active');
      }
    };

    const observer = new MutationObserver(capturarBandera);
    observer.observe(display, { childList: true, subtree: true, attributes: true });
    capturarBandera();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  } else {
    iniciar();
  }
})();
