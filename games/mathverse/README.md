# 🎮 TECNOMATH: MATHVERSE — MVP

Mathverse es un juego oficial de TecnoMath. El MVP implementa **Ciudad de las Variables** como una experiencia de exploración 2D donde las soluciones matemáticas producen cambios visibles en el mundo.

## Arquitectura

- `mathverse-data.js`: contenido declarativo de zona, problemas, herramientas y progresión.
- `mathverse.js`: estado, movimiento, validación, consecuencias, XP, telemetría y guardado.
- `mathverse.css`: HUD y presentación responsive.
- `js/tecnomath-progress.js`: sistema central de progreso de TecnoMath + Supabase existente.
- Catálogo: `data/games.json` y `games/published-games.json`.

El juego usa el identificador estable `mathverse` para el progreso.

## Motor matemático / consecuencias

El contenido se separa del mundo: cada problema tiene una respuesta validable, pistas y un `effect`. El motor de juego registra el resultado y aplica el efecto al mundo sin mezclar la lógica del catálogo.

La estructura está preparada para añadir zonas mediante nuevos objetos de contenido:

- Circuito Vectorial
- MegaConstrucción
- Ciudad Económica
- Laboratorio del Caos

## Guardado y telemetría

El estado se guarda localmente como respaldo y se sincroniza mediante `TecnoMathProgress` cuando existe sesión/Supabase. Los eventos educativos se conservan en el progreso del juego: `problem_started` puede añadirse al iniciar una interacción, además de `problem_attempted`, `problem_solved`, `problem_failed`, `hint_used`, `zone_unlocked` y `xp_gained`.

No se almacenan contraseñas, tokens ni secretos.

## Controles

PC: WASD / flechas + E. Esc pausa.

Móvil/tablet: controles táctiles.
