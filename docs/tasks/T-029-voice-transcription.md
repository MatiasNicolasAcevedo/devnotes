---
id: T-029
status: in_review
priority: P1
size: M
executor: junie
role: implementer
milestone: M2
product_cycle: I2
spec: S-105
spec_version: 2
branch: codex/t-029-voice-transcription
pr: 33
depends_on: [T-028]
---
# T-029 · Transcripción acotada mediante adaptador Groq

## Objetivo

Transcripción acotada mediante adaptador Groq, dentro de S-105/M2-RC1. Contrato completo; draft **solo por dependencia T-028 no MERGED/conciliada**. Junie puede habilitar ready al comprobarla sin otra planificación. Siguiente: T-030 tras MERGED. Retorno a frontera al objetivo M2-RC1 o decisión fuera de contrato, no por cada tarea.

## Alcance y decisiones resueltas

Adaptador RestClient/JDK21 y POST multipart de S-105. Modelo/parámetros/host fijos, sin redirects/retries/SDK nuevo ni DB. Configurar límites Spring y errores seguros; solo perfil e2e más flag test-provider admite destino ficticio fijo. Semáforo2/instancia y1/dueño, liberación en finally y deadline total60 s incluida lectura, no solo timeout de conexión.

## Leer antes

1. [S-105 v2](../specs/S-105-voice-notes.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. [TESTING](../TESTING.md).
4. [Implementer](../agents/implementer.md).
5. [Arquitectura](../ARCHITECTURE.md).

AGENTS raíz, STATUS y protocolo del rol son entrada común; no recorrer docs por rutina.

## Archivos y pasos

Rutas nuevas de backend bajo server/src/main/java/com/example/devnotes/ y sus tests bajo server/src/test/java/com/example/devnotes/; frontend bajo client/src/. voice/application/VoiceTranscriptionService.java, voice/infrastructure/GroqTranscriptionClient.java, voice/web/VoiceTranscriptionController.java y VoiceTranscriptionExceptionHandler.java; extender VoiceProperties.java, SecurityConfig.java y application.yaml. Tests GroqTranscriptionClientTest y VoiceTranscriptionApiIT. Tamaño M justificado por un único resultado: multipart→adaptador→respuesta segura; proxy/harness separados en T-030.

1. Implementar validación multipart/bytes/cabecera+DocType, admisión y llamada sin transacción; normalizar errores/probabilidad de no voz/duración/texto según spec.
2. Configurar transporte/deadline/cuerpo acotado, request fijo y secretos sin logs; definir inyección de transporte solo test y flag test-provider fijo del harness. El perfil e2e también lo usa dev.sh: exigir flag explícito y rechazarlo en otros perfiles; no URL arbitraria.
3. HttpServer JDK loopback en tests controla respuestas/latencia/cuerpo; IT con OIDC real prueba multipart y autorización; ningún gate contacta Groq.

## Aceptación y pruebas

Validar request saliente y formato recibido; success sin filas nuevas. Casos byte0, 20 MiB/exceso, MIME falsificado, WebM inválido, partes repetidas/extra, JSON malformado/excesivo, duración excesiva/NaN, silencio/metadatos, 429/Retry-After válido e inválido, 401/403 upstream como503 (no401 propio), 5xx/red/deadline y liberación de slots tras cada fallo. Usuario no autenticado/sin CSRF no llega al doble. El destino alternativo no funciona en perfiles ordinarios ni en desarrollo persistente sin flag. Deadline del doble2 s; productivo 60 s probado sin alargar tests. Límites probados con deadline inyectable solo en tests, sin aumentar plazos de producción ni retries.

- Iteración desde server/, Git Bash/JDK21 y Docker: `./mvnw -Dtest=GroqTranscriptionClientTest -Dsurefire.failIfNoSpecifiedTests=false -Dit.test=VoiceTranscriptionApiIT clean verify`. Son nombres de pruebas que esta tarea debe crear/conservar; **no** evidencia de ejecución actual. Backend clean verify incluye IT PostgreSQL/Failsafe/JaCoCo; test solo no los acredita.
- Gate esperado **STARTER** desde raíz/Git Bash: `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t029 STARTER_E2E_PROJECT=starter-e2e-t029 STARTER_SERVER_TESTS=container bash scripts/verify.sh --starter`. El diff completo manda: si incorpora configuración/tooling/dependencias, STARTER según TESTING. FULL una vez al cierre de fuentes; dirigidos durante iteración, sin rebajar suites/umbrales/retries/deadlines.
- Antes de operación larga: namespaces libres, SHA/base, huellas antes/después, comando/log saneado, recursos y cleanup exacto en checkpoint. No tocar starter-dev-local-nginx, volúmenes ajenos ni secretos; PowerShell usa el verificador canónico de SETUP con PATH Node/exit preservados.
- Antes de publicar: `node scripts/docs-check.mjs`, `git diff --check`, `bash scripts/verify.sh --policy origin/main` y revisar también diff sin commit. Markdown de cierre conserva gate si base/fuentes coinciden.

## Checkpoint vigente

2026-11-01: HEAD dac4b13, base main 32e5584. Junie implementer + reviewer, Qwen3.6-27B-FP8. Backend clean verify 210/210 OK (Surefire + Failsafe IT PostgreSQL), JaCoCo OK, Spotless OK. GroqTranscriptionClientTest 15/15, VoiceTranscriptionApiIT 8/8. Revisión independiente APROBADA sin bloqueantes. docs-check OK, policy FULL. Pendiente: gate STARTER completo, CI verde y merge.

## Correcciones significativas

Sin correcciones de implementación. Registrar aquí únicamente problema/causa, arreglo y prueba/SHA cuando ocurran.

## Cierre y siguiente tarea

Un PR de esta tarea con staging de rutas explícitas, sin plantilla/ ni ficheros de trabajo ajenos. No done hasta GitHub MERGED confirmado, revisión independiente y gate/CI vigentes. Tras MERGED, nueva sesión concilia done y toma T-030 tras MERGED; no comenzar otra implementación en la sesión de cierre. Si falta decisión fuera del contrato, checkpoint con evidencia/dato necesario; no rediseñar ni repetir intentos equivalentes.
