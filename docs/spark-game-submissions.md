# Sistema de juegos y publicación automática

> Este documento refleja la arquitectura que realmente usa actualmente MindMathArcade. El nombre del archivo se conserva por compatibilidad, pero el flujo ya no utiliza `approvedGames`.

## Arquitectura actual

```text
Usuario
  ↓
🎮 SUBIR JUEGO
  ↓
gameSubmissions/{id}
  ↓
gameUploadQueue/{id}
  ↓
👑 Administrador revisa
  ↓
✅ Aprobar y publicar
  ↓
publicGameQueue/{id}
  ↓
Cloud Function publishApprovedGame
  ↓
game-approved
  ↓
GitHub Actions: process-game-queue.yml
  ↓
scripts/publish-approved-games.py
  ↓
games/<slug>-<id>/
  ├─ index.html
  └─ archivos del juego
  ↓
data/games.json
  ↓
games/published-games.json
  ↓
Catálogo de MindMathArcade
```

## Carga de juegos

El formulario `pages/upload-game.html` acepta una URL externa o una carga de archivos. En una carga local, los archivos se empaquetan en el navegador y se guardan temporalmente dentro de Realtime Database como `packageBase64`; el límite del formulario es de 7 MB comprimidos.

La propuesta se registra en `gameSubmissions/{id}` y `gameUploadQueue/{id}` con estado `pending`. El paquete debe contener `index.html` o `index.htm` para poder publicarse.

## Aprobación

El panel `pages/admin/games.html` permite:

- marcar la solicitud como `reviewing`;
- probar el juego o descargar el ZIP;
- aprobar y publicar;
- rechazar con un motivo.

Al aprobar, se actualizan `gameSubmissions/{id}` y `gameUploadQueue/{id}` a `approved` y se crea `publicGameQueue/{id}`. Esa cola contiene únicamente juegos aprobados.

## Publicación automática

`functions/index.js` detecta las aprobaciones y dispara el evento `game-approved` en GitHub. El workflow `.github/workflows/process-game-queue.yml` también se ejecuta cada 5 minutos y permite `workflow_dispatch`.

Antes de publicar, `scripts/repair-approved-queue.py` recupera aprobaciones que no hayan llegado a `publicGameQueue`. Después `scripts/publish-approved-games.py` instala el juego en `games/<slug>-<id>/`, actualiza `data/games.json` y `games/published-games.json`, y finalmente marca la solicitud como `published` junto con `publishedUrl`.

## Firebase y GitHub

El repositorio actual incluye Firebase Functions en `functions/` y una automatización de despliegue en `.github/workflows/deploy-functions-on-change.yml`. Por tanto, ya no es correcto afirmar que el sistema funciona sin Cloud Functions.

GitHub Actions usa el `GITHUB_TOKEN` interno para escribir en el repositorio. El navegador nunca recibe un token de GitHub.

## Firebase Storage y Secret Manager

El sistema actual de carga de juegos no usa Firebase Storage. Los archivos de una solicitud se mantienen temporalmente en Realtime Database y se limitan a 7 MB comprimidos.

Las automatizaciones sí usan secretos de backend, entre ellos `FIREBASE_SERVICE_ACCOUNT`, `RESEND_API_KEY`, `GITHUB_TOKEN` y `EMAIL_FROM`, según el componente que los necesite. Nunca deben exponerse en código del cliente.

## Seguridad

- `gameSubmissions` contiene las solicitudes y estados.
- `gameUploadQueue` sirve al panel administrativo y conserva el paquete de carga.
- `publicGameQueue` es pública únicamente porque el workflow necesita leer el contenido aprobado; solo los administradores y automatizaciones autorizadas pueden escribirla.
- Los cuatro administradores fundadores conservan sus privilegios.

## Importante

`approvedGames` y `publishedGames/{id}` son nombres de arquitecturas anteriores y no forman parte del flujo actual de publicación. El destino actual de una aprobación es `publicGameQueue`, y el resultado final se registra en `gameSubmissions` con estado `published` y se materializa en `games/` y en los dos catálogos JSON.