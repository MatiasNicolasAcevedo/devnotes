# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-080](tasks/T-080-free-notes-workspace.md) · Libres desde Notas · [S-113](specs/S-113-free-notes.md) |
| Estado | `in_review` |
| Acción actual | Revisión independiente adicional autorizada por el dueño para la corrección de copia tras un 409 |
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
Actuá como frontera reviewer independiente de T-080 en MatiasNicolasAcevedo/devnotes. Sesión nueva, misma rama codex/t-080-free-notes-workspace y PR 83. El dueño autorizó una revisión adicional para cerrar el hallazgo de ronda 2.

LEER: AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-080-free-notes-workspace.md y las secciones Almacenamiento y HTTP e Interacción de docs/specs/S-113-free-notes.md.

PRECONDICIÓN: gh pr view 83 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup debe confirmar OPEN, listo, base main en 7a700175b98669c3a1d9457150df4230279f2c62 y verify-required SUCCESS para el HEAD. Comprobá que ese HEAD coincide con git log -1 --format=%H -- docs/STATUS.md en la rama publicada, que su padre es el SHA técnico del checkpoint y que T-080 figura in_review. Si cambió el estado, informá el dato comprobado y entregá el prompt vigente.

ACCIÓN: Revisá el diff publicado contra main y contrastá la corrección con la evidencia roja y verde. Verificá que «Copiar texto local» lee el cuerpo vigente, incluida la edición posterior al 409, y conserva el comportamiento de los otros botones de copia. Comprobá la confirmación de descarte, reapertura, recuperación con 409 real y guardado con la revisión recién cargada. Si queda un hallazgo bloqueante, documentá la evidencia y devolvé la decisión al dueño con el PR abierto.

GATE: Usá los comandos dirigidos de la tarea para copia y reapertura, y el E2E desktop filtrado con un namespace propio para recuperación 409. Comprobá docs-check y verify-required SUCCESS sobre el SHA que revises y sobre el HEAD final de transición si aprobás. FULL/STARTER: DIFERIDO POR EL DUEÑO.

SALIDA: Registrá el veredicto y la evidencia con HEAD/base. Si el gate está verde y se cumplen las condiciones de AUTONOMY, publicá la transición documental, aprobá su SHA y ejecutá squash merge con --match-head-commit. Confirmá MERGED, mergedAt y mergeCommit.oid con gh pr view 83 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit. Preservá Render Auto-Deploy On Commit. Terminá con el prompt completo que corresponda al estado comprobado.
```
