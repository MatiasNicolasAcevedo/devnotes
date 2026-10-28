---
id: T-024
status: in_review
priority: P1
size: M
milestone: M1
spec: S-106
depends_on: [T-023]
branch: codex/t-024-reference-document
role: implementer
executor: junie
pr: null
---
# T-024 · Contrato persistente de vinculación

## Objetivo

Contrato persistente de vinculación para S-106. Draft solo por dependencia T-023; Junie puede habilitarla al comprobar MERGED. Tras comprobar MERGED, continuar con T-025 predefinida.

## Alcance

Validar el átomo de ID y límites de S-106 en `DailyContent` sin resolver referencias ni migración/FK. Conservar documentos anteriores, escritura y versión manual. No cambiar permisos ni revelar información por IDs.

## Leer antes

[S-106](../specs/S-106-reference-links.md), [S-101](../specs/S-101-daily-notes.md), [S-104](../specs/S-104-daily-versions.md), [server/AGENTS](../../server/AGENTS.md) y [TESTING](../TESTING.md). AGENTS raíz, STATUS y protocolo implementer son entrada de sesión.

## Archivos y pasos

Modificar `DailyContent.java`, `DailyContentTest`, `DailyNoteApiIT` y `DailyVersionApiIT`. Probar estructura estricta y UUID, 100 y 101 átomos, 4000 y 4001 nodos, campos/marcas ajenos, roundtrip, versiones, y denegación de nota/versión de A a B; ID ajeno o inexistente no accede a datos. Sin consultar referencia al validar.

## Aceptación y pruebas

Desde `server` con JDK 21 y Docker: `./mvnw clean verify`; incluye PostgreSQL/Failsafe. No sustituir por `test`.

Gate desde raíz Git Bash: `COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t024 STARTER_E2E_PROJECT=starter-e2e-t024 STARTER_SERVER_TESTS=container bash scripts/verify.sh`. Antes comprobar nombres libres, registrar SHA/base, huellas antes/después, log saneado y cleanup solo propio; preservar stack persistente. docs-check y policy según TESTING; mantener suites y cobertura.

## Checkpoint vigente

Validación de átomo reference implementada en DailyContent.java: estructura estricta `{"type":"reference","attrs":{"id":"UUID"}}`, UUID canónico minúsculo, máximo 100 por documento, cuenta para los 4000 nodos. Tests unitarios 83/83 OK (20 nuevos), verify completo 161/161 OK con PostgreSQL/Failsafe. Pendiente: publicar código, abrir PR y revisión independiente.

### Correcciones significativas

| Problema | Causa | Arreglo | Prueba |
|---|---|---|---|
| UUID con formato `%08d` no válido | Solo 8 dígitos en último grupo (necesita 12) | Cambiado a `%012d` en tests | acceptsExactly100References OK |

## Cierre y siguiente tarea

Un PR, revisión independiente y merge según AUTONOMY. Tras comprobar MERGED, continuar con T-025 predefinida. No iniciar voz.
