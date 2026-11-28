---
id: T-107
status: draft
priority: P1
size: M
milestone: M10
spec: S-118
depends_on: [T-106]
branch: codex/t-107-mobile-notes
role: implementer
executor: frontier
pr: null
---
# T-107 · Notas e Historial en el teléfono

## Objetivo

Séptima tarea de [S-118](../specs/S-118-notes-tabs.md). En Android, Notas e Historial quedan como en las maquetas [03](../../media/design/notes-tabs/03-movil-nota-abierta.png) a [07](../../media/design/notes-tabs/07-movil-historial.png):

- Pestañas que se deslizan, con «☰ n» para ver todas.
- Barra de íconos de 44 px abajo, que sube pegada al teclado mientras se escribe.
- Panel inferior «Todas las notas» con acciones por nota.
- Confirmación de borrado y el historial en pantalla completa.

T-104 dejó una base usable; esta tarea lleva el teléfono a su diseño final. `draft` solo porque espera el MERGED de [T-106](T-106-retire-daily.md). Siguiente: [T-108](T-108-xlsx-v5.md).

## Alcance y decisiones resueltas

- Contrato en [S-118 · Teléfono](../specs/S-118-notes-tabs.md#teléfono-t-107-t-104-deja-la-base-usable). Vale por debajo de 600 px (`useIsNarrow`). Entre 600 y 767 px rige la barra en dos líneas de T-103 y T-104.
- **Barra superior compacta**: espacio, estado, Demo (sigue como hoy, solo ícono por debajo de 360 px), «Guardar versión» de solo ícono con `aria-label` y el menú ⋮ de la nota (Renombrar, Copiar nota, Eliminar…).
- **Pestañas**: fila deslizable de 44 px con scroll-snap; la activa se desplaza a la vista; la × solo aparece en la activa; el botón fijo «☰ n» abre `AllNotesPanel` como panel inferior (`role="dialog"`, foco atrapado, cierre con Esc y deslizando hacia abajo, más un botón «Cerrar» como alternativa al gesto).
- **Barra de herramientas**: abajo, sobre la navegación inferior, deslizable de costado, con objetivos de 44 px y un degradado al final.
- **Teclado abierto**: se detecta con `window.visualViewport` (alto menor que la ventana en más de 150 px). Entonces se oculta la navegación inferior, la fila de pestañas se resume en «‹ Título · 2 de 4 ›» con botones de 44 px, y la barra de herramientas queda fija sobre el teclado (`bottom` = alto de la ventana menos `visualViewport.height` menos `offsetTop`) con «Ocultar teclado», que quita el foco del editor. Debe convivir con la densidad compacta de S-117.
- **Historial**: lista a pantalla completa con aviso corto; el detalle se abre a pantalla completa con «Volver», las pestañas Cambios/Solo esta versión y acciones abajo.
- **Borrado**: el mismo `DeleteNoteDialog`, con botones de 44 px.
- Fuera: gestos de arrastre para reordenar en el teléfono (en el teléfono se reordena desde el panel con «Subir» y «Bajar»).

## Leer antes

1. [S-118](../specs/S-118-notes-tabs.md): Teléfono, Estados comunes y AC-13.
2. `media/design/notes-tabs/html/03-movil-nota-abierta.html` a `07-movil-historial.html`.
3. `client/src/app/AppShell.tsx` (navegación inferior y `COMPACT_WRITING_VIEWPORT`) y `client/src/shared/ui/useIsNarrow.ts`.
4. `client/src/features/notes/` (de T-104 y T-105).
5. `client/AGENTS.md` y [S-117](../specs/S-117-compact-writing-header.md).

## Archivos y pasos

Archivos previstos: `features/notes/NoteTabs.tsx`, `AllNotesPanel.tsx`, `NotesWorkspace.tsx`, `useKeyboardInset.ts` (nuevo), `editor/NoteToolbar.tsx`, `history/NoteHistoryPage.tsx`, `app/AppShell.tsx`, `NotesWorkspace.mobile.test.tsx`, y los E2E `notes-tabs.spec.ts` y `note-history.spec.ts`.

1. Pruebas rojas de componente con `viewport.ts` del entorno de pruebas a 375 px y un `visualViewport` simulado.
2. Implementar las pestañas compactas, el panel inferior, la barra inferior y el modo teclado.
3. Historial en pantalla completa y borrado.
4. E2E móvil y gate diario; capturas a 375 px comparadas con las maquetas 03 a 07 en el checkpoint; PR. Registrar que SP-06 (Android físico) sigue pendiente del dueño.

## Aceptación y pruebas

| Criterio observable | Capa elegida y por qué | Comando exacto (directorio/entorno) | Resultado esperado |
|---|---|---|---|
| AC-13 diseño del teléfono y modo teclado | Componente con viewport y `visualViewport` simulados | `npx vitest run src/features/notes src/app/AppShell.test.tsx` en client/ | Verde |
| Tipos | Typecheck | `npx tsc -b` en client/ | Exit 0 |
| AC-13 de punta a punta a 375 px | E2E móvil | `STARTER_E2E_PROJECT=starter-e2e-t107 bash scripts/e2e.sh --grep "notes tabs: phone\|note history: phone" --project mobile` en la raíz | Verde, cleanup por label |
| Escritorio sin regresiones | E2E desktop de un patrón | `STARTER_E2E_PROJECT=starter-e2e-t107d bash scripts/e2e.sh --grep "notes tabs:" --project desktop` | Verde |
| Documentos | Gate diario | `node scripts/docs-check.mjs`, `git diff --check` y `bash scripts/verify.sh --policy origin/main` | Exit 0; anotar el perfil |

El teclado virtual real no se emula en Playwright: el E2E comprueba el diseño a 375 px y la prueba de componente comprueba el modo teclado. La prueba física queda en SP-06, pendiente del dueño. FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Checkpoint vigente

Sin iniciar. Espera el MERGED de T-106.

## Correcciones significativas

| Fecha / SHA o pendiente de commit | Problema y causa comprobada | Corrección | Prueba y resultado |
|---|---|---|---|
| — | — | — | — |

## Prompts de salida

Al publicar la implementación o una corrección (para el reviewer):
```text
Frontera reviewer independiente de T-107 en MatiasNicolasAcevedo/devnotes, sesión nueva y distinta de la implementer. Leé AGENTS.md, client/AGENTS.md, docs/agents/reviewer.md, docs/specs/S-118-notes-tabs.md (Teléfono), media/design/notes-tabs/README.md y docs/tasks/T-107-mobile-notes.md. PRECONDICIÓN: gh pr view <número> --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup confirma OPEN, listo, HEAD <sha> y verify-required verde. ACCIÓN: compará con las maquetas 03 a 07 a 375 px, revisá los objetivos de 44 px, el foco del panel inferior, la alternativa al gesto, el modo teclado con visualViewport, la navegación oculta mientras se escribe y que escritorio no cambió. Repetí los componentes y los E2E mobile y desktop con namespaces propios. Si aprobás, squash ligado al HEAD revisado y confirmá MERGED con gh pr view <número> --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit. Máximo dos rondas. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: veredicto y prompt vigente.
```

Al aprobar y mergear (para la tarea siguiente):
```text
Frontera implementer de T-108 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, server/AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/specs/S-118-notes-tabs.md (XLSX v5) y docs/tasks/T-108-xlsx-v5.md. PRECONDICIÓN: gh pr view codex/t-107-mobile-notes --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit confirma MERGED y git merge-base --is-ancestor <oid> origin/main sale 0. ACCIÓN: en codex/t-108-xlsx-v5 desde main, concilia T-107 como done y pasá T-108 a in_progress en el primer commit. Implementá el XLSX v5 sin historial (importa solo v5) y eliminá las tablas y clases del Diario con V12. GATE: diario con E2E «portability:» desktop. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: PR publicado y prompt del reviewer.
```

## Cierre y siguiente tarea

No está done hasta comprobar el MERGED. El implementer de T-108 la concilia.
