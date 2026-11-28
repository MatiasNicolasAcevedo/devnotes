---
id: T-106
status: draft
priority: P1
size: M
milestone: M10
spec: S-118
depends_on: [T-105]
branch: codex/t-106-retire-daily
role: implementer
executor: frontier
pr: null
---
# T-106 · Lectura lateral e IA sobre notas; retiro del Diario

## Objetivo

Sexta tarea de [S-118](../specs/S-118-notes-tabs.md). «Abrir al lado» y los fragmentos de IA ofrecen las notas y sus versiones, sin fechas de Diario. Se borra el código del Diario que quedó sin uso: páginas, providers, calendario y copia del día anterior en el cliente, y endpoints de notas diarias y de sus versiones en el servidor. Las tablas quedan. `draft` solo porque espera el MERGED de [T-105](T-105-general-history.md). Siguiente: [T-107](T-107-mobile-notes.md).

## Alcance y decisiones resueltas

- **Lectura lateral (S-115)**: `ReadingSelector` muestra dos grupos, «Notas» (las del espacio menos la activa) y «Versiones guardadas» (de T-102, con título y fecha). `ReadingContent` dibuja ambas con `NoteEditor` en `readOnly`. Se conservan anchos, reflujo, «Ver consulta», guardias y el reemplazo ante un 404.
- **IA (S-116)**: `AiFragmentDialog` elige entre notas del espacio (y versiones, si ya ofrecía versiones de Diario) y usa `noteDocumentText` de T-105. La política por proveedor y origen no cambia: el origen «diaria» pasa a «nota», sin ampliar permisos.
- **Cliente que se borra**: `client/src/features/daily/` completo, salvo lo que use `NoteEditor` (mover a `features/notes/editor/` los módulos `link.ts`, `linkHref.ts`, `separator.ts`, `reference.ts`, `ReferencePicker.tsx`, `ReferencePreview.tsx`, `ReferenceView.tsx`, `LinkDialog.tsx` y `dailyDocument.ts` convertido en `noteDocument.ts`, con sus pruebas). También `features/free-notes/` salvo `api.ts` y lo que use el editor, y las importaciones que queden en `spaces`, `auth`, `side-reading`, `ai` y `app`.
- **Servidor que se borra**: `DailyNoteController`, `DailyVersionController`, sus OpenAPI y manejadores de errores, `DailyNoteService`, `DailyVersionService`, `CopyPreviousDailyNoteService` y sus pruebas (`DailyVersionApiIT`, `DailyVersionServiceIT` y `DailyVersionServiceTest`). Se conservan `DailyNote`, `DailyVersion`, sus repositorios y `DailyContent`, que sigue usando la portabilidad hasta T-108. `/api/v1/daily-notes/**` y `/api/v1/daily-versions/**` responden 404.
- **E2E**: adaptar `side-reading.spec.ts` y `ai-workspace.spec.ts` (fragmentos de notas). En `demo-tour.spec.ts`, actualizar solo los selectores de controles que ya no existen, sin volver a grabar nada. Buscar con `rg "notes/20|Diario|Libres|daily" e2e/tests` y dejar en el checkpoint los restos que no apliquen.
- Fuera: tablas de Diario, XLSX y teléfono.

## Leer antes

1. [S-118](../specs/S-118-notes-tabs.md): «Retiro del Diario» y AC-12. También [S-115](../specs/S-115-side-reading.md) y [S-116](../specs/S-116-ai-workspace.md), secciones de fuentes.
2. `client/src/features/side-reading/ReadingSelector.tsx`, `ReadingContent.tsx` y `ReadingWorkspace.tsx`.
3. `client/src/features/ai/AiFragmentDialog.tsx`.
4. `server/src/main/java/com/example/devnotes/daily/` y `portability/persistence/PortabilityReadRepository.java`, para no borrar lo que la portabilidad usa.
5. `client/AGENTS.md` y `server/AGENTS.md`.

## Archivos y pasos

