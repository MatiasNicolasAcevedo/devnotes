---
id: T-096
status: draft
priority: P2
size: M
milestone: M9
spec: null
depends_on: [T-095]
branch: codex/t-096-narrated-demo
role: implementer
executor: frontier
pr: null
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

Contrato planificado. Espera T-095 MERGED y su evidencia de aceptación. En esta sesión se documentan los entregables futuros.

## Prompts de salida

```text
Frontera reviewer independiente de T-096 en MatiasNicolasAcevedo/devnotes. Leé AGENTS.md, STATUS, docs/agents/reviewer.md y docs/tasks/T-096-narrated-demo.md. Verificá gh pr view <PR> --repo MatiasNicolasAcevedo/devnotes --json state,headRefOid,baseRefOid,statusCheckRollup. Revisá las fuentes y reproducí los entregables contra la aceptación y el gate. Ante hallazgos devolvé el mismo PR. Si aprobás y verify-required está verde, hacé squash ligado al HEAD, verificá MERGED, fecha y oid y entregá el siguiente prompt completo.
```

```text
Frontera planner de cierre en MatiasNicolasAcevedo/devnotes. Leé AGENTS.md, STATUS, docs/agents/planner.md y docs/tasks/T-096-narrated-demo.md. Confirmá gh pr view <PR de T-096> --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit y la ascendencia en origin/main. Conciliá la última entrega según WORKFLOW, cotejá guion, SRT y video con el SHA demostrado e informá el cierre y pendientes reales al dueño. Esperá nueva intención de producto.
```
