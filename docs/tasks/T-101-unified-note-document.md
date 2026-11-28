---
id: T-101
status: ready
priority: P1
size: S
milestone: M10
spec: S-118
depends_on: [T-099]
branch: codex/t-101-unified-note-document
role: implementer
executor: frontier
pr: null
---
# T-101 · Las notas aceptan separadores, enlaces, referencias y negrita

## Objetivo

Primera tarea de [S-118](../specs/S-118-notes-tabs.md). El servidor acepta en las notas (`free_note`) el documento unificado: todo lo que hoy aceptan Libres más los separadores, enlaces y referencias de Diario. Así, el editor único de T-103 puede guardar cualquier formato y la migración de T-104 copia los documentos de Diario sin transformarlos. El dueño todavía no ve cambios en la interfaz. Siguiente tarea: [T-102](T-102-note-versions-api.md), habilitada por el MERGED de esta.

## Alcance y decisiones resueltas

- Contrato completo en [S-118 · Documento de nota](../specs/S-118-notes-tabs.md#documento-de-nota-t-101): bloques, marcas, átomos y límites.
- Extraer de `DailyContent` las reglas de enlace (href HTTP/HTTPS absoluto, sin credenciales, 2.048 caracteres) y del átomo `reference` a una clase final del paquete `com.example.devnotes.freenote.domain`, por ejemplo `NoteInlineRules`. `DailyContent` delega en ella y conserva sus mensajes y su comportamiento. Ninguna prueba de `DailyContentTest` cambia de resultado.
- `FreeNoteDocument` admite además: `separator` con `attrs.width` ∈ {25, 50, 75, 100}; la marca `link` junto a `bold` en el texto de párrafos, títulos e ítems; y `reference` en párrafos e ítems de lista. `codeBlock` sigue sin marcas.
- Límites nuevos (S-118): 2.000 bloques de primer nivel, 100.000 puntos de código de texto, 100 referencias, 100.000 caracteres sumando los href y 1 MiB de JSON. Los mensajes de error siguen el estilo actual y responden 400 `ProblemDetail`.
- Cliente: `documentSchema` de `client/src/features/free-notes/api.ts` acepta los mismos nodos, para que leer una nota con separador no falle. La UI de Libres no cambia en esta tarea.
- Fuera: versiones, rutas, migración y UI.

## Leer antes

1. [S-118](../specs/S-118-notes-tabs.md), secciones «Documento de nota» y AC-01/AC-02.
2. `server/src/main/java/com/example/devnotes/daily/domain/DailyContent.java`, en particular las validaciones de enlace y referencia.
3. `server/src/main/java/com/example/devnotes/freenote/domain/FreeNoteDocument.java`.
4. `server/AGENTS.md` y `client/AGENTS.md`.
5. `server/src/test/java/com/example/devnotes/daily/domain/DailyContentTest.java`, de donde salen los fixtures de AC-02.

## Archivos y pasos

Archivos previstos: `freenote/domain/NoteInlineRules.java` (nuevo), `freenote/domain/FreeNoteDocument.java`, `daily/domain/DailyContent.java`, `FreeNoteDocumentTest.java`, `FreeNoteApiIT.java` y `client/src/features/free-notes/api.ts` con su prueba.

1. Escribir primero las pruebas de AC-01 y AC-02 (rojas): documentos válidos de Diario y de Libres, más los negativos (nodo desconocido, marca `italic`, `javascript:`, separador de 30, referencia en un título, marca en código, límites +1).
2. Extraer `NoteInlineRules` y hacer que `DailyContent` delegue (DailyContentTest verde sin cambios).
3. Ampliar `FreeNoteDocument` y el esquema del cliente.
4. Gate diario y PR.

## Aceptación y pruebas

| Criterio observable | Capa elegida y por qué | Comando exacto (directorio/entorno) | Resultado esperado |
|---|---|---|---|
| AC-01 aceptación y rechazos del documento | Unitaria: es una regla pura | `./mvnw -q test -Dtest='FreeNoteDocumentTest,DailyContentTest'` en server/ | Verde; los negativos devuelven la excepción con mensaje |
| AC-01 400 por HTTP sin cambios en la fila | IT con PostgreSQL: valida el contrato y la persistencia | `./mvnw -q verify -Dit.test=FreeNoteApiIT -Djacoco.skip=true` en server/ | Verde |
| AC-02 compatibilidad con Diario y Libres | Unitaria con fixtures reales | Incluida en el primer comando | Verde |
| Esquema del cliente | Unitaria del cliente | `npx vitest run src/features/free-notes/api.test.ts` y `npx tsc -b` en client/ | Verde |
| Documentos | Gate diario | `node scripts/docs-check.mjs`, `git diff --check` y `bash scripts/verify.sh --policy origin/main` en la raíz | Exit 0; anotar el perfil |

Sin E2E: no cambia ningún flujo visible. FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Checkpoint vigente

Sin iniciar. Contrato preparado por frontera planner el 2026-11-28 sobre `origin/main` `bfd76c2`.

## Correcciones significativas

| Fecha / SHA o pendiente de commit | Problema y causa comprobada | Corrección | Prueba y resultado |
|---|---|---|---|
| — | — | — | — |

## Prompts de salida

Al publicar la implementación o una corrección (para el reviewer):
```text
Frontera reviewer independiente de T-101 en MatiasNicolasAcevedo/devnotes, sesión nueva y distinta de la implementer. Leé AGENTS.md, server/AGENTS.md, docs/agents/reviewer.md, docs/specs/S-118-notes-tabs.md (Documento de nota) y docs/tasks/T-101-unified-note-document.md. PRECONDICIÓN: gh pr view <número> --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup confirma OPEN, listo, HEAD <sha> y verify-required verde. Si no se cumple, devolvé el estado vigente. ACCIÓN: comprobá que todo documento válido de Diario y de Libres sigue siendo válido, que los negativos de AC-01 rechazan con 400 sin tocar la fila, que DailyContent conserva su comportamiento al delegar en NoteInlineRules y que los límites coinciden con S-118. Repetí los comandos de la tabla de aceptación. Si aprobás, squash ligado al HEAD revisado y confirmá MERGED con gh pr view <número> --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit. Máximo dos rondas. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: veredicto y prompt vigente.
```

Al aprobar y mergear (para la tarea siguiente):
```text
Frontera implementer de T-102 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, server/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/specs/S-118-notes-tabs.md (Versiones) y docs/tasks/T-102-note-versions-api.md. PRECONDICIÓN: gh pr view codex/t-101-unified-note-document --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit confirma MERGED con fecha y oid, y git merge-base --is-ancestor <oid> origin/main sale 0. ACCIÓN: en codex/t-102-note-versions-api desde main, concilia T-101 como done y pasá T-102 a in_progress en el primer commit. Implementá V11, la API de versiones, la retención y las pruebas de AC-03 a AC-06. GATE: diario. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: PR publicado y prompt del reviewer.
```

## Cierre y siguiente tarea

No está done hasta comprobar el MERGED. El implementer de T-102 concilia esta tarea en su primer commit.
