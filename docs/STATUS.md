# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-096](tasks/T-096-narrated-demo.md) |
| Estado | `mergeable` |
| Siguiente acción | Reviewer APROBÓ el HEAD revisado y el dueño confirmó haber visto y escuchado `demo.mp4`; squash merge del PR #92 y después frontera planner de T-097 ([revisión](tasks/T-096-narrated-demo.md#revisión-independiente)) |
| Rama / PR | `codex/t-096-narrated-demo` · [PR #92](https://github.com/MatiasNicolasAcevedo/devnotes/pull/92) |

Modo `FRONTERA_CONTINUA`. T-095 conciliada ([PR #91](https://github.com/MatiasNicolasAcevedo/devnotes/pull/91) MERGED, `b0e46a3`). La [cola](BACKLOG.md#lote-imagen-libres-e-ia) termina con la demo narrada; el dueño pidió después una página Demo con los dos videos ([intención](tasks/T-096-narrated-demo.md#intención-del-dueño-para-la-tarea-siguiente)). [Cron externo configurado](DEPLOYMENT.md#despertador-externo-de-devnotes).

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
Frontera planner de T-097 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, docs/STATUS.md, docs/agents/planner.md, docs/WORKFLOW.md y docs/tasks/T-096-narrated-demo.md («Intención del dueño para la tarea siguiente») y media/demo/YOUTUBE.md. PRECONDICIÓN: gh pr view 92 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit devuelve MERGED con mergedAt y mergeCommit.oid válidos, y git merge-base --is-ancestor con ese oid y origin/main sale con exit 0; si no, devolvé el paso vigente. ACCIÓN: conciliá T-096 a done con el SHA de merge en una rama de planificación. Escribí T-097, la página Demo: destino Demo destacado junto a Historial, reproductor central con lista lateral de los dos videos, embed youtube-nocookie cargado al hacer clic con los IDs -xhokMtK-Hw (tráiler) y XAIHdmHAhA0 (demo) y las portadas de media/demo/youtube. Resolvé con el dueño el lugar en la navegación móvil de cinco destinos y la visibilidad sin sesión, y definí pruebas de componente y el E2E filtrado. Encolala en BACKLOG y STATUS. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: PR de planificación con el contrato y el prompt completo para el implementer de T-097.
```
