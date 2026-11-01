---
id: T-030
status: in_review
priority: P1
size: M
executor: junie
role: implementer
milestone: M2
product_cycle: I2
spec: S-105
spec_version: 2
branch: codex/t-030-voice-transport
pr: 34
depends_on: [T-029]
---
# T-030 · Transporte de voz y doble externo aislado

## Objetivo

Llevar multipart/deadlines por nginx/Vite/Compose y preparar el doble externo para el gate real. Draft solo por T-029 no MERGED/conciliada; Junie habilita al comprobarla. Quinta tarea I2: control de avance tras MERGED, sin retorno obligatorio a frontera. Siguiente T-031 (reparación del harness), cierre M2-RC1/T-037.

## Alcance y decisiones resueltas

S-105 fija21 MiB/75 s en proxy y20 MiB en Spring. Conservar allowlist de origen/forwarding/headers y límites ajenos. Servicio voice-provider con Node 24.21.0 ya inventariado, únicamente overlay E2E, sin puertos host/Docker socket/logs de bodies. No instalar SDK/ffmpeg ni usar producción. Configuración del dueño distinta del doble; compartir perfil e2e para OIDC local no habilita inferencia ficticia por sí solo.

La reparación de argumentos/selección y E2E de transporte pertenece a T-031; no ampliar aquí el runner. Este tramo prueba proxy con observador técnico y no atribuye a ese observador aceptación del producto.

## Leer antes

1. [S-105 v2](../specs/S-105-voice-notes.md).
2. [client/AGENTS](../../client/AGENTS.md).
3. [server/AGENTS](../../server/AGENTS.md).
4. [TESTING](../TESTING.md).
5. [VOICE-RELEASE](../VOICE-RELEASE.md).

## Archivos y pasos

client/nginx.conf y vite.config.ts; docker-compose.yml y docker-compose.e2e.yml; e2e/fixtures/voice-provider.mjs y voice-provider.test.mjs. Ensayo scripts/test-voice-proxies.mjs reutiliza el patrón de ownership/proxies del repositorio. Actualizar SETUP y VOICE-RELEASE con operación comprobada. Frontera entre entornos/proxies, sin UI ni lógica de notas.

1. Ruta exacta transcripción, request buffering off/HTTP 1.1 y75 s; forwarding/CSRF intactos. Ensayo de ambos proxies con observador técnico ficticio: multipart >1 MiB, exceso21 MiB y partes preservadas. Sin cuerpos en logs/reportes. El observador solo acredita transporte, no OIDC/negocio.
2. Compose server recibe DEVNOTES_VOICE_ENABLED/GROQ_API_KEY con defaults apagados. Overlay E2E fija enabled=true, clave ficticia literal y DEVNOTES_VOICE_TEST_PROVIDER=true; server depends_on voice-provider healthy garantiza arranque con e2e.sh actual. Endpoint externo fijo del doble y deadline 2 s según S-105. Reset de escenarios por fixture, sin control en API propia.
3. Blindar ensayos/gates contra variables heredadas: fixture/overlay nunca usan la clave real ni host externo. Pruebas Node de double/flags y ensayo con proceso ficticio; no imprimir docker config/inspect/env. Capabilities comprueba solo disponibilidad.
4. Verificar dev.sh con clave **ficticia** heredada del proceso, sin editar parser de --env-file ni flags nuevos. up en stack activo es idempotente: para aplicar cambios se requiere down/up del mismo proyecto y volumen preservado. Documentar secuencia para activación del dueño, no ejecutarla sobre su stack. Ensayo propio con scripts/fixtures/local-assay.env.example, que separa puertos; comprobarlos libres antes de usar.

## Aceptación y pruebas

- Node 24 desde raíz: `node --test e2e/fixtures/voice-provider.test.mjs`. Doble valida parámetros/modelo, responde verbose_json/casos controlados y solo registra contadores. Modos429/timeout/malformed/silencio aislados y reset explícito.
- Node 24/Docker desde raíz: `node scripts/test-voice-proxies.mjs`. El nuevo ensayo crea namespace único con prefijo starter-auth-proxy- y sufijo numérico timestamp/PID, con validación estricta equivalente al patrón existente, comprueba ausencia antes del alcance de cleanup, usa solo fixtures y retira únicamente su proyecto por labels. Probar nginx/Vite con cuerpo ficticio grande/413/headers y sin audio persistido. No loguear body/cookies. Definir el nombre real mediante timestamp/PID y conservarlo en checkpoint; no reutilizar un proyecto.
- Operación local dirigida con valores ficticios, Git Bash desde raíz: `DEVNOTES_VOICE_ENABLED=true GROQ_API_KEY=fictitious-voice-test DEVNOTES_VOICE_TEST_PROVIDER=false bash scripts/dev.sh up --mode local --proxy vite --project starter-dev-t030-vite --env-file scripts/fixtures/local-assay.env.example`. Luego `bash scripts/dev.sh check --mode local --proxy vite --project starter-dev-t030-vite --env-file scripts/fixtures/local-assay.env.example` y `bash scripts/dev.sh down --mode local --proxy vite --project starter-dev-t030-vite --env-file scripts/fixtures/local-assay.env.example`. No inferencia externa: clave ficticia solo disponibilidad. Verificar retoma/volumen y retirar únicamente recursos propios; down no borra volumen por diseño.
- Gate STARTER, raíz/Git Bash: `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t030 STARTER_E2E_PROJECT=starter-e2e-t030 STARTER_SERVER_TESTS=container bash scripts/verify.sh --starter`. FULL sin filtros y tooling una vez al cierre. El overlay E2E fija explícitamente el doble aun con flags de entorno apagados.

Antes de operaciones largas: SHA/base, huellas, logs saneados, namespaces/puertos libres y cleanup en checkpoint. Conservar stack del dueño. PowerShell usa SETUP. Antes de publicar docs-check, diff-check y policy origin/main, incluyendo diff pendiente.

## Checkpoint vigente

Implementación publicada fd1e0bf, base main 3700ad0. PR34 draft https://github.com/MatiasNicolasAcevedo/devnotes/pull/34. Proxies nginx/Vite con ruta exacta transcripción (21m, buffering off, 75s). Compose server con DEVNOTES_VOICE_ENABLED/GROQ_API_KEY. Overlay E2E con voice-provider (Node 24, sin puertos host, clave ficticia). Doble externo validado: 8/8 tests OK (éxito, 429, malformed, silencio, timeout, reset, 404). Ensayo test-voice-proxies.mjs creado. docs-check OK. Gate STARTER pendiente (requiere Git Bash/Docker Desktop). Revisión independiente pendiente.

## Correcciones significativas

Sin implementación. Registrar causa/arreglo/prueba/SHA de correcciones reales.

## Cierre y siguiente tarea

Un PR, revisión independiente, gate/CI y MERGED confirmado. Control de cinco por Junie; nueva sesión concilia done y habilita T-031. No iniciar otra implementación en la sesión de cierre. No aceptar producto por observador de proxy ni activar cuenta real.
