# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-073](tasks/T-073-ocr-windows-paste.md) · Pegar recortes de Windows en OCR · [S-112](specs/S-112-screenshot-ocr.md) |
| Estado | `in_review` |
| Acción actual | Frontera revisa T-073 en sesión independiente |
| Rama / PR | `codex/t-073-ocr-windows-paste-fix` · [PR76](https://github.com/MatiasNicolasAcevedo/devnotes/pull/76) |

Modo `FRONTERA_CONTINUA`. El 2026-11-16 el dueño adoptó el [flujo de trabajo](WORKFLOW.md): planner, implementer y reviewer que mergea; gate diario con pruebas dirigidas; gates largos diferidos. Las decisiones vigentes están en [AUTONOMY](AUTONOMY.md#modo-y-decisiones-vigentes).

El [lote Imagen, Libres e IA](BACKLOG.md#lote-imagen-libres-e-ia) encadena T-073 a T-091, una tarea y un PR por vez. T-074 espera la confirmación del merge de T-073.

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
| Mergeado desde entonces | T-070 (recorrido E2E de OCR), T-071 y T-092 (documentales) y la adopción documental del flujo |
| Corte acumulado | Desde `7aa8946` hasta el HEAD de `main` que indique el dueño ([TESTING](TESTING.md#corte-acumulado-vigente)). El FULL/STARTER de I5 sigue diferido |
| Recomendación | Ninguna por ahora. Reevaluar al mergear T-077 (cierra Imagen) o antes si un PR toca dependencias, Docker o migraciones |

### Prompt de la siguiente sesión

```text
Actuá como frontera reviewer de T-073 (PR #76) en MatiasNicolasAcevedo/devnotes. Sesión nueva e independiente.

LEER: AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/agents/merger.md, docs/AUTONOMY.md, docs/tasks/T-073-ocr-windows-paste.md, docs/specs/S-112-screenshot-ocr.md y la sección Imagen de docs/design/WRITING-WORKSPACES.md.
PRECONDICIÓN: gh pr view 76 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,baseRefName,statusCheckRollup debe mostrar OPEN, listo para revisión, base main b6728d0669008e550fada544f474c7ac8315e1d6 y el HEAD publicado indicado en la descripción del PR. Verificá que ese HEAD no cambia client/ ni e2e/ respecto del SHA técnico 2ebaac0a1f1dd7a70db4a6baf90b0061330af2be. Si cambió HEAD o base, cotejá el diff y revalidá el gate que corresponda.
ACCIÓN: 1) Revisá el diff publicado en checkout nuevo, los criterios de S-112 y la evidencia dirigida, incluido el recorte real de Windows. 2) Si hay hallazgos, dejá changes_requested y el prompt de corrección para el mismo PR. Si aprobás, publicá la transición documental a mergeable; comprobá el nuevo HEAD, base, docs-check y verify-required verde antes de emitir APROBADO y hacer squash con --match-head-commit, según AUTONOMY. 3) Confirmá state MERGED, mergedAt y mergeCommit.oid con gh pr view 76 --repo MatiasNicolasAcevedo/devnotes antes de habilitar T-074.
GATE: diario. FULL y STARTER están diferidos: no ejecutarlos sin orden expresa del dueño.
SALIDA: veredicto independiente sobre HEAD y base exactos y, solo tras confirmar MERGED, prompt para que la nueva sesión de T-074 concilie T-073 y avance el lote. Conservá Render Auto-Deploy On Commit.
```
