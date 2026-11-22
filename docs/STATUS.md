# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-081](tasks/T-081-compact-daily-notes.md) · Diario compacto · [S-114](specs/S-114-writing-editor.md) |
| Estado | `changes_requested` |
| Acción actual | Corregir reapertura de Herramientas al cambiar de ancho y comentarios CSS |
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
Actuá como frontera implementer de corrección de T-081 en MatiasNicolasAcevedo/devnotes. Sesión nueva sobre el mismo PR #84 y la rama codex/t-081-compact-daily-notes.

LEER: AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/AUTONOMY.md, docs/TESTING.md, el checkpoint de docs/tasks/T-081-compact-daily-notes.md y la sección del diario de docs/specs/S-114-writing-editor.md.

PRECONDICIÓN: gh pr view 84 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup debe confirmar OPEN, listo para revisión y base main@8f4ea2c3f32cff823b5a9e3d3ffd17b5217d4b6e. Tras git fetch, el HEAD debe coincidir con git log -1 --format=%H origin/codex/t-081-compact-daily-notes -- docs/STATUS.md y tener como padre a3cd8aa26d956a21c63c6222a6a41640ffbb2600, el HEAD revisado. Si cambió, informá el estado comprobado y entregá el prompt vigente.

ACCIÓN: Cerrá los dos hallazgos del checkpoint. Primero reproducí en rojo el ciclo 375 → 1280 → 320 con Herramientas abierto al inicio, y corregí el estado del diálogo para que no se reabra solo y el editor conserve el foco al volver a 320. Verificá que la apertura deliberada, Escape, selección del enlace y Copiar nota sigan operativos. Restaurá los tres comentarios CSS dañados a su texto UTF-8 de la base.

GATE: Ejecutá el cliente dirigido, typecheck y E2E filtrado de T-081 con namespaces propios. Incluí la regresión del cruce de ancho en el filtro móvil. Comprobá docs-check, git diff --check y verify-required SUCCESS del nuevo HEAD. FULL/STARTER: DIFERIDO POR EL DUEÑO.

SALIDA: Publicá la corrección en el mismo PR, registrá rojo/verde y HEAD/base y dejá un único prompt para una nueva sesión de reviewer independiente. Preservá Render Auto-Deploy On Commit.
```
