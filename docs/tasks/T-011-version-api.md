---
id: T-011
status: ready
priority: P1
size: S
executor: junie
role: implementer
milestone: M1
product_cycle: I1
spec: S-104
spec_version: 2
branch: codex/t-011-version-api
pr: null
depends_on: [T-010]
---
# T-011 · API de versiones por fecha

## Objetivo

API de versiones por fecha, capacidad S-104 de I1. Resultado comprobable descrito abajo; ninguna implementación de otra tarea en esta sesión. Siguiente: [T-012](T-012-version-history.md), habilitada solo tras MERGED de esta tarea y su conciliación en una nueva sesión. Salida a frontera: T-014 mergeada con los seis CA o decisión/bloqueo fuera del contrato.

## Alcance y decisiones resueltas

Implementar solo POST nota/fecha/version y GET colección/detalle de versiones S-104. DTOs record separados de entidades, principal de sesión, keys extras rechazadas. Matchers exactos/metadata OpenAPI y advice compartido.

Impacto previsto: Rutas privadas de versiones; sin edición directa ni restauración. Contrato completo; estado draft **únicamente por dependencia T-010 no mergeada/conciliada**. Al comprobarla, Junie puede habilitar ready sin otra planificación. En T-001 comprobar además la evidencia Junie y adopción T-000; si no existen, no comenzar negocio.

## Leer antes

1. [AGENTS server](../../server/AGENTS.md).
2. [S-104 v2](../specs/S-104-daily-versions.md).
3. [S-101: contenido/API](../specs/S-101-daily-notes.md).
4. [TESTING](../TESTING.md).
5. [T-010](T-010-version-storage.md), solo cierre/MERGED y evidencia necesaria. AGENTS raíz, STATUS y protocolo implementer son la entrada común.

## Archivos y pasos

Rutas previstas: daily/web/DailyVersionController.java y DailyVersionOpenApi.java; DailyNoteExceptionHandler.java; security/SecurityConfig.java; daily/DailyVersionApiIT.java en tests.
Los nombres sin prefijo de backend son relativos a server/src/main/java/com/example/devnotes/; sus tests conservan paquete bajo server/src/test/java/com/example/devnotes/. Frontend relativo indicado explícitamente o bajo client/src/features/daily/.

1. Comprobar Git/PR/base, dependencia MERGED, capacidades mínimas y crear la rama exacta desde main actualizado; preservar cambios ajenos. Conciliar done de T-010 en primer avance útil.
2. Implementar solo este resultado siguiendo spec v2; pruebas de riesgo y negativos abajo, sin reducir suites/assertions/coverage/retries.
3. Dirigidos durante iteración; fijar huella/SHA/base antes del gate, publicar al pasar gate. No cambiar fuentes mientras corre.
4. Documentar resultado y preparar revisión independiente en STATUS; no autoaprobar ni comenzar siguiente tarea.

## Aceptación y pruebas

POST200 crea/reemplaza, GET propio lista/consulta, GET sin copia404. Body content/owner/revisión0/fecha inválida400; CSRF403, sin sesión401, revisión vieja409 sin cambio. Dos actores no acceden a datos ajenos, ID no abre ruta; PUT/PATCH/DELETE/vecinos denegados.

Capa elegida y motivo: HTTP/PostgreSQL negativo por propietario y CSRF, manteniendo OIDC real en FULL.
Comandos ejecutables desde raíz con Git Bash/Docker Desktop Linux/Node>=24 (npm ci instala del lock; no actualiza versiones). Antes de dirigidos Docker y gate, crear namespaces propios y comprobar ausencia:

```bash
export COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container
export COMPOSE_PROJECT_NAME="starter-verify-devnotes-t011-$(date +%s)-$$"
export STARTER_E2E_PROJECT="starter-e2e-devnotes-t011-$(date +%s)-$$"
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  for kind in container network volume; do
    if [ "$kind" = container ]; then ids=$(docker container ls -aq --filter "label=com.docker.compose.project=$project") || exit 2
    else ids=$(docker "$kind" ls -q --filter "label=com.docker.compose.project=$project") || exit 2; fi
    [ -z "$ids" ] || exit 2
  done
done
docker compose --env-file .env.example --profile verify run --rm server-tests ./mvnw -B -ntp test-compile failsafe:integration-test failsafe:verify -Dit.test=DailyVersionApiIT
```

Los dirigidos no acreditan FULL. Cierre previsto **APPLICATION**, por código/tests de aplicación; si diff completo exige STARTER, usar --starter sin rebajar clasificación. Registrar también diff sin commit; --policy solo mira commits.

```bash
bash scripts/verify.sh
docker compose --env-file .env.example -p "$COMPOSE_PROJECT_NAME" --profile verify down --volumes --remove-orphans
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  docker container ls -aq --filter "label=com.docker.compose.project=$project"
  docker network ls -q --filter "label=com.docker.compose.project=$project"
  docker volume ls -q --filter "label=com.docker.compose.project=$project"
done
node scripts/docs-check.mjs
bash scripts/verify.sh --policy origin/main
```

Conservar exit original del gate si se ejecuta cleanup después; si falla cleanup no anunciar verde. Labels deben quedar vacíos; namespaces internos de tooling los limpia su runner y se comprueban en sus logs. Checkpoint antes de gate con SHA/base, comando/log saneado, recursos propios y cleanup; huella técnica antes/después. Bugfix nuevo: primero rojo reproducible y después verde. No necesita rojo previo una nueva capacidad, sí negativos útiles.

## Checkpoint vigente

Implementer Junie, Qwen3.6-27B-FP8. DailyVersionController con 3 endpoints (POST crear/reemplazar, GET listar, GET por fecha), DailyVersionExceptionHandler, DailyVersionOpenApi, SecurityConfig actualizado. DailyVersionApiIT 23/23 OK (PostgreSQL Testcontainers, OIDC real). Corrección: rutas vecinas /private → 400 (matchea {date}, falla parsing) en lugar de 403. Pendiente: commit, push y revisión independiente.

## Correcciones significativas

1. **Rutas vecinas 400 vs 403**: `/api/v1/daily-versions/private` matchea el path variable `{date}` y falla la validación de fecha → 400, no 403. Solo `/api/v1/daily-versions/2026-01-01/extra` (sin ruta coincidente) → 403.

## Cierre y siguiente tarea

Publicar PR y evidencia según TESTING; pasar a in_review con prompt reviewer en sesión nueva. Reviewer comprueba HEAD/base, gate, CI y arquitectura/propiedad, publica veredicto del SHA final y puede squash merge por AUTONOMY. Sin done hasta MERGED comprobado. El siguiente implementer concilia done al primer avance de su rama nueva; no editar la rama ya mergeada. Próxima: [T-012](T-012-version-history.md).
