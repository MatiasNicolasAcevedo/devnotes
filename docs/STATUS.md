# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-095](tasks/T-095-trailer-v2.md) |
| Estado | `changes_requested` |
| Siguiente acción | Implementer de corrección resuelve H1 y H2 en el mismo PR; luego reviewer de ronda 2 y escucha del dueño ([checkpoint](tasks/T-095-trailer-v2.md#checkpoint-vigente)) |
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
Frontera implementer de corrección de T-095, ronda 1, en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/tasks/T-095-trailer-v2.md (Checkpoint vigente, hallazgos H1 y H2) y media/trailer-v2/STORYBOARD.md. PRECONDICIÓN: gh pr view 91 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid devuelve OPEN y no draft, con el commit de CAMBIOS REQUERIDOS del reviewer como HEAD o ancestro; si no, devolvé el paso vigente. ACCIÓN: en codex/t-095-trailer-v2 corregí solo H1 («Copiado» de Imagen recortado: pasarlo a una línea «Texto copiado» dentro de la tarjeta, como ImageWorkspace.tsx) y H2 (diálogo de enlace con «Agregar enlace» y «1279» debajo, como LinkDialog.tsx), en index.html y, si cambia un rótulo, en STORYBOARD.md. En media/trailer-v2 ejecutá npm run check y npm run render; desde renders, ffprobe -v error -show_entries stream=codec_type,width,height:format=duration -of json devnotes-trailer-v2-16x9.mp4, sha256sum y fotogramas en 11,5 s y 25,6 s. Confirmá trailer/ sin versionar ni modificar y sin WAV/MP4/cachés en el índice. Reemplazá el checkpoint con la tabla de correcciones, STATUS a in_review, commit y push con rutas explícitas. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: PR 91 actualizado con verify-required verde y el prompt completo de reviewer independiente de ronda 2, que pida además la confirmación del dueño de haber escuchado el MP4 completo con sonido antes del merge.
```
