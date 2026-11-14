---
id: T-061
status: in_progress
priority: P1
size: M
milestone: M5
spec: S-109
depends_on: [T-060]
branch: codex/t-061-xlsx-spaces-codec
role: implementer
executor: frontier
pr: null
---

# T-061 · Formato XLSX v2 y lectura de respaldos v1

## Objetivo

Representar dos espacios en un respaldo y mantener lectura exacta de libros anteriores.

Habilitada tras T-060 MERGED y [conciliada](T-060-voice-spaces.md#conciliación). Contrato completo en S-109. Cada tarea/revisión usa sesión independiente.

## Alcance y decisiones resueltas

space en records, columna final espacio, clave compuesta diarios/versiones y escritura v2. Reader por versión: v1=>work; v2 enum obligatorio. Rechazar referencias incluidas cruzadas; conservar límites globales, fragmentación y ZIP checks. Adaptar llamadas para compilar con work hasta T-062; no desplegar este paso intermedio.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-109](../specs/S-109-private-spaces.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
4. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

`portability/xlsx/PortabilityRecords.java`, `XlsxFormat.java`, `XlsxWorkbookReader.java`, `XlsxWorkbookWriter.java` y helpers; `XlsxSpacesRoundTripTest`, fixture v1 inmutable y suites existentes.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

Igual fecha en dos espacios conserva notas/versiones. v1->modelo->v2->modelo intacto; campo omitido/enum inválido/mezcla/duplicado/cross-space ref rechazan. Grandes fragmentos/Unicode/ZIP/fórmulas conservan regresiones.

Desde `server/`, Git Bash con JDK 21 y Docker Linux activo:

```bash
./mvnw -q test -Dtest=XlsxSpacesRoundTripTest,XlsxWorkbookReaderTest,XlsxWorkbookRoundTripTest,XlsxZipInspectionTest,XlsxTextTest -Djacoco.skip=true
```

Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

**2026-11-13 · Frontera en rol implementer**, Claude Code de escritorio (Claude Opus 5.5, esfuerzo sin verificar), Git Bash, PowerShell, Git, `gh`, Java 21.0.9 y Docker Linux. Impacto: formato del respaldo `.xlsx` (escritura v2, lectura v1/v2) dentro del códec; sin cambios de API, permisos, esquema ni UI. Las llamadas de persistencia/servicio compilan con Trabajo hasta T-062 y este paso intermedio no se despliega.

Base `0dcf38c6873d64be35d1312e37b5cf1fdf004248` (squash de PR63) en `.orchestrator/t-061/`. `gh pr view 63` confirmó MERGED y la [conciliación de T-060](T-060-voice-spaces.md#conciliación). Fixture v1 inmutable generado con el escritor v1 de esa base antes de cualquier cambio: `server/src/test/resources/portability/xlsx/devnotes-v1.xlsx`, SHA-256 `7e7f784b5b8c4d6fe3952d197cb29c606687141ebdbee0f27330feef4ad4a9c5`.

Pendiente: pruebas rojas, implementación, pruebas dirigidas, checks de cierre y PR.

## Cierre y siguiente tarea

No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-062 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.
