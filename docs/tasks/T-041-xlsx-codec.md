---
id: T-041
status: draft
priority: P1
size: M
executor: junie
role: implementer
milestone: M3
product_cycle: I3
spec: S-107
spec_version: 1
branch: codex/s-107-xlsx-portability
pr: null
depends_on: [T-040]
---
# T-041 · Codec del libro `devnotes-xlsx` v1

## Objetivo

Un codec de backend que escribe y lee el formato de [S-107](../specs/S-107-xlsx-portability.md#formato-devnotes-xlsx-versión-1) con todos sus límites, sin HTTP ni base de datos. Es la base de T-042 (exportación) y T-043 (importación).

Está en `draft` solo porque depende de T-040 cerrada en la rama compartida de [S-107](../specs/S-107-xlsx-portability.md#tareas-y-dependencias). La siguiente tarea es [T-042](T-042-xlsx-export-api.md).

## Alcance y decisiones resueltas

- **Paquete.** `com.example.devnotes.portability.xlsx`. Modelo inmutable `PortabilityRecords`: listas de `ReferenceRecord`, `DailyNoteRecord`, `DailyVersionRecord` y `VoiceNoteRecord`, con los campos exactos de `dato_json`.
- **Escritura.** `XlsxWorkbookWriter.write(Iterable…/streams, OutputStream)` en streaming con `org.dhatim:fastexcel`. Las celdas de texto nunca son fórmulas. `dato_json` se fragmenta a 30 000 unidades UTF-16 sin partir pares sustitutos, y las columnas legibles se sanean y truncan según S-107.
- **Lectura.** `XlsxWorkbookReader.read(byte[])` hace primero la inspección ZIP: 64 entradas como máximo, 64 MiB descomprimidos contados en bytes reales, nombres seguros y rechazo de `vbaProject.bin`, `externalLinks/` y `embeddings/`. Después lee con `org.dhatim:fastexcel-reader` y valida libro, hojas, cabeceras, fragmentos y JSON estricto con Jackson (sin campos desconocidos ni `null`).
- **Validación de dominio.** El reader valida el JSON completo con los validadores existentes: el de contenido de daily (`DailyContent`), las reglas de texto de voz y las de título y descripción de referencias. Si alguna regla está privada en su feature, se expone un validador de dominio sin duplicar la lógica. El reader **no** consulta la base.
- **Errores.** Una excepción tipada con el código de S-107 (`IMPORT_INVALID_FILE`, `IMPORT_UNSUPPORTED_FORMAT`, `IMPORT_INVALID_RECORD`), con la hoja y la fila, y sin el contenido de la celda.
- **Dependencias.** Agregar ambas coordenadas con la última versión estable verificada en Maven Central y registrarlas en [DEPENDENCIES](../DEPENDENCIES.md) junto con las transitivas relevantes. Comprobar que el parser StAX no resuelve entidades externas (XXE) con una prueba que use un `DOCTYPE` con una entidad externa. Si la licencia, el mantenimiento o el XXE no se pueden garantizar, hacer checkpoint a frontera.

## Leer antes

1. [S-107 · Formato y validación](../specs/S-107-xlsx-portability.md#formato-devnotes-xlsx-versión-1).
2. [server/AGENTS](../../server/AGENTS.md).
3. `server/src/main/java/com/example/devnotes/daily/domain/DailyContent.java`.
4. Validación de texto de voz en `server/src/main/java/com/example/devnotes/voice/` y de referencias en `server/src/main/java/com/example/devnotes/reference/application/`.
5. [TESTING · Elegir pruebas](../TESTING.md#elegir-pruebas-para-una-tarea-pequeña).

## Archivos y pasos

Código nuevo en `server/src/main/java/com/example/devnotes/portability/xlsx/` y pruebas en `server/src/test/java/com/example/devnotes/portability/xlsx/`. También `server/pom.xml` y `docs/DEPENDENCIES.md`.

1. Agregar las dependencias y comprobar la licencia y el XXE.
2. Modelo y writer, con una prueba de ida y vuelta writer → reader.
3. Reader con la inspección ZIP y la validación, más una prueba negativa por cada regla, cada límite y cada límite +1.

## Aceptación y pruebas

XL-02. Casos mínimos:

- **Ida y vuelta.** Registros vacíos; registros de más de 30 000 unidades, con un par sustituto justo en el borde del fragmento; caracteres U+0001 y U+FFFE; un texto que empieza con `=`; y una nota de voz de 50 000 unidades.
- **Negativos.** Formato o versión distintos; hoja faltante, extra o desordenada; cabecera alterada; fragmento faltante, repetido o desordenado; `partes` inconsistente; clave duplicada; celda de fórmula; JSON con un campo extra o con `null`; versión sin nota; fechas e instantes inválidos o `updatedAt < createdAt`; 10 001 registros; ZIP con 65 entradas; ZIP bomba que supera 64 MiB reales; `vbaProject.bin`; nombre de entrada con `..`; y entidad externa XXE.

| Criterio | Capa | Comando (desde `server/`) | Resultado |
|---|---|---|---|
| XL-02 | Unitario | `./mvnw -q test -Dtest='Xlsx*Test'` | Verde, con al menos una prueba por cada regla anterior |
| Gate | Según `bash scripts/verify.sh --policy origin/main` (cambia el POM; APPLICATION o STARTER según el clasificador) | Desde la raíz: `COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t041 STARTER_E2E_PROJECT=starter-e2e-t041 STARTER_SERVER_TESTS=container bash scripts/verify.sh` (añadir `--tooling` si el perfil es STARTER) | Exit 0; cobertura JaCoCo sin bajar |

## Checkpoint vigente

2026-11-10. Implementer en Claude Code de escritorio (Claude Fable 5.2, esfuerzo no expuesto), sesión distinta de la de T-040, con Git Bash, JDK 21, Maven Wrapper, Docker, Git y `gh`. Agrega el paquete `com.example.devnotes.portability.xlsx` y tres dependencias de backend. Sin cambios de API, permisos, esquema, datos ni UI: nada invoca todavía al codec.

**T-041 cerrada en la rama** `codex/s-107-xlsx-portability`, con XL-02 verde. El frontmatter sigue en `draft` por la [regla de la rama compartida](../specs/S-107-xlsx-portability.md#tareas-y-dependencias); la portadora es [T-040](T-040-daily-timestamps.md) y el PR es el [PR49](https://github.com/MatiasNicolasAcevedo/devnotes/pull/49) (draft).

- Precondición: `gh pr view 49` devolvió `OPEN`, draft, `codex/s-107-xlsx-portability` → `main`, HEAD `dc40327`, que contiene `f10529f`; árbol local limpio.
- SHA del codec: `900913b`. Toca `server/pom.xml`, `docs/DEPENDENCIES.md`, nueve clases en `portability/xlsx` y cinco archivos de prueba.
- Dependencias: `org.dhatim:fastexcel` y `fastexcel-reader` 0.20.2, última versión en Maven Central (metadatos del 2026-06-08), Apache-2.0 según el POM padre. `fastexcel-reader` configura Aalto con `supportDTD=false` e `isSupportingExternalEntities=false`. Se declara además `org.apache.commons:commons-compress` 1.28.0, la misma versión que ya resolvía `fastexcel-reader`, porque la inspección ZIP la usa directamente. Transitivas y licencias en [DEPENDENCIES](../DEPENDENCIES.md#transitivas-relevantes-de-s-107).
- XL-02, desde `server/` en Git Bash: `./mvnw -q test -Dtest='Xlsx*Test'` exit 0, 187 pruebas sin fallos (`XlsxTextTest` 9, `XlsxWorkbookRoundTripTest` 12, `XlsxWorkbookReaderTest` 137, `XlsxZipInspectionTest` 29). `./mvnw -q spotless:check` exit 0.
- Fuera del comando del contrato, por riesgo de dependencias y beans nuevos: `./mvnw verify -Dit.test='DailyNoteApiIT' -Dfailsafe.failIfNoSpecifiedTests=false` corrió las 422 unitarias y `DailyNoteApiIT` 11/11 en verde, con el contexto Spring y PostgreSQL Testcontainers. El comando terminó con exit 1 en `jacoco:check` por el umbral de `daily.application` (0,68 líneas y 0,45 ramas), esperable al correr un solo IT; no acredita cobertura. Cobertura unitaria del paquete nuevo en ese informe: reader 273/278 líneas y 184/200 ramas, writer 110/112 y 16/16, inspección ZIP 59/63 y 53/64, texto 70/71 y 65/66.
- Cierre temporal: `node scripts/docs-check.mjs` OK, `git diff --check` exit 0 y `bash scripts/verify.sh --policy origin/main` con `policy=FULL` y **`profile=STARTER`** por el cambio de POM. El FULL integrado del HEAD final debe llevar `--tooling`.
- No ejecutado: `clean verify` completo, cliente, Playwright ni el gate FULL de la tabla. **FULL diferido** al HEAD final del PR único, según [TESTING](../TESTING.md#aplazamiento-de-full-hasta-t-044).
- Sin recursos propios por limpiar: el contenedor de Testcontainers terminó con la corrida. No se borraron ramas, worktrees ni archivos de `.orchestrator`.

Decisiones de implementación dentro del contrato, para T-042 y T-043:

- **API.** `XlsxWorkbookWriter` y `XlsxWorkbookReader` son `@Component`; el reader recibe el `jakarta.validation.Validator`. `write(PortabilityRecords, Instant, OutputStream)` y una sobrecarga con `Counts` e `Iterable` por colección, que lanza `IllegalStateException` si un conteo no coincide. El writer no ordena, no cierra el stream y trunca los instantes a microsegundos: el orden de S-107 lo aporta quien llama. `read(byte[])` devuelve `XlsxWorkbookContent(exportedAt, records)`; los límites de transporte quedan en el controlador.
- **Celdas.** El texto se escribe como cadena en línea, sin tabla de cadenas compartidas, para no acumular el libro en memoria. `version` y los conteos van como texto; el reader los acepta también como número entero.
- **Caracteres.** Jackson no escapa U+FFFE, U+FFFF ni sustitutos sueltos, que XML 1.0 no admite: el writer los pasa a `\uXXXX` dentro de `dato_json`.
- **Códigos.** Si la primera hoja no es `devnotes`, o faltan o difieren `formato` y `version`, el error es `IMPORT_UNSUPPORTED_FORMAT`. El resto de los problemas de hojas, filas de `devnotes`, cabeceras, fragmentos y registros es `IMPORT_INVALID_RECORD` con hoja y fila (la de la parte 1 para un registro). El nombre de hoja informado es siempre el esperado, nunca uno leído del archivo. La excepción no encadena causa.
- **Más estricto que el mínimo.** El reader rechaza además: `<!DOCTYPE` en cualquier entrada (UTF-8 o UTF-16), nombres de entrada que solo difieren en mayúsculas, NUL o sustitutos sueltos en cualquier cadena de un registro (PostgreSQL no los guarda), título, descripción o texto de voz que no estén ya normalizados, fragmentos de más de 30 000 unidades y celdas más allá de la cabecera. Las filas totalmente vacías se saltan.
- **`texto`.** Sigue `documentToPlainText` sin títulos: cada átomo aporta `[Referencia no disponible]`.
- **Inventario.** `scripts/dependency-inventory.py` falla por diseño cuando cambian las dependencias directas, así que las filas nuevas de DEPENDENCIES se agregaron a mano.

Siguiente: sesión nueva para [T-042](T-042-xlsx-export-api.md) en la misma rama.

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|

## Cierre y siguiente tarea

Sin PR propio: cerrar en la rama compartida con XL-02 verde, `docs-check` y commit publicado. La siguiente sesión toma [T-042](T-042-xlsx-export-api.md) en la misma rama.
