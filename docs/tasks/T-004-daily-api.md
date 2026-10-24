---
id: T-004
status: done
priority: P1
size: S
executor: junie
role: merger
milestone: M1
product_cycle: I1
spec: S-101
spec_version: 2
branch: codex/t-004-daily-api
pr: 8
depends_on: [T-003]
---
# T-004 · API privada de notas diarias

## Objetivo

API privada de notas diarias, capacidad S-101 de I1. Resultado comprobable descrito abajo; ninguna implementación de otra tarea en esta sesión. Siguiente: [T-005](T-005-editor-foundation.md), habilitada solo tras MERGED de esta tarea y su conciliación en una nueva sesión. Salida a frontera: T-014 mergeada con los seis CA o decisión/bloqueo fuera del contrato.

## Alcance y decisiones resueltas

Adaptar servicio T-003 al HTTP exacto de S-101 y principal LocalOidcUser.identity().id(). DTOs record anidados en controller si reduce archivos; rechazo de claves desconocidas explícito sin cambiar Jackson global. Advice 400/404/409 ProblemDetail seguro. Abrir solo GET colección/recurso y PUT recurso; metadata OpenAPI y negativos incluidos.

Impacto previsto: API de notas privada, nuevos matchers limitados; sin auth nueva. Contrato completo; dependencia T-003 MERGED (f87f0cf, 2026-10-24). Estado cambiado a ready el 2026-10-24. En T-001 comprobar además la evidencia Junie y adopción T-000; si no existen, no comenzar negocio.

## Leer antes

1. [AGENTS server](../../server/AGENTS.md).
2. [S-101 v2](../specs/S-101-daily-notes.md).
3. [S-101: contenido/API](../specs/S-101-daily-notes.md).
4. [TESTING](../TESTING.md).
5. [T-003](T-003-daily-service.md), solo cierre/MERGED y evidencia necesaria. AGENTS raíz, STATUS y protocolo implementer son la entrada común.

## Archivos y pasos

Rutas previstas: daily/web/DailyNoteController.java, DailyNoteExceptionHandler.java, DailyNoteOpenApi.java; security/SecurityConfig.java; daily/DailyNoteApiIT.java en tests.
Los nombres sin prefijo de backend son relativos a server/src/main/java/com/example/devnotes/; sus tests conservan paquete bajo server/src/test/java/com/example/devnotes/. Frontend relativo indicado explícitamente o bajo client/src/features/daily/.

1. Comprobar Git/PR/base, dependencia MERGED, capacidades mínimas y crear la rama exacta desde main actualizado; preservar cambios ajenos. Conciliar done de T-003 en primer avance útil.
2. Implementar solo este resultado siguiendo spec v2; pruebas de riesgo y negativos abajo, sin reducir suites/assertions/coverage/retries.
3. Dirigidos durante iteración; fijar huella/SHA/base antes del gate, publicar al pasar gate. No cambiar fuentes mientras corre.
4. Documentar resultado y preparar revisión independiente en STATUS; no autoaprobar ni comenzar siguiente tarea.

## Aceptación y pruebas

200 crear/leer/listar/actualizar; 404 vacío; 400 fecha imposible/body extra/revisión inválida; 409 conserva DB; 401/403/CSRF y dos dueños. POST/PATCH/DELETE/rutas vecinas/IDs siguen denegados; GET no crea filas. OpenAPI sesión/CSRF. Probar revisión segura máxima/+1, fracciones/booleanos/strings sin coerción, page máximo/+1/offset long y size distinto de20; fallos no mutan DB.

Capa elegida y motivo: HTTP/PostgreSQL con principal permitido/denegado y CSRF; la suite OIDC real existente se conserva para el gate.
Comandos ejecutables desde raíz con Git Bash/Docker Desktop Linux/Node>=24 (npm ci instala del lock; no actualiza versiones). Antes de dirigidos Docker y gate, crear namespaces propios y comprobar ausencia:

```bash
export COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container
export COMPOSE_PROJECT_NAME="starter-verify-devnotes-t004-$(date +%s)-$$"
export STARTER_E2E_PROJECT="starter-e2e-devnotes-t004-$(date +%s)-$$"
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  for kind in container network volume; do
    if [ "$kind" = container ]; then ids=$(docker container ls -aq --filter "label=com.docker.compose.project=$project") || exit 2
    else ids=$(docker "$kind" ls -q --filter "label=com.docker.compose.project=$project") || exit 2; fi
    [ -z "$ids" ] || exit 2
  done
done
docker compose --env-file .env.example --profile verify run --rm server-tests ./mvnw -B -ntp test-compile failsafe:integration-test failsafe:verify -Dit.test=DailyNoteApiIT
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

MERGED el 2026-10-24. Squash merge de PR8 (HEAD 640c474) a main, commit 595050ae979604368e3ae4d19310230abf2fb76c. Revisión APROBADA por Junie reviewer. Corrección durante revisión: T-003 status `MERGED` → `done`. T-005 habilitada.

## Correcciones significativas

1. **JsonNode abstracto en @RequestBody** — Spring Boot 4 no deserializa `com.fasterxml.jackson.databind.JsonNode` directamente. Solución: aceptar `@RequestBody String`, parsear con `ObjectMapper` propio y validar manualmente claves permitidas en `DailyNoteInput.fromJson()`.
2. **Serialización de content en respuesta** — `com.fasterxml.jackson.databind.JsonNode` se serializa como metadata por `tools.jackson.ObjectMapper`. Solución: `DailyNoteResponse` usa `tools.jackson.databind.JsonNode` convertido vía `toToolsNode()`.
3. **DailyContentException no manejada** — Contenido inválido (`{"type":"unknown"}`) lanzaba 500. Solución: handler `@ExceptionHandler(DailyContentException.class)` devuelve 400.

## Cierre y siguiente tarea

MERGED. El siguiente implementer concilia done al primer avance de su rama nueva; no editar la rama ya mergeada. Próxima: [T-005](T-005-editor-foundation.md).
