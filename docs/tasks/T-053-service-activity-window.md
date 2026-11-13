---
id: T-053
status: done
priority: P1
size: M
milestone: M5
spec: S-111
depends_on: [T-052, T-051]
branch: codex/t-053-service-activity-window
role: implementer
executor: junie
pr: 56
---

# T-053 · Ventana diaria y autorización de la sonda

## Objetivo

Persistir la ventana del día y exponer su estado/control únicamente a la cuenta habilitada, con capacidad apagada por defecto.

Draft **solo por dependencias**: T-052 MERGED y conciliada; T-051 MERGED y conciliada. Contrato completo en S-111; al cumplirse las dependencias no se necesita otra sesión planner. Cada tarea/revisión usa sesión independiente.

## Alcance y decisiones resueltas

Fecha de servicio, pausa del día, start visit/resume idempotente y corte de medianoche. Crear V6 o siguiente libre, entidad/repositorio, servicio con Clock y controller. Configuración incompleta no derriba notas. No emitir HTTP saliente ni modificar Render.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-111](../specs/S-111-render-daily-availability.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
4. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

`db/migration/V6__create_service_awake_window.sql`; nuevo paquete `serviceactivity/` (persistence/application/web), `application.yaml`, `.env.example`, `SecurityConfig.java`; tests `ServiceActivityWindowTest` y `ServiceActivityApiIT`.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

Dos start simultáneos dejan una fila; visit respeta pausa, resume la levanta; 23:59/00:00 con Clock; fecha del cliente ignorada. Flag off y otra cuenta no acceden; 401/403/CSRF, cuerpo extra y UUID inválido. Readiness/login anónimo no activan.

Desde `server/`, Git Bash con JDK 21 y Docker Linux activo:

```bash
./mvnw -q verify -Dtest=ServiceActivityWindowTest -Dit.test=ServiceActivityApiIT -Djacoco.skip=true
```

Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

### Revisión independiente

**2026-11-12 · Revisión favorable de PR56, sin bloqueantes. Transición: `mergeable`.** Junie como reviewer en sesión nueva, distinta de la implementación, ejecutado con Claude Opus 5.5 (`claude-opus-5-5`) en Claude Code, app de escritorio; esfuerzo no expuesto. Git, `gh`, Git Bash, Maven Wrapper con JDK 21, Docker Desktop (motor Linux) y Node. Sin deploys, variables de Render ni HTTP saliente.

- Precondición: `gh pr view 56 --repo MatiasNicolasAcevedo/devnotes --json number,url,state,isDraft,headRefOid,baseRefName,mergeable,statusCheckRollup` → `OPEN`, no draft, base `main`, `MERGEABLE`; HEAD revisado `a044a977d29e80ad54cb52dc73f17318c356468b`, base `origin/main` `d722b0a82cfdfc01b6f97d26d7b4820eb8791606` (merge-base igual). [`verify-required` SUCCESS](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/43339374051/job/131603559554) sobre ese SHA; otro run del mismo SHA quedó `CANCELLED` por concurrencia y no cuenta como verde.
- Revisado en un worktree aislado y desacoplado del HEAD publicado; el checkout principal y su `trailer/` ajeno no se tocaron. Diff completo contra `origin/main`: 26 rutas, 22 técnicas.
- Contrato comprobado en el código: V6 con `id=1` sembrado, `CHECK (id = 1)`, par `active_date`/`active_until` coherente, `revision` y `consecutive_failures` no negativos y `last_result` en enum seguro, sin notas, URLs ni identidad. Día de servicio y corte desde `Clock` en `America/Argentina/Buenos_Aires`, medianoche siguiente exclusiva. `visit` idempotente, respeta la pausa del día y no reabre una secuencia detenida; `resume` explícito levanta pausa y fallos; `pause` por fecha de servicio. Inicio y pausa bajo `PESSIMISTIC_WRITE` dentro de la transacción. Body exacto `{mode}` con duplicados, miembros extra, tokens finales y no-texto rechazados; pausa sin body. Acceso comprobado antes de leer el body; flag apagado, owner id inválido y otra cuenta comparten `{available:false}` y el mismo 404 no-store. Owner id solo en forma canónica y nunca en logs ni `toString`. Cuatro rutas exactas en SecurityConfig antes de `denyAll`; CSRF por la configuración SPA existente. Sin `@Scheduled`, `TaskScheduler`, clientes HTTP, `@EnableScheduling`, cambios de Render, Docker, workflows ni dependencias.
- **Prueba dirigida**, desde `server/` en Git Bash: `./mvnw -q verify -Dtest=ServiceActivityWindowTest -Dit.test=ServiceActivityApiIT -Djacoco.skip=true`, exit 0: `ServiceActivityWindowTest` 40/40 y `ServiceActivityApiIT` 10/10 (reportes Surefire/Failsafe, 0 fallos, 0 omitidos), PostgreSQL real con Testcontainers. El log no contiene el UUID ficticio del dueño ni el valor inválido de configuración.
- Negativos por riesgo con mutantes temporales, fuente restaurada y `git status` limpio después de cada uno: `visit` sin respetar la pausa → `ServiceActivityWindowTest` 1/40 falla (`visitRespectsTodaysPauseAndOnlyResumeLiftsIt`). Sin lock (`findSingleton` en start/pause) → `ServiceActivityApiIT` 10/10 sigue verde. El lock está en el código y PostgreSQL lo recibe: `-Dit.test=ServiceActivityApiIT#simultaneousStartsLeaveOneRowAndOneActivation -Dlogging.level.org.hibernate.SQL=DEBUG` registró 12 `SELECT … FOR NO KEY UPDATE` sobre `service_awake_window` (4 pestañas × 3 rondas), 1/1 verde.
- Cierre desde la raíz del worktree: `node scripts/docs-check.mjs` OK (124 Markdown, 68 tareas, HANDOFF 22/22); `git diff --check origin/main...HEAD` exit 0; `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` → `policy=FULL`, `profile=STARTER`, 26 rutas, 22 técnicas. **FULL/STARTER DIFERIDO POR EL DUEÑO** según la [excepción I5](../TESTING.md#excepción-i5-del-2026-11-12): no se ejecutaron FULL, STARTER, tooling ni E2E. No se afirma cobertura total.
- Logs locales saneados en `.orchestrator/t053-review-*.log` del worktree (ignorado). Recursos propios: contenedores efímeros de Testcontainers retirados por Ryuk; no se usó el stack persistente del dueño.

**Observación no bloqueante O-1.** Evidencia: el mutante sin lock no hace fallar `simultaneousStartsLeaveOneRowAndOneActivation`, porque varios `visit` concurrentes convergen al mismo estado (`revision=1`) con o sin serialización. El lock existe y se emite, por eso no bloquea T-053. Corrección suficiente: cuando T-054 haga depender la sonda de la revisión de la ventana, sumar un IT que falle sin el lock (por ejemplo `pause` y `visit`/`resume` concurrentes, donde una actualización de fila completa perdería la pausa o la revisión). Condición de cierre: ese mutante falla en el IT de T-054.

Esta transición cambia HEAD: el veredicto `APROBADO` se publica en PR56 solo con `verify-required` SUCCESS sobre el HEAD nuevo, ligado a ese SHA y a la base. Después, merge elegible según [merger](../agents/merger.md).

### Implementación

**2026-11-12 · Implementación publicada, lista para revisión independiente.** Junie como implementer en sesión nueva, ejecutado con Claude Opus 5.5 (`claude-opus-5-5`) en Claude Code, app de escritorio; esfuerzo no expuesto. Git, `gh`, Git Bash, Maven Wrapper con JDK 21.0.9, Docker Desktop (motor Linux) y Node. Sin deploys, sin variables de Render, sin HTTP saliente propio de la aplicación.

Impacto: **datos** (migración V6 `service_awake_window`, fila singleton `id=1` sin notas, audio, URLs ni identidad); **API** nueva y privada bajo `/api/v1/service-activity` (`GET capabilities`, `GET` estado, `POST start` con body exacto `{mode:"visit"|"resume"}`, `POST pause` sin body), todas no-store; **permisos**: solo la cuenta local `DEVNOTES_KEEP_AWAKE_OWNER_ID` con `DEVNOTES_KEEP_AWAKE_ENABLED=true`, rutas exactas en SecurityConfig, CSRF en mutaciones. Sin cambios de UI ni de comportamiento existente; con el flag apagado (por defecto) nadie puede activar nada.

- Precondición: `gh pr view 54` confirmó PR54 `MERGED`; [T-051 conciliada](T-051-render-follow-up.md#conciliación) como `done` en `321cd67`. Rama desde `main` `d722b0a82cfdfc01b6f97d26d7b4820eb8791606`. Código publicado en `eb402ed`; [PR56](https://github.com/MatiasNicolasAcevedo/devnotes/pull/56).
- Decisiones dentro del contrato: V6 era la siguiente versión libre; fila singleton sembrada por la migración y `SELECT … FOR UPDATE` para serializar pestañas; día de servicio y corte con `Clock` en `America/Argentina/Buenos_Aires`, medianoche exclusiva. `visit` respeta la pausa del día y no reabre una secuencia detenida; `resume` levanta la pausa y reinicia fallos; `pause` limpia la ventana del día. Otra cuenta o flag apagado: capabilities `{available:false}` y 404 seguro en estado/start/pause, comprobado antes de leer el body. Owner id inválido con flag encendido: advertencia sin valores en el log, capacidad no disponible, notas intactas. `nextAttemptAt` queda `null` hasta [T-054](T-054-service-activity-scheduler.md); la validación del origen público entra con la sonda en esa tarea. `docker-compose.yml` no reenvía las variables nuevas: con su valor por defecto apagado no hace falta; si el ensayo local las necesita, lo decide T-054/T-056.
- **Prueba dirigida**, desde `server/` en Git Bash: `./mvnw -q verify -Dtest=ServiceActivityWindowTest -Dit.test=ServiceActivityApiIT -Djacoco.skip=true`, exit 0: `ServiceActivityWindowTest` 40/40 y `ServiceActivityApiIT` 10/10 con PostgreSQL 18.6 real (Testcontainers). Cubre: dos y cuatro starts simultáneos en tres rondas dejan una fila y revisión 1; `visit` idempotente; pausa respetada por otra pestaña y levantada solo por `resume`; 23:59/00:00 de Buenos Aires con fecha UTC ya cambiada; cuerpos con fecha, URL, `activeUntil`, miembro extra o duplicado, modo inválido, JSON roto y body en pausa → 400; `text/plain` → 415; sin token o con token falso → 403; rutas y métodos no contratados → 403; otra cuenta → `{available:false}` y 404 aun con body inválido; anónimo → 401; readiness, login y GET no activan; contexto real adicional sobre la misma base con flag apagado, UUID inválido y UUID vacío: el dueño queda denegado y las notas responden 200.
- Negativos verificados con un mutante temporal (autorización que acepta cualquier cuenta): `ServiceActivityWindowTest` falló 3/40; fuente restaurada.
- Pruebas adicionales por riesgo, no FULL: `./mvnw -q test -Djacoco.skip=true` 469/469; `ReferenceItemMigrationIT` 1/1 y `OpenApiContractIT` 5/5 con `-Dit.test=<clase> -Dtest=NoSuchTest -Dsurefire.failIfNoSpecifiedTests=false` (esa bandera solo salta los unitarios en esas corridas auxiliares; el comando de la tarea no la usa). `spotless:check` OK.
- Cierre desde la raíz: `git diff --check origin/main...HEAD` OK; `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`: `policy=FULL`, `profile=STARTER`, 22 rutas técnicas. `node scripts/docs-check.mjs` en un worktree limpio del HEAD (el checkout principal contiene `trailer/`, ajeno y sin versionar, que docs-check rechaza). **FULL/STARTER DIFERIDO POR EL DUEÑO** según la [excepción I5](../TESTING.md#excepción-i5-del-2026-11-12): no se ejecutaron FULL, STARTER, tooling ni E2E. No se afirma cobertura total.
- Logs locales saneados en `.orchestrator/t053-*.log` (ignorado). Recursos propios: contenedores efímeros de Testcontainers, retirados por Ryuk; no se usó el stack persistente del dueño.
- Siguiente: revisión independiente de PR56 en sesión nueva. No ejecutar T-054 antes de PR56 MERGED y T-053 conciliada.

### Correcciones significativas

| Problema / causa | Arreglo | Prueba / SHA |
|---|---|---|
| El contexto adicional del IT (flag apagado) no podía iniciar sesión: `SpringApplicationBuilder.properties()` tiene precedencia mínima y `application-test.yaml` imponía otro issuer OIDC | Pasar la configuración como argumentos de línea de comandos | `ServiceActivityApiIT` 10/10 · `eb402ed` |
| `SecurityConfigTest` (13 errores): `@WebMvcTest` carga todos los controladores y faltaba el servicio nuevo | `@MockitoBean ServiceActivityService`, igual que las otras features | `./mvnw -q test` 469/469 · `eb402ed` |
| `ReferenceItemMigrationIT` fija las versiones aplicadas y la última era V5 | Esperar V1…V6 | 1/1 · `eb402ed` |

## Cierre y siguiente tarea

No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-054 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.

## Conciliación

**2026-11-12 · Conciliada como `done` en la rama de T-054.** Junie como implementer de T-054, ejecutado con Claude Opus 5.5 (`claude-opus-5-5`) en Claude Code, app de escritorio; esfuerzo no expuesto. `gh pr view 56 --repo MatiasNicolasAcevedo/devnotes --json number,url,state,mergedAt,mergeCommit,headRefOid,baseRefName` salió con código 0: [PR56](https://github.com/MatiasNicolasAcevedo/devnotes/pull/56) `MERGED` contra `main`, squash `29306a6ca54d73cb3ba8a34e8700b7e419e9c427`, `mergedAt` `2026-11-13T00:57:08Z` (2026-11-12 21:57 en Buenos Aires). HEAD aprobado y mergeado `f8cbabccaf3a970d00df04bd2999ce1c997ea87d`, igual al del veredicto `APROBADO` publicado en el PR, con [`verify-required` SUCCESS](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/43340956143/job/131608830849). Sin deploy ni cambio de variables. La observación O-1 pasa a [T-054](T-054-service-activity-scheduler.md).
