# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-082](tasks/T-082-free-notes-lists.md) · Listas en Libres · [S-114](specs/S-114-writing-editor.md) |
| Estado | `in_progress` |
| Acción actual | Implementar y verificar listas de Libres |
| Rama / PR | `codex/t-082-free-notes-lists` |

Modo `FRONTERA_CONTINUA`. El 2026-11-16 el dueño adoptó el [flujo de trabajo](WORKFLOW.md): planner, implementer y reviewer que mergea; gate diario con pruebas dirigidas; gates largos diferidos. Las decisiones vigentes están en [AUTONOMY](AUTONOMY.md#modo-y-decisiones-vigentes).

El [lote Imagen, Libres e IA](BACKLOG.md#lote-imagen-libres-e-ia) encadena T-073 a T-091, una tarea y un PR por vez. T-081 quedó mergeada y conciliada.

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
| Recomendación | Ejecutar el integrado del corte acumulado con V8 y V9 cuando el dueño lo ordene. T-080 incorpora rutas privadas en Spring Security |

### Prompt de la siguiente sesión

```text
Actuá como frontera implementer de T-082 en MatiasNicolasAcevedo/devnotes. Sesión nueva, rama codex/t-082-free-notes-lists desde main actualizado.

LEER: AGENTS.md, client/AGENTS.md, server/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-081-compact-daily-notes.md, docs/tasks/T-082-free-notes-lists.md y la sección Lista de docs/specs/S-114-writing-editor.md.

PRECONDICIÓN: gh pr view 84 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit debe confirmar MERGED con mergedAt y mergeCommit.oid válidos. Tras git fetch origin main, guardá mergeCommit.oid en $taskMergeOid y verificá con git merge-base --is-ancestor $taskMergeOid origin/main que main contiene el squash. Si falla la precondición, informá el estado comprobado y entregá el prompt vigente.

ACCIÓN: En el primer commit conciliá T-081 como done con el SHA confirmado y habilitá T-082. Implementá viñetas, casillas y numeración en Libres, con validación, conversión, teclado y deshacer. Verificá recarga y restauración XLSX v4, rechazo de anidación y compatibilidad del diario.

GATE: Backend y cliente dirigidos, typecheck, filtro «free-notes: lists» en desktop y mobile con namespaces propios y sintaxis --project desktop o --project mobile, docs-check y git diff --check. FULL/STARTER: DIFERIDO POR EL DUEÑO.

SALIDA: Publicá el PR contra main, registrá HEAD/base y evidencia de T-082, confirmá verify-required SUCCESS y dejá el único prompt de reviewer independiente en STATUS y al final de la respuesta. Preservá Render Auto-Deploy On Commit.
```
