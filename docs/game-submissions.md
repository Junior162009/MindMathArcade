# Sistema de envío y publicación de juegos

## Flujo actual

1. El usuario inicia sesión y pulsa **🎮 SUBIR JUEGO**.
2. Puede subir archivos del juego (se empaquetan en ZIP en el navegador) o proporcionar una URL. Para cargas de archivos, el paquete comprimido debe ser de máximo 7 MB y contener `index.html` o `index.htm`.
3. La propuesta se guarda en `gameSubmissions/{id}` y, para mantener compatibilidad con el panel administrativo y las cargas, también se registra en `gameUploadQueue/{id}` con estado `pending`.
4. La Cloud Function `notifyGameSubmission` envía el aviso de nueva solicitud a los administradores.
5. En **🎮 Juegos enviados**, un administrador puede marcar el juego como `reviewing`, probarlo, aprobarlo o rechazarlo.
6. Al aprobar, el panel guarda el estado `approved` en `gameSubmissions/{id}` y `gameUploadQueue/{id}` y crea `publicGameQueue/{id}` con todos los datos necesarios para publicar.
7. La Cloud Function `publishApprovedGame` garantiza que la entrada aprobada esté en `publicGameQueue` y dispara el evento `game-approved` de GitHub Actions.
8. El workflow `.github/workflows/process-game-queue.yml` consulta `publicGameQueue`, recupera también aprobaciones que hayan quedado fuera de la cola y ejecuta `scripts/publish-approved-games.py`.
9. El script publica los archivos aprobados en `games/<slug>-<id>/`, actualiza `data/games.json` y `games/published-games.json`, y después marca la solicitud como `published` con `publishedUrl`.
10. El catálogo de MindMathArcade utiliza el catálogo generado desde GitHub para mostrar los juegos publicados.

## Componentes del sistema

- `gameSubmissions`: registro principal de la solicitud y su estado.
- `gameUploadQueue`: datos usados por el panel de administración y para conservar el paquete de una carga.
- `publicGameQueue`: cola pública de **solo juegos aprobados** que consume el workflow de publicación.
- `games/`: archivos físicos de los juegos ya publicados.
- `data/games.json`: catálogo maestro generado por el publicador.
- `games/published-games.json`: copia del catálogo publicado.
- `functions/index.js`: notificación de nuevas solicitudes y activación automática de la publicación después de una aprobación.
- `.github/workflows/process-game-queue.yml`: publicación automática por evento, manual o cada 5 minutos.
- `scripts/repair-approved-queue.py`: recuperación de aprobaciones que no hayan llegado a `publicGameQueue`.
- `scripts/publish-approved-games.py`: validación, instalación del juego, actualización de catálogos y marcado como `published`.

## Backend y secretos

El repositorio actual sí utiliza Firebase Functions para automatizar el flujo y GitHub Actions para escribir los archivos publicados en el propio repositorio.

Secretos utilizados por las automatizaciones:

```text
FIREBASE_SERVICE_ACCOUNT
RESEND_API_KEY
```

La Cloud Function usa los secretos administrados por Firebase para enviar correos y disparar GitHub. GitHub Actions usa `FIREBASE_SERVICE_ACCOUNT` para autenticar la lectura/escritura de Realtime Database y su `GITHUB_TOKEN` interno para escribir en `games/` y los catálogos del repositorio.

No se coloca ningún token de GitHub dentro del HTML o JavaScript del navegador.

## Despliegue

Para desplegar Realtime Database y las Functions desde Firebase CLI:

```bash
firebase login
npm install -g firebase-tools
cd functions
npm install
cd ..
firebase deploy --only database,functions
```

El workflow `.github/workflows/deploy-functions-on-change.yml` también despliega automáticamente las Functions cuando cambian `functions/**`, `firebase.json` o el propio workflow.

## Seguridad

- Solo usuarios autenticados pueden crear su propia solicitud.
- El autor conserva su `authorUid` y no puede aprobarse a sí mismo desde el navegador.
- Los cuatro administradores fundadores mantienen acceso administrativo.
- `publicGameQueue` puede leerse públicamente porque contiene únicamente juegos que ya fueron aprobados y el workflow necesita consumirlos.
- La publicación real en `games/` ocurre en GitHub Actions, no desde el navegador.

## Nota sobre el modo Spark

Este flujo debe documentarse como la arquitectura **actual** del repositorio. Los documentos antiguos que describían `approvedGames`, `publishedGames/{id}` como destino directo o un sistema sin Functions/GitHub Actions estaban desactualizados y se han alineado con este flujo.