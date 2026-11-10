---
id: T-036
status: in_review
priority: P1
size: M
executor: junie
role: implementer
milestone: M2
product_cycle: I2
spec: S-105
spec_version: 2
branch: codex/t-036-voice-navigation
pr: 42
depends_on: [T-035, T-038]
---
# T-036 · Preservar borrador de voz al navegar y cerrar sesión

## Objetivo

Preservar borrador de voz al navegar y cerrar sesión, dentro de S-105/M2-RC1. Contrato completo; draft **solo por dependencias T-035 y T-038 no MERGED/conciliadas**. Junie puede habilitar ready al comprobarla sin otra planificación. Siguiente: T-037 tras MERGED. Retorno a frontera al objetivo M2-RC1 o decisión fuera de contrato, no por cada tarea.

## Alcance y decisiones resueltas

Workspace por dueño por encima del outlet, guardia de navegación y limpieza de sesión según S-105, conservando router declarativo y coordinación daily. No migrar a data router/useBlocker incompatible ni persistir texto/audio. Incluye, por decisión del dueño (2026-11-09), corregir el bucle de transcripción heredado de T-034 (BACKLOG, hallazgo de la 5.ª revisión de T-035): el efecto que llama a `draft.transcribe()` depende de `draft` y de `recorder.result`, y relanza la transcripción en cada render (S-105 §4: una sola petición por intento). Continúa T-037 si no hay decisión fuera del contrato; el control de diez corresponde a T-035.

## Leer antes

1. [S-105 v2](../specs/S-105-voice-notes.md).
2. [client/AGENTS](../../client/AGENTS.md).
3. [TESTING](../TESTING.md).
4. [Implementer](../agents/implementer.md).
5. [Arquitectura frontend](../ARCHITECTURE.md).

AGENTS raíz, STATUS y protocolo del rol son entrada común; no recorrer docs por rutina.

## Archivos y pasos

Rutas nuevas de backend bajo server/src/main/java/com/example/devnotes/ y sus tests bajo server/src/test/java/com/example/devnotes/; frontend bajo client/src/. features/voice/VoiceDraftProvider.tsx, VoiceDraftNavigation.tsx y VoiceDraftNavigation.test.tsx; adaptar useVoiceDraft.ts/VoicePage.tsx/VoiceComposer.tsx y app/AppShell.tsx; pruebas DailyDraftNavigation.test.tsx/AuthSession.test.tsx solo si se afecta su integración.

1. Elevar borrador de T-034 a provider persistente keyed por owner alrededor de DailyDraftWorkspace; envolver outlet con guardia voice. Si voice tiene pendiente, resolverlo antes de renderizar el outlet diario, sin descartar/guardar daily como efecto de una acción de voz. No crear dos copias del borrador.
2. Cubrir enlaces/programática/POP, recuperar URL Volver a voz, guardar y continuar tras ACK/descarte explícito. Permiso/captura/transcripción se detienen/invalidan de forma segura antes de salir; cancelar salida no reinicia tracks.
3. beforeunload/pagehide/hidden/logoutPending/401/cambio de identidad y respuestas tardías se prueban con providers/router reales. En cierre exitoso o expiración eliminar todo estado privado; en logout fallido mismo dueño conservar solo texto.
4. Transcripción una sola vez por intento: disparar `transcribe` una vez por resultado de captura (consumirlo o keyed por su generación), sin depender de la identidad de `draft`. Prueba primero en rojo con el grabador simulado devolviendo `result` en `idle`: «un stop con resultado dispara exactamente un POST de transcripción»; reintento solo explícito.

## Aceptación y pruebas

Atrás/Adelante y navegación por header no pierden texto, no renderizan destino debajo de un borrador inaccesible ni reanudan micrófono. Error de Guardar mantiene guardia y texto; Cancelar conserva borrador; Descartar limpia audio. 401/logout en vuelo/dueñoB no reciben respuestas deA. Mantener flush/error/concurrency y versiones de daily, sin doble diálogo imposible ni bloqueo permanente. Advertencia unload solo con pendientes; no prometer recuperación de reload forzada. Un stop con resultado produce exactamente una petición de transcripción.

