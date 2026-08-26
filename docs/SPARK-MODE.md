# MindMathArcade — modo Spark

Este proyecto puede funcionar sin cuenta de facturación para el sistema de usuarios y publicación en el catálogo.

## Sistema de juegos

- El usuario debe alojar su juego en una URL web.
- El formulario crea `gameSubmissions/{id}` en Realtime Database.
- Los cuatro administradores revisan la solicitud.
- **Aprobar y publicar** crea `publishedGames/{id}`.
- El catálogo lee `publishedGames` y muestra el juego.

No se suben ZIP ni imágenes a Firebase Storage en este modo.

## Limitación importante

Sin un backend con credenciales de GitHub no es seguro que una página pública escriba automáticamente en el repositorio. Por eso la aprobación publica el juego en el catálogo mediante su URL. Para que el archivo físico aparezca automáticamente dentro de `games/`, se necesitaría posteriormente un backend autorizado o un proceso manual de GitHub.

Firebase Realtime Database sigue disponible en Spark dentro de sus cuotas. urlFirebase Pricinghttps://firebase.google.com/pricing
