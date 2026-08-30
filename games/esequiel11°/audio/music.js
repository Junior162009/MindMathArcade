/* TecnoMath - Música compartida para los juegos de Ezequiel
 * La misma pista, volumen, estado y posición se conservan entre:
 * - index.html (selector)
 * - quizzer.html
 * - bandera.html
 *
 * El módulo no depende de Firebase y no bloquea el arranque del juego.
 */
(function () {
  'use strict';

  if (window.__TecnoMathEzequielMusic) return;
  window.__TecnoMathEzequielMusic = true;

  // Claves compartidas: los tres juegos usan exactamente el mismo estado.
  var STORAGE_ENABLED = 'tecnomath_ezequiel_music_enabled';
  var STORAGE_VOLUME = 'tecnomath_ezequiel_music_volume';
  var STORAGE_POSITION = 'tecnomath_ezequiel_music_position';
  var AUDIO_ID = 'tecnomath-ezequiel-music';
  var DEFAULT_VOLUME = 0.30;
  var SAVE_INTERVAL = 750;

  var audio = null;
  var button = null;
  var saveTimer = null;

  function enabled() {
    return localStorage.getItem(STORAGE_ENABLED) !== 'off';
  }

  function getVolume() {
    var value = parseFloat(localStorage.getItem(STORAGE_VOLUME));
    return isFinite(value) ? Math.max(0, Math.min(1, value)) : DEFAULT_VOLUME;
  }

  function getPosition() {
    var value = parseFloat(localStorage.getItem(STORAGE_POSITION));
    return isFinite(value) && value >= 0 ? value : 0;
  }

  function savePosition() {
    if (!audio || !isFinite(audio.currentTime)) return;
    try {
      localStorage.setItem(STORAGE_POSITION, String(Math.max(0, audio.currentTime)));
    } catch (e) {
      // El almacenamiento puede estar bloqueado; la música debe seguir funcionando.
    }
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

  function setEnabled(value) {
    localStorage.setItem(STORAGE_ENABLED, value ? 'on' : 'off');
    updateButton();
    if (!audio) return;
    if (value) {
      play();
    } else {
      savePosition();
      audio.pause();
    }
  }

  function createAudio() {
    audio = document.createElement('audio');
    audio.id = AUDIO_ID;
    audio.src = 'audio/musica.mp3';
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = getVolume();
    audio.setAttribute('playsinline', '');

    var savedPosition = getPosition();
    if (savedPosition > 0) {
      audio.addEventListener('loadedmetadata', function restorePosition() {
        try {
          if (isFinite(audio.duration) && audio.duration > 0) {
            audio.currentTime = Math.min(savedPosition, Math.max(0, audio.duration - 0.25));
          }
        } catch (e) {
          // Algunos navegadores todavía no permiten cambiar currentTime aquí.
        }
        audio.removeEventListener('loadedmetadata', restorePosition);
      });
    }

    audio.addEventListener('timeupdate', savePosition);
    audio.addEventListener('pause', savePosition);
    audio.addEventListener('ended', savePosition);
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

  function syncFromOtherPage(event) {
    if (!event || event.storageArea !== localStorage || !audio) return;

    if (event.key === STORAGE_ENABLED) {
      updateButton();
      if (event.newValue === 'off') {
        savePosition();
        audio.pause();
      } else {
        play();
      }
    }

    if (event.key === STORAGE_VOLUME) {
      audio.volume = getVolume();
    }
  }

  function init() {
    if (!document.body) return;
    createAudio();
    createButton();

    // Guarda la posición periódicamente para que al pasar al siguiente juego
    // la misma canción continúe prácticamente desde el mismo punto.
    saveTimer = window.setInterval(savePosition, SAVE_INTERVAL);

    if (enabled()) play();

    ['click', 'touchstart', 'keydown'].forEach(function (eventName) {
      document.addEventListener(eventName, function firstInteraction() {
        if (enabled()) play();
        document.removeEventListener(eventName, firstInteraction);
      }, { passive: true });
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        savePosition();
      } else if (enabled()) {
        play();
      }
    });

    window.addEventListener('storage', syncFromOtherPage);
    window.addEventListener('pagehide', savePosition);
    window.addEventListener('beforeunload', function () {
      savePosition();
      if (saveTimer) window.clearInterval(saveTimer);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
