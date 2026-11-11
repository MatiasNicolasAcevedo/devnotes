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

Base verificada en GitHub: `main` en `d230ee19e4a171bb73cf669c3fe4ced36b60a61c`. El primer avance concilia T-050 y la postergación de T-045. Para el smoke usar el checkout de ese avance, proyecto `devnotes-render-smoke-t046a`, app en 18080, OIDC en 18090 y logs locales en `e2e/artifacts/t046-smoke-a.log`. Correr `docker compose --env-file .env.example -p devnotes-render-smoke-t046a -f deploy/render/compose.smoke.yml up -d --build --wait --wait-timeout 300` y medir desde el inicio del contenedor. Al terminar, comprobar las etiquetas del proyecto y aplicar `down --volumes` solo a esos recursos. Siguiente paso: RP-01 y RP-02.

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|
| 2026-11-11 | El ensayo de caída de Java se quedaba esperando. `kill -0` con los dos PID devuelve éxito mientras uno siga vivo. | Comprobar cada PID por separado. | `scripts/ci/test-render-entrypoint.sh` |

## Cierre y siguiente tarea

PR único y revisión independiente. Tras MERGED, conciliar y tomar [T-047](T-047-render-first-deploy.md) con el dueño.
