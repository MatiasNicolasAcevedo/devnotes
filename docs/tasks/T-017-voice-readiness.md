---
id: T-017
status: in_review
priority: P1
size: S
executor: junie
role: implementer
milestone: M2
product_cycle: I2
spec: S-105
spec_version: 2
branch: codex/t-017-voice-readiness
pr: null
depends_on: [T-026]
---
# T-017 · Disponibilidad privada y base apagada de voz

## Objetivo

Publicar los contratos preparados por frontera y dejar una base de voz deshabilitada por defecto, observable mediante capacidades privadas sin contactar Groq. Es el primer avance implementable de I2, no un PR documental separado. Conserva ID/rama del draft de readiness; su planificación ya está realizada y la próxima sesión es Junie implementer. Siguiente T-027 tras MERGED; salida de iteración T-037/M2-RC1.

## Alcance y decisiones resueltas

S-105 v2 cierra el producto, las doce tareas y el protocolo externo. Esta tarea implementa únicamente propiedades devnotes.voice.enabled/api-key, binding de DEVNOTES_VOICE_ENABLED/GROQ_API_KEY y GET /api/v1/voice/capabilities con allowlist exacta, sesión y no-store. Apagado prevalece sobre clave; enabled sin clave devuelve reason not_configured; enabled con clave recordingEnabled=true/reason=null sin ping ni validación externa. Sin clave en DTO, toString, OpenAPI o logs. CRUD/transcripción/micrófono quedan en tareas siguientes. No dependencias nuevas.

La cuenta/ensayo real pendiente no impide la base apagada. No habilitar Groq, leer secretos ni cambiar AUTONOMY. La solicitud del dueño del 2026-10-31 habilita la planificación I2; el contrato conserva activación externa separada.

## Leer antes

1. [S-105 v2](../specs/S-105-voice-notes.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. [TESTING](../TESTING.md).
4. [Implementer](../agents/implementer.md).
5. [VOICE-RELEASE](../VOICE-RELEASE.md).

## Archivos y pasos

1. Reconsultar PR29 MERGED/main y preservar cambios locales. La rama exacta ya existe desde main0d976dc; no recrearla ni perder contratos sin commit. Comprobar PR25/26: solo cambian STATUS para tareas ya mergeadas. Antes de abrir el PR de T-017, reconciliar esas propuestas obsoletas; se pueden cerrar sin merge y sin borrar ramas si el diff sigue exclusivamente documental y superado. Si cambió su alcance, checkpoint al dueño. No incorporarlas a main.
2. Publicar con el primer código los Markdown de esta planificación y las conciliaciones preexistentes de BACKLOG/STATUS/T-026, verificadas contra GitHub. Excluir pr27-DailyContent.java, su .b64, pr27-content.diff y plantilla/. Conservar esos ficheros locales.
3. Crear voice/config/VoiceProperties.java, voice/web/VoiceCapabilitiesController.java, modificar SecurityConfig.java y application.yaml. DTO record local al controlador basta; no añadir interfaces/servicios vacíos. Tests VoiceCapabilitiesTest y VoiceCapabilitiesApiIT junto a la feature.
4. Añadir configuración privada a .env.example solo como nombres vacíos/defaults, sin secreto. La transmisión Compose y la guía operativa se completan en T-030; todavía no anunciar voz activable por dev.sh.

## Aceptación y pruebas

- VoiceCapabilitiesTest cubre disabled, enabled/sin clave y enabled/con clave ficticia; JSON no expone secreto ni URL, valores exactos y no hay IO externo. API IT usa OIDC HTTP real y PostgreSQL: autenticado200/no-store, anónimo401, métodos vecinos denegados. No relajar denyAll.
- Iteración, Git Bash desde server con JDK21/Docker: `./mvnw -Dtest=VoiceCapabilitiesTest -Dsurefire.failIfNoSpecifiedTests=false -Dit.test=VoiceCapabilitiesApiIT clean verify`. Nombres de tests previstos, no evidencia de ejecución actual.
- Perfil esperado STARTER por application.yaml/.env.example. Gate desde raíz Git Bash: `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t017 STARTER_E2E_PROJECT=starter-e2e-t017 STARTER_SERVER_TESTS=container bash scripts/verify.sh --starter`. Dirigidos durante iteración; gate una vez al cierre. Conservar suites/cobertura.
- Antes del gate verificar namespaces libres, checkpoint SHA/base/huellas/log saneado/recursos y cleanup exacto según TESTING. Preservar stack starter-dev-local-nginx. PowerShell usa el verificador canónico de SETUP, conserva PATH del Node y exit.
- Antes de publicar: `node scripts/docs-check.mjs`, `git diff --check`, `bash scripts/verify.sh --policy origin/main`; policy informa commits, revisar también diff pendiente.

## Checkpoint vigente

2026-10-31: Junie implementer, Qwen3.6-27B-FP8. VoiceProperties, VoiceCapabilitiesController, SecurityConfig, application.yaml, .env.example, tests dirigidos 10/10 OK. PR30 publicado (3992d97, base 0d976dc). Backend gate 354/354 OK (188 unit + 166 IT). Client gate falló por 3 tests preexistentes en main (DailyNotesPage, ReferencePreview, ReferenceSession) — verificado en main 0d976dc sin mis cambios. docs-check OK, git diff --check OK, policy STARTER. Listo para revisión independiente. Cleanup: starter-verify-t017 y starter-verify-main-check eliminados.

## Correcciones significativas

| Fecha | Problema / causa | Decisión | Evidencia |
| --- | --- | --- | --- |
| 2026-10-31 | Draft mezclaba planificación y smoke externo como bloqueo de toda I2 | Cerrar contrato y construir base apagada; activación externa con evidencia separada; conservar ID/rama y reasignar próxima ejecución | S-105 v2 y VOICE-RELEASE; sin éxito runtime supuesto |

## Cierre y siguiente tarea

Implementación publicada: PR30 (3992d97, base 0d976dc). Backend 354/354 OK. Client gate falló por 3 tests preexistentes en main. docs-check OK, policy STARTER. Listo para revisión independiente.

Tras MERGED confirmado, nueva sesión concilia done y habilita T-027; no implementarla en la sesión que cierra esta. No merge ni revisión propia.
