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

## Cierre y siguiente tarea

No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-055 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.
