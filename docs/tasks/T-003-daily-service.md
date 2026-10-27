---
id: T-003
status: done
priority: P1
size: S
executor: junie
role: implementer
milestone: M1
product_cycle: I1
spec: S-101
spec_version: 2
branch: codex/t-003-daily-service
pr: 7
depends_on: [T-002]
merged_sha: f87f0cf7c756d852da370d2a61fe40077033c09d
merged_date: 2026-10-24
---
# T-003 · Guardado concurrente del trabajo

## Objetivo

Guardado concurrente del trabajo, capacidad S-101 de I1. Resultado comprobable descrito abajo; ninguna implementación de otra tarea en esta sesión. Siguiente: [T-004](T-004-daily-api.md), habilitada solo tras MERGED de esta tarea y su conciliación en una nueva sesión. Salida a frontera: T-014 mergeada con los seis CA o decisión/bloqueo fuera del contrato.

## Alcance y decisiones resueltas

Servicio con Clock, UUIDv7 y timestamp micros. Implementar abrir/listar/guardar por owner+fecha y revisión esperada, usando primitivas T-002 sin transacción abortada reutilizada. Dos escritores/carrera de creación probados en transacciones reales. Agregar regla de cobertura daily/domain y daily/application con mínimos 80/70; conservar referencia y resto del POM.

Impacto previsto: Reglas transaccionales/cobertura; aún sin rutas públicas nuevas. Contrato implementado y MERGED; el checkpoint de cierre conserva la evidencia.

## Leer antes

1. [AGENTS server](../../server/AGENTS.md).
2. [S-101 v2](../specs/S-101-daily-notes.md).
3. [S-101: contenido/API](../specs/S-101-daily-notes.md).
4. [TESTING](../TESTING.md).
5. [T-002](T-002-daily-persistence.md), solo cierre/MERGED y evidencia necesaria. AGENTS raíz, STATUS y protocolo implementer son la entrada común.

## Archivos y pasos

Rutas previstas: daily/application/DailyNoteService.java, DailyNoteView.java (records de entrada/proyección pueden ser anidados), DailyNoteConflictException.java; daily/application/DailyNoteServiceIT.java en tests; server/pom.xml solo reglas JaCoCo.
Los nombres sin prefijo de backend son relativos a server/src/main/java/com/example/devnotes/; sus tests conservan paquete bajo server/src/test/java/com/example/devnotes/. Frontend relativo indicado explícitamente o bajo client/src/features/daily/.

1. Comprobar Git/PR/base, dependencia MERGED, capacidades mínimas y crear la rama exacta desde main actualizado; preservar cambios ajenos. Conciliar done de T-002 en primer avance útil.
2. Implementar solo este resultado siguiendo spec v2; pruebas de riesgo y negativos abajo, sin reducir suites/assertions/coverage/retries.
3. Dirigidos durante iteración; fijar huella/SHA/base antes del gate, publicar al pasar gate. No cambiar fuentes mientras corre.
4. Documentar resultado y preparar revisión independiente en STATUS; no autoaprobar ni comenzar siguiente tarea.

## Aceptación y pruebas

Revisión0 crea1, CAS vigente incrementa, conflicto no escribe. Carrera primera escritura solo un ganador, carrera actualización solo un ganador; B no altera A; guardar valida documento antes de mutar. Fecha y timestamps coherentes. Límites de revisión segura S-101 v2, incluido máximo sin incremento posible: 409 sin modificar nota ni timestamp; no overflow de BIGINT ni redondeo JS.

Capa elegida y motivo: IT de servicio/transacción PostgreSQL prueba concurrencia y aislamiento que mock de repositorio no demuestra.
Comandos ejecutables desde raíz con Git Bash/Docker Desktop Linux/Node>=24 (npm ci instala del lock; no actualiza versiones). Antes de dirigidos Docker y gate, crear namespaces propios y comprobar ausencia:

```bash
export COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container
export COMPOSE_PROJECT_NAME="starter-verify-devnotes-t003-$(date +%s)-$$"
export STARTER_E2E_PROJECT="starter-e2e-devnotes-t003-$(date +%s)-$$"
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  for kind in container network volume; do
    if [ "$kind" = container ]; then ids=$(docker container ls -aq --filter "label=com.docker.compose.project=$project") || exit 2
    else ids=$(docker "$kind" ls -q --filter "label=com.docker.compose.project=$project") || exit 2; fi
    [ -z "$ids" ] || exit 2
  done
done
docker compose --env-file .env.example --profile verify run --rm server-tests ./mvnw -B -ntp test-compile failsafe:integration-test failsafe:verify -Dit.test=DailyNoteServiceIT
```

Los dirigidos no acreditan FULL. Cierre previsto **STARTER**, por dependencias o configuración/cobertura modificadas; si diff completo exige STARTER, usar --starter sin rebajar clasificación. Registrar también diff sin commit; --policy solo mira commits.

```bash
bash scripts/verify.sh --starter
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

MERGED el 2026-10-24. Squash merge de PR7 (HEAD e3871d0) a main, commit f87f0cf7c756d852da370d2a61fe40077033c09d. Revisión APROBADA por Junie reviewer el 2026-10-23. Rama codex/t-003-daily-service borrada. T-004 habilitada.

## Correcciones significativas

Sin correcciones durante implementación ni revisión.

## Cierre y siguiente tarea

Publicar PR y evidencia según TESTING; pasar a in_review con prompt reviewer en sesión nueva. Reviewer comprueba HEAD/base, gate, CI y arquitectura/propiedad, publica veredicto del SHA final y puede squash merge por AUTONOMY. Sin done hasta MERGED comprobado. El siguiente implementer concilia done al primer avance de su rama nueva; no editar la rama ya mergeada. Próxima: [T-004](T-004-daily-api.md).
