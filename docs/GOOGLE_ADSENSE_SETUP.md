# Integración de Google AdSense — TecnoMath

- Editor configurado: `ca-pub-9426294483156864`.
- El script de AdSense se carga únicamente en `index.html` (página pública de inicio/catálogo), no en juegos, votaciones, ranking ni administración.
- Se mantiene un adaptador `TecnoMathAds` para unidades manuales.
- Para renderizar una unidad manual se necesita el **ID real del bloque de anuncios** (`data-ad-slot`) que entrega AdSense. No se inventa uno.
- La biblioteca de AdSense por sí sola no muestra una unidad manual sin un ID de bloque. Los anuncios automáticos dependen de la configuración de Auto ads en la cuenta.
- Antes de activar publicidad personalizada, configura el consentimiento y los controles aplicables a usuarios menores. Verifica aprobación del sitio y cumplimiento de políticas en AdSense.
- No se garantiza que se muestren anuncios hasta que Google apruebe el sitio y la configuración esté completa.
- No se han creado productos Premium, pagos ni tablas nuevas de Supabase.
