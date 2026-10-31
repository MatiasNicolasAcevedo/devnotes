---
id: T-026
status: changes_requested
priority: P1
size: M
milestone: M1
spec: S-106
depends_on: [T-025]
branch: codex/t-026-reference-preview
role: implementer
executor: junie
pr: 29
---
# T-026 · Vista previa accesible y recorrido completo

## Objetivo

Vista previa accesible y recorrido completo para S-106. Draft solo por dependencia T-025; Junie puede habilitarla al comprobar MERGED. Al confirmar MERGED, Junie controla las cinco tareas y devuelve a frontera con evidencia del objetivo de iteración.

## Alcance

Vista previa con hover, teclado y tacto en trabajo e historial, con cierre y foco conforme S-106. Contenido vigente por dueño; 404 es indisponible, error de red es reintentable. No cambiar contenido guardado al refrescar.

## Leer antes

[S-106](../specs/S-106-reference-links.md), [S-101](../specs/S-101-daily-notes.md), [S-104](../specs/S-104-daily-versions.md), [client/AGENTS](../../client/AGENTS.md) y [TESTING](../TESTING.md). AGENTS raíz, STATUS y protocolo implementer son entrada de sesión.

## Archivos y pasos

Editar editor/vista previa y pruebas de componentes; añadir Playwright real en `e2e/tests/`. Crear A, insertar, guardar nota y versión, editar original y comprobar título/descripción actualizados en ambas tras reabrir; borrar original y comprobar indisponible en ambas tras recarga; B no accede a datos A. Probar foco, teclado, mouse y táctil, 375, estados, selección y copiado; sin mockear API propia.

## Aceptación y pruebas

Desde `client`: `npm test -- --run src/features/daily/editor/DailyEditor.test.tsx src/features/daily/DailyHistoryPage.test.tsx src/features/daily/DailyNotesPage.test.tsx`. Playwright nuevo se ejecuta en FULL real desktop y móvil; registrar resultado por proyecto.

Gate desde raíz Git Bash: `COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t026 STARTER_E2E_PROJECT=starter-e2e-t026 STARTER_SERVER_TESTS=container bash scripts/verify.sh`. Antes comprobar nombres libres, registrar SHA/base, huellas antes/después, log saneado y cleanup solo propio; preservar stack persistente. docs-check y policy según TESTING; mantener suites y cobertura.

## Checkpoint vigente

Corrección documental publicada. Bloqueante B-2 resuelto: enlaces rotos en E2E-ITERATION.md corregidos (AGENTS.md → ../AGENTS.md, TESTING.md y agents/implementer.md con ruta relativa correcta). B-3 ya era consistente. docs-check OK (76 Markdown, 27 tareas, HANDOFF 22/22). Pendiente: CI verde y FULL E2E.

**Bloqueante B-2:** `docs/E2E-ITERATION.md` línea 44: enlace a `AGENTS.md#pruebas-y-entrega` resuelve a `docs/AGENTS.md` que no existe. Debe ser `../AGENTS.md`. docs-check rechaza el enlace roto, causando 10 fallos en CI.

**Bloqueante B-3:** `docs/STATUS.md` tabla dice `Estado | in_progress |` pero T-026 frontmatter dice `changes_requested`. docs-check línea 195 rechaza la discrepancia.

**Correcciones significativas:**
| # | Problema | Causa | Arreglo | SHA |
|---|---|---|---|---|
| 1 | E2E picker no busca | `type('@Referencia')` sin separar `@` de consulta; debounce 250 ms no dispara | Separar `@`, esperar picker, `type('Referencia', {delay:100})` | d7e075d |
| 2 | `writeWork` limpia editor | `editor.fill('')` borra átomo `@Referencia E2E` | `waitForResponse` + `waitForTimeout(1000)` para auto-save | d7e075d |

**Observación O-1:** `ReferenceView.tsx` elimina el parámetro `editor` de `ReactNodeViewProps` (no se usaba). Cambio limpio.

**Observación O-2:** `ReferencePreview.tsx` usa `e.preventDefault()` en `handleAnchorTouchStart` (línea 100). Aceptable en átomo inline pequeño.

**Observación O-3:** `useReferencePreview` usa lift-state-down con callback. Funcional, un render extra.

## Cierre y siguiente tarea

Un PR, revisión independiente y merge según AUTONOMY. Al confirmar MERGED, Junie controla las cinco tareas y devuelve a frontera con evidencia del objetivo de iteración. No iniciar voz.
