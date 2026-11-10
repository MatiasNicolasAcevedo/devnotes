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

`draft` por dependencia. Contrato completo (frontera, 2026-11-10).

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|

## Cierre y siguiente tarea

Sin PR propio: cerrar en la rama compartida con XL-02 verde, `docs-check` y commit publicado. La siguiente sesión toma [T-042](T-042-xlsx-export-api.md) en la misma rama.
