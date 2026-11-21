# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-074](tasks/T-074-image-navigation.md) · Imagen en la navegación principal · [S-112](specs/S-112-screenshot-ocr.md) |
| Estado | `in_review` |
| Acción actual | Frontera reviewer independiente R2 verifica el cierre de R1-1 y revisa el PR #77 |
| Rama / PR | `codex/t-074-image-navigation` · [PR #77](https://github.com/MatiasNicolasAcevedo/devnotes/pull/77) |

Modo `FRONTERA_CONTINUA`. El 2026-11-16 el dueño adoptó el [flujo de trabajo](WORKFLOW.md): planner, implementer y reviewer que mergea; gate diario con pruebas dirigidas; gates largos diferidos. Las decisiones vigentes están en [AUTONOMY](AUTONOMY.md#modo-y-decisiones-vigentes).

El [lote Imagen, Libres e IA](BACKLOG.md#lote-imagen-libres-e-ia) encadena T-073 a T-091, una tarea y un PR por vez. T-073 quedó mergeada y conciliada.

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
Actuá como frontera reviewer independiente R2 de T-074 en MatiasNicolasAcevedo/devnotes. Sesión nueva y mismo PR #77.

LEER: AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/AUTONOMY.md, docs/tasks/T-074-image-navigation.md, S-112 (seguimiento Imagen), el comentario CAMBIOS REQUERIDOS de R1 y el diff completo del PR #77.
PRECONDICIÓN: gh pr view 77 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup debe confirmar OPEN, isDraft=false, base main@74d987d1cd7f1d4e0d1f2a8994fe7d656cc47e30 y verify-required en SUCCESS. Tras git fetch origin codex/t-074-image-navigation, verificá que headRefOid coincide con git rev-parse origin/codex/t-074-image-navigation y con git log -1 --format=%H origin/codex/t-074-image-navigation -- docs/STATUS.md. Verificá con git rev-parse origin/codex/t-074-image-navigation^ que su padre es 7fb517fe9660963c79a83e7c96c575cd2c09cf11 y que el diff desde ese padre solo contiene el checkpoint de T-074 y STATUS. Si difiere, informá el estado real y reevaluá la evidencia sobre HEAD y base publicados.
ACCIÓN: 1) Revisá en un checkout aislado de ese HEAD. 2) Verificá el cierre de R1-1 en Chromium con PNG más text/uri-list y PNG más text/plain, error, vista previa y resultado conservados, evento cancelado, URL intacta y cero POST atribuibles al drop. Contrastá el positivo de archivo único, la extracción explícita y la evidencia nativa de Explorador y Recortes con las fuentes publicadas. 3) Comprobá el gate diario y emití el veredicto R2 ligado a HEAD/base. Si aprobás, seguí el protocolo de transición, CI y squash ligado al SHA, y confirmá MERGED con mergedAt y mergeCommit.oid mediante gh pr view 77 --repo MatiasNicolasAcevedo/devnotes. Si persiste un hallazgo, registralo y entregá la decisión al dueño o a frontera según el límite de dos rondas.
GATE: diario. FULL/STARTER: DIFERIDO POR EL DUEÑO.
SALIDA: veredicto R2 y, si corresponde, merge confirmado y prompt de la siguiente sesión. Conservá Render Auto-Deploy On Commit.
```
