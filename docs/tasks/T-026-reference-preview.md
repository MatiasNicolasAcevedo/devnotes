---
id: T-026
status: draft
priority: P1
size: M
milestone: M1
spec: S-106
depends_on: [T-025]
branch: codex/t-026-reference-preview
role: implementer
executor: junie
pr: null
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

Contrato de frontera, sin implementación ni pruebas. Depende de T-025 MERGED. Decisión del dueño y límites en S-106.

## Cierre y siguiente tarea

Un PR, revisión independiente y merge según AUTONOMY. Al confirmar MERGED, Junie controla las cinco tareas y devuelve a frontera con evidencia del objetivo de iteración. No iniciar voz.
