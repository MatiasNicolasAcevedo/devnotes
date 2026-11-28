---
id: T-102
status: draft
priority: P1
size: M
milestone: M10
spec: S-118
depends_on: [T-101]
branch: codex/t-102-note-versions-api
role: implementer
executor: frontier
pr: null
---
# T-102 · API de versiones de notas con retención de 15 días

## Objetivo

Segunda tarea de [S-118](../specs/S-118-notes-tabs.md). El servidor guarda versiones manuales de cualquier nota, lista las de un espacio, muestra una, restaura y borra solo las vencidas. Todavía no hay UI: la usan T-104 (Guardar versión) y T-105 (Historial). `draft` solo porque espera el MERGED de [T-101](T-101-unified-note-document.md). Siguiente: [T-103](T-103-unified-note-editor.md).

## Alcance y decisiones resueltas

- Contrato completo en [S-118 · Versiones](../specs/S-118-notes-tabs.md#versiones-t-102): tabla V11, cuatro rutas, `preview`, `latest`, `expiresAt`, F-07, F-08 y F-09.
- Paquete nuevo `com.example.devnotes.freenote.version` con persistencia, servicio, controlador y OpenAPI, siguiendo el estilo de `freenote`. El dueño sale de `IdentityService`, como en `FreeNoteController`.
- `POST …/free-notes/{id}/versions` copia el documento guardado en el servidor, no el del request: el cliente primero completa su autosave. Si `expectedRevision` no es la revisión actual, 409. Si el documento es igual (comparación JSON canónica) al de la última versión, devuelve 200 con esa versión y `created: false`.
- Cursor opaco en base64url de `savedAt|id`; un cursor inválido da 400.
- Retención: `NoteVersionRetention`, con `@Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT2M")` y limpieza de la nota al guardar. Confirmar que el scheduling ya está habilitado (la ventana de actividad de T-054 lo usa) y no duplicar `@EnableScheduling`. El reloj es el `Clock` inyectable que ya usa el proyecto; las pruebas lo fijan.
- La lista y el detalle excluyen las vencidas aunque la limpieza no haya corrido.
- Restaurar ocurre en una transacción con bloqueo de la nota (`SELECT … FOR UPDATE` o el bloqueo optimista existente, sin carreras entre la comprobación de revisión y la escritura).
- Fuera: UI, migración del Diario y XLSX.

## Leer antes

1. [S-118](../specs/S-118-notes-tabs.md), secciones «Versiones» y AC-03 a AC-06.
2. `server/src/main/java/com/example/devnotes/freenote/` (servicio, repositorio, controlador y manejo de errores).
3. `server/src/main/resources/db/migration/V9__create_free_notes.sql`.
4. `server/src/main/java/com/example/devnotes/daily/application/DailyVersionService.java`, como antecedente de copia independiente.
5. `server/AGENTS.md`.

## Archivos y pasos

Archivos previstos: `V11__create_note_version.sql` y, en `freenote/version/`, `NoteVersion.java`, `NoteVersionRepository.java`, `NoteVersionService.java`, `NoteVersionRetention.java`, `NoteVersionController.java` y `NoteVersionOpenApi.java`. Pruebas: `NoteVersionApiIT.java`, `NoteVersionRetentionIT.java` y `NoteVersionServiceTest.java`.

1. Escribir los IT rojos de AC-03 a AC-06, con dos dueños y los dos espacios. Negativos: otro dueño, otro espacio, revisión vieja, cursor inválido, versión vencida y nota borrada.
2. V11 y la persistencia; servicio con `preview` y las reglas F-07, F-08 y F-09.
3. Controlador, OpenAPI y retención programada.
4. Gate diario y PR.

## Aceptación y pruebas

| Criterio observable | Capa elegida y por qué | Comando exacto (directorio/entorno) | Resultado esperado |
|---|---|---|---|
| AC-03, AC-04 y AC-06 | IT con PostgreSQL: propiedad, revisión, cascada y transacción | `./mvnw -q verify -Dit.test=NoteVersionApiIT -Djacoco.skip=true` en server/ | Verde, con negativos de dueño y espacio |
| AC-05 retención y tope | IT con reloj fijo | `./mvnw -q verify -Dit.test=NoteVersionRetentionIT -Djacoco.skip=true` en server/ | Verde |
| `preview`, igualdad canónica y cursor | Unitaria | `./mvnw -q test -Dtest=NoteVersionServiceTest` en server/ | Verde |
| Regresión de notas | IT existente | `./mvnw -q verify -Dit.test=FreeNoteApiIT -Djacoco.skip=true` en server/ | Verde |
| Documentos | Gate diario | `node scripts/docs-check.mjs`, `git diff --check` y `bash scripts/verify.sh --policy origin/main` | Exit 0; anotar el perfil |

Sin E2E: no hay flujo visible. La migración V11 cuenta para la recomendación de integrado en STATUS. FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Checkpoint vigente

Sin iniciar. Espera el MERGED de T-101.

## Correcciones significativas

| Fecha / SHA o pendiente de commit | Problema y causa comprobada | Corrección | Prueba y resultado |
|---|---|---|---|
| — | — | — | — |

## Prompts de salida

Al publicar la implementación o una corrección (para el reviewer):
```text
Frontera reviewer independiente de T-102 en MatiasNicolasAcevedo/devnotes, sesión nueva y distinta de la implementer. Leé AGENTS.md, server/AGENTS.md, docs/agents/reviewer.md, docs/specs/S-118-notes-tabs.md (Versiones) y docs/tasks/T-102-note-versions-api.md. PRECONDICIÓN: gh pr view <número> --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup confirma OPEN, listo, HEAD <sha> y verify-required verde. ACCIÓN: revisá V11 (aditiva, CHECK uuidv7, cascada), aislamiento por dueño y espacio con 404, revisión 409, F-07/F-08/F-09, exclusión de vencidas en lista y detalle, limpieza programada sin @EnableScheduling duplicado y transacción de restore. Repetí los IT de la tabla. Si aprobás, squash ligado al HEAD revisado y confirmá MERGED con gh pr view <número> --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit. Máximo dos rondas. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: veredicto y prompt vigente.
```

Al aprobar y mergear (para la tarea siguiente):
```text
Frontera implementer de T-103 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/specs/S-118-notes-tabs.md (Editor único), media/design/notes-tabs/README.md y docs/tasks/T-103-unified-note-editor.md. PRECONDICIÓN: gh pr view codex/t-102-note-versions-api --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit confirma MERGED y git merge-base --is-ancestor <oid> origin/main sale 0. ACCIÓN: en codex/t-103-unified-note-editor desde main, concilia T-102 como done y pasá T-103 a in_progress en el primer commit. Construí NoteEditor con la barra de íconos y usalo en Libres. GATE: diario con E2E «notes editor:» desktop. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: PR publicado y prompt del reviewer.
```

## Cierre y siguiente tarea

No está done hasta comprobar el MERGED. El implementer de T-103 la concilia.
