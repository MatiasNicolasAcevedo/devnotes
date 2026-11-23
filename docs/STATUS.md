# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-097](tasks/T-097-demo-page.md) |
| Estado | `mergeable` |
| Siguiente acción | Revisión independiente **APROBADA** sobre `22f7c0d` ([veredicto](tasks/T-097-demo-page.md#revisión-independiente)); squash de [PR #94](https://github.com/MatiasNicolasAcevedo/devnotes/pull/94) por el reviewer. Después, frontera planner de cierre del M9 |
| Rama / PR | `codex/t-097-demo-page` · [PR #94](https://github.com/MatiasNicolasAcevedo/devnotes/pull/94) |

Modo `FRONTERA_CONTINUA`. T-096 conciliada ([PR #92](https://github.com/MatiasNicolasAcevedo/devnotes/pull/92) MERGED, `5759658`). La [cola](BACKLOG.md#lote-imagen-libres-e-ia) termina con T-097: página Demo pública con el tráiler y la demo de YouTube, destino rojo en la barra superior también en móvil ([decisiones del dueño](tasks/T-097-demo-page.md#decisiones-del-dueño)). [Cron externo configurado](DEPLOYMENT.md#despertador-externo-de-devnotes).

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
| Mergeado desde entonces | T-070 (recorrido E2E de OCR), T-074 (navegación de Imagen), T-071 y T-092 (documentales), la adopción documental del flujo, el encadenamiento del lote hasta T-085 y T-093 a T-096 (IA Free, tráiler y demo narrada) |
| Corte acumulado | Desde `7aa8946` hasta el HEAD de `main` que indique el dueño ([TESTING](TESTING.md#corte-acumulado-vigente)). El FULL/STARTER de I5 sigue diferido |
| Recomendación | Ejecutar el integrado del corte acumulado con V8 y V9 cuando el dueño lo ordene. T-094 incorpora rutas privadas y cambia Compose |

### Prompt de la siguiente sesión

```text
Frontera planner de cierre del M9 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, docs/STATUS.md, docs/agents/planner.md, docs/AUTONOMY.md y docs/tasks/T-097-demo-page.md. PRECONDICIÓN: gh pr view 94 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit devuelve MERGED con mergedAt y mergeCommit.oid válidos, y git merge-base --is-ancestor con ese oid y origin/main sale con exit 0; si no, devolvé el paso vigente. ACCIÓN: conciliá T-097 a done con el SHA de merge en una rama de planificación (tarea, BACKLOG, ROADMAP M9, STATUS y la fila de T-097 en AUTONOMY). No hay tarea siguiente predefinida: presentá al dueño los pendientes de STATUS (PostgreSQL Free vence el 2026-12-11, sonda interna, SP-06, limpieza local) y la recomendación del integrado del corte acumulado, y preguntá qué sigue. Sin decisión del dueño no escribas tareas nuevas. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: PR de planificación con la conciliación y el prompt completo de la sesión que el dueño elija.
```
