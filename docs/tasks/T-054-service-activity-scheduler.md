---
id: T-054
status: in_review
priority: P1
size: M
milestone: M5
spec: S-111
depends_on: [T-053]
branch: codex/t-054-service-activity-scheduler
role: implementer
executor: junie
pr: 57
---

# T-054 · Sonda interna cancelable y acotada

## Objetivo

Programar una sola sonda cada diez minutos dentro de una ventana vigente y conservar el resultado real de cada intento.

Draft **solo por dependencias**: T-053 MERGED y conciliada. Contrato completo en S-111; al cumplirse las dependencias no se necesita otra sesión planner. Cada tarea/revisión usa sesión independiente.

## Alcance y decisiones resueltas

TaskScheduler one-shot cancelable, recuperación de ventana y transporte con límite de tiempo/cuerpo. Destino fijo desde APP_PUBLIC_URL, sin redirect/cookies ni URL del request. Tres fallos detienen la secuencia. Producción permanece desactivada; no afirmar eficacia en Render.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-111](../specs/S-111-render-daily-availability.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
4. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

Nuevos `serviceactivity/application/ServiceActivityScheduler.java`, `ServiceActivityProbe.java`, configuración y enlace con servicio de ventana; `ServiceActivitySchedulerTest`, `ServiceActivityProbeTest`, `ServiceActivitySchedulerIT`.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

Clock/scheduler controlados, cero esperas de diez minutos: medianoche, pausa, callback viejo, restart vencido/vigente, no solapamiento ni catch-up. Destinos inválidos/redirect; 200 JSON UP frente a HTML, 5xx, timeout y cuerpo excesivo. Persistencia en PostgreSQL.

Desde `server/`, Git Bash con JDK 21 y Docker Linux activo:

```bash
./mvnw -q verify -Dtest=ServiceActivitySchedulerTest,ServiceActivityProbeTest -Dit.test=ServiceActivitySchedulerIT -Djacoco.skip=true
```

Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

### Corrección R1 · lista para revisión R2

**2026-11-12 · Junie como implementer en sesión nueva**, distinta de la revisión, ejecutado con Claude Opus 5.5 (`claude-opus-5-5`) en Claude Code, app de escritorio; esfuerzo no expuesto. Git, `gh`, Git Bash, Maven Wrapper con JDK 21.0.9, Docker Desktop (motor Linux 28.5.1) y Node 24.21.0. Impacto: **comportamiento** corregido dentro del contrato (una lectura vieja ya no cancela la secuencia de una ventana nueva; literales IPv6 con IPv4 embebida no pública dejan la sonda sin configurar); sin cambios de API, permisos, datos, migraciones, dependencias, configuración ni UI.

- Precondición: `gh pr view 57 …` → OPEN, no draft, base `main` `29306a6`, `headRefOid` `445ea90` con el comentario CAMBIOS REQUERIDOS R1, MERGEABLE, `verify-required` SUCCESS. Rama local avanzada por fast-forward a `445ea90`; `trailer/` no se tocó.
- **B-1, rojo primero:** `aStaleReadAppliedAfterAResumeNeitherCancelsTheNewSequenceNorAnnouncesAPhantomAttempt` en `ServiceActivitySchedulerTest` (visit → pause → hilo `stale-reader` cuyo `findSingleton` devuelve una copia de la fila pausada y se bloquea → `resume` + `reconcile` dejan 1 tarea → se libera el hilo viejo). Sin la corrección: `./mvnw -q test -Dtest=ServiceActivitySchedulerTest -Djacoco.skip=true` exit 1, 1/20 falla con `Expected size: 1 but was: 0`. Arreglo: `align` descarta toda instantánea con revisión menor que `knownRevision` (la revisión de la fila solo crece), así no retrocede la revisión conocida ni cancela el disparo nuevo; `expectedAttempt` vuelve a coincidir con la tarea planificada. El test además ejecuta ese disparo y comprueba el envío.
- **Fixture del IT:** `ServiceActivitySchedulerIT` reiniciaba `revision = 0` entre tests con el scheduler compartido del contexto; con la corrección esa fila «retrocedida» se descartaba (6 fallos y 1 error). El reinicio ahora conserva la monotonía de producción (`revision = revision + 1`) y las tres aserciones absolutas de revisión pasan a ser relativas. `ServiceActivityApiIT` también reinicia a 0 pero no ejecuta tareas y queda verde sin cambios.
- **O-1, rojo primero:** siete negativos nuevos en `ServiceActivityProbeTest` (`[::127.0.0.1]`, `[::a9fe:a9fe]`, `[::10.0.0.1]`, `[64:ff9b::a9fe:a9fe]`, `[64:ff9b::127.0.0.1]`, `[64:ff9b::192.168.1.10]`, `[64:ff9b::100.64.0.1]`) fallaron 7/50 antes del arreglo. Arreglo: los literales `::/96` y `64:ff9b::/96` se juzgan por la IPv4 embebida con las mismas reglas que una IPv4 literal; positivo `[64:ff9b::5db8:d70e]` (IPv4 pública) sigue aceptado. Sin DNS.
- Código en `540887687dd36cc33a54b225e4e0d0e0e0dd6259`.
- **Prueba dirigida**, desde `server/`: `./mvnw -q verify -Dtest=ServiceActivitySchedulerTest,ServiceActivityProbeTest -Dit.test=ServiceActivitySchedulerIT -Djacoco.skip=true` → exit 0: `ServiceActivitySchedulerTest` 20/20, `ServiceActivityProbeTest` 50/50 y `ServiceActivitySchedulerIT` 10/10 con PostgreSQL real; 0 fallos, errores y omitidos según los reportes.
- **IT por riesgo**, no FULL: `./mvnw -q verify -Djacoco.skip=true -Dit.test='ServiceActivitySchedulerIT,ServiceActivityApiIT,ServerApplicationIT,OpenApiContractIT,PublicOriginIT,ReadinessIT,ReferenceItemMigrationIT'` → exit 0: 540/540 unitarios y 46/46 IT (`ServiceActivityApiIT` 10/10); `spotless:check` OK dentro de `verify`. Los logs no contienen el UUID ficticio del dueño, el destino ni `db.internal`.
- **Mutantes** temporales sobre `5408876`, cada uno restaurado con `git checkout` (árbol limpio después): sin el descarte de lecturas viejas → `ServiceActivitySchedulerTest` 1/20 falla (el test nuevo); `plan` sin corte de medianoche → 1/20; `Redirect.NORMAL` → `ServiceActivityProbeTest` 2/50; sin `@Lock(PESSIMISTIC_WRITE)` → `ServiceActivitySchedulerIT` 3/10 (los tres casos de fila retenida). Corridas de mutantes con `-Dspotless.check.skip=true` solo para no mezclar formato.
- Cierre desde la raíz: `git diff --check origin/main...HEAD` exit 0; `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` → `policy=FULL`, `profile=APPLICATION`, 12 rutas técnicas; `node scripts/docs-check.mjs` en worktree limpio del HEAD documental. **FULL/STARTER DIFERIDO POR EL DUEÑO** según la [excepción I5](../TESTING.md#excepción-i5-del-2026-11-12): no se ejecutaron FULL, STARTER, E2E, deploys, variables de Render ni HTTP saliente real.
- Logs locales saneados en `.orchestrator/t054-r1-*.log` y `.orchestrator/t054-b1-*.log`/`t054-o1-*.log` (ignorados). Recursos propios: contenedores efímeros de Testcontainers retirados por Ryuk.
- Siguiente: revisión R2 independiente de PR57 en sesión nueva, **última ronda permitida**. No ejecutar T-055.

### Revisión R1 · CAMBIOS REQUERIDOS

**2026-11-12 · Junie como reviewer en sesión nueva**, distinta de la implementación, ejecutado con Claude Opus 5.5 (`claude-opus-5-5`) en Claude Code, app de escritorio; esfuerzo no expuesto. Git, `gh`, Git Bash, Maven Wrapper con JDK 21.0.9, Docker Desktop (motor Linux 28.5.1), Node y `jshell`. Impacto propio: solo esta transición documental de T-054/STATUS; sin cambios de comportamiento, API, permisos, datos ni UI. Ronda 1 de 2.

Precondición: `gh pr view 57 …` → OPEN, no draft, base `main` `29306a6ca54d73cb3ba8a34e8700b7e419e9c427`, `headRefOid` `3c7e090fcf4cce191cb2a269dbd87b90c491d9cd`, MERGEABLE; `verify-required` SUCCESS con `head_sha` exacto ([run 43346709064](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/43346709064/job/131627692601)). Revisión en worktree aislado `--detach` de ese SHA; `trailer/` del checkout principal no se tocó. Diff completo contra `origin/main` leído: 16 rutas, sin `pom.xml`, `.env*`, cliente, workflows ni scripts.

Comprobado sin hallazgos: un único `ThreadPoolTaskScheduler` propio (bean `TaskScheduler`, Boot conserva su executor) y solo `schedule(Runnable, Instant)` con `ScheduledFuture` cancelable; sin `@EnableScheduling`, `@Scheduled` ni tareas periódicas. Primer intento inmediato tras activación y siguiente a 10 min del envío; `plan` no agenda en o después de `activeUntil` y el tick re-lee la ventana (flag, revisión, pausa, fallos, corte) antes de enviar. Recuperación en `ApplicationReadyEvent` con un único slot `max(ahora, lastAttemptAt + 10 min)`, sin catch-up ni reanudar ventanas vencidas, pausadas o detenidas. `recordAttempt` bajo `lockSingleton` y solo para la revisión capturada; tres fallos detienen hasta `resume`. Destino `APP_PUBLIC_URL` + `/actuator/health/readiness`; loopback solo con `test`/`e2e` sin `google`. Transporte JDK: connect 5 s, plazo total 15 s, cuerpo ≤ 1 KiB, `Redirect.NEVER`, sin cookie handler ni authenticator; solo 200 JSON objeto con `status:"UP"` es `up`. Logs del scheduler y de configuración sin owner id, destino ni excepción; sin deploys ni variables de Render.

Pruebas del reviewer, desde `server/` en Git Bash:

- `./mvnw -q verify -Dtest=ServiceActivitySchedulerTest,ServiceActivityProbeTest -Dit.test=ServiceActivitySchedulerIT -Djacoco.skip=true` → exit 0: `ServiceActivityProbeTest` 43/43, `ServiceActivitySchedulerTest` 19/19 y `ServiceActivitySchedulerIT` 10/10 con PostgreSQL real; 0 fallos, errores y omitidos. La salida no contiene el UUID ficticio del dueño, el destino ni `db.internal`.
- **Cierre de O-1 de T-053:** mutante temporal sin `@Lock(PESSIMISTIC_WRITE)` en `lockSingleton` → `ServiceActivitySchedulerIT` exit 1, 3/10 fallos (`aResumeWhileAPauseHoldsTheRow…`, `aPauseWhileAResumeHoldsTheRow…`, `aProbeResultArrivingWhileAPauseHoldsTheRow…`, este último por estado). O-1 queda **cerrada**. Fuente restaurada.
- Mutantes propios, restaurados: `plan` sin corte de medianoche → `ServiceActivitySchedulerTest` 1/19 falla; `Redirect.NORMAL` → `ServiceActivityProbeTest` 2/43 fallan.
- `jshell` sobre `ServiceActivityProbe.target(…, false)`: rechaza `169.254.169.254`, `[fe80::1]`, `[::ffff:127.0.0.1]`, `[::ffff:a9fe:a9fe]`; acepta `devnotes.onrender.com`, `[::127.0.0.1]` y `[64:ff9b::a9fe:a9fe]` (ver O-1).

Cierre desde la raíz del worktree: `node scripts/docs-check.mjs` OK (124 Markdown, 68 tareas, HANDOFF 22/22); `git diff --check origin/main...HEAD` exit 0; `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` → `policy=FULL`, `profile=APPLICATION`, 12 rutas técnicas. **FULL/STARTER DIFERIDO POR EL DUEÑO** según la [excepción I5](../TESTING.md#excepción-i5-del-2026-11-12): no se ejecutaron FULL, STARTER, E2E, deploys, variables de Render ni HTTP saliente real.

**B-1 (bloqueante) · Una lectura vieja aplicada después de una alineación nueva cancela la secuencia de la ventana reanudada.** Evidencia: `ServiceActivityScheduler.alignWithWindow` lee la fila con `read()` fuera de `monitor` y `align` la aplica sin compararla con `knownRevision`. Si una lectura tomada antes de que se confirme un cambio (p. ej. el `reconcile()` final de un tick tras un intento descartado o un tercer fallo, o el `afterCommit` de una pausa en otra pestaña) se aplica después de la alineación de ese cambio (`resume`), `align` retrocede `knownRevision` a la revisión vieja y, como esa ventana no corre, `cancel()` elimina el disparo de la ventana nueva. Queda una ventana vigente sin intentos hasta otro cambio o un reinicio, y `expectedAttempt` sigue anunciando `nextAttemptAt` = ahora (revisión conocida distinta). Contradice S-111: el callback viejo no debe sobrescribir el estado de la ventana nueva y el reintento explícito debe reabrir la secuencia. Reproducción determinista con un test temporal no versionado en `ServiceActivitySchedulerTest` (visit → pause → un hilo cuyo `findSingleton` devuelve una copia de la fila pausada y se bloquea → `resume` + `reconcile` dejan 1 tarea → al liberar el hilo viejo): `Expected size: 1 but was: 0`, con `window().isRunning(now)` verdadero. Corrección suficiente: descartar en `align` toda instantánea con revisión menor que `knownRevision` (la revisión de la fila es monótona) u otra ordenación equivalente, sin anunciar `nextAttemptAt` sin disparo planificado. Condición observable de cierre: test de regresión versionado equivalente al descrito, rojo sin la corrección y verde con ella; el comando dirigido verde con cantidad ejecutada distinta de cero; los mutantes de esta revisión siguen fallando.

**O-1 (no bloqueante) · Literales IPv6 con IPv4 embebida pasan como públicos.** `[::127.0.0.1]` (IPv4-compatible) y `[64:ff9b::a9fe:a9fe]` (NAT64 hacia `169.254.169.254`) se aceptan; `PublicOrigin` solo exige HTTPS. Riesgo bajo: el origen lo fija el operador. Corrección sugerida, opcional en esta ronda: evaluar la IPv4 embebida de `::/96` y `64:ff9b::/96` (o rechazar literales IPv6 no globales) con negativos en `ServiceActivityProbeTest`. No condiciona la aprobación.

Siguiente: sesión nueva de Junie como implementer en la misma rama/PR para B-1 (y O-1 si cabe); después, revisión R2 en otra sesión nueva. No ejecutar T-055.

### Implementación

**2026-11-12 · Implementación publicada, lista para revisión independiente.** Junie como implementer en sesión nueva, ejecutado con Claude Opus 5.5 (`claude-opus-5-5`) en Claude Code, app de escritorio; esfuerzo no expuesto. Git, `gh`, Git Bash, Maven Wrapper con JDK 21, Docker Desktop (motor Linux 28.5.1) y Node. Sin deploys, sin variables de Render y sin HTTP saliente real: el transporte solo habló con un servidor HTTP local del propio test.

Impacto: **comportamiento** nuevo detrás del interruptor apagado por defecto (secuencia de sonda); **permisos**: `capabilities` y la API de la ventana pasan a requerir además un origen público válido, y la cuenta habilitada sigue siendo la única; **API**: mismo contrato, `nextAttemptAt` deja de ser siempre `null`; **datos**: sin migración, la fila V6 ahora guarda `last_attempt_at`, `last_success_at`, `consecutive_failures` y `last_result`; sin cambios de UI ni de variables (`.env.example` sin cambios).

- Precondición: `gh pr view 56 --repo MatiasNicolasAcevedo/devnotes --json number,url,state,mergedAt,mergeCommit,headRefOid,baseRefName` → `MERGED`, `headRefOid` `f8cbabc` igual al del veredicto `APROBADO`. [T-053 conciliada](T-053-service-activity-window.md#conciliación) en `770d4c7`. Rama desde `main` `29306a6ca54d73cb3ba8a34e8700b7e419e9c427`; código en `bd8137c`; [PR57](https://github.com/MatiasNicolasAcevedo/devnotes/pull/57).
- Decisiones dentro del contrato: `TaskScheduler` propio (`ThreadPoolTaskScheduler` de un hilo, bean `serviceActivityTaskScheduler` declarado como `TaskScheduler` para no reemplazar el `applicationTaskExecutor` de Boot), solo `schedule(Runnable, Instant)`; sin `@EnableScheduling` ni tareas periódicas. Primer intento inmediato tras una activación nueva; siguientes a 10 min del envío anterior; ninguno en o después de `activeUntil`. Recuperación al arrancar (`ApplicationReadyEvent`): un solo intento en `max(ahora, lastAttemptAt + 10 min)`, sin catch-up. El envío ocurre fuera de transacción; el resultado se guarda con `lockSingleton` y solo si la revisión coincide con la capturada al programar (`recordAttempt`), sin subir la revisión. Tras cada `start`/`pause` confirmado, `afterCommit` alinea la secuencia en transacciones `REQUIRES_NEW`. DB no disponible: no se envía, log sin detalles y un único re-chequeo a 10 min. Ni la alineación ni el tick lanzan: una capacidad opcional no derriba el arranque ni convierte en error una pausa ya confirmada. Destino `APP_PUBLIC_URL` + `/actuator/health/readiness`, validado sin DNS: HTTPS y host público; se rechazan credenciales, query, fragmento, ruta, loopback, privadas, link-local, CGNAT, multicast/reservadas, ULA y nombres internos (`localhost`, `.local`, `.internal`, `.home.arpa`, `.lan`, una sola etiqueta). HTTP loopback se acepta solo con perfiles OIDC locales (`test`/`e2e`), nunca con `google`. Origen inválido con el flag encendido: capacidad no disponible, advertencia sin valores y sin red. Resultados: 200 JSON `status:"UP"` → `up`; no-200 (incluidos 3xx) → `http_error`; 200 HTML/JSON distinto/cuerpo > 1 KiB → `invalid_response`; timeout → `timeout`; conexión rechazada u otro fallo → `unavailable`.
- **Prueba dirigida**, desde `server/` en Git Bash: `./mvnw -q verify -Dtest=ServiceActivitySchedulerTest,ServiceActivityProbeTest -Dit.test=ServiceActivitySchedulerIT -Djacoco.skip=true`, exit 0: `ServiceActivitySchedulerTest` 19/19, `ServiceActivityProbeTest` 43/43 y `ServiceActivitySchedulerIT` 10/10 con PostgreSQL 18.6 real (Testcontainers); 0 fallos y 0 omitidos según los reportes. Scheduler, Clock y transporte controlados; ninguna espera de diez minutos. Cubre medianoche exclusiva (23:45/23:55 sin 00:05 y tarea tardía a 00:00 sin envío), pausa con cancelación y callback viejo descartado, reanudación durante una petición en vuelo, nuevo día, tres fallos y reapertura solo por `resume`, éxito que reinicia fallos, reinicio vigente/vencido/pausado/detenido sin catch-up, varias pestañas y alineaciones sin solapamiento, flag/owner/origen inválidos sin leer DB ni enviar, DB caída sin envío ni detalles en el log, apagado. Transporte contra servidor local: 200 UP, cookies/Authorization/CSRF ausentes aun tras `Set-Cookie`, DOWN/HTML/array/número/vacío, 503/404, 302 sin seguir, respuesta lenta y cuerpo goteando cortados por el plazo, cuerpo de 1025 B o infinito inválido y exacto de 1024 B válido, puerto cerrado, límites de producción.
- **O-1 de T-053**: tres IT donde una transacción retiene la fila de la ventana (escrita y no confirmada) mientras otro hilo actúa, detectando la espera en `pg_stat_activity`: `pause` frente a `resume`, `resume` frente a `pause` y resultado de sonda frente a `pause`. Mutante temporal sin `@Lock` en `lockSingleton` → `ServiceActivitySchedulerIT` falla 3/10; en el caso de la sonda falla por estado (`paused_date` quedó `null`: el resultado viejo deshizo la pausa). Fuente restaurada.
- Otros mutantes temporales sobre los unitarios, cada uno restaurado: `recordAttempt` sin comparar revisión → 2 fallos; plan sin corte de medianoche → 1; envío sin re-chequear la ventana → 1; cualquier 200 como `up` → 1; catch-up en la recuperación → 1; loopback aceptado como público → 3.
- Pruebas adicionales por riesgo, no FULL: `./mvnw -q verify -Djacoco.skip=true -Dit.test='ServiceActivitySchedulerIT,ServiceActivityApiIT,ServerApplicationIT,OpenApiContractIT,PublicOriginIT,ReadinessIT,ReferenceItemMigrationIT'`, exit 0: 532/532 unitarios (incluidos `ServiceActivityWindowTest` 41/41) y 46/46 IT (`ServiceActivityApiIT` 10/10, `ServerApplicationIT` 4/4, `OpenApiContractIT` 5/5, `PublicOriginIT` 14/14, `ReadinessIT` 2/2, `ReferenceItemMigrationIT` 1/1, `ServiceActivitySchedulerIT` 10/10); `spotless:check` OK dentro de `verify`. Los logs no contienen el UUID ficticio del dueño, el destino ni las coordenadas simuladas de DB.
- Cierre desde la raíz: `git diff --check` OK; `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` → `policy=FULL`, `profile=APPLICATION`, 12 rutas técnicas. `node scripts/docs-check.mjs` en un worktree limpio del HEAD (el checkout principal contiene `trailer/`, ajeno y sin versionar, que docs-check rechaza). **FULL/STARTER DIFERIDO POR EL DUEÑO** según la [excepción I5](../TESTING.md#excepción-i5-del-2026-11-12): no se ejecutaron FULL, STARTER, tooling ni E2E. No se afirma cobertura total.
- Límites: alcance de una instancia, como Render Free; la validación del destino no resuelve DNS (origen fijado por el operador, no por el usuario). Eficacia en Render no medida ni afirmada: corresponde al ensayo autorizado de [T-056](T-056-service-activity-journey.md).
- Logs locales saneados en `.orchestrator/t054-*.log` (ignorado). Recursos propios: contenedores efímeros de Testcontainers retirados por Ryuk; no se usó el stack persistente del dueño.
- Siguiente: revisión independiente de PR57 en sesión nueva. No ejecutar T-055 antes de PR57 MERGED y T-054 conciliada.

### Correcciones significativas

| Problema / causa | Arreglo | Prueba / SHA |
|---|---|---|
| `ServiceActivityApiIT` 10 errores: la recuperación en `ApplicationReadyEvent` leía el `Clock` mockeado antes de su stub y la excepción tiraba el contexto; riesgo real de que una capacidad opcional impidiera arrancar | Alineación y tick nunca lanzan (log sin detalles); con el interruptor apagado ni siquiera leen la DB | `ServiceActivityApiIT` 10/10 y `anUnexpectedFailureNeverEscapesStartupOrAWindowChange` · `bd8137c` |
| `ServiceActivityApiIT` habría emitido sondas reales a loopback al activar la ventana | Scheduler manual que nunca ejecuta y transporte que falla si se usa | `ServiceActivityApiIT` 10/10 · `bd8137c` |
| R1 B-1: `align` aplicaba una instantánea leída fuera del monitor sin compararla con `knownRevision`; una lectura vieja posterior a la alineación de un `resume` retrocedía la revisión conocida, cancelaba el disparo nuevo y `nextAttemptAt` anunciaba un intento inexistente | `align` descarta instantáneas con revisión menor que `knownRevision` (revisión monótona) | Rojo 1/20 → `aStaleReadAppliedAfterAResume…` verde; dirigido 20 + 50 + 10 IT · `5408876` |
| Con B-1 corregido, `ServiceActivitySchedulerIT` reiniciaba `revision = 0` entre tests y el scheduler compartido descartaba la ventana (6 fallos, 1 error) | El reinicio conserva la monotonía (`revision + 1`); aserciones de revisión relativas | `ServiceActivitySchedulerIT` 10/10 · `5408876` |
| R1 O-1: literales `::/96` y `64:ff9b::/96` con IPv4 embebida no pública se aceptaban como públicos | Se juzgan por la IPv4 embebida | Rojo 7/50 → `ServiceActivityProbeTest` 50/50 · `5408876` |

## Cierre y siguiente tarea

No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-055 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.
