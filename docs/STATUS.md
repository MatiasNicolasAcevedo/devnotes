# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-081](tasks/T-081-compact-daily-notes.md) · Diario compacto · [S-114](specs/S-114-writing-editor.md) |
| Estado | `in_review` |
| Acción actual | Revisión independiente del diario compacto |
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
Actuá como frontera reviewer independiente de T-081 en MatiasNicolasAcevedo/devnotes. Sesión nueva sobre el PR #84.

LEER: AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-081-compact-daily-notes.md y la sección del diario de docs/specs/S-114-writing-editor.md.

PRECONDICIÓN: gh pr view 84 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup debe confirmar OPEN, listo para revisión, verify-required SUCCESS y base main@8f4ea2c3f32cff823b5a9e3d3ffd17b5217d4b6e. Tras actualizar los remotos, el HEAD debe coincidir con git log -1 --format=%H origin/codex/t-081-compact-daily-notes -- docs/STATUS.md y tener como padre técnico 7011d41cf6a36e90f936eff57e6b602e3fb8e672. Si cambió, informá el estado comprobado y entregá el prompt vigente.

ACCIÓN: Revisá el diff publicado y la evidencia del diario compacto. Cotejá la primera línea a 768×559, el reflujo y el foco a 320/375/1280, Libres, Hoy, enlace y copia en Herramientas, Guardar versión y el acceso al borrador sin versión por calendario y URL. Comprobá que Historial solo liste versiones manuales.

GATE: Repetí solo los dirigidos que pida el riesgo y comprobá docs-check, git diff --check y verify-required SUCCESS del HEAD que se revise. FULL/STARTER: DIFERIDO POR EL DUEÑO.

SALIDA: Registrá el veredicto independiente ligado a HEAD/base. Si aprobás, seguí AUTONOMY para el squash y verificá MERGED, mergedAt y mergeCommit.oid del PR #84. Preservá Render Auto-Deploy On Commit. Dejá un único prompt vigente y repetilo completo al final de la respuesta.
```
