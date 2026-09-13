CARPETA DE RECURSOS — NOVA MATH
===============================

Este juego funciona SIN archivos externos (usa síntesis WebAudio y gráficos
generados por canvas). Puedes dejarla vacía.

Si más adelante quieres usar sonidos reales:
  1) Crea la subcarpeta:  assets/sounds/
  2) Copia estos archivos (opcionales):
        correct.mp3
        wrong.mp3
        click.mp3
        win.mp3
        lose.mp3
        level.mp3
        shoot.mp3
        power.mp3
  3) Abre  js/game.js  y cambia:
        const USE_AUDIO_FILES = false;   →   true;

Si algún archivo falta, el juego usará automáticamente el sonido sintetizado,
sin mostrar errores en consola.

Rutas relativas (compatibles con MindMathArcade):
    assets/
    css/
    js/