---
id: T-043
status: done
priority: P1
size: M
executor: junie
role: implementer
milestone: M3
product_cycle: I3
spec: S-107
spec_version: 1
branch: codex/s-107-xlsx-portability
pr: 49
depends_on: [T-042]
---
# T-043 · Vista previa e importación atómica en una cuenta vacía

## Objetivo

`POST /api/v1/portability/import-preview` valida y resume el archivo sin escribir, y `POST /api/v1/portability/imports` recrea todos los datos en la cuenta vacía de la sesión, según [S-107](../specs/S-107-xlsx-portability.md#contrato-backend). Incluye las rutas en los proxies nginx y Vite.

Está en `draft` solo porque depende de T-042 cerrada en la rama compartida de [S-107](../specs/S-107-xlsx-portability.md#tareas-y-dependencias). La siguiente tarea es [T-044](T-044-xlsx-client.md).

## Alcance y decisiones resueltas

- **Servicio.** `PortabilityImportService`. `preview(owner, bytes)` lee con el reader de T-041, devuelve conteos y `accountEmpty`, y no escribe nada. `importInto(owner, bytes)` revalida, abre una transacción, ejecuta `SELECT … FROM app_user WHERE id = :owner FOR UPDATE`, comprueba que la cuenta esté vacía (`daily_note`, `voice_note`, `reference_item`) e inserta:
  - referencias, con UUIDv7 nuevo y un mapa del ID original al nuevo;
  - notas diarias, reescribiendo los átomos `reference` con IDs presentes en el mapa (los demás se conservan);
  - versiones con su nota por fecha y `source_revision = 1`;
  - notas de voz.

  Todas con `revision = 1` y los instantes del archivo. Si hay datos, 409 sin escrituras. Un `DataIntegrityViolation` por una escritura concurrente revierte todo y responde 409.
- **Escrituras.** Insertar con métodos de escritura nuevos y acotados en cada feature, o con `JdbcTemplate`/repositorios propios de `portability`, sin pasar por el CAS de edición. No hay upsert.
- **Controller.** Multipart con exactamente una parte `file` (partes duplicadas o desconocidas, 400) y de 1 a 10 485 760 bytes (si supera, 413 `IMPORT_TOO_LARGE`). Errores ProblemDetail con `code`, `sheet` y `row`, sin eco del contenido y con `no-store`. Respuestas: 200 en `preview` y 201 en `imports`, con los cuerpos de S-107.
- **Seguridad.** Allowlist exacta para los dos POST, autenticados y con CSRF. Sin sesión, 401; sin token CSRF, 403.
- **Proxies.** En `client/nginx.conf`, `location =` exactas para ambas rutas, antes del `location` genérico, con `client_max_body_size 11m` y los mismos encabezados reenviados que el `location` de transcripción, con buffering normal. Agregar la entrada equivalente en `client/vite.config.ts` y extender `scripts/test-voice-proxies.mjs`, o crear `scripts/test-portability-proxies.mjs` con el mismo patrón, para demostrar que un archivo de 10 MiB atraviesa ambos proxies. Si el clasificador marca STARTER, el gate incluye `--tooling`.

## Leer antes

1. [S-107](../specs/S-107-xlsx-portability.md).
2. [server/AGENTS](../../server/AGENTS.md) y [client/AGENTS](../../client/AGENTS.md) (proxy).
3. `server/src/main/java/com/example/devnotes/voice/web/VoiceTranscriptionController.java` y su manejador de excepciones (multipart y límites).
4. `client/nginx.conf`, `location = /api/v1/voice/transcriptions`.
5. [TESTING · Frecuencia y alcance del gate](../TESTING.md#frecuencia-y-alcance-del-gate).

## Archivos y pasos

Código en `server/src/main/java/com/example/devnotes/portability/{application,web}/` y en `SecurityConfig`. Pruebas en `server/src/test/java/com/example/devnotes/portability/PortabilityImportApiIT.java` y `PortabilityImportServiceIT.java`. Proxies en `client/nginx.conf`, `client/vite.config.ts` y el script de prueba de proxies.

1. Servicio y validación previa, con pruebas IT en rojo antes de implementar las reglas de cuenta no vacía y de concurrencia.
2. Controller, seguridad y errores.
3. Proxies y su prueba.

## Aceptación y pruebas

XL-04. Casos mínimos de IT con PostgreSQL:

- **Preview.** No escribe; los conteos y `accountEmpty` son correctos.
- **Ida y vuelta.** Export de A, import en B vacía y export de B: registros iguales salvo los IDs. Los átomos de B apuntan a las referencias nuevas de B; un átomo huérfano del archivo se conserva. Una versión y su nota comparten fecha. Las revisiones quedan en 1.
- **Rechazos.** B con una sola referencia, 409 sin escrituras. Un archivo inválido (uno por familia de error) da 400 con el código y la fila, y deja cero escrituras.
- **Concurrencia.** Dos importaciones simultáneas en la misma cuenta vacía, con dos transacciones reales: una 201 y otra 409, sin duplicados.
- **Transporte y seguridad.** 401 sin sesión, 403 sin CSRF, 413 a partir de 10 485 761 bytes y 400 con dos partes `file`.

| Criterio | Capa | Comando | Resultado |
|---|---|---|---|
| XL-04 | IT PostgreSQL/HTTP | Desde `server/`: `./mvnw -q verify -Dit.test='PortabilityImport*IT' -Dtest=none -Dsurefire.failIfNoSpecifiedTests=false` | Verde |
| Proxies | Tooling | Desde la raíz: `node scripts/<script de proxies elegido>` | Un archivo de 10 MiB llega a Spring por nginx y Vite; uno de 11 MiB o más se rechaza en el proxy |
| Gate | El que devuelva `bash scripts/verify.sh --policy origin/main` | Desde la raíz: `COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t043 STARTER_E2E_PROJECT=starter-e2e-t043 STARTER_SERVER_TESTS=container bash scripts/verify.sh` (con `--tooling` si es STARTER) | Exit 0 |

## Checkpoint vigente

**Conciliada como `done` (2026-11-11).** [PR49](https://github.com/MatiasNicolasAcevedo/devnotes/pull/49), único de S-107, MERGED: squash `ff02bbd933418cec46f34b25715313580753d0ee`, `mergedAt` 2026-11-11T04:02:14Z, HEAD revisado `706c494f6582c698226e4d4d79ae8b2594d7a91e`, confirmado con `gh pr view 49`. Lo que sigue es el historial de la rama compartida, anterior al merge.

2026-11-10. Implementer en Claude Code de escritorio (Claude Fable 5.2, esfuerzo no expuesto), sesión distinta de las de T-040, T-041 y T-042, con Git Bash, JDK 21, Maven Wrapper, Docker, Node 24, Git y `gh`. Impacto: dos rutas de API nuevas, POST `/api/v1/portability/import-preview` y POST `/api/v1/portability/imports`, con su regla en la allowlist de `SecurityConfig` (sesión y CSRF); la segunda escribe en `reference_item`, `daily_note`, `daily_version` y `voice_note` de la cuenta de la sesión. Dos `location` nuevas en nginx y una entrada en el proxy de Vite. Sin cambios de esquema, dependencias ni UI.

**T-043 cerrada en la rama** `codex/s-107-xlsx-portability`, con XL-04 verde. El frontmatter sigue en `draft` por la [regla de la rama compartida](../specs/S-107-xlsx-portability.md#tareas-y-dependencias); la portadora es [T-040](T-040-daily-timestamps.md) y el PR es el [PR49](https://github.com/MatiasNicolasAcevedo/devnotes/pull/49) (draft).

- Precondición: `gh pr view 49` devolvió `OPEN`, draft, `codex/s-107-xlsx-portability` → `main`, HEAD `7c2764f`, que contiene `345514c`; árbol local limpio y T-042 registrada como cerrada con XL-03 verde.
- SHA de la importación: `2095b1e`. Agrega `PortabilityImportService`, `ImportAccountNotEmptyException`, `PortabilityWriteRepository`, `PortabilityImportExceptionHandler` y `PortabilityImportRequestException`; amplía `PortabilityController` y `SecurityConfig`; toca `client/nginx.conf` y `client/vite.config.ts`; crea `scripts/test-portability-proxies.mjs`, `PortabilityImportApiIT` y `PortabilityImportServiceIT`, un caso en `SecurityConfigTest` y `upload` en el helper `OidcHttpBrowser`. `XlsxTestBooks` pasa a ser público para armar libros inválidos desde los IT.
- Rojo previo: con la comprobación de bloqueo y cuenta vacía desactivada, `PortabilityImportServiceIT` falló en 4 de 12 (cuenta con un registro, reimportación, dos importaciones simultáneas de referencias y espera de la escritura concurrente). Con la regla, 12/12.
- XL-04, desde `server/` en Git Bash: `./mvnw -q verify -Dit.test='PortabilityImport*IT' -Dtest=none -Dsurefire.failIfNoSpecifiedTests=false` **exit 0**, con `PortabilityImportApiIT` 7/7 y `PortabilityImportServiceIT` 12/12 sobre PostgreSQL Testcontainers y OIDC real. Se corrió sin `clean` después del backend completo, así que `jacoco:check` evaluó la cobertura acumulada; en un árbol limpio ese comando puede terminar en exit 1 por umbrales, como en T-041 y T-042.
- Backend completo, porque cambian `SecurityConfig` y un helper compartido: `./mvnw clean verify` desde `server/`, **exit 0**, 425 unitarias y de slice y 234 de integración sin fallos, con Spotless y `jacoco:check` en verde. Acredita el backend, no el gate FULL.
- Proxies, desde la raíz: `STARTER_PORTABILITY_PROXY_PORT=5185 node scripts/test-portability-proxies.mjs` **exit 0**. Un archivo de 10 MiB llega al upstream por nginx y por Vite en las dos rutas, con cookie, `X-XSRF-TOKEN` y `Content-Type` intactos y los `Forwarded`/`X-Forwarded-*` reconstruidos; nginx responde 413 con 11 y 12 MiB; las rutas vecinas conservan el límite genérico de 1 MB. El upstream del ensayo es el eco de `compose.proxy-test.yml`, no Spring: el tramo Spring lo cubre el IT con 10 485 760 y 10 485 761 bytes. Se usó el puerto 5185 porque el 5175 por defecto estaba ocupado por un stack ajeno (`starter-dev-devnotes-preview-1027`), que no se tocó.
- Cliente: `npm run typecheck` exit 0, y ESLint y Prettier sobre `vite.config.ts` sin hallazgos. No se corrieron las pruebas ni el build del cliente.
- Cierre temporal: `node scripts/docs-check.mjs` OK, `git diff --check` exit 0 y `bash scripts/verify.sh --policy origin/main` con `policy=FULL` y `profile=STARTER`.
- No ejecutado: Playwright, `npm run verify` del cliente ni el gate FULL de la tabla. **FULL diferido** al HEAD final del PR único, con `--tooling`, según [TESTING](../TESTING.md#aplazamiento-de-full-hasta-t-044).
- Sin recursos propios por limpiar: el ensayo de proxies bajó su proyecto Compose y comprobó labels en cero; los contenedores de Testcontainers terminaron con cada corrida. No se borraron ramas, worktrees ni archivos de `.orchestrator`.

Casos de los IT:

- **Preview.** 200 con el cuerpo exacto de S-107 y `no-store`; `accountEmpty` verdadero en la cuenta vacía y falso con una referencia, una nota diaria o una nota de voz; los conteos de las cinco tablas no cambian.
- **Ida y vuelta.** A exporta, B vacía importa (201) y exporta: referencias, notas diarias, versión y voz iguales salvo los IDs, que son UUIDv7 nuevos. Los átomos de B apuntan a las referencias de B, el átomo huérfano conserva su ID y el separador se conserva. La versión cuelga de la nota de su fecha, y `revision` y `source_revision` quedan en 1. B abre la nota y la referencia por la API normal, A no ve la referencia de B y la exportación de A no cambia. Otra cuenta con la misma fecha no se toca.
- **Rechazos.** Reimportar en B, o importar en una cuenta con una sola referencia, nota diaria o nota de voz, da 409 `IMPORT_ACCOUNT_NOT_EMPTY` sin escrituras. Por familia, en las dos rutas: no ZIP y `vbaProject.bin` (`IMPORT_INVALID_FILE`), versión 2 (`IMPORT_UNSUPPORTED_FORMAT`), cabecera, fragmento, registro y versión sin nota (`IMPORT_INVALID_RECORD` con `sheet` y `row`). El cuerpo nunca repite el contenido de la celda.
- **Concurrencia.** Dos importaciones simultáneas de la misma cuenta, por HTTP y por servicio: una 201 y otra 409, sin duplicados. El caso de solo referencias se repite cinco veces porque ninguna clave única las protege: depende solo del bloqueo.
- **Transporte y seguridad.** 401 sin sesión aun con token CSRF, 403 sin CSRF, 413 `IMPORT_TOO_LARGE` con 10 485 761 bytes y 400 con 10 485 760 bytes que no son un ZIP. 400 con dos partes `file`, con una parte extra, con otro nombre de parte, sin partes y con archivo vacío; 415 si no es multipart. GET, PUT, DELETE, PATCH y rutas vecinas, 403. Un `?ownerId=` ajeno no cambia el dueño.

Decisiones de implementación dentro del contrato, para T-044 y T-045:

- **Errores.** ProblemDetail con `code`, y `sheet` y `row` solo cuando el codec los informa. `detail` es un texto fijo en español por código. Las partes inválidas (cantidad, nombre o archivo vacío) responden 400 `IMPORT_INVALID_FILE`.
- **413 sin `code`.** Un cuerpo de más de 21 MB lo rechaza el multipart de Spring antes de llegar al controlador, y uno de más de 11 MB lo rechaza nginx con su página propia. En ambos casos el 413 no trae `code`: el cliente debe tratar cualquier 413 como archivo demasiado grande.
- **Bloqueo.** `SELECT … FOR UPDATE` sobre `app_user` también frena las inserciones del mismo usuario en las tres tablas mientras dura la importación, porque su clave foránea necesita un bloqueo compartido de esa fila. Una escritura concurrente espera y después sigue su curso normal; el IT lo comprueba. El paso de `DataIntegrityViolation` a 409 queda como defensa y se prueba con una colisión simulada en el último lote.
- **Escrituras.** `PortabilityWriteRepository` usa `JdbcTemplate` con inserciones por lote, sin tocar los repositorios de otras features. Los UUIDv7 salen de `UuidVersion7Strategy` de Hibernate, la misma estrategia que usan las entidades.
- **Validación fuera de la transacción.** El archivo se lee y valida completo antes de abrir la transacción, para no retener una conexión durante el parseo.
- **Vite.** El proxy de desarrollo no limita el cuerpo; la entrada nueva solo mantiene alineadas las rutas con nginx. El límite de 10 MiB lo aplica el servidor.
- **Script de proxies.** `scripts/test-portability-proxies.mjs` sigue el patrón de `test-voice-proxies.mjs` y, como ese, no está en `verify-tooling.sh`: se corre a mano. Acepta `STARTER_PORTABILITY_PROXY_PORT` para el par de puertos (nginx y el siguiente para Vite).

Siguiente: sesión nueva para [T-044](T-044-xlsx-client.md) en la misma rama.

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|

## Cierre y siguiente tarea

Sin PR propio: cerrar en la rama compartida con XL-04 verde, `docs-check` y commit publicado. La siguiente sesión toma [T-044](T-044-xlsx-client.md) en la misma rama.
