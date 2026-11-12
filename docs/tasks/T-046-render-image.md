---
id: T-046
status: in_review
priority: P1
size: M
executor: junie
role: implementer
milestone: M4
product_cycle: I4
spec: S-108
spec_version: 1
branch: codex/t-046-render-image
pr: 52
depends_on: [T-045, T-050]
---
# T-046 · Imagen única para Render y smoke local con métricas

## Objetivo

Preparar `deploy/render/Dockerfile` y `deploy/render/compose.smoke.yml` según [DEPLOYMENT · Piloto](../DEPLOYMENT.md#piloto-de-devnotes-en-render-free) y demostrar RP-01 y RP-02 de [S-108](../specs/S-108-render-pilot.md) desde un checkout limpio. No se crean recursos en Render.

El dueño autorizó el avance técnico en `draft` tras el merge de [T-050](T-050-ui-adjustments.md). La [aceptación de T-045](T-045-xlsx-journey.md#prueba-del-dueño) habilita el paso a revisión. La siguiente tarea es [T-047](T-047-render-first-deploy.md).

## Alcance y decisiones resueltas

- **Dockerfile.** Multietapa con contexto en la raíz:
  - etapa cliente: `npm ci` y `npm run build` con la imagen Node del `client/Dockerfile`;
  - etapa servidor: Maven Wrapper con el JDK 21 del `server/Dockerfile`;
  - runtime: JRE 21 + nginx, con los dos procesos coordinados.

  Las versiones e imágenes quedan fijadas como en los Dockerfiles existentes, y se copian solo los insumos explícitos. Sin secretos en la imagen.
- **Procesos.** Un supervisor mínimo en shell (`deploy/render/entrypoint.sh`) arranca Spring en `127.0.0.1:8080` y luego nginx en `${PORT}`. Si uno termina, detiene al otro y sale con un código distinto de 0. Ante SIGTERM o SIGINT, reenvía la señal y espera a ambos. No se usa supervisord ni otra dependencia nueva.
- **nginx.** Se reutiliza `client/nginx.conf` vía plantilla (`envsubst`, como hoy en `19-public-origin.sh`), con `listen ${PORT}` y upstream `127.0.0.1:8080`. Se conservan la validación de Host, los `X-Forwarded-*` desde configuración y no desde el cliente, las rutas exactas de voz y portabilidad, el fallback de la SPA y `/actuator/health/readiness`. Si la plantilla necesita un cambio que afecte al stack actual, ese cambio se prueba en ambos.
- **Compose de smoke.** Un servicio `app` con la imagen, `mem_limit: 512m` y `cpus: 0.1`, publicado en `127.0.0.1:18080`; PostgreSQL 18 aparte, y el OIDC ficticio del harness existente con el perfil `e2e` **solo en este smoke**, sin voz real. Los nombres y labels son propios.
- **Métricas.** Tiempo hasta readiness y pico de memoria al arrancar y tras guardar una nota (`memory.peak`, o `docker stats` como estimación).

## Leer antes

1. [DEPLOYMENT · Piloto](../DEPLOYMENT.md#piloto-de-devnotes-en-render-free).
2. [S-108](../specs/S-108-render-pilot.md).
3. `client/Dockerfile`, `server/Dockerfile`, `client/nginx.conf` y `client/19-public-origin.sh`.
4. [ADR 0002](../adr/0002-google-oidc-session-csrf-and-proxy.md).
5. [TESTING · Frecuencia y alcance del gate](../TESTING.md#frecuencia-y-alcance-del-gate).

## Archivos y pasos

`deploy/render/Dockerfile`, `deploy/render/entrypoint.sh`, `deploy/render/compose.smoke.yml`, la plantilla de nginx si hace falta, `.dockerignore` si hace falta y una prueba estática del supervisor en `scripts/ci/` (por ejemplo, que el entrypoint propaga SIGTERM y falla si cae un proceso).

1. Construir la imagen y ejecutar el smoke con los comandos de DEPLOYMENT. Hacer checkpoint con el SHA y los recursos antes de la operación larga.
2. Recorrido manual o con script: recarga de una ruta interna, 401 de la API sin sesión, guardar una nota con OIDC ficticio, reiniciar `app` y recuperar la nota. Registrar las métricas.
3. Si no alcanza con 512 MB, aislar Spring para medir y hacer checkpoint a frontera, sin cambiar el empaquetado por inferencia.

## Aceptación y pruebas

| Criterio | Capa | Comando | Resultado |
|---|---|---|---|
| RP-01 | Smoke local | Comandos de DEPLOYMENT con un proyecto `devnotes-render-smoke-<id>` | Readiness 200, recorrido OK y métricas registradas |
| RP-02 | Smoke + estático | `docker compose … kill -s SIGTERM app`, matar Spring dentro del contenedor y la prueba de `scripts/ci/` | Salida ordenada; el contenedor falla si cae un proceso |
| Gate | STARTER (Docker y Compose) | Desde la raíz: `COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t046 STARTER_E2E_PROJECT=starter-e2e-t046 STARTER_SERVER_TESTS=container bash scripts/verify.sh --starter` | Exit 0 |

Cleanup: `down --volumes` solo del proyecto de smoke, tras verificar los labels exactos.

## Checkpoint vigente

Implementer en Codex, familia GPT-6, variante y esfuerzo no expuestos. Herramientas de esta sesión: PowerShell, Git, `gh`, Git Bash, Node y Docker. Cambios de empaquetado y operación local, con el contrato de origen compartido entre ambos nginx.

El primer avance `0e3c500` concilia T-050 y la postergación de T-045. **RP-01** desde el checkout limpio `99e4040ebd4dfa60b2ec78fe3f02db11102b5ed2`: `docker compose --env-file .env.example -p devnotes-render-smoke-t046c -f deploy/render/compose.smoke.yml up -d --build --wait --wait-timeout 300`, exit 0. Readiness 200 a 191,17 s desde `State.StartedAt`. Pico `memory.peak` de arranque: 266.022.912 bytes (253,7 MiB). Pico tras guardar: 288.952.320 bytes (275,6 MiB). Chrome local con Playwright y resolución de OIDC por proceso comprobó la API anónima 401, carga y recarga de ruta interna, callback real del proveedor ficticio, guardado PUT 200 y recuperación de la misma nota tras `restart app` y nuevo login. Comandos locales `node e2e/artifacts/t046-render-browser.cjs write` y `node e2e/artifacts/t046-render-browser.cjs read`, exit 0.

**RP-02** con el mismo checkout y proyecto. `bash scripts/ci/test-render-entrypoint.sh` pasó en Linux y Git Bash. En el contenedor real, `docker compose … kill -s SIGTERM app` devolvió 0 y los logs confirmaron el cierre de Spring y nginx. Al matar Java y nginx por separado, la app salió con código 1 en ambos casos. El ensayo adicional con SIGINT devolvió 0. Evidencia local en `e2e/artifacts/t046-smoke-c.log`, `e2e/artifacts/t046-smoke-c-metrics.log` y `e2e/artifacts/t046-smoke-c-signals.log`. Tras verificar etiquetas y aplicar `down --volumes`, los proyectos de smoke `devnotes-render-smoke-t046a`, `devnotes-render-smoke-t046b` y `devnotes-render-smoke-t046c` quedaron con contenedores/redes/volúmenes 0/0/0.

**STARTER** del 2026-11-11, una ejecución del comando de la tabla con HEAD `f5057d28ca8854fdaecc6e2735993958a42eb2a1`, base `main` `d230ee19e4a171bb73cf669c3fe4ced36b60a61c`. Huellas técnicas HEAD/base `b104dc7c7582f3127e43489ca59196b3636763ee` / `52a1430c70fe68e6721cd3f0909b02f54dad6f94`, reproducibles en Windows PowerShell con `git ls-tree -r $ref | Where-Object { $_ -notmatch '\.md$' } | git hash-object --stdin` para cada referencia `$ref`. Git Bash de Windows, Node 24.21.0, Compose v2.40.2, perfil FULL/STARTER. Exit 0 en docs (9 s), backend (455 s, 429 unitarias y 241 IT PostgreSQL, JaCoCo y Spotless), cliente (128 s), tooling (1887 s, incluidas las pruebas de proxy nginx/Vite) y Playwright (1180 s, 25/25 desktop y 24/24 mobile, cero omitidas). CI liviana local 118/118. Log `e2e/artifacts/t046-starter-99e4040.log` y JUnit saneado `e2e/artifacts/starter-e2e-t046/sanitized/junit.xml`. Limpieza verificada por etiquetas exactas: contenedores/redes/volúmenes 0/0/0 en `starter-verify-t046` y `starter-e2e-t046`.

**Traspaso a revisión independiente (2026-11-11).** Con [T-045 aceptada por el dueño](T-045-xlsx-journey.md#prueba-del-dueño), el implementer confirmó con `gh pr view` que [PR52](https://github.com/MatiasNicolasAcevedo/devnotes/pull/52) estaba abierto en borrador, con HEAD `1f51de132df7de55edc86b5b61162d20a3bcd307` y base `main` `d230ee19e4a171bb73cf669c3fe4ced36b60a61c`. [`verify-required`](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/43127972043/job/130884782952) dio `SUCCESS` para ese HEAD. La base y ambas huellas técnicas coincidieron con el STARTER. Desde el HEAD probado, el diff es solo Markdown. `node scripts/docs-check.mjs` y `git diff --check` pasaron para la transición documental. La sesión revisora toma el HEAD publicado y comprueba su `verify-required`.

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|
| 2026-11-11 | El ensayo de caída de Java se quedaba esperando. `kill -0` con los dos PID devuelve éxito mientras uno siga vivo. | Comprobar cada PID por separado. | `scripts/ci/test-render-entrypoint.sh` |
| 2026-11-11 · `0e3c500` | El primer smoke compiló y la app salió con código 1. El parámetro global de nginx duplicaba la directiva `pid` de la imagen. `OOMKilled=false`. | Ajustar la configuración de nginx en la imagen Render y usarla en la prueba de configuración y en el arranque. | `e2e/artifacts/t046-smoke-a.log`; reensayo en `devnotes-render-smoke-t046b`. |
| 2026-11-11 · `d0903e3` | Spring seguía inicializando Hibernate después de 300 s a 0,1 CPU. La app seguía viva, `OOMKilled=false` y el pico observado a los 310 s fue 223.428.608 bytes. | Extraer el jar en build y limitar la compilación JIT a nivel 1 para el piloto. [Spring Boot](https://docs.spring.io/spring-boot/reference/packaging/efficient.html) · [Java 21](https://docs.oracle.com/en/java/javase/21/docs/specs/man/java.html) | `99e4040`: readiness a 191,17 s en `devnotes-render-smoke-t046c`. |

## Cierre y siguiente tarea

PR único y revisión independiente. Tras MERGED, conciliar y tomar [T-047](T-047-render-first-deploy.md) con el dueño.
