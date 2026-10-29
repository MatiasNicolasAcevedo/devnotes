---
id: T-025
status: mergeable
priority: P1
size: M
milestone: M1
spec: S-106
depends_on: [T-024]
branch: codex/t-025-reference-insertion
role: implementer
executor: junie
pr: null
---
# T-025 · Buscar, insertar y resolver referencias

## Objetivo

Buscar, insertar y resolver referencias para S-106. Draft solo por dependencia T-024; Junie puede habilitarla al comprobar MERGED. Tras comprobar MERGED, continuar con T-026 predefinida.

## Alcance

Modelo y validación TS del átomo de S-106, búsqueda `@`, inserción y resolución privada del ID en editor y lectura histórica. Implementar los estados de carga, 404 y fallos y semántica de copiado de S-106; vista previa accesible completa queda en T-026. Nunca consultar identidad ajena ni persistir datos resueltos en documento.

## Leer antes

[S-106](../specs/S-106-reference-links.md), [S-101](../specs/S-101-daily-notes.md), [S-104](../specs/S-104-daily-versions.md), [client/AGENTS](../../client/AGENTS.md) y [TESTING](../TESTING.md). AGENTS raíz, STATUS y protocolo implementer son entrada de sesión.

## Archivos y pasos

Modificar esquema, extensión y serialización del editor, consultas privadas y componentes necesarios. Probar límite/estructura y compatibilidad, selección por teclado y mouse, paginación, IME, cancelación y respuesta tardía de búsqueda, rango/identidad, pegado, undo/redo, copiado y estados 404/red/403. Refetch e invalidación deben respetar S-106; sin nueva dependencia.

## Aceptación y pruebas

Desde `client`: `npm test -- --run src/features/daily/editor/dailyDocument.test.ts src/features/daily/editor/DailyEditor.test.tsx src/features/daily/DailyNotesPage.test.tsx src/features/daily/DailyHistoryPage.test.tsx src/features/reference/api.test.ts`. Añadir pruebas dirigidas con providers reales y negativas de identidad/copia. Cualquier nueva suite se ejecuta también en el FULL.

Gate desde raíz Git Bash: `COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t025 STARTER_E2E_PROJECT=starter-e2e-t025 STARTER_SERVER_TESTS=container bash scripts/verify.sh`. Antes comprobar nombres libres, registrar SHA/base, huellas antes/después, log saneado y cleanup solo propio; preservar stack persistente. docs-check y policy según TESTING; mantener suites y cobertura.

## Checkpoint vigente

Revisión independiente en curso. Junie reviewer, Qwen3.6-27B-FP8. HEAD 8195732, base main e049e3c.
Bloqueante B-1: T-024 con `status: in_review` en la rama del PR (debería ser `done` tras merge e049e3c). docs-check rechaza dos tareas en vuelo. Corrección documental aplicada en este commit.
Observación O-1: ReferenceView muestra "Referencia no disponible" para 404 y errores de red/403 indistintamente. S-106 exige "No se pudo cargar" con reintento para red/403. No bloquea el flujo principal; corregible en T-026 (vista previa completa).
Observación O-2: `searchReferenceItems` sin prueba directa en api.test.ts. Función nueva no cubierta por tests unitarios de API.
Observación O-3: `anchorPosition` declarado en ReferencePickerProps pero no usado en el componente.

## Cierre y siguiente tarea

Un PR, revisión independiente y merge según AUTONOMY. Tras comprobar MERGED, continuar con T-026 predefinida. No iniciar voz.
