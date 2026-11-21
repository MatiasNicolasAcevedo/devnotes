# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-074](tasks/T-074-image-navigation.md) · Imagen en la navegación principal · [S-112](specs/S-112-screenshot-ocr.md) |
| Estado | `changes_requested` |
| Acción actual | Frontera implementer corrige R1-1, rechazo de arrastre mixto en Captura |
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
Actuá como frontera implementer de corrección de T-074 en MatiasNicolasAcevedo/devnotes. Sesión nueva y mismo PR #77.

LEER: AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/AUTONOMY.md, docs/tasks/T-074-image-navigation.md, S-112 (seguimiento Imagen) y el comentario CAMBIOS REQUERIDOS del PR #77.
PRECONDICIÓN: gh pr view 77 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid debe confirmar OPEN, isDraft=false y base main@74d987d1cd7f1d4e0d1f2a8994fe7d656cc47e30. Tras git fetch origin codex/t-074-image-navigation, comprobá que headRefOid coincide con el HEAD remoto y con git log -1 --format=%H origin/codex/t-074-image-navigation -- docs/STATUS.md, y que desciende de 1b5f3f784e7a7f912ade408a1f37d600fd598475. Si difiere, informá el estado real y reevaluá el alcance del hallazgo.
ACCIÓN: 1) En codex/t-074-image-navigation, agregá un negativo dirigido que reproduzca un PNG válido acompañado por text/uri-list y por text/plain. 2) Rechazá el drop mixto en Captura, mostrá el error y conservá la selección y el resultado anteriores; evitá la navegación nativa. Conservá el arrastre de un único PNG/JPEG local y la extracción por gesto explícito. 3) Verificá el negativo en Chromium con una selección previa, cero POST y el positivo de archivo único. Corré las pruebas dirigidas, typecheck, E2E filtrado, docs-check y diff-check. Contrastá los gestos nativos con la nueva validación y preservá su evidencia. 4) Publicá la corrección en el mismo PR y el prompt para frontera reviewer R2 ligado a HEAD/base.
GATE: diario. FULL/STARTER: DIFERIDO POR EL DUEÑO.
SALIDA: PR #77 en in_review con cierre observable del hallazgo, verify-required verde y prompt completo para frontera reviewer R2. Conservá Render Auto-Deploy On Commit.
```
