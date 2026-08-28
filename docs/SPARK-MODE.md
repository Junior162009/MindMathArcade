# MindMathArcade — modo Spark / arquitectura de publicación

> Este documento se conserva por compatibilidad histórica. La implementación actual del repositorio usa Realtime Database, Firebase Functions y GitHub Actions para procesar y publicar juegos aprobados.

## Sistema actual de juegos

- El usuario puede subir archivos del juego o indicar una URL.
- La solicitud principal se guarda en `gameSubmissions/{id}` y la carga también se registra en `gameUploadQueue/{id}`.
- Los cuatro administradores revisan la solicitud desde **🎮 Juegos enviados**.
- **Aprobar y publicar** crea `publicGameQueue/{id}` con los datos necesarios para la publicación.
- La Function `publishApprovedGame` dispara el evento `game-approved` hacia GitHub Actions.
- `.github/workflows/process-game-queue.yml` ejecuta la publicación inmediata por evento, manualmente o mediante su revisión cada 5 minutos.
- `scripts/publish-approved-games.py` publica el juego en `games/<slug>-<id>/` y actualiza `data/games.json` y `games/published-games.json`.
- Finalmente, `gameSubmissions/{id}` queda en `published` y conserva `publishedUrl`.

## Almacenamiento de juegos

No se usa Firebase Storage para los envíos actuales. Las cargas se preparan en el navegador y el paquete comprimido se guarda temporalmente en Realtime Database, con un límite de 7 MB en el formulario.

## Seguridad

Los tokens y credenciales de backend no se entregan al navegador. GitHub Actions utiliza su `GITHUB_TOKEN` interno para escribir en el repositorio; Firebase Functions y los workflows utilizan los secretos configurados en backend.

## Sobre “Spark sin Functions”

La documentación antigua de este archivo describía un sistema basado exclusivamente en URL y `publishedGames/{id}`. Esa arquitectura ya no corresponde al código vigente y no debe utilizarse como referencia técnica.

La referencia principal actual es `docs/game-submissions-final.md`.