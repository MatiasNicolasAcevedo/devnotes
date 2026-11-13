---
id: T-055
status: in_progress
priority: P1
size: M
milestone: M5
spec: S-111
depends_on: [T-054]
branch: codex/t-055-service-activity-client
role: implementer
executor: junie
pr: null
---

# T-055 · Actividad diaria visible y sondeo moderado

## Objetivo

Activar la ventana por visita visible del dueño y permitir consultar, pausar o reanudar con estados comprensibles.

Draft **solo por dependencias**: T-054 MERGED y conciliada. Contrato completo en S-111; al cumplirse las dependencias no se necesita otra sesión planner. Cada tarea/revisión usa sesión independiente.

## Alcance y decisiones resueltas

API con HTTP existente, fecha del servidor, guardia por identidad/fecha/generación y detalle en menú de cuenta. No activar por timer nocturno/otra cuenta; error no bloquea editor. Readiness al montar/foco y cada 60 s visible; sin polling de detalle escondido.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-111](../specs/S-111-render-daily-availability.md).
2. [client/AGENTS](../../client/AGENTS.md).
3. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
4. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

Nuevo `features/serviceActivity/api.ts`, `useServiceActivity.ts`, `ServiceActivityDialog.tsx` y tests; `features/auth/SessionControls.tsx`, `features/system/useReadiness.ts` y tests.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

Una activación por visita/fecha pese a renders; pausa respetada al reabrir/otra pestaña; fecha backend frente a zona Android. Capacidad no disponible, logout/401/callback tardío. Distinguir conexión, sonda y guardado.

Desde `client/`, Node >=24/npm del proyecto:

```bash
npm test -- --run src/features/serviceActivity src/features/system/ServerStatus.test.tsx src/features/auth/SessionControls.test.tsx
```

Para cambios client, desde `client/`: `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build`. Son verificaciones estáticas/dirigidas; no ejecutar `npm run verify` como sustitución del gate aplazado.

Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

### Inicio

**2026-11-12 · Junie como implementer en sesión nueva**, ejecutado con Claude Opus 5.5 (`claude-opus-5-5`) en Claude Code, app de escritorio; esfuerzo no expuesto. Precondición: `gh pr view 57 …` → `MERGED` contra `main`, squash `fb8a3818ecdf3dcb10da3c0924af2bee45c84f26`, `mergedAt` `2026-11-13T02:34:08Z`, `headRefOid` `f79fbea` igual al del veredicto `APROBADO` de R2. [T-054 conciliada](T-054-service-activity-scheduler.md#conciliación) en el primer commit de esta rama. Rama desde `main` `fb8a381`; `trailer/` (ajeno, sin versionar) no se toca. Pasa de `draft` a `in_progress`.

Plan preparado en T-052 el 2026-11-12. Al tomar la tarea, registrar SHA/base, comandos, resultados y pendientes. Antes de operación larga: checkpoint con recursos propios y cleanup; comprobar que los nombres E2E de los comandos estén ausentes y limpiar solo por labels del harness. Nunca usar el stack persistente del dueño ni instalar herramientas globales.

## Cierre y siguiente tarea

No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-056 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.
