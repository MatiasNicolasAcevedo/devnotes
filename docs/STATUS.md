# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-084](tasks/T-084-free-notes-headings.md) · Títulos y negrita en Libres · [S-114](specs/S-114-writing-editor.md) |
| Estado | `mergeable` |
| Acción actual | Comprobar CI de la transición y confirmar el squash de T-084 |
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
Actuá como frontera implementer de T-085 en MatiasNicolasAcevedo/devnotes. Sesión nueva.

LEER: AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-085-side-reading.md y docs/specs/S-115-side-reading.md.

PRECONDICIÓN: gh pr view 87 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit debe confirmar MERGED con mergedAt y mergeCommit.oid válidos. Tras git fetch origin main, comprobá que el SHA confirmado pertenece a origin/main con git merge-base --is-ancestor, pasando mergeCommit.oid y origin/main en ese orden. Si difiere, informá el estado real y corregí el prompt.

ACCIÓN: Creá codex/t-085-side-reading desde main actualizado y conciliá T-084 como done en el primer commit, con la evidencia del merge. Implementá la lectura lateral en Diario y Libres según S-115, preservando borrador, scroll, foco y límites de cuenta y espacio. Publicá un único PR para T-085 y verificá su HEAD/base y CI.

GATE: Dirigidos de T-085, typecheck, E2E filtrado 'side reading:' en desktop y mobile con namespaces propios, docs-check y verify-required sobre el HEAD publicado. FULL/STARTER: DIFERIDO POR EL DUEÑO.

SALIDA: Registrá HEAD/base, evidencia y limpieza por labels en la tarea. Dejá en STATUS el único prompt para una sesión nueva de frontera reviewer del PR de T-085 y copialo completo al final de la respuesta. Preservá Render Auto-Deploy On Commit.
```
