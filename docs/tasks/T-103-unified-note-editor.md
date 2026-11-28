---
id: T-103
status: draft
priority: P1
size: M
milestone: M10
spec: S-118
depends_on: [T-102]
branch: codex/t-103-unified-note-editor
role: implementer
executor: frontier
pr: null
---
# T-103 · Editor único con barra de íconos, primero en Libres

## Objetivo

Tercera tarea de [S-118](../specs/S-118-notes-tabs.md). Las notas de Libres pasan a escribirse con el editor único: numeración a la izquierda, separadores, enlaces y referencias de Diario, y títulos, negrita, listas y código de Libres, todo desde una barra de íconos compacta. Diario no cambia todavía: T-104 hace el corte. `draft` solo porque espera el MERGED de [T-102](T-102-note-versions-api.md). Siguiente: [T-104](T-104-notes-tabs-cutover.md).

## Alcance y decisiones resueltas

- Contrato visual y de interacción en [S-118 · Editor único](../specs/S-118-notes-tabs.md#editor-único-t-103) y en la [maqueta 01](../../media/design/notes-tabs/01-a-escritorio-notas.png) (barra debajo de las pestañas).
- Carpeta nueva `client/src/features/notes/editor/`:
  - `NoteEditor.tsx` parte de `DailyEditor` (viewport, numeración, pegado con límites, enlace con `LinkDialog` y `normalizeLinkHref`, referencias, `readOnly`, `saveAiSource`, `extraTools` y `fillHeight`) y suma las extensiones de Libres (`freeNoteFormatting`, `freeNoteLists`, `freeNoteCodeBlock`).
  - `NoteToolbar.tsx` tiene los botones en el orden de S-118.
  - `noteExtensions.ts` reúne las extensiones.
  - `noteEditor.css` extiende el contador de `dailyEditor.css` a títulos, ítems de lista (también anidados) y bloques de código.
- Los íconos son SVG de trazo en `client/src/shared/ui/icons.tsx`, con los mismos dibujos de la maqueta. Sin dependencias nuevas.
- `FreeNotesPage` usa `NoteEditor` en lugar del editor de `FreeNoteEditor`. Conserva el título y el guardado manual de Libres hasta T-104. Los menús «Formato», «Lista» y «Herramientas» de Libres se reemplazan por la barra.
- `DailyNotesPage` no cambia. La extracción no altera el comportamiento de Diario: sus pruebas siguen verdes.
- «Guardar versión» todavía no aparece en Libres (llega en T-104). El lugar de la derecha muestra el estado y Copiar nota.
- Fuera: pestañas, rutas, autosave de Libres y teléfono más allá de que la barra pase a una segunda línea.

## Leer antes

1. [S-118](../specs/S-118-notes-tabs.md), «Editor único», y la [referencia visual](../../media/design/notes-tabs/README.md).
2. `client/src/features/daily/editor/DailyEditor.tsx` y `dailyEditor.css`.
3. `client/src/features/free-notes/FreeNoteEditor.tsx`, `freeNoteFormatting.ts`, `freeNoteLists.ts` y `freeNoteCodeBlock.ts`.
4. `client/AGENTS.md`.
5. `e2e/tests/free-notes.spec.ts` y `e2e/tests/daily-notes.spec.ts` (CA-01 a CA-03), para mantener sus regresiones.

## Archivos y pasos

Archivos previstos: `features/notes/editor/NoteEditor.tsx`, `NoteToolbar.tsx`, `noteExtensions.ts`, `noteEditor.css` y `NoteEditor.test.tsx`; `features/free-notes/FreeNotesPage.tsx` y `FreeNoteEditor.tsx`; `shared/ui/icons.tsx`; y `e2e/tests/notes-editor.spec.ts` (nuevo).

1. Prueba de componente roja: numeración por bloque e ítem, `aria-pressed` y atajos (Ctrl+Alt+0–3, Ctrl+B, Ctrl+K), selector de lenguaje dentro del código, separador e inserción de referencia.
2. Construir `NoteEditor` y `NoteToolbar` reutilizando las extensiones existentes sin copiarlas.
3. Conectar en `FreeNotesPage` y adaptar las pruebas de Libres a la barra nueva (mismas aserciones de contenido, selectores nuevos).
4. E2E nuevo, gate diario y PR. Capturas de escritorio de 1280 px y de 375 px en el checkpoint, comparadas con la maqueta 01.

## Aceptación y pruebas

| Criterio observable | Capa elegida y por qué | Comando exacto (directorio/entorno) | Resultado esperado |
|---|---|---|---|
| AC-07 barra, atajos y numeración | Componente con providers reales | `npx vitest run src/features/notes/editor/NoteEditor.test.tsx src/features/free-notes/FreeNotesPage.test.tsx` en client/ | Verde |
| Diario sin regresiones | Componente existente | `npx vitest run src/features/daily/editor/DailyEditor.test.tsx` en client/ | Verde |
| Tipos | Typecheck | `npx tsc -b` en client/ | Exit 0 |
| AC-07 de punta a punta: escribir en Libres con separador, enlace, H2, lista, casillas y código; recargar | E2E contra API real, porque cruza el documento del servidor de T-101 | `STARTER_E2E_PROJECT=starter-e2e-t103 bash scripts/e2e.sh --grep "notes editor:\|free-notes:" --project desktop` en la raíz | Verde, cleanup por label |
| Documentos | Gate diario | `node scripts/docs-check.mjs`, `git diff --check` y `bash scripts/verify.sh --policy origin/main` | Exit 0; anotar el perfil |

FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Checkpoint vigente

Sin iniciar. Espera el MERGED de T-102.

## Correcciones significativas

| Fecha / SHA o pendiente de commit | Problema y causa comprobada | Corrección | Prueba y resultado |
|---|---|---|---|
| — | — | — | — |

## Prompts de salida

Al publicar la implementación o una corrección (para el reviewer):
```text
Frontera reviewer independiente de T-103 en MatiasNicolasAcevedo/devnotes, sesión nueva y distinta de la implementer. Leé AGENTS.md, client/AGENTS.md, docs/agents/reviewer.md, docs/specs/S-118-notes-tabs.md (Editor único), media/design/notes-tabs/README.md y docs/tasks/T-103-unified-note-editor.md. PRECONDICIÓN: gh pr view <número> --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup confirma OPEN, listo, HEAD <sha> y verify-required verde. ACCIÓN: compará la barra con la maqueta 01 (orden, íconos, tamaños de 32 y 44 px, tooltips, aria-pressed y atajos), comprobá la numeración en títulos, ítems y código, que Diario no cambió y que no se duplicaron extensiones. Repetí el componente y el E2E «notes editor:|free-notes:» desktop con un namespace propio. Si aprobás, squash ligado al HEAD revisado y confirmá MERGED con gh pr view <número> --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit. Máximo dos rondas. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: veredicto y prompt vigente.
```

Al aprobar y mergear (para la tarea siguiente):
```text
Frontera implementer de T-104 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, client/AGENTS.md, server/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/specs/S-118-notes-tabs.md (Rutas, Barra superior, Pestañas, Estados comunes), media/design/notes-tabs/README.md y docs/tasks/T-104-notes-tabs-cutover.md. PRECONDICIÓN: gh pr view codex/t-103-unified-note-editor --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit confirma MERGED y git merge-base --is-ancestor <oid> origin/main sale 0. ACCIÓN: en codex/t-104-notes-tabs-cutover desde main, concilia T-103 como done y pasá T-104 a in_progress en el primer commit. Implementá el espacio de pestañas, las redirecciones, el autosave y Guardar versión, sin migrar datos del Diario. GATE: diario con E2E «notes tabs:» desktop y un caso mobile. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: PR publicado y prompt del reviewer.
```

## Cierre y siguiente tarea

No está done hasta comprobar el MERGED. El implementer de T-104 la concilia.
