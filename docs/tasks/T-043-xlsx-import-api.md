---
id: T-043
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

`draft` por dependencia. Contrato completo (frontera, 2026-11-10).

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|

## Cierre y siguiente tarea

Sin PR propio: cerrar en la rama compartida con XL-04 verde, `docs-check` y commit publicado. La siguiente sesión toma [T-044](T-044-xlsx-client.md) en la misma rama.
