---
id: T-007
status: draft
priority: P1
size: S
executor: junie
role: implementer
milestone: M1
product_cycle: I1
spec: S-101
spec_version: 2
branch: codex/t-007-daily-workspace
pr: null
depends_on: [T-016]
---
# T-007 · Espacio de notas por fecha

## Objetivo

Espacio de notas por fecha, capacidad S-101 de I1. Resultado comprobable descrito abajo; ninguna implementación de otra tarea en esta sesión. Siguiente: [T-008](T-008-separator-editing.md), habilitada solo tras MERGED de esta tarea y su conciliación en una nueva sesión. Salida a frontera: T-014 mergeada con los seis CA o decisión/bloqueo fuera del contrato.

## Alcance y decisiones resueltas

Conectar editor/hook a /notes y /notes/:date, selector fecha/listado paginado de propias y estados S-101. /notes calcula hoy con componentes locales; guardias fecha/ruta. Montar DailyDraftProvider sobre Outlet/nav bajo key de identidad en AppShell, usando navegación guardada para enlaces internos/header/fecha/lista. Ante browser atrás/adelante conservar dirty y aviso global Volver/Reintentar; no iniciar otra fecha editable mientras el borrador anterior siga pendiente. Mantener BrowserRouter declarativo; beforeunload si dirty/pending. Tema oscuro único y enlaces Notas; mantener home/system/login/logout y referencia técnica.

Impacto previsto: UI de notas por fecha, tema oscuro y navegación; backend inalterado. Contrato completo; draft **únicamente por T-016 no mergeada/conciliada**. Al comprobarla, Junie habilita ready sin otra planificación. T-016 entrega cola/provider y navegación guardada; T-006 entrega transporte/Query.

## Leer antes

1. [AGENTS client](../../client/AGENTS.md).
2. [S-101 v2](../specs/S-101-daily-notes.md).
3. [S-101: JSON/editor/guardado](../specs/S-101-daily-notes.md).
4. [TESTING](../TESTING.md).
5. [T-016](T-016-daily-draft-coordinator.md), cierre y API de cola/provider. AGENTS raíz, STATUS y protocolo implementer son la entrada común.

## Archivos y pasos

Rutas previstas: client/src/features/daily/DailyNotesPage.tsx y DailyNotesPage.test.tsx; client/src/app/AppRoutes.tsx, AppShell.tsx y theme.ts; adaptar AppRoutes.test.tsx.
Los nombres sin prefijo de backend son relativos a server/src/main/java/com/example/devnotes/; sus tests conservan paquete bajo server/src/test/java/com/example/devnotes/. Frontend relativo indicado explícitamente o bajo client/src/features/daily/.

1. Comprobar Git/PR/base, dependencia MERGED, capacidades mínimas y crear la rama exacta desde main actualizado; preservar cambios ajenos. Conciliar done de T-016 en primer avance útil.
2. Implementar solo este resultado siguiendo spec v2; pruebas de riesgo y negativos abajo, sin reducir suites/assertions/coverage/retries.
3. Dirigidos durante iteración; fijar huella/SHA/base antes del gate, publicar al pasar gate. No cambiar fuentes mientras corre.
4. Documentar resultado y preparar revisión independiente en STATUS; no autoaprobar ni comenzar siguiente tarea.

## Aceptación y pruebas

Abrir hoy/otra fecha, editar/guardar/recargar, navegar fechas existentes. Fecha local cerca de medianoche no cambia por UTC. Loading/vacío/error/reintento/409 y 401/403 accesibles; flush fallido conserva fecha/texto; 375px sin overflow. Visitante no consulta datos privados. Atrás/adelante conserva borrador y ofrece Volver/Reintentar/Descartar con confirmación; no habilita otra fecha mientras hay escritura incierta. Verificar beforeunload dirty/pending y liberarlo tras ACK o descarte seguro.

Capa elegida y motivo: Página/componentes con router/providers/MSW reales demuestra estados y navegación; FULL cubre regresiones de auth y layout existente.
Comandos ejecutables desde raíz con Git Bash/Docker Desktop Linux/Node>=24 (npm ci instala del lock; no actualiza versiones). Antes de dirigidos Docker y gate, crear namespaces propios y comprobar ausencia:

```bash
export COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container
export COMPOSE_PROJECT_NAME="starter-verify-devnotes-t007-$(date +%s)-$$"
export STARTER_E2E_PROJECT="starter-e2e-devnotes-t007-$(date +%s)-$$"
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  for kind in container network volume; do
    if [ "$kind" = container ]; then ids=$(docker container ls -aq --filter "label=com.docker.compose.project=$project") || exit 2
    else ids=$(docker "$kind" ls -q --filter "label=com.docker.compose.project=$project") || exit 2; fi
    [ -z "$ids" ] || exit 2
  done
done
npm --prefix client ci
npm --prefix client test -- --run src/features/daily/DailyNotesPage.test.tsx src/app/AppRoutes.test.tsx
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

Preparada por frontera/Codex el 2026-10-20, ajustada el 2026-10-21 a S-101 v2 y dependencia T-016. No ejecutada por Junie. Registra rol/modelo/herramienta/esfuerzo al tomarla; sin PR ni pruebas. El prompt vigente está solo en STATUS.

## Correcciones significativas

Sin correcciones ni resultados de implementación acreditados.

## Cierre y siguiente tarea

Publicar PR y evidencia según TESTING; pasar a in_review con prompt reviewer en sesión nueva. Reviewer comprueba HEAD/base, gate, CI y arquitectura/propiedad, publica veredicto del SHA final y puede squash merge por AUTONOMY. Sin done hasta MERGED comprobado. El siguiente implementer concilia done al primer avance de su rama nueva; no editar la rama ya mergeada. Próxima: [T-008](T-008-separator-editing.md).
