# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-095](tasks/T-095-trailer-v2.md) |
| Estado | `in_review` |
| Siguiente acción | Reviewer independiente revisa el corte de escritorio y, si aprueba, hace el squash ([checkpoint](tasks/T-095-trailer-v2.md#checkpoint-vigente)) |
| Rama / PR | `codex/t-095-trailer-v2` · [PR #91](https://github.com/MatiasNicolasAcevedo/devnotes/pull/91) |

Modo `FRONTERA_CONTINUA`. T-094 conciliada ([PR #90](https://github.com/MatiasNicolasAcevedo/devnotes/pull/90) MERGED, `076e4ed`). La [cola](BACKLOG.md#lote-imagen-libres-e-ia) continúa con el tráiler v2 y la demo narrada. [Cron externo configurado](DEPLOYMENT.md#despertador-externo-de-devnotes).

Piloto aprobado con cinco destinos: Groq 20B/120B, Workers AI 20B/120B y Gemini 3.1 Flash-Lite. Gemini 3.8 Flash y OpenRouter Free quedan diferidos. El selector y el compositor muestran disponibilidad, fallos y cuota. El usuario elige y confirma otro destino. [Decisión y cierre observable](tasks/T-094-ai-workspace.md#decisión-de-alcance-del-dueño). FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Pendientes del dueño

| Tema | Qué falta |
|---|---|
| PostgreSQL Free de Render | Vence el 2026-12-11 a las 22:35 de Buenos Aires si sigue la misma instancia. Antes: exportar, restaurar en local una cuenta vacía, cotejar ambos espacios y recién entonces reemplazar la base. [Procedimiento](DEPLOYMENT.md#respaldo-y-reemplazo-de-postgresql-free) |
| Sonda interna en Render | Ensayo pendiente de autorización expresa sobre SHA y ventana. [Receta](DEPLOYMENT.md#ensayo-de-la-sonda-interna-en-render-free) |
| SP-06 | Prueba en Android físico con teclado real y zoom nativo |
| Limpieza local | Hay decenas de worktrees en `.orchestrator/`, ramas locales ya mergeadas y siete stashes viejos. Listarlos y decidir cuáles se borran; ningún agente los elimina sin esa decisión |

Render: Auto-Deploy **On Commit** para `main`; cada merge despliega, también los documentales.

## Gates diferidos

| Dato | Valor |
|---|---|
| Último integrado válido | FULL local del 2026-11-15 sobre `398801f` ([T-069](tasks/T-069-ocr-workspace.md#evidencia-del-full-de-cierre)); STARTER de T-068 conservado |
| Mergeado desde entonces | T-070 (recorrido E2E de OCR), T-074 (navegación de Imagen), T-071 y T-092 (documentales), la adopción documental del flujo y el encadenamiento del lote hasta T-085 |
| Corte acumulado | Desde `7aa8946` hasta el HEAD de `main` que indique el dueño ([TESTING](TESTING.md#corte-acumulado-vigente)). El FULL/STARTER de I5 sigue diferido |
| Recomendación | Ejecutar el integrado del corte acumulado con V8 y V9 cuando el dueño lo ordene. T-094 incorpora rutas privadas y cambia Compose |

### Prompt de la siguiente sesión

```text
Frontera reviewer independiente de T-095 en MatiasNicolasAcevedo/devnotes, en sesión distinta de la del implementer. Leé AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/tasks/T-095-trailer-v2.md y media/trailer-v2/STORYBOARD.md. PRECONDICIÓN: gh pr view 91 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup devuelve OPEN, no draft, base main con 076e4ed32f82fd2ee9fbd25ee7de4d743ecd2e9c como ancestro y el commit técnico 027f02d contenido en el HEAD; si no, devolvé el paso vigente. ACCIÓN: revisá el diff contra la decisión del dueño del 2026-11-23 (un único corte de escritorio 16:9, ventana que se achica y móvil como función), el storyboard y cada rótulo frente al producto. En media/trailer-v2 ejecutá npm run check y npm run render (HyperFrames 0.9.37). Desde renders ejecutá ffprobe -v error -show_entries stream=codec_type,width,height:format=duration -of json devnotes-trailer-v2-16x9.mp4 y mirá el MP4 completo con sonido, que el implementer no pudo escuchar. Confirmá que trailer/ sigue sin versionar ni modificar y que no se versionan WAV, MP4 ni cachés. FULL/STARTER: DIFERIDO POR EL DUEÑO. Ante hallazgos devolvé el mismo PR con la lista y el prompt de corrección. SALIDA: si aprobás y verify-required está verde sobre el HEAD, hacé squash ligado a ese HEAD según docs/AUTONOMY.md, verificá MERGED con gh pr view 91 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit y entregá completo el prompt de T-096 de la tarea con el oid real.
```
