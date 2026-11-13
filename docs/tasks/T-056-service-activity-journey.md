---
id: T-056
status: in_progress
priority: P1
size: M
milestone: M5
spec: S-111
depends_on: [T-055]
branch: codex/t-056-service-activity-journey
role: implementer
executor: frontier
pr: null
---

# T-056 · Validación local y entrega medible de la sonda

## Objetivo

Entregar evidencia local del ciclo diario y protocolo reproducible para decidir la eficacia de la sonda en Render.

[T-055 MERGED y conciliada](T-055-service-activity-client.md#conciliación). Contrato completo en S-111. Cada tarea/revisión usa sesión independiente.

## Alcance y decisiones resueltas

Recorrido HTTP/PostgreSQL con dos actores y pruebas de interacción de UI. Separar veredicto local y remoto: falta de autorización de deploy deja ensayo externo pendiente sin bloquear S-109. Solo con autorización SHA/ventana, aplicar control/ensayo S-111 sin pings de observación en silencios.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-111](../specs/S-111-render-daily-availability.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. [client/AGENTS](../../client/AGENTS.md).
4. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
5. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

Nuevo `server/src/test/java/com/example/devnotes/serviceactivity/ServiceActivityJourneyIT.java`; `client/src/features/serviceActivity/ServiceActivityJourney.test.tsx`; `docs/DEPLOYMENT.md` y esta tarea. Sin scheduler externo ni cambios del harness E2E.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

API real/DB conserva ventana al reconstruir scheduler: pausa/reinicio/corte/autorización. UI presenta resultados y errores sin prometer disponibilidad. Fixtures solo; UP final no demuestra continuidad; evidencia remota insuficiente = inconcluso.

Desde `server/`, Git Bash con JDK 21 y Docker Linux activo:

```bash
./mvnw -q verify -Dtest=ServiceActivitySchedulerTest -Dit.test=ServiceActivityJourneyIT -Djacoco.skip=true
```

Desde `client/`: `npm test -- --run src/features/serviceActivity/ServiceActivityJourney.test.tsx`.

Para cambios client, desde `client/`: `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build`. Son verificaciones estáticas/dirigidas; no ejecutar `npm run verify` como sustitución del gate aplazado.

Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

**2026-11-13 · Frontera en rol implementer**, Codex de escritorio, PowerShell, Git Bash, Git y gh. Variante del modelo y esfuerzo sin verificar. Ejecutor según [AUTONOMY](../AUTONOMY.md#continuidad-con-frontera-desde-el-2026-11-13). Impacto: pruebas de comportamiento HTTP, permisos, persistencia y UI existentes, más protocolo operativo. Fuentes de producción, contrato API, permisos, migraciones y UI sin cambios.

Base `origin/main` verificada en `c95f81408a3612e5626a3da2ebefc870bb23d119`. T-055 conciliada en `ac5cd3c`. Worktree aislado en `.orchestrator/t-056/`; checkout principal y `trailer/` preservados. Se confirmó por etiqueta exacta el retiro de los recursos efímeros de PostgreSQL y la salida de Ryuk. Las redes y volúmenes históricos ajenos con prefijo `starter-e2e-` quedaron intactos. Logs locales ignorados bajo `.orchestrator/t-056-logs/`.

### Resultado local

- `./mvnw -q verify -Dtest=ServiceActivitySchedulerTest -Dit.test=ServiceActivityJourneyIT -Djacoco.skip=true` → exit 0, `ServiceActivitySchedulerTest` 20/20 y `ServiceActivityJourneyIT` 1/1, sin fallos ni omitidos, Spotless OK. HTTP real y dos actores OIDC ficticios en loopback. PostgreSQL 18.6 en Testcontainers y un segundo contexto Spring sobre la misma base. Se comprobó la pausa persistida, la reanudación explícita, la recuperación del único disparo, la persistencia de UP y timeout, y un callback tardío que no envía a las 00:00 exactas. Clock, programación y transporte controlados. Reportes Surefire/Failsafe en `server/target/` y salida en `backend-final.log`.
- `npm test -- --run src/features/serviceActivity/ServiceActivityJourney.test.tsx` → exit 0, 2/2. Interacción desde el menú de cuenta, última respuesta, aviso sobre reinicios, pausa fallida y reintento explícito, reanudación, indicador Online independiente y menú de la otra cuenta. API simulada con MSW.
- `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build` → exit 0. Vite emitió el aviso de tamaño de chunks.
- **FULL/STARTER DIFERIDO POR EL DUEÑO.** Sin `npm run verify`, E2E ni tráfico HTTP saliente real de la aplicación.

### Correcciones de la verificación

| Problema y causa | Arreglo | Prueba |
|---|---|---|
| `npm ci` no resolvió el registro desde el sandbox | Repetir con acceso de red en el worktree, desde el lockfile | Exit 0, 384 paquetes |
| Maven exit 1 por formato del nuevo Java, con 21 casos verdes | `./mvnw -q spotless:apply` | Mismo Maven dirigido con exit 0 |

### Resultado en Render

**Pendiente de autorización expresa sobre SHA y ventana.** El [protocolo de medición](../DEPLOYMENT.md#ensayo-de-la-sonda-interna-en-render-free) fija control, ensayo, evidencia y cierre. Sin deploy ni cambios de variables. La evidencia local permite pasar a revisión independiente con la eficacia remota pendiente.

## Cierre y siguiente tarea

No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-057 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.
