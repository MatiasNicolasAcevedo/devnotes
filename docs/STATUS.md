# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-082](tasks/T-082-free-notes-lists.md) · Listas en Libres · [S-114](specs/S-114-writing-editor.md) |
| Estado | `in_review` |
| Acción actual | Revisión independiente de listas en Libres |
| Rama / PR | `codex/t-082-free-notes-lists` · [PR #85](https://github.com/MatiasNicolasAcevedo/devnotes/pull/85) |

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
| Mergeado desde entonces | T-070 (recorrido E2E de OCR), T-074 (navegación de Imagen), T-071 y T-092 (documentales), la adopción documental del flujo y el encadenamiento del lote hasta T-081 |
| Corte acumulado | Desde `7aa8946` hasta el HEAD de `main` que indique el dueño ([TESTING](TESTING.md#corte-acumulado-vigente)). El FULL/STARTER de I5 sigue diferido |
| Recomendación | Ejecutar el integrado del corte acumulado con V8 y V9 cuando el dueño lo ordene. T-080 incorpora rutas privadas en Spring Security |

### Prompt de la siguiente sesión

```text
Actuá como frontera reviewer independiente de T-082 en MatiasNicolasAcevedo/devnotes. Sesión nueva, PR #85 contra main.

LEER: AGENTS.md, client/AGENTS.md, server/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/agents/merger.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-082-free-notes-lists.md y la sección Lista de docs/specs/S-114-writing-editor.md.

PRECONDICIÓN: gh pr view 85 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup debe confirmar OPEN, listo, base main@9e545c63a52415568dde2a548c999e1b27bd80ad y verify-required SUCCESS. Tras git fetch origin main codex/t-082-free-notes-lists, comprobá que headRefOid coincide con el HEAD remoto y es el cierre documental hijo de f82041276528bb555449886299191b02f2fca6cb. Si cambia HEAD o base, informá el estado real y revisá el gate antes de evaluar el merge.

ACCIÓN: Revisá el diff publicado en un checkout aislado y cotejá esquema de Libres, conversión y deshacer, casillas por teclado y toque, portapapeles, rechazo de anidación, diario previo y recarga/restauración XLSX v4 contra la evidencia por SHA. Repetí los dirigidos que pida el riesgo. Si hay hallazgos, dejá condiciones de cierre concretas. Si aprobás, publicá la transición a mergeable con el prompt de T-083 condicionado al merge, verificá CI del nuevo HEAD y hacé squash ligado al SHA aprobado según AUTONOMY.

GATE: Pruebas dirigidas según riesgo, docs-check, git diff --check y verify-required del HEAD evaluado. FULL/STARTER: DIFERIDO POR EL DUEÑO.

SALIDA: Publicá el veredicto por HEAD/base. Si mergeás, confirmá state, mergedAt y mergeCommit.oid con gh pr view 85 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit. Cerrá con el único prompt vigente de la sesión siguiente. Preservá Render Auto-Deploy On Commit.
```
