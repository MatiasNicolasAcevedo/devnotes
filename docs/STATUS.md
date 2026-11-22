# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-080](tasks/T-080-free-notes-workspace.md) · Libres desde Notas · [S-113](specs/S-113-free-notes.md) |
| Estado | `changes_requested` |
| Acción actual | Corregir la revisión obsoleta al reabrir una nota libre |
| Rama / PR | `codex/t-080-free-notes-workspace` · [PR #83](https://github.com/MatiasNicolasAcevedo/devnotes/pull/83) |

Modo `FRONTERA_CONTINUA`. El 2026-11-16 el dueño adoptó el [flujo de trabajo](WORKFLOW.md): planner, implementer y reviewer que mergea; gate diario con pruebas dirigidas; gates largos diferidos. Las decisiones vigentes están en [AUTONOMY](AUTONOMY.md#modo-y-decisiones-vigentes).

El [lote Imagen, Libres e IA](BACKLOG.md#lote-imagen-libres-e-ia) encadena T-073 a T-091, una tarea y un PR por vez. T-079 quedó mergeada y conciliada.

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
Actuá como frontera implementer de corrección de T-080 en MatiasNicolasAcevedo/devnotes. Sesión nueva, mismo PR 83 y rama codex/t-080-free-notes-workspace.

LEER: AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-080-free-notes-workspace.md, S-113 y el documento de Libres en S-114.
PRECONDICIÓN: gh pr view 83 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid debe confirmar OPEN, listo, base main en 7a700175b98669c3a1d9457150df4230279f2c62 y HEAD igual a git log -1 --format=%H -- docs/STATUS.md en la rama publicada, con T-080 en changes_requested.
ACCIÓN: Reproducí primero en rojo el único hallazgo del checkpoint. Corregí la reapertura desde el directorio tras guardar título y cuerpo, y mantené la guardia y la protección de borradores ante refetch y 409. El segundo guardado tras reabrir sin recargar debe usar la revisión confirmada y persistir correctamente.
GATE: Corré la regresión, los dirigidos y typecheck del cliente, Playwright filtrado de Libres en desktop/mobile con proyectos propios, docs-check y diff --check. Si cambian insumos del backend, repetí el dirigido PostgreSQL de la tarea. FULL/STARTER: DIFERIDO POR EL DUEÑO.
SALIDA: Publicá la corrección en el mismo PR, actualizá tarea y STATUS a in_review y devolvé el prompt completo para una revisión independiente del nuevo HEAD. Conservá Render Auto-Deploy On Commit.
```
