---
id: T-036
status: in_review
priority: P1
size: M
executor: junie
role: reviewer
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

2026-11-10. Implementer, Codex (GPT-6, PowerShell/Git/gh/Node/Docker, variante y esfuerzo no expuestos). Impacto: comportamiento de navegación, ciclo de vida del borrador y mensajes de voz en la UI. Sin cambio de contrato HTTP, permisos ni persistencia.

`gh pr view` confirmó PR40 (T-035) MERGED en `main` con squash `e1fbaea1ca3ae868dd2ca93569da45eab65aa413` y PR41 (T-038) MERGED en `main` con squash `a6210050f0e4c9a8ff98df62c50dbb4aebd995de`. T-035 ya conciliada, T-038 conciliada en esta rama. Base publicada `a6210050f0e4c9a8ff98df62c50dbb4aebd995de`, padre único `e1fbaea1ca3ae868dd2ca93569da45eab65aa413`.

Implementación publicada en [PR42](https://github.com/MatiasNicolasAcevedo/devnotes/pull/42). Retoma: revisión independiente del HEAD publicado y la base, según [reviewer](../agents/reviewer.md). El workspace por dueño conserva el borrador en memoria, antepone la guardia de voz al outlet diario y aísla captura y respuestas por sesión.

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

## Cierre y siguiente tarea

Un PR de esta tarea con staging de rutas explícitas, sin plantilla/ ni ficheros de trabajo ajenos. No done hasta GitHub MERGED confirmado, revisión independiente y gate/CI vigentes. Tras MERGED, nueva sesión concilia done y toma T-037 tras MERGED; no comenzar otra implementación en la sesión de cierre. Si falta decisión fuera del contrato, checkpoint con evidencia/dato necesario; no rediseñar ni repetir intentos equivalentes.
