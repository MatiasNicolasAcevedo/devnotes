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

Revisión independiente en curso. Junie reviewer, Qwen3.6-27B-FP8. HEAD de9c612 (incluye corrección documental T-025 → done), base main 9a14044.

**Bloqueante B-1:** E2E `reference-preview.spec.ts` falla en paso 2 (línea 46): `page.keyboard.type('@Referencia')` envía todos los caracteres de una vez; el picker con debounce 250 ms no dispara la búsqueda a tiempo y `getByText('Referencia E2E')` no aparece en 10 s. El picker funciona correctamente en otros tests (reference.spec.ts pasa). Corrección: el test debe escribir `@` con `keyboard.type('@')`, esperar a que el picker se abra, luego escribir la consulta con pausa entre caracteres o usar `fill`/`pressSequentially` con delay. Verificar que el picker muestra resultados antes de continuar.

**Observación O-1:** `ReferenceView.tsx` elimina el parámetro `editor` de `ReactNodeViewProps` (no se usaba). Cambio limpio.

**Observación O-2:** `ReferencePreview.tsx` usa `e.preventDefault()` en `handleAnchorTouchStart` (línea 100). Esto puede interferir con el scroll táctil en móviles si el usuario toca el átomo sin intención de abrir la vista previa. Considerar verificar si el toque es único (no parte de un scroll) antes de prevenir el comportamiento predeterminado.

**Observación O-3:** `ReferencePreview.tsx` declara `anchorProps` con `useMemo` y los pasa vía `useEffect` + callback (`onAnchorProps`). Este patrón de lift-state-down con callback es funcional pero añade un render extra. Evaluar si un `ref` para `setAnchorProps` simplificaría el flujo sin cambiar el comportamiento observable.

## Cierre y siguiente tarea

Un PR, revisión independiente y merge según AUTONOMY. Al confirmar MERGED, Junie controla las cinco tareas y devuelve a frontera con evidencia del objetivo de iteración. No iniciar voz.
