---
id: T-040
status: draft
priority: P1
size: S
executor: junie
role: implementer
milestone: M3
product_cycle: I3
spec: S-107
spec_version: 1
branch: codex/t-040-daily-timestamps
pr: null
depends_on: [T-049]
---
# T-040 · Marcas de tiempo de daily y versiones truncadas a microsegundos

## Objetivo

`createdAt`/`updatedAt` de las notas diarias y `savedAt` de las versiones registran el instante real truncado a microsegundos (S-101), sin adelantarse hasta casi un segundo. Es un requisito previo de S-107: la exportación conserva estos instantes. Es un bugfix registrado en BACKLOG (hallazgo de T-037).

Está en `draft` hasta que [T-049](T-049-voice-retest.md) documente un reensayo favorable con el dueño y su PR esté MERGED. La siguiente tarea es [T-041](T-041-xlsx-codec.md).

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

`draft` por dependencia de T-049. Contrato completo (frontera, 2026-11-10).

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|

## Cierre y siguiente tarea

PR único, revisión independiente y merge según AUTONOMY. Tras MERGED, la siguiente sesión concilia done, quita el hallazgo resuelto de BACKLOG y toma [T-041](T-041-xlsx-codec.md).
