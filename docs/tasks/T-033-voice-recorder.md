---
id: T-033
status: in_progress
priority: P1
size: S
executor: junie
role: implementer
milestone: M2
product_cycle: I2
spec: S-105
spec_version: 2
branch: codex/t-033-voice-recorder
pr: null
depends_on: [T-032]
---
# T-033 · Ciclo de vida seguro del micrófono

## Objetivo

Ciclo de vida seguro del micrófono, dentro de S-105/M2-RC1. Contrato completo; draft **solo por dependencia T-032 no MERGED/conciliada**. Junie puede habilitar ready al comprobarla sin otra planificación. Siguiente: T-034 tras MERGED. Retorno a frontera al objetivo M2-RC1 o decisión fuera de contrato, no por cada tarea.

## Alcance y decisiones resueltas

Hook/controlador de captura sin pantalla de colección ni llamada propia al proveedor. MediaRecorder y getUserMedia reales en producción, APIs inyectables solo para unitarios. Entrega blob completo y estado al consumidor; S-105 fija formatos, límites, permisos y limpieza.

## Leer antes

1. [S-105 v2](../specs/S-105-voice-notes.md).
2. [client/AGENTS](../../client/AGENTS.md).
3. [TESTING](../TESTING.md).
4. [Implementer](../agents/implementer.md).
5. [Arquitectura frontend](../ARCHITECTURE.md).

AGENTS raíz, STATUS y protocolo del rol son entrada común; no recorrer docs por rutina.

## Archivos y pasos

Rutas nuevas de backend bajo server/src/main/java/com/example/devnotes/ y sus tests bajo server/src/test/java/com/example/devnotes/; frontend bajo client/src/. features/voice/recorder.ts y recorder.test.ts; features/voice/useVoiceRecorder.ts y useVoiceRecorder.test.tsx. No dependencias, persistencia, workers ni conversión de audio.

1. Implementar selección MIME, reloj/duración/tamaño, ensamblaje final y stop idempotente; preferencia mono sin convertirla en constraint obligatorio.
2. Implementar cancelación de permiso pendiente y track tardío, error/ended/hidden/pagehide/dispose/logoutPending; exponer blob listo o descartado, sin transcribir automáticamente al ocultar pestaña.
3. Pruebas con reloj controlado y eventos en orden adverso; hook libera todo en cleanup aun con React StrictMode.

## Aceptación y pruebas

Cero solicitud al montar; gesto inicia una sola captura. final dataavailable anterior a stop se conserva; double start/stop no duplica blob. Max600 s y20 MiB/overflow final/suspensión, vacío, APIs ausentes/MIME no soportado y permiso denegado tienen salida explícita. Stream tardío tras cancelar se detiene. Todos los tracks/timers/listeners liberados tras error/logout/desmontaje; hidden conserva audio válido detenido y no sigue grabando.

- Iteración desde client/, Node 24/npm del lock: `npm test -- --run src/features/voice/recorder.test.ts src/features/voice/useVoiceRecorder.test.tsx`. Son nombres de pruebas que esta tarea debe crear/conservar; **no** evidencia de ejecución actual. Backend clean verify incluye IT PostgreSQL/Failsafe/JaCoCo; test solo no los acredita.
- Gate esperado **APPLICATION** desde raíz/Git Bash: `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t033 STARTER_E2E_PROJECT=starter-e2e-t033 STARTER_SERVER_TESTS=container bash scripts/verify.sh`. El diff completo manda: si incorpora configuración/tooling/dependencias, STARTER según TESTING. FULL una vez al cierre de fuentes; dirigidos durante iteración, sin rebajar suites/umbrales/retries/deadlines.
- Antes de operación larga: namespaces libres, SHA/base, huellas antes/después, comando/log saneado, recursos y cleanup exacto en checkpoint. No tocar starter-dev-local-nginx, volúmenes ajenos ni secretos; PowerShell usa el verificador canónico de SETUP con PATH Node/exit preservados.
- Antes de publicar: `node scripts/docs-check.mjs`, `git diff --check`, `bash scripts/verify.sh --policy origin/main` y revisar también diff sin commit. Markdown de cierre conserva gate si base/fuentes coinciden.

## Checkpoint vigente

2026-10-31: contrato de frontera preparado en T-017 sobre main 0d976dc2187cb2a07061c3db48130c334b1e471b. Sin implementación, PR, migración aplicada ni tests de esta tarea ejecutados. Rol/modelo/herramienta/esfuerzo del ejecutor se registran al tomarla; no heredar capacidades Junie de frontera.

## Correcciones significativas

Sin correcciones de implementación. Registrar aquí únicamente problema/causa, arreglo y prueba/SHA cuando ocurran.

## Cierre y siguiente tarea

Un PR de esta tarea con staging de rutas explícitas, sin plantilla/ ni ficheros de trabajo ajenos. No done hasta GitHub MERGED confirmado, revisión independiente y gate/CI vigentes. Tras MERGED, nueva sesión concilia done y toma T-034 tras MERGED; no comenzar otra implementación en la sesión de cierre. Si falta decisión fuera del contrato, checkpoint con evidencia/dato necesario; no rediseñar ni repetir intentos equivalentes.
