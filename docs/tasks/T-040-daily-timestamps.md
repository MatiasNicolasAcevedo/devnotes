---
id: T-040
status: in_progress
priority: P1
size: S
executor: junie
role: implementer
milestone: M3
product_cycle: I3
spec: S-107
spec_version: 1
branch: codex/s-107-xlsx-portability
pr: 49
depends_on: [T-049]
---
# T-040 · Marcas de tiempo de daily y versiones truncadas a microsegundos

## Objetivo

`createdAt`/`updatedAt` de las notas diarias y `savedAt` de las versiones registran el instante real truncado a microsegundos (S-101), sin adelantarse hasta casi un segundo. Es un requisito previo de S-107: la exportación conserva estos instantes. Es un bugfix registrado en BACKLOG (hallazgo de T-037).

Se habilitó con el PR de [T-049](T-049-voice-retest.md) MERGED. Abre la rama compartida y el PR único de [S-107](../specs/S-107-xlsx-portability.md#tareas-y-dependencias), y es su tarea portadora. La siguiente tarea es [T-041](T-041-xlsx-codec.md).

## Alcance y decisiones resueltas

- **Causa.** `nowMicros()` en `DailyNoteService` y `DailyVersionService` hace `Instant.ofEpochMilli(clock.millis()).plusNanos(clock.instant().getNano() / 1_000_000 * 1_000_000)`: suma dos veces la fracción de milisegundos y además trunca a milisegundos.
- **Arreglo.** Una sola lectura: `clock.instant().truncatedTo(ChronoUnit.MICROS)`, el mismo patrón que corrigió T-037 en `VoiceNoteService`.
- No hay migración ni corrección de datos existentes, ni cambios de API o UI.

## Leer antes

1. [server/AGENTS](../../server/AGENTS.md).
2. `server/src/main/java/com/example/devnotes/voice/application/VoiceNoteService.java` (`nowMicros`) y su `VoiceNoteServiceTest`.
3. [T-037 · Correcciones](T-037-voice-release.md#correcciones-significativas), tercera fila.

## Archivos y pasos

`DailyNoteService.java` y `DailyVersionService.java` en `server/src/main/java/com/example/devnotes/daily/application/`. Pruebas nuevas `DailyNoteServiceTest.java` y `DailyVersionServiceTest.java` en `server/src/test/java/com/example/devnotes/daily/application/`, con reloj fijo y repositorios simulados, como `VoiceNoteServiceTest`.

1. Escribir las pruebas con `Clock.fixed(Instant.parse("2026-11-10T20:00:20.973456789Z"), UTC)`: la creación o actualización de la nota debe dar `20.973456Z`, y lo mismo el guardado de la versión. Comprobar el **rojo** contra el código actual.
2. Corregir ambos métodos y obtener el verde.

## Aceptación y pruebas

| Criterio | Capa | Comando (desde `server/`) | Resultado |
|---|---|---|---|
| XL-01 nota diaria | Unitario | `./mvnw -q test -Dtest=DailyNoteServiceTest` | Rojo antes, verde después |
| XL-01 versión | Unitario | `./mvnw -q test -Dtest=DailyVersionServiceTest` | Rojo antes, verde después |
| Gate | APPLICATION | Desde la raíz con Git Bash: `COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t040 STARTER_E2E_PROJECT=starter-e2e-t040 STARTER_SERVER_TESTS=container bash scripts/verify.sh` | Exit 0; los IT de daily siguen verdes |

## Checkpoint vigente

2026-11-10. Implementer en Claude Code de escritorio (Claude Fable 5.2, esfuerzo no expuesto), con Git Bash, JDK 21.0.9, Maven Wrapper, Docker, Node, Git y `gh`. Cambia el comportamiento: `createdAt`/`updatedAt` de las notas diarias y `savedAt` de las versiones registran el instante real truncado a microsegundos en lugar de adelantarse. Sin cambios de API, permisos, esquema, datos existentes ni UI.

**T-040 cerrada en la rama** `codex/s-107-xlsx-portability`, con XL-01 verde. Como portadora conserva `in_progress` y el [PR49](https://github.com/MatiasNicolasAcevedo/devnotes/pull/49) (draft) hasta el cierre de T-045.

- Precondición: `gh pr view 48` devolvió `MERGED`, `mergedAt` 2026-11-10T21:31:31Z y `mergeCommit` `fc8fda5b20946e595c153144e99d9a3d3346ac5d`, punta de `origin/main` y base de la rama. T-049 conciliada en `1aa06b6` ([detalle](T-049-voice-retest.md#conciliación)).
- SHA del arreglo: `f10529f`. Toca `DailyNoteService`, `DailyVersionService` y las dos pruebas nuevas.
- Rojo antes del arreglo, desde `server/` en Git Bash: `./mvnw -q test -Dtest=DailyNoteServiceTest` exit 1, 2 pruebas y 2 fallos; `./mvnw -q test -Dtest=DailyVersionServiceTest` exit 1, 2 pruebas y 2 fallos. En los cuatro se esperaba `2026-11-10T20:00:20.973456Z` y se obtuvo `2026-11-10T20:00:21.946Z`.
- Verde con el arreglo: los dos comandos anteriores exit 0 (2/2 y 2/2). `./mvnw test -Dtest='DailyNoteServiceTest,DailyVersionServiceTest,VoiceNoteServiceTest'` exit 0, 6/6. `./mvnw -q spotless:check` exit 0.
- IT de daily con PostgreSQL Testcontainers, fuera del comando del contrato y elegidos por riesgo: `./mvnw verify -Dtest='DailyNoteServiceTest,DailyVersionServiceTest' -Dit.test='DailyNoteServiceIT,DailyVersionServiceIT,DailyNoteApiIT,DailyVersionApiIT' -Dsurefire.failIfNoSpecifiedTests=false -Dfailsafe.failIfNoSpecifiedTests=false -Djacoco.skip=true` exit 0, 65/65 (13, 16, 11 y 25). Con JaCoCo omitido, no acredita cobertura.
- Cierre temporal: `node scripts/docs-check.mjs` OK (102 Markdown, 50 tareas), `git diff --check` exit 0 y `bash scripts/verify.sh --policy origin/main` con `policy=FULL`, `profile=APPLICATION`, 4 rutas técnicas.
- No ejecutado: `clean verify` completo, cliente, Playwright ni el gate FULL de la tabla. **FULL diferido** al HEAD final del PR único, según [TESTING](../TESTING.md#aplazamiento-de-full-hasta-t-044).
- Sin recursos propios por limpiar: los contenedores de Testcontainers terminaron con la corrida. No se borraron ramas, worktrees ni archivos de `.orchestrator`.

Siguiente: sesión nueva para [T-041](T-041-xlsx-codec.md) en la misma rama.

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|
| 2026-11-10 · `f10529f` | `nowMicros()` de `DailyNoteService` y `DailyVersionService` sumaba dos veces la fracción de milisegundos y descartaba los microsegundos: con el reloj en `20:00:20.973456789Z` registraba `20:00:21.946Z`. | Una sola lectura: `clock.instant().truncatedTo(ChronoUnit.MICROS)`. | Rojo y verde de `DailyNoteServiceTest` y `DailyVersionServiceTest`; IT de daily 65/65 |

## Cierre y siguiente tarea

Sin PR propio: abrir como draft el PR único de [S-107](../specs/S-107-xlsx-portability.md#tareas-y-dependencias) y cerrar la tarea en la rama compartida con XL-01 verde, `docs-check` y commit publicado. Como portadora, conserva el estado en vuelo y el número de PR hasta el merge. La siguiente sesión toma [T-041](T-041-xlsx-codec.md) en la misma rama. Tras el MERGED del PR único se concilian las seis tareas y se quita el hallazgo resuelto de BACKLOG.
