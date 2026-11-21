# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-074](tasks/T-074-image-navigation.md) · Imagen en la navegación principal · [S-112](specs/S-112-screenshot-ocr.md) |
| Estado | `in_progress` |
| Acción actual | Frontera implementer mueve OCR a Imagen y valida el gate dirigido |
| Rama / PR | `codex/t-074-image-navigation` |

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
Actuá como frontera implementer de T-074 en MatiasNicolasAcevedo/devnotes. Sesión nueva.

LEER: AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/AUTONOMY.md, docs/tasks/T-073-ocr-windows-paste.md, docs/tasks/T-074-image-navigation.md, docs/specs/S-112-screenshot-ocr.md y la sección Imagen de docs/design/WRITING-WORKSPACES.md. Usá frontend-design para cotejar el shell real.
PRECONDICIÓN: gh pr view 76 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit,baseRefName debe confirmar MERGED contra main, con mergedAt y mergeCommit.oid válidos. Actualizá la referencia origin/main y comprobá que contiene ese squash y que no hay otro PR abierto. Si no se cumple, informá el estado real sin iniciar T-074.
ACCIÓN: 1) Desde origin/main actualizado, creá el checkout nuevo de codex/t-074-image-navigation. En el primer commit conciliá T-073 a done con el squash confirmado y avanzá T-074 a in_progress. 2) Mové OCR a /image, incorporá Imagen a la navegación y agregá pegado por gesto y arrastre local; conservá borrador de Notas, espacio activo y envío solo al elegir Extraer texto. 3) Corré las pruebas de componente y typecheck del contrato, los E2E filtrados «screenshot OCR:» con --project desktop y --project mobile en proyectos propios separados, los ensayos de arrastre y Recortes reales en Windows con datos ficticios, docs-check y diff-check. 4) Publicá solo el PR de T-074 con evidencia vinculada a HEAD y base.
GATE: diario. FULL y STARTER están diferidos: no ejecutarlos sin orden expresa del dueño.
SALIDA: T-073 conciliada, T-074 in_review y prompt de frontera reviewer del PR de T-074 con HEAD y base exactos en STATUS y al final de la respuesta. Conservá Render Auto-Deploy On Commit.
```
