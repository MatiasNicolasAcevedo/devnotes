---
id: T-067
status: draft
priority: P1
size: M
milestone: M5
spec: S-110
depends_on: [T-066]
branch: codex/t-067-copy-previous-client
role: implementer
executor: junie
pr: null
---

# T-067 · Empezar el día desde una nota anterior

## Objetivo

Ofrecer copia explícita con fecha/espacio visibles y dejar la nota lista para editar con un gesto.

Draft **solo por dependencias**: T-066 MERGED y conciliada. Contrato completo en S-110; al cumplirse las dependencias no se necesita otra sesión planner. Cada tarea/revisión usa sesión independiente.

## Alcance y decisiones resueltas

Franja contextual vacía, sugerencia/carga/ausencia/error, POST único y ACK coordinado. Ignorar GET obsoleto por typing/contexto; bloquear durante copia. Undo como operación del editor, sin autosave duplicado. Diferenciar portapapeles.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-110](../specs/S-110-previous-day-copy.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. [client/AGENTS](../../client/AGENTS.md).
4. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
5. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

Nuevo `client/src/features/daily/CopyPreviousNote.tsx`/test; `daily/api.ts`, `DailyNotesPage.tsx`, coordinador/editor ACK/undo; `e2e/tests/copy-previous.spec.ts` prefijo `copy previous:`.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

CP-01…08: teclado/táctil, fecha, ausencia/error, fuente cambiada, destino remoto no vacío, typing durante GET, red perdida, logout/espacio, undo/reload. Android sin comprimir toolbar; origen/versión intactos.

Desde `client/`, Node >=24/npm del proyecto:

```bash
npm test -- --run src/features/daily/CopyPreviousNote.test.tsx src/features/daily/api.test.ts src/features/daily/useDailyNote.test.tsx
```

Raíz, Git Bash: `STARTER_E2E_PROJECT=starter-e2e-t067-desktop bash scripts/e2e.sh --grep 'copy previous:' --project desktop` y luego `STARTER_E2E_PROJECT=starter-e2e-t067-mobile bash scripts/e2e.sh --grep 'copy previous:' --project mobile`.

Para cambios client, desde `client/`: `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build`. Son verificaciones estáticas/dirigidas; no ejecutar `npm run verify` como sustitución del gate aplazado.

Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

Plan preparado en T-052 el 2026-11-12; sin implementación ni tests ejecutados. Al tomar la tarea, registrar SHA/base, comandos, resultados y pendientes. Antes de operación larga: checkpoint con recursos propios y cleanup; comprobar que los nombres E2E de los comandos estén ausentes y limpiar solo por labels del harness. Nunca usar el stack persistente del dueño ni instalar herramientas globales.

## Cierre y siguiente tarea

Control de cinco tareas de I5: revisar dependencias, evidencia dirigida, integrado diferido y hallazgos en esta tarea; volver a frontera solo por decisión fuera del contrato. No done hasta MERGED comprobado. Tras MERGED confirmado, una nueva sesión concilia esta tarea y vuelve a frontera/dueño para elegir otras propuestas. No inventar la siguiente implementación. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.

