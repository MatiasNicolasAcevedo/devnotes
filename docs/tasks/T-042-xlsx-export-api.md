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
branch: codex/t-042-xlsx-export-api
pr: null
depends_on: [T-041]
---
# T-042 · Exportación privada en `.xlsx`

## Objetivo

`GET /api/v1/portability/export` descarga los datos de la cuenta de la sesión en el formato de T-041, según [S-107 · Contrato backend](../specs/S-107-xlsx-portability.md#contrato-backend).

Está en `draft` solo porque depende de T-041. La siguiente tarea es [T-043](T-043-xlsx-import-api.md).

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

`draft` por dependencia. Contrato completo (frontera, 2026-11-10).

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|

## Cierre y siguiente tarea

PR único y revisión independiente. Tras MERGED, conciliar y tomar [T-043](T-043-xlsx-import-api.md).
