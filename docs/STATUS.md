# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-078](tasks/T-078-free-notes-storage.md) · Persistencia privada para notas libres · [S-113](specs/S-113-free-notes.md) |
| Estado | `in_review` |
| Acción actual | Revisión independiente del almacenamiento interno de Libres |
| Rama / PR | `codex/t-078-free-notes-storage` · [PR #81](https://github.com/MatiasNicolasAcevedo/devnotes/pull/81) |

Modo `FRONTERA_CONTINUA`. El 2026-11-16 el dueño adoptó el [flujo de trabajo](WORKFLOW.md): planner, implementer y reviewer que mergea; gate diario con pruebas dirigidas; gates largos diferidos. Las decisiones vigentes están en [AUTONOMY](AUTONOMY.md#modo-y-decisiones-vigentes).

El [lote Imagen, Libres e IA](BACKLOG.md#lote-imagen-libres-e-ia) encadena T-073 a T-091, una tarea y un PR por vez. T-077 quedó mergeada y conciliada.

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
| Mergeado desde entonces | T-070 (recorrido E2E de OCR), T-074 (navegación de Imagen), T-071 y T-092 (documentales) y la adopción documental del flujo |
| Corte acumulado | Desde `7aa8946` hasta el HEAD de `main` que indique el dueño ([TESTING](TESTING.md#corte-acumulado-vigente)). El FULL/STARTER de I5 sigue diferido |
| Recomendación | Ejecutar el integrado del corte acumulado con V8 y V9 cuando el dueño lo ordene |

### Prompt de la siguiente sesión

```text
Actuá como frontera reviewer independiente de T-078 en MatiasNicolasAcevedo/devnotes. Sesión nueva.

LEER: AGENTS.md, server/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-078-free-notes-storage.md, S-113, el documento de Libres en S-114 y el diff del PR 81.
PRECONDICIÓN: gh pr view 81 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup debe confirmar OPEN, listo, base main en 84151b0a782760e278280abd344ce9ad3e0a285f y verify-required SUCCESS para headRefOid. Usá el HEAD publicado en un worktree aislado y comprobá git diff --exit-code e6e9c3744d3e956f00d9581a17df88b57e972992 HEAD -- server para vincularlo con las fuentes probadas.
ACCIÓN: Revisá V9 sobre datos previos, aislamiento por cuenta y espacio, paginación, validación, revisión concurrente y recibos de 24 h. Comprobá el gate diario de T-078. Si hay hallazgos, publicá su lista cerrada para una sesión de corrección. Si aprobás y AUTONOMY lo permite, publicá la transición, esperá verify-required del nuevo HEAD, ligá el veredicto a HEAD/base, hacé squash y confirmá MERGED con gh pr view 81 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit,baseRefName.
GATE: Backend dirigido de T-078, docs-check y verify-required del HEAD revisado. FULL/STARTER: DIFERIDO POR EL DUEÑO.
SALIDA: Veredicto independiente y prompt vigente. Si confirmás MERGED, entregá el prompt de frontera implementer de T-079, con la conciliación de T-078 en su primer commit. Conservá Render Auto-Deploy On Commit.
```
