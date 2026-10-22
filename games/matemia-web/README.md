# MATEMIA Web nativo

Adaptación jugable en HTML, CSS y JavaScript, integrada como página independiente de TecnoMath Arcade.

Controles: WASD/flechas para mover, E para interactuar, Espacio para atacar, Escape para pausa, I para consultar inventario. Incluye controles táctiles.

Implementa Canvas 2D, colisiones, cofres con preguntas matemáticas, pistas, recompensas, enemigos con comportamientos distintos, combate, vida, experiencia, niveles, monedas, cristales, pociones y progreso de misión. Consulta Openverse de forma opcional sin claves; la partida funciona aunque la API falle.

La versión web inicial adapta las mecánicas principales observadas en el código Python/Pygame. Aún no replica todo el mundo original, tienda completa, NPC, misiones ramificadas ni sincronización de progreso con Supabase. No crea tablas, buckets ni políticas. El progreso de esta versión es temporal; la futura carga de imágenes propias debe integrarse tras auditar permisos y almacenamiento existentes.