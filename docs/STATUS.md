# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-080](tasks/T-080-free-notes-workspace.md) · Libres desde Notas · [S-113](specs/S-113-free-notes.md) |
| Estado | `changes_requested` |
| Acción actual | Dueño autorizó reabrir el ciclo. Implementer independiente corrige la copia local tras un 409 |
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
Actuá como frontera implementer de la corrección autorizada de T-080 en MatiasNicolasAcevedo/devnotes. Sesión nueva e independiente, mismo PR 83 y rama codex/t-080-free-notes-workspace.

LEER: AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/AUTONOMY.md, docs/TESTING.md, el contrato de corrección en docs/tasks/T-080-free-notes-workspace.md y las secciones Almacenamiento y HTTP e Interacción de docs/specs/S-113-free-notes.md.

PRECONDICIÓN: gh pr view 83 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid debe confirmar OPEN, listo y base main en 7a700175b98669c3a1d9457150df4230279f2c62. Verificá que el HEAD publicado coincide con git log -1 --format=%H -- docs/STATUS.md en la rama de la tarea, que T-080 figura changes_requested y que el checkpoint registra la autorización del dueño. Si cambió el estado, informá el dato comprobado y entregá el prompt vigente.

ACCIÓN: Agregá al caso existente la edición del cuerpo después del 409 y la comparación exacta del portapapeles. Desde client/, ejecutá npm test -- --run src/features/free-notes/FreeNotesPage.test.tsx -t 'conserva el borrador ante refetch' y registrá el rojo por el texto anterior. Corregí la copia del cuerpo vigente y repetí el mismo comando para acreditar el verde. Conservá la confirmación de descarte, la reapertura y la revisión del guardado. Incorporá el caso desktop de recuperación con 409 real definido en la tarea.

GATE: Corré las pruebas dirigidas de cliente y el typecheck, el E2E desktop filtrado con el caso de recuperación 409, docs-check, git diff --check y la clasificación informativa del diff según los comandos del contrato. Confirmá verify-required SUCCESS en el HEAD publicado. FULL/STARTER: DIFERIDO POR EL DUEÑO.

SALIDA: Registrá evidencias y SHA/base en el checkpoint, publicá la corrección en la misma rama y dejá T-080 in_review con el único prompt para el reviewer independiente del PR #83. Mantené el PR abierto hasta una aprobación independiente y preservá Render Auto-Deploy On Commit. Terminá con ese prompt completo.
```
