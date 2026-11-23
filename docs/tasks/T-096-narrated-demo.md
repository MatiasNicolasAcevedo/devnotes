---
id: T-096
status: in_review
priority: P2
size: M
milestone: M9
spec: null
depends_on: [T-095]
branch: codex/t-096-narrated-demo
role: implementer
executor: frontier
pr: 92
---

# T-096 · Demo guiada de toda la aplicación

## Objetivo

Entregar, después del tráiler v2, un recorrido reproducible en español que enseñe cada función entregada y la vincule con su acción en pantalla, locución y subtítulo. Guion y recorrido se cierran antes de generar audio.

## Alcance

1. Fijar el SHA, inventariar rutas, controles y permisos desde la aplicación probada y crear una matriz función → capítulo → acción → resultado visible. Preparar una cuenta y dos espacios con material ficticio. Usar el flujo de login de prueba. Partir de una jornada vacía y terminar con la recuperación de la información creada.
2. Recorrer ingreso, navegación y Trabajo/Personal → escribir el diario, enlaces, separadores, autoguardado y copiar día anterior → guardar versión y volver al historial → consultar Referencias y lectura al lado → crear/editar Libres con listas, código, títulos y negrita → grabar/revisar/copiar/guardar Voz y pegar/extraer/guardar Imagen → elegir proveedor/modelo, previsualizar fragmento, enviar y copiar → exportar/importar respaldo en una cuenta ficticia vacía. Cubrir acciones secundarias verdaderamente disponibles (incluidos borrado, estados y ajustes) en la matriz. Mostrar variaciones de móvil cuando cambie el gesto. Corregir el guion ante diferencias observadas.
3. Escribir por escena un ID estable, ruta/estado inicial, gesto, diálogo exacto, resultado, pausa y tiempo previsto. Ensayar el recorrido en silencio y cerrar textos y orden. Verificar en la cuenta ElevenLabs que `h60rOzgfLmYsntfqgGu2` corresponde a Sofía y está disponible con Starter. La clave se inyecta al proceso local de producción. Usar solo texto ficticio del guion. Si la voz no coincide, devolver el dato al dueño antes de consumir caracteres. Generar una muestra corta y luego un clip por escena con el crédito incluido, reusar clips por texto y voz. Si se agotara el saldo, registrar los clips pendientes y el punto de retoma.
4. Capturar el recorrido, montar acción y voz sobre la duración real de cada clip y generar SRT UTF-8 numerado con tiempos finales. Entregar guion editable, matriz, recorrido, SRT y video narrado con subtítulos seleccionables o SRT adjunto. Una copia con subtítulos quemados es opcional. Registrar fuentes y ubicación de los medios reproducibles.

## Aceptación y pruebas

Toda función habilitada del SHA tiene una escena o una razón verificable de exclusión por entorno/permiso. La narración nombra el control cuando aparece, deja oír la explicación hasta el final y el resultado queda visible. Revisar reproducción completa con y sin audio, sincronía en cada cambio de capítulo, cues ordenados sin solapamiento ni texto cortado. Ejecutar `ffprobe -v error -show_entries stream=codec_type,width,height:format=duration -of json demo.mp4` y `ffprobe -v error -show_packets -select_streams s -show_entries packet=pts_time,duration_time -of csv demo.es.srt`. Cotejar último cue contra duración real y comprobar caracteres españoles en el reproductor. Gate documental, CI del HEAD y FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Checkpoint vigente

