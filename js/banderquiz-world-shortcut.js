// BanderQuiz · acceso directo a Conquista el Mundo
(function () {
  'use strict';
  if (window.BanderQuizWorldShortcut) return;
  window.BanderQuizWorldShortcut = true;

  const WORLD_URL = 'mapa-beta/index.html';
  const GAME_PATH = '/games/laura10°/';

  function isClassicBanderQuiz() {
    return location.pathname.includes(GAME_PATH) && !location.pathname.includes('/mapa-beta/');
  }

  function goWorld() {
    location.href = new URL(WORLD_URL, location.href).href;
  }

  function addStyles() {
    if (document.getElementById('bq-world-shortcut-style')) return;
    const style = document.createElement('style');
    style.id = 'bq-world-shortcut-style';
    style.textContent = `
      .bq-world-shortcut {
        position: relative;
        overflow: hidden;
        background: linear-gradient(145deg, rgba(18,67,88,.96), rgba(20,32,61,.96));
        border-color: rgba(80,220,255,.35);
      }
      .bq-world-shortcut::after {
        content: 'NUEVO';
        position: absolute;
        top: 10px;
        right: 10px;
        background: #f5c518;
        color: #111;
        padding: 4px 8px;
        border-radius: 999px;
        font-size: .65rem;
        font-weight: 900;
      }
      .bq-world-shortcut:hover {
        border-color: #50dcff !important;
        background: linear-gradient(145deg, rgba(25,90,115,.98), rgba(20,35,68,.98)) !important;
        box-shadow: 0 28px 55px rgba(40,200,255,.22) !important;
      }
      .bq-world-shortcut .level-name {
        background: linear-gradient(145deg,#fff,#8deaff);
        -webkit-background-clip: text;
        background-clip: text;
      }
      .bq-world-floating {
        position: fixed;
        left: 16px;
        bottom: 16px;
        z-index: 9998;
        border: 1px solid rgba(80,220,255,.45);
        border-radius: 999px;
        padding: 10px 15px;
        background: rgba(10,22,42,.94);
        color: #fff;
        font: 900 13px system-ui,sans-serif;
        cursor: pointer;
        box-shadow: 0 10px 30px rgba(0,0,0,.4), 0 0 22px rgba(80,220,255,.12);
        backdrop-filter: blur(10px);
        transition: .2s ease;
      }
      .bq-world-floating:hover { transform: translateY(-3px) scale(1.02); border-color:#50dcff; }
      @media(max-width:550px){.bq-world-floating{left:10px;bottom:10px;padding:9px 12px;font-size:12px}}
    `;
    document.head.appendChild(style);
  }

  function addPortalCard() {
    const grid = document.querySelector('.cards-grid');
    if (!grid || grid.querySelector('[data-bq-world-shortcut]')) return;

    const card = document.createElement('a');
    card.className = 'level-card bq-world-shortcut';
    card.href = WORLD_URL;
    card.dataset.bqWorldShortcut = 'true';
    card.setAttribute('aria-label', 'Jugar Conquista el Mundo');
    card.innerHTML = `
      <div class="level-emoji">🌎</div>
      <div class="level-name">Conquista el Mundo</div>
      <div class="level-desc">Mapa mundial interactivo</div>
    `;
    grid.appendChild(card);
  }

  function addFloatingButton() {
    if (document.querySelector('[data-bq-world-floating]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'bq-world-floating';
    button.dataset.bqWorldFloating = 'true';
    button.textContent = '🌎 Conquista el Mundo';
    button.title = 'Ir al mapa mundial';
    button.addEventListener('click', goWorld);
    document.body.appendChild(button);
  }

  function init() {
    if (!isClassicBanderQuiz()) return;
    addStyles();
    addPortalCard();
    addFloatingButton();

    const observer = new MutationObserver(() => {
      addPortalCard();
      addFloatingButton();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => observer.disconnect(), 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
