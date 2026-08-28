# Sistema de juegos enviados — arquitectura actual

Este documento reemplaza la descripción anterior del sistema Spark. La implementación actual sí utiliza Firebase Functions para automatizar la aprobación y GitHub Actions para publicar los archivos en el repositorio.

## Flujo actual

```text
Usuario inicia sesión
        ↓
🎮 SUBIR JUEGO
        ↓
gameSubmissions/{id} + gameUploadQueue/{id}
        ↓
👑 Administrador revisa
        ↓
✅ Aprobar y publicar
        ↓
publicGameQueue/{id}
        ↓
Firebase Function: publishApprovedGame
        ↓
GitHub repository_dispatch: game-approved
        ↓
GitHub Actions: process-game-queue.yml
        ↓
scripts/publish-approved-games.py
        ↓
games/<slug>-<id>/
        ↓
data/games.json + games/published-games.json
        ↓
🎮 catálogo de MindMathArcade
```

## Carga

El formulario permite subir archivos del juego o usar una URL externa. Las cargas se empaquetan en el navegador y se conservan temporalmente en Realtime Database. El formulario limita el paquete comprimido a 7 MB y exige `index.html` o `index.htm` para las cargas.

## Estados

Una solicitud puede pasar por `pending`, `reviewing`, `approved`, `rejected` y finalmente `published`.

Al aprobar, se guarda `approvedAt` y `approvedBy`, se actualizan `gameSubmissions` y `gameUploadQueue`, y se crea `publicGameQueue/{id}`. Después de una publicación correcta, `gameSubmissions/{id}` recibe `status: published`, `publishedAt` y `publishedUrl`.

## Componentes

- `pages/upload-game.html`: formulario de envío.
- `pages/admin/games.html`: revisión, prueba, aprobación y rechazo.
- `functions/index.js`: notificaciones y disparo de la publicación automática.
- `.github/workflows/process-game-queue.yml`: consumidor de `publicGameQueue`, ejecutado por evento, manualmente o cada 5 minutos.
- `scripts/repair-approved-queue.py`: recupera aprobaciones que no hayan llegado a la cola pública.
- `scripts/publish-approved-games.py`: publica los archivos y actualiza los catálogos.
- `data/games.json`: catálogo maestro.
- `games/published-games.json`: copia del catálogo generado.

## Lo que ya no debe documentarse como arquitectura actual

Los nombres `approvedGames` y `publishedGames/{id}` pertenecen a diseños anteriores. Tampoco es correcto afirmar que el sistema actual funciona solamente con URL externas o que no utiliza Functions. Esas descripciones fueron sustituidas por el flujo de `gameSubmissions → publicGameQueue → GitHub Actions`.

## Secretos y seguridad

No se expone ningún token de GitHub al navegador. Las funciones y workflows utilizan secretos de backend y el `GITHUB_TOKEN` interno de GitHub Actions. Las reglas de Realtime Database restringen la creación y modificación de solicitudes a sus autores y administradores según corresponda.

## Nota sobre Spark

Realtime Database sigue siendo parte del sistema, pero la etiqueta “modo Spark sin Functions” de los documentos anteriores ya no describe la implementación actual. Este archivo debe considerarse la referencia correcta del flujo de publicación vigente.