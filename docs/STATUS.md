# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-075](tasks/T-075-image-text-library.md) · Persistencia privada para los textos de Imagen · [S-112](specs/S-112-screenshot-ocr.md) |
| Estado | `in_review` |
| Acción actual | Frontera reviewer revisa el servicio interno y el gate dirigido |
| Rama / PR | `codex/t-075-image-text-library` · [PR #78](https://github.com/MatiasNicolasAcevedo/devnotes/pull/78) |

Modo `FRONTERA_CONTINUA`. El 2026-11-16 el dueño adoptó el [flujo de trabajo](WORKFLOW.md): planner, implementer y reviewer que mergea; gate diario con pruebas dirigidas; gates largos diferidos. Las decisiones vigentes están en [AUTONOMY](AUTONOMY.md#modo-y-decisiones-vigentes).

El [lote Imagen, Libres e IA](BACKLOG.md#lote-imagen-libres-e-ia) encadena T-073 a T-091, una tarea y un PR por vez. T-074 quedó mergeada y conciliada.

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
| Recomendación | Evaluar el corte acumulado por la migración V8 cuando el dueño ordene el integrado. Reevaluar al mergear T-077 (cierra Imagen) |

### Prompt de la siguiente sesión

```text
Actuá como frontera reviewer independiente de T-075 en MatiasNicolasAcevedo/devnotes. Sesión nueva.

LEER: AGENTS.md, server/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/AUTONOMY.md, docs/tasks/T-075-image-text-library.md y la sección Biblioteca de Imagen de docs/specs/S-112-screenshot-ocr.md.
PRECONDICIÓN: gh pr view 78 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefName,headRefOid,baseRefName,baseRefOid,statusCheckRollup debe confirmar OPEN, listo para revisión, rama codex/t-075-image-text-library, base main@da04b23f2c3bba0c45f29dfd8c51f2b6b0c1da92 y verify-required en SUCCESS. Ejecutá git fetch origin main codex/t-075-image-text-library y comprobá que headRefOid coincida con git rev-parse origin/codex/t-075-image-text-library y con git log -1 --format=%H origin/codex/t-075-image-text-library -- docs/STATUS.md. El padre de ese HEAD debe ser 94651c83eef81c886ec6e7f811ab45d1761e797c, SHA del código probado. Si cambia HEAD o base, cotejá el estado real antes de emitir veredicto.
ACCIÓN: 1) Revisá el diff completo del HEAD publicado en un checkout aislado. 2) Cotejá migración V7→V8 con datos existentes, límites Unicode, aislamiento por cuenta y espacio, cursor, recibos de 24 h, borrado y exclusión con el lock de importación. 3) Ejecutá el verify dirigido de la tarea con Surefire y Failsafe contra PostgreSQL 18.6, docs-check y diff-check. 4) Si hay hallazgos, registrá cambios requeridos en el mismo PR. Si aprobás, aplicá el protocolo de transición documental, verify-required del nuevo HEAD y squash ligado al SHA; confirmá MERGED por gh.
GATE: diario. FULL/STARTER: DIFERIDO POR EL DUEÑO.
SALIDA: veredicto con evidencia sobre HEAD y base publicados, más el prompt del implementer de corrección o de T-076 si el squash queda confirmado. Conservá Render Auto-Deploy On Commit.
```
