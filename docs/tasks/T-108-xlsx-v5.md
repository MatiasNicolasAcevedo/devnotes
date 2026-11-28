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
# T-108 · XLSX v5 sin historial y tablas del Diario eliminadas

## Objetivo

Última tarea de [S-118](../specs/S-118-notes-tabs.md). Exportar genera un XLSX v5 con referencias, voz, textos de Imagen y el contenido actual de cada nota, sin Diario ni versiones. Importar acepta solo v5. Se eliminan las tablas y las clases del Diario (F-02: la base no tiene datos productivos). El dueño obtiene archivos más chicos y un esquema limpio para empezar a usar DevNotes en serio. `draft` solo porque espera el MERGED de [T-107](T-107-mobile-notes.md). Al mergear, la iteración vuelve a frontera para el integrado final ordenado por el dueño.

## Alcance y decisiones resueltas

- Contrato en [S-118 · XLSX v5](../specs/S-118-notes-tabs.md#xlsx-v5-t-108) y [Retiro del Diario](../specs/S-118-notes-tabs.md#retiro-del-diario-t-106-y-t-108).
- `XlsxFormat`: versión 5, con las hojas `devnotes`, `referencias`, `voz`, `imagen_textos` y `notas`. `notas` tiene las columnas de `notas_libres` v4 (con `espacio`). Se quitan las listas y rutas de lectura v1–v4.
- **Exportación**: `PortabilityExportService` y `PortabilityReadRepository` dejan de leer el Diario. Se conservan los límites actuales.
- **Importación**: solo v5, con cuenta vacía como hoy y documentos validados por `FreeNoteDocument`. No crea versiones. Un archivo v1–v4 responde `IMPORT_UNSUPPORTED_FORMAT` con «Este respaldo es de una versión anterior. Exportá de nuevo desde DevNotes.».
- **Borrado**:
  - `V12__drop_daily_notes.sql` (`DROP TABLE daily_version; DROP TABLE daily_note;`).
  - Las clases `DailyNote`, `DailyVersion`, sus repositorios, `DailyContent`, `DailyContentException` y lo que quede en `com.example.devnotes.daily`.
  - Sus pruebas, incluido `DailyContentTest`. Sus casos de enlace y referencia que sigan valiendo pasan a `NoteInlineRulesTest` o a `FreeNoteDocumentTest`.
- Las pruebas de libros v1–v4 (`XlsxSpacesRoundTripTest`, `XlsxFreeNotesRoundTripTest`, `XlsxImageTextsRoundTripTest`, `XlsxWorkbookRoundTripTest` y `XlsxTestBooks`) pasan a v5 o se reducen a un caso de rechazo. Las regresiones de forma (celdas partidas, límites y ZIP) se conservan sobre v5.
- Cliente: el texto de exportación en `DataPage` dice «Incluye el contenido actual de cada nota; el historial de versiones no se exporta», y el error de formato muestra el mensaje del servidor.
- Fuera: exportar versiones e importar formatos anteriores.

## Leer antes

1. [S-118](../specs/S-118-notes-tabs.md): «Retiro del Diario», «XLSX v5», AC-08 y AC-14. También [S-107](../specs/S-107-xlsx-portability.md).
2. `server/src/main/java/com/example/devnotes/portability/xlsx/XlsxFormat.java`, `XlsxWorkbookReader.java`, `XlsxWorkbookWriter.java` y `XlsxErrorCode.java`.
3. `server/src/main/java/com/example/devnotes/portability/application/PortabilityExportService.java` y `PortabilityImportService.java`.
4. `server/src/main/java/com/example/devnotes/daily/`, lo que queda después de T-106.
5. `server/AGENTS.md`.

## Archivos y pasos

1. Pruebas rojas:
   - ida y vuelta v5;
   - rechazo de un libro v4;
   - cuenta no vacía rechazada como hoy;
   - `DailyTablesDropMigrationIT` (base vacía de V1 a V12; `daily_note` y `daily_version` no existen; `free_note`, `note_version` y las demás tablas siguen).
2. Escritor y lector v5, y servicio y repositorio sin Diario.
3. V12 y borrado de las clases y pruebas del Diario; `rg -n "daily" server/src` solo debe mostrar las migraciones V3, V4, V7 y V12.
4. Cliente, E2E, gate diario y PR.

## Aceptación y pruebas

| Criterio observable | Capa elegida y por qué | Comando exacto (directorio/entorno) | Resultado esperado |
|---|---|---|---|
| AC-14 codec v5 y rechazo de v1–v4 | Unitaria del codec | `./mvnw -q test -Dtest='XlsxNotesV5RoundTripTest,XlsxWorkbookReaderTest,XlsxZipInspectionTest,FreeNoteDocumentTest'` en server/ | Verde |
| AC-14 exportar, previsualizar e importar | IT con PostgreSQL | `./mvnw -q verify -Dit.test='PortabilityNotesV5ApiIT,PortabilityImportApiIT,PortabilityExportApiIT' -Djacoco.skip=true` en server/ | Verde, con negativos de dueño |
| AC-08 V12 desde una base vacía | IT de migración | `./mvnw -q verify -Dit.test='DailyTablesDropMigrationIT,FreeNoteMigrationIT,NoteVersionApiIT' -Djacoco.skip=true` en server/ | Verde |
| Texto y error en el cliente | Componente | `npx vitest run src/features/portability` y `npx tsc -b` en client/ | Verde |
| AC-14 de punta a punta: A exporta y una cuenta B vacía importa | E2E | `STARTER_E2E_PROJECT=starter-e2e-t108 bash scripts/e2e.sh --grep "portability:" --project desktop` en la raíz | Verde, cleanup por label |
| Documentos | Gate diario | `node scripts/docs-check.mjs`, `git diff --check` y `bash scripts/verify.sh --policy origin/main` | Exit 0; anotar el perfil |

FULL/STARTER: DIFERIDO POR EL DUEÑO hasta la sesión siguiente, que lo corre por orden expresa ([AUTONOMY](../AUTONOMY.md#modo-y-decisiones-vigentes)).

## Checkpoint vigente

Sin iniciar. Espera el MERGED de T-107.

## Correcciones significativas

| Fecha / SHA o pendiente de commit | Problema y causa comprobada | Corrección | Prueba y resultado |
|---|---|---|---|
| — | — | — | — |

## Prompts de salida

Al publicar la implementación o una corrección (para el reviewer):
```text
Frontera reviewer independiente de T-108 en MatiasNicolasAcevedo/devnotes, sesión nueva y distinta de la implementer. Leé AGENTS.md, server/AGENTS.md, docs/agents/reviewer.md, docs/specs/S-118-notes-tabs.md (Retiro del Diario y XLSX v5) y docs/tasks/T-108-xlsx-v5.md. PRECONDICIÓN: gh pr view <número> --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup confirma OPEN, listo, HEAD <sha> y verify-required verde. ACCIÓN: revisá que v5 no exporta diarias ni versiones, que v1–v4 se rechaza con IMPORT_UNSUPPORTED_FORMAT, que se valida con FreeNoteDocument, que la cuenta no vacía sigue rechazada, que V12 solo borra daily_version y daily_note y que no quedan clases ni referencias al Diario. Las regresiones de forma deben haber pasado a v5. Repetí el codec, los IT y el E2E «portability:» desktop con un namespace propio. Si aprobás, squash ligado al HEAD revisado y confirmá MERGED con gh pr view <número> --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit. Máximo dos rondas. SALIDA: veredicto y prompt vigente.
```

Al aprobar y mergear (integrado final de S-118, orden del dueño del 2026-11-28):
```text
Frontera de cierre de S-118 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, docs/STATUS.md, docs/AUTONOMY.md (orden del 2026-11-28 sobre FULL/STARTER), docs/TESTING.md (Gates diferidos y Cómo se ejecuta un integrado ordenado por el dueño), docs/specs/S-118-notes-tabs.md y docs/tasks/T-108-xlsx-v5.md. PRECONDICIÓN: gh pr view codex/t-108-xlsx-v5 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit confirma MERGED y git merge-base --is-ancestor <oid> origin/main sale 0. ACCIÓN: crea desde la plantilla la tarea T-109 (integrado final y ajustes de S-118) en codex/t-109-s118-integrated-gate desde main, concilia T-108 y pasá T-109 a in_progress en el primer commit. Por orden expresa del dueño corré una vez el integrado STARTER, que incluye el FULL de aplicación: COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t109 STARTER_E2E_PROJECT=starter-e2e-t109 STARTER_SERVER_TESTS=container bash scripts/verify.sh --starter, con log y exit. Corregí cada fallo en T-109 (rojo antes del arreglo) y repetí lo que falló. Recorré Notas, Historial y Exportar a 1280 y 375 px contra media/design/notes-tabs, actualizá el registro de gates de STATUS y publicá el PR para revisión independiente. SALIDA: PR con la evidencia del integrado y prompt del reviewer. Después del merge, el dueño recrea la base vacía de Render y empieza el uso productivo.
```

## Cierre y siguiente tarea

No está done hasta comprobar el MERGED. Cierra la implementación de I9 / M10 y da paso al integrado final.
