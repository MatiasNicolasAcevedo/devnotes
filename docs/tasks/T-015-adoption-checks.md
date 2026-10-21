---
id: T-015
status: ready
priority: P1
size: S
executor: frontier
role: implementer
milestone: M0
counts_for_cycle: false
spec: null
spec_version: null
branch: codex/t-015-adoption-checks
pr: null
depends_on: [T-000]
---
# T-015 · Traslado acotado de controles de adopción

## Objetivo

DevNotes puede conciliar su adopción y comenzar T-001 con tareas I1 todavía draft, sin falsos fallos de CI por el estado del tablero. Portar los dos controles pertinentes del starter T-006/PR7; conservar contexto, permisos, identidad, aceptación E-01 y evidencia propia válida. Siguiente tarea: [T-001](T-001-document-contract.md), solo después de MERGED/conciliación de T-015 en una sesión nueva Junie implementer. No implementar producto aquí.

## Alcance y decisiones resueltas

Fuente concreta: [starter PR7](https://github.com/MatiasNicolasAcevedo/starter-spring-react/pull/7), squash `8d2fafecb0cfbd617998a41388c0855c676b3848`, HEAD aprobado `2ac376721ab273da26ec943f3eb22d73f809aac0`, base `acbc2c355e535069edb122f6ae544eaceea57fbc`. MERGED comprobado2026-10-21T23:18:44Z (20:18:44 Buenos Aires); árbol del squash idéntico al aprobado. Se consultaron diff17 rutas, veredicto independiente/CI y cierre. Sus pruebas acreditan el starter, no DevNotes.

**Dos archivos de código:** `scripts/docs-check.mjs` y `scripts/ci/docs-check.test.mjs`. Ambos coinciden en DevNotes con la versión del starter anterior al arreglo, comprobado por contenido normalizado LF; el port selectivo tiene trazabilidad sin sobrescribir adaptaciones de producto.

- H01: fixture dueña de tablero/STATUS/tareas, independiente del estado vivo. Conservar positivo de coherencia y negativo de desacuerdo real para draft/blocked/in_review/mergeable/done. No cambiar estados reales para satisfacer pruebas.
- H02: `STARTER_VALIDADO` exige22/22 criterios con evidencia propia, al menos una tarea M0 y todas las M0 done. M1 draft no lo invalida. Rechazar criterio pendiente, alcance M0 vacío y cualquier M0 abierta, incluidos ready/blocked/mergeable. T-015 es M0; mientras esté abierta HANDOFF conserva NO_LISTO. No cambiar estados para anticipar veredicto o merge.
- Guías concretas: README y SETUP enlazan evidencia canónica vigente en TOOLS/T-000, en lugar de repetir «cinco MCP» o comprobación pendiente ya resuelta. TOOLS conserva íntegramente sondas/fechas/orígenes/superficie y aceptación; solo precisar introducción/definición de expuesto/listado si aún resultan contradictorias. ORCHESTRATION recibe la definición M0 de cierre, sin duplicar su tabla de entrega/aceptación/APROBADO/MERGED ya vigente.
- HANDOFF conserva evidencia propia de T-000, concilia el hecho MERGED y distingue el mantenimiento T-015 pendiente. G-03 no se anticipa para el PR nuevo. STARTER_VALIDADO22/22 solo tras confirmar y conciliar el cierre de todas las M0; no acepta CA-01…06 ni exige implementar producto futuro.

No portar cambios del inicializador, su manifiesto, tests de inicialización ni tareas/STATUS/AUTONOMY del starter. Su manifiesto retira una T-006 de mantenimiento; en DevNotes T-006 es producto y se preserva. No reaplicar init-project, no copiar configuración/instalación Junie ni permisos/aceptación/resultados entre repositorios. No tocar aplicación Java/React, dependencias, locks, auth, migraciones, CI, clasificadores, protección o kit. Las aclaraciones de traspaso ya presentes se conservan; no se reabre T-000 ni se pide otra aceptación E-01.

Impacto: checker y sus regresiones, documentación/coordinación propia. Sin cambios de comportamiento/API/permisos/datos/UI de aplicación. Esta tarea M0 no cuenta para las cinco tareas de producto I1.

## Leer antes

Entrada común AGENTS/STATUS/PROJECT_CONTEXT/protocolo implementer. Referencias concretas:
1. [Checker](../../scripts/docs-check.mjs) y [regresiones](../../scripts/ci/docs-check.test.mjs).
2. [PR7 fuente](https://github.com/MatiasNicolasAcevedo/starter-spring-react/pull/7), solo alcance descrito y SHA fijados.
3. [TESTING](../TESTING.md), perfil STARTER y conservación de evidencia.
4. [ORCHESTRATION](../ORCHESTRATION.md), cierre/traspaso; [HANDOFF](../HANDOFF.md) y [TOOLS](../../.junie/TOOLS.md), evidencia canónica.
5. [T-000](T-000-adoption.md), conciliación de MERGED y evidencia aceptada; [T-001](T-001-document-contract.md), dependencia/siguiente, sin implementar.

## Archivos y pasos

1. En sesión nueva FRONTERA implementer, continuar esta rama/único PR draft y comprobar árbol/HEAD/base/PR/CI. T-000 ya conciliada tras MERGED. Registrar actor/modelo/herramienta/esfuerzo reales y pasar T-015 a in_progress. Conservar cambios ajenos.
2. Revisar y aplicar únicamente los dos parches identificados del commit fuente; usar las regresiones rojas locales verificables y renovar rojo si cambiaron sus fuentes. Ajustar guías contradictorias dentro de lo definido; no sustituir TOOLS ni contratos I1 por los del starter.
3. Ejecutar dirigidos/negativos y cerrar fuentes con gate STARTER propio. Checkpoint previo de SHA/base/huellas/comandos/logs/recursos propios/cleanup, sin editar fuentes durante el gate. Evidencia de T-000 o del starter no demuestra los scripts nuevos ni la nueva base.
4. Publicar este mismo PR listo para revisión, tarea in_review y único prompt de sesión nueva FRONTERA reviewer en STATUS. Reviewer puede aprobar/mergear elegiblemente conforme AUTONOMY, sin revisar implementación propia. Antes del APROBADO, dejar prompt final de sesión nueva Junie T-001 con precondición MERGED/conciliación de T-015 y evidencia E-01 conservada; después no commitear. No implementar T-001 en ninguna sesión que cierre T-015.

Rutas de producto/coordinación: tarea T-015, T-000 solo conciliación, T-001 solo dependencia/retoma, STATUS/BACKLOG/ROADMAP para la inserción del mantenimiento; HANDOFF por criterios afectados. Código previsto exactamente los dos scripts indicados. README/SETUP/TOOLS/ORCHESTRATION solo aclaraciones descritas.

## Aceptación y pruebas

| Criterio | Capa y comando | Resultado esperado |
|---|---|---|
| H01 sin dependencia del estado vivo | Node, `node --test scripts/ci/docs-check.test.mjs` | Positivos coherentes y negativos reales, incluidos blocked y done;35 tests del port, sin eliminar los20 existentes |
| H02 separa M0 de producto | Misma suite Node; fixtures sin Git/kit |22/22+M0 completa+M1 draft pasa; M0 vacía/abierta o criterio pendiente falla |
| No regresiones de contratos/gate/selección | `node --test "scripts/ci/*.test.mjs"` | Todas pasan, sin debilitar cobertura/assertions/retries/deadlines |
| Documentos/cola propios coherentes | `node scripts/docs-check.mjs`; `git diff --check` | T-000 done, T-015 actual, T-001 draft dependiente; sin enlaces/estados falsos |
| Fuentes finales verificadas | `bash scripts/verify.sh --starter` con entorno debajo | FULL propio +tooling exit0, huella idéntica y cleanup exacto; CI liviana no sustituye gate |

Dirigidos desde raíz con Git Bash y Node>=24. Son tests de herramientas; no necesitan instalar dependencias ni stacks. En Windows usar host autorizado si sandbox rechaza procesos/enlaces, conservando el comando/tests. Si un ensayo Node lanza otro test runner, quitar NODE_TEST_CONTEXT del entorno del hijo y exigir conteos/exit reales; stdout vacío no acredita rojo/verde. No alterar entornos de suites para ocultar fallos.

Antes del gate, publicar checkpoint en esta tarea y comprobar que los dos namespaces únicos no tienen recursos. Desde raíz Git Bash:

```bash
export COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container
export COMPOSE_PROJECT_NAME="starter-verify-devnotes-t015-$(date +%s)-$$"
export STARTER_E2E_PROJECT="starter-e2e-devnotes-t015-$(date +%s)-$$"
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  for kind in container network volume; do
    if [ "$kind" = container ]; then ids=$(docker container ls -aq --filter "label=com.docker.compose.project=$project") || exit 2
    else ids=$(docker "$kind" ls -q --filter "label=com.docker.compose.project=$project") || exit 2; fi
    [ -z "$ids" ] || exit 2
  done
done
bash scripts/verify.sh --starter
gate_exit=$?
docker compose --env-file .env.example -p "$COMPOSE_PROJECT_NAME" --profile verify down --volumes --remove-orphans
cleanup_exit=$?
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  docker container ls -aq --filter "label=com.docker.compose.project=$project"
  docker network ls -q --filter "label=com.docker.compose.project=$project"
  docker volume ls -q --filter "label=com.docker.compose.project=$project"
done
printf 'gate_exit=%s cleanup_exit=%s\n' "$gate_exit" "$cleanup_exit"
[ "$gate_exit" -eq 0 ] && [ "$cleanup_exit" -eq 0 ]
```

Conservar logs y huellas antes/después, exit original y resultado de cada consulta/labels; salidas de recursos deben estar vacías. E2E/tooling limpian sus namespaces internos; comprobar sus logs y labels exactos, nunca prune ni recursos ajenos. Si falla consulta o cleanup no anunciar verde. Perfil STARTER por scripts; no rebajarlo a DOCS_ONLY por llamarse mantenimiento documental. Tras commit final, `bash scripts/verify.sh --policy origin/main` y diff sin commit; clasificador no incluye pendientes sin commit. Cierre solo Markdown conserva el gate de esta tarea si fuentes/base coinciden, con docs-check/afectados/CI del HEAD nuevo.

## Checkpoint vigente · preparación y fuente comprobadas

2026-10-21, sesión FRONTERA planner solicitada por el dueño para preparar el traslado. Codex desktop/API, GPT-6 expuesto, variante/esfuerzo efectivos no expuestos; PowerShell/Node/Git/gh y conector GitHub para starter. Sin delegación ni ejecución de Junie. Leídos AGENTS, STATUS, PROJECT_CONTEXT, AUTONOMY, protocolos planner/implementer/reviewer/merger, TESTING/ORCHESTRATION/HANDOFF/TOOLS, contratos T-000/T-001 y fuente pertinente T-006 del starter. Impacto propio: contrato/cola/conciliación documental, sin implementación de los scripts ni producto.

Inicio limpio en main local/remoto `cbbe1c9075a41edf2ceffd35eedf1e05dedd6870`, sin PR abierto de DevNotes. PR1 MERGED2026-10-21T18:37:39Z, mismo SHA. APROBADO de HEAD34ee897/basefa52e54 y confirmación consultados; T-000 se concilia done en esta nueva rama. Starter PR7 MERGED/SHA/fecha/HEAD/base confirmados arriba; no se modifica ese repo. Conector GitHub permite leer starter; Git/gh en host autorizado para red/lectura del hermano que el sandbox rechaza, sin instalar/autenticar ni ampliar permisos.

Evidencia propia ignorada en `.orchestrator/t015/`: `source-comparison.json` identifica ambos scripts actuales idénticos a fuente previa y conserva SHA256 de contenido upstream; `upstream-checker.patch` y `upstream/` son apoyo local del diff fijado, no configuración ni aceptación heredadas. Revalidar contra commit fuente, no contra checkout mutable del hermano. Fuentes/checkpoints de la adopción anterior se conservan con su SHA/base original; no se vuelven a acreditar sobre este nuevo mantenimiento.

Sondas propias de planificación en copia ficticia de la base DevNotes, sin Git/kit/.env real: `node .orchestrator/t015/planning-probes.mjs` exit0 de auditoría (afirma los fallos esperados). Baseline y blocked coherente docs-check exit0; H01 original ejecutado realmente:1 test/1 fallo esperado; suite H02 del port contra checker viejo:10 tests/2 fallos esperados (producto futuro y M0 vacía). Con ambos scripts fuente solo en la copia:35/35 verdes. Logs `h01-red.log`, `h02-red.log`, `upstream-fixture-compatibility.log`, resumen `planning-probes.json`. Esto demuestra compatibilidad inicial en fixture, no aplicación del port ni gate de DevNotes. Se retiró NODE_TEST_CONTEXT del hijo y se verificaron conteos; no se cuenta el protocolo vacío como éxito.

Pendiente: sesión nueva FRONTERA implementer en esta misma rama/PR, aplicar port y guías, dirigidos y gate STARTER propio; luego reviewer independiente y merge elegible. T-001 continúa draft. La preparación publica únicamente Markdown y pasa docs-check/afectados; no exige ni acredita STARTER de fuentes aún sin implementar. SHA/CI de su publicación se comprueban antes de entregar el prompt.

Controles de esta preparación: `node scripts/docs-check.mjs` exit0 (61 Markdown/16 tareas/HANDOFF21/22), `git diff --check` exit0; `node --test scripts/ci/docs-check.test.mjs` exit0,20/20 pass,0 fail/cancelled/skipped. Ningún script de producción/test, dependencia o inventario de herramientas modificado; no se crearon recursos Docker. Perfil de publicación solo Markdown se comprueba tras commit; ese perfil corresponde a la preparación, no al port pendiente que exige STARTER. Logs ignorados de sondas conservados; CI exacta de publicación antes de entregar.

## Correcciones significativas

| Problema / causa | Decisión / arreglo preparado | Prueba |
|---|---|---|
| H01: negativo presupone estado vivo distinto de blocked | Port selectivo de fixture dueña del tablero, sin cambiar estados reales | Rojo propio1/1; compatibilidad de fuente en copia35/35 |
| H02: cierre exige terminar producto futuro y acepta M0 vacía | Predicado22/22+M0 no vacía/completa con negativos | Rojo propio2/10; fuente corregida35/35 solo en fixture |
| Manifiesto upstream retira T-006 del starter; aquí es producto | Excluir inicializador/manifiesto y preservar contratos I1 | Diff17 rutas contrastado con dos scripts pertinentes |

## Cierre y siguiente tarea

Contrato ready y un único PR draft de T-015; esta sesión planner no implementa, aprueba ni mergea. La próxima sesión implementer continúa la misma tarea/PR. Después, reviewer en sesión nueva verifica HEAD/base/gate/CI, publica transición favorable y prepara STATUS para Junie T-001 condicionado a MERGED/conciliación. Solo con APROBADO exacto y CI verde puede squash mergear en esa sesión; confirmar SHA/fecha y comentar cierre sin commits posteriores. El primer avance de la rama nueva de T-001 concilia T-015 done/G-03/HANDOFF y cola con evidencia propia; la primera tarea de producto sigue siendo T-001, sin nueva planificación ni otra aceptación E-01.
