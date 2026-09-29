# Horror School — Prueba WebGL aislada

Esta carpeta es una **prueba independiente**.

## Regla de seguridad

NO modificar:
- `games/downloader/HorrorSchool/`
- el ZIP/Build original
- el catálogo oficial

## Estructura esperada

```
games/horror-school-test/
├── index.html
├── README.md
└── webgl/
    ├── index.html
    ├── Build/
    ├── TemplateData/
    └── StreamingAssets/   (si Unity lo genera)
```

## Qué se está probando

La página intenta cargar `./webgl/index.html`.

Un `.exe` de Unity **no se puede ejecutar directamente dentro de Chrome/Edge**. Para jugar desde la web hay que exportar el proyecto de Unity como **WebGL**.

La versión Windows original continúa disponible mediante el botón de descarga y no se modifica.

## Siguiente paso

Exportar Horror School desde Unity con:

**File → Build Settings → WebGL → Build**

Después colocar el resultado dentro de:

`games/horror-school-test/webgl/`

y probar:

`/games/horror-school-test/`
