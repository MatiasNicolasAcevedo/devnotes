---
id: T-063
status: draft
priority: P1
size: L
milestone: M5
spec: S-109
depends_on: [T-062]
branch: codex/t-063-space-client-context
role: implementer
executor: junie
pr: null
---

# T-063 · Contexto privado en rutas, transporte y borradores

## Objetivo

Atar cada lectura, mutación y borrador a cuenta/espacio fijos incluso en navegación/respuestas tardías.

Draft **solo por dependencias**: T-062 MERGED y conciliada. Contrato completo en S-109; al cumplirse las dependencias no se necesita otra sesión planner. Cada tarea/revisión usa sesión independiente.

## Alcance y decisiones resueltas

Enum/URL/preferencia mínima, coordinador común de transición. Propagar space APIs/keys de diario/versiones/ref/voz; contexto de request capturado y cambio tras flush/guardias. URL inválida nunca escribe; no persistir notas/cache. Transversal por una sola invariante de aislamiento, sin selector visual aún.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-109](../specs/S-109-private-spaces.md).
2. [client/AGENTS](../../client/AGENTS.md).
3. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
4. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

Nuevo `features/spaces/space.ts`, `SpaceProvider.tsx`, `SpaceNavigation.tsx`; APIs/hooks de cuatro features, `DailyDraft*`, `VoiceDraft*`, `AppShell` y limpieza sesión; `SpaceNavigation.test.tsx`, `SpaceApiContext.test.ts` y suites afectadas.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

Dos contextos misma fecha/ID, guardados/versiones en vuelo, error/409 diario, guardar/descartar/cancel voz, audio/transcripción tardía. Atrás/Adelante/URL con misma guardia; logout/expiración/storage denegado/preferencia inválida/otra pestaña. Cada request persistente incluye space.

Desde `client/`, Node >=24/npm del proyecto:

```bash
npm test -- --run src/features/spaces src/features/daily/api.test.ts src/features/daily/useDailyNote.test.tsx src/features/voice/VoiceDraftNavigation.test.tsx src/features/reference
```



Para cambios client, desde `client/`: `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build`. Son verificaciones estáticas/dirigidas; no ejecutar `npm run verify` como sustitución del gate aplazado.

Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

Plan preparado en T-052 el 2026-11-12; sin implementación ni tests ejecutados. Al tomar la tarea, registrar SHA/base, comandos, resultados y pendientes. Antes de operación larga: checkpoint con recursos propios y cleanup; comprobar que los nombres E2E de los comandos estén ausentes y limpiar solo por labels del harness. Nunca usar el stack persistente del dueño ni instalar herramientas globales.

## Cierre y siguiente tarea

No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-064 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.

