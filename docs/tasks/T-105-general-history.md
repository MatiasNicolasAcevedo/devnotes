---
id: T-105
status: draft
priority: P1
size: M
milestone: M10
spec: S-118
depends_on: [T-104]
branch: codex/t-105-general-history
role: implementer
executor: frontier
pr: null
---
# T-105 · Historial general de versiones

## Objetivo

Quinta tarea de [S-118](../specs/S-118-notes-tabs.md). Historial deja de mostrar versiones por fecha del Diario y pasa a mostrar las versiones de todas las notas del espacio, como en la [maqueta 02](../../media/design/notes-tabs/02-historial-escritorio.png). Se puede filtrar por nota, comparar con la versión actual, copiar, abrir en una pestaña de solo lectura y restaurar. El aviso deja clara la retención de 15 días. `draft` solo porque espera el MERGED de [T-104](T-104-notes-tabs-cutover.md). Siguiente: [T-106](T-106-retire-daily.md).

## Alcance y decisiones resueltas

- Contrato en [S-118 · Historial](../specs/S-118-notes-tabs.md#historial-t-105), F-10 y F-11.
- Carpeta `client/src/features/notes/history/`:
  - `NoteHistoryPage.tsx` (`/history`; `/history/:fecha` redirige a `/history`).
  - `VersionList.tsx` (grupos por día local, etiquetas «Actual», «Se borra mañana» y «Se borra el …», filtro por nota, buscador local y «Cargar más»).
  - `VersionDetail.tsx` («Cambios» y «Solo esta versión», Restaurar, Abrir en pestaña y Copiar texto).
  - `lineDiff.ts` (LCS propio sobre texto plano: un bloque o ítem por línea; sin dependencias).
  - `noteDocumentText.ts` (texto plano del documento unificado, reutilizable por Copiar y por la IA).
- Restaurar: confirmación «¿Restaurar esta versión? El contenido actual se guarda antes como versión.» Si la nota tiene una pestaña abierta con autosave pendiente, completarlo primero y usar su revisión; con 409, el aviso de S-118. Después, la pestaña muestra el contenido restaurado.
- «Abrir en pestaña» abre una pestaña de solo lectura «<título> · versión del 27 nov 18:05», no persistida (F-11), con Restaurar y Copiar. Usa `NoteEditor` con `readOnly`.
- Por debajo de 768 px, la lista ocupa la pantalla y el detalle se abre a pantalla completa con «Volver». El diseño fino del teléfono se revisa en T-107 con la maqueta 07.
- Eliminar `DailyHistoryPage` de la ruta (el archivo se borra en T-106).
- Fuera: búsqueda en el servidor y comparación entre dos versiones viejas.

## Leer antes

1. [S-118](../specs/S-118-notes-tabs.md), «Historial» y AC-11.
2. `media/design/notes-tabs/html/02-historial-escritorio.html` y `07-movil-historial.html`.
3. `client/src/features/daily/DailyHistoryPage.tsx`, como antecedente de estados y accesibilidad.
4. `client/src/features/notes/` de T-104 (`notesApi.ts`, `useOpenTabs.ts` y `NotesWorkspace.tsx`).
5. `client/AGENTS.md`.

## Archivos y pasos

Archivos previstos: los cinco de la carpeta `history/` con sus pruebas (`NoteHistoryPage.test.tsx` y `lineDiff.test.ts`), `AppRoutes.tsx` y `e2e/tests/note-history.spec.ts` (prefijo `note history:`).

1. Pruebas rojas: `lineDiff` (igual, agregado, quitado, movido y 2.000 líneas en menos de 200 ms en jsdom) y la página (grupos, etiquetas con reloj fijo, filtro, restaurar con confirmación y 409, abrir en pestaña de solo lectura, copiar).
2. Implementar la lista, el detalle y la ruta.
3. E2E: guardar dos versiones de dos notas, filtrar, comparar, restaurar y comprobar que la actual quedó como versión.
4. Gate diario; captura a 1280 px comparada con la maqueta 02; PR.

## Aceptación y pruebas

| Criterio observable | Capa elegida y por qué | Comando exacto (directorio/entorno) | Resultado esperado |
|---|---|---|---|
| AC-11 lista, filtro, comparación y acciones | Componente con MSW y reloj fijo | `npx vitest run src/features/notes/history` en client/ | Verde |
| Comparación | Unitaria | Incluida en la fila anterior (`lineDiff.test.ts`) | Verde |
| Tipos | Typecheck | `npx tsc -b` en client/ | Exit 0 |
| AC-11 de punta a punta | E2E contra API real | `STARTER_E2E_PROJECT=starter-e2e-t105 bash scripts/e2e.sh --grep "note history:" --project desktop` en la raíz | Verde, cleanup por label |
| Documentos | Gate diario | `node scripts/docs-check.mjs`, `git diff --check` y `bash scripts/verify.sh --policy origin/main` | Exit 0; anotar el perfil |

FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Checkpoint vigente

Sin iniciar. Espera el MERGED de T-104.

## Correcciones significativas

| Fecha / SHA o pendiente de commit | Problema y causa comprobada | Corrección | Prueba y resultado |
|---|---|---|---|
| — | — | — | — |

## Prompts de salida

Al publicar la implementación o una corrección (para el reviewer):
```text
Frontera reviewer independiente de T-105 en MatiasNicolasAcevedo/devnotes, sesión nueva y distinta de la implementer. Leé AGENTS.md, client/AGENTS.md, docs/agents/reviewer.md, docs/specs/S-118-notes-tabs.md (Historial), media/design/notes-tabs/README.md y docs/tasks/T-105-general-history.md. PRECONDICIÓN: gh pr view <número> --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup confirma OPEN, listo, HEAD <sha> y verify-required verde. ACCIÓN: compará con la maqueta 02, revisá las etiquetas de vencimiento con reloj fijo, el LCS y su costo, restaurar con confirmación, autosave previo y 409, la pestaña de solo lectura no persistida y Copiar. Repetí los componentes y el E2E «note history:» desktop con un namespace propio. Si aprobás, squash ligado al HEAD revisado y confirmá MERGED con gh pr view <número> --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit. Máximo dos rondas. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: veredicto y prompt vigente.
```

Al aprobar y mergear (para la tarea siguiente):
```text
Frontera implementer de T-106 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, client/AGENTS.md, server/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/specs/S-118-notes-tabs.md (Retiro del Diario) y docs/tasks/T-106-retire-daily.md. PRECONDICIÓN: gh pr view codex/t-105-general-history --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit confirma MERGED y git merge-base --is-ancestor <oid> origin/main sale 0. ACCIÓN: en codex/t-106-retire-daily desde main, concilia T-105 como done y pasá T-106 a in_progress en el primer commit. Pasá la lectura lateral y la IA a notas y versiones, y retirá el código y los endpoints del Diario. GATE: diario con E2E «side reading:|ai workspace:» desktop. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: PR publicado y prompt del reviewer.
```

## Cierre y siguiente tarea

No está done hasta comprobar el MERGED. El implementer de T-106 la concilia.
