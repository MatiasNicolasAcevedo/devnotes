---
id: T-062
status: in_progress
priority: P1
size: M
milestone: M5
spec: S-109
depends_on: [T-061]
branch: codex/t-062-xlsx-spaces-api
role: implementer
executor: frontier
pr: null
---

# T-062 · Respaldo integral y restauración de ambos espacios

## Objetivo

Exportar/importar cuenta completa con Trabajo y Personal sin pérdidas ni mezclas parciales.

Dependencia cumplida: T-061 MERGED y [conciliada](T-061-xlsx-spaces-codec.md#conciliación) en el primer avance de esta rama. Contrato completo en S-109. Cada tarea/revisión usa sesión independiente.

## Alcance y decisiones resueltas

SQL/proyecciones space, escrituras v2, asociaciones espacio+fecha. Cuenta vacía global bajo transacción; reforzar carreras con diario/ref/voz si hace falta. Preview versión real, counts y countsBySpace; import devuelve ambos conteos. Sin filtro de exportación por espacio.

Orden determinista del libro v2: referencias y voz por `createdAt` e `id` sin agrupar por espacio, como S-107; diarias y versiones por fecha y, dentro de una misma fecha, Trabajo antes que Personal.

### Decisión del dueño del 2026-11-13

Observación de la revisión R1 de PR64: la API guarda átomos `reference` que apuntan a una referencia de otro espacio de la misma cuenta (regla S-106), y el lector de T-061 rechazaba el libro v2 que los contenía, así que exportar una cuenta real podía producir un respaldo que su propio importador rechaza. Opciones presentadas: (a) el exportador neutraliza esos átomos; (b) el guardado de diarias y versiones los rechaza; (c) el lector los acepta y el importador no les reescribe el ID. **El dueño eligió (c), la recomendada.**

Consecuencias en esta tarea, ya incorporadas a [S-109](../specs/S-109-private-spaces.md#portabilidad-xlsx-v2):

- El lector v2 acepta un átomo a una referencia incluida de otro espacio y conserva el documento sin cambios. Las pruebas de rechazo de T-061 pasan a probar la aceptación.
- El importador reescribe un átomo solo si su referencia está incluida en el archivo y es del mismo espacio que la nota o versión. El átomo cruzado conserva su UUID original, como un huérfano, y la app lo muestra como «Referencia no disponible», igual que antes de exportar.
- El exportador no altera el contenido y el guardado de diarias y versiones no cambia.
- Prueba de cierre: cuenta con una nota y una versión de Personal que contienen un átomo a una referencia de Trabajo propia. Exportar e importar en una cuenta vacía da 201, el átomo conserva el UUID original y la referencia de Trabajo recreada tiene otro UUID, sin `IMPORT_INVALID_RECORD`.

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

Dos cuentas, v2 dos espacios misma fecha, IDs/refs correctos, v1 work; cuenta con solo Personal rechaza. Carrera import vs nota en cada espacio, dos imports, rollback total; sumas correctas; sin éxito falso ni filtro space. Export→import de un átomo de otro espacio según la decisión del dueño.

Desde `server/`, Git Bash con JDK 21 y Docker Linux activo:

```bash
./mvnw -q verify -Dtest=XlsxSpacesRoundTripTest -Dit.test=PortabilitySpacesApiIT,PortabilityExportApiIT,PortabilityImportApiIT,PortabilityImportServiceIT -Djacoco.skip=true
```

Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

2026-11-13 · Frontera en rol implementer, Claude Code de escritorio (Claude Opus 5.5, esfuerzo sin verificar), Git Bash, PowerShell, Git, `gh`, Node, Java 21 y Docker Linux. Worktree propio `.orchestrator/t-062` desde `main` `df2891c`; checkout principal y `trailer/` sin tocar. Precondición: `gh pr view 64` → MERGED, squash `df2891c`, mergedAt 2026-11-14T01:38:06Z, HEAD `b6f1251`.

Impacto previsto: comportamiento (la exportación lleva el espacio real y la importación lo restaura), API (`version` real y `countsBySpace` en vista previa e importación, campos aditivos), datos (escrituras con `space` explícito; ningún cambio de esquema), permisos sin cambios y UI sin cambios en esta tarea.

Primer avance: conciliación de T-061, decisión del dueño en S-109 y en este contrato y retiro de la entrada de BACKLOG. Siguiente paso: pruebas en rojo e implementación.

Antes de operación larga: checkpoint con recursos propios y cleanup; comprobar que los nombres E2E de los comandos estén ausentes y limpiar solo por labels del harness. Nunca usar el stack persistente del dueño ni instalar herramientas globales.

## Cierre y siguiente tarea

Control de cinco tareas de I5: revisar dependencias, evidencia dirigida, integrado diferido y hallazgos en esta tarea; volver a frontera solo por decisión fuera del contrato. No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-063 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.
