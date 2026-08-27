/* TecnoMath - Música de fondo para el juego de Ezequiel
 * Coloca el archivo de audio en: audio/musica.mp3
 * Este módulo no depende de Firebase y no bloquea el arranque del juego.
 */
(function () {
  'use strict';

  if (window.__TecnoMathEzequielMusic) return;
  window.__TecnoMathEzequielMusic = true;

  var STORAGE_KEY = 'tecnomath_esequiel_music_enabled';
  var VOLUME_KEY = 'tecnomath_esequiel_music_volume';
  var audio = null;
  var button = null;

  function enabled() {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  }

  function setEnabled(value) {
    localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off');
    updateButton();
    if (!audio) return;
    if (value) {
      play();
    } else {
      audio.pause();
    }
  }

  function volume() {
    var value = parseFloat(localStorage.getItem(VOLUME_KEY));
    return isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.30;
  }

  function updateButton() {
    if (!button) return;
    var on = enabled();
    button.textContent = on ? '🔊 Música' : '🔇 Música';
    button.setAttribute('aria-label', on ? 'Apagar música' : 'Encender música');
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function play() {
    if (!audio || !enabled()) return;
    var promise = audio.play();
    if (promise && typeof promise.catch === 'function') {
      promise.catch(function () {
        // El navegador puede bloquear autoplay. La primera interacción lo reintentará.
      });
    }
  }

  function createAudio() {
    audio = document.createElement('audio');
    audio.id = 'tecnomath-esequiel-music';
    audio.src = 'audio/musica.mp3';
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = volume();
    audio.setAttribute('playsinline', '');
    document.body.appendChild(audio);
  }

  function createButton() {
    button = document.createElement('button');
    button.type = 'button';
    button.id = 'tecnomath-music-toggle';
    button.style.cssText = [
      'position:fixed',
      'right:16px',
      'bottom:16px',
      'z-index:99999',
      'border:1px solid rgba(168,201,255,.25)',
      'border-radius:999px',
      'padding:9px 13px',
      'background:rgba(10,20,50,.92)',
      'color:#edf4ff',
      'font:600 13px system-ui,sans-serif',
      'cursor:pointer',
      'box-shadow:0 8px 25px rgba(0,0,0,.3)',
      'backdrop-filter:blur(8px)'
    ].join(';');
    button.addEventListener('click', function () {
      setEnabled(!enabled());
    });
    document.body.appendChild(button);
    updateButton();
  }

  function init() {
    if (!document.body) return;
    createAudio();
    createButton();

    // Intentar iniciar; si el navegador bloquea autoplay, se reintenta
    // después de la primera interacción del usuario.
    if (enabled()) play();

    ['click', 'touchstart', 'keydown'].forEach(function (eventName) {
      document.addEventListener(eventName, function firstInteraction() {
        if (enabled()) play();
        document.removeEventListener(eventName, firstInteraction);
      }, { passive: true });
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && enabled()) play();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
