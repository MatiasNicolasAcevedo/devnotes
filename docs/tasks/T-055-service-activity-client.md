---
id: T-055
status: in_review
priority: P1
size: M
milestone: M5
spec: S-111
depends_on: [T-054]
branch: codex/t-055-service-activity-client
role: implementer
executor: frontier
pr: 58
---

# T-055 · Actividad diaria visible y sondeo moderado

## Objetivo

Activar la ventana por visita visible del dueño y permitir consultar, pausar o reanudar con estados comprensibles.

Draft **solo por dependencias**: T-054 MERGED y conciliada. Contrato completo en S-111; al cumplirse las dependencias no se necesita otra sesión planner. Cada tarea/revisión usa sesión independiente.

## Alcance y decisiones resueltas

API con HTTP existente, fecha del servidor, guardia por identidad/fecha/generación y detalle en menú de cuenta. No activar por timer nocturno/otra cuenta; error no bloquea editor. Readiness al montar/foco y cada 60 s visible; sin polling de detalle escondido.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-111](../specs/S-111-render-daily-availability.md).
2. [client/AGENTS](../../client/AGENTS.md).
3. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
4. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

Nuevo `features/serviceActivity/api.ts`, `useServiceActivity.ts`, `ServiceActivityDialog.tsx` y tests; `features/auth/SessionControls.tsx`, `features/system/useReadiness.ts` y tests.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

Una activación por visita/fecha pese a renders; pausa respetada al reabrir/otra pestaña; fecha backend frente a zona Android. Capacidad no disponible, logout/401/callback tardío. Distinguir conexión, sonda y guardado.

Desde `client/`, Node >=24/npm del proyecto:

```bash
npm test -- --run src/features/serviceActivity src/features/system/ServerStatus.test.tsx src/features/auth/SessionControls.test.tsx
```

Para cambios client, desde `client/`: `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build`. Son verificaciones estáticas/dirigidas; no ejecutar `npm run verify` como sustitución del gate aplazado.

Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

### Corrección de R1

