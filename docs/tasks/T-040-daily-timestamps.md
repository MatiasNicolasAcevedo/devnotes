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

**Retoma vigente.** T-040 portadora en `in_review` para la única ronda independiente excepcional de PR49. Fuentes publicadas en `2f3b41f08fdca5e6fb4d37b8ba977ec626dcef38`, base `fc8fda5b20946e595c153144e99d9a3d3346ac5d`. El dueño aceptó los dirigidos de B1–B4 y el recorrido Playwright de portabilidad como gate excepcional de este PR. La sesión revisora debe cotejar la evidencia, las huellas, el HEAD/base publicados y `verify-required` sobre el HEAD vigente. [Evidencia y huellas](#evidencia-dirigida-de-b3-y-b4). La prueba de T-045 y su archivo, y el cleanup de T-049, corresponden al dueño. M3 y T-046 siguen pendientes.

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

### Revisión independiente · ronda 2 de 2

2026-11-11 (Argentina). Reviewer en sesión nueva de Codex de escritorio, familia GPT-6, con PowerShell, Git, `gh`, JDK 21, Git Bash, Maven Wrapper, Docker/Testcontainers y Node/npm. Variante y esfuerzo sin exponer. La transición documenta el veredicto, con las mismas fuentes, API, permisos, datos y UI.

- GitHub confirmó [PR49](https://github.com/MatiasNicolasAcevedo/devnotes/pull/49) abierto y listo, `codex/s-107-xlsx-portability` → `main`, HEAD `f1a5a86169a2df53f46947c9ebd4d77b4abcb923`, base y punta de `main` `fc8fda5b20946e595c153144e99d9a3d3346ac5d` y [`verify-required` SUCCESS](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/42950199349/job/130292443379) sobre ese HEAD. El checkout limpio coincidía con GitHub.
- Perfil acumulado `FULL` / `STARTER` frente a la base publicada y frente a `c5e37cc4b73ad038ac35edf29c66131416bb4a34`, con `node scripts/ci/classify-diff.mjs --base … --head HEAD --phase FULL`. La huella SHA-256 del log, el árbol y la base del STARTER coinciden con la evidencia anterior. De `9a63da2` a `f1a5a86` cambian tres Markdown regulares de `docs/`. Las huellas de `server`, `client`, `e2e` y `scripts` coinciden con las del registro de inicio y fin del gate. `node scripts/docs-check.mjs` y `git diff --check` pasaron. Se conservó el STARTER, incluidos los dos casos Playwright `portability:`.
- **B1 / XL-07 verificado.** Vista previa sin escrituras, restauración en B con fecha, documento y ambos instantes exactos, y fila de A preservada. Los negativos acordados de instantes inválidos y orden de voz/referencias pasaron.
- **B2 / XL-08 verificado.** Restauración completa de 10 000 referencias, `409 EXPORT_LIMIT_EXCEEDED` sin adjunto para 10 001 y los dos excesos de un byte, máximos exactos admitidos y temporales retirados. En Datos se verifica el mensaje específico, el rechazo de cuerpos incompletos y la descarga cuando coincide la longitud.
- Dirigidos acordados, exit 0. Desde `server/`, `./mvnw clean integration-test failsafe:verify -Dtest='DailyNoteServiceTest,DailyVersionServiceTest,Xlsx*Test,PortabilityExportServiceTest' -Dit.test='PortabilityImportApiIT,PortabilityExportApiIT'` dio 196/196 Surefire y 17/17 Failsafe con PostgreSQL 18.6 y OIDC local. Desde `client/`, `npm test -- --run src/features/portability/DataPage.test.tsx src/features/portability/api.test.ts` dio 80/80.

**Veredicto de revisión: `CAMBIOS REQUERIDOS`.** El diff acumulado conserva dos casos en que el GET entrega un respaldo dentro de los límites que el propio importador rechaza. En los dos casos se probó el adjunto exacto de A en B vacía con OIDC local, PostgreSQL y HTTP reales. B quedó sin escrituras.

1. **B3 · Voz legada con instantes invertidos.** Antes de `aef4213` (T-037), `VoiceNoteService.nowMicros()` sumaba dos veces la fracción de milisegundos al crear y editar. Una creación a `20:00:20.973Z` y una edición a `20:00:21.001Z` del mismo día podían persistir `createdAt=20:00:21.946Z` y `updatedAt=20:00:21.002Z`. La sonda sembró esa nota ficticia en PostgreSQL. GET `200` con adjunto de 7199 bytes. Vista previa e importación `400 IMPORT_INVALID_RECORD`, `voz`, fila 2, por `requireOrdered` en [`XlsxWorkbookReader.voiceNote`](../../server/src/main/java/com/example/devnotes/portability/xlsx/XlsxWorkbookReader.java#L347). S-107 exige ese orden para voz. Propuesta al dueño: admitir ambos órdenes de instantes válidos de voz en v1 y preservarlos, siguiendo el criterio de B1 para diarias. Cierre observable: el mismo XLSX pasa vista previa sin escrituras y se restaura en B con texto y ambos instantes exactos, con A intacta. Mantener los rechazos de instantes inválidos y el orden de referencias.
2. **B4 · Una diaria que admite el guardado queda fuera del respaldo restaurable.** Un `PUT` normal con `marks: null` en un nodo de texto dio `200` y PostgreSQL conservó el JSON. [`DailyContent`](../../server/src/main/java/com/example/devnotes/daily/domain/DailyContent.java#L189) lo admite, el writer lo conserva y [`XlsxWorkbookReader.requireStorable`](../../server/src/main/java/com/example/devnotes/portability/xlsx/XlsxWorkbookReader.java#L373) rechaza todo `null` recursivamente. GET `200` con adjunto de 7208 bytes. Vista previa e importación `400 IMPORT_INVALID_RECORD`, `diarias`, fila 2. S-107 exige a la vez el validador de guardado y JSON sin `null`. Propuesta al dueño: preservar el contenido aceptado por el validador de dominio en diarias y versiones, manteniendo los campos del registro estrictos y los controles de caracteres no almacenables. Cierre observable: guardar la diaria mediante su API, guardar su versión y restaurar ambas desde el adjunto original con el documento completo, incluida la marca opcional, y con vista previa sin escrituras.

Sondas de revisión en `.orchestrator/pr49-review-2-f1a5a86/`. `LegacyVoiceReviewIT.java` se compiló con el classpath de Surefire y se cargó como una clase temporal en `target/test-classes`. Desde `server/`, `./mvnw integration-test failsafe:verify -Dtest=DailyNoteServiceTest -Dit.test='LegacyVoiceReviewIT#legacyVoiceCanBeExportedButCannotBeRestored+dailyWithNullMarksIsSavedButItsBackupIsRejected'` dio 2/2 reproducciones confirmadas en `restore-compatibility-lifecycle.log`. El primer intento, con el goal Failsafe directo, salió antes de ejecutar pruebas porque faltó inicializar los agentes del POM. El ciclo Maven resolvió ese fallo de ejecución. Se retiró la clase temporal y se confirmó la salida de los cinco contenedores propios por ID en `cleanup.log`. Los demás resultados están en `server.log` y `client.log`.

**Salida propuesta al agotar las rondas.** Frontera presenta al dueño las decisiones de formato v1 de B3 y B4. Con su decisión, frontera deja el contrato en esta tarea y en S-107. Una sesión implementer aplica la corrección en el mismo PR con regresiones rojas y verdes por HTTP/PostgreSQL y un STARTER integrado sobre las fuentes finales. Para llegar a merge, el dueño debe autorizar expresamente otra revisión independiente del nuevo HEAD/base. Esa sesión verifica el cierre de ambos casos y publica un nuevo veredicto con CI verde. Se conserva la evidencia de B1/B2 y el gate de este SHA como historial de la revisión. El PR queda abierto mientras se decide la compatibilidad.

### Corrección acordada · B3 y B4

2026-11-11 (Argentina). Implementer en sesión nueva de Codex de escritorio, familia GPT-6, con PowerShell, Git, `gh`, Git Bash, Maven Wrapper, JDK 21, Docker/Testcontainers y Node/npm. Variante y esfuerzo sin exponer. El alcance cambia la validación de restauración v1 para voz y para documentos de diarias/versiones. Se conservan el formato, la API, los permisos por sesión/propietario, los datos de origen, los topes de B2 y la importación atómica en cuenta vacía. Alcance técnico en el códec de importación y sus regresiones.

Antes de editar, `gh pr view 49` y `gh api` confirmaron PR abierto y listo, rama `codex/s-107-xlsx-portability`, HEAD `f2d89235eea885ddb0acdc68f31894a9918568b8`, base y punta de `main` `fc8fda5b20946e595c153144e99d9a3d3346ac5d`, el [veredicto publicado](https://github.com/MatiasNicolasAcevedo/devnotes/pull/49#issuecomment-6786106689) y [`verify-required` SUCCESS](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/42952597039/job/130300157664) del HEAD de la revisión. Árbol local limpio con HEAD, ramas de seguimiento y merge-base coincidentes.

- **B3 / XL-09.** El dueño aprobó admitir ambos órdenes de instantes válidos para toda la hoja voz en v1 y restaurar cada instante exacto. El formato carece de una marca que identifique las filas anteriores a T-037. Se conservan el formato y la precisión de instantes y el orden exigido en referencias. Convertir la sonda de voz legada en una regresión con el mismo adjunto para vista previa 200 sin escrituras e importación 201, texto e instantes exactos en B y fila de A intacta.
- **B4 / XL-10.** El dueño aprobó que el validador de guardado determine la estructura de `content` al restaurar diarias y versiones. Se conserva íntegro el documento aceptado, incluido `marks: null`, con los campos exteriores estrictos y el rechazo de caracteres no almacenables en todo el documento. Guardar ambos documentos por API, confirmar su persistencia y restaurarlos con el mismo XLSX usado en la vista previa sin escrituras. Comparar ambos documentos completos y las filas originales de A.
- **Revisión.** El dueño autorizó una única ronda excepcional en sesión independiente, con revisión de B3/B4, B1/B2, gate y CI en los SHA vigentes. Con `APROBADO` y las demás condiciones de AUTONOMY, el reviewer puede hacer squash ligado al HEAD revisado y confirmar MERGED. Ante otro bloqueante, registrar y devolver al dueño la decisión concreta pendiente.

#### Evidencia dirigida de B3 y B4

Logs de la sesión en `.orchestrator/pr49-b3-b4/`. Para el rojo, el blob del importador coincide con HEAD `f2d89235eea885ddb0acdc68f31894a9918568b8` (`a55afbedefdedfb12f16cf606b842da260efb1f1`), base `fc8fda5b20946e595c153144e99d9a3d3346ac5d`.

| Alcance | Comando | Resultado |
|---|---|---|
| Rojo HTTP/PostgreSQL/OIDC, desde `server/` en Git Bash | `./mvnw clean integration-test failsafe:verify -Dtest=DailyNoteServiceTest -Dit.test='PortabilityImportApiIT#historicalVoiceInstantsRoundTripWithoutNormalizingTheSourceOrPreviewWrites+dailyAndVersionWithNullMarksRoundTripWithoutPreviewWrites'` | Exit 1, 2/2 fallos esperados de aserción y cero errores de ejecución. Vista previa 400 `IMPORT_INVALID_RECORD` en `voz` y `diarias`, fila 2. `server-red.log`, SHA-256 `23e56ac0f3ff42e032adab42ec92da2adde6d157061b5753b1d2e5114eed33c2`. |
| Rojo unitario B3, desde `server/` en Git Bash | `./mvnw test -Dtest='XlsxWorkbookReaderTest#voiceNotePreservesHistoricallyInvertedInstants'` | Exit 1, el lector rechaza la voz válida, fila 2. `reader-red.log`, SHA-256 `758feced9ccff86bc7d7bd67a84c4ad15cc5d5fc56ed7d4f01cb4f008b174903`. |
| Verde B1–B4 y formato, desde `server/` en Git Bash | `./mvnw clean integration-test failsafe:verify spotless:check -Dtest='DailyNoteServiceTest,DailyVersionServiceTest,Xlsx*Test,PortabilityExportServiceTest' -Dit.test='PortabilityImportApiIT,PortabilityExportApiIT'` | Exit 0, 196/196 Surefire, 19/19 Failsafe con PostgreSQL 18.6, HTTP y OIDC local, Spotless OK. B3/B4 prueban el mismo adjunto en los dos POST, vista previa sin escrituras, restauración exacta y origen intacto. `server-green.log`, SHA-256 `f34d86f8d6e4a405e78182459ee7d65c5f6b5b16619c41365af65cdc62bb03e3`. |
| Cliente B2, desde `client/` | `npm test -- --run src/features/portability/DataPage.test.tsx src/features/portability/api.test.ts` | Exit 0, 80/80. `client-directed.log`, SHA-256 `6c27f58a670e46fb444d4c1e43fe8172f56c90ae79f25d7ef1b5088675196e33`. |
| Matriz local de CI, desde raíz | `node --test 'scripts/ci/*.test.mjs'` | Exit 0, 118/118 en el host. La primera ejecución en sandbox falló al iniciar procesos hijos de Windows (`0xc0000142`). `ci-contract-host.log`. |

- **Playwright dirigido.** `STARTER_E2E_PROJECT=starter-e2e-pr49-b3-b4-20261111 bash scripts/e2e.sh --grep 'portability:' --project desktop`, desde raíz con Git Bash explícito y Node en PATH según SETUP. El script comprobó ausencia inicial, usó `scripts/fixtures/e2e.env.example` y reportó 1/1 aprobado con HTTP, PostgreSQL y OIDC local, auditoría de saneado y eliminación de su stack. El wrapper devolvió 1 por un error en el listado adicional de Docker. La consulta corregida devolvió exit 0 para cada tipo y cero contenedores, redes y volúmenes con el label exacto `com.docker.compose.project=starter-e2e-pr49-b3-b4-20261111`. Logs `e2e-directed.log` (SHA-256 `5450f7619178aa2e36d0662a21886fa5f243aa9e1a58b69f944c8e866cd899b3`) y `e2e-cleanup.log`. Los cinco IDs propios de Testcontainers del rojo y el verde también quedaron ausentes en listados exit 0, registrados en `testcontainers-cleanup.log`.
- **Huellas y clasificación.** La corrida dirigida se inició en `f2d89235eea885ddb0acdc68f31894a9918568b8` con los tres Java locales. Sus blobs `8e04dfda14faef7868e3adb2768b8c1cb8645747`, `7056bf08d59d10bc898df1d42315e1bf89acc1fe` y `2b65808cd2cf0885935d318477eca70db388cc16` coinciden con el commit técnico `2f3b41f08fdca5e6fb4d37b8ba977ec626dcef38`, árbol `f6b250f01459b45aeb4af3f8bc1a066ca1056108`. Base `fc8fda5b20946e595c153144e99d9a3d3346ac5d`. `scripts/verify.sh --policy origin/main` y `--policy c5e37cc4b73ad038ac35edf29c66131416bb4a34` con preflight de SETUP dieron FULL/STARTER. `docs-check` y `git diff --check` OK.
- **Gate excepcional del PR49.** El 2026-11-11 el dueño indicó que no se repita FULL y respondió «Aceptar el gate excepcional y publicar». Aceptó los dirigidos de B1–B4 y el recorrido Playwright de portabilidad como evidencia de gate para publicar, revisar y habilitar el squash si se cumplen las demás condiciones de AUTONOMY. El STARTER previo de B1/B2 queda como evidencia histórica de su propio árbol. El cierre documental conserva las fuentes de `2f3b41f` y la base `fc8fda5`. La revisión verifica estas huellas, el alcance de la excepción y la CI del HEAD vigente.

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|
| 2026-11-10 · `f10529f` | `nowMicros()` de `DailyNoteService` y `DailyVersionService` sumaba dos veces la fracción de milisegundos y descartaba los microsegundos: con el reloj en `20:00:20.973456789Z` registraba `20:00:21.946Z`. | Una sola lectura: `clock.instant().truncatedTo(ChronoUnit.MICROS)`. | Rojo y verde de `DailyNoteServiceTest` y `DailyVersionServiceTest`; IT de daily 65/65 |
| 2026-11-10 · `9a63da2` | B1. El códec exigía orden cronológico para instantes válidos de diarias anteriores a T-040. | Restaurar ambos instantes exactos en v1. | XL-07. GET, vista previa sin escrituras y restauración en B con documento y fechas exactos y la fila de A intacta. Los negativos de voz, referencias e instantes inválidos siguen verdes. |
| 2026-11-10 · `9a63da2` | B2. Se emitían cabeceras de descarga antes de validar la restaurabilidad y Datos aceptaba cuerpos incompletos. | Preparar el archivo privado con los topes compartidos, inspeccionarlo antes de enviar cabeceras y servirlo con longitud exacta. Mostrar la alerta del 409 y cotejar la longitud en Datos. | XL-08. 10 000 referencias restauradas, máximos en bytes inclusivos, 409 sin adjunto en los tres excesos, cleanup en éxito, rechazo e interrupción y rechazo del blob truncado. |
| 2026-11-11 · `2f3b41f` | B3. El orden cronológico exigido por el lector invalidaba voz escrita por el reloj anterior a T-037. | Admitir ambos órdenes en toda la hoja voz y restaurar los instantes exactos. | XL-09. Rojo y verde del lector y del IT. Texto y tiempos exactos en B, vista previa sin escrituras y fila de A intacta. |
| 2026-11-11 · `2f3b41f` | B4. El lector rechazaba todo `null` recursivo, incluido el que admite el guardado diario. | Rechazar `null` en los campos exteriores y delegar la estructura de los dos documentos al validador de guardado. Conservar el control de caracteres en todo el árbol. | XL-10. Rojo y verde del IT con guardado por API y copia manual. Ambos documentos completos en B, con `marks: null`, vista previa sin escrituras y filas de A intactas. |

## Cierre y siguiente tarea

Como portadora del [PR único de S-107](../specs/S-107-xlsx-portability.md#tareas-y-dependencias), T-040 conserva el estado en vuelo y el número de PR hasta el merge. Tras el MERGED se concilian las seis tareas y se quita el hallazgo resuelto de BACKLOG. Para continuar con T-046 también se exige la prueba satisfactoria registrada por el dueño.
