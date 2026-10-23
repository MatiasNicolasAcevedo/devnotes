---
id: T-002
status: done
priority: P1
size: S
executor: junie
role: implementer
milestone: M1
product_cycle: I1
spec: S-101
spec_version: 2
branch: codex/t-002-daily-persistence
pr: 5
depends_on: [T-001]
---
# T-002 · Persistencia privada por fecha

## Objetivo

Persistencia privada por fecha, capacidad S-101 de I1. Resultado comprobable descrito abajo; ninguna implementación de otra tarea en esta sesión. Siguiente: [T-003](T-003-daily-service.md), habilitada solo tras MERGED de esta tarea y su conciliación en una nueva sesión. Salida a frontera: T-014 mergeada con los seis CA o decisión/bloqueo fuera del contrato.

## Alcance y decisiones resueltas

Agregar V3 aditiva y entidad JSONB/revisión según S-101, sin tocar V1/V2. Consultas owner+fecha, listado paginado/offset long y primitivas de inserción/CAS. IT migra DB vacía y V1/V2 con datos ficticios preservados; comprobar FK, unicidad y timestamp.

Impacto previsto: Tabla nueva aditiva con datos ficticios; ninguna API aún. Contrato completo; estado draft **únicamente por dependencia T-001 no mergeada/conciliada**. Al comprobarla, Junie puede habilitar ready sin otra planificación. En T-001 comprobar además la evidencia Junie y adopción T-000; si no existen, no comenzar negocio.

## Leer antes

1. [AGENTS server](../../server/AGENTS.md).
2. [S-101 v2](../specs/S-101-daily-notes.md).
3. [S-101: contenido/API](../specs/S-101-daily-notes.md).
4. [TESTING](../TESTING.md).
5. [T-001](T-001-document-contract.md), solo cierre/MERGED y evidencia necesaria. AGENTS raíz, STATUS y protocolo implementer son la entrada común.

## Archivos y pasos

Rutas previstas: server/src/main/resources/db/migration/V3__create_daily_note.sql; daily/persistence/DailyNote.java y DailyNoteRepository.java; daily/persistence/DailyNoteRepositoryIT.java en tests.
Los nombres sin prefijo de backend son relativos a server/src/main/java/com/example/devnotes/; sus tests conservan paquete bajo server/src/test/java/com/example/devnotes/. Frontend relativo indicado explícitamente o bajo client/src/features/daily/.

1. Comprobar Git/PR/base, dependencia MERGED, capacidades mínimas y crear la rama exacta desde main actualizado; preservar cambios ajenos. Conciliar done de T-001 en primer avance útil.
2. Implementar solo este resultado siguiendo spec v2; pruebas de riesgo y negativos abajo, sin reducir suites/assertions/coverage/retries.
3. Dirigidos durante iteración; fijar huella/SHA/base antes del gate, publicar al pasar gate. No cambiar fuentes mientras corre.
4. Documentar resultado y preparar revisión independiente en STATUS; no autoaprobar ni comenzar siguiente tarea.

## Aceptación y pruebas

PostgreSQL18 real valida migración vacía/upgrade y JPA validate. Misma fecha admite A y B sin mezcla; mismo dueño/fecha no duplica; listar solo propias con orden/offset; constraints y micros preservados.

Capa elegida y motivo: Persistencia, constraints, migración y consultas necesitan PostgreSQL real; no reemplazar por H2/mocks.
Comandos ejecutables desde raíz con Git Bash/Docker Desktop Linux/Node>=24 (npm ci instala del lock; no actualiza versiones). Antes de dirigidos Docker y gate, crear namespaces propios y comprobar ausencia:

```bash
export COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container
export COMPOSE_PROJECT_NAME="starter-verify-devnotes-t002-$(date +%s)-$$"
export STARTER_E2E_PROJECT="starter-e2e-devnotes-t002-$(date +%s)-$$"
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  for kind in container network volume; do
    if [ "$kind" = container ]; then ids=$(docker container ls -aq --filter "label=com.docker.compose.project=$project") || exit 2
    else ids=$(docker "$kind" ls -q --filter "label=com.docker.compose.project=$project") || exit 2; fi
    [ -z "$ids" ] || exit 2
  done
done
docker compose --env-file .env.example --profile verify run --rm server-tests ./mvnw -B -ntp test-compile failsafe:integration-test failsafe:verify -Dit.test=DailyNoteRepositoryIT
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

En codex/t-002-daily-persistence desde main (bd60fff). V3 aditiva, DailyNote.java (JSONB/revisión), DailyNoteRepository.java (owner+fecha, paginación offset long, CAS con clearAutomatically), DailyNoteRepositoryIT.java (11 tests IT con PostgreSQL 18, todos passing). Gate FULL pendiente. Dependencia T-001 MERGED/conciliada.

## Correcciones significativas

1. **CAS updateWithCas — Hibernate no reconocía `:content::jsonb`**: El cast PostgreSQL `::jsonb` se parseaba como parte del nombre del parámetro. Solución: usar `CAST(:content AS jsonb)` en la consulta nativa. Verificado con tests updateWithCasSucceedsWhenRevisionMatches y updateWithCasReturnsZeroWhenRevisionDoesNotMatch.
2. **CAS sin clearAutomatically — entidad caché del EntityManager**: `@Modifying` sin `clearAutomatically = true` dejaba la entidad antigua en el primer nivel de caché; el refresh leía revision=1 en vez de revision=2. Solución: agregar `clearAutomatically = true`. Verificado con assertion de revision=2 tras CAS.
3. **JDBC INSERT con JSONB — BadSqlGrammarException**: jdbc.update con `?` directo para columna jsonb lanzaba error de tipo. Solución: usar `CAST(? AS jsonb)` en SQL directo. Verificado con databaseRejectsInvalidRevisionAndNonObjectContent.

## Cierre y siguiente tarea

Publicar PR y evidencia según TESTING; pasar a in_review con prompt reviewer en sesión nueva. Reviewer comprueba HEAD/base, gate, CI y arquitectura/propiedad, publica veredicto del SHA final y puede squash merge por AUTONOMY. Sin done hasta MERGED comprobado. El siguiente implementer concilia done al primer avance de su rama nueva; no editar la rama ya mergeada. Próxima: [T-003](T-003-daily-service.md).
