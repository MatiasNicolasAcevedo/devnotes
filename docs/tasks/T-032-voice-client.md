---
id: T-032
status: in_review
priority: P1
size: S
executor: junie
role: implementer
milestone: M2
product_cycle: I2
spec: S-105
spec_version: 2
branch: codex/t-032-voice-client
pr: 36
depends_on: [T-031]
---
# T-032 · Cliente HTTP multipart y datos privados de voz

## Objetivo

Cliente HTTP multipart y datos privados de voz, dentro de S-105/M2-RC1. Contrato completo; draft **solo por dependencia T-031 no MERGED/conciliada**. Junie puede habilitar ready al comprobarla sin otra planificación. Siguiente: T-033 tras MERGED. Retorno a frontera al objetivo M2-RC1 o decisión fuera de contrato, no por cada tarea.

## Alcance y decisiones resueltas

Extender único http.ts para FormData sin JSON.stringify ni Content-Type manual y mantener cookies/CSRF/ProblemDetail/aborto/401. Opción formData mutuamente excluyente con body (tipos y defensa runtime). API Zod y hooks Query para capacidades/transcripción/CRUD; sin UI/captura. Sin retry de mutaciones ni transcripción.

## Leer antes

1. [S-105 v2](../specs/S-105-voice-notes.md).
2. [client/AGENTS](../../client/AGENTS.md).
3. [TESTING](../TESTING.md).
4. [Implementer](../agents/implementer.md).
5. [Arquitectura frontend](../ARCHITECTURE.md).

AGENTS raíz, STATUS y protocolo del rol son entrada común; no recorrer docs por rutina.

## Archivos y pasos

Rutas nuevas de backend bajo server/src/main/java/com/example/devnotes/ y sus tests bajo server/src/test/java/com/example/devnotes/; frontend bajo client/src/. client/src/services/http.ts y http.test.ts; features/voice/api.ts y api.test.ts; features/voice/useVoiceNotes.ts y useVoiceNotes.test.tsx. MSW local en tests o handlers explícitos ya existentes, sin fetch paralelo.

1. Añadir soporte formData sin romper callers JSON y pruebas de boundary/CSRF/same-origin/abort/sessionIsCurrent.
2. Crear schemas/funciones API exactos; timeout90 s en transcripción combinado con señal del caller, response code/retryAfterSeconds saneados y no filtración de error upstream.
3. Query keys ['voice', owner, ...] fuera de auth, invalidación tras mutar y retry=false; generación/owner validan callbacks. No setQueryData de datos privados desde mutaciones tardías.

## Aceptación y pruebas

Envío multipart real con browser boundary, JSON previo intacto, no body+formData, no CSRF a origen ajeno;401 vigente publica evento y401 obsoleto no expira sesión de B. Zod rechaza detalle inválido, límite/revisión, 204 se consume; sin retry tras429/403. Logout/identidad/abort en vuelo no repueblan cache ni invalidan datos de B. Network/ProblemDetail/proxy no JSON diferenciados.

- Iteración desde client/, Node 24/npm del lock: `npm test -- --run src/services/http.test.ts src/features/voice/api.test.ts src/features/voice/useVoiceNotes.test.tsx`. Son nombres de pruebas que esta tarea debe crear/conservar; **no** evidencia de ejecución actual. Backend clean verify incluye IT PostgreSQL/Failsafe/JaCoCo; test solo no los acredita.
- Gate esperado **APPLICATION** desde raíz/Git Bash: `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t032 STARTER_E2E_PROJECT=starter-e2e-t032 STARTER_SERVER_TESTS=container bash scripts/verify.sh`. El diff completo manda: si incorpora configuración/tooling/dependencias, STARTER según TESTING. FULL una vez al cierre de fuentes; dirigidos durante iteración, sin rebajar suites/umbrales/retries/deadlines.
- Antes de operación larga: namespaces libres, SHA/base, huellas antes/después, comando/log saneado, recursos y cleanup exacto en checkpoint. No tocar starter-dev-local-nginx, volúmenes ajenos ni secretos; PowerShell usa el verificador canónico de SETUP con PATH Node/exit preservados.
- Antes de publicar: `node scripts/docs-check.mjs`, `git diff --check`, `bash scripts/verify.sh --policy origin/main` y revisar también diff sin commit. Markdown de cierre conserva gate si base/fuentes coinciden.

## Checkpoint vigente

2026-11-01: PR36 publicado (HEAD e449003). Client gate OK: 408 tests, 82.12% coverage. Gate APPLICATION: docs OK, server 210/210 OK (347s), client OK (78s). E2E FALLÓ por variable STARTER_E2E_ARTIFACTS ausente (preexistente, no afecta T-032 — sin specs de voz aún). Junie implementer, Qwen3.6-27B-FP8. Pendiente: revisión independiente.

## Correcciones significativas

Sin correcciones de implementación. Registrar aquí únicamente problema/causa, arreglo y prueba/SHA cuando ocurran.

## Cierre y siguiente tarea

Un PR de esta tarea con staging de rutas explícitas, sin plantilla/ ni ficheros de trabajo ajenos. No done hasta GitHub MERGED confirmado, revisión independiente y gate/CI vigentes. Tras MERGED, nueva sesión concilia done y toma T-033 tras MERGED; no comenzar otra implementación en la sesión de cierre. Si falta decisión fuera del contrato, checkpoint con evidencia/dato necesario; no rediseñar ni repetir intentos equivalentes.
