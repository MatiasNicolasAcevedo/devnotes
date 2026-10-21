---
id: T-001
status: draft
priority: P1
size: S
executor: junie
role: implementer
milestone: M1
product_cycle: I1
spec: S-101
spec_version: 1
branch: codex/t-001-document-contract
pr: null
depends_on: [T-000]
---
# T-001 · Contrato de contenido estructurado

## Objetivo

Contrato de contenido estructurado, capacidad S-101 de I1. Resultado comprobable descrito abajo; ninguna implementación de otra tarea en esta sesión. Siguiente: [T-002](T-002-daily-persistence.md), habilitada solo tras MERGED de esta tarea y su conciliación en una nueva sesión. Salida a frontera: T-014 mergeada con los seis CA o decisión/bloqueo fuera del contrato.

## Alcance y decisiones resueltas

Crear validador inmutable de JsonNode (Jackson efectivo del POM), sin dependencia nueva. Aceptar únicamente árbol S-101, retornar copia defensiva del JSON válido y excepción de validación segura sin eco de valores. Añadir tabla parametrizada de árboles válidos/inválidos y fronteras; no API, JPA ni UI.

Impacto previsto: Contrato de contenido, sin rutas/permisos nuevos. Contrato completo; estado draft **únicamente por dependencia T-000 no mergeada/conciliada**. Al comprobarla, Junie puede habilitar ready sin otra planificación. En T-001 comprobar además la evidencia Junie y adopción T-000; si no existen, no comenzar negocio.

## Leer antes

1. [AGENTS server](../../server/AGENTS.md).
2. [S-101 v1](../specs/S-101-daily-notes.md).
3. [S-101: contenido/API](../specs/S-101-daily-notes.md).
4. [TESTING](../TESTING.md).
5. [T-000](T-000-adoption.md), solo cierre/MERGED y evidencia necesaria. AGENTS raíz, STATUS y protocolo implementer son la entrada común.

## Archivos y pasos

Rutas previstas: server/src/main/java/com/example/devnotes/daily/domain/DailyContent.java; DailyContentTest.java bajo server/src/test/java/com/example/devnotes/daily/domain/.
Los nombres sin prefijo de backend son relativos a server/src/main/java/com/example/devnotes/; sus tests conservan paquete bajo server/src/test/java/com/example/devnotes/. Frontend relativo indicado explícitamente o bajo client/src/features/daily/.

1. Comprobar Git/PR/base, dependencia MERGED, capacidades mínimas y crear la rama exacta desde main actualizado; preservar cambios ajenos. Conciliar done de T-000 en primer avance útil.
2. Implementar solo este resultado siguiendo spec v1; pruebas de riesgo y negativos abajo, sin reducir suites/assertions/coverage/retries.
3. Dirigidos durante iteración; fijar huella/SHA/base antes del gate, publicar al pasar gate. No cambiar fuentes mientras corre.
4. Documentar resultado y preparar revisión independiente en STATUS; no autoaprobar ni comenzar siguiente tarea.

## Aceptación y pruebas

Árbol vacío/texto/marca/separador roundtrip; límites exactos y +1, CR/LF, root/keys/nodos/marks extras, widths y href peligroso/relativo se rechazan; entrada no se muta. Comprobar independencia de copia.

Capa elegida y motivo: Unitario puro del árbol/URL y bordes: no necesita DB ni navegador.
Comandos ejecutables desde raíz con Git Bash/Docker Desktop Linux/Node>=24 (npm ci instala del lock; no actualiza versiones). Antes de dirigidos Docker y gate, crear namespaces propios y comprobar ausencia:

```bash
export COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container
export COMPOSE_PROJECT_NAME="starter-verify-devnotes-t001-$(date +%s)-$$"
export STARTER_E2E_PROJECT="starter-e2e-devnotes-t001-$(date +%s)-$$"
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  for kind in container network volume; do
    if [ "$kind" = container ]; then ids=$(docker container ls -aq --filter "label=com.docker.compose.project=$project") || exit 2
    else ids=$(docker "$kind" ls -q --filter "label=com.docker.compose.project=$project") || exit 2; fi
    [ -z "$ids" ] || exit 2
  done
done
docker compose --env-file .env.example --profile verify run --rm server-tests ./mvnw -B -ntp -Dtest=DailyContentTest test
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

Preparada por frontera/Codex el 2026-10-20, no ejecutada por Junie. Junie registra una vez rol/modelo/herramienta/esfuerzo realmente expuestos al tomarla; inventario heredado no acredita capacidades. Sin PR ni pruebas de esta tarea todavía. Dependencia pendiente: T-000. El prompt vigente está solo en STATUS.

## Correcciones significativas

Sin correcciones ni resultados de implementación acreditados.

## Cierre y siguiente tarea

Publicar PR y evidencia según TESTING; pasar a in_review con prompt reviewer en sesión nueva. Reviewer comprueba HEAD/base, gate, CI y arquitectura/propiedad, publica veredicto del SHA final y puede squash merge por AUTONOMY. Sin done hasta MERGED comprobado. El siguiente implementer concilia done al primer avance de su rama nueva; no editar la rama ya mergeada. Próxima: [T-002](T-002-daily-persistence.md).
