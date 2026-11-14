---
id: T-061
status: in_review
priority: P1
size: M
milestone: M5
spec: S-109
depends_on: [T-060]
branch: codex/t-061-xlsx-spaces-codec
role: implementer
executor: frontier
pr: 64
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

#### Checkpoint vigente

**2026-11-13 · Frontera en rol implementer**, Claude Code de escritorio (Claude Opus 5.5, esfuerzo sin verificar), Git Bash, PowerShell, Git, `gh`, Java 21.0.9 y Docker Linux 28.5.1. Impacto: formato del respaldo `.xlsx` (escritura v2, lectura v1/v2) dentro del códec; sin cambios de API HTTP, permisos, esquema ni UI. La exportación ya escribe v2, pero la persistencia y el servicio de importación compilan con Trabajo hasta T-062: este paso intermedio no se despliega.

Base `0dcf38c6873d64be35d1312e37b5cf1fdf004248` (squash de PR63) en `.orchestrator/t-061/`. `gh pr view 63` confirmó MERGED y la [conciliación de T-060](T-060-voice-spaces.md#conciliación). Sin otros PR abiertos de la serie ni rama de T-061 publicada al inicio.

Fixture v1 inmutable generado con el escritor v1 de la base antes de cualquier cambio y descartado su generador: `server/src/test/resources/portability/xlsx/devnotes-v1.xlsx`, SHA-256 `7e7f784b5b8c4d6fe3952d197cb29c606687141ebdbee0f27330feef4ad4a9c5`, verificado también sobre el blob commiteado. Contiene dos referencias, dos diarias (una fragmentada en dos partes, Unicode con pares sustitutos, átomo a referencia incluida y a referencia ausente), una versión y una nota de voz. `.gitattributes` marca `*.xlsx` como binario; `XlsxSpacesRoundTripTest` comprueba el hash.

Decisiones dentro del contrato: `space` es el primer componente de los cuatro records; `XlsxWorkbookContent` expone la `version` leída (1 o 2) para la vista previa de T-062. En v2, `space` va al final de cada `dato_json` y la columna `espacio` (valores `Trabajo`/`Personal`) es la última de cada hoja y solo en la parte 1. Las claves de voz/referencias siguen siendo UUID. Mezcla de esquemas (cabecera, columnas o `dato_json` de la otra versión) y átomo a referencia incluida de otro espacio son `IMPORT_INVALID_RECORD` con hoja y fila de la parte 1; versión desconocida sigue siendo `IMPORT_UNSUPPORTED_FORMAT`. El emparejamiento de átomos es el mismo que usa el importador para reescribir IDs.

Rojo sobre las fuentes de la base con `XlsxSpacesRoundTripTest` agregado y solo la superficie nueva de API (records con espacio, `version()`, cabeceras v1/v2) manteniendo el comportamiento v1. Desde `server/` en Git Bash, `./mvnw -o -B test -Dtest=XlsxSpacesRoundTripTest,XlsxWorkbookReaderTest,XlsxWorkbookRoundTripTest,XlsxZipInspectionTest,XlsxTextTest -Djacoco.skip=true` → exit 1, 238 ejecutadas, 33 fallos y 6 errores: 39 en la suite nueva (v2 no aceptado, campo `space`, claves compuestas, cruce de espacios, mezclas, límites) y 1 de layout en `XlsxWorkbookRoundTripTest`; regresiones v1 verdes y el fixture v1 leído como Trabajo. Log local `.orchestrator/t-061-logs/red.log`.

Verde. Mismo comando → exit 0, 238/238 (`XlsxSpacesRoundTripTest` 50, `XlsxWorkbookReaderTest` 138, `XlsxWorkbookRoundTripTest` 12, `XlsxZipInspectionTest` 29, `XlsxTextTest` 9). Regresión adicional con PostgreSQL real: `./mvnw -o -B verify -Dtest='Xlsx*Test,PortabilityExportServiceTest' -Dit.test=PortabilityExportApiIT,PortabilityImportApiIT,PortabilityImportServiceIT -Djacoco.skip=true` → exit 0, Spotless OK, Surefire 242/242 y Failsafe 31/31 (8 exportación, 11 importación API, 12 servicio), sin omitidos; Flyway identificó PostgreSQL 18.6 en los tres contextos. Tras la corrida no quedó ningún contenedor con `org.testcontainers=true`. Log local `.orchestrator/t-061-logs/backend-directed.log`.

Cobertura de aceptación: igual fecha en ambos espacios conserva notas, versiones, referencias y voz; fixture v1 → modelo exacto en Trabajo → v2 → modelo intacto; negativos de `space` omitido en las cuatro hojas, mayúsculas, español, vacío, espacio inicial, desconocido, numérico, nulo y repetido; claves sin prefijo, de otro espacio, con mayúsculas o con prefijo en voz; registro v1 con `space`, v1 con cabeceras o columna v2, v2 con cabeceras v1 o una hoja v1; duplicado diario y de versión por espacio+fecha; versión con nota solo en el otro espacio; referencia incluida cruzada en diarias, versiones y anidada; versiones 3, 0, `2.0`, `02` y `v2`; fórmula y celda extra tras `espacio`; 10 000/10 001 registros mezclando espacios; fragmentos con Unicode; 64 MiB inflados, 65 entradas y DOCTYPE en libros v2. El tope de 10 MiB comprimidos es de transporte y sigue cubierto en las IT de importación.

**FULL/STARTER DIFERIDO POR EL DUEÑO.** El ensayo de Render requiere autorización expresa sobre SHA y ventana.

### Correcciones significativas

| Problema o condición | Arreglo | Prueba |
|---|---|---|
| El códec solo conocía v1: sin espacio, claves por fecha y versión 2 rechazada | Lector por versión con esquema exacto, records con espacio y escritor v2 | 39 casos de `XlsxSpacesRoundTripTest` en rojo sobre `0dcf38c` y 238/238 verdes |
| `PortabilityImportApiIT` usaba versión 2 como ejemplo de versión desconocida | Ahora usa versión 3; un libro con meta v2 y hojas v1 es mezcla de esquemas y lo cubren las pruebas de códec | Failsafe 31/31 |
| El caso de 10 MiB comprimidos no corresponde al lector (lo valida el transporte) | La prueba v2 cubre solo el tope de 64 MiB inflados que posee el códec | `versionTwoBookKeepsTheInflatedByteLimit` |

### Entrega para revisión

[PR64](https://github.com/MatiasNicolasAcevedo/devnotes/pull/64) contra `main`. Fuentes probadas en `423c63d` sobre la base publicada `0dcf38c6873d64be35d1312e37b5cf1fdf004248`. `node scripts/docs-check.mjs` y `git diff --check` → exit 0. `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` → exit 0, `policy=FULL`, `profile=STARTER` (incluye `.gitattributes`), 17 rutas técnicas. Este traspaso solo cambia Markdown. Próximo paso: revisión independiente del HEAD y la base publicados, con `verify-required` para el HEAD vigente.

 Cierre y siguiente tarea

No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-062 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.
