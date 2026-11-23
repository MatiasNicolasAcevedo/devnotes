# Publicación en YouTube

Textos y archivos del tráiler v2 ([T-095](../../docs/tasks/T-095-trailer-v2.md)) y de la demo narrada ([T-096](../../docs/tasks/T-096-narrated-demo.md)). Los videos no se versionan porque YouTube los aloja y se regeneran desde las fuentes. Las miniaturas sí se versionan en [`youtube/`](youtube/), en JPG livianos, para usarlas como portada en la página Demo.

## Publicados

Subidos por el dueño el 2026-11-23.

| Video | Enlace | ID | Embed sin cookies | Portada |
|---|---|---|---|---|
| Tráiler | https://youtu.be/-xhokMtK-Hw | `-xhokMtK-Hw` | `https://www.youtube-nocookie.com/embed/-xhokMtK-Hw` | [`youtube/miniatura-trailer.jpg`](youtube/miniatura-trailer.jpg) |
| Demo | https://youtu.be/XAIHdmHAhA0 | `XAIHdmHAhA0` | `https://www.youtube-nocookie.com/embed/XAIHdmHAhA0` | [`youtube/miniatura-demo.jpg`](youtube/miniatura-demo.jpg) |

## Archivos locales

| Video | Archivo | Miniatura (1280×720) | Subtítulos |
|---|---|---|---|
| Tráiler | `media/trailer-v2/renders/devnotes-trailer-v2-16x9.mp4` (46 s) | `media/demo/youtube/miniatura-trailer.jpg` | Sin locución |
| Demo | `media/demo/build/demo.mp4` (5:53) | `media/demo/youtube/miniatura-demo.jpg` | `media/demo/build/demo.es.srt`, español |

Las miniaturas se regeneran con `node media/demo/scripts/thumbs.mjs`, que además deja un PNG en `media/demo/build/youtube/`.

Para la demo conviene subir `demo.mp4` y cargar `demo.es.srt` como subtítulos en español, porque así se pueden activar y desactivar. `demo-subtitulado.mp4` queda como copia con subtítulos quemados.

## Tráiler

**Título.** DevNotes · Tráiler: tu cuaderno de trabajo diario

**Descripción.**

```text
DevNotes es un cuaderno de trabajo diario para quien programa. Escribís en un editor con líneas numeradas y autoguardado, pasás una captura o una nota de voz a texto, ordenás tus notas libres con títulos, listas y bloques de código, y consultás un fragmento con IA sin salir de tus notas.

Funciona en escritorio y en el teléfono, separa Trabajo y Personal, y te deja exportar e importar tus datos en Excel.

Demo completa, paso a paso: https://youtu.be/XAIHdmHAhA0

Música original sintetizada para este tráiler. Datos y cuentas de prueba.
```

## Demo

**Título.** DevNotes · Demo completa: todas las funciones paso a paso

**Descripción.**

```text
Recorrido completo por DevNotes, narrado y con subtítulos en español. Empieza en una jornada vacía y termina recuperando todo lo creado en otra cuenta.

Capítulos
0:00 Ingreso y espacios Trabajo/Personal
0:47 Diario: enlaces, separadores, autoguardado, versiones e historial
2:01 Referencias y lectura al lado
2:39 Notas libres: listas, títulos, negrita y código
3:23 Voz: grabar, transcribir y guardar
3:45 Imagen: de una captura a texto
4:07 IA: proveedor, fragmento y respuesta
4:44 Respaldo: exportar e importar en una cuenta vacía
5:25 En el teléfono

La demo usa cuentas, datos y proveedores de prueba.
Voz: Sofía, generada con ElevenLabs. Música original sintetizada para este recorrido.

Tráiler: https://youtu.be/-xhokMtK-Hw
```
