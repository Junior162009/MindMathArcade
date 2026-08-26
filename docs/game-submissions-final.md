# Sistema de juegos enviados — versión sin facturación

El sistema fue adaptado para funcionar sin Cloud Functions, sin Firebase Storage y sin una cuenta de facturación de Google Cloud.

## Archivos principales

- `pages/upload-game.html`: formulario de envío.
- `js/game-submissions.js`: guarda el ZIP en Realtime Database, muestra las solicitudes y publica desde el panel admin.
- `js/admin-guard.js`: carga el módulo de juegos enviados dentro del panel de administradores.
- `js/published-games.js`: incorpora automáticamente los juegos publicados al catálogo.
- `firebase-database.rules.json`: permisos y validaciones de los envíos.
- `firebase.json`: únicamente despliega las reglas de Realtime Database.

## Cómo funciona

```text
Usuario inicia sesión
        ↓
🎮 SUBIR JUEGO
        ↓
ZIP convertido a Base64
        ↓
Realtime Database /gameSubmissions
        ↓
Estado: pending
        ↓
👑 Panel de los 4 administradores
        ↓
✅ Aprobar
        ↓
🚀 Publicar en GitHub
        ↓
games/<juego-id>/index.html
        ↓
publishedGames/<id>
        ↓
🎮 aparece automáticamente en MindMathArcade
```

## Límite

Para evitar Firebase Storage, el ZIP tiene un límite de **7 MB**. La base de datos guarda el contenido como Base64, por lo que el archivo ocupa más que su tamaño original. Realtime Database permite strings de hasta 10 MB y el plan Spark incluye 1 GB de almacenamiento y 10 GB/mes de descargas. urlLímites de Realtime Databasehttps://firebase.google.com/docs/database/usage/limits

## Publicación en GitHub

La publicación ya no necesita Cloud Functions.

Un administrador introduce temporalmente un **Fine-grained Personal Access Token** en el panel. El token:

- no se guarda en Firebase;
- no se guarda en GitHub;
- solamente permanece en `sessionStorage` de esa pestaña;
- puede limpiarse con el botón **Limpiar token**.

El token debe estar limitado al repositorio `Junior162009/MindMathArcade` y tener **Contents → Read and write**. GitHub documenta que el endpoint de creación/actualización de contenidos admite tokens fine-grained con permiso `Contents: write`. urlGitHub — Create or update file contentshttps://docs.github.com/en/rest/repos/contents

## Firebase

Ya no necesitas desplegar:

```text
storage
functions
```

Solo las reglas de Realtime Database:

```bash
firebase deploy --only database
```

Los cuatro administradores fundadores continúan siendo:

- Junior — `delahozbarcelojunior@gmail.com`
- Nicole — `nicolenatera26@gmail.com`
- Mateo — `mateobarbosamatos@gmail.com`
- Jaider — `jandresvf23@gmail.com`

## Correos

El correo automático mediante Cloud Functions fue eliminado de esta versión porque requería backend/facturación. El panel de administradores funciona como centro de notificaciones: muestra las solicitudes pendientes a los cuatro administradores.
