---
id: T-031
status: in_review
priority: P1
size: S
executor: junie
role: implementer
milestone: M2
product_cycle: I2
spec: S-105
spec_version: 2
branch: codex/t-031-voice-harness
pr: 35
depends_on: [T-030]
---
# T-031 · Iteración E2E con filtros y controlador real

## Objetivo

Reparar el paso de filtros al runner y demostrar transcripción por proxy/API/DB/OIDC reales con el doble externo. Draft solo por T-030 no MERGED/conciliada. Siguiente T-032; salida M2-RC1/T-037.

## Alcance y decisiones resueltas

Bug comprobado por lectura: run-e2e.mjs filtra --grep solo para validar baseArgs, pero usa args originales en comandos docker; docker compose recibe un argumento inválido. e2e.sh solo acepta sin argumentos/--harness/--runner-failure y es quien posee arranque/readiness/saneador/cleanup. Lanzar docker playwright directamente pierde el controlador IPC que usan identidades/restarts.

Entrada elegida: `bash scripts/e2e.sh --grep "patrón" --project desktop`. Ambos filtros opcionales; sin filtros conserva FULL desktop/mobile. --project solo desktop/mobile. Rechazar falta de valor, duplicados, flags desconocidos y combinación con --harness/--runner-failure antes de crear recursos. No cambiar retries/deadlines ni debilitar saneador. Datos de grep pasan en array, sin eval.

## Leer antes

1. [S-105 v2](../specs/S-105-voice-notes.md).
2. [TESTING](../TESTING.md).
3. [Implementer](../agents/implementer.md).
4. [scripts/e2e.sh](../../scripts/e2e.sh).
5. [scripts/run-e2e.mjs](../../scripts/run-e2e.mjs).

## Archivos y pasos

scripts/e2e.sh, scripts/run-e2e.mjs y scripts/ci/e2e-arguments.test.mjs; e2e/tests/voice-transport.spec.ts. Actualizar comandos de TESTING/E2E-ITERATION/AGENTS pertinentes que hoy sugieren runner aislado. No permisos/herramientas nuevos.

1. **Primero rojo:** test Node con ejecutores ficticios demuestra --grep filtrándose a Docker y ausencia de selección desktop; conservar resultados del fallo antes de corregir. Reutilizar patrón de tests de CLI del repo; no arrancar Docker para probar parsing.
2. Parsear una vez y separar composeArgs/playwrightArgs. Usar composeArgs en toda operación Docker/IPC/saneador; grep/project solo después de playwright test. e2e.sh conserva traps/exit/readiness y pasa filtros al controlador original. Sin filtros ejecuta la suite completa; ninguna selección persiste en variables/config global.
3. E2E HTTP por nginx con OIDC local real: WebM ficticio válido >1 MiB/<20 MiB, success sin guardar, 413, 429 y timeout2 s del doble. Sin API propia mockeada ni cuota externa; dos identidades y CSRF. No probar Whisper ni micrófono aquí: se cubren después.
4. Comprobar que un fallo del canario esperado no se interpreta como fallo de producto: test_sanitize.py termina0 si protege secretos aunque informe failures=1 del fixture. No alterar código del saneador ni ocultar fallos reales/JUnit.

## Aceptación y pruebas

- Rojo/verde, Node 24 desde raíz: `node --test scripts/ci/e2e-arguments.test.mjs`. Runner ficticio captura argv, ciclos/readiness/cleanup, señales/exit conservados, no filtros en Docker, allowlist de project y negativos sin efectos. No guardar tokens/cookies.
- Saneador dirigido desde raíz: `python e2e/harness/test_sanitize.py`, termina0 con canario protegido. No acredita E2E de producto.
- Una vez implementada la entrada, iteración real desde raíz/Git Bash: `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false STARTER_E2E_PROJECT=starter-e2e-t031-iter bash scripts/e2e.sh --grep "voice transport:" --project desktop`. El script arranca, controla y limpia solo ese proyecto; no llamar Docker directo ni --grep en verify.sh.
- Gate STARTER raíz/Git Bash: `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t031 STARTER_E2E_PROJECT=starter-e2e-t031 STARTER_SERVER_TESTS=container bash scripts/verify.sh --starter`. Sin filtros en cierre; conservar ambos viewports, cobertura y exit. Un gate final, sin repetir por Markdown con mismas fuentes/base.
- Antes de operaciones largas: checkpoint SHA/base/huellas/logs saneados/recursos y cleanup; namespaces libres, sin stack del dueño. Antes de publicar docs-check, diff-check y policy origin/main más diff pendiente. PowerShell usa SETUP con Node/exit preservados.

## Checkpoint vigente

2026-11-01, rama codex/t-031-voice-harness, base main 2581b17. PR35 publicado (HEAD f409a0a). Reparación implementada: run-e2e.mjs parsea una vez y separa composeArgs/playwrightArgs; e2e.sh acepta --grep y --project con validación completa. Tests Node 19/19 OK. Gate STARTER: docs OK, server 210/210 OK, client 364/364 OK; tooling failure (test-init-copy.sh) preexistente; E2E completo requiere Git Bash con cygpath. Pendiente: revisión independiente.

## Correcciones significativas

| Fecha | Problema/causa | Arreglo previsto | Evidencia |
| --- | --- | --- | --- |
| 2026-10-31 | Filtro removido solo para validar, conservado en argv Docker | Separar argv de Compose/Playwright y preservar lifecycle/controlador | Lectura de código; rojo/verde exigido al implementar |

## Cierre y siguiente tarea

Publicar un PR, gate/CI y revisión independiente; solo done tras MERGED. Nueva sesión concilia y toma T-032. No implementar cliente en esta sesión ni declarar el observador técnico como prueba de negocio.
