# Sistema de juegos enviados — puesta en marcha final

El código del sistema ya está en el repositorio:

- `pages/upload-game.html`: formulario para usuarios.
- `js/game-submissions.js`: subida a Storage y panel de revisión.
- `js/published-games.js`: incorpora automáticamente los juegos publicados al catálogo.
- `functions/index.js`: avisa a los 4 fundadores y publica el ZIP aprobado en `games/`.
- `firebase-database.rules.json`: permisos de Realtime Database.
- `storage.rules`: permisos y límite de archivos.

## 1. Instalar Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

Selecciona el proyecto `tecnomath-sync-6058a`.

## 2. Instalar las Functions

Desde la raíz del repositorio:

```bash
cd functions
npm install
cd ..
```

## 3. Crear los secretos de Google Cloud Secret Manager

```bash
firebase functions:secrets:set RESEND_API_KEY
firebase functions:secrets:set EMAIL_FROM
firebase functions:secrets:set GITHUB_TOKEN
```

Firebase pedirá el valor de cada secreto de forma interactiva. No los pongas en HTML, JavaScript del navegador ni en el repositorio.

### RESEND_API_KEY

La clave de API de Resend que utilizará `notifyGameSubmission`.

### EMAIL_FROM

El remitente que tengas autorizado en Resend. Ejemplo:

```text
TecnoMath <avisos@tecnomath.online>
```

### GITHUB_TOKEN

Token de GitHub con permiso de escritura sobre `Junior162009/MindMathArcade`. Se utiliza únicamente desde Cloud Functions para crear los archivos aprobados dentro de `games/`.

## 4. Desplegar

```bash
firebase deploy --only database,storage,functions
```

Las funciones usan Secrets de Firebase/Google Cloud, por lo que el despliegue debe realizarse después de configurar los tres secretos.

## 5. Flujo final

```text
Usuario inicia sesión
        ↓
🎮 SUBIR JUEGO
        ↓
ZIP → Firebase Storage
        ↓
gameSubmissions/{id} = pending
        ↓
📧 correo a Junior, Nicole, Mateo y Jaider
        ↓
Panel de administración
        ↓
✅ Aprobar / ❌ Rechazar
        ↓
Cloud Function
        ↓
GitHub → games/nombre-id/
        ↓
publishedGames/{id}
        ↓
🎮 aparece automáticamente en el catálogo
```

## Importante

Aprobar desde el navegador **no publica directamente en GitHub**. El navegador solamente cambia el estado de la solicitud. La publicación la realiza `publishApprovedGame` en Cloud Functions con el secreto `GITHUB_TOKEN`.

Los cuatro administradores fundadores son:

- Junior — `delahozbarcelojunior@gmail.com`
- Nicole — `nicolenatera26@gmail.com`
- Mateo — `mateobarbosamatos@gmail.com`
- Jaider — `jandresvf23@gmail.com`
