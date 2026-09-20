# Publicación inmediata de juegos Clase A

## Flujo

El Gestor de Juegos Clase A crea un registro en `tecnomath_catalog_jobs` y llama inmediatamente a la Edge Function `publish-class-a-game`.

La Edge Function:
1. valida el JWT;
2. comprueba `tecnomath_is_class_a()`;
3. lee el ZIP privado desde `game-submissions/class-a-packages/`;
4. valida y descomprime el ZIP de forma segura;
5. crea blobs en GitHub;
6. construye un único Git Tree;
7. crea un único commit;
8. actualiza `refs/heads/main` sin force;
9. actualiza el job con el SHA del commit.

GitHub Actions queda como mecanismo de respaldo y mantenimiento, no como flujo principal.

## Secretos

La Edge Function necesita un token de GitHub almacenado únicamente en los secretos de Supabase:

- Preferido: `GITHUB_PUBLISH_TOKEN`
- Compatibilidad con la instalación existente: `GITHUB_ACTIONS_TOKEN`

El token debe ser de mínimo privilegio y tener **Contents: Read and write** para `Junior162009/MindMathArcade`. No debe tener permisos globales innecesarios.

Nunca se debe colocar este token en HTML, JavaScript del navegador, localStorage, sessionStorage, URL, payload del cliente o logs.

También usa los secretos internos de Supabase para operaciones administrativas de Storage. No se exponen al navegador.

## Límite de publicación

La función valida:
- ZIP comprimido <= 100 MB
- contenido descomprimido <= 300 MB
- máximo 2500 archivos
- máximo 25 MB por archivo
- sin rutas absolutas
- sin `..`
- sin symlinks
- sin ZIP cifrado
- `index.html` obligatorio

Supabase Hosted Edge Functions tienen límites de tiempo y memoria; paquetes muy grandes pueden requerir una arquitectura de procesamiento por partes.

## Catálogo

La publicación mantiene sincronizados dentro del mismo commit:

- `data/games.json`
- `games/published-games.json`
- `games/<folder>/...`
- `img/logos/<id>.<ext>` cuando corresponde

No se recrean ni borran usuarios, perfiles, juegos, votos, progreso ni históricos.

## Caché

`js/sw.js` usa una versión de caché nueva y evita servir desde caché `data/games.json` y `games/published-games.json`. El portal ya solicita `data/games.json` con `cache: no-store`.

## Respaldo

`.github/workflows/process-class-a-game-manager.yml` y `scripts/process-class-a-game-jobs.py` permanecen como respaldo. El procesador Python reclama jobs con una actualización condicionada a `status=pending` para evitar que compita con la Edge Function por el mismo job.
