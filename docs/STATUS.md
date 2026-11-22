# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-084](tasks/T-084-free-notes-headings.md) · Títulos y negrita en Libres · [S-114](specs/S-114-writing-editor.md) |
| Estado | `in_progress` |
| Acción actual | Implementar y verificar Formato en Libres |
| Rama / PR | `codex/t-084-free-notes-headings` |

Modo `FRONTERA_CONTINUA`. El 2026-11-16 el dueño adoptó el [flujo de trabajo](WORKFLOW.md): planner, implementer y reviewer que mergea; gate diario con pruebas dirigidas; gates largos diferidos. Las decisiones vigentes están en [AUTONOMY](AUTONOMY.md#modo-y-decisiones-vigentes).

El [lote Imagen, Libres e IA](BACKLOG.md#lote-imagen-libres-e-ia) encadena T-073 a T-091, una tarea y un PR por vez. T-083 quedó mergeada y conciliada.

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
| Mergeado desde entonces | T-070 (recorrido E2E de OCR), T-074 (navegación de Imagen), T-071 y T-092 (documentales), la adopción documental del flujo y el encadenamiento del lote hasta T-083 |
| Corte acumulado | Desde `7aa8946` hasta el HEAD de `main` que indique el dueño ([TESTING](TESTING.md#corte-acumulado-vigente)). El FULL/STARTER de I5 sigue diferido |
| Recomendación | Ejecutar el integrado del corte acumulado con V8 y V9 cuando el dueño lo ordene. T-080 incorpora rutas privadas en Spring Security |

### Prompt de la siguiente sesión

```text
Actuá como frontera implementer de T-084 en MatiasNicolasAcevedo/devnotes. Sesión nueva, rama codex/t-084-free-notes-headings.

LEER: AGENTS.md, client/AGENTS.md, server/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-083-free-notes-code-blocks.md, docs/tasks/T-084-free-notes-headings.md y la sección Formato de docs/specs/S-114-writing-editor.md.

PRECONDICIÓN: gh pr view 86 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit debe confirmar MERGED con mergedAt y mergeCommit.oid válidos. Tomá mergeCommit.oid como $mergeOid. Ejecutá git fetch origin main y git merge-base --is-ancestor $mergeOid origin/main. Si falla una comprobación, informá el estado real y retomá T-083 antes de habilitar T-084.

ACCIÓN: Creá la rama desde main actualizado. Conciliá T-083 como done en el primer commit con el SHA y fecha confirmados, y habilitá T-084. Implementá el menú Formato con Párrafo, Título 1–3, Negrita y Quitar formato según S-114. Conservá texto, selección, foco y compatibilidad con listas, bloques de código y diario. Extendé validadores y restauración XLSX v4.

GATE: Ejecutá los dirigidos y typecheck de T-084, bash scripts/e2e.sh --grep 'free-notes: headings' --project desktop con un namespace propio, docs-check, git diff --check y verify-required sobre el HEAD publicado. FULL/STARTER: DIFERIDO POR EL DUEÑO.

SALIDA: Publicá un único PR contra main, guardá evidencia por HEAD/base y terminá con el único prompt de reviewer independiente en STATUS y en la respuesta final. Preservá Render Auto-Deploy On Commit.
```
