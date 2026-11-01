---
id: T-028
status: in_progress
priority: P1
size: S
executor: junie
role: implementer
milestone: M2
product_cycle: I2
spec: S-105
spec_version: 2
branch: codex/t-028-voice-api
pr: null
depends_on: [T-027]
---
# T-028 · CRUD y listado HTTP privados de voz

## Objetivo

CRUD y listado HTTP privados de voz, dentro de S-105/M2-RC1. Contrato completo; draft **solo por dependencia T-027 no MERGED/conciliada**. Junie puede habilitar ready al comprobarla sin otra planificación. Siguiente: T-029 tras MERGED. Retorno a frontera al objetivo M2-RC1 o decisión fuera de contrato, no por cada tarea.

## Alcance y decisiones resueltas

Exponer exactamente CRUD/listado de S-105, con DTOs separados, Location, no-store, validación/campos desconocidos, owner derivado de LocalOidcUser, CSRF y404/409. Sin transcripción ni cambios globales a contratos JSON. OpenAPI bajo interruptor existente.

## Leer antes

1. [S-105 v2](../specs/S-105-voice-notes.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. [TESTING](../TESTING.md).
4. [Implementer](../agents/implementer.md).
5. [Arquitectura](../ARCHITECTURE.md).

AGENTS raíz, STATUS y protocolo del rol son entrada común; no recorrer docs por rutina.

## Archivos y pasos

Rutas nuevas de backend bajo server/src/main/java/com/example/devnotes/ y sus tests bajo server/src/test/java/com/example/devnotes/; frontend bajo client/src/. voice/web/VoiceNoteController.java, VoiceNoteExceptionHandler.java y VoiceNoteDtos.java; security/SecurityConfig.java; tests voice/VoiceNoteApiIT.java y security/SecurityConfigTest.java.

1. Añadir allowlist exacta por método/ruta, sin abrir comodines; controller fino y DTOs locales a la feature.
2. Implementar códigos/ProblemDetail, no-store en éxitos/errores, validación de DTO/campos desconocidos y delete con revisión obligatoria.
3. Probar HTTP/Tomcat, OIDC local real y DB con dos actores; no atribuir al slice oidcLogin prueba de protocolo.

## Aceptación y pruebas

201/Location/GET/PUT/204 reales; lista privada, varias notas, tamaños/page inválidos, campos owner/id rechazados, UUID inválido, textos borde y revisión tope. Anónimo401; sin CSRF403 sin escritura; B GET/PUT/DELETE de A404 sin diferencias frente a inexistente; métodos/rutas vecinos denegados y respuestas no-store. Contratos diarios/referencias intactos.

- Iteración desde server/, Git Bash/JDK21 y Docker: `./mvnw -Dtest=SecurityConfigTest -Dsurefire.failIfNoSpecifiedTests=false -Dit.test=VoiceNoteApiIT clean verify`. Son nombres de pruebas que esta tarea debe crear/conservar; **no** evidencia de ejecución actual. Backend clean verify incluye IT PostgreSQL/Failsafe/JaCoCo; test solo no los acredita.
- Gate esperado **APPLICATION** desde raíz/Git Bash: `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t028 STARTER_E2E_PROJECT=starter-e2e-t028 STARTER_SERVER_TESTS=container bash scripts/verify.sh`. El diff completo manda: si incorpora configuración/tooling/dependencias, STARTER según TESTING. FULL una vez al cierre de fuentes; dirigidos durante iteración, sin rebajar suites/umbrales/retries/deadlines.
- Antes de operación larga: namespaces libres, SHA/base, huellas antes/después, comando/log saneado, recursos y cleanup exacto en checkpoint. No tocar starter-dev-local-nginx, volúmenes ajenos ni secretos; PowerShell usa el verificador canónico de SETUP con PATH Node/exit preservados.
- Antes de publicar: `node scripts/docs-check.mjs`, `git diff --check`, `bash scripts/verify.sh --policy origin/main` y revisar también diff sin commit. Markdown de cierre conserva gate si base/fuentes coinciden.

## Checkpoint vigente

2026-10-31: Junie implementer, Qwen3.6-27B-FP8. Implementación publicada d6218e9 en codex/t-028-voice-api, base main cf518dc. Backend gate OK: 202/202 tests, JaCoCo OK, Spotless OK. Policy APPLICATION. Pendiente: PR abierto, revisión independiente y gate FULL (incluye frontend/E2E).

## Correcciones significativas

Sin correcciones de implementación. Registrar aquí únicamente problema/causa, arreglo y prueba/SHA cuando ocurran.

## Cierre y siguiente tarea

Un PR de esta tarea con staging de rutas explícitas, sin plantilla/ ni ficheros de trabajo ajenos. No done hasta GitHub MERGED confirmado, revisión independiente y gate/CI vigentes. Tras MERGED, nueva sesión concilia done y toma T-029 tras MERGED; no comenzar otra implementación en la sesión de cierre. Si falta decisión fuera del contrato, checkpoint con evidencia/dato necesario; no rediseñar ni repetir intentos equivalentes.
