# Sistema de juegos en Spark (sin Billing)

## Arquitectura

Usuario → `gameSubmissions` → administrador → `approvedGames` → GitHub Actions → `games/` → `games/published-games.json` → catálogo.

No utiliza Cloud Functions, Firebase Storage, Secret Manager ni cuenta de facturación.

## Límites

El formulario limita el ZIP a 7 MB y la portada a 1 MB. Esto deja margen frente a los límites de escritura del SDK de Realtime Database.

## Publicación

`.github/workflows/publish-approved-games.yml` revisa la cola cada 5 minutos y también admite `workflow_dispatch`. GitHub Actions usa su `GITHUB_TOKEN` interno para escribir en el propio repositorio; no se entrega ningún token de GitHub al usuario.

## Seguridad

- `gameSubmissions`: solo el autor y los cuatro administradores pueden leer; solo el autor puede crear su solicitud y los administradores pueden revisarla.
- `approvedGames`: lectura pública únicamente porque contiene juegos que ya fueron aprobados y el workflow necesita descargarlos sin credenciales de Firebase.
- Los cuatro fundadores siguen siendo administradores protegidos.

## Firebase

`firebase.json` solo referencia Realtime Database. No es necesario desplegar Storage ni Functions.
