# Sistema de juegos enviados — versión Spark

El sistema fue adaptado para funcionar sin Cloud Functions, Firebase Storage, Secret Manager ni cuenta de facturación.

## Flujo actual

```text
Usuario inicia sesión
        ↓
🎮 SUBIR JUEGO
        ↓
Introduce nombre + descripción + categoría + URL del juego
        ↓
Realtime Database → gameSubmissions/{id}
        ↓
👑 Los 4 administradores lo revisan
        ↓
✅ Aprobar y publicar
        ↓
publishedGames/{id}
        ↓
🎮 aparece automáticamente en MindMathArcade
```

## Qué se eliminó

- Firebase Storage para los envíos.
- Cloud Functions.
- Secret Manager.
- Resend/EmailJS como requisito del backend.
- Cuenta de facturación de Google Cloud.
- GitHub token dentro de la aplicación.

El proyecto puede continuar usando el plan Spark mientras se mantenga dentro de sus cuotas de Realtime Database. Firebase indica que Spark incluye 1 GB de almacenamiento de Realtime Database y 10 GB/mes de descargas, con un límite de 100 conexiones simultáneas. urlFirebase Pricinghttps://firebase.google.com/pricing

## Cómo se publica un juego

El usuario debe tener el juego ya disponible en una URL web, por ejemplo:

- GitHub Pages
- Netlify
- Vercel
- Otro hosting web que entregue un `index.html`

El formulario guarda únicamente la URL y los metadatos en Realtime Database. El administrador prueba la URL y pulsa **Aprobar y publicar**. En ese momento se crea `publishedGames/{id}` y el catálogo lo incorpora automáticamente.

### Importante sobre la carpeta `games/`

Sin un backend con credenciales de escritura en GitHub, una página web pública **no puede modificar de forma segura el repositorio GitHub automáticamente**. Por eso esta versión publica el juego en el catálogo mediante su URL externa.

Si más adelante consigues una cuenta de facturación funcional, se puede volver a habilitar un backend para copiar automáticamente los archivos aprobados a `games/`.

## Reglas

Las reglas mantienen las funciones anteriores y añaden:

- Usuarios autenticados pueden crear su propia solicitud.
- El usuario no puede aprobarse su propio juego.
- El usuario no puede cambiar su `authorUid`.
- Los administradores pueden revisar y publicar.
- `publishedGames` es público para que el catálogo pueda leerlo.
- Los 4 administradores fundadores conservan sus privilegios.

## Firebase

El `firebase.json` de esta versión solamente despliega Realtime Database. No es necesario configurar Storage ni Functions.
