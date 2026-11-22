# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-080](tasks/T-080-free-notes-workspace.md) · Libres desde Notas · [S-113](specs/S-113-free-notes.md) |
| Estado | `changes_requested` |
| Acción actual | Decisión de frontera o dueño sobre el hallazgo de ronda 2 |
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
Actuá como frontera a cargo del cierre de T-080 en MatiasNicolasAcevedo/devnotes. Sesión nueva de decisión con el dueño tras la ronda 2, mismo PR 83 y rama codex/t-080-free-notes-workspace.

LEER: AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-080-free-notes-workspace.md y S-113, sección Interacción.

PRECONDICIÓN: gh pr view 83 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid debe confirmar OPEN, listo y base main en 7a700175b98669c3a1d9457150df4230279f2c62. En la rama publicada, el HEAD debe coincidir con git log -1 --format=%H -- docs/STATUS.md y T-080 debe figurar changes_requested. Si cambió el estado, informá el dato comprobado y entregá el prompt vigente.

ACCIÓN: Revisá el hallazgo de ronda 2. En el SHA revisado 710a225c8a50bca9619cb33bde7f49b5022fef4a, tras un 409, el editor muestra el cuerpo corregido y Copiar texto local copia el cuerpo anterior. La reapertura y el segundo guardado ya pasaron. La decisión exacta para el dueño es «¿Autorizás reabrir el ciclo de T-080 en el mismo PR para corregir la copia del borrador tras un 409 con el criterio de cierre documentado?». Si lo autoriza, dejá un contrato de corrección cerrado para una sesión independiente con regresión roja y verde. Conservá la confirmación de descarte y la revisión del guardado.

GATE: Si se autoriza corregir, gate diario dirigido con la regresión de copia, reapertura, recuperación 409, docs-check y CI del SHA vigente. FULL/STARTER: DIFERIDO POR EL DUEÑO.

SALIDA: Registrá la decisión en la tarea y el único prompt vigente en STATUS. Mantené el PR abierto hasta una aprobación independiente y preservá Render Auto-Deploy On Commit. Terminá con el prompt completo de la sesión siguiente.
```
