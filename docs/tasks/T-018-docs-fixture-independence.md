---
id: T-018
status: ready
priority: P1
size: S
executor: frontier
role: implementer
milestone: M1
counts_for_cycle: false
spec: null
spec_version: null
branch: codex/t-018-docs-fixture-independence
pr: null
depends_on: [T-015]
---
# T-018 · Aislar las fixtures del checker del estado de adopción

## Objetivo

Permitir que la suite documental valide tanto adopción pendiente como completa sin depender del estado real del repositorio. Mantenimiento previo a Junie T-001, descubierto al revisar los contratos a pedido del dueño; no cuenta entre las quince tareas de producto I1. No reabre ni sustituye el merge, gate o revisión aceptados de T-015.

## Alcance y decisiones resueltas

Modificar **solo scripts/ci/docs-check.test.mjs** y documentación de esta preparación. No cambiar scripts/docs-check.mjs, reglas de adopción, estado real para acomodarlo a tests, aplicación, dependencias, workflows, protecciones ni herramientas Junie. Conservar los35 tests y todos sus negativos/assertions; agregar regresiones propias si hace falta para demostrar independencia de NO_LISTO21/22 y STARTER_VALIDADO22/22. La preparación previa de contratos I1/I2 y conciliación vive en este primer avance de tarea, sin PR separado de planificación; el único PR de T-018 incluye luego la corrección/gate y revisión independiente.

La fixture arrangeBoard debe poseer también HANDOFF con veredicto/conteo/criterios coherentes. Sus casos positivos de M0 draft/blocked/in_review/mergeable no pueden conservar STARTER_VALIDADO del checkout; preparar NO_LISTO y criterio pendiente ficticio, sin escribir documentos reales. Los negativos que prueban STARTER_VALIDADO inválido deben **crear** un criterio pendiente o M0 abierta, y afirmar que la mutación ocurrió. El test de conteo debe usar un número realmente distinto del conteo de su fixture y no concatenar otra línea válida de22/22 a un STATUS ya22/22. completeHandoff mantiene los casos H02 de22/22 y M0 cerrada/futura M1 draft; evitar que helpers sobrescriban accidentalmente el estado arreglado por otro helper usando originals en vez del contenido actual.

## Leer antes

1. [AGENTS raíz](../../AGENTS.md), reglas de pruebas y Git.
2. [T-015](T-015-adoption-checks.md), cierre propio confirmado y correcciones H01/H02 conservadas.
3. [TESTING](../TESTING.md), gate STARTER y evidencia.
4. [ORCHESTRATION](../ORCHESTRATION.md), M0 versus producto futuro y continuidad.
5. [AUTONOMY](../AUTONOMY.md), revisión/merge en sesión independiente.

## Archivos y pasos

1. Sesión nueva frontera implementer continúa esta rama preparada desde mainb52b1fd, preservando documentos/contratos. Comprobar árbol/refs/PR/CI y registrar capacidades propias; pasar a in_progress. T-001 sigue draft por esta dependencia.
2. Renovar rojo con la suite completa sobre fuentes/documentos recibidos y logs saneados en .orchestrator/t018 ignorado. Aislar fixtures de los seis fallos identificados sin cambiar documentos/checker para satisfacerlas; conservar35 tests y H02. Demostrar también estado inicial21/22 en copia ficticia propia, sin Git/kit/secretos.
3. Ejecutar dirigidos y suites Node; cerrar fuentes con STARTER propio según TESTING. Checkpoint previo de SHA/base/huellas/comandos/logs/recursos/cleanup, sin modificar fuentes durante gate. Publicar código al pasar gate y completar documentación sin repetir FULL por Markdown con mismas fuentes/base.
4. Abrir un PR T-018 contra main; dejar in_review y STATUS para frontera reviewer en sesión nueva. No autoaprobar, implementar T-001 ni iniciar otra tarea aquí. Tras MERGED, una sesión nueva Junie T-001 concilia done y continúa el contrato S-101 v2.

## Aceptación y pruebas

Desde raíz, Node>=24, Git Bash y Docker Desktop Linux para gate:

| Criterio | Comando / capa | Resultado requerido |
|---|---|---|
| Rojo reproducible, no pérdida de asserts | `node --test --test-reporter=tap scripts/ci/docs-check.test.mjs` | Antes:35 tests,29 pass/6 fail; después35 o más,0 fail/cancelled/skipped |
| Fixtures independientes de adopción completa/pendiente | Misma suite y copia ficticia propia con NO_LISTO21/22/STARTER_VALIDADO22/22 | Ambos contextos pasan; cada negativo genera el desacuerdo anunciado y exige exit1 |
| Regresiones de tooling conservadas | `node --test --test-reporter=tap "scripts/ci/*.test.mjs"` | Todas verdes, sin reducir suites/assertions; si hay límite sandbox usar host autorizado, no omitir casos |
| Documentación/cola coherentes | `node scripts/docs-check.mjs`; `git diff --check` | Sin errores, HANDOFF de adopción histórica22/22, T-018 actual, T-001 draft dependiente |
| Gate de fuentes finales | `bash scripts/verify.sh --starter` con namespaces siguientes | FULL aplicación +tooling propios exit0, huellas idénticas, cleanup0 y CI del HEAD exacto |

Antes del gate, registrar checkpoint y comprobar ausencia de recursos:

