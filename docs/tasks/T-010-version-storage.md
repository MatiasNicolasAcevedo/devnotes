---
id: T-010
status: draft
priority: P1
size: S
executor: junie
role: implementer
milestone: M1
product_cycle: I1
spec: S-104
spec_version: 1
branch: codex/t-010-version-storage
pr: null
depends_on: [T-009]
---
# T-010 · Copia manual independiente

## Objetivo

Copia manual independiente, capacidad S-104 de I1. Resultado comprobable descrito abajo; ninguna implementación de otra tarea en esta sesión. Siguiente: [T-011](T-011-version-api.md), habilitada solo tras MERGED de esta tarea y su conciliación en una nueva sesión. Salida a frontera: T-014 mergeada con los seis CA o decisión/bloqueo fuera del contrato.

## Alcance y decisiones resueltas

V4 aditiva S-104, snapshot privado, fecha/dueño derivados de nota. Servicio en feature daily usa lock de nota propia y revisión esperada, copia JSON defensivo sin aceptar contenido de cliente. Upsert una fila conserva UUID; lectura/listado por dueño.

Impacto previsto: Tabla aditiva de versiones manuales; sin endpoints todavía. Contrato completo; estado draft **únicamente por dependencia T-009 no mergeada/conciliada**. Al comprobarla, Junie puede habilitar ready sin otra planificación. En T-001 comprobar además la evidencia Junie y adopción T-000; si no existen, no comenzar negocio.

## Leer antes

1. [AGENTS server](../../server/AGENTS.md).
2. [S-104 v1](../specs/S-104-daily-versions.md).
3. [S-101: contenido/API](../specs/S-101-daily-notes.md).
4. [TESTING](../TESTING.md).
5. [T-009](T-009-text-links.md), solo cierre/MERGED y evidencia necesaria. AGENTS raíz, STATUS y protocolo implementer son la entrada común.

## Archivos y pasos

Rutas previstas: server/src/main/resources/db/migration/V4__create_daily_version.sql; daily/persistence/DailyVersion.java y DailyVersionRepository.java; daily/application/DailyVersionService.java y DailyVersionServiceIT.java en tests.
Los nombres sin prefijo de backend son relativos a server/src/main/java/com/example/devnotes/; sus tests conservan paquete bajo server/src/test/java/com/example/devnotes/. Frontend relativo indicado explícitamente o bajo client/src/features/daily/.

1. Comprobar Git/PR/base, dependencia MERGED, capacidades mínimas y crear la rama exacta desde main actualizado; preservar cambios ajenos. Conciliar done de T-009 en primer avance útil.
2. Implementar solo este resultado siguiendo spec v1; pruebas de riesgo y negativos abajo, sin reducir suites/assertions/coverage/retries.
3. Dirigidos durante iteración; fijar huella/SHA/base antes del gate, publicar al pasar gate. No cambiar fuentes mientras corre.
4. Documentar resultado y preparar revisión independiente en STATUS; no autoaprobar ni comenzar siguiente tarea.

## Aceptación y pruebas

DB vacía y upgradeV3 conservan datos. Crear/reemplazar una fila; editar trabajo no altera copia; sourceRevision exacta. Revisión incorrecta/nota ajena o ausente no modifica. Dos acciones concurrentes no duplican ni mezclan contenido; timestamp micros/orden.

Capa elegida y motivo: IT PostgreSQL para migración/locks/constraints/aislamiento real.
Comandos ejecutables desde raíz con Git Bash/Docker Desktop Linux/Node>=24 (npm ci instala del lock; no actualiza versiones). Antes de dirigidos Docker y gate, crear namespaces propios y comprobar ausencia:

```bash
export COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container
export COMPOSE_PROJECT_NAME="starter-verify-devnotes-t010-$(date +%s)-$$"
export STARTER_E2E_PROJECT="starter-e2e-devnotes-t010-$(date +%s)-$$"
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  for kind in container network volume; do
    if [ "$kind" = container ]; then ids=$(docker container ls -aq --filter "label=com.docker.compose.project=$project") || exit 2
    else ids=$(docker "$kind" ls -q --filter "label=com.docker.compose.project=$project") || exit 2; fi
    [ -z "$ids" ] || exit 2
  done
done
docker compose --env-file .env.example --profile verify run --rm server-tests ./mvnw -B -ntp test-compile failsafe:integration-test failsafe:verify -Dit.test=DailyVersionServiceIT
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

Preparada por frontera/Codex el 2026-10-20, no ejecutada por Junie. Junie registra una vez rol/modelo/herramienta/esfuerzo realmente expuestos al tomarla; inventario heredado no acredita capacidades. Sin PR ni pruebas de esta tarea todavía. Dependencia pendiente: T-009. El prompt vigente está solo en STATUS.

## Correcciones significativas

Sin correcciones ni resultados de implementación acreditados.

## Cierre y siguiente tarea

Publicar PR y evidencia según TESTING; pasar a in_review con prompt reviewer en sesión nueva. Reviewer comprueba HEAD/base, gate, CI y arquitectura/propiedad, publica veredicto del SHA final y puede squash merge por AUTONOMY. Sin done hasta MERGED comprobado. El siguiente implementer concilia done al primer avance de su rama nueva; no editar la rama ya mergeada. Próxima: [T-011](T-011-version-api.md).

Antes de preparar la siguiente sesión, controlar avance de las últimas cinco tareas I1 mergeadas: contratos/evidencia/dependencias vigentes, costo de pruebas medido y cola consistente. Registrar hallazgos en esta tarea; fuera de alcance a BACKLOG. No regresar a frontera si la ruta sigue completa.
