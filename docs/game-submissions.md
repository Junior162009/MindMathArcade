# Sistema de envío de juegos

## Flujo

1. El usuario inicia sesión y pulsa **🎮 SUBIR JUEGO**.
2. Sube un ZIP con `index.html` y completa nombre, descripción y categoría.
3. El ZIP se guarda temporalmente en Firebase Storage y la solicitud queda en `gameSubmissions/{id}` con estado `pending`.
4. Los administradores fundadores reciben un correo automático mediante la Cloud Function `notifyGameSubmission`.
5. En el panel de administración aparece **🎮 Juegos enviados**.
6. Un administrador puede aprobar o rechazar.
7. Al aprobar, `publishApprovedGame` publica el contenido del ZIP dentro de `games/<slug>-<id>/` en la rama `main` del repositorio.
8. La solicitud pasa a `published` y guarda `publishedUrl`.

## Requisitos de backend

Desde Firebase CLI, dentro de la raíz del proyecto:

```bash
firebase login
npm install -g firebase-tools
cd functions
npm install
cd ..
```

Configura los secretos:

```bash
firebase functions:secrets:set RESEND_API_KEY
firebase functions:secrets:set EMAIL_FROM
firebase functions:secrets:set GITHUB_TOKEN
```

- `RESEND_API_KEY`: clave de API de Resend para enviar los avisos.
- `EMAIL_FROM`: remitente verificado, por ejemplo `TecnoMath <avisos@tu-dominio.com>`.
- `GITHUB_TOKEN`: token de GitHub con permiso para escribir contenido/git en `Junior162009/MindMathArcade`.

Después:

```bash
firebase deploy --only database,storage,functions
```

El token de GitHub **nunca** debe colocarse dentro de HTML o JavaScript del navegador. La publicación a `games/` se hace únicamente desde la Cloud Function.

## Reglas

- `firebase-database.rules.json` contiene las reglas de Realtime Database.
- `storage.rules` restringe las cargas a usuarios autenticados y limita el ZIP a 20 MB.
- Los cuatro administradores fundadores conservan acceso administrativo.
