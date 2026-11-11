---
id: T-042
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
depends_on: [T-041]
---
# T-042 · Exportación privada en `.xlsx`

## Objetivo

`GET /api/v1/portability/export` descarga los datos de la cuenta de la sesión en el formato de T-041, según [S-107 · Contrato backend](../specs/S-107-xlsx-portability.md#contrato-backend).

Está en `draft` solo porque depende de T-041 cerrada en la rama compartida de [S-107](../specs/S-107-xlsx-portability.md#tareas-y-dependencias). La siguiente tarea es [T-043](T-043-xlsx-import-api.md).

## Alcance y decisiones resueltas

- **Paquetes.** `com.example.devnotes.portability.application.PortabilityExportService` y `portability.web.PortabilityController`.
- **Lectura.** Transacción `readOnly` con aislamiento `REPEATABLE_READ`, filtrando siempre por el dueño de la sesión. Las consultas son nuevas, de solo lectura y ordenadas según S-107, en los repositorios de cada feature o en un repositorio de lectura propio de `portability`.
- **Respuesta.** Escribe en streaming a la respuesta con los encabezados exactos de S-107 y el nombre `devnotes-YYYY-MM-DD.xlsx` con la fecha UTC del `Clock` inyectado. `exportado_utc` y los instantes van truncados a microsegundos.
- **Seguridad.** En `SecurityConfig`, una allowlist exacta para GET `/api/v1/portability/export`, autenticado, antes del `denyAll`. Sin sesión, 401. No se registra contenido en logs.

## Leer antes

1. [S-107](../specs/S-107-xlsx-portability.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. `server/src/main/java/com/example/devnotes/security/SecurityConfig.java` (bloque de voz como modelo).
4. `server/src/test/java/com/example/devnotes/voice/VoiceNoteApiIT.java` (OIDC real, dos actores).

## Archivos y pasos

Código en `server/src/main/java/com/example/devnotes/portability/{application,web}/` y en `security/SecurityConfig.java`, más consultas nuevas si hacen falta. La prueba es `server/src/test/java/com/example/devnotes/portability/PortabilityExportApiIT.java`.

1. Servicio de lectura consistente que alimenta el writer.
2. Controller, encabezados y seguridad.
3. Un IT con PostgreSQL y dos actores: A con referencias, notas diarias con un átomo, una versión y notas de voz; B con datos propios. Se parsea la respuesta con el reader de T-041.

## Aceptación y pruebas

XL-03:

- El libro de A contiene exactamente los registros de A, en el orden y con los valores esperados, y ningún dato de B.
- Una cuenta vacía produce un libro válido con conteos en cero.
- Encabezados `Content-Type`, `Content-Disposition`, `no-store` y `nosniff` exactos.
- Sin sesión, 401.
- Otros métodos en la ruta no quedan habilitados: comprobar POST, que devuelve 403 o 405 según la cadena de seguridad vigente, sin escribir nada.

| Criterio | Capa | Comando (desde `server/`) | Resultado |
|---|---|---|---|
| XL-03 | IT PostgreSQL/HTTP | `./mvnw -q verify -Dit.test=PortabilityExportApiIT -Dtest=none -Dsurefire.failIfNoSpecifiedTests=false` | Verde |
| Gate | APPLICATION (confirmar con `--policy`) | Desde la raíz: `COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t042 STARTER_E2E_PROJECT=starter-e2e-t042 STARTER_SERVER_TESTS=container bash scripts/verify.sh` | Exit 0 |

## Checkpoint vigente

2026-11-10. Implementer en Claude Code de escritorio (Claude Fable 5.2, esfuerzo no expuesto), sesión distinta de las de T-040 y T-041, con Git Bash, JDK 21, Maven Wrapper, Docker, Git y `gh`. Impacto: una ruta de API nueva, GET `/api/v1/portability/export`, y su regla en la allowlist de `SecurityConfig`, solo para sesión autenticada. Sin cambios de esquema, datos, dependencias ni UI.

**T-042 cerrada en la rama** `codex/s-107-xlsx-portability`, con XL-03 verde. El frontmatter sigue en `draft` por la [regla de la rama compartida](../specs/S-107-xlsx-portability.md#tareas-y-dependencias); la portadora es [T-040](T-040-daily-timestamps.md) y el PR es el [PR49](https://github.com/MatiasNicolasAcevedo/devnotes/pull/49) (draft).

- Precondición: `gh pr view 49` devolvió `OPEN`, draft, `codex/s-107-xlsx-portability` → `main`, HEAD `be7d288`, que contiene `900913b`; árbol local limpio y T-041 registrada como cerrada con XL-02 verde.
- SHA de la exportación: `345514c`. Agrega `PortabilityExportService`, `PortabilityReadRepository` y `PortabilityController`, una línea en `SecurityConfig`, `PortabilityExportApiIT`, `PortabilityExportServiceTest`, un caso en `SecurityConfigTest` y `download` en el helper de pruebas `OidcHttpBrowser`.
- XL-03, desde `server/` en Git Bash: `./mvnw -q verify -Dit.test=PortabilityExportApiIT -Dtest=none -Dsurefire.failIfNoSpecifiedTests=false` corrió `PortabilityExportApiIT` 5/5 en verde con PostgreSQL Testcontainers y OIDC real. El comando termina con exit 1 en `jacoco:check`: con `-Dtest=none` y un solo IT la cobertura agregada no alcanza los umbrales, igual que en el dirigido de T-041. No es una falla de pruebas.
- Por eso, y porque cambian `SecurityConfig` y un helper compartido, se corrió además el backend completo: `./mvnw clean verify` desde `server/`, **exit 0**, 424 unitarias y de slice y 215 de integración sin fallos, con Spotless y `jacoco:check` en verde. Acredita la cobertura del backend, no el gate FULL.
- Cierre temporal: `node scripts/docs-check.mjs` OK, `git diff --check` exit 0 y `bash scripts/verify.sh --policy origin/main` con `policy=FULL` y `profile=STARTER` (por el POM de T-041).
- No ejecutado: cliente, Playwright ni el gate FULL de la tabla. **FULL diferido** al HEAD final del PR único, con `--tooling`, según [TESTING](../TESTING.md#aplazamiento-de-full-hasta-t-044).
- Sin recursos propios por limpiar: los contenedores de Testcontainers terminaron con cada corrida. No se borraron ramas, worktrees ni archivos de `.orchestrator`.

Casos de `PortabilityExportApiIT`:

- Dos actores con datos de los cuatro tipos. El libro de A, leído con el reader de T-041, tiene exactamente sus registros y valores: referencias y voz por `created_at` e `id` (con filas empatadas en el instante e insertadas en orden inverso de ID), y diarias y versiones por fecha (creadas en orden inverso), con la versión guardada distinta de la nota editada. Ningún ID ni texto de B, ningún `owner_id`, `issuer` ni email aparece en ninguna entrada del ZIP. Dos exportaciones del mismo estado dan los mismos registros, y B recibe solo los suyos.
- Cuenta vacía: libro válido con conteos en cero y encabezados exactos de `Content-Type`, `Content-Disposition`, `Cache-Control: no-store` y `X-Content-Type-Options: nosniff`, un valor de cada uno.
- Sin sesión: 401 `application/problem+json`, sin `Content-Disposition` ni bytes de ZIP.
- POST con y sin CSRF, PUT, DELETE, PATCH, HEAD y OPTIONS: 403. Rutas vecinas: 403. Un `?ownerId=` ajeno no cambia el dueño. Los conteos de las cinco tablas no cambian.
- Snapshot: una nota de voz confirmada por otra conexión mientras el libro se escribe no entra en el archivo, y sí en la exportación siguiente.

Decisiones de implementación dentro del contrato, para T-043:

- **Lectura.** Repositorio propio `portability.persistence.PortabilityReadRepository`, con `JdbcTemplate` sobre el `DataSource` y `fetchSize` 100: participa de la transacción JPA y lee por cursor. No toca los repositorios de las otras features. T-043 puede sumar ahí la comprobación de cuenta vacía.
- **Servicio.** `prepare()` devuelve el instante del `Clock` truncado a microsegundos y el nombre del archivo; `write(owner, exportedAt, out)` es el límite transaccional (`readOnly`, `REPEATABLE_READ`). Cada hoja se consulta cuando el writer llega a ella, así que hay un solo cursor abierto por vez; los conteos se leen primero, en el mismo snapshot.
- **Controller.** Escribe directo en el `OutputStream` de la respuesta, sin `StreamingResponseBody`, para que la transacción y la escritura queden en el mismo hilo. Si falla antes del primer byte, descarta los encabezados de descarga y responde ProblemDetail. Si falla después, la respuesta queda truncada: no hay forma de cambiar el estado HTTP ya enviado.
- **OpenAPI.** La operación queda documentada con sus anotaciones, detrás del interruptor actual. No se agregó un caso a `OpenApiContractIT`.
- **ZIP en pruebas.** El libro en streaming usa descriptores de datos, que `java.util.zip.ZipInputStream` no lee. Para inspeccionar el archivo en una prueba, usar el reader de T-041 o el `ZipFile` de commons-compress.

Siguiente: sesión nueva para [T-043](T-043-xlsx-import-api.md) en la misma rama.

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|

## Cierre y siguiente tarea

Sin PR propio: cerrar en la rama compartida con XL-03 verde, `docs-check` y commit publicado. La siguiente sesión toma [T-043](T-043-xlsx-import-api.md) en la misma rama.
