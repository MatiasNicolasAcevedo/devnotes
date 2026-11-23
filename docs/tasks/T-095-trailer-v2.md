---
id: T-095
status: changes_requested
priority: P2
size: M
milestone: M9
spec: null
depends_on: [T-094]
branch: codex/t-095-trailer-v2
role: implementer
executor: frontier
pr: 91
---

# T-095 · Tráiler v2 de escritorio

## Decisión de alcance del dueño

2026-11-23. Solo se entrega el tráiler en formato escritorio horizontal (16:9). Quedan fuera del alcance el corte vertical/móvil y las versiones para redes, TikTok e Instagram. Dentro del tráiler de escritorio se muestra que la ventana se puede achicar y la interfaz se adapta, y la compatibilidad con móvil se presenta como una de las funcionalidades. Esta decisión reemplaza los «dos cortes» y los márgenes para UI de redes del contrato anterior.

## Objetivo

Ampliar la pieza musical cuando la entrega de IA esté probada y mergeada. La v1 local de HyperFrames tiene montaje vertical de 30 s (`trailer/index.html`), adaptación horizontal (`trailer/landscape/index.html`), banda sonora y renders MP4. `git ls-files -- trailer` estaba vacío al planificar. Conservar estos originales sin modificar como referencia y producir la v2 de escritorio en un directorio propio y versionado, [`media/trailer-v2/`](../../media/trailer-v2/README.md).

## Alcance

1. Leer el `AGENTS.md` local del tráiler y partir de `trailer/landscape` para extraer los tiempos de apertura, golpes de música, mensajes y cierre. Contrastar cada afirmación con una pantalla de la versión final y preparar un storyboard con timecodes, gesto visible y función demostrada.
2. Montar un relato breve. Abrir con una nota de trabajo, pasar de Voz o Imagen a texto, editar en Diario/Libres, consultar al lado, enviar un fragmento a la IA y cerrar con el resultado. Incluir un tramo en el que la ventana se achica y la interfaz pasa a la navegación inferior, y presentar el uso en móvil como función. Usar rótulos legibles, material ficticio y la dinámica musical de la v1. Mostrar las funciones que se entienden en un golpe de vista. Duración objetivo 40–60 s, ajustar al ritmo real. Música sin locución.
3. Componer un único corte 16:9 (1920×1080) desde fuentes v2. Entregar storyboard, fuentes reproducibles (composición, generador de banda sonora y scripts) y el MP4 para revisión local. Preservar la v1 y sus archivos sin trackear. El PR incorpora explícitamente fuentes reproducibles y evidencia/rutas del render. Excluir cachés, dependencias, la banda sonora generada y binarios de trabajo.

## Aceptación y pruebas

Abrir imagen, tipografía y música con la misma identidad de la v1. Cada rótulo corresponde a una acción comprobada en el producto. Revisar a tamaño de escritorio y en una ventana reducida a la mitad: cortes sincronizados, sin narración, pantalla en negro accidental, texto tapado ni URL antigua. El tramo adaptable muestra la misma nota en ventana ancha y angosta, con la navegación inferior de cinco destinos. Ver el MP4 completo con sonido. En `media/trailer-v2` ejecutar `npm run check` y `npm run render` con la versión de HyperFrames fijada por el original (0.9.37). Desde `media/trailer-v2/renders` ejecutar `ffprobe -v error -show_entries stream=codec_type,width,height:format=duration -of json devnotes-trailer-v2-16x9.mp4`. Registrar dimensiones, audio, duración, ruta, SHA-256 del MP4 y SHA de fuentes. Gate documental, CI del HEAD y FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Checkpoint vigente

2026-11-23. Frontera reviewer independiente en Claude Code desktop (Claude Opus 5.5, `claude-opus-5-5`), Git Bash, Git, gh, Node, HyperFrames 0.9.37 y ffmpeg/ffprobe; sesión distinta de la del implementer. **CAMBIOS REQUERIDOS** (ronda 1 de 2) para el [PR #91](https://github.com/MatiasNicolasAcevedo/devnotes/pull/91): HEAD revisado `3e714f119eb24be68a280ef3eda60e0877b6fd02`, base `076e4ed32f82fd2ee9fbd25ee7de4d743ecd2e9c`, commit técnico `027f02d` contenido. `verify-required` verde sobre ese HEAD. Impacto: solo `media/trailer-v2/` y documentos.

**Comprobado.** Alcance conforme a la decisión del dueño: un único corte 16:9, tramo «Achica la ventana» con la misma nota de 960 a 440 px y la barra inferior de cinco destinos en el orden real de `AppShell.tsx` (Notas, Voz, Referencias, Imagen, Historial), y «También en tu móvil» como función. Rótulos del storyboard cotejados con `ConsultAiButton.tsx`, `AiPage.tsx` («Fragmento a compartir», «Se enviará a»), `AiOptions.java` («GPT OSS 20B»), `ImageWorkspace.tsx`, `FreeNoteEditor.tsx`, `ReadingWorkspace.tsx` («Abrir al lado», «Versión del…», «Volver a escribir»), `SaveStatusIndicator.tsx` y `manifest.json` (`standalone`). URL de cierre vigente. Sin pantalla negra ni silencios. Revisión visual completa a 2 fps más fotogramas a resolución completa. `trailer/` sin versionar e idéntico (SHA-256 de sus 15 archivos antes y después del render). El árbol del HEAD no contiene WAV, MP4, `renders/`, `.hyperframes/` ni `node_modules/`.

| Comando | Resultado |
|---|---|
| `npm run check` en `media/trailer-v2` | exit 0. 0 errores, 18 avisos (lectura breve y piso de teléfono) |
| `npm run render` | exit 0. 21 080 859 bytes, SHA-256 `67d1d560cb6856ceebb8ac0a8c068bbb1c969fa7d8797b2fdc72d69b54a1c9ca`. El render no es byte a byte idéntico al del implementer |
| `ffprobe -v error -show_entries stream=codec_type,width,height:format=duration -of json devnotes-trailer-v2-16x9.mp4` en `renders/` | exit 0. Video 1920×1080, audio, `46.000000` s |
| `ffmpeg … blackdetect, silencedetect, ebur128` | Sin negros ni silencios. −14,9 LUFS, LRA 4,3 LU, pico −2,2 dBFS |
| `node scripts/docs-check.mjs` sobre `git archive HEAD` | exit 0 (156 Markdown, 91 tareas) |
| `git diff --check origin/main...HEAD` | exit 0 |

**Hallazgos (lista cerrada).**

| # | Evidencia | Corrección suficiente | Cierre observable |
|---|---|---|---|
| H1 | De 25,05 s al fin de la escena de Imagen (~26 s) el `#imOk` «Copiado» queda a la derecha de «Guardar», fuera de la tarjeta, y se lee «Cop» (`index.html:1294`, `showOk('#imOk', 25.05)`). Viola «sin texto tapado» | Mostrarlo como en el producto: una línea de estado «Texto copiado» debajo de los botones de «Texto extraído» y dentro de la tarjeta (`ImageWorkspace.tsx:521`). No tocar el resto del montaje | Fotograma en 25,6 s con «Texto copiado» entero dentro de la tarjeta; `npm run check` exit 0 |
| H2 | El diálogo de Ctrl+K dice «Enlace para «1279»» (`index.html:1178`). El producto titula «Agregar enlace» con «1279» debajo (`LinkDialog.tsx:149-157`) | Rótulo «Agregar enlace» y «1279» en una segunda línea, dentro de `#pop` | Fotograma en 11,5 s con «Agregar enlace» y «1279» legibles |

**Pendiente del dueño, no defecto.** Ningún agente puede escuchar audio: el reviewer midió la banda con ffmpeg, igual que el implementer. La escucha completa del MP4 con sonido queda para el dueño antes del merge de la ronda 2.

**FULL/STARTER: DIFERIDO POR EL DUEÑO.**

## Prompts de salida

```text
Frontera implementer de corrección de T-095, ronda 1, en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/tasks/T-095-trailer-v2.md (Checkpoint vigente, hallazgos H1 y H2) y media/trailer-v2/STORYBOARD.md. PRECONDICIÓN: gh pr view 91 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid devuelve OPEN y no draft, con el commit de CAMBIOS REQUERIDOS del reviewer como HEAD o ancestro; si no, devolvé el paso vigente. ACCIÓN: en codex/t-095-trailer-v2 corregí solo H1 («Copiado» de Imagen recortado: pasarlo a una línea «Texto copiado» dentro de la tarjeta, como ImageWorkspace.tsx) y H2 (diálogo de enlace con «Agregar enlace» y «1279» debajo, como LinkDialog.tsx), en index.html y, si cambia un rótulo, en STORYBOARD.md. En media/trailer-v2 ejecutá npm run check y npm run render; desde renders, ffprobe -v error -show_entries stream=codec_type,width,height:format=duration -of json devnotes-trailer-v2-16x9.mp4, sha256sum y fotogramas en 11,5 s y 25,6 s. Confirmá trailer/ sin versionar ni modificar y sin WAV/MP4/cachés en el índice. Reemplazá el checkpoint con la tabla de correcciones, STATUS a in_review, commit y push con rutas explícitas. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: PR 91 actualizado con verify-required verde y el prompt completo de reviewer independiente de ronda 2, que pida además la confirmación del dueño de haber escuchado el MP4 completo con sonido antes del merge.
```

```text
Frontera implementer de T-096 en MatiasNicolasAcevedo/devnotes. Leé AGENTS.md, STATUS, docs/agents/implementer.md y docs/tasks/T-096-narrated-demo.md. Confirmá gh pr view 91 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit y la ascendencia del squash en origin/main. Conciliá T-095 en codex/t-096-narrated-demo. Inventariá las funciones del SHA final y prepará recorrido, guion, captura, voz de Sofía y SRT según T-096. Publicá un PR con la evidencia y el prompt completo para reviewer independiente.
```