- Iteración desde client/, Node 24/npm del lock: `npm test -- --run src/features/voice/VoiceDraftNavigation.test.tsx src/features/daily/DailyDraftNavigation.test.tsx src/features/auth/AuthSession.test.tsx`. Son nombres de pruebas que esta tarea debe crear/conservar; **no** evidencia de ejecución actual. Backend clean verify incluye IT PostgreSQL/Failsafe/JaCoCo; test solo no los acredita.
- Gate esperado **APPLICATION** desde raíz/Git Bash: `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t036 STARTER_E2E_PROJECT=starter-e2e-t036 STARTER_SERVER_TESTS=container bash scripts/verify.sh`. El diff completo manda: si incorpora configuración/tooling/dependencias, STARTER según TESTING. FULL una vez al cierre de fuentes; dirigidos durante iteración, sin rebajar suites/umbrales/retries/deadlines.
- Antes de operación larga: namespaces libres, SHA/base, huellas antes/después, comando/log saneado, recursos y cleanup exacto en checkpoint. No tocar starter-dev-local-nginx, volúmenes ajenos ni secretos; PowerShell usa el verificador canónico de SETUP con PATH Node/exit preservados.
- Antes de publicar: `node scripts/docs-check.mjs`, `git diff --check`, `bash scripts/verify.sh --policy origin/main` y revisar también diff sin commit. Markdown de cierre conserva gate si base/fuentes coinciden.

## Checkpoint vigente