```bash
export COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container
export COMPOSE_PROJECT_NAME="starter-verify-devnotes-t018-$(date +%s)-$$"
export STARTER_E2E_PROJECT="starter-e2e-devnotes-t018-$(date +%s)-$$"
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  for kind in container network volume; do
    if [ "$kind" = container ]; then ids=$(docker container ls -aq --filter "label=com.docker.compose.project=$project") || exit 2
    else ids=$(docker "$kind" ls -q --filter "label=com.docker.compose.project=$project") || exit 2; fi
    [ -z "$ids" ] || exit 2
  done
done
bash scripts/verify.sh --starter
```

Conservar exit original; cleanup sin prune, solo namespaces propios, y error de cleanup impide verde:

```bash
docker compose --env-file .env.example -p "$COMPOSE_PROJECT_NAME" --profile verify down --volumes --remove-orphans
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  docker container ls -aq --filter "label=com.docker.compose.project=$project"
  docker network ls -q --filter "label=com.docker.compose.project=$project"
  docker volume ls -q --filter "label=com.docker.compose.project=$project"
done
node scripts/docs-check.mjs
bash scripts/verify.sh --policy origin/main
```

Auditar namespaces internos del runner por labels exactos según logs. Ningún gate anterior acredita el cambio de tests/estado/base; no rebajar STARTER por ser un archivo de test. Quitar NODE_TEST_CONTEXT de cualquier runner hijo si se orquesta otra suite, exigir conteos/exit y no tomar stdout vacío como éxito.

## Checkpoint vigente

2026-10-21 Buenos Aires, frontera planner/Codex, GPT-6 expuesto, variante/esfuerzo efectivos no expuestos; PowerShell/Node24.21.0/Git/gh/web realmente usados. Lecturas/registro de contexto inicial en T-001; sin delegación, instalación, autenticación ni ejecución Junie. Git recibido limpio en main/origin/mainb52b1fd; PR2 MERGED, APROBADO independiente y CI exacta comprobados y conciliados. Preparación primero en rama local T-001 sin commits; al descubrir este bloqueo se cambia a codex/t-018-docs-fixture-independence desde la misma base y se retira solo aquella rama propia vacía. No hay código ni PR de T-018 aún.

**Rojo observado** tras conciliar adopción a22/22: `node --test --test-reporter=tap scripts/ci/docs-check.test.mjs`, exit1,35 tests,29 pass/6 fail,0 cancelled/skipped, duración12.7s. Fallan «a completed verdict cannot bypass pending criteria and tasks», «STATUS must report the actual handoff count» y H01 coherentes draft/blocked/in_review/mergeable. Primera pareja no crea desacuerdo cuando el checkout ya22/22; H01 modifica M0 y conserva HANDOFF completo, por eso el checker rechaza correctamente los cuatro supuestos positivos. La suite sí pasa el contrato real y los diez escenarios H02; no hay evidencia de fallo del predicado productivo.

`node scripts/docs-check.mjs` pasa con los contratos preparados y `git diff --check` pasa. Auditoría de planificación ejecutada:15 tareas I1,14 aristas secuenciales, versiones de specs concordantes y diff solo Markdown; T-016 entre T-006/T-007, I2 posterior separada. Resultados documentales finales se actualizan antes de publicar. Sin cambio en tests/checker ni gate STARTER ejecutado en esta sesión. Recursos Docker ninguno; suite crea/limpia su copia temporal ficticia mediante sus hooks. Siguiente acción concreta: corregir fixtures en sesión nueva frontera implementer y verificar gate propio, después revisión independiente; producto espera este MERGED, no otra aceptación E-01.

Verificación final de esta preparación: docs-check exit0,65 Markdown/19 tareas/HANDOFF22/22; diff-check exit0. Auditoría de contratos/versiones/miembros de specs/15 tareas I1/14 aristas y estados T-018 ready/T-001 draft/I2 draft, exit0. Rojo renovado sobre documentos finales:35 tests/29 pass/6 fail/0 cancelled/0 skipped, exit1,12.46s; mismos seis fallos. Logs saneados ignorados `.orchestrator/t018/planning-red.log` y `planning-red.exit=1`. Ningún script se modificó. Kit ausente/no rastreado e índice inicial vacío comprobados. Publicación de este avance es solo Markdown, gate documental válido; no hay PR ni CI/gate de corrección acreditados. El SHA del commit de preparación se obtiene de Git; clasificación por commits se comprueba tras commit.

Clasificación del avance publicado contra origin/mainb52b1fd: Git Bash host `bash scripts/verify.sh --policy origin/main`, exit0, policy=DOCS_ONLY/profile=DOCUMENTATION/changed=27, solo A/M100644 Markdown. El lanzamiento Bash genérico resolvía WSL denegado y MSYS tampoco podía arrancar dentro del sandbox; el mismo clasificador en Git Bash host autorizado pasó, sin cambiar fuentes, reglas ni lanzar Docker/FULL. El rojo de fixtures sigue siendo un bloqueo real y no un error de entorno.

## Correcciones significativas

| Hallazgo | Causa / salida | Estado |
|---|---|---|
| Seis regresiones al pasar adopción21→22/22 | Fixtures no poseen HANDOFF/conteo aunque poseen tablero; hacerlos deterministas conservando controles | Rojo comprobado35/29/6; corrección no implementada |

## Cierre y siguiente tarea

Esta sesión publica solo el contrato/preparación; no presenta «todo listo para Junie» ni CI verde. Sin PR separado hasta incorporar código y pasar gate. Implementer publica T-018 in_review; reviewer en sesión distinta verifica HEAD/base, gate/CI y puede mergear por AUTONOMY. Próxima [T-001](T-001-document-contract.md), draft por T-018, se habilita tras MERGED/conciliación en su rama nueva. HANDOFF22/22 conserva la adopción histórica de T-000/T-015, no acredita este mantenimiento ni implementación I1/I2.
