---
id: T-046
status: draft
priority: P1
size: M
executor: junie
role: implementer
milestone: M4
product_cycle: I4
spec: S-108
spec_version: 1
branch: codex/t-046-render-image
pr: null
depends_on: [T-045, T-050]
---
# T-046 · Imagen única para Render y smoke local con métricas

## Objetivo

Preparar `deploy/render/Dockerfile` y `deploy/render/compose.smoke.yml` según [DEPLOYMENT · Piloto](../DEPLOYMENT.md#piloto-de-devnotes-en-render-free) y demostrar RP-01 y RP-02 de [S-108](../specs/S-108-render-pilot.md) desde un checkout limpio. No se crean recursos en Render.

El dueño autorizó el avance técnico en `draft` tras el merge de [T-050](T-050-ui-adjustments.md), con la aceptación de [T-045](T-045-xlsx-journey.md#prueba-del-dueño) pospuesta. El PR queda en borrador hasta esa aceptación. La siguiente tarea es [T-047](T-047-render-first-deploy.md).

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

El primer avance `0e3c500` concilia T-050 y la postergación de T-045. Smoke desde el checkout limpio en `99e4040ebd4dfa60b2ec78fe3f02db11102b5ed2`: `docker compose --env-file .env.example -p devnotes-render-smoke-t046c -f deploy/render/compose.smoke.yml up -d --build --wait --wait-timeout 300`, exit 0. Readiness 200 a 191,17 s desde `State.StartedAt`, con 266.022.912 bytes de pico (253,7 MiB). Chrome/Playwright local comprobó API anónima 401, carga y recarga directa de una ruta interna, OIDC ficticio y guardado (PUT 200 y lectura del contenido). Pico después del guardado: 288.952.320 bytes (275,6 MiB). Evidencia local en `e2e/artifacts/t046-smoke-c.log` y `e2e/artifacts/t046-smoke-c-metrics.log`. Pendientes del smoke: recuperar tras `restart app`, comprobar las señales sobre los procesos reales y retirar contenedores, red y volumen del proyecto por sus etiquetas exactas.

Checkpoint previo al gate. Base `main` verificada en GitHub: `d230ee19e4a171bb73cf669c3fe4ced36b60a61c`. SHA de fuentes `99e4040ebd4dfa60b2ec78fe3f02db11102b5ed2`. Huellas técnicas HEAD/base: `b104dc7c7582f3127e43489ca59196b3636763ee` / `52a1430c70fe68e6721cd3f0909b02f54dad6f94` (`git ls-tree -r` sin Markdown, pasado a `git hash-object --stdin`). Preflight PowerShell con Git Bash de Windows, Node 24.21.0 y Compose v2.40.2, perfil FULL/STARTER. CI liviana local `node --test 'scripts/ci/*.test.mjs'`, 118/118. Ensayo dirigido del supervisor en Linux y Git Bash, exit 0. Ejecutar el gate de la tabla con log local `e2e/artifacts/t046-starter-99e4040.log`. Proyectos propios `starter-verify-t046` y `starter-e2e-t046`, fixtures ficticias y puerto 5175 libre en el preflight. El verificador gestiona su cleanup. Comprobar que las etiquetas exactas de ambos proyectos queden en cero y retirar cualquier residuo propio. Con RP-01, RP-02 y STARTER verdes, publicar el PR en borrador.

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|
| 2026-11-11 | El ensayo de caída de Java se quedaba esperando. `kill -0` con los dos PID devuelve éxito mientras uno siga vivo. | Comprobar cada PID por separado. | `scripts/ci/test-render-entrypoint.sh` |
| 2026-11-11 · `0e3c500` | El primer smoke compiló y la app salió con código 1. El parámetro global de nginx duplicaba la directiva `pid` de la imagen. `OOMKilled=false`. | Ajustar la configuración de nginx en la imagen Render y usarla en la prueba de configuración y en el arranque. | `e2e/artifacts/t046-smoke-a.log`; reensayo en `devnotes-render-smoke-t046b`. |
| 2026-11-11 · `d0903e3` | Spring seguía inicializando Hibernate después de 300 s a 0,1 CPU. La app seguía viva, `OOMKilled=false` y el pico observado a los 310 s fue 223.428.608 bytes. | Extraer el jar en build y limitar la compilación JIT a nivel 1 para el piloto. [Spring Boot](https://docs.spring.io/spring-boot/reference/packaging/efficient.html) · [Java 21](https://docs.oracle.com/en/java/javase/21/docs/specs/man/java.html) | `e2e/artifacts/t046-smoke-b.log`; reensayo en `devnotes-render-smoke-t046c`. |

## Cierre y siguiente tarea

PR único y revisión independiente. Tras MERGED, conciliar y tomar [T-047](T-047-render-first-deploy.md) con el dueño.
