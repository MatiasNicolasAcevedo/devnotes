# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-081](tasks/T-081-compact-daily-notes.md) · Diario compacto · [S-114](specs/S-114-writing-editor.md) |
| Estado | `changes_requested` |
| Acción actual | Decisión de frontera tras segunda ronda por regresión de altura en CA-01 móvil |
| Rama / PR | `codex/t-081-compact-daily-notes` · [PR #84](https://github.com/MatiasNicolasAcevedo/devnotes/pull/84) |

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
Actuá como frontera para decidir el cierre de T-081 en MatiasNicolasAcevedo/devnotes. Sesión nueva sobre el PR #84.

LEER: AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-081-compact-daily-notes.md y la sección del diario de docs/specs/S-114-writing-editor.md.

PRECONDICIÓN: gh pr view 84 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup debe confirmar OPEN, listo para revisión, base main@8f4ea2c3f32cff823b5a9e3d3ffd17b5217d4b6e y el HEAD documental que contiene el veredicto de segunda ronda. Tras git fetch, comprobá que su padre es 1b0d098cf0c4939109080024785a1a12dd985009. Si cambió, informá el estado comprobado y entregá el prompt vigente.

ACCIÓN: Decidí si autorizás una corrección acotada en el mismo PR para que el área de escritura quede dentro del espacio disponible sobre la navegación móvil. En CA-01 el borde quedó en 766 px con límite de 763 px. Los dos hallazgos previos quedaron cerrados y se alcanzó el límite de dos rondas. Si autorizás la corrección, fijá como condición de cierre CA-01 móvil verde con sus aserciones intactas, más las medidas y regresiones de T-081. Conservá los SHA y la comparación con main del checkpoint.

GATE: Si autorizás la corrección, exigí CA-01 móvil con namespace propio, los filtros originales de T-081, docs-check, git diff --check y verify-required SUCCESS sobre el HEAD que se revise. FULL/STARTER: DIFERIDO POR EL DUEÑO.

SALIDA: Registrá la decisión y dejá un único prompt para el rol que corresponda. Mantené T-082 pendiente hasta la confirmación explícita de MERGED del PR #84 y preservá Render Auto-Deploy On Commit.
```
