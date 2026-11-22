# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-085](tasks/T-085-side-reading.md) · Consulta al lado · [S-115](specs/S-115-side-reading.md) |
| Estado | `in_review` |
| Acción actual | Revisión independiente de la consulta al lado en Diario y Libres |
| Rama / PR | `codex/t-085-side-reading` · [PR #88](https://github.com/MatiasNicolasAcevedo/devnotes/pull/88) |

Modo `FRONTERA_CONTINUA`. El 2026-11-16 el dueño adoptó el [flujo de trabajo](WORKFLOW.md): planner, implementer y reviewer que mergea; gate diario con pruebas dirigidas; gates largos diferidos. Las decisiones vigentes están en [AUTONOMY](AUTONOMY.md#modo-y-decisiones-vigentes).

El [lote Imagen, Libres e IA](BACKLOG.md#lote-imagen-libres-e-ia) encadena T-073 a T-091, una tarea y un PR por vez. T-084 quedó mergeada y conciliada.

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
| Mergeado desde entonces | T-070 (recorrido E2E de OCR), T-074 (navegación de Imagen), T-071 y T-092 (documentales), la adopción documental del flujo y el encadenamiento del lote hasta T-084 |
| Corte acumulado | Desde `7aa8946` hasta el HEAD de `main` que indique el dueño ([TESTING](TESTING.md#corte-acumulado-vigente)). El FULL/STARTER de I5 sigue diferido |
| Recomendación | Ejecutar el integrado del corte acumulado con V8 y V9 cuando el dueño lo ordene. T-080 incorpora rutas privadas en Spring Security |

### Prompt de la siguiente sesión

```text
Actuá como frontera reviewer independiente de T-085 en MatiasNicolasAcevedo/devnotes. Sesión nueva, PR #88.

LEER: AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-085-side-reading.md y docs/specs/S-115-side-reading.md.

PRECONDICIÓN: gh pr view 88 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup debe confirmar OPEN, isDraft=false, base main en b1db344cca716bdde10bd61cbb6855cd34c76737 y verify-required SUCCESS. Tomá headRefOid como $reviewHead. Tras git fetch origin main codex/t-085-side-reading, verificá que $reviewHead coincida con origin/codex/t-085-side-reading, que su padre sea b14145fc884b9827613d49397c5345e09fe4084e y que git diff --name-only "${reviewHead}^" $reviewHead liste solo docs/STATUS.md y docs/tasks/T-085-side-reading.md. Si difiere, informá el estado real y corregí el prompt.

ACCIÓN: Revisá el diff publicado contra esa base desde un checkout aislado. Contrastá ancho útil y proporción, selector, formatos de solo lectura, foco, scroll, borrador, navegación angosta y separación entre cuentas y espacios con S-115. Si hay hallazgos, registrá sus condiciones de cierre y devolvé el mismo PR a un implementer nuevo. Si aprobás, publicá la transición documental, verificá su CI y hacé squash merge ligado al SHA revisado según AUTONOMY. Confirmá MERGED, mergedAt y mergeCommit.oid con gh pr view 88 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit.

GATE: Comprobá los dirigidos, typecheck y E2E filtrado 'side reading:' en desktop y mobile sobre las fuentes y base revisadas. Si repetís E2E, usá namespaces propios y verificá la limpieza por labels. Exigí docs-check y verify-required sobre el HEAD vigente. FULL/STARTER: DIFERIDO POR EL DUEÑO.

SALIDA: Registrá HEAD/base y veredicto. Si confirmás MERGED, entregá el prompt de una sesión nueva de frontera implementer de T-086 con el PR #88 MERGED como precondición y copialo completo al final. Preservá Render Auto-Deploy On Commit.
```
