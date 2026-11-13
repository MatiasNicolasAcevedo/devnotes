---
id: T-053
status: in_review
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
