# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-081](tasks/T-081-compact-daily-notes.md) · Diario compacto · [S-114](specs/S-114-writing-editor.md) |
| Estado | `in_progress` |
| Acción actual | Implementar y medir el diario compacto |
| Rama / PR | `codex/t-081-compact-daily-notes` |

Modo `FRONTERA_CONTINUA`. El 2026-11-16 el dueño adoptó el [flujo de trabajo](WORKFLOW.md): planner, implementer y reviewer que mergea; gate diario con pruebas dirigidas; gates largos diferidos. Las decisiones vigentes están en [AUTONOMY](AUTONOMY.md#modo-y-decisiones-vigentes).

El [lote Imagen, Libres e IA](BACKLOG.md#lote-imagen-libres-e-ia) encadena T-073 a T-091, una tarea y un PR por vez. T-080 quedó mergeada y conciliada.

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
Actuá como frontera implementer de T-081 en MatiasNicolasAcevedo/devnotes. Sesión nueva, rama codex/t-081-compact-daily-notes desde main actualizado.

LEER: AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-080-free-notes-workspace.md, docs/tasks/T-081-compact-daily-notes.md y las secciones del diario compacto de docs/specs/S-114-writing-editor.md.

PRECONDICIÓN: gh pr view 83 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit debe confirmar MERGED con mergedAt y mergeCommit.oid válidos. Verificá que main actualizado contiene ese squash antes de comenzar T-081. Si la precondición cambió, informá el estado comprobado y entregá el prompt vigente.

ACCIÓN: En el primer commit conciliá T-080 como done con el SHA de squash verificado y habilitá T-081. Medí el diario antes y después según la tarea y compactá el diario y su espacio contextual conservando Libres, fecha, Hoy, enlaces, copiar y Guardar versión. Comprobá calendario, URL directa e Historial según la aceptación.

GATE: Ejecutá el cliente dirigido, typecheck, el E2E filtrado de desktop y mobile con namespaces propios, docs-check y git diff --check según T-081. FULL/STARTER: DIFERIDO POR EL DUEÑO.

SALIDA: Publicá un PR contra main, registrá HEAD/base y evidencia de T-081, confirmá verify-required SUCCESS y dejá un único prompt de reviewer independiente en STATUS y al final de la respuesta. Preservá Render Auto-Deploy On Commit.
```
