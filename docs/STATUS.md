# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-077](tasks/T-077-image-text-library-ui.md) · Guardar, abrir y borrar textos de Imagen · [S-112](specs/S-112-screenshot-ocr.md) |
| Estado | `in_review` |
| Acción actual | Frontera reviewer revisa T-077 sobre el HEAD y la base publicados |
| Rama / PR | `codex/t-077-image-text-library-ui` · [PR #80](https://github.com/MatiasNicolasAcevedo/devnotes/pull/80) |

Modo `FRONTERA_CONTINUA`. El 2026-11-16 el dueño adoptó el [flujo de trabajo](WORKFLOW.md): planner, implementer y reviewer que mergea; gate diario con pruebas dirigidas; gates largos diferidos. Las decisiones vigentes están en [AUTONOMY](AUTONOMY.md#modo-y-decisiones-vigentes).

El [lote Imagen, Libres e IA](BACKLOG.md#lote-imagen-libres-e-ia) encadena T-073 a T-091, una tarea y un PR por vez. T-076 quedó mergeada y conciliada.

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
Actuá como frontera reviewer independiente de T-077 en MatiasNicolasAcevedo/devnotes. Sesión nueva.

LEER: AGENTS.md, server/AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-077-image-text-library-ui.md y la sección Biblioteca de Imagen de docs/specs/S-112-screenshot-ocr.md con su referencia visual.
PRECONDICIÓN: gh pr view 80 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup debe confirmar OPEN, listo para revisión, main en edb27c87a1097e605d0ed9d0a8dd4327911a5187 y verify-required SUCCESS. Tras git fetch origin main codex/t-077-image-text-library-ui, cotejá headRefOid con git log -1 --format=%H origin/codex/t-077-image-text-library-ui -- docs/STATUS.md y las fuentes probadas con el SHA del checkpoint. Si alguna comprobación falla, informá el estado real y entregá el prompt vigente.
ACCIÓN: Revisá el diff publicado en un worktree aislado y cotejá el gate diario con el HEAD y la base. Verificá propiedad por cuenta y espacio, CSRF, idempotencia y reintentos, aislamiento del borrador y foco tras borrar. Si hay hallazgos, publicalos con su prueba de cierre y devolvé al implementer del mismo PR. Si aprobás, publicá la transición a mergeable, esperá verify-required en ese HEAD y ejecutá el squash ligado al SHA revisado según AUTONOMY.
GATE: pruebas dirigidas de los riesgos encontrados, docs-check y verify-required del HEAD aprobado. FULL/STARTER: DIFERIDO POR EL DUEÑO. Conservá Render Auto-Deploy On Commit.
SALIDA: Veredicto ligado a HEAD/base. Si mergeás, confirmá MERGED en main con mergedAt y mergeCommit.oid mediante gh pr view 80 con --repo explícito. Entregá el prompt vigente, el de T-078 solo tras MERGED confirmado.
```
