---
id: T-108
status: draft
priority: P1
size: M
milestone: M10
spec: S-118
depends_on: [T-107]
branch: codex/t-108-xlsx-v5
role: implementer
executor: frontier
pr: null
---
# T-108 · Respaldo XLSX v5 sin historial

## Objetivo

Última tarea de [S-118](../specs/S-118-notes-tabs.md). Exportar genera un XLSX v5 con referencias, voz, textos de Imagen y el contenido actual de cada nota, sin hojas de Diario ni de versiones. Importar acepta v5 y convierte los respaldos v1–v4 sin traer historial. El dueño obtiene archivos más chicos y una restauración sin datos viejos. `draft` solo porque espera el MERGED de [T-107](T-107-mobile-notes.md). Al mergear, la iteración vuelve a frontera.

## Alcance y decisiones resueltas

- Contrato en [S-118 · XLSX v5](../specs/S-118-notes-tabs.md#xlsx-v5-t-108).
- `XlsxFormat`: versión 5, con las hojas `devnotes`, `referencias`, `voz`, `imagen_textos` y `notas`. `notas` tiene las columnas de `notas_libres` v4 (con `espacio`). Se conservan las listas de hojas v1–v4 para leer.
- Exportación: `PortabilityExportService` y `PortabilityReadRepository` dejan de leer `daily_note` y `daily_version`. Las notas incluyen la migrada «Diario». Los límites de exportación actuales siguen.
- Importación v5: crea notas con su espacio y su documento validado por `FreeNoteDocument` (T-101). No crea versiones.
- Importación v1–v4 (F-02): `notas_libres` pasa a notas. De `diarias`, solo la fila más reciente de cada espacio pasa a la nota «Diario» («Diario (migrado)» si choca con un título importado). El resto de `diarias` y toda `versiones` se omiten. La vista previa (`import-preview`) agrega `omitted` con `{ "dailyNotes": n, "versions": m }` y el cliente lo muestra: «Se omiten 12 notas diarias anteriores y 5 versiones: el historial no se importa.»
- Si después de esta tarea `DailyNote`, `DailyVersion` y sus repositorios quedan sin uso, se borran. `DailyContent` se conserva solo si el importador lo necesita para validar filas v1–v4; si no, también se borra. Las tablas quedan.
- Cliente: el texto de exportación en `DataPage` aclara «Incluye el contenido actual de cada nota; el historial de versiones no se exporta».
- Fuera: borrar tablas y exportar versiones.

## Leer antes

1. [S-118](../specs/S-118-notes-tabs.md): «XLSX v5» y AC-14. También [S-107](../specs/S-107-xlsx-portability.md).
2. `server/src/main/java/com/example/devnotes/portability/xlsx/XlsxFormat.java`, `XlsxWorkbookReader.java` y `XlsxWorkbookWriter.java`.
3. `server/src/main/java/com/example/devnotes/portability/application/PortabilityExportService.java` y `PortabilityImportService.java`.
4. `server/src/test/java/com/example/devnotes/portability/xlsx/XlsxTestBooks.java`, para los libros v1–v4 de prueba.
5. `server/AGENTS.md`.

## Archivos y pasos

Archivos previstos: `XlsxFormat.java`, `XlsxWorkbookReader.java`, `XlsxWorkbookWriter.java`, `PortabilityRecords.java`, `PortabilityExportService.java`, `PortabilityImportService.java` y `PortabilityReadRepository.java`; las pruebas `XlsxNotesV5RoundTripTest.java` y `PortabilityNotesV5ApiIT.java` (nuevas); el cliente `features/portability/` (texto y omitidos); y `e2e/tests/portability.spec.ts`.

1. Pruebas rojas: ida y vuelta v5; un libro v4 con tres diarias en dos espacios, dos versiones y una nota libre «Diario»; vista previa con omitidos; cuenta no vacía rechazada como hoy.
2. Escritor y lector v5, y conversión v1–v4.
3. Servicio y repositorio sin Diario; borrar las clases de Diario sin uso.
4. Cliente, E2E, gate diario y PR.

## Aceptación y pruebas

| Criterio observable | Capa elegida y por qué | Comando exacto (directorio/entorno) | Resultado esperado |
|---|---|---|---|
| AC-14 codec v5 y conversión v1–v4 | Unitaria del codec | `./mvnw -q test -Dtest='XlsxNotesV5RoundTripTest,XlsxWorkbookReaderTest,XlsxSpacesRoundTripTest,XlsxFreeNotesRoundTripTest'` en server/ | Verde |
| AC-14 exportar, previsualizar e importar | IT con PostgreSQL | `./mvnw -q verify -Dit.test='PortabilityNotesV5ApiIT,PortabilityImportApiIT,PortabilityExportApiIT' -Djacoco.skip=true` en server/ | Verde, con negativos de dueño |
| Texto de omitidos | Componente | `npx vitest run src/features/portability` y `npx tsc -b` en client/ | Verde |
| AC-14 de punta a punta: A exporta y una cuenta B vacía importa | E2E | `STARTER_E2E_PROJECT=starter-e2e-t108 bash scripts/e2e.sh --grep "portability:" --project desktop` en la raíz | Verde, cleanup por label |
| Documentos | Gate diario | `node scripts/docs-check.mjs`, `git diff --check` y `bash scripts/verify.sh --policy origin/main` | Exit 0; anotar el perfil |

Recomendar en STATUS el integrado FULL/STARTER de cierre de la iteración. FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Checkpoint vigente

Sin iniciar. Espera el MERGED de T-107.

## Correcciones significativas

| Fecha / SHA o pendiente de commit | Problema y causa comprobada | Corrección | Prueba y resultado |
|---|---|---|---|
| — | — | — | — |

## Prompts de salida

Al publicar la implementación o una corrección (para el reviewer):
```text
Frontera reviewer independiente de T-108 en MatiasNicolasAcevedo/devnotes, sesión nueva y distinta de la implementer. Leé AGENTS.md, server/AGENTS.md, docs/agents/reviewer.md, docs/specs/S-118-notes-tabs.md (XLSX v5) y docs/tasks/T-108-xlsx-v5.md. PRECONDICIÓN: gh pr view <número> --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup confirma OPEN, listo, HEAD <sha> y verify-required verde. ACCIÓN: revisá que v5 no exporta diarias ni versiones, que v1–v4 se importan según F-02 con omitidos informados, que se valida con FreeNoteDocument, que la cuenta no vacía sigue rechazada y que las clases de Diario borradas no tenían uso. Repetí el codec, los IT y el E2E «portability:» desktop con un namespace propio. Si aprobás, squash ligado al HEAD revisado y confirmá MERGED con gh pr view <número> --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit. Máximo dos rondas. FULL/STARTER: DIFERIDO POR EL DUEÑO; recomendalo para el cierre. SALIDA: veredicto y prompt vigente.
```

Al aprobar y mergear (vuelta a frontera):
```text
Frontera planner de cierre de S-118 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, docs/STATUS.md, docs/agents/planner.md, docs/specs/S-118-notes-tabs.md y docs/tasks/T-108-xlsx-v5.md. PRECONDICIÓN: gh pr view codex/t-108-xlsx-v5 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit confirma MERGED y git merge-base --is-ancestor <oid> origin/main sale 0. ACCIÓN: concilia T-108 y S-118, recorré Notas, Historial y Exportar en escritorio y a 375 px contra media/design/notes-tabs, recomendá el integrado FULL/STARTER del corte acumulado, y preguntá al dueño si se borran daily_note y daily_version y si quiere regrabar la demo. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: registro de cierre y prompt vigente.
```

## Cierre y siguiente tarea

No está done hasta comprobar el MERGED. Cierra la iteración I9 / M10 y vuelve a frontera.
