---
id: T-040
status: changes_requested
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

2026-11-11. Como portadora pasa a `in_review`: T-041…T-045 quedaron cerradas en la rama, el gate integrado STARTER está en verde y el control de avance de las seis tareas está hecho, todo registrado en [T-045](T-045-xlsx-journey.md#checkpoint-vigente). El PR49 quedó listo para la revisión independiente.

### Revisión independiente · ronda 1 de 2

2026-11-10 (Argentina). Reviewer: Codex de escritorio, familia GPT-6 (variante y esfuerzo no expuestos), con Git/`gh`, PowerShell/Git Bash, Maven Wrapper/JDK 21, Docker/Testcontainers, Node 24/npm y Playwright. Sesión distinta de la implementación. Impacto de esta transición: documental, sin cambios de comportamiento, API, permisos, datos ni UI.

- PR49 abierto y listo, `codex/s-107-xlsx-portability` → `main`. HEAD técnico revisado `f9fdb5768e720e889d407370dc756391655d83d7`, base publicada `fc8fda5b20946e595c153144e99d9a3d3346ac5d`. Árbol limpio e idéntico al HEAD remoto; `6980805` es ancestro y `git diff --name-only 37664e7 HEAD` contiene cuatro Markdown. `verify-required` en [SUCCESS para ese HEAD](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/42936609828); una corrida anterior cancelada no cuenta como éxito.
- `bash scripts/verify.sh --policy c5e37cc4b73ad038ac35edf29c66131416bb4a34`: `FULL` / `STARTER`. Cotejados los tres SHA-256 y las huellas de HEAD/árbol de [T-045](T-045-xlsx-journey.md#gate-integrado-verde-en-tres-corridas-sobre-las-mismas-fuentes). La primera corrida acredita docs, backend con JaCoCo, cliente y ocho ensayos de tooling; la segunda acredita el E2E completo (47 casos, incluidos ambos `portability:`); la tercera acredita los dos ensayos de proxies que faltaban tras el fallo de entorno. `37664e7` y `628e787` difieren solo en Markdown. La evidencia compuesta alcanza para el gate de esas fuentes/base y para el control de avance; no cubre los dos bordes de restauración de abajo. No se repitió FULL.
- Backend, desde `server/`: `./mvnw clean integration-test failsafe:verify -Dtest='DailyNoteServiceTest,DailyVersionServiceTest,Xlsx*Test,PortabilityExportServiceTest,SecurityConfigTest' -Dit.test='Portability*IT'` exit 0, 205 Surefire y 24 Failsafe con PostgreSQL 18 y OIDC local. Incluye propiedad y cuenta ajena, rollback, importaciones concurrentes, cuenta no vacía, límites del codec/ZIP, CSRF/401/413. El dirigido no sustituye la cobertura del gate.
- Cliente, desde `client/`: `npm test -- --run src/features/portability src/app/AppRoutes.test.tsx src/services/http.test.ts` exit 0, 108 casos; cambio de identidad durante descarga, vista previa e importación incluidos.
- Proxies: `STARTER_PORTABILITY_PROXY_PORT=5295 STARTER_PORTABILITY_PROXY_PROJECT=starter-portability-proxy-49001-1 node scripts/test-portability-proxies.mjs` exit 0 (10 MiB en ambas rutas y ambos proxies, 413 de nginx y rutas vecinas). `STARTER_E2E_PROJECT=starter-e2e-pr49-review-f9fdb57 bash scripts/e2e.sh --grep 'portability:' --project desktop` exit 0, 1/1 con navegador/API/PostgreSQL/OIDC reales, dos cuentas y sin interceptar la API propia. Ambos proyectos de revisión quedaron en 0 contenedores, volúmenes y redes según sus labels exactos. Logs y comprobación local en `.orchestrator/pr49-review-1-f9fdb57/`.

**Resultado: `changes_requested`.** Dos bloqueantes del recorrido de restauración, verificados con `RestoreReview.java` y `restore-edges.log` en ese directorio local, ejecutando `java -Xmx512m --class-path <classpath de Surefire> .orchestrator/pr49-review-1-f9fdb57/RestoreReview.java` sobre las clases probadas y datos ficticios:

1. **B1 · Un respaldo de una nota anterior a T-040 puede ser irrestaurable.** La fórmula anterior, con creación a `20:00:20.973Z` y actualización a `20:00:21.001Z`, podía persistir `createdAt=20:00:21.946Z` y `updatedAt=20:00:21.002Z`. La base no impone el orden y T-040 solo corrige escrituras futuras. El writer exporta ambos valores y `XlsxWorkbookReader.dailyNote` los rechaza por `requireOrdered`: `IMPORT_INVALID_RECORD`, `diarias`, fila 2, en un libro generado por el propio writer. Frontera/dueño debe resolver la compatibilidad con esas fechas históricas y la regla de preservación antes de tocar los datos o el contrato. Cierre: regresión con una nota legada que compruebe respaldo, vista previa y restauración completa en una cuenta vacía, con las fechas según la política aprobada.
2. **B2 · Se anuncia como respaldo una exportación que rebasa el límite de registros del importador.** No hay cuota de 10.000 referencias por cuenta; el writer emite todas y el reader rechaza la 10.001. Con referencias válidas, el libro generado con 10.000 se leyó completo y el de 10.001 (528.050 bytes) dio `IMPORT_INVALID_RECORD`, `referencias`, fila 10.002. Frontera/dueño debe resolver el comportamiento para cuentas fuera de los límites de restauración, incluidos los límites en bytes, antes de ampliar formato o límites. Cierre: regresión al límite y límite +1 que demuestre que todo respaldo anunciado como descargado se puede restaurar en una cuenta vacía, o que el producto informe la limitación antes de anunciar la descarga como respaldo utilizable, según el contrato acordado.

Retoma: frontera/dueño define la política de B1 y B2; después, sesión implementer en la misma rama/PR, pruebas rojas y verdes y revalidación por alcance, y una segunda revisión independiente sobre los SHA publicados. La prueba del dueño de T-045 sigue pendiente; M3 y T-046 esperan las condiciones de salida de S-107.

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|
| 2026-11-10 · `f10529f` | `nowMicros()` de `DailyNoteService` y `DailyVersionService` sumaba dos veces la fracción de milisegundos y descartaba los microsegundos: con el reloj en `20:00:20.973456789Z` registraba `20:00:21.946Z`. | Una sola lectura: `clock.instant().truncatedTo(ChronoUnit.MICROS)`. | Rojo y verde de `DailyNoteServiceTest` y `DailyVersionServiceTest`; IT de daily 65/65 |

## Cierre y siguiente tarea

Sin PR propio: abrir como draft el PR único de [S-107](../specs/S-107-xlsx-portability.md#tareas-y-dependencias) y cerrar la tarea en la rama compartida con XL-01 verde, `docs-check` y commit publicado. Como portadora, conserva el estado en vuelo y el número de PR hasta el merge. La siguiente sesión toma [T-041](T-041-xlsx-codec.md) en la misma rama. Tras el MERGED del PR único se concilian las seis tareas y se quita el hallazgo resuelto de BACKLOG.
