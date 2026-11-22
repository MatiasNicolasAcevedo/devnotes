# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-081](tasks/T-081-compact-daily-notes.md) · Diario compacto · [S-114](specs/S-114-writing-editor.md) |
| Estado | `changes_requested` |
| Acción actual | Implementer de corrección autorizada para la altura del editor en CA-01 móvil |
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
Actuá como frontera implementer de corrección de T-081 en MatiasNicolasAcevedo/devnotes. Sesión nueva en codex/t-081-compact-daily-notes sobre el PR #84.

LEER: AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-081-compact-daily-notes.md y la sección del diario de docs/specs/S-114-writing-editor.md.

PRECONDICIÓN: gh pr view 84 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup debe confirmar OPEN, listo para revisión y base main@8f4ea2c3f32cff823b5a9e3d3ffd17b5217d4b6e. Tras git fetch, cotejá que el HEAD publicado contiene esta decisión y que su padre es 0bb5d92d5f0b4ede8e6b4fe23f78068129e82da2. Si cambió, informá el estado comprobado y entregá el prompt vigente.

ACCIÓN: Usá el rojo documentado de CA-01 móvil como referencia (borde 766 px, límite 763 px, verde en main). Aplicá una corrección acotada para que DailyNotesPage use el espacio disponible sobre la navegación móvil. Conservá scroll, foco, reflujo y las medidas de primera línea de S-114. Los dos hallazgos de la ronda anterior ya están cerrados.

GATE: CA-01 móvil con namespace propio y aserciones geométricas intactas, comandos y filtros originales de T-081, docs-check, git diff --check, perfil informativo y verify-required SUCCESS sobre el HEAD publicado. FULL/STARTER: DIFERIDO POR EL DUEÑO.

SALIDA: Publicá la corrección y su evidencia con HEAD y base en el PR #84. Dejá el único prompt para la revisión independiente de cierre autorizada. Mantené T-082 pendiente hasta confirmar MERGED del PR #84 y preservá Render Auto-Deploy On Commit.
```
