# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-077](tasks/T-077-image-text-library-ui.md) · Guardar, abrir y borrar textos de Imagen · [S-112](specs/S-112-screenshot-ocr.md) |
| Estado | `in_review` |
| Acción actual | Frontera reviewer independiente revisa la ronda 2 del PR (H1 y H2 corregidos en `f7ebbd9`) |
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
Actuá como frontera reviewer independiente de T-077 en MatiasNicolasAcevedo/devnotes. Sesión nueva, ronda 2 de 2. No revises si implementaste o corregiste esta tarea.

LEER: AGENTS.md, server/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/AUTONOMY.md y docs/tasks/T-077-image-text-library-ui.md (checkpoint vigente y hallazgos H1 y H2).
PRECONDICIÓN: gh pr view 80 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup debe confirmar OPEN, listo, base edb27c87a1097e605d0ed9d0a8dd4327911a5187 y verify-required SUCCESS. Tras git fetch origin main codex/t-077-image-text-library-ui, headRefOid debe coincidir con git log -1 --format=%H origin/codex/t-077-image-text-library-ui -- docs/STATUS.md, y git diff --name-only f7ebbd9f625008947cbe60f6e0f9769c24d06b8b origin/codex/t-077-image-text-library-ui solo debe listar la tarea y STATUS. Si no se cumple, informá el estado real y entregá el prompt corregido.
ACCIÓN: En un worktree aislado del HEAD publicado, verificá solo el cierre de H1 y H2 y que git diff --exit-code e1a57e34f10c9bf5757e4c7d0daa337314e3ca02 origin/codex/t-077-image-text-library-ui -- server/src/main client e2e dé exit 0 (cliente y E2E quedan acreditados por la ronda 1). Desde server/, ./mvnw -q verify -Dtest=ImageTextServiceTest,SecurityConfigTest -Dit.test=ImageTextApiIT,OcrExtractionApiIT,OpenApiContractIT -Djacoco.skip=true con exit 0 y SecurityConfigTest 14/14. docs-check y git diff --check. FULL/STARTER: DIFERIDO POR EL DUEÑO.
SALIDA: Si aprobás, commit en la rama con la tarea en mergeable y STATUS con el prompt del implementer de la tarea siguiente (precondición «PR 80 MERGED»), push, verify-required verde del HEAD final, squash merge según AUTONOMY sin --admin y MERGED confirmado con gh pr view 80 --repo MatiasNicolasAcevedo/devnotes (state, mergedAt y mergeCommit.oid). Si quedan hallazgos tras la ronda 2, devolvé a frontera o dueño con causa, evidencia y la pregunta exacta. Terminá con el prompt siguiente completo en la respuesta final.
```