2026-11-10. `in_review`. Corrección B-3 publicada en PR42 con FULL/APPLICATION verde sobre sus fuentes; evidencia en [Entrega de la corrección B-3](#entrega-de-la-corrección-b-3). Fuentes `8b9438b`, base publicada `a6210050f0e4c9a8ff98df62c50dbb4aebd995de`; el HEAD posterior solo agrega Markdown regular. Los cambios locales de Render y portabilidad en `docs/DEPLOYMENT.md` y `docs/BACKLOG.md` siguen fuera de los commits de T-036.

- **Reviewer independiente, sesión nueva.** Única ronda adicional autorizada por el dueño. Comprobar B-3 y las regresiones de B-1/B-2, verificar FULL y `verify-required` vigentes y publicar el veredicto ligado a HEAD/base. Un veredicto favorable permite continuar solo si cumple AUTONOMY. Ante otro bloqueante, volver al dueño. T-037 espera el MERGED confirmado de T-036.

## Entrega de la corrección B-3

2026-11-10. Decisión del dueño confirmada en el chat («si te autorizo por favor continua»), registrada por frontera con Codex (GPT-6, PowerShell/Git/gh/Node, variante y esfuerzo no expuestos). El dueño autoriza una corrección acotada de B-3 por implementer en sesión nueva y una única revisión independiente adicional en otra sesión. El alcance es la recuperación del editor de voz. La corrección se mantiene en `codex/t-036-voice-navigation` y PR42.

2026-11-10. Implementer, Claude Code (Claude Opus 5.5, `claude-opus-5-5`, PowerShell/Git Bash/Git/gh/Node/Vitest/Docker; esfuerzo no expuesto). Impacto: recuperación del editor de voz tras el aviso de audio excedido. Sin cambios HTTP, de permisos ni de persistencia. Punto de partida confirmado con `gh pr view` y `git ls-remote`: PR42 OPEN, HEAD `fbbf15c7c5b945c363b1bbd579fd845178732deb`, base `a6210050f0e4c9a8ff98df62c50dbb4aebd995de`, [segundo veredicto CAMBIOS REQUERIDOS](https://github.com/MatiasNicolasAcevedo/devnotes/pull/42#issuecomment-6759705584) y `verify-required` SUCCESS para ese HEAD.

- Rojo/verde. Desde `client/`, `npm test -- --run src/features/voice/VoiceDraftNavigation.test.tsx -t 'descarta audio que excedió' --reporter=dot` dio exit 1 antes del arreglo, con el aviso aún visible tras «Nueva nota» (`.orchestrator/t036/b3-red.log`), y exit 0 después (`b3-green.log`). La regresión recorre en el mismo workspace: aviso, tracks liberados, cero POST de transcripción, «Nueva nota», nueva grabación por gesto (segundo `getUserMedia`, tracks liberados al cancelar) y guardado manual con ACK de un único POST. El negativo `useVoiceRecorder.test.tsx -t 'resetError no altera'` dio rojo sin el arreglo y verde con él.
- Fuentes cerradas en `8b9438b` (`fix(voice): recover the editor after discarding an overlong capture`), `client/src` `857cc81f73d3af2f87830c45cf167c56e37b815e`. El `reset` del editor limpia el error terminado del grabador persistente; `resetError` solo sale de `error` y no altera una captura en curso ni un resultado pendiente.
- Las nueve suites dirigidas de la entrega anterior pasaron 116/116 (`b3-targeted.log`), incluidas B-1 (recarga tardía ignorada y recarga vigente aplicada) y B-2 (601 s descartados con aviso y transcripción explícita del audio válido al ocultar). Typecheck, lint y formato pasaron.
- `bash scripts/verify.sh --policy origin/main` dio FULL/APPLICATION. Gate `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t036-r3 STARTER_E2E_PROJECT=starter-e2e-t036-r3 STARTER_SERVER_TESTS=container bash scripts/verify.sh`: exit 0 en FULL, 05:36:15Z–06:02:28Z. Docs 6 s, backend 403 s (221 Surefire + 210 Failsafe PostgreSQL, Spotless y JaCoCo), cliente 114 s (514/514, 87.94 % statements y 82.48 % branches, build) y Playwright 1050 s (21 desktop + 20 mobile).
- Árbol limpio y huellas iguales antes/después: HEAD `8146dc5e217acef071670377ebae176c3ad26397`, árbol `496786fdb23ecca28393ae92f2f52385cd3bb3e5`, `client/src` `857cc81f73d3af2f87830c45cf167c56e37b815e`, misma base publicada. Los cambios locales de Render se apartaron con `git stash` durante la corrida y se restauraron con hash verificado, sin commitear. Evidencia saneada en `.orchestrator/t036/full-r3-evidence.log`, log `full-r3.log` SHA-256 `7a70086c84d2abae2a753a9ff6e1a9740d167aef2c0d3d26595415af0832d866`. El cierre solo cambia Markdown regular y conserva el gate.
- Ambos proyectos Compose tenían cero recursos antes y después. El runner retiró E2E. Se retiraron `starter-verify-t036-r3_default` y `starter-verify-t036-r3_m2-cache` tras cotejar sus labels exactos.

## Evidencia de la segunda revisión independiente

2026-11-10. Segunda revisión independiente, Codex (GPT-6, PowerShell/Git/gh/Node/Vitest, variante y esfuerzo no expuestos). Esta revisión cambia documentación operativa. B-3 afecta el uso del editor de voz después de descartar audio. PR42 OPEN, listo para revisión, `codex/t-036-voice-navigation` contra `main`. HEAD de entrada `eff35102682f52e3aa8aaebd7e608f405359e700` y base `a6210050f0e4c9a8ff98df62c50dbb4aebd995de`, confirmados con `gh pr view` y `git ls-remote`. [verify-required SUCCESS](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/42760441304/job/129644600445) para el HEAD de entrada.

- `bash scripts/verify.sh --policy origin/main` dio FULL/APPLICATION. El árbol de `9d54e56f06214e230b9e78e03f08603336ac5dde` y el SHA-256 del log original coinciden con el registro de abajo. `git diff --raw` entre `5858c58`, `9d54e56` y el HEAD revisado muestra únicamente cambios de Markdown regular. La base y el árbol `client/src` `5810a64420b0570a5964560d406db71eab64b7b1` coinciden. El FULL se conserva para estas fuentes, incluida la transición documental de esta revisión.
- El comando dirigido de nueve suites de la entrega de correcciones pasó 115/115. B-1 impide que la recarga tardía repueble el borrador descartado, y la recarga confirmada vigente sigue aplicándose. B-2 descarta audio de 601 s con aviso, tracks liberados y cero POST, y el audio válido al ocultar la pestaña conserva la transcripción explícita. También pasaron navegación de header, programática y POP, espera del ACK, flush y guardia daily, limpieza por 401/logout y aislamiento de respuestas tardías por dueño. `node scripts/docs-check.mjs` y `git diff --check` pasaron.
- **B-3 · Descartar una captura excedida deja el editor bloqueado para grabar y guardar.** En una copia temporal de `VoiceDraftNavigation.test.tsx`, al final de «descarta audio que excedió 600 s durante la suspensión», pulsar «Nueva nota» y comprobar «Grabar». Escribir texto válido y comprobar «Guardar». `npm test -- --run src/features/voice/VoiceDraftNavigation.review-probe.test.tsx -t 'descarta audio que excedió' --reporter=dot` dio exit 1 con las dos aserciones fallidas. El aviso y las aserciones de cleanup y cero POST pasaron. La sonda se retiró. `VoiceComposer.tsx` exige `captureState === 'idle'` para ambas acciones y prioriza el estado `error` del grabador persistente. «Nueva nota» reinicia el borrador, pero deja ese estado del grabador. El cierre debe permitir recuperar el editor tras el aviso, iniciar otra grabación por gesto y guardar texto manual con ACK, manteniendo el descarte sin POST de la captura inválida. La regresión debe recorrer ambas salidas en el mismo workspace.

La segunda revisión agotó las rondas ordinarias y elevó B-3 al dueño. La decisión posterior está en el checkpoint vigente.

## Entrega de las correcciones de revisión

2026-11-10. Corrección de revisión por Codex, rol implementer (GPT-6, PowerShell/Git/gh/Node/Vitest/Docker, variante y esfuerzo no expuestos). Retoma a pedido del dueño en el chat que publicó la primera revisión. Impacto en el ciclo del borrador y el aviso de duración de voz. Sin cambios HTTP, de permisos ni de persistencia.

PR42 abierto y listo para revisión en la rama `codex/t-036-voice-navigation`, HEAD de entrada `8699f85fa053dfa2b4d7931b92314840adafab50` y base publicada `a6210050f0e4c9a8ff98df62c50dbb4aebd995de`. Los negativos `npm test -- --run src/features/voice/VoiceDraftNavigation.test.tsx -t 'ignora la recarga|descarta audio que excedió' --reporter=dot` fallaron 2/2 antes de las correcciones (`.orchestrator/t036/review-fix-red.log`).

- Fuentes cerradas en `5858c588627c6966b33141fcc74a829a9ce49562`, árbol `client/src` `5810a64420b0570a5964560d406db71eab64b7b1`, sobre la base publicada anterior. B-1 invalida la recarga al desmontar el editor y verifica sesión/generación al resolver. B-2 valida el tiempo monotónico al detener, libera recursos y descarta el audio excedido con aviso.
- Desde `client/`, `npm test -- --run src/features/voice/VoiceDraftNavigation.test.tsx src/features/daily/DailyDraftNavigation.test.tsx src/features/auth/AuthSession.test.tsx src/features/voice/VoicePage.test.tsx src/features/voice/recorder.test.ts src/features/voice/useVoiceRecorder.test.tsx src/features/voice/useVoiceDraft.test.tsx src/features/voice/VoiceComposer.test.tsx src/app/AppRoutes.test.tsx --reporter=dot` pasó 115/115 (`.orchestrator/t036/review-fix-green.log`). Typecheck, lint y formato de las rutas afectadas pasaron.
- `bash scripts/verify.sh --policy origin/main` dio FULL/APPLICATION. Comando del gate `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t036-r2 STARTER_E2E_PROJECT=starter-e2e-t036-r2 STARTER_SERVER_TESTS=container bash scripts/verify.sh`. El primer arranque con `exec` sin `env` dio 127 antes de crear recursos. La invocación corregida dio exit 0 en FULL, 04:34:49Z–05:09:00Z. Docs 6 s, backend 520 s (221 Surefire + 210 Failsafe PostgreSQL, Spotless y JaCoCo), cliente 156 s (513/513, cobertura y build) y Playwright 1367 s (21 desktop + 20 mobile).
- Árbol limpio y huellas iguales antes/después: HEAD verificado `9d54e56f06214e230b9e78e03f08603336ac5dde`, árbol `e641798c04a22b246559560be757b8c689efc9e1`, `client/src` `5810a64420b0570a5964560d406db71eab64b7b1`, misma base publicada. Evidencia saneada en `.orchestrator/t036/full-r2-evidence.log`, log `full-r2.log` SHA-256 `f999369d0ed1aac40cc245e54f95308770894735b091ce851ace7dae1125630e`. El cierre solo cambia Markdown regular y conserva el gate.
- Ambos proyectos Compose tenían cero recursos antes y después. El runner retiró E2E. Se retiraron `starter-verify-t036-r2_default` y `starter-verify-t036-r2_m2-cache` tras cotejar sus labels exactos.

## Primera revisión independiente

2026-11-10. Primera revisión independiente, Codex (GPT-6, PowerShell/Git/gh/Node/Vitest, variante y esfuerzo no expuestos). La revisión modifica solo documentación operativa. PR42 OPEN, listo para revisión, `codex/t-036-voice-navigation` contra `main`. HEAD de entrada `bee9f75290ccbd61f476e4fbafc447cc25f3a59a`, base `a6210050f0e4c9a8ff98df62c50dbb4aebd995de`, ambos confirmados con `gh pr view` y `git ls-remote`. [verify-required SUCCESS](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/42754005208/job/129624018128) sobre ese HEAD.

- `bash scripts/verify.sh --policy origin/main` dio FULL/APPLICATION. `node scripts/docs-check.mjs` y `git diff --check` pasaron. El SHA-256 calculado sobre `.orchestrator/t036/full-gate.log` coincide con el extracto saneado. Verificadas las huellas del commit técnico `0c56492ba173a7b6e3608b80b6c9594210fc5048`, el padre/base y el cierre limitado a Markdown regular. La evidencia FULL se conserva para las fuentes revisadas.
- Desde `client/`, `npm test -- --run src/features/voice/VoiceDraftNavigation.test.tsx src/features/daily/DailyDraftNavigation.test.tsx src/features/auth/AuthSession.test.tsx src/features/voice/VoicePage.test.tsx src/features/voice/useVoiceRecorder.test.tsx src/features/voice/useVoiceDraft.test.tsx src/features/voice/VoiceComposer.test.tsx src/app/AppRoutes.test.tsx --reporter=dot` pasó 99/99.
- **B-1 · La recarga de un conflicto sobrevive al descarte de navegación.** `VoiceComposer.tsx` aplica el GET de «Descartar y recargar» con `draft.loadNote(fresh, { force: true })` después del await, sin comprobar que la operación sigue vigente. Sonda con router real y MSW: crear nota, provocar 409 al editar, retener el GET tras confirmar recarga, usar Atrás, pulsar «Descartar y continuar», liberar el GET y volver a Voz. El editor muestra «Respuesta tardía del detalle» donde se esperaba vacío. Cierre: invalidar o cancelar la recarga al descartar y comprobar sesión/generación antes de aplicar la respuesta. La regresión debe conservar vacío el borrador al volver y demostrar que la recarga confirmada vigente sigue funcionando.
- **B-2 · Se conserva audio fuera del límite tras suspensión.** `recorder.ts` calcula la duración final en `_assembleResult` y valida el tamaño, pero no rechaza la duración excedida. Sonda con grabador ficticio: avanzar el reloj monotónico 601 s sin ejecutar el timer y disparar `visibilitychange` a oculto. Los tracks se detienen y la UI ofrece «Transcribir», aunque S-105 exige descartar ese audio. Cierre: validar el tiempo real al detener, liberar los recursos y mostrar aviso sin blob ni POST para audio excedido. Conservar la acción explícita para audio válido al ocultar.

El veredicto quedó publicado en [PR42](https://github.com/MatiasNicolasAcevedo/devnotes/pull/42#issuecomment-6758979397), ligado al HEAD documental `8699f85fa053dfa2b4d7931b92314840adafab50` y la base publicada.

## Entrega de implementación

2026-11-10. Implementer, Codex (GPT-6, PowerShell/Git/gh/Node/Docker, variante y esfuerzo no expuestos). Impacto: comportamiento de navegación, ciclo de vida del borrador y mensajes de voz en la UI. Sin cambio de contrato HTTP, permisos ni persistencia.

`gh pr view` confirmó PR40 (T-035) MERGED en `main` con squash `e1fbaea1ca3ae868dd2ca93569da45eab65aa413` y PR41 (T-038) MERGED en `main` con squash `a6210050f0e4c9a8ff98df62c50dbb4aebd995de`. T-035 ya conciliada, T-038 conciliada en esta rama. Base publicada `a6210050f0e4c9a8ff98df62c50dbb4aebd995de`, padre único `e1fbaea1ca3ae868dd2ca93569da45eab65aa413`.

Implementación publicada en [PR42](https://github.com/MatiasNicolasAcevedo/devnotes/pull/42). El workspace por dueño conserva el borrador en memoria y antepone la guardia de voz al outlet diario.

### Evidencia de implementación

- Desde `client/`, `npm test -- --run src/features/voice/VoiceDraftNavigation.test.tsx src/features/daily/DailyDraftNavigation.test.tsx src/features/auth/AuthSession.test.tsx --reporter=dot`: 33/33, exit 0 (`.orchestrator/t036/acceptance.log`). `npm run verify` host: 511/511, typecheck, lint, formato, cobertura y build, exit 0 (`.orchestrator/t036-client-verify.log`).
- `bash scripts/verify.sh --policy origin/main`: FULL/APPLICATION. FULL con el comando del contrato, el 2026-11-10 entre 03:37:47Z y 04:06:49Z. Docs 5 s, Maven 407 s (221 Surefire + 210 Failsafe con PostgreSQL, Spotless/JaCoCo), cliente 121 s (511/511, 87.75 % statements y 82.16 % branches), Playwright 1206 s (21 desktop + 20 mobile). Las cuatro suites y el gate completo dieron exit 0. `reference preview:` pasó en ambos proyectos.
- Huellas iguales al inicio y al término, con árbol limpio: HEAD `0c56492ba173a7b6e3608b80b6c9594210fc5048`, árbol `8d09b1b76300ce516cc2d2f5454d2c1213c4ab2b`, `client/src` `4ed191fce1439a8a13b85e6a4ac63a69932c8495` y base `a6210050f0e4c9a8ff98df62c50dbb4aebd995de`. Evidencia saneada local en `.orchestrator/t036/full-gate-evidence.log`; log original `full-gate.log` SHA-256 `b72c841f7c0c9b3852421f1f729398fae5d53aeedd322793654b026320cbce00`. Este cierre solo modifica Markdown y conserva el gate.
- Cleanup: el runner retiró el stack E2E. Se retiraron la red `starter-verify-t036_default` y el volumen `starter-verify-t036_m2-cache` después de verificar sus labels. Ambos proyectos tenían cero contenedores, redes y volúmenes al salir. Se verificaron `docs-check` y `git diff --check` antes de publicar.

## Correcciones significativas

| Fecha | Problema/causa | Arreglo | Evidencia |
| --- | --- | --- | --- |
| 2026-11-10 | Un resultado persistente del grabador y la identidad variable de `draft` reactivaban la transcripción en cada render. | Consumir una vez la generación de captura en el workspace; reintento explícito y petición abortable. | `npm test -- --run src/features/voice/VoicePage.test.tsx -t 'un stop con resultado'`: rojo 11 POST cuando esperaba 1; verde con un único POST. |
| 2026-11-10 | El primer montaje por dueño remontaba también la barra de sesión, y la salida con captura podía recibir permiso tardío. | Mantener la barra fuera del subárbol privado y conservar la captura de enlaces daily sobre el shell. Invalidar la generación del permiso y detener tracks tardíos. | `AuthSession.test.tsx`, `DailyDraftNavigation.test.tsx` y `VoiceDraftNavigation.test.tsx`. |
| 2026-11-10 | B-1. Una recarga confirmada de conflicto aplicaba el GET después de desmontar el editor y descartar el borrador. | Invalidar la operación al desmontar y comprobar sesión y generación antes de aplicar la respuesta. | Regresión de navegación roja → verde y recarga vigente verde en `5858c58`. |
| 2026-11-10 | B-2. Un temporizador suspendido permitía conservar audio fuera del límite. | Medir el tiempo monotónico al detener y liberar recursos con aviso si excede el máximo. | Regresión de suspensión roja → verde y transcripción explícita de audio válido verde en `5858c58`. |
| 2026-11-10 | B-3. «Nueva nota» reiniciaba el borrador pero dejaba el grabador persistente en `error`, y el editor exige captura `idle` para grabar y guardar. | El `reset` del editor limpia el error terminado del grabador; `resetError` solo sale de `error`. | Regresión de recuperación roja → verde y negativo de captura en curso en `8b9438b`. |

## Cierre y siguiente tarea

Un PR de esta tarea con staging de rutas explícitas, sin plantilla/ ni ficheros de trabajo ajenos. No done hasta GitHub MERGED confirmado, revisión independiente y gate/CI vigentes. Tras MERGED, nueva sesión concilia done y toma T-037 tras MERGED; no comenzar otra implementación en la sesión de cierre. Si falta decisión fuera del contrato, checkpoint con evidencia/dato necesario; no rediseñar ni repetir intentos equivalentes.
