---
id: T-066
status: draft
priority: P1
size: M
milestone: M5
spec: S-110
depends_on: [T-065]
branch: codex/t-066-copy-previous-api
role: implementer
executor: junie
pr: null
---

# T-066 · Copia transaccional de la última nota anterior

## Objetivo

Sugerir y copiar la última nota anterior del mismo espacio a una fecha vacía sin sobrescrituras concurrentes.

Draft **solo por dependencias**: T-065 MERGED y conciliada. Contrato completo en S-110; al cumplirse las dependencias no se necesita otra sesión planner. Cada tarea/revisión usa sesión independiente.

## Alcance y decisiones resueltas

Vacío compartido, GET previous200/204 y POST copy-previous con errores S-110. Fuente guardada, sourceRevision/expectedRevision y CAS atómico con vacío. Snapshot independiente, origen/versión intactos. Rutas exactas SecurityConfig/OpenAPI.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-110](../specs/S-110-previous-day-copy.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
4. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

Nuevo `daily/application/CopyPreviousDailyNoteService.java`, vacío en DailyContent, consultas `DailyNoteRepository`, controller/DTO/SecurityConfig; `CopyPreviousDailyNoteTest`, `CopyPreviousDailyNoteApiIT`.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

CP-01…07 servidor: ayer/viernes/huecos/vacíos/futuro/otro espacio/usuario; links/@/separadores, CAS/carreras y destino con versión. Doble click/commit con respuesta perdida/campos extra no pisan; GET no escribe. Negativos antes de lógica protectora.

Desde `server/`, Git Bash con JDK 21 y Docker Linux activo:

```bash
./mvnw -q verify -Dtest=CopyPreviousDailyNoteTest,DailyContentTest -Dit.test=CopyPreviousDailyNoteApiIT,DailySpaceApiIT -Djacoco.skip=true
```





Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

Plan preparado en T-052 el 2026-11-12; sin implementación ni tests ejecutados. Al tomar la tarea, registrar SHA/base, comandos, resultados y pendientes. Antes de operación larga: checkpoint con recursos propios y cleanup; comprobar que los nombres E2E de los comandos estén ausentes y limpiar solo por labels del harness. Nunca usar el stack persistente del dueño ni instalar herramientas globales.

## Cierre y siguiente tarea

No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-067 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.