**2026-11-13 · Corrección lista para revisión R2 de Frontera en sesión independiente.** Junie inició B-1 en Claude Code con `claude-opus-5[1m]`; la sesión se detuvo por decisión del dueño. Frontera terminó y verificó la corrección en Codex, con PowerShell, Git, `gh`, Node 24.21.0 y npm 11.19.0. El dueño indicó GPT-6.1 Sol para Codex; modelo efectivo y esfuerzo no comprobados desde las herramientas de esta sesión. La continuidad con Frontera quedó acordada en [AUTONOMY](../AUTONOMY.md#continuidad-con-frontera-desde-el-2026-11-13).

Precondición y comprobación antes de publicar: `gh pr view 58 --repo MatiasNicolasAcevedo/devnotes --json number,url,state,isDraft,headRefOid,baseRefName,mergeable` devolvió OPEN, base `main`, no draft, MERGEABLE, HEAD documental de R1 `1e74be2ba83ff7e60e904f439bf952bd667ab0d3`. Base remota `fb8a3818ecdf3dcb10da3c0924af2bee45c84f26`. Corrección técnica en `9a84a3416ddc0a2abd0bd634217833ecf88cc9f1`.

Impacto de comportamiento: una reconexión ya no relee `capabilities`, con lo que no activa otra ventana tras medianoche. El cambio productivo se limita a esa consulta. B-2 y B-3 añaden regresiones con MSW. O-1 y O-2 siguen como observaciones no bloqueantes de R1.

- B-1 se reprodujo primero en rojo sobre el código de R1: dos `visit` al pasar al día de servicio siguiente y reconectar por `onlineManager`, sin foco ni navegación. Verde con `refetchOnReconnect: false`.
- Mutantes, de a uno con `npm test -- --run src/features/serviceActivity/<archivo>.test.tsx -t '<caso>'`: reconexión en `capabilities` produjo dos visitas; sin guarda CSRF se registró una visita antes de liberar el endpoint; foco habilitado e intervalo de 60 s en la consulta de estado produjeron, por separado, dos lecturas con el detalle abierto. Cada mutante falló por la aserción esperada (exit 1, una prueba fallida). Fuente restaurada después de cada corrida.
- Desde `client/`, `npm test -- --run src/features/serviceActivity src/features/system/ServerStatus.test.tsx src/features/auth/SessionControls.test.tsx` → 61/61 en cinco archivos. `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build` → exit 0. El build conservó el aviso preexistente de tamaño de chunk.
- Cierre: `node scripts/docs-check.mjs` OK (124 Markdown, 68 tareas, HANDOFF 22/22) en una copia temporal de archivos versionados para preservar `trailer/`; `git diff --check` exit 0; `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` → `policy=FULL`, `profile=APPLICATION`, 13 rutas técnicas. **FULL/STARTER DIFERIDO POR EL DUEÑO**. Sin `npm run verify`, E2E, deploys, variables de Render ni HTTP saliente real de la aplicación. Sigue pendiente la decisión sobre expectativas E2E de readiness antes de FULL. T-056 queda pendiente de PR58 MERGED y la conciliación de T-055.

### Revisión R1 · CAMBIOS REQUERIDOS

**2026-11-13 · Junie como reviewer en sesión nueva**, distinta de la implementación, ejecutado con Claude Opus 5.5 (`claude-opus-5-5`) en Claude Code, app de escritorio; esfuerzo no expuesto. Git, `gh`, Git Bash y Node 24.21.0 con npm 11.19.0 (`npm ci` del lockfile sin cambios, en el worktree). Impacto propio: solo esta transición documental de T-055/STATUS; sin cambios de comportamiento, API, permisos, datos ni UI. Ronda 1 de 2.

Precondición: `gh pr view 58 …` → OPEN, no draft, base `main` `fb8a3818ecdf3dcb10da3c0924af2bee45c84f26`, `headRefOid` `ca3cfbed73335ffbc9e81e00335d4b419e09c111`, MERGEABLE; `verify-required` SUCCESS con `head_sha` exacto ([run 43504690115](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/43504690115/job/132159136991)). Revisión en worktree aislado `--detach` de ese SHA; `trailer/` del checkout principal no se tocó. Diff completo contra `origin/main` leído: 19 rutas, sin backend, `package*.json`, `.env*`, workflows ni scripts.

Comprobado sin hallazgos: `visit` solo tras auth + `capabilities.available` con `serviceDate` del servidor, documento visible y `csrfReady`, registrado en memoria por `owner|serviceDate` antes de enviar (sin reintento ni bucle); nunca `resume` automático, y `visit` respeta la pausa en el servidor (`ServiceAwakeWindow.visit`); `AccountMenu` con `key` por identidad; `sessionIsCurrent` en todas las peticiones y guardas de identidad en los callbacks; detalle en el menú de cuenta solo con `available`; estado con `enabled` solo abierto, `gcTime: 0`, sin foco ni intervalo; «Reintentar la sonda» usa `resume`, que en el servidor reabre una secuencia detenida; horas formateadas con `timeZone` fijo; readiness 60 s, `refetchIntervalInBackground: false`, foco activo. `withCsrfRenewal` sin cambios (403 sin reenvío). ARCHITECTURE, DEPLOYMENT, BACKLOG, STATUS y la conciliación de T-054 son coherentes con el código.

Pruebas del reviewer, desde `client/`:

- Dirigida del contrato: `npm test -- --run src/features/serviceActivity src/features/system/ServerStatus.test.tsx src/features/auth/SessionControls.test.tsx` → exit 0, 5 archivos, **58/58**.
- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build` → exit 0 (aviso de tamaño de chunk preexistente).
- Mutantes propios con la dirigida, fuente restaurada desde copia (árbol limpio después): clave de intento sin fecha → 1 falla; intento registrado solo tras éxito → 2; readiness sin foco → 1; detalle sin `available` → 4; «Reanudar hoy» enviando `pause` → 1. **Sobreviven** (58/58): `visit` sin `csrfReady` (B-2); estado con `refetchOnWindowFocus: true` + intervalo de 60 s con el detalle abierto (B-3); formateador de hora sin `timeZone` (O-1); guardas de identidad redundantes por `key` y keys por dueño (`visit` sin `isCurrent()` previo, invalidaciones tardías sin guarda, `AccountMenu` sin `key`), `enabled: true` (equivalente: el contenido solo se monta abierto) y acciones sin `csrfReady` (O-2).
- Pruebas temporales no versionadas, ya borradas: P1 reconexión tras la medianoche (B-1) falla con el código del PR; P2 CSRF pendiente → ninguna `visit` hasta liberar el CSRF y luego una sola: verde con el PR, rojo con el mutante sin `csrfReady`; P3 foco con el detalle abierto no relee el estado: verde con el PR, rojo con el mutante de foco.

Cierre desde la raíz del worktree: `node scripts/docs-check.mjs` OK (124 Markdown, 68 tareas, HANDOFF 22/22); `git diff --check origin/main...HEAD` exit 0; `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` → `policy=FULL`, `profile=APPLICATION`, 19 rutas, 13 técnicas. **FULL/STARTER DIFERIDO POR EL DUEÑO** según la [excepción I5](../TESTING.md#excepción-i5-del-2026-11-12): no se ejecutaron FULL, STARTER, `npm run verify`, E2E, deploys, variables de Render ni HTTP saliente real. El pendiente E2E de readiness sigue siendo decisión de frontera y no condiciona esta revisión.

**B-1 (bloqueante) · Una reconexión de red, sin interacción del dueño, activa el día nuevo.** Evidencia: `useServiceActivityCapabilities` no fija `refetchOnReconnect` y hereda el `true` por defecto de TanStack Query (`app/queryClient.ts` solo apaga el foco). Con la página visible y la fecha de servicio vencida, un evento `online` re-consulta `capabilities`, llega el `serviceDate` nuevo y `useDailyVisit` envía `visit`. Escenario: escritorio con la pestaña visible toda la noche y un corte breve de Wi-Fi a las 02:00 → ventana activada ese día sin visita del dueño, consumiendo horas compartidas. Contradice S-111: el día nuevo solo lo activa «una interacción real de navegación/foco del dueño». Reproducción: test temporal con reloj 2026-11-14T02:30Z y `serviceDate` 2026-11-13, primera `visit`; luego `serviceDate` 2026-11-14, reloj +2,5 h y `onlineManager.setOnline(false)`/`(true)` sin foco ni navegación → `expected [ 'visit', 'visit' ] to deeply equal [ 'visit' ]`. Corrección suficiente: `refetchOnReconnect: false` en la consulta de `capabilities` (u otra forma que impida toda re-consulta no originada en foco/navegación), sin tocar readiness. Condición observable de cierre: test de regresión versionado equivalente en `useServiceActivity.test.tsx`, rojo sin la corrección y verde con ella; dirigida verde con cantidad ejecutada distinta de cero.

**B-2 (bloqueante) · La regla «visit solo con CSRF listo» no tiene negativo.** Evidencia: el mutante que quita `!csrfReady` de `useDailyVisit` deja la dirigida 58/58, porque en las pruebas el CSRF siempre está listo antes que `capabilities`. Sin la guarda, un CSRF lento (arranque en frío) haría salir la `visit` sin token, recibir 403 y, por diseño sin reintento, dejar el día sin activar. AGENTS exige negativos en reglas críticas. Corrección suficiente: test con el endpoint CSRF retenido (p. ej. un `server.use` que espera una promesa y luego cae al backend simulado) que verifique cero `visit` mientras el CSRF está pendiente y exactamente una al liberarlo. Condición de cierre: el test mata el mutante sin `csrfReady` y pasa con el código.

**B-3 (bloqueante) · «Estado leído solo al abrir y tras acción» no tiene negativo con el detalle abierto.** Evidencia: el mutante `refetchOnWindowFocus: true` + `refetchInterval: 60_000` en `useServiceActivityStatus` deja la dirigida 58/58; el test existente solo cuenta lecturas tras las acciones y después de cerrar. Corrección suficiente: con el detalle abierto, simular pérdida y recuperación de foco (`visibilitychange` con `bubbles: true`) y avanzar el reloj más de 60 s, verificando que `calls.status` no cambia. Condición de cierre: el test mata ese mutante y pasa con el código.

**O-1 (no bloqueante) · El test «dispositivo en Asia/Tokyo» no simula la zona del dispositivo en este host.** `process.env.TZ = 'Asia/Tokyo'` se asigna después de importar el módulo y, en Node para Windows, `Intl` ignora `TZ` (`TZ=Asia/Tokyo node -e …` resuelve `America/Buenos_Aires`). El mutante sin `timeZone` en el formateador de hora pasa 9/9 en el host del dueño (zona Buenos Aires), aun lanzando Vitest con `TZ=Asia/Tokyo`; solo falla (6/9) con `TZ=UTC`, como en una CI Linux. El código es correcto, pero la evidencia «corte 00:00 con el dispositivo en Asia/Tokyo» no se demuestra localmente. Sugerido: afirmar además que los formateadores resuelven `SERVICE_ZONE` o comparar contra un formateador explícito de otra zona. No condiciona la aprobación.

**O-2 (no bloqueante) · Guardas redundantes y acciones sin CSRF listo.** Los mutantes de guardas de identidad sobreviven porque `key={user.id}` desmonta el menú y las keys incluyen al dueño: sin efecto observable; pueden quedar como defensa. Las acciones del detalle ya se deshabilitan sin `csrfReady`, pero ningún test lo fija; opcional.

Siguiente: sesión nueva de Junie como implementer en la misma rama/PR para B-1, B-2 y B-3 (O-1/O-2 si caben); después, revisión R2 en otra sesión nueva. No ejecutar T-056.

### Implementación

**2026-11-12 · Implementación publicada, lista para revisión independiente.** Junie como implementer en sesión nueva, ejecutado con Claude Opus 5.5 (`claude-opus-5-5`) en Claude Code, app de escritorio; esfuerzo no expuesto. Git, `gh`, Git Bash y Node 24.21.0 con el npm del proyecto. Sin deploys, sin variables de Render y sin HTTP saliente real: la API se simuló con MSW.

Impacto: **comportamiento/UI** nuevos solo para la cuenta con `capabilities.available` (interruptor del servidor apagado por defecto); **readiness** pasa de cada 5 s también en segundo plano a montar/foco/cada 60 s solo visible; **API**: consume sin cambios el contrato de T-053/T-054; sin cambios de permisos (el servidor autoriza), datos, dependencias, configuración ni backend. Código en `df4ad96`, base `main` `fb8a381`; [PR58](https://github.com/MatiasNicolasAcevedo/devnotes/pull/58).

- Nuevos `features/serviceActivity/api.ts` (esquemas Zod estrictos: unión `capabilities`, estado con instantes ISO UTC y `lastResult` cerrado; `start` con body exacto `{mode}` y `pause` sin cuerpo, ambos con `withCsrfRenewal` sin reenvío), `useServiceActivity.ts` y `ServiceActivityDialog.tsx`. Query keys privadas `['serviceActivity', owner, …]`, descartadas por el logout/cambio de identidad existente.
- Activación: `AccountMenu` (montado por identidad con `key`) consulta capabilities y, con CSRF listo y documento visible, envía `visit` una sola vez por `owner|serviceDate` del servidor; el intento se registra en memoria antes de enviar, así un error no reintenta ni entra en bucle. Un día nuevo se detecta solo por foco o navegación con capabilities vencidas (60 s); no hay timer propio. `sessionIsCurrent` evita que un 401 tardío de otra identidad cierre la sesión vigente; la respuesta tardía solo invalida el estado si la identidad sigue siendo la misma.
- Detalle «Actividad del servidor» en el menú de cuenta, sin icono nuevo en la barra: estado («Activo hasta las 00:00», «Pausada por hoy», «No se pudo comprobar la sonda», «Inactiva hoy»), corte con fecha y zona del servicio, última respuesta/intento/éxito, fallos y próximo intento, texto fijo de S-111 y aclaración de que «Online» y la sonda no son guardado de notas. Estado leído solo al abrir y tras pausar/reanudar (`gcTime: 0`, sin foco ni intervalo). Acciones explícitas: pausar, reanudar, reintentar la sonda tras tres fallos y activar hoy (`resume`). Errores de consulta y de acción en alertas propias, sin presentar la acción como aplicada.
- Readiness: `refetchInterval` 60 s, `refetchIntervalInBackground: false`, `refetchOnWindowFocus: true`.
- MSW por defecto responde `capabilities` `{available:false}` (interruptor apagado); `test/msw/serviceActivityBackend.ts` simula start/pause/estado, 401/403/404, pausa del día y CSRF contra el token del backend de auth.

Pruebas, desde `client/`:

- Dirigida del contrato: `npm test -- --run src/features/serviceActivity src/features/system/ServerStatus.test.tsx src/features/auth/SessionControls.test.tsx` → exit 0, 5 archivos y **58/58** (`api.test.ts` 19, `useServiceActivity.test.tsx` 13, `ServiceActivityDialog.test.tsx` 9, `ServerStatus.test.tsx` 12, `SessionControls.test.tsx` 5). Cubre una activación por fecha pese a renders/foco/re-consultas, documento oculto sin activar y activación al volverse visible, otra cuenta/interruptor apagado/visitante/capabilities fuera de contrato sin activar ni detalle, pausa respetada al reabrir y en otra pestaña (solo `visit`, nunca `resume`), fecha del servidor con el dispositivo ya en el día siguiente y día nuevo solo al navegar, seis horas sin interacción sin consultas, error de activación sin reintento y con escritura intacta, respuesta tardía tras logout, 401 tardío de otra identidad, 401 vigente que termina la sesión, corte 00:00 con el dispositivo en `Asia/Tokyo`, pausa/reanudación/reintento/activación explícitos, 404, red caída con reintento, pausa rechazada (500) y 403 CSRF sin reenvío, readiness sin consulta antes de 60 s ni en segundo plano.
- Mutantes temporales sobre la fuente, cada uno restaurado desde copia (árbol limpio después): sin registro de intentos → 3 fallos; fecha del dispositivo → 1; sin chequeo de visibilidad → 1; `visit` sin `sessionIsCurrent` → 1; `visit` enviado como `resume` → 8; readiness cada 5 s → 1; readiness en segundo plano → 1; sin revalidar al navegar → 1; `refetchInterval` de 60 s en capabilities → 1.
- Por riesgo (handler MSW por defecto y menú compartidos), no gate: `npx vitest --run` → 51 archivos, 711/711.
- `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build` → exit 0 (el build mantiene el aviso de tamaño de chunk ya existente).
- Cierre desde la raíz: `git diff --check origin/main...HEAD` exit 0; `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` → `policy=FULL`, `profile=APPLICATION`, 19 rutas, 13 técnicas; `node scripts/docs-check.mjs` OK (124 Markdown, 68 tareas, HANDOFF 22/22) en un worktree limpio del HEAD, porque el checkout principal contiene `trailer/`, ajeno y sin versionar. **FULL/STARTER DIFERIDO POR EL DUEÑO** según la [excepción I5](../TESTING.md#excepción-i5-del-2026-11-12): no se ejecutaron FULL, STARTER, `npm run verify`, E2E, deploys, variables de Render ni HTTP saliente real. No se afirma cobertura total.
- Logs locales saneados en `.orchestrator/t055-*.log` (ignorado). Sin stacks, contenedores ni el stack persistente del dueño.

**Pendiente para frontera antes de FULL (fuera de este contrato).** Con readiness cada 60 s solo visible, dos expectativas E2E heredadas de S-002/T-050 dejan de cumplirse y no se modificaron aquí (no se pueden ejecutar por I5): `e2e/tests/local-stack.spec.ts` exige detectar la caída y la recuperación de la DB con la página abierta en menos de 30 s, y `e2e/tests/system.spec.ts` espera volver a «Servidor conectado» en 20 s sin recargar («revalida solo cada 5 s»). S-111 decide la cadencia nueva pero no dice cómo quedan esos criterios. Opciones: ajustar esas pruebas y S-002 a la cadencia de S-111 (por ejemplo, revalidación por foco o plazo mayor) o fijar otra regla para E2E. Decisión de frontera/dueño; no bloquea la revisión local de T-055.

Revisión independiente de PR58: [R1 con cambios requeridos](#revisión-r1--cambios-requeridos). No ejecutar T-056 antes de PR58 MERGED y T-055 conciliada.

### Correcciones significativas

| Problema / causa | Arreglo | Prueba / SHA |
|---|---|---|
| El evento `visibilitychange` de prueba no llegaba al `focusManager` de Query, que escucha en `window`; el foco simulado no revalidaba | El evento se despacha con `bubbles: true`, como en el navegador | `useServiceActivity.test.tsx`, `ServerStatus.test.tsx` · `df4ad96` |
| El test «sin timer» no detectaba un `refetchInterval` agregado: el intervalo real se creaba antes de simular el reloj | Intervalos simulados desde el montaje y esperas con `vi.waitFor` | Mutante con `refetchInterval` falla 1/13 · `df4ad96` |
| El simulador comparaba el header CSRF con la cookie que la SPA acababa de leer, así un 403 no era reproducible | Compara con el token vigente del backend de auth simulado | `ServiceActivityDialog.test.tsx` 403 sin reenvío · `df4ad96` |
| B-1: Query reconsultaba capabilities al reconectar y habilitaba una nueva visita sin interacción | Desactivar `refetchOnReconnect` en capabilities | Rojo previo y mutante de reconexión: dos visitas · `9a84a34` |
| B-2: el CSRF simulado siempre llegaba antes de que la SPA pudiera intentar una visita | Retener el endpoint CSRF hasta comprobar cero intentos y después una visita | Sin guarda: una visita antes de liberar CSRF · `9a84a34` |
| B-3: los conteos previos no cubrían foco ni intervalo con el detalle abierto | Despachar visibilidad y avanzar 61 s con el detalle abierto, manteniendo una lectura | Mutantes de foco e intervalo por separado: dos lecturas · `9a84a34` |

### Inicio

**2026-11-12 · Junie como implementer en sesión nueva**, ejecutado con Claude Opus 5.5 (`claude-opus-5-5`) en Claude Code, app de escritorio; esfuerzo no expuesto. Precondición: `gh pr view 57 …` → `MERGED` contra `main`, squash `fb8a3818ecdf3dcb10da3c0924af2bee45c84f26`, `mergedAt` `2026-11-13T02:34:08Z`, `headRefOid` `f79fbea` igual al del veredicto `APROBADO` de R2. [T-054 conciliada](T-054-service-activity-scheduler.md#conciliación) en el primer commit de esta rama. Rama desde `main` `fb8a381`; `trailer/` (ajeno, sin versionar) no se toca. Pasa de `draft` a `in_progress`.

Plan preparado en T-052 el 2026-11-12. Al tomar la tarea, registrar SHA/base, comandos, resultados y pendientes. Antes de operación larga: checkpoint con recursos propios y cleanup; comprobar que los nombres E2E de los comandos estén ausentes y limpiar solo por labels del harness. Nunca usar el stack persistente del dueño ni instalar herramientas globales.

## Cierre y siguiente tarea

No done hasta MERGED comprobado. Tras MERGED confirmado, la siguiente sesión concilia esta tarea y toma T-056 si sus dependencias están done. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.