1. Pruebas rojas de componente para las fuentes nuevas de lectura lateral e IA; después, implementación.
2. Mover los módulos del editor a `features/notes/editor/` con sus pruebas; borrar el resto de `daily/` y `free-notes/`; `npx tsc -b` limpio y `rg "features/daily|free-notes/" client/src` sin resultados, salvo `free-notes/api.ts` si se conserva.
3. Borrar los controladores y servicios del servidor; el IT de seguridad o de rutas confirma el 404.
4. E2E, gate diario y PR.

## Aceptación y pruebas

| Criterio observable | Capa elegida y por qué | Comando exacto (directorio/entorno) | Resultado esperado |
|---|---|---|---|
| AC-12 fuentes de lectura lateral e IA | Componente con MSW | `npx vitest run src/features/side-reading src/features/ai src/features/notes` en client/ | Verde |
| Tipos y restos | Typecheck y búsqueda | `npx tsc -b` en client/ y `rg -n "features/daily" client/src` | Exit 0 y sin resultados |
| Endpoints retirados y portabilidad intacta | IT | `./mvnw -q verify -Dit.test='PortabilityExportApiIT,PortabilityImportApiIT,OpenApiContractIT,FreeNoteApiIT' -Djacoco.skip=true` en server/, con un caso nuevo en `FreeNoteApiIT` que pide `/api/v1/daily-notes` y `/api/v1/daily-versions` y espera 404 | Verde |
| AC-12 de punta a punta | E2E | `STARTER_E2E_PROJECT=starter-e2e-t106 bash scripts/e2e.sh --grep "side reading:\|ai workspace:" --project desktop` en la raíz | Verde, cleanup por label |
| Documentos | Gate diario | `node scripts/docs-check.mjs`, `git diff --check` y `bash scripts/verify.sh --policy origin/main` | Exit 0; anotar el perfil |

FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Checkpoint vigente

Sin iniciar. Espera el MERGED de T-105.

## Correcciones significativas

| Fecha / SHA o pendiente de commit | Problema y causa comprobada | Corrección | Prueba y resultado |
|---|---|---|---|
| — | — | — | — |

## Prompts de salida

Al publicar la implementación o una corrección (para el reviewer):
```text
Frontera reviewer independiente de T-106 en MatiasNicolasAcevedo/devnotes, sesión nueva y distinta de la implementer. Leé AGENTS.md, client/AGENTS.md, server/AGENTS.md, docs/agents/reviewer.md, docs/specs/S-118-notes-tabs.md (Retiro del Diario) y docs/tasks/T-106-retire-daily.md. PRECONDICIÓN: gh pr view <número> --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup confirma OPEN, listo, HEAD <sha> y verify-required verde. ACCIÓN: comprobá que lectura lateral e IA usan notas y versiones sin ampliar la política de IA, que no quedan imports de features/daily, que la portabilidad conserva lo que lee, que los endpoints daily responden 404 y que las tablas siguen intactas. Repetí los componentes, el IT y el E2E «side reading:|ai workspace:» desktop con un namespace propio. Si aprobás, squash ligado al HEAD revisado y confirmá MERGED con gh pr view <número> --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit. Máximo dos rondas. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: veredicto y prompt vigente.
```

Al aprobar y mergear (para la tarea siguiente):
```text
Frontera implementer de T-107 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/specs/S-118-notes-tabs.md (Teléfono), media/design/notes-tabs/README.md y docs/tasks/T-107-mobile-notes.md. PRECONDICIÓN: gh pr view codex/t-106-retire-daily --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit confirma MERGED y git merge-base --is-ancestor <oid> origin/main sale 0. ACCIÓN: en codex/t-107-mobile-notes desde main, concilia T-106 como done y pasá T-107 a in_progress en el primer commit. Llevá Notas e Historial en el teléfono a las maquetas 03 a 07. GATE: diario con E2E «notes tabs: phone|note history: phone» mobile. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: PR publicado y prompt del reviewer.
```

## Cierre y siguiente tarea

No está done hasta comprobar el MERGED. El implementer de T-107 la concilia.
