# MATEMIA Web nativo — TecnoMath Arcade

Adaptación de las mecánicas principales de MATEMIA a HTML, CSS y JavaScript con Canvas 2D. Se ejecuta en navegador y no requiere Python/Pygame.

## Sistemas implementados
- Cuatro áreas conectadas: Pueblo de Matemia, Bosque de los Números, Ruinas de las Operaciones y Cueva de los Cristales.
- Mapas con colisiones, portales, cofres, personajes no jugadores y enemigos.
- NPC: Anciano para misiones y recompensas, Mara comerciante, Profesor Euclides y viajero.
- Tienda con pociones de vida, velocidad, fuerza, defensa, energía de ataque y llave.
- Misiones con objetivos, progreso y recompensas: conversación, cofres, combate, exploración y operaciones avanzadas.
- Desafíos generados: suma, resta, multiplicación, división exacta, potencias, raíces y operaciones mixtas.
- Enemigos patrulleros, guardianes, pasivos, agresivos, de distancia y un guardián jefe.
- Combate a distancia, proyectiles, vida, XP, niveles, monedas, inventario, efectos temporales y reaparición.
- Guardado y carga local en el navegador. No sincroniza progreso con Supabase.
- Adaptación móvil y controles táctiles.

## Recursos externos
El cliente consulta Openverse para ilustraciones de bosque, ruinas, cueva, cofres, criaturas, NPC y jugador. Se filtran resultados de licencias CC0, dominio público, CC BY y CC BY-SA; la interfaz muestra título, autor y enlaces a la ficha y licencia cuando existen. Openverse advierte que la información de licencia debe verificarse en la ficha original. Si falla la API o una imagen, el juego dibuja recursos de reserva con Canvas y sigue funcionando.

API utilizada: https://api.openverse.org/v1/images/  
Documentación: https://api.openverse.org/v1/

## Controles
- WASD / flechas: movimiento.
- E: interactuar con cofres, NPC y portales.
- Espacio o clic: atacar a la criatura más cercana.
- M: mapa, I: inventario, Q: misiones, T: tienda cerca de Mara.
- Escape: cerrar panel o pausar.

## Alcance pendiente
La adaptación es una reimplementación web inspirada en los sistemas del original Python/Pygame, no una conversión pixel-perfect. No incorpora aún sincronización de progreso en Supabase, editor para subir imágenes propias ni todas las escenas y diálogos del juego de escritorio. No modifica tablas, buckets ni políticas de Supabase.