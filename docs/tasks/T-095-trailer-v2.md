---
id: T-095
status: done
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

Conciliada el 2026-11-23 en la rama de T-096. `gh pr view 91 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit` devolvió `MERGED`, `2026-11-23T04:47:33Z` y `b0e46a353743db5fb30ca35556358b68715850ee`. `git fetch origin` y `git merge-base --is-ancestor b0e46a3 origin/main` dieron exit 0.

### Revisión de la ronda 2

2026-11-23. Frontera reviewer independiente, ronda 2 de 2, en Claude Code desktop (Claude Opus 5.5, `claude-opus-5-5`), Git Bash, Git, gh, Node, HyperFrames y ffmpeg/ffprobe. Sesión nueva, distinta de la del implementer. **APROBADO**, estado `mergeable`. Revisado el HEAD publicado `fa2620523b9336df6ec5b7e5e80cd2058ec4989c` del [PR #91](https://github.com/MatiasNicolasAcevedo/devnotes/pull/91), OPEN, no draft, `verify-required` verde, con `d97fa93` como ancestro. Impacto: solo `media/trailer-v2/` y documentos; sin cambios de comportamiento, API, permisos, datos ni UI del producto.

**Cierre de hallazgos.**

| # | Comprobación | Resultado |
|---|---|---|
| H1 | Fotograma en 25,6 s contra `ImageWorkspace.tsx:521` | «Texto copiado» entero, debajo de «Copiar texto» y «Guardar», dentro de la tarjeta. Cerrado |
| H2 | Fotograma en 11,5 s contra `LinkDialog.tsx:149-157` | Título «Agregar enlace» y «1279» atenuado debajo; campo de URL visible. Cerrado |
| Resto | `git diff 6d7afbc..HEAD` | Solo `#pop` (`.sel`), `#imOk` (`.okline`), dos filas de `STORYBOARD.md`, la tarea y STATUS. Sin otros cambios de montaje, tiempos ni audio |

| Comando | Resultado |
|---|---|
| `npm run check` en `media/trailer-v2` | exit 0. 0 errores, 18 avisos de Craft (`line_unread`), como en la ronda 1. Audio: 0 errores, 0 avisos |
| `npm run render` | exit 0. 20,1 MB, 46,0 s, `renders/devnotes-trailer-v2-16x9.mp4` |
| `ffprobe -v error -show_entries stream=codec_type,width,height:format=duration -of json devnotes-trailer-v2-16x9.mp4` | exit 0. Video 1920×1080, audio, `46.000000` s |
| `sha256sum devnotes-trailer-v2-16x9.mp4` | `999c7b1bcd86171a4e3cbb0be3ae171394b2183c72924135101324a290b01e7b`. Difiere del render del implementer (`c14a86a5…`): la captura por capturas de pantalla con GPU no es byte a byte determinista; la duración, los streams y los fotogramas coinciden |
| `ffmpeg -ss 11.5 / 12.8 / 25.6 … -frames:v 1` | Fotogramas revisados: H1 y H2 cerrados |
| SHA-256 de `trailer/` (sin `node_modules`, 44 archivos) antes y después de check+render | Idénticos. `git ls-files -- trailer` vacío |
| `git ls-files` filtrado por WAV, MP3, MP4, `renders/`, `.hyperframes/`, `node_modules/` | Sin resultados. `git ls-files -- plantilla` vacío |
| `git diff --check origin/main...HEAD` | exit 0 |

Hallazgo menor, no bloqueante: antes de copiar, el producto muestra «Texto listo» en esa línea y el tráiler la deja vacía. Es una simplificación aceptable del montaje.

**Confirmación del dueño.** El 2026-11-23, en el chat de esta sesión, el dueño respondió «Sí, escuché todo» a la pregunta de si escuchó el MP4 completo con sonido y si el audio está bien para mergear.

**FULL/STARTER: DIFERIDO POR EL DUEÑO.**

## Prompts de salida

```text
Frontera reviewer independiente de T-095, ronda 2 de 2, en MatiasNicolasAcevedo/devnotes, sesión nueva y distinta de la del implementer. Leé AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/tasks/T-095-trailer-v2.md (Checkpoint vigente y tabla de correcciones) y media/trailer-v2/STORYBOARD.md. PRECONDICIÓN: gh pr view 91 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,statusCheckRollup devuelve OPEN, no draft, con verify-required verde sobre ese HEAD y el commit técnico d97fa93 como ancestro; si no, devolvé el paso vigente. ACCIÓN: revisá sobre el HEAD publicado solo el cierre de H1 y H2 y que el resto del montaje no cambió (git diff 6d7afbc..HEAD). En media/trailer-v2 ejecutá npm run check y npm run render; desde renders, ffprobe -v error -show_entries stream=codec_type,width,height:format=duration -of json devnotes-trailer-v2-16x9.mp4, sha256sum y fotogramas en 11,5 s («Agregar enlace» y «1279» debajo, como LinkDialog.tsx) y 25,6 s («Texto copiado» entero dentro de la tarjeta, como ImageWorkspace.tsx). Confirmá trailer/ sin versionar ni modificar y sin WAV/MP4/cachés en el índice. Antes del merge pedí al dueño en el chat la confirmación explícita de haber escuchado el MP4 completo con sonido y registrala; sin ella no mergees. Si aprobás y está confirmada, squash merge sin --admin sobre el SHA revisado y verificá MERGED con gh pr view 91 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit. Es la última ronda: si quedan hallazgos, checkpoint y prompt para frontera o dueño. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: veredicto con evidencia en la tarea y el prompt completo de la sesión siguiente (implementer de T-096 si quedó MERGED).
```

```text
Frontera implementer de T-096 en MatiasNicolasAcevedo/devnotes. Leé AGENTS.md, STATUS, docs/agents/implementer.md y docs/tasks/T-096-narrated-demo.md. Confirmá gh pr view 91 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit y la ascendencia del squash en origin/main. Conciliá T-095 en codex/t-096-narrated-demo. Inventariá las funciones del SHA final y prepará recorrido, guion, captura, voz de Sofía y SRT según T-096. Publicá un PR con la evidencia y el prompt completo para reviewer independiente.
```
