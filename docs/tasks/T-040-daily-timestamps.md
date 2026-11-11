---
id: T-040
status: in_review
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
- Este arreglo original de XL-01 se limita a las escrituras futuras. La corrección del PR49 tiene su propio alcance en el checkpoint.

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

**Retoma vigente.** T-040 portadora en `in_review`. B1/B2 publicados en [PR49](https://github.com/MatiasNicolasAcevedo/devnotes/pull/49), abierto y listo, con [STARTER integrado verde](#gate-integrado-de-la-corrección) sobre las fuentes de `9a63da24cc36b6b90d5140945ba6af63c808bde0` y base `fc8fda5b20946e595c153144e99d9a3d3346ac5d`. Sigue la ronda independiente 2 de 2, con HEAD/base y CI vigentes confirmados en GitHub al tomar el prompt de [STATUS](../STATUS.md#prompt-de-la-siguiente-sesión). La prueba de T-045 y su archivo, y el cleanup de T-049, corresponden al dueño. M3 y T-046 siguen pendientes.

### Evidencia del arreglo original

2026-11-10. Implementer en Claude Code de escritorio (Claude Fable 5.2, esfuerzo no expuesto), con Git Bash, JDK 21.0.9, Maven Wrapper, Docker, Node, Git y `gh`. Cambia el comportamiento: `createdAt`/`updatedAt` de las notas diarias y `savedAt` de las versiones registran el instante real truncado a microsegundos en lugar de adelantarse. Sin cambios de API, permisos, esquema, datos existentes ni UI.

- Precondición: `gh pr view 48` devolvió `MERGED`, `mergedAt` 2026-11-10T21:31:31Z y `mergeCommit` `fc8fda5b20946e595c153144e99d9a3d3346ac5d`, punta de `origin/main` y base de la rama. T-049 conciliada en `1aa06b6` ([detalle](T-049-voice-retest.md#conciliación)).
- SHA del arreglo: `f10529f`. Toca `DailyNoteService`, `DailyVersionService` y las dos pruebas nuevas.
- Rojo antes del arreglo, desde `server/` en Git Bash: `./mvnw -q test -Dtest=DailyNoteServiceTest` exit 1, 2 pruebas y 2 fallos; `./mvnw -q test -Dtest=DailyVersionServiceTest` exit 1, 2 pruebas y 2 fallos. En los cuatro se esperaba `2026-11-10T20:00:20.973456Z` y se obtuvo `2026-11-10T20:00:21.946Z`.
- Verde con el arreglo: los dos comandos anteriores exit 0 (2/2 y 2/2). `./mvnw test -Dtest='DailyNoteServiceTest,DailyVersionServiceTest,VoiceNoteServiceTest'` exit 0, 6/6. `./mvnw -q spotless:check` exit 0.
- IT de daily con PostgreSQL Testcontainers, fuera del comando del contrato y elegidos por riesgo: `./mvnw verify -Dtest='DailyNoteServiceTest,DailyVersionServiceTest' -Dit.test='DailyNoteServiceIT,DailyVersionServiceIT,DailyNoteApiIT,DailyVersionApiIT' -Dsurefire.failIfNoSpecifiedTests=false -Dfailsafe.failIfNoSpecifiedTests=false -Djacoco.skip=true` exit 0, 65/65 (13, 16, 11 y 25). Con JaCoCo omitido, no acredita cobertura.
- Cierre temporal: `node scripts/docs-check.mjs` OK (102 Markdown, 50 tareas), `git diff --check` exit 0 y `bash scripts/verify.sh --policy origin/main` con `policy=FULL`, `profile=APPLICATION`, 4 rutas técnicas.
- No ejecutado: `clean verify` completo, cliente, Playwright ni el gate FULL de la tabla. **FULL diferido** al HEAD final del PR único, según [TESTING](../TESTING.md#aplazamiento-de-full-hasta-t-044).
- Sin recursos propios por limpiar: los contenedores de Testcontainers terminaron con la corrida. No se borraron ramas, worktrees ni archivos de `.orchestrator`.

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

### Corrección acordada · B1 y B2

2026-11-10 (Argentina). Frontera en Codex de escritorio, familia GPT-6 (variante y esfuerzo no expuestos), con Git, `gh`, PowerShell y Node. Consultas de solo lectura a GitHub: [PR49](https://github.com/MatiasNicolasAcevedo/devnotes/pull/49) OPEN y listo, HEAD `45cc4d8f2fa6f4dfb47a575cf12bbf92ada7f678`, base `main` `fc8fda5b20946e595c153144e99d9a3d3346ac5d`, local y remoto coincidentes, [`verify-required` SUCCESS](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/42938492953/job/130254345261). [Veredicto publicado](https://github.com/MatiasNicolasAcevedo/devnotes/pull/49#issuecomment-6784193180).

El dueño acordó [XL-07 y XL-08 de S-107](../specs/S-107-xlsx-portability.md#criterios-de-aceptación). Impacto previsto: compatibilidad v1 para instantes invertidos en diarias, rechazo explícito de exportaciones fuera de límites, longitud exacta del adjunto y alerta en Datos. Se preservan los permisos, el esquema y los datos de origen. Leer explícitamente [server/AGENTS.md](../../server/AGENTS.md) y [client/AGENTS.md](../../client/AGENTS.md).

| Regresión | Resultado esperado y fallo previo |
|---|---|
| **B1 / XL-07** en `PortabilityImportApiIT` | Sembrar en PostgreSQL una diaria ficticia de A con documento no vacío, `createdAt=2026-11-10T20:00:21.946Z` y `updatedAt=2026-11-10T20:00:21.002Z`. Usar el mismo adjunto del GET de A para la vista previa 200 en B vacía, comprobar conteo y cero escrituras, e importar con 201. Comparar en B la fecha, el documento completo y ambos instantes exactos, y comprobar que la fila de A se conservó. **Rojo:** la vista previa actual devuelve `IMPORT_INVALID_RECORD` en `diarias`, fila 2. En `XlsxWorkbookReaderTest`, reemplazar el rechazo por orden en diarias por un caso positivo y mantener los negativos de instante inválido y orden invertido de voz y referencias. |
| **B2 / XL-08, registros** en `PortabilityImportApiIT` y `PortabilityExportApiIT` | Sembrar referencias válidas ficticias. Con 10 000, el GET entrega un XLSX con longitud exacta que pasa vista previa y restaura las 10 000 en B vacía. Con 10 001, el GET devuelve 409, `EXPORT_LIMIT_EXCEEDED`, `no-store` y ningún adjunto. **Rojo:** hoy el GET de 10 001 devuelve 200 con un libro que el importador rechaza. |
| **B2 / XL-08, tamaño** en `PortabilityExportServiceTest`, `XlsxZipInspectionTest` y contrato HTTP en `PortabilityExportApiIT` | Ejercitar la preparación de exportación con XLSX ficticios válidos para el códec. Aislar cada límite: 10 485 760/10 485 761 bytes comprimidos y 67 108 864/67 108 865 bytes reales descomprimidos, con el otro tamaño y los conteos dentro del máximo. El máximo exacto pasa, el adicional da el error de exportación y no deja temporal. Conservar los bordes ZIP 64/65 y los negativos del importador. **Rojo:** la preparación actual no bloquea la descarga por esos tamaños. El error HTTP de límite es ProblemDetail privado, sin `Content-Disposition` ni bytes XLSX. |
| **B2 / XL-08, Datos** en `DataPage.test.tsx` y `api.test.ts` | Con 409, comprobar el mensaje exacto de S-107 y que no se activa el enlace de descarga ni aparece «Descarga lista». Con 200, comprobar el rechazo si el cuerpo XLSX tiene menos bytes que `Content-Length`, y conservar el éxito si coincide. **Rojo:** hoy se muestra un error genérico para el código nuevo y se acepta un blob no vacío aunque esté truncado. |

Ejecutar las regresiones nuevas primero contra el código actual. Registrar rojo por la aserción esperada, arreglo, verde y SHA en esta tarea. Usar los mismos comandos dirigidos para el verde.

| Alcance | Comando |
|---|---|
| Backend, desde `server/` en Git Bash con JDK 21 y Docker | `./mvnw clean integration-test failsafe:verify -Dtest='DailyNoteServiceTest,DailyVersionServiceTest,Xlsx*Test,PortabilityExportServiceTest' -Dit.test='PortabilityImportApiIT,PortabilityExportApiIT'` |
| Cliente, desde `client/` | `npm test -- --run src/features/portability/DataPage.test.tsx src/features/portability/api.test.ts` |
| Recorrido dirigido durante la iteración, desde raíz en Git Bash | `STARTER_E2E_PROJECT=starter-e2e-pr49-r2-iter bash scripts/e2e.sh --grep 'portability:' --project desktop` |
| Documentación y clasificación, desde raíz | `node scripts/docs-check.mjs`, `git diff --check`, `bash scripts/verify.sh --policy origin/main` y `bash scripts/verify.sh --policy c5e37cc4b73ad038ac35edf29c66131416bb4a34` sobre el commit final de fuentes. Revisar también el diff sin commit. |

**Gate integrado.** [TESTING](../TESTING.md#cuándo-ejecutar-full) exige revalidar las nuevas fuentes. El perfil acumulado es STARTER. Ejecutar una vez al cerrar las fuentes, desde la raíz en Git Bash, con Docker, Node >=24 y proyectos propios libres. En PowerShell usar la entrada canónica de [SETUP](../SETUP.md#requisitos-del-host). Antes de iniciar, anotar HEAD/base, huella de fuentes, comando, logs saneados, recursos propios, cleanup por labels exactos y retoma. Mantener las fuentes fijas durante la corrida y registrar exit 0, huella final y cleanup.

```bash
DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-pr49-r2 STARTER_E2E_PROJECT=starter-e2e-pr49-r2 STARTER_SERVER_TESTS=container bash scripts/verify.sh --starter
```

Con el gate verde, publicar en la misma rama según [implementer](../agents/implementer.md), cerrar docs con `docs-check`, pasar T-040 a `in_review` y dejar en STATUS el prompt de ronda 2 de 2. Confirmar HEAD y base publicados y `verify-required` verde antes de esa revisión. La prueba del dueño de T-045 sigue pendiente y la registra el dueño, con su archivo reservado. M3 y T-046 esperan las condiciones de salida de S-107. El cleanup de T-049 sigue reservado al dueño.

### Evidencia de la corrección B1/B2

Implementer en Codex de escritorio, familia GPT-6 (variante y esfuerzo no expuestos), con PowerShell, Git Bash, Git, `gh`, Node, Maven Wrapper y Docker Desktop. Se preservaron las ediciones de frontera. Git Bash y Docker Desktop requirieron ejecución en el host por las restricciones de MSYS y del pipe de Docker en el sandbox.

- **Rojo**, producción de `45cc4d8`. Surefire exit 1, 195 casos: el códec rechazó la diaria en `diarias`, fila 2, y la exportación admitió el byte adicional en ambos tamaños. Se ejecutó Failsafe por separado con `./mvnw integration-test failsafe:verify -Dtest=DailyNoteServiceTest -Dit.test='PortabilityImportApiIT,PortabilityExportApiIT'` porque el rojo unitario detuvo el comando conjunto. Exit 1, 17 casos: vista previa 400 `IMPORT_INVALID_RECORD` en `diarias`, fila 2, GET 200 para 10 001 referencias y para los dos tamaños excedidos, y falta de longitud en el GET de 10 000. Vitest exit 1, 8 de 80 casos fallaron: longitud incorrecta o ausente aceptada, descarga del cuerpo truncado y texto genérico para el 409. Logs `server-red-unit.log`, `server-red-it.log` y `client-red-final.log`.
- **Verde**, fuentes `9a63da2`. Comandos dirigidos acordados exit 0: Surefire 196/196, Failsafe 17/17 con PostgreSQL, Vitest 80/80 y typecheck. El recorrido `portability:` en desktop pasó 1/1 con API/DB/OIDC reales y el proyecto `starter-e2e-pr49-r2-iter` quedó con 0 contenedores, redes y volúmenes. Logs `server-green-final.log`, `client-green-final.log` y `e2e-iter.log` en `.orchestrator/pr49-r2/`.

### Gate integrado de la corrección

El [comando STARTER acordado](#corrección-acordada--b1-y-b2) terminó con **exit 0** en una sola ejecución, con Git Bash desde PowerShell según SETUP, Node 24.21.0 y Docker Desktop 28.5.1. Ventana de ejecución y cleanup `2026-11-11T01:51:13Z` a `03:01:15Z`. Ambos clasificadores del commit final, contra `origin/main` y `c5e37cc4b73ad038ac35edf29c66131416bb4a34`, dieron FULL/STARTER.

| Suite | Tiempo | Resultado |
|---|---:|---|
| Docs | 7 s | Exit 0 |
| Backend | 523 s | Exit 0. Surefire 429/429, Failsafe 239/239 con PostgreSQL 18.6, JaCoCo y Spotless |
| Cliente | 129 s | Exit 0. 42 archivos, 601/601 pruebas, cobertura, typecheck, lint, formato y build |
| Tooling | 1979 s | Exit 0. Diez ensayos, incluidos copia compilable, persistencia y rollback, señales y ambos proxies |
| Playwright | 1563 s | Exit 0. 47/47, 24 desktop y 23 mobile, con ambos `portability:` y exporte saneado |

- **Fuentes y base.** HEAD `9a63da24cc36b6b90d5140945ba6af63c808bde0`, árbol `1467047cc96d0263c9ddb0704bc3929c7f94da7e` y base `fc8fda5b20946e595c153144e99d9a3d3346ac5d` antes y después, con huellas de server/client/e2e/scripts idénticas y solo tres Markdown pendientes durante la corrida. El cierre documental posterior conserva estas fuentes. `docs-check` y `git diff --check` verdes en el cierre.
- **Logs.** `.orchestrator/pr49-r2/starter-gate.log`, SHA-256 `bf4beca204110d196766dae71d623e5cef934b56e88f39b6c26b2108bf252cf9`. `starter-state.log` conserva los exit y huellas de inicio y fin. La matriz local de CI en el host dio 118/118 (`ci-contract-host.log`).
- **Cleanup.** `starter-verify-pr49-r2` y `starter-e2e-pr49-r2` en 0/0/0 contenedores, redes y volúmenes por labels exactos. Para el verificador se ejecutó `docker compose --env-file .env.example -p starter-verify-pr49-r2 --profile verify down --volumes --remove-orphans` (exit 0). Los siete proyectos de tooling identificados por nombre quedaron también en 0/0/0. Se cotejaron por ID los 48 contenedores Testcontainers del gate y los seis de los IT dirigidos, todos retirados.

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|
| 2026-11-10 · `f10529f` | `nowMicros()` de `DailyNoteService` y `DailyVersionService` sumaba dos veces la fracción de milisegundos y descartaba los microsegundos: con el reloj en `20:00:20.973456789Z` registraba `20:00:21.946Z`. | Una sola lectura: `clock.instant().truncatedTo(ChronoUnit.MICROS)`. | Rojo y verde de `DailyNoteServiceTest` y `DailyVersionServiceTest`; IT de daily 65/65 |
| 2026-11-10 · `9a63da2` | B1. El códec exigía orden cronológico para instantes válidos de diarias anteriores a T-040. | Restaurar ambos instantes exactos en v1. | XL-07. GET, vista previa sin escrituras y restauración en B con documento y fechas exactos y la fila de A intacta. Los negativos de voz, referencias e instantes inválidos siguen verdes. |
| 2026-11-10 · `9a63da2` | B2. Se emitían cabeceras de descarga antes de validar la restaurabilidad y Datos aceptaba cuerpos incompletos. | Preparar el archivo privado con los topes compartidos, inspeccionarlo antes de enviar cabeceras y servirlo con longitud exacta. Mostrar la alerta del 409 y cotejar la longitud en Datos. | XL-08. 10 000 referencias restauradas, máximos en bytes inclusivos, 409 sin adjunto en los tres excesos, cleanup en éxito, rechazo e interrupción y rechazo del blob truncado. |

## Cierre y siguiente tarea

Como portadora del [PR único de S-107](../specs/S-107-xlsx-portability.md#tareas-y-dependencias), T-040 conserva el estado en vuelo y el número de PR hasta el merge. Tras el MERGED se concilian las seis tareas y se quita el hallazgo resuelto de BACKLOG. Para continuar con T-046 también se exige la prueba satisfactoria registrada por el dueño.
