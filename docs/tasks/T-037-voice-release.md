---
id: T-037
status: draft
priority: P1
size: M
executor: junie
role: implementer
milestone: M2
product_cycle: I2
spec: S-105
spec_version: 2
branch: codex/t-037-voice-release
pr: null
depends_on: [T-036]
---
# T-037 · Recorrido integrado y entrega local M2-RC1

## Objetivo

Recorrido integrado y entrega local M2-RC1, dentro de S-105/M2-RC1. Contrato completo; draft **solo por dependencia T-036 no MERGED/conciliada**. Junie puede habilitar ready al comprobarla sin otra planificación. Siguiente: el dueño/frontera para activación/pruebas de M2-RC1. Retorno a frontera al objetivo M2-RC1 o decisión fuera de contrato, no por cada tarea.

## Alcance y decisiones resueltas

Demostrar VO-01…07 con Chromium real, API/DB/OIDC propios reales y doble externo de Groq; preparar SHA congelado, guía y traspaso a pruebas del dueño. E2E no mockea API propia, getUserMedia ni MediaRecorder. No declarar precisión/latencia de Groq por el doble ni activar servicio real por esta tarea.

## Leer antes

1. [S-105 v2](../specs/S-105-voice-notes.md).
2. [client/AGENTS](../../client/AGENTS.md).
3. [server/AGENTS](../../server/AGENTS.md).
4. [TESTING](../TESTING.md).
5. [VOICE-RELEASE](../VOICE-RELEASE.md).

AGENTS raíz, STATUS y protocolo del rol son entrada común; no recorrer docs por rutina.

## Archivos y pasos

Rutas nuevas de backend bajo server/src/main/java/com/example/devnotes/ y sus tests bajo server/src/test/java/com/example/devnotes/; frontend bajo client/src/. e2e/tests/voice.spec.ts y e2e/fixtures/voice-fixture.ts; reutilizar fixtures OIDC existentes. docs/VOICE-RELEASE.md y esta tarea registran evidencia; STATUS solo prompt. No tocar harness/config/scripts salvo defecto necesario: si cambia el perfil real a STARTER, aplicar gate correspondiente.

1. Fixture browser/context con args Chromium de micrófono sintético y permisos microphone/clipboard limitados al origen; WAV sintético generado en memoria/test temporal si hace falta, sin voz personal. No globalizar permisos a suites que no lo necesitan ni exportar audio/trazas crudas.
2. Recorridos cortos 'voice:' para captura→texto→editar/copiar→guardar/reload→segunda nota→corregir/borrar, ambos viewports. Otra identidad privada/OIDC real y navegación/logout/late response. Reutilizar negativos API/componentes en lugar de repetir matriz entera en browser; incluir un error proveedor por proxy y vuelta a daily/reference/history.
3. Gate final una vez con fuentes quietas, registrar VO por capa/SHA/base, cleanup y CI. Completar estado de entrega en VOICE-RELEASE. Si existe configuración/autorización específica, seguir allí el ensayo externo acotado; si falta, declarar activación pendiente sin bloquear publicación de RC técnica ni inventar resultados.

## Aceptación y pruebas

Recorrido browser con stop/tracks terminados y texto del doble; sin fila antes de Guardar; varias notas sobreviven reload, copiar corrección exacta y borrar confirmada. Dos actores sin fuga;375 sin overflow y foco/teclado; daily/versions/reference siguen pasando. Suite no usa page.route/interceptores sobre API propia. Matriz VO-01…07 enlaza evidencia concreta. Un fallo preexistente (incluido saneador mencionado en T-026) no cuenta como FULL verde; acotar corrección o checkpoint según protocolo. Entrega técnica y aceptación externa/dueño tienen estados distintos.

- Iteración desde client/, Node 24/npm del lock: `npm test -- --run src/features/voice/VoiceComposer.test.tsx src/features/voice/VoicePage.test.tsx src/features/voice/VoiceDraftNavigation.test.tsx`. Son nombres de pruebas que esta tarea debe crear/conservar; **no** evidencia de ejecución actual. Backend clean verify incluye IT PostgreSQL/Failsafe/JaCoCo; test solo no los acredita.
- Gate esperado **APPLICATION** desde raíz/Git Bash: `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t037 STARTER_E2E_PROJECT=starter-e2e-t037 STARTER_SERVER_TESTS=container bash scripts/verify.sh`. El diff completo manda: si incorpora configuración/tooling/dependencias, STARTER según TESTING. FULL una vez al cierre de fuentes; dirigidos durante iteración, sin rebajar suites/umbrales/retries/deadlines.
- Antes de operación larga: namespaces libres, SHA/base, huellas antes/después, comando/log saneado, recursos y cleanup exacto en checkpoint. No tocar starter-dev-local-nginx, volúmenes ajenos ni secretos; PowerShell usa el verificador canónico de SETUP con PATH Node/exit preservados.
- Antes de publicar: `node scripts/docs-check.mjs`, `git diff --check`, `bash scripts/verify.sh --policy origin/main` y revisar también diff sin commit. Markdown de cierre conserva gate si base/fuentes coinciden.

Iteración browser desde raíz/Git Bash, después de T-031: `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false STARTER_E2E_PROJECT=starter-e2e-t037-iter bash scripts/e2e.sh --grep "voice:" --project desktop`. La entrada ya implementada conserva arranque/readiness/IPC/saneador/cleanup; no Docker Playwright directo ni runner aislado. FULL de cierre sin filtros incluye ambos viewports. Conservar deadlines/retries. El fixture del browser debe usar el Chromium Playwright con flags de micrófono; getUserMedia/MediaRecorder y la API propia siguen reales.

## Checkpoint vigente

2026-10-31: contrato de frontera preparado en T-017 sobre main 0d976dc2187cb2a07061c3db48130c334b1e471b. Sin implementación, PR, migración aplicada ni tests de esta tarea ejecutados. Rol/modelo/herramienta/esfuerzo del ejecutor se registran al tomarla; no heredar capacidades Junie de frontera.

## Correcciones significativas

Sin correcciones de implementación. Registrar aquí únicamente problema/causa, arreglo y prueba/SHA cuando ocurran.

## Cierre y siguiente tarea

Un PR de esta tarea con staging de rutas explícitas, sin plantilla/ ni ficheros de trabajo ajenos. No done hasta GitHub MERGED confirmado, revisión independiente y gate/CI vigentes. Tras MERGED, nueva sesión concilia done y entrega al dueño/frontera la activación/pruebas de M2-RC1; no comenzar otra implementación en la sesión de cierre. Si falta decisión fuera del contrato, checkpoint con evidencia/dato necesario; no rediseñar ni repetir intentos equivalentes.
