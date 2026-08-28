# MindMathArcade — estado del sistema de publicación

Este documento corrige la descripción anterior del modo Spark. La implementación vigente utiliza Realtime Database para las solicitudes, Firebase Functions para automatizaciones y GitHub Actions para publicar los juegos aprobados.

Flujo vigente:

`gameSubmissions` → `gameUploadQueue` → aprobación administrativa → `publicGameQueue` → `publishApprovedGame` → GitHub Actions → `games/` + catálogos JSON → MindMathArcade.

Los juegos cargados no usan Firebase Storage; el formulario empaqueta las cargas y conserva temporalmente el paquete en Realtime Database, con límite de 7 MB comprimidos.

La publicación no se realiza escribiendo desde el navegador. GitHub Actions usa su `GITHUB_TOKEN` interno para modificar el repositorio después de que una solicitud haya sido aprobada.

Los nombres `approvedGames` y `publishedGames/{id}` pertenecen a diseños anteriores y no son parte del flujo actual.

Consulta `docs/game-submissions-final.md` como referencia principal de la arquitectura actual.