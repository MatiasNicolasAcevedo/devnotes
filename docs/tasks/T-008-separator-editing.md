---
id: T-008
status: in_review
priority: P1
size: S
executor: junie
role: implementer
milestone: M1
product_cycle: I1
spec: S-103
spec_version: 1
branch: codex/t-008-separator-editing
pr: null
depends_on: [T-007]
---
# T-008 · Separadores con teclado

## Objetivo

Separadores con teclado, capacidad S-103 de I1. Resultado comprobable descrito abajo; ninguna implementación de otra tarea en esta sesión. Siguiente: [T-009](T-009-text-links.md), habilitada solo tras MERGED de esta tarea y su conciliación en una nueva sesión. Salida a frontera: T-014 mergeada con los seis CA o decisión/bloqueo fuera del contrato.

## Alcance y decisiones resueltas

Agregar shortcuts exactos de S-103 al nodo ya renderizado. Transacción única Enter, cursor siguiente y borrado/undo/redo; sin conversión en paste ni Shift+Enter. Probar comandos y todos sus negativos con editor real.

Impacto previsto: Transformaciones de teclado y nodos visuales con mismo contrato JSON. Contrato completo; estado draft **únicamente por dependencia T-007 no mergeada/conciliada**. Al comprobarla, Junie puede habilitar ready sin otra planificación. En T-001 comprobar además la evidencia Junie y adopción T-000; si no existen, no comenzar negocio.

## Leer antes

1. [AGENTS client](../../client/AGENTS.md).
2. [S-103 v1](../specs/S-103-separators.md).
3. [S-101: JSON/editor/guardado](../specs/S-101-daily-notes.md).
4. [TESTING](../TESTING.md).
5. [T-007](T-007-daily-workspace.md), solo cierre/MERGED y evidencia necesaria. AGENTS raíz, STATUS y protocolo implementer son la entrada común.

## Archivos y pasos

Rutas previstas: client/src/features/daily/editor/separator.ts y separator.test.ts; DailyEditor.tsx/DailyEditor.test.tsx y dailyEditor.css si requiere ajustar eliminación/gutter.
Los nombres sin prefijo de backend son relativos a server/src/main/java/com/example/devnotes/; sus tests conservan paquete bajo server/src/test/java/com/example/devnotes/. Frontend relativo indicado explícitamente o bajo client/src/features/daily/.

1. Comprobar Git/PR/base, dependencia MERGED, capacidades mínimas y crear la rama exacta desde main actualizado; preservar cambios ajenos. Conciliar done de T-007 en primer avance útil.
2. Implementar solo este resultado siguiendo spec v1; pruebas de riesgo y negativos abajo, sin reducir suites/assertions/coverage/retries.
3. Dirigidos durante iteración; fijar huella/SHA/base antes del gate, publicar al pasar gate. No cambiar fuentes mientras corre.
4. Documentar resultado y preparar revisión independiente en STATUS; no autoaprobar ni comenzar siguiente tarea.

## Aceptación y pruebas

--25/--50/--75/--- Enter producen25/50/75/100 y cursor editable. Espacios, selección, marcas, cursor intermedio no convierten. Eliminar desde línea siguiente/nodo seleccionado conserva texto/lineado; readonly no convierte ni borra.

Capa elegida y motivo: Transacciones reales y componente; geometría/ancho CSS se verifica en Playwright T-014.
Comandos ejecutables desde raíz con Git Bash/Docker Desktop Linux/Node>=24 (npm ci instala del lock; no actualiza versiones). Antes de dirigidos Docker y gate, crear namespaces propios y comprobar ausencia:

```bash
export COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container
export COMPOSE_PROJECT_NAME="starter-verify-devnotes-t008-$(date +%s)-$$"
export STARTER_E2E_PROJECT="starter-e2e-devnotes-t008-$(date +%s)-$$"
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  for kind in container network volume; do
    if [ "$kind" = container ]; then ids=$(docker container ls -aq --filter "label=com.docker.compose.project=$project") || exit 2
    else ids=$(docker "$kind" ls -q --filter "label=com.docker.compose.project=$project") || exit 2; fi
    [ -z "$ids" ] || exit 2
  done
done
npm --prefix client ci
npm --prefix client test -- --run src/features/daily/editor/separator.test.ts src/features/daily/editor/DailyEditor.test.tsx
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

Implementación en progreso. Rama codex/t-008-separator-editing desde main 1702fd9. Shortcuts Enter/Backspace implementados en separator.ts con funciones extraíbles tryConvertToSeparator/tryDeletePreviousSeparator. CSS actualizado con ancho relativo porcentual. 18 tests separator.test.ts OK, 9 tests DailyEditor.test.ts OK, typecheck OK. T-007 MERGED 1702fd9, dependencia satisfecha.

## Correcciones significativas

Sin correcciones ni resultados de implementación acreditados.

## Cierre y siguiente tarea

Publicar PR y evidencia según TESTING; pasar a in_review con prompt reviewer en sesión nueva. Reviewer comprueba HEAD/base, gate, CI y arquitectura/propiedad, publica veredicto del SHA final y puede squash merge por AUTONOMY. Sin done hasta MERGED comprobado. El siguiente implementer concilia done al primer avance de su rama nueva; no editar la rama ya mergeada. Próxima: [T-009](T-009-text-links.md).
