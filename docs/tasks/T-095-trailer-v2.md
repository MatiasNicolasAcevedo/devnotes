---
id: T-095
status: draft
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

# T-095 · Tráiler v2 para redes

## Objetivo

Ampliar la pieza musical cuando la entrega de IA esté probada y mergeada. La v1 local de HyperFrames tiene montaje vertical de 30 s (`trailer/index.html`), adaptación horizontal (`trailer/landscape/index.html`), banda sonora y renders MP4. `git ls-files -- trailer` estaba vacío al planificar. Conservar estos originales como referencia y producir la v2 en directorios propios.

## Alcance

1. Leer el `AGENTS.md` local del tráiler, reproducir ambos cortes y extraer los tiempos de apertura, golpes de música, mensajes y cierre. Contrastar cada afirmación con una pantalla de la versión final y preparar un storyboard con timecodes, gesto visible y función demostrada.
2. Montar un relato breve. Abrir con una nota de trabajo, pasar de Voz o Imagen a texto, editar en Diario/Libres, consultar al lado, enviar un fragmento a la IA y cerrar con el resultado. Usar rótulos legibles, material ficticio y la dinámica musical de la v1. Mostrar las funciones que se entienden en un golpe de vista. Duración objetivo 40–60 s, ajustar al ritmo real. Música sin locución.
3. Componer ambas relaciones desde fuentes v2 (9:16 y 16:9) con encuadre propio y márgenes para UI de redes. Entregar storyboard, fuentes reproducibles y ambos MP4 para revisión local. Preservar la v1 y sus archivos sin trackear. El PR incorpora explícitamente fuentes reproducibles y evidencia/rutas de los renders. Excluir cachés, dependencias y binarios de trabajo.

## Aceptación y pruebas

Abrir imagen, tipografía y música con la misma identidad de la v1. Cada rótulo corresponde a una acción comprobada en el producto. Revisar a tamaño de teléfono, cortes sincronizados, sin narración, pantalla en negro accidental, texto tapado ni URL antigua. Ver ambos MP4 completos con sonido. En la carpeta de cada composición v2 ejecutar `npm run check` y `npm run render` con la versión de HyperFrames fijada por el original. Desde la carpeta de entrega ejecutar por cada MP4 `ffprobe -v error -show_entries stream=codec_type,width,height:format=duration -of json archivo.mp4` sustituyendo el nombre real. Registrar dimensiones, audio, duración, ruta y SHA de fuentes. Gate documental, CI del HEAD y FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Checkpoint vigente

Contrato planificado. Espera T-094 MERGED y su evidencia de aceptación. En esta sesión se documentan los entregables futuros.

## Prompts de salida

```text
Frontera reviewer independiente de T-095 en MatiasNicolasAcevedo/devnotes. Leé AGENTS.md, STATUS, docs/agents/reviewer.md y docs/tasks/T-095-trailer-v2.md. Verificá gh pr view <PR> --repo MatiasNicolasAcevedo/devnotes --json state,headRefOid,baseRefOid,statusCheckRollup. Revisá las fuentes y reproducí los entregables contra la aceptación y el gate. Ante hallazgos devolvé el mismo PR. Si aprobás y verify-required está verde, hacé squash ligado al HEAD, verificá MERGED, fecha y oid y entregá el siguiente prompt completo.
```

```text
Frontera implementer de T-096 en MatiasNicolasAcevedo/devnotes. Leé AGENTS.md, STATUS, docs/agents/implementer.md y docs/tasks/T-096-narrated-demo.md. Confirmá gh pr view <PR de T-095> --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit y la ascendencia del squash en origin/main. Conciliá T-095 en codex/t-096-narrated-demo. Inventariá las funciones del SHA final y prepará recorrido, guion, captura, voz de Sofía y SRT según T-096. Publicá un PR con la evidencia y el prompt completo para reviewer independiente.
```
