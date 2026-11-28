---
id: T-104
status: draft
priority: P1
size: L
milestone: M10
spec: S-118
depends_on: [T-103]
branch: codex/t-104-notes-tabs-cutover
role: implementer
executor: frontier
pr: null
---
# T-104 · Corte: Notas en pestañas, migración del Diario y Guardar versión

## Objetivo

Cuarta tarea de [S-118](../specs/S-118-notes-tabs.md) y la única que cambia de golpe lo que ve el dueño. Al entrar a Notas aparece la tira de pestañas de la [maqueta 01](../../media/design/notes-tabs/01-a-escritorio-notas.png). Todas las notas se crean con un título, se cierran con × sin borrarse, se reabren desde «Todas las notas», se guardan solas y guardan versiones con Ctrl+S o con el botón. El Diario del dueño aparece como la nota «Diario». Desaparecen el calendario, «Hoy» y «Copiar del día anterior». La migración V12 y el cliente nuevo van en el mismo PR para que un solo despliegue de Render haga el corte. `draft` solo porque espera el MERGED de [T-103](T-103-unified-note-editor.md) y la exportación del dueño. Siguiente: [T-105](T-105-general-history.md).

## Alcance y decisiones resueltas

**Servidor**

- `V12__migrate_daily_to_notes.sql` según [S-118 · Migración del Diario](../specs/S-118-notes-tabs.md#migración-del-diario-t-104) y F-02. Usar `uuidv7()`. No modificar `daily_note` ni `daily_version`. Debe ser idempotente: si se corre sobre una base sin filas de Diario, no hace nada.
- Sin cambios de API: las notas usan `/api/spaces/{space}/free-notes` y las versiones, las rutas de T-102.

**Cliente**

- Carpeta `client/src/features/notes/`:
  - `NotesWorkspace.tsx` (página de `/notes` y `/notes/:id`).
  - `NoteTabs.tsx` (tablist, renombrar en el lugar, ×, «+» y reordenar con Alt+←/→ y arrastre).
  - `AllNotesPanel.tsx` (buscador, crear con Enter, «abierta», papelera y «Cargar más»).
  - `DeleteNoteDialog.tsx`.
  - `useOpenTabs.ts` (F-05 y F-06: `localStorage` `devnotes.notes.tabs.v1.<space>`, descarte de ids inexistentes y borrado al cerrar sesión).
  - `useNoteAutosave.ts` (generaliza `useDailyNote`: 700 ms, cola, estados «Guardando…», «Guardado», error y 409, título y documento en el mismo PUT con `revision`).
  - `notesApi.ts` (reexporta `free-notes/api.ts` y agrega las versiones de T-102).
  - `SaveVersionButton.tsx` (completa el autosave, luego POST; región viva «Versión guardada 10:42» o «Sin cambios desde la última versión»).
- Rutas según [S-118 · Rutas](../specs/S-118-notes-tabs.md#rutas): `/notes` y `/notes/:id` van a `NotesWorkspace`; `/notes/AAAA-MM-DD`, `/free-notes` y `/free-notes/:id` redirigen. `/history` sigue con la página actual hasta T-105.
- Barra superior según D-05: sin logo ni «DevNotes» si aparecen; Demo sigue después de Historial.
- Guardias: `SpaceNavigation`, `SessionControls` y `AppShell` dejan de depender de `DailyDraftProvider`, `DailyCopyRecoveryProvider` y `FreeNotesProvider` y usan un `NotesProvider` con la misma garantía (completar o descartar guardados antes de cambiar de espacio o cerrar sesión).
- `NotesWorkspace` se envuelve en `ReadingWorkspace`, con las fuentes actuales; T-106 las cambia.
- Pie de escritorio: «Última versión guardada: <fecha>» y la ayuda de S-118. Sin Ctrl+W.
- Base usable en teléfono (menos de 600 px): las pestañas se deslizan, «Todas las notas» ocupa el ancho y la barra pasa a dos líneas. El diseño final llega en T-107.
- Las páginas y archivos de Diario y Libres quedan sin rutas; se borran en T-106.

**E2E**

- Nuevo `e2e/tests/notes-tabs.spec.ts` con el prefijo `notes tabs:`.
- `daily-notes.spec.ts` (CA-01 a CA-03), `free-notes.spec.ts`, `editor-ergonomics.spec.ts` y `spaces.spec.ts` pasan a abrir notas en pestañas, con las mismas aserciones de contenido.
- `daily-versions.spec.ts` y `copy-previous.spec.ts` se eliminan por D-06; las versiones se prueban en `notes-tabs.spec.ts` y T-105.
- `side-reading.spec.ts`, `ai-workspace.spec.ts` y `demo-tour.spec.ts` se adaptan en T-106. Registrar en el checkpoint que hasta entonces pueden fallar en la suite completa, que está diferida.

## Leer antes

1. [S-118](../specs/S-118-notes-tabs.md): Migración del Diario, Rutas, Barra superior, Pestañas, Estados comunes y AC-08 a AC-10.
2. [Referencia visual](../../media/design/notes-tabs/README.md) y `media/design/notes-tabs/html/01-a-escritorio-notas.html`.
3. `client/src/features/daily/useDailyNote.ts` y `client/src/features/free-notes/FreeNotesPage.tsx`.
4. `client/src/app/AppShell.tsx`, `AppRoutes.tsx` y `client/src/features/spaces/SpaceNavigation.tsx`.
5. `server/src/test/java/com/example/devnotes/freenote/FreeNoteMigrationIT.java`, como patrón de IT de migración.

## Archivos y pasos

Más de cinco archivos por decisión del planner: la migración y el cliente deben llegar juntos. Además de los listados en Alcance: `AppRoutes.tsx`, `AppShell.tsx`, `SpaceNavigation.tsx`, `SessionControls.tsx`, sus pruebas, `DailyToNoteMigrationIT.java` y los E2E citados.

1. IT rojo de V12 (AC-08): dos dueños, dos espacios, tres días de Diario, versiones dentro y fuera de los 15 días, y una nota «Diario» ya existente. Luego V12.
2. Componentes rojos de AC-09 y AC-10 (`NotesWorkspace.test.tsx`, `AppRoutes.test.tsx`); luego pestañas, panel, borrado, autosave, Guardar versión y rutas.
3. Mover las guardias al `NotesProvider` y adaptar los E2E.
4. Gate diario; capturas a 1280 y 375 px comparadas con las maquetas 01 y 03 en el checkpoint; PR.

## Aceptación y pruebas

| Criterio observable | Capa elegida y por qué | Comando exacto (directorio/entorno) | Resultado esperado |
|---|---|---|---|
| AC-08 migración | IT con PostgreSQL 18 (`uuidv7`) | `./mvnw -q verify -Dit.test='DailyToNoteMigrationIT,FreeNoteMigrationIT' -Djacoco.skip=true` en server/ | Verde |
| AC-09 pestañas, panel, borrado, autosave y versión | Componente con MSW | `npx vitest run src/features/notes src/app/AppRoutes.test.tsx src/features/spaces src/features/auth` en client/ | Verde |
| AC-10 redirecciones y barra | Componente | Incluida en la fila anterior | Verde |
| Tipos | Typecheck | `npx tsc -b` en client/ | Exit 0 |
| AC-09 de punta a punta en escritorio | E2E contra API, base y OIDC reales | `STARTER_E2E_PROJECT=starter-e2e-t104 bash scripts/e2e.sh --grep "notes tabs:\|notes editor:\|free-notes:\|CA-0[123]:\|compact\|spaces" --project desktop` en la raíz | Verde, cleanup por label |
| Base en el teléfono | E2E móvil de un caso | `STARTER_E2E_PROJECT=starter-e2e-t104m bash scripts/e2e.sh --grep "notes tabs: phone" --project mobile` | Verde |
| Documentos | Gate diario | `node scripts/docs-check.mjs`, `git diff --check` y `bash scripts/verify.sh --policy origin/main` | Exit 0; anotar el perfil |

Si el E2E dirigido supera los 20 minutos, partirlo en dos corridas por patrón y registrar cada una. Recomendar en STATUS el integrado FULL/STARTER después del merge (migración y corte). FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Checkpoint vigente

Sin iniciar. Espera el MERGED de T-103 y la confirmación del dueño de que exportó el XLSX de producción.

## Correcciones significativas

| Fecha / SHA o pendiente de commit | Problema y causa comprobada | Corrección | Prueba y resultado |
|---|---|---|---|
| — | — | — | — |

## Prompts de salida

Al publicar la implementación o una corrección (para el reviewer):
```text
Frontera reviewer independiente de T-104 en MatiasNicolasAcevedo/devnotes, sesión nueva y distinta de la implementer. Leé AGENTS.md, client/AGENTS.md, server/AGENTS.md, docs/agents/reviewer.md, docs/specs/S-118-notes-tabs.md, media/design/notes-tabs/README.md y docs/tasks/T-104-notes-tabs-cutover.md. PRECONDICIÓN: gh pr view <número> --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup confirma OPEN, listo, HEAD <sha> y verify-required verde. ACCIÓN: revisá V12 contra F-02 (aditiva, sin tocar daily_*, idempotente, por dueño y espacio), pestañas contra la maqueta 01 (teclado, ×, renombrar, panel, borrado confirmado, F-05/F-06), autosave y 409, Guardar versión con Ctrl+S, redirecciones, barra D-05 con Demo y guardias de espacio y logout. Repetí el IT de migración y el E2E «notes tabs:» desktop con un namespace propio. Si aprobás, squash ligado al HEAD revisado y confirmá MERGED con gh pr view <número> --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit. Máximo dos rondas. FULL/STARTER: DIFERIDO POR EL DUEÑO; recomendalo en el cierre. SALIDA: veredicto y prompt vigente.
```

Al aprobar y mergear (para la tarea siguiente):
```text
Frontera implementer de T-105 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/specs/S-118-notes-tabs.md (Historial), media/design/notes-tabs/README.md y docs/tasks/T-105-general-history.md. PRECONDICIÓN: gh pr view codex/t-104-notes-tabs-cutover --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit confirma MERGED y git merge-base --is-ancestor <oid> origin/main sale 0. ACCIÓN: en codex/t-105-general-history desde main, concilia T-104 como done y pasá T-105 a in_progress en el primer commit. Reemplazá Historial por el historial general. GATE: diario con E2E «note history:» desktop. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: PR publicado y prompt del reviewer.
```

## Cierre y siguiente tarea

No está done hasta comprobar el MERGED. Render despliega el merge y hace el corte; el dueño verifica su nota «Diario» en sus dispositivos. El implementer de T-105 la concilia.
