---
id: T-056
status: done
priority: P1
size: M
milestone: M5
spec: S-111
depends_on: [T-055]
branch: codex/t-056-service-activity-journey
role: reviewer
executor: frontier
pr: 59
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

### Entrega para revisión

[PR59](https://github.com/MatiasNicolasAcevedo/devnotes/pull/59) contra `main`. Las fuentes dirigidas corresponden al commit técnico `4b84676755ea0184cfec0506ad6b1337d5f0e081`; el traspaso posterior solo cambia Markdown. `node scripts/docs-check.mjs` y `git diff --check` → exit 0. `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` → exit 0, `policy=FULL`, `profile=APPLICATION`, 2 rutas técnicas. La excepción I5 conserva el diferimiento. Consultar el HEAD vigente y su check `verify-required` en el PR.

### Revisión independiente R1

**2026-11-13 · Frontera como reviewer en sesión independiente**, Codex de escritorio, PowerShell, Git Bash, Git, `gh`, Docker Linux, Java 21, Node 24.21.0 y npm 11.19.0. Variante del modelo y esfuerzo sin verificar. El diff agrega dos archivos de pruebas y actualiza documentación. Las fuentes de producción y los contratos de API, permisos, datos y UI conservan su comportamiento.

[PR59](https://github.com/MatiasNicolasAcevedo/devnotes/pull/59) abierto y listo para revisión contra `main`, con HEAD de entrada `71b633cfa89ae6d32e50bf1eea208c75b8cd8d73` y base publicada `c95f81408a3612e5626a3da2ebefc870bb23d119`, que coincide con el squash de PR58. [`verify-required` SUCCESS del HEAD de entrada](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/43523478310/job/132223355764). Sin hilos de revisión abiertos. Las fuentes técnicas coinciden con `4b84676755ea0184cfec0506ad6b1337d5f0e081`. El veredicto canónico queda en el PR, ligado al HEAD documental publicado y a la base.

- **HTTP y PostgreSQL.** Desde `server/`, `./mvnw -q verify -Dtest=ServiceActivitySchedulerTest -Dit.test=ServiceActivityJourneyIT -Djacoco.skip=true` salió con código 0. Surefire 20/20 y Failsafe 1/1, sin omitidos. HTTP real en loopback, dos actores ficticios con OIDC, PostgreSQL 18.6 y dos contextos Spring sobre la misma base. Se verificó denegación del anónimo y de la otra cuenta, 403 sin CSRF, pausa persistida que resiste una nueva visita y un callback cancelado, reanudación explícita, recuperación de un solo disparo, conservación del último éxito tras timeout y ausencia de envío a medianoche exacta. Reloj, programación y transporte saliente controlados. Se confirmó el retiro de contenedores, redes y volúmenes propios por etiqueta exacta y la salida de Ryuk por ID.
- **UI.** Desde `client/`, `npm test -- --run src/features/serviceActivity/ServiceActivityJourney.test.tsx src/features/serviceActivity/useServiceActivity.test.tsx src/features/serviceActivity/ServiceActivityDialog.test.tsx` salió con código 0, 28/28 en tres archivos. Los componentes con MSW verifican visita del dueño, corte y última respuesta en la zona del servicio, error de pausa sin cambio aparente, reintento y reanudación explícitos, Online independiente y falta de acceso de la otra cuenta. Las regresiones de visibilidad, cambio de día, foco, intervalo y reconexión también pasaron. `npm ci --offline` encontró una dependencia sin caché y se completó `npm ci` con red en el checkout aislado. Los checks estáticos y el build de la entrega tienen exit 0 sobre las mismas fuentes.
- **Protocolo S-111.** [DEPLOYMENT](../DEPLOYMENT.md#ensayo-de-la-sonda-interna-en-render-free) fija control apagado de más de 20 min y ensayo activo de al menos 40 min con tres intervalos y el mismo SHA, servicio y plan. Exige clientes cerrados, silencio sin pings de observación, una medición final por ventana y evidencia de intentos e instancia. Un `200 UP` acredita la respuesta final. Si faltan datos para atribuir continuidad o suspensión, el resultado es inconcluso. La eficacia remota sigue pendiente de autorización expresa del dueño sobre SHA y ventana.
- **Cierre.** `node scripts/docs-check.mjs`, `git diff --check` y `git diff --check c95f81408a3612e5626a3da2ebefc870bb23d119...HEAD` pasaron sobre la revisión. `node scripts/ci/classify-diff.mjs --base c95f81408a3612e5626a3da2ebefc870bb23d119 --head HEAD --phase FULL` dio `FULL` / `APPLICATION`, dos rutas técnicas. Evidencia local de revisión en `.orchestrator/t-056-review-logs/`. Se preservó `trailer/` en el checkout principal.

**Resultado local favorable, sin bloqueantes. FULL/STARTER DIFERIDO POR EL DUEÑO.** El merge queda para una sesión posterior. T-057 espera la confirmación de PR59 MERGED y la conciliación de T-056.

## Conciliación

**2026-11-13 · Conciliada como `done` en la rama de T-057.** `gh pr view 59 --repo MatiasNicolasAcevedo/devnotes --json number,url,state,mergedAt,mergeCommit,headRefOid,baseRefName` salió con código 0. PR59 figura `MERGED` contra `main`, squash `ac48bdef2d976dc045446556b553e7f7ca41430a` y `mergedAt` `2026-11-13T23:22:38Z` (20:22:38 en Buenos Aires). El comentario de cierre acredita la revisión independiente y `verify-required` SUCCESS para HEAD `1031ca976b845ff75099a51443d2b0a0a11f8008` sobre base `c95f81408a3612e5626a3da2ebefc870bb23d119`. El ensayo de Render sigue pendiente de autorización expresa sobre SHA y ventana. [Cierre de PR59](https://github.com/MatiasNicolasAcevedo/devnotes/pull/59#issuecomment-6867452085).
