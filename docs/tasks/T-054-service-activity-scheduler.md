---
id: T-054
status: draft
priority: P1
size: M
milestone: M5
spec: S-111
depends_on: [T-053]
branch: codex/t-054-service-activity-scheduler
role: implementer
executor: junie
pr: null
---

# T-054 · Sonda interna cancelable y acotada

## Objetivo

Programar una sola sonda cada diez minutos dentro de una ventana vigente y conservar el resultado real de cada intento.

Draft **solo por dependencias**: T-053 MERGED y conciliada. Contrato completo en S-111; al cumplirse las dependencias no se necesita otra sesión planner. Cada tarea/revisión usa sesión independiente.

## Alcance y decisiones resueltas

TaskScheduler one-shot cancelable, recuperación de ventana y transporte con límite de tiempo/cuerpo. Destino fijo desde APP_PUBLIC_URL, sin redirect/cookies ni URL del request. Tres fallos detienen la secuencia. Producción permanece desactivada; no afirmar eficacia en Render.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-111](../specs/S-111-render-daily-availability.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
4. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

Nuevos `serviceactivity/application/ServiceActivityScheduler.java`, `ServiceActivityProbe.java`, configuración y enlace con servicio de ventana; `ServiceActivitySchedulerTest`, `ServiceActivityProbeTest`, `ServiceActivitySchedulerIT`.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

Clock/scheduler controlados, cero esperas de diez minutos: medianoche, pausa, callback viejo, restart vencido/vigente, no solapamiento ni catch-up. Destinos inválidos/redirect; 200 JSON UP frente a HTML, 5xx, timeout y cuerpo excesivo. Persistencia en PostgreSQL.

Desde `server/`, Git Bash con JDK 21 y Docker Linux activo:

```bash
./mvnw -q verify -Dtest=ServiceActivitySchedulerTest,ServiceActivityProbeTest -Dit.test=ServiceActivitySchedulerIT -Djacoco.skip=true
```





Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

Plan preparado en T-052 el 2026-11-12; sin implementación ni tests ejecutados. Al tomar la tarea, registrar SHA/base, comandos, resultados y pendientes. Antes de operación larga: checkpoint con recursos propios y cleanup; comprobar que los nombres E2E de los comandos estén ausentes y limpiar solo por labels del harness. Nunca usar el stack persistente del dueño ni instalar herramientas globales.

## Cierre y siguiente tarea

No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-055 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.

