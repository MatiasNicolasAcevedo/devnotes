---
id: T-095
status: in_progress
priority: P2
size: M
milestone: M9
spec: null
depends_on: [T-094]
branch: codex/t-095-trailer-v2
role: implementer
executor: frontier
pr: null
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

Contrato planificado. Espera T-094 MERGED y su evidencia de aceptación. En esta sesión se documentan los entregables futuros.

## Prompts de salida

```text
Frontera reviewer independiente de T-095 en MatiasNicolasAcevedo/devnotes. Leé AGENTS.md, STATUS, docs/agents/reviewer.md y docs/tasks/T-095-trailer-v2.md. Verificá gh pr view <PR> --repo MatiasNicolasAcevedo/devnotes --json state,headRefOid,baseRefOid,statusCheckRollup. Revisá las fuentes y reproducí los entregables contra la aceptación y el gate. Ante hallazgos devolvé el mismo PR. Si aprobás y verify-required está verde, hacé squash ligado al HEAD, verificá MERGED, fecha y oid y entregá el siguiente prompt completo.
```

```text
Frontera implementer de T-096 en MatiasNicolasAcevedo/devnotes. Leé AGENTS.md, STATUS, docs/agents/implementer.md y docs/tasks/T-096-narrated-demo.md. Confirmá gh pr view <PR de T-095> --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit y la ascendencia del squash en origin/main. Conciliá T-095 en codex/t-096-narrated-demo. Inventariá las funciones del SHA final y prepará recorrido, guion, captura, voz de Sofía y SRT según T-096. Publicá un PR con la evidencia y el prompt completo para reviewer independiente.
```
