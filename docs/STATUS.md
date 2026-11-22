# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-084](tasks/T-084-free-notes-headings.md) · Títulos y negrita en Libres · [S-114](specs/S-114-writing-editor.md) |
| Estado | `in_review` |
| Acción actual | Revisión independiente de Formato en Libres |
| Rama / PR | `codex/t-084-free-notes-headings` · [PR #87](https://github.com/MatiasNicolasAcevedo/devnotes/pull/87) |

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
Actuá como frontera reviewer independiente de T-084 en MatiasNicolasAcevedo/devnotes. Sesión nueva, PR #87.

LEER: AGENTS.md, client/AGENTS.md, server/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-084-free-notes-headings.md y la sección Formato de docs/specs/S-114-writing-editor.md.

PRECONDICIÓN: gh pr view 87 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup debe confirmar OPEN, isDraft=false, base main en 3c7dc999419a2930a881be68fe0cb44d398a2090 y verify-required SUCCESS. Tomá headRefOid como $reviewHead. Tras git fetch origin main codex/t-084-free-notes-headings, comprobá que git rev-parse "${reviewHead}^" devuelva 874c071cca41988fcd7c43f687b72bb351afe9ae y que git diff --name-only "${reviewHead}^" $reviewHead liste solo docs/STATUS.md y docs/tasks/T-084-free-notes-headings.md. Si difiere, informá el estado real y corregí el prompt.

ACCIÓN: Revisá el diff publicado contra esa base desde un checkout aislado. Contrastá títulos, negrita, foco, selección, listas, código, diario y restauración XLSX v4 con S-114. Si hay hallazgos, registrá sus condiciones de cierre y devolvé el mismo PR a un implementer nuevo. Si aprobás, publicá la transición documental, verificá el HEAD nuevo y hacé squash merge ligado al SHA revisado según AUTONOMY. Confirmá MERGED, mergedAt y mergeCommit.oid con gh pr view 87 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit.

GATE: Dirigidos de T-084, E2E free-notes: headings solo desktop con namespace propio, docs-check y verify-required sobre el HEAD publicado. FULL/STARTER: DIFERIDO POR EL DUEÑO.

SALIDA: Registrá HEAD/base y el veredicto. Si confirmás MERGED, dejá el único prompt de T-085 con PR #87 MERGED como precondición y copiá ese prompt completo al final de tu respuesta. Preservá Render Auto-Deploy On Commit.
```
