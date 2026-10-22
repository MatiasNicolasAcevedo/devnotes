---
id: T-013
status: draft
priority: P1
size: S
executor: junie
role: implementer
milestone: M1
product_cycle: I1
spec: S-104
spec_version: 2
branch: codex/t-013-version-save
pr: null
depends_on: [T-012]
---
# T-013 · Guardar versión del trabajo confirmado

## Objetivo

Guardar versión del trabajo confirmado, capacidad S-104 de I1. Resultado comprobable descrito abajo; ninguna implementación de otra tarea en esta sesión. Siguiente: [T-014](T-014-mvp-journey.md), habilitada solo tras MERGED de esta tarea y su conciliación en una nueva sesión. Salida a frontera: T-014 mergeada con los seis CA o decisión/bloqueo fuera del contrato.

## Alcance y decisiones resueltas

Botón manual S-104: confirmar reemplazo, bloquear edición/navegación mientras flush+POST, revisión del último ACK; vacío explícito permite crear nota vacía. Invalidar queries de identidad iniciadora sin setQueryData; mensajes solo de sesión vigente.

Consultar versión propia antes de crear/reemplazar: 200 confirma reemplazo, 404 crea, error/loading no autoriza POST. Durante consulta/confirmación fijar la acción e impedir dobles clicks; al confirmar, bloquear edición y flush de la generación vigente. POST sin ACK indica resultado desconocido y ofrece consultar historial antes de repetir; no prometer que no hubo escritura. Guardias de sesión/CSRF listas antes de mutar.

Impacto previsto: Acción explícita de crear/reemplazar copia; sin restauración. Contrato completo; estado draft **únicamente por dependencia T-012 no mergeada/conciliada**. Al comprobarla, Junie puede habilitar ready sin otra planificación. En T-001 comprobar además la evidencia Junie y adopción T-000; si no existen, no comenzar negocio.

## Leer antes

1. [AGENTS client](../../client/AGENTS.md).
2. [S-104 v2](../specs/S-104-daily-versions.md).
3. [S-101: JSON/editor/guardado](../specs/S-101-daily-notes.md).
4. [TESTING](../TESTING.md).
5. [T-012](T-012-version-history.md), solo cierre/MERGED y evidencia necesaria. AGENTS raíz, STATUS y protocolo implementer son la entrada común.

## Archivos y pasos

Rutas previstas: client/src/features/daily/SaveDailyVersion.tsx y SaveDailyVersion.test.tsx; versionApi.ts; DailyNotesPage.tsx y useDailyNote.ts si requiere exponer flush/bloqueo.
Los nombres sin prefijo de backend son relativos a server/src/main/java/com/example/devnotes/; sus tests conservan paquete bajo server/src/test/java/com/example/devnotes/. Frontend relativo indicado explícitamente o bajo client/src/features/daily/.

1. Comprobar Git/PR/base, dependencia MERGED, capacidades mínimas y crear la rama exacta desde main actualizado; preservar cambios ajenos. Conciliar done de T-012 en primer avance útil.
2. Implementar solo este resultado siguiendo spec v2; pruebas de riesgo y negativos abajo, sin reducir suites/assertions/coverage/retries.
3. Dirigidos durante iteración; fijar huella/SHA/base antes del gate, publicar al pasar gate. No cambiar fuentes mientras corre.
4. Documentar resultado y preparar revisión independiente en STATUS; no autoaprobar ni comenzar siguiente tarea.

## Aceptación y pruebas

Click durante debounce y durante PUT espera la última generación y POST con revisión correcta. No POST automático por editar/fecha/login. Consultar 200/404/error antes de decidir; cancelar, fallo de consulta/flush, 409 o CSRF no reemplazan copia ni dicen éxito. Red después de POST no acredita ausencia de escritura y permite consultar historial. Respuesta tardía tras logout no contamina nueva sesión; error libera bloqueo y retiene borrador.

Capa elegida y motivo: Componente+hook con respuestas retenidas demuestra secuencia crítica de trabajo y copia, negativos y sesión.
Comandos ejecutables desde raíz con Git Bash/Docker Desktop Linux/Node>=24 (npm ci instala del lock; no actualiza versiones). Antes de dirigidos Docker y gate, crear namespaces propios y comprobar ausencia:

```bash
export COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container
export COMPOSE_PROJECT_NAME="starter-verify-devnotes-t013-$(date +%s)-$$"
export STARTER_E2E_PROJECT="starter-e2e-devnotes-t013-$(date +%s)-$$"
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  for kind in container network volume; do
    if [ "$kind" = container ]; then ids=$(docker container ls -aq --filter "label=com.docker.compose.project=$project") || exit 2
    else ids=$(docker "$kind" ls -q --filter "label=com.docker.compose.project=$project") || exit 2; fi
    [ -z "$ids" ] || exit 2
  done
done
npm --prefix client ci
npm --prefix client test -- --run src/features/daily/SaveDailyVersion.test.tsx src/features/daily/useDailyNote.test.tsx
npm --prefix client run typecheck
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

Preparada por frontera/Codex el 2026-10-20, no ejecutada por Junie. Junie registra una vez rol/modelo/herramienta/esfuerzo realmente expuestos al tomarla; inventario heredado no acredita capacidades. Sin PR ni pruebas de esta tarea todavía. Dependencia pendiente: T-012. El prompt vigente está solo en STATUS.

## Correcciones significativas

Sin correcciones ni resultados de implementación acreditados.

## Cierre y siguiente tarea

Publicar PR y evidencia según TESTING; pasar a in_review con prompt reviewer en sesión nueva. Reviewer comprueba HEAD/base, gate, CI y arquitectura/propiedad, publica veredicto del SHA final y puede squash merge por AUTONOMY. Sin done hasta MERGED comprobado. El siguiente implementer concilia done al primer avance de su rama nueva; no editar la rama ya mergeada. Próxima: [T-014](T-014-mvp-journey.md).
