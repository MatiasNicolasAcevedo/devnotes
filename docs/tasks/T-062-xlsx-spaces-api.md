---
id: T-062
status: draft
priority: P1
size: M
milestone: M5
spec: S-109
depends_on: [T-061]
branch: codex/t-062-xlsx-spaces-api
role: implementer
executor: junie
pr: null
---

# T-062 · Respaldo integral y restauración de ambos espacios

## Objetivo

Exportar/importar cuenta completa con Trabajo y Personal sin pérdidas ni mezclas parciales.

Draft **solo por dependencias**: T-061 MERGED y conciliada. Contrato completo en S-109; al cumplirse las dependencias no se necesita otra sesión planner. Cada tarea/revisión usa sesión independiente.

## Alcance y decisiones resueltas

SQL/proyecciones space, escrituras v2, asociaciones espacio+fecha. Cuenta vacía global bajo transacción; reforzar carreras con diario/ref/voz si hace falta. Preview versión real, counts y countsBySpace; import devuelve ambos conteos. Sin filtro de exportación por espacio.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-109](../specs/S-109-private-spaces.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
4. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

`portability/persistence/PortabilityReadRepository.java`, `PortabilityWriteRepository.java`; servicios export/import, `PortabilityController.java`; `PortabilitySpacesApiIT` y regresiones.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

Dos cuentas, v2 dos espacios misma fecha, IDs/refs correctos, v1 work; cuenta con solo Personal rechaza. Carrera import vs nota en cada espacio, dos imports, rollback total; sumas correctas; sin éxito falso ni filtro space.

Desde `server/`, Git Bash con JDK 21 y Docker Linux activo:

```bash
./mvnw -q verify -Dtest=XlsxSpacesRoundTripTest -Dit.test=PortabilitySpacesApiIT,PortabilityExportApiIT,PortabilityImportApiIT,PortabilityImportServiceIT -Djacoco.skip=true
```





Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

Plan preparado en T-052 el 2026-11-12; sin implementación ni tests ejecutados. Al tomar la tarea, registrar SHA/base, comandos, resultados y pendientes. Antes de operación larga: checkpoint con recursos propios y cleanup; comprobar que los nombres E2E de los comandos estén ausentes y limpiar solo por labels del harness. Nunca usar el stack persistente del dueño ni instalar herramientas globales.

## Cierre y siguiente tarea

Control de cinco tareas de I5: revisar dependencias, evidencia dirigida, integrado diferido y hallazgos en esta tarea; volver a frontera solo por decisión fuera del contrato. No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-063 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.

