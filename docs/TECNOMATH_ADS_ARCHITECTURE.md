# TecnoMath — anuncios

## Auditoría previa

- Catálogo principal: `index.html` y `data/games.json`; el catálogo declara que su orden oficial proviene de `voting_game_order` de Supabase.
- Sistema de valoraciones/ranking: funciones y migraciones existentes de `game_ratings`; no se modifica ninguna tabla, RPC, voto ni ranking.
- Perfil/autenticación: existe integración de perfiles TecnoMath sobre Supabase Auth (`supabase/migrations/20260911_tecnomath_profiles.sql`).
- Administración: existen guardas y funciones administrativas en `js/` y `supabase/functions/`.
- Publicidad previa: no se encontró integración de AdSense, otro proveedor publicitario ni una capa `TecnoMathAds` en la búsqueda del repositorio.

## Archivos nuevos

- `assets/js/tecnomath-ads.js`: API central `TecnoMathAds`, estado Premium futuro, registro de proveedores y renderizado fail-closed.
- `assets/css/tecnomath-ads.css`: slots responsivos con espacio reservado y etiqueta de publicidad.
- `config/tecnomath-ads.js`: configuración central, desactivada hasta contar con proveedor y consentimiento reales.
- `assets/js/providers/README.md`: contrato para adaptadores de proveedores.

## Decisiones de seguridad

- No se inventan IDs ni credenciales publicitarias.
- No se agregan tablas, migraciones, RLS, Edge Functions ni cambios de Supabase.
- No se modifica catálogo, juegos, votaciones, ranking, usuarios o administración.
- Los anuncios de juegos permanecen desactivados por defecto.
- El componente falla cerrado cuando no existe un proveedor real.
- Premium no se inventa: se consulta únicamente un futuro `window.TecnoMathSubscription.isPremium()`.
- La arquitectura permite publicidad contextual/no personalizada y deja preparado el requisito de consentimiento para publicidad personalizada.

## Integración posterior

Las páginas pueden incorporar slots con la clase `tecnomath-ad-slot` y cargar `assets/js/tecnomath-ads.js` junto con `assets/css/tecnomath-ads.css`. El proveedor se registra una sola vez en el adaptador correspondiente. La configuración seguirá desactivada hasta que exista una cuenta/proveedor real y se haya definido el flujo de consentimiento aplicable.
