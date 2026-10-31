---
id: T-017
status: in_progress
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

2026-10-31: frontera planner, Codex (familia GPT-6 expuesta; variante/esfuerzo no expuestos), app Codex con PowerShell/Git/gh, navegador de fuentes oficiales y Context7. Sin delegación. Impacto de esta sesión: contratos/cola/documentación; sin código, API runtime, permisos efectivos, datos, dependencias ni UI cambiados. Próxima sesión registra su runtime real una vez.

Planificación preparada sobre HEAD=origin/main=0d976dc2187cb2a07061c3db48130c334b1e471b. Rama local codex/t-017-voice-readiness creada sin commits. Se preservan cambios locales previos de cierre T-026 y tres ficheros pr27 sin seguimiento. GitHub plugin no accedió al repo privado (404/422); alternativa gh propia comprobada. Consultas exitosas:
- `gh pr view 29 --repo MatiasNicolasAcevedo/devnotes --json number,url,state,mergedAt,mergeCommit,headRefOid,baseRefName`: MERGED, base main, squash 0d976dc2187cb2a07061c3db48130c334b1e471b, fecha 2026-10-31T21:00:27Z, [PR29](https://github.com/MatiasNicolasAcevedo/devnotes/pull/29). `gh pr checks 29`: verify-required pass.
- `gh pr view 19 --repo MatiasNicolasAcevedo/devnotes --json number,state,mergedAt,mergeCommit,baseRefName`: MERGED, base main, squash 9da4ab4f138bd28753e61d1538003acceb615691, 2026-10-25T22:37:44Z.
- `gh pr list --repo MatiasNicolasAcevedo/devnotes --state open --json number,title,headRefName`: PR25/26 antiguos. `gh pr view`/diff de ambos confirman solo docs/STATUS.md; siguen abiertos, no se modificaron remotamente.
- `gh api repos/MatiasNicolasAcevedo/devnotes/commits/main --jq '{sha: .sha}'`: main 0d976dc2187cb2a07061c3db48130c334b1e471b.

Investigación pública fechada en S-105; cuenta, clave, cuota efectiva, ZDR, audio sintético y calidad/latencia **no comprobados**. Ningún envío ni activación. Verificación de planificación: `node scripts/docs-check.mjs` exit0 (88 Markdown, 38 tareas); `git diff --check` exit0. Ensayo dirigido del saneador exit0 y defecto de filtros documentados en T-031, sin atribuirles FULL.

`bash scripts/verify.sh --policy origin/main` mediante verificador PowerShell de SETUP: primer intento bloqueado por IPC MSYS del sandbox (0xC0000022); misma consulta de solo lectura fuera del sandbox exit0, `policy=FULL, changed=0, reason=diff vacío, profile=STARTER`. HEAD coincide con origin/main y el trabajo está sin commit: el clasificador no incluye estos cambios y no acredita DOCS_ONLY publicado. Inspección del trabajo de esta sesión: solo Markdown raíz/docs; los tres ficheros pr27 son previos y quedan excluidos. Sin publicación ni gate de implementación T-017; STARTER, pruebas nuevas y CI de esa entrega aún pendientes. Recalcular policy y gate sobre su diff final al implementar.

## Correcciones significativas

| Fecha | Problema / causa | Decisión | Evidencia |
| --- | --- | --- | --- |
| 2026-10-31 | Draft mezclaba planificación y smoke externo como bloqueo de toda I2 | Cerrar contrato y construir base apagada; activación externa con evidencia separada; conservar ID/rama y reasignar próxima ejecución | S-105 v2 y VOICE-RELEASE; sin éxito runtime supuesto |

## Cierre y siguiente tarea

No done por terminar Markdown. Junie publica base+contratos en un PR T-017, gate/CI y revisión independiente. Tras MERGED confirmado, nueva sesión concilia done y habilita T-027; no implementarla en la sesión que cierra esta. No merge ni revisión propia.