2026-11-23. Frontera implementer en Claude Code desktop (Claude Opus 5.5, `claude-opus-5-5`), Git Bash, PowerShell, Git, gh, Docker Desktop, Node 24 y ffmpeg/ffprobe 9.0.2. Listo para revisión en el [PR #92](https://github.com/MatiasNicolasAcevedo/devnotes/pull/92). Commits técnicos `6ec874c` y `2aa948a` (demo) y `24978e5` (miniaturas) sobre `origin/main` `b0e46a3`. Impacto: solo `media/demo/`, el spec nuevo `e2e/tests/demo-tour.spec.ts` y documentos. Sin cambios de comportamiento, API, permisos, datos ni UI del producto. T-095 conciliada en `64fd9a1`.

**Entregables.** Guion editable [`script.json`](../../media/demo/script.json) y legible [`GUION.md`](../../media/demo/GUION.md): 37 escenas en 9 capítulos, con ID, ruta, gesto, diálogo, resultado, pausa, tiempo previsto e inicio final. Matriz y exclusiones en [`MATRIZ.md`](../../media/demo/MATRIZ.md). Recorrido en [`demo-tour.spec.ts`](../../e2e/tests/demo-tour.spec.ts). Pipeline y reproducción en el [README](../../media/demo/README.md). Medios en `media/demo/build/`, ignorados: `demo.mp4` (pista de subtítulos `mov_text` en español), `demo.es.srt` y `demo-subtitulado.mp4` con subtítulos quemados. Publicación: el dueño subió el tráiler (https://youtu.be/-xhokMtK-Hw) y la demo (https://youtu.be/XAIHdmHAhA0) con los textos y miniaturas de [`YOUTUBE.md`](../../media/demo/YOUTUBE.md). Música de fondo pedida por el dueño en la sesión: misma armonía y timbres del tráiler v2, 96 BPM, sin batería marcada, a −13 dB y atenuada bajo la voz.

**Voz.** `h60rOzgfLmYsntfqgGu2` se publica como «Sofía» en la biblioteca de ElevenLabs (`sharing.name`) y figura como «Delfina…» en el espacio del dueño. El dueño confirmó el ID en el chat. El primer lote usó `eleven_multilingual_v2` con ajustes propios y el dueño respondió «no es esa la voz que quiero». El lote final usa `eleven_turbo_v2_5`, verificado es-AR, con los ajustes por defecto de la voz, como su vista previa oficial, y el dueño confirmó «ahora sí es esa voz». Plan Starter de 40.000 caracteres; antes del lote final quedaban 36.972. La clave se lee solo de `ELEVENLABS_API_KEY` en el `.env` ignorado y no se imprimió.

| Comando | Resultado |
|---|---|
| `bash scripts/e2e.sh --grep "demo tour" --project desktop` (modo funcional) | exit 0, 137 s, 1 passed |
| `bash media/demo/scripts/capture.sh` (ritmo real, 37 clips) | exit 0, passed, 7033 cuadros, 37 escenas |
| `node media/demo/scripts/voice.mjs check` | exit 0, `libraryName: Sofía`, `matchesSofia: true`, `tier: starter` |
| `node media/demo/scripts/voice.mjs clips` | exit 0, 37 clips |
| `node media/demo/scripts/montage.mjs` | exit 0, 353,48 s, 37 escenas con voz, 85 cues |
| `ffprobe -v error -show_entries stream=codec_type,width,height:format=duration -of json demo.mp4` | exit 0. Video 1920×1080, audio, subtítulo, `353.500000` s |
| `ffprobe -v error -show_packets -select_streams s -show_entries packet=pts_time,duration_time -of csv demo.es.srt` | exit 0, 85 paquetes. Último `350.637`, duración `1.635` |
| Cotejo del SRT | 85 cues numerados, sin solapamiento, máximo 2 líneas de 42 caracteres. Último fin 352,272 s; video 353,479 s. UTF-8 sin BOM, 135 caracteres acentuados; «», ñ y ¿ visibles en la copia quemada |
| `ebur128` y `volumedetect` del MP4 | Integrado −14,9 LUFS. Música sola −31,4 dB medios; con voz −21,3 dB |
| Fotogramas al inicio de cada capítulo | Pantalla y narración coinciden de C1 a C9 |
| `sha256sum` | `demo.mp4` `af327741…b815`, `demo-subtitulado.mp4` `3a589670…2c2e`, `demo.es.srt` `05074e84…9d9d` |
| `bash scripts/verify.sh --policy origin/main` | exit 0, perfil FULL/STARTER por 11 rutas técnicas. **FULL/STARTER: DIFERIDO POR EL DUEÑO** |

**Confirmación del dueño.** El 2026-11-23, en el chat de la sesión del implementer, el dueño vio `demo-subtitulado.mp4` completo con sonido y respondió: «está muy bien, me gusta la voz, es esa, coincide bien con lo que se muestra en el video, está alineada con los subtítulos y la música; lo doy por aprobado». El reviewer igual pide su propia confirmación antes del merge.

**Correcciones significativas.**

| Causa | Arreglo | Prueba / SHA |
|---|---|---|
| La traza `retain-on-failure` abría el screencast antes y fijaba 800×450 | Traza apagada solo al grabar | Cuadros de 1280×720, `6ec874c` |
| `screencast.showActions` de Playwright 1.64 perdía teclas al escribir con demora | Cursor propio dibujado que no intercepta eventos | Sonda aislada: plain y screencast pasan, actions falla |
| ffmpeg se trababa al mezclar voz, música con sidechain y video en un solo grafo | Tres pasadas: voz, mezcla y video | Montaje en 77 s, `2aa948a` |
| Primer lote de voz con otro modelo, rechazado por el dueño | `eleven_turbo_v2_5` con los ajustes de la voz | Confirmación del dueño, `2aa948a` |

**Observación para el dueño, sin confirmar con mouse físico.** En Chromium de Playwright, un clic en otra línea del editor diario no mueve el caret si llega con el autoguardado en vuelo o tras una pausa del mouse sobre el editor; la escritura siguiente reemplaza la selección anterior, por ejemplo el «1279» enlazado. En Libres pasa lo mismo tras elegir un formato. Se reprodujo en sondas temporales sin screencast. El recorrido ubica el caret por programa. Conviene probarlo a mano antes de abrir una tarea.

## Intención del dueño para la tarea siguiente

2026-11-23, en el chat de la sesión del implementer. Una última tarea después de T-096, a planificar por frontera como T-097:

- En la navegación principal, junto a Historial, un destino **Demo** que se destaque: rojo, con un ícono de reproducción, para que se entienda que es video.
- La página Demo muestra en el centro un reproductor con dos videos publicados en YouTube, el tráiler v2 y la demo narrada. A la derecha, una lista para elegir uno u otro, como una playlist. Un clic reproduce el elegido. Disposición cuidada en escritorio y móvil.
- Videos publicados por el dueño: tráiler https://youtu.be/-xhokMtK-Hw (`-xhokMtK-Hw`) y demo https://youtu.be/XAIHdmHAhA0 (`XAIHdmHAhA0`). Títulos, descripciones, IDs y embeds en [`media/demo/YOUTUBE.md`](../../media/demo/YOUTUBE.md). Portadas versionadas en `media/demo/youtube/` (JPG de 1280×720).
- Datos verificados para el planner: el cliente y el servidor no definen Content-Security-Policy propia, así que el embed no exige cambiar cabeceras. En móvil la navegación inferior ya tiene cinco destinos, y el planner decide dónde va Demo. También decide si la página es visible sin sesión.
- Recomendación: embed `youtube-nocookie.com` que se carga recién al hacer clic, con esas portadas propias, copiadas al cliente. Así no hay pedidos a YouTube al abrir la página.
- Medios: los MP4 no se versionan. YouTube los aloja y se reproducen desde las fuentes. El tráiler v1 local (`trailer/`) queda a decisión del dueño y ningún agente lo borra.

## Prompts de salida

```text
Frontera reviewer independiente de T-096 en MatiasNicolasAcevedo/devnotes, sesión nueva y distinta de la del implementer. Leé AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/tasks/T-096-narrated-demo.md (Checkpoint vigente), media/demo/README.md y media/demo/MATRIZ.md. PRECONDICIÓN: gh pr view 92 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup devuelve OPEN, no draft, verify-required verde sobre ese HEAD y el commit técnico 24978e5 como ancestro; si no, devolvé el paso vigente. ACCIÓN: revisá el diff contra la aceptación de T-096 y la matriz. Corré bash scripts/e2e.sh --grep "demo tour" --project desktop. Reproducí los medios: en media/demo, node scripts/voice.mjs plan (0 pendientes si existen los clips; si no, check y clips con la clave del .env ignorado); desde la raíz, bash media/demo/scripts/capture.sh y node media/demo/scripts/montage.mjs --burn. Ejecutá los dos ffprobe de la tarea en media/demo/build, cotejá el último cue contra la duración y los caracteres españoles, y pedí al dueño en el chat la confirmación explícita de haber visto y escuchado demo.mp4 completo con sonido; sin ella no mergees. Confirmá trailer/ sin versionar y sin MP4, WAV, MP3 ni build en el índice. Ante hallazgos devolvé el mismo PR. Si aprobás, squash sin --admin ligado al HEAD revisado y verificá MERGED con gh pr view 92 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: veredicto con evidencia en la tarea y el prompt completo de la sesión siguiente. Si quedó MERGED, la siguiente es frontera planner de T-097 según «Intención del dueño para la tarea siguiente» de esta tarea, con los enlaces de YouTube ya registrados.
```

```text
Frontera planner de T-097 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, docs/STATUS.md, docs/agents/planner.md, docs/WORKFLOW.md y docs/tasks/T-096-narrated-demo.md («Intención del dueño para la tarea siguiente») y media/demo/YOUTUBE.md. PRECONDICIÓN: gh pr view 92 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit devuelve MERGED con mergedAt y mergeCommit.oid válidos, y git merge-base --is-ancestor con ese oid y origin/main sale con exit 0; si no, devolvé el paso vigente. ACCIÓN: conciliá T-096 a done con el SHA de merge en una rama de planificación. Escribí T-097, la página Demo: destino Demo destacado junto a Historial, reproductor central con lista lateral de los dos videos, embed youtube-nocookie cargado al hacer clic con los IDs -xhokMtK-Hw (tráiler) y XAIHdmHAhA0 (demo) y las portadas de media/demo/youtube. Resolvé con el dueño el lugar en la navegación móvil de cinco destinos y la visibilidad sin sesión, y definí pruebas de componente y el E2E filtrado. Encolala en BACKLOG y STATUS. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: PR de planificación con el contrato y el prompt completo para el implementer de T-097.
```
