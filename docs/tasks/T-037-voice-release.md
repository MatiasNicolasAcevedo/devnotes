---
id: T-037
status: in_progress
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

2026-11-10. `in_progress`. Implementer en sesión nueva, Claude Code (Claude Opus 5.5, `claude-opus-5-5`, PowerShell/Git Bash/Git/gh/Node 24.21.0/JDK 21/Maven/Docker; esfuerzo no expuesto). Dependencia satisfecha: `gh pr view 42 --repo MatiasNicolasAcevedo/devnotes --json number,url,state,mergedAt,mergeCommit,headRefOid,baseRefName` devolvió MERGED, squash `289dd66acfad5bb632ad3270a90963c17d239f96`, `mergedAt` 2026-11-10T06:39:13Z; T-036 conciliada como done en esta rama. Base `main` `289dd66`.

Impacto. Comportamiento/API: la transcripción acepta el WebM real de MediaRecorder (antes rechazaba todo audio de navegador con 400) y `createdAt`/`updatedAt` de voz usan el instante UTC truncado a microsegundos (antes adelantado hasta casi 1 s, con orden de la lista incorrecto). Sin cambios de contrato HTTP, permisos, esquema ni UI. Harness: `scripts/e2e.sh` levanta también `voice-provider`, por lo que el perfil del diff es **STARTER**.

- Hecho. `e2e/fixtures/voice-fixture.ts` (flags de micrófono sintético de Chromium, permisos `microphone`/`clipboard-*` solo para `http://localhost`, sonda de solo lectura de tracks, escenarios del doble por la red privada) y `e2e/tests/voice.spec.ts` con dos recorridos `voice:`. Tres defectos corregidos con rojo → verde; ver [Correcciones significativas](#correcciones-significativas).
- Iteración desde la raíz con `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false STARTER_E2E_PROJECT=starter-e2e-t037-iter bash scripts/e2e.sh --grep "voice:" --project desktop|mobile`: desktop 2/2 y mobile 2/2 exit 0 con las fuentes finales del spec (logs `.orchestrator/t037/iter5.log`, `iter6.log`; el segundo recorrido desktop pasó en `iter3.log`, antes del arreglo de reloj). Cleanup propio por labels comprobado sin restos.
- Backend dirigido desde `server/`: `VoiceTranscriptionServiceTest`, `VoiceNoteServiceTest` y `GroqTranscriptionClientTest` verdes; Failsafe `VoiceTranscriptionApiIT` 8/8, `VoiceNoteServiceIT` 24/24 y `VoiceNoteApiIT` 12/12.
- Pendiente. Gate STARTER único con fuentes quietas: `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t037 STARTER_E2E_PROJECT=starter-e2e-t037 STARTER_SERVER_TESTS=container bash scripts/verify.sh --starter`, log en `.orchestrator/t037/starter-gate.log`. Recursos propios: proyectos Compose `starter-verify-t037` y `starter-e2e-t037`, limpiados por el propio script. Después, evidencia VO-01…07 en VOICE-RELEASE, PR y revisión independiente.

## Correcciones significativas

| Fecha | Problema/causa | Arreglo | Evidencia |
| --- | --- | --- | --- |
| 2026-11-10 | `scripts/e2e.sh` corre el runner con `--no-deps` y su `up --wait` no incluía `voice-provider`: el doble nunca arrancaba (`getaddrinfo ENOTFOUND voice-provider`). | Añadir `voice-provider` al `up --wait`; regresión estática que exige todo `depends_on` del runner en esa lista. | E2E `iter1.log` rojo; `node --test scripts/ci/e2e-arguments.test.mjs` rojo (`tooling-red.log`) → 20/20 (`tooling-green.log`). |
| 2026-11-10 | El backend exigía una cabecera RIFF con `webm` en el offset 8; WebM es EBML, y todo audio de Chromium recibía 400 `VOICE_INVALID_REQUEST`. Los IT usaban la misma cabecera ficticia. | Leer un prefijo acotado y exigir la firma EBML con DocType `webm` dentro del tamaño declarado; RIFF, `matroska`, truncados y VINT inválidos se rechazan sin llamar al proveedor. Fixture IT con la cabecera de MediaRecorder. | E2E `iter2.log` 400; `VoiceTranscriptionServiceTest` rojo (`webm-red.log`) → verde; `VoiceTranscriptionApiIT` 8/8. |
| 2026-11-10 | `VoiceNoteService.nowMicros()` sumaba dos veces la fracción de milisegundos y adelantaba `createdAt` hasta casi 1 s; la nota más nueva podía listarse después. | `clock.instant().truncatedTo(MICROS)` en una sola lectura. Daily repite el patrón, fuera de alcance: BACKLOG. | E2E `iter4.log` orden invertido; `VoiceNoteServiceTest` rojo `21.946Z` en vez de `20.973456Z` (`clock-red.log`) → verde; IT de voz 36/36. |

## Cierre y siguiente tarea

Un PR de esta tarea con staging de rutas explícitas, sin plantilla/ ni ficheros de trabajo ajenos. No done hasta GitHub MERGED confirmado, revisión independiente y gate/CI vigentes. Tras MERGED, nueva sesión concilia done y entrega al dueño/frontera la activación/pruebas de M2-RC1; no comenzar otra implementación en la sesión de cierre. Si falta decisión fuera del contrato, checkpoint con evidencia/dato necesario; no rediseñar ni repetir intentos equivalentes.
