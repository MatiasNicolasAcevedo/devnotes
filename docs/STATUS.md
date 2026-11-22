# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-083](tasks/T-083-free-notes-code-blocks.md) · Bloques de código en Libres · [S-114](specs/S-114-writing-editor.md) |
| Estado | `in_review` |
| Acción actual | Revisión independiente del PR #86 |
| Rama / PR | `codex/t-083-free-notes-code-blocks` · [PR #86](https://github.com/MatiasNicolasAcevedo/devnotes/pull/86) |

Modo `FRONTERA_CONTINUA`. El 2026-11-16 el dueño adoptó el [flujo de trabajo](WORKFLOW.md): planner, implementer y reviewer que mergea; gate diario con pruebas dirigidas; gates largos diferidos. Las decisiones vigentes están en [AUTONOMY](AUTONOMY.md#modo-y-decisiones-vigentes).

El [lote Imagen, Libres e IA](BACKLOG.md#lote-imagen-libres-e-ia) encadena T-073 a T-091, una tarea y un PR por vez. T-082 quedó mergeada y conciliada.

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
| Mergeado desde entonces | T-070 (recorrido E2E de OCR), T-074 (navegación de Imagen), T-071 y T-092 (documentales), la adopción documental del flujo y el encadenamiento del lote hasta T-082 |
| Corte acumulado | Desde `7aa8946` hasta el HEAD de `main` que indique el dueño ([TESTING](TESTING.md#corte-acumulado-vigente)). El FULL/STARTER de I5 sigue diferido |
| Recomendación | Ejecutar el integrado del corte acumulado con V8 y V9 cuando el dueño lo ordene. T-080 incorpora rutas privadas en Spring Security |

### Prompt de la siguiente sesión

```text
Actuá como frontera reviewer independiente de T-083 en MatiasNicolasAcevedo/devnotes. Sesión nueva, PR #86, rama codex/t-083-free-notes-code-blocks.

LEER: AGENTS.md, client/AGENTS.md, server/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-083-free-notes-code-blocks.md y la sección Bloque de código de docs/specs/S-114-writing-editor.md.

PRECONDICIÓN: gh pr view 86 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup debe mostrar OPEN, isDraft false, base main en 1b6ee91b2c5276e170da00aa0204d222892096c0 y verify-required exitoso para el HEAD publicado. Traé la rama y comprobá que el HEAD publicado coincide con el remoto y que el commit de entrega solo cambia la tarea y STATUS respecto de las fuentes probadas en 31b2d2ff3261858416f172c4ae724c8ac9bf19b9. Si difiere el HEAD técnico o la base, invalidá la evidencia afectada e informá el estado real.

ACCIÓN: Revisá el diff sobre los SHA publicados y contrastá la evidencia de validación, guardado, copia exacta, deshacer, scroll, restauración XLSX v4 y compatibilidad de listas y diario. Si hay hallazgos, dejá la corrección en el mismo PR para una sesión implementer nueva. Si aprobás, seguí la transición y el squash por SHA de AUTONOMY.md. Confirmá MERGED con gh pr view 86 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit.

GATE: Diario según riesgo, con E2E filtrado si corresponde y verify-required verde en el HEAD que se vaya a mergear. FULL/STARTER: DIFERIDO POR EL DUEÑO.

SALIDA: Veredicto con HEAD/base y evidencia, más el único prompt siguiente según el resultado. Preservá Render Auto-Deploy On Commit.
```
