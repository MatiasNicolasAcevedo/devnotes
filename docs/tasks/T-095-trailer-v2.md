---
id: T-095
status: in_review
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

2026-11-23. Frontera implementer en Claude Code desktop (Claude Opus 5.5, `claude-opus-5-5`), Git Bash, Git, gh, Docker Desktop, Node, HyperFrames 0.9.37, ffmpeg/ffprobe y Edge sin interfaz con Playwright de `e2e/`. Listo para revisión en el [PR #91](https://github.com/MatiasNicolasAcevedo/devnotes/pull/91). Base `076e4ed32f82fd2ee9fbd25ee7de4d743ecd2e9c`. Commit técnico `027f02d`. Impacto: fuentes nuevas en `media/trailer-v2/` y documentos. Sin cambios de comportamiento, API, permisos, datos ni UI del producto.

**Hecho.** Precondición comprobada: `gh pr view 90 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit` devolvió `MERGED`, `2026-11-23T03:11:08Z` y `076e4ed32f82fd2ee9fbd25ee7de4d743ecd2e9c`; `git merge-base --is-ancestor 076e4ed origin/main` dio exit 0. T-094 quedó conciliada en `f202846`. La decisión del dueño se registró en `1a936fa`. Las fuentes de la v2 están en `027f02d`: [README](../../media/trailer-v2/README.md) y [storyboard con evidencia por rótulo](../../media/trailer-v2/STORYBOARD.md). `trailer/` sigue sin versionar ni modificar.

**Verificación en el producto.** Stack propio `starter-dev-t095-trailer` (`bash scripts/dev.sh up --mode local --proxy nginx --project starter-dev-t095-trailer`, exit 0) con sesión del proveedor ficticio y datos ficticios. Se capturaron Diario con Ctrl+K, enlace y separador, «Abrir al lado» con la versión del día, Libres con Formato (Título 1–3, Negrita) y Herramientas (Bloque de código, Abrir al lado), Imagen a texto, Voz, Referencias, Historial, Datos y anchos de 1280/960/780/700/430/390 px sin desborde horizontal. La barra inferior de cinco destinos aparece por debajo de 768 px. En local `/api/ai/options` responde 403 `ai-forbidden`, así que IA se respalda en T-094 MERGED y en los rótulos de `AiPage.tsx`, `ConsultAiButton.tsx` y `AiOptions.java`. Readiness de `devnotes-v2dx.onrender.com` dio HTTP 200 y el host de la v1 `devnotes-pilot.onrender.com` dio 404. Limpieza: `dev.sh down` exit 0 y después `docker volume rm starter-dev-t095-trailer_db-data` más `docker rmi` de las dos imágenes del proyecto, por nombre exacto. Las capturas quedaron solo en el scratchpad de la sesión.

| Comando | Resultado |
|---|---|
| `npm run check` en `media/trailer-v2` | exit 0. Check passed con 0 errores y 232/232 contrastes AA. Avisos de lectura breve y de tipografía bajo el piso de teléfono, que no aplica a un corte de escritorio |
| `npm run render` | exit 0. `renders/devnotes-trailer-v2-16x9.mp4`, 21 081 265 bytes. HyperFrames bajó la mezcla 2,7 dB por techo de entrega |
| `ffprobe -v error -show_entries stream=codec_type,width,height:format=duration -of json devnotes-trailer-v2-16x9.mp4` en `renders/` | exit 0. Video 1920×1080, audio y `46.000000` s |
| `sha256sum devnotes-trailer-v2-16x9.mp4` | `e00367b97ff7a638faba05df0e4eab35bc2b3abfb3e08f6463943b92485c083e` |
| `ffmpeg … blackdetect=d=0.1:pic_th=0.98, silencedetect=n=-45dB:d=0.4, ebur128=peak=true` | exit 0. Sin tramos negros ni silencios. −14,9 LUFS integrados, LRA 4,3 LU, pico real −2,2 dBFS |
| `node scripts/docs-check.mjs` sobre `git archive HEAD` | exit 0 (156 Markdown, 91 tareas). En el workspace completo da exit 1 solo por `trailer/CLAUDE.md`, que es local y sin seguimiento |
| `git diff --check origin/main...HEAD` | exit 0 |
| `bash scripts/verify.sh --policy origin/main` | exit 0. `policy=FULL`, `profile=STARTER` (8 rutas técnicas en `media/`) |

**FULL/STARTER: DIFERIDO POR EL DUEÑO.** **Pendiente:** veredicto del reviewer independiente, incluida la escucha completa del MP4 con sonido, que el implementer no pudo hacer y midió solo con ffmpeg. Además, `verify-required` verde sobre el HEAD publicado.

| Corrección | Arreglo | Comprobación |
|---|---|---|
| `check` marcó como error las animaciones `left`/`top` de la ventana adaptable | Se reemplazaron por `x`/`y` y se mantuvo el ancho | `npm run check` exit 0 |
| Botón «Extraer texto» duplicado y oculto, con contraste 2,81:1 | Un solo botón que cambia de color y gris deshabilitado `#8a9099` | 232/232 contrastes AA |
| «ticket1279» sin espacio, heredado de la v1, y chips del móvil en dos líneas | Espacio duro en el tipeo y chips más cortos | Snapshots 9,6 s y 37,4 s |

## Prompts de salida

```text
Frontera reviewer independiente de T-095 en MatiasNicolasAcevedo/devnotes, en sesión distinta de la del implementer. Leé AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/tasks/T-095-trailer-v2.md y media/trailer-v2/STORYBOARD.md. PRECONDICIÓN: gh pr view 91 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup devuelve OPEN, no draft, base main con 076e4ed32f82fd2ee9fbd25ee7de4d743ecd2e9c como ancestro y el commit técnico 027f02d contenido en el HEAD; si no, devolvé el paso vigente. ACCIÓN: revisá el diff contra la decisión del dueño del 2026-11-23 (un único corte de escritorio 16:9, ventana que se achica y móvil como función), el storyboard y cada rótulo frente al producto. En media/trailer-v2 ejecutá npm run check y npm run render (HyperFrames 0.9.37). Desde renders ejecutá ffprobe -v error -show_entries stream=codec_type,width,height:format=duration -of json devnotes-trailer-v2-16x9.mp4 y mirá el MP4 completo con sonido, que el implementer no pudo escuchar. Confirmá que trailer/ sigue sin versionar ni modificar y que no se versionan WAV, MP4 ni cachés. FULL/STARTER: DIFERIDO POR EL DUEÑO. Ante hallazgos devolvé el mismo PR con la lista y el prompt de corrección. SALIDA: si aprobás y verify-required está verde sobre el HEAD, hacé squash ligado a ese HEAD según docs/AUTONOMY.md, verificá MERGED con gh pr view 91 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit y entregá completo el prompt de T-096 de la tarea con el oid real.
```

```text
Frontera implementer de T-096 en MatiasNicolasAcevedo/devnotes. Leé AGENTS.md, STATUS, docs/agents/implementer.md y docs/tasks/T-096-narrated-demo.md. Confirmá gh pr view 91 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit y la ascendencia del squash en origin/main. Conciliá T-095 en codex/t-096-narrated-demo. Inventariá las funciones del SHA final y prepará recorrido, guion, captura, voz de Sofía y SRT según T-096. Publicá un PR con la evidencia y el prompt completo para reviewer independiente.
```
