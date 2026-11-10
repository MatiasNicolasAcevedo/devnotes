---
id: T-037
status: mergeable
priority: P1
size: M
executor: junie
role: implementer
milestone: M2
product_cycle: I2
spec: S-105
spec_version: 2
branch: codex/t-037-voice-release
pr: 44
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

2026-11-10. `mergeable`. La revisión independiente no encontró bloqueantes; evidencia en [Revisión independiente](#revisión-independiente). El veredicto `APROBADO` se publica en PR44 ligado al HEAD documental de esta transición y la base `289dd66acfad5bb632ad3270a90963c17d239f96`, después de la CI `verify-required` de ese HEAD. Siguiente: merge según AUTONOMY y merger; tras MERGED confirmado, sesión nueva concilia done, congela el SHA de entrega en VOICE-RELEASE y entrega al dueño/frontera la activación y las pruebas de M2-RC1.

Entrega del implementer: [PR44](https://github.com/MatiasNicolasAcevedo/devnotes/pull/44), fuentes técnicas `8775ac9485e61e9a47974f1802543d95ce638fde` sobre main `289dd66acfad5bb632ad3270a90963c17d239f96`. Gate STARTER verde ([Gate de cierre](#gate-de-cierre)) y CI `verify-required` verde en ese HEAD. El cierre posterior solo cambia Markdown y conserva el gate. VOICE-RELEASE declara la entrega «en revisión» y la activación externa pendiente.

Implementer en sesión nueva, Claude Code (Claude Opus 5.5, `claude-opus-5-5`, PowerShell/Git Bash/Git/gh/Node 24.21.0/JDK 21/Maven/Docker; esfuerzo no expuesto). Dependencia satisfecha: `gh pr view 42 --repo MatiasNicolasAcevedo/devnotes --json number,url,state,mergedAt,mergeCommit,headRefOid,baseRefName` devolvió MERGED, squash `289dd66`, `mergedAt` 2026-11-10T06:39:13Z. T-036 está conciliada como done en el primer commit de esta rama.

Impacto. En comportamiento y API, la transcripción acepta el WebM real de MediaRecorder; antes rechazaba todo audio de navegador con 400. `createdAt` y `updatedAt` de voz usan el instante UTC truncado a microsegundos; antes se adelantaban hasta casi 1 s y la lista podía quedar desordenada. Sin cambios de contrato HTTP, permisos, esquema ni UI. En el harness, `scripts/e2e.sh` levanta también `voice-provider`, por lo que el perfil del diff es **STARTER**.

- `e2e/fixtures/voice-fixture.ts` aporta los flags de micrófono sintético de Chromium, sin archivo de audio ni voz personal. Concede `microphone` y `clipboard-*` solo a `http://localhost`, observa los tracks con una sonda de solo lectura y fija escenarios del doble por la red privada. `e2e/tests/voice.spec.ts` define dos recorridos `voice:`. La suite no usa `page.route` ni interceptores. getUserMedia, MediaRecorder y la API propia son reales.
- Iteración desde la raíz: `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false STARTER_E2E_PROJECT=starter-e2e-t037-iter bash scripts/e2e.sh --grep "voice:" --project desktop|mobile`. Con las fuentes finales dio 2/2 en mobile (`.orchestrator/t037/iter6.log`) y el primer recorrido en desktop (`iter5.log`); el FULL cubre ambos en ambos viewports.
- Backend dirigido desde `server/`: `VoiceTranscriptionServiceTest`, `VoiceNoteServiceTest` y `GroqTranscriptionClientTest` verdes. En Failsafe, `VoiceTranscriptionApiIT` 8/8, `VoiceNoteServiceIT` 24/24 y `VoiceNoteApiIT` 12/12.
- Ensayo Groq externo no realizado: falta configuración y autorización del dueño. Se declara la activación pendiente sin inventar resultados, según VOICE-RELEASE.

## Revisión independiente

2026-11-10. Reviewer en sesión nueva, Claude Code (Claude Opus 5.5, `claude-opus-5-5`, PowerShell/Git Bash/Git/gh/Node 24.21.0/JDK 21/Maven; esfuerzo no expuesto). No implementó esta tarea. Esta revisión cambia solo documentación operativa. PR44 OPEN, no draft, `codex/t-037-voice-release` contra `main`, `mergeStateStatus` CLEAN, sin hilos de revisión. HEAD de entrada `cb318c9f3c5e68df57e43502d1863128f4325788` y base `289dd66acfad5bb632ad3270a90963c17d239f96`, confirmados con `gh pr view` y `git ls-remote`. [verify-required SUCCESS](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/42780397632/job/129708784386) para ese HEAD; `8775ac9` también tuvo `verify-required` SUCCESS.

- **Gate.** `git diff --name-only 8775ac9 cb318c9` toca solo `docs/STATUS.md`, `docs/VOICE-RELEASE.md` y esta tarea. `classify-diff.mjs --base 289dd66 --head cb318c9` da `profile=STARTER`, cubierto por `verify.sh --starter`. El log local del gate coincide con el SHA-256 registrado: `START` y `END` con HEAD `8775ac9`, base `289dd66`, `DIRTY=0` y exit 0. Surefire 227/227. E2E con 45 aprobados y sin fallos, incluidos los dos `voice:` en desktop y en mobile.
- **Rojo/verde reproducido** en un worktree aislado de `8775ac9`, restaurando desde `289dd66` solo `scripts/e2e.sh`, `VoiceNoteService.java` y `VoiceTranscriptionService.java`. Rojo: `node --test scripts/ci/e2e-arguments.test.mjs` 19/20 (`e2e.sh up starts voice-provider`). `VoiceNoteServiceTest` 2/2 fallan con `21.946Z` en vez de `20.973456Z`. `VoiceTranscriptionServiceTest` falla en «acepta EBML» (`InvalidRequest`) y en «rechaza RIFF». Verde con las fuentes del PR: 20/20 y Surefire `VoiceNoteServiceTest` 2/2, `VoiceTranscriptionServiceTest` 4/4 y `GroqTranscriptionClientTest` 15/15. El worktree se retiró.
- **Código.** `nowMicros()` hace una sola lectura del reloj truncada a microsegundos. El parser EBML lee como máximo 256 bytes, acota cada tamaño y desplazamiento al prefijo leído y al tamaño declarado de la cabecera, y avanza siempre. No llama al proveedor ante RIFF, `matroska`, truncados o VINT inválidos. `e2e.sh` añade `voice-provider` al `up --wait`, con una regresión estática que exige todos los `depends_on` del runner.
- **Recorridos `voice:`.** Sin `page.route` ni interceptores sobre la API propia. El fixture concede permisos solo al origen de la SPA y envuelve `getUserMedia` para registrar los tracks del stream real, que devuelve sin cambios. MediaRecorder y la API propia son los reales. El doble se controla por la red privada. La matriz VO-01…07 de VOICE-RELEASE corresponde a las aserciones de `e2e/tests/voice.spec.ts`.
- `node scripts/docs-check.mjs` y `git diff --check 289dd66 cb318c9` pasaron. Sin recursos Docker creados.

Observación no bloqueante: el comentario de `vint` dice que rechaza tamaños reservados, pero el tamaño desconocido de un byte (`0xFF`, 127) cabe en el prefijo. No hay riesgo, porque igual exige un DocType `webm` completo dentro de lo leído.

Sin bloqueantes. Veredicto favorable sujeto a la CI del HEAD documental.

## Gate de cierre

STARTER, una sola vez con fuentes quietas. `bash scripts/verify.sh --policy origin/main` dio `profile=STARTER` por `scripts/e2e.sh` y `scripts/ci/e2e-arguments.test.mjs`. Comando desde la raíz con Git Bash: `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t037 STARTER_E2E_PROJECT=starter-e2e-t037 STARTER_SERVER_TESTS=container bash scripts/verify.sh --starter`.

- Corrió de 2026-11-10T07:07:53Z a 08:07:17Z con exit 0. Antes y después: HEAD `8775ac9`, árbol `3d428ce9cea683e083b49ca8f8ae633402455b5a`, base `289dd66` y cero cambios sin commit. Log local `.orchestrator/t037/starter-gate.log`, SHA-256 `82b7fb33614e9f8b7ed993e7aee6851b8c8524afae8b8cf9b13a210244f46fa3`.
- docs 8 s. Backend 403 s: Surefire 227/227, Failsafe 210/210 con PostgreSQL, JaCoCo, Spotless y BUILD SUCCESS. Client 116 s: typecheck, lint, formato, 516/516 con 87.94 % de statements y 82.66 % de branches, y build.
- Tooling 1958 s, con todos los ensayos en exit 0: init-project, init-copy, guards, dev-stack nginx y vite, failures/rollback, local-copy y auth-proxies con señales. Las líneas `B1: build|up|readiness exit=N, rollback 0/0/0` son fallos inyectados por el ensayo.
- E2E 1079 s: 45 aprobados, 23 en desktop y 22 en mobile, sin fallos. Incluyen los cuatro `voice:` y las suites de daily, versiones, referencia y vista previa.
- Cleanup: los scripts retiraron los stacks. Se retiraron `starter-verify-t037_default` y `starter-verify-t037_m2-cache` tras cotejar el label `com.docker.compose.project=starter-verify-t037`. Los proyectos `starter-verify-t037`, `starter-e2e-t037` y `starter-e2e-t037-iter` quedaron con cero contenedores, volúmenes y redes. No se tocó `starter-dev-local-nginx`.

## Correcciones significativas

| Fecha | Problema/causa | Arreglo | Evidencia |
| --- | --- | --- | --- |
| 2026-11-10 | `scripts/e2e.sh` corre el runner con `--no-deps` y su `up --wait` no incluía `voice-provider`: el doble nunca arrancaba (`getaddrinfo ENOTFOUND voice-provider`). | Añadir `voice-provider` al `up --wait`; regresión estática que exige todo `depends_on` del runner en esa lista. | E2E `iter1.log` rojo; `node --test scripts/ci/e2e-arguments.test.mjs` rojo (`tooling-red.log`) → 20/20 (`tooling-green.log`). |
| 2026-11-10 | El backend exigía una cabecera RIFF con `webm` en el offset 8; WebM es EBML, y todo audio de Chromium recibía 400 `VOICE_INVALID_REQUEST`. Los IT usaban la misma cabecera ficticia. | Leer un prefijo acotado y exigir la firma EBML con DocType `webm` dentro del tamaño declarado; RIFF, `matroska`, truncados y VINT inválidos se rechazan sin llamar al proveedor. Fixture IT con la cabecera de MediaRecorder. | E2E `iter2.log` 400; `VoiceTranscriptionServiceTest` rojo (`webm-red.log`) → verde; `VoiceTranscriptionApiIT` 8/8. |
| 2026-11-10 | `VoiceNoteService.nowMicros()` sumaba dos veces la fracción de milisegundos y adelantaba `createdAt` hasta casi 1 s; la nota más nueva podía listarse después. | `clock.instant().truncatedTo(MICROS)` en una sola lectura. Daily repite el patrón, fuera de alcance: BACKLOG. | E2E `iter4.log` orden invertido; `VoiceNoteServiceTest` rojo `21.946Z` en vez de `20.973456Z` (`clock-red.log`) → verde; IT de voz 36/36. |

## Cierre y siguiente tarea

Un PR de esta tarea con staging de rutas explícitas, sin plantilla/ ni ficheros de trabajo ajenos. No done hasta GitHub MERGED confirmado, revisión independiente y gate/CI vigentes. Tras MERGED, nueva sesión concilia done y entrega al dueño/frontera la activación/pruebas de M2-RC1; no comenzar otra implementación en la sesión de cierre. Si falta decisión fuera del contrato, checkpoint con evidencia/dato necesario; no rediseñar ni repetir intentos equivalentes.
