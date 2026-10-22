---
id: T-018
status: in_review
priority: P1
size: S
executor: frontier
role: reviewer
milestone: M1
counts_for_cycle: false
spec: null
spec_version: null
branch: codex/t-018-docs-fixture-independence
pr: 3
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

2026-10-21 Buenos Aires, sesión nueva FRONTERA implementer solicitada por el dueño. Codex desktop/API, modelo GPT-6 expuesto; variante/esfuerzo efectivos no expuestos. PowerShell, Node24.21.0, Git/gh, Git Bash/Docker host autorizados realmente usados. Sin instalación, autenticación, delegación ni ejecución/capacidades Junie atribuidas. Impacto: fixtures y coordinación documental, sin cambios de comportamiento/API/permisos/datos/UI de aplicación.

Árbol recibido limpio en HEAD `45b181d97ae718e863331a1c055bc7770eadc4cc`; main/origin/main/merge-base `b52b1fde51194c62c0911f9f0462431508c22f77`. Fetch propio confirma base; ningún PR abierto. Se conserva el commit previo de27 Markdown de contratos/conciliación, sin recrear/resetear rama. T-000/T-015 MERGED/conciliadas, E-01 e histórico22/22 intactos. Kit ausente/no rastreado; runtime .orchestrator ignorado. No se hereda CI/gate de T-015.

Rojo renovado antes del arreglo: `node --test --test-reporter=tap scripts/ci/docs-check.test.mjs`, exit1,35 tests/29 pass/6 fail/0 cancelled/skipped,13.28s. Mismos seis fallos recibidos; log `.orchestrator/t018/implementer-red.log` y exit conservado. Arreglo limitado a scripts/ci/docs-check.test.mjs: arrangeBoard posee HANDOFF pendiente21/22 ficticio; completeHandoff actualiza contenido actual y STATUS a22/22; negativos crean desacuerdo y afirman mutación. Se conservan35 tests/todas las assertions/H02. Verde propio:35/35,14.84s; suite `node --test --test-reporter=tap "scripts/ci/*.test.mjs"` en host autorizado98/98,30.00s;0 fallos/cancelled/skipped. Logs implementer-docs-green.log e implementer-ci.log, exit0. `node .orchestrator/t018/context-21.mjs` usa copia ficticia de archivos versionados, sin Git/kit/secretos; quita NODE_TEST_CONTEXT del hijo, comprueba exit/conteos y limpia ruta propia resuelta: NO_LISTO21/22 también35/35,18.68s, context-21.log. Contexto real22/22 intacto. docs-check exit0 (65 Markdown/19 tareas/HANDOFF22/22), diff-check exit0.

**Preparación y trazabilidad del gate ejecutado:** fuentes técnicas cerradas en este árbol (HEAD anterior más único test modificado); base publicada b52b1fd. Manifiesto previo de236 archivos técnicos versionados no Markdown/LICENSE, SHA256 `41a9d849c34862d5b95d46efc768d3e6ff2f6249b30932fcb248b65cbe3de98d`, `.orchestrator/t018/sources-before.sha256` y fingerprint-before.json. Runner propio ignorado `.orchestrator/t018/run-gate.sh`, escrito antes de iniciar: Git Bash host `bash .orchestrator/t018/run-gate.sh` ejecuta `COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container bash scripts/verify.sh --starter`, sin modificar fuentes durante la corrida. Proyectos únicos `starter-verify-devnotes-t018-20261022-a91c7e` y `starter-e2e-devnotes-t018-20261022-a91c7e`; seis consultas previas por labels exactos container -a/network/volume exit0, sin recursos. Logs saneados propios gate.log/cleanup.log/gate.exit/gate-result.txt. Conserva exit original, hace compose down --volumes --remove-orphans solo del namespace verify propio, comprueba labels cero de ambos y compara las236 huellas después. Tooling/E2E poseen namespaces internos nuevos con cleanup; auditar sus nombres exactos desde logs al terminar, sin prune ni recursos ajenos. Error de cleanup impide verde.

Incidencia de registro: el checkpoint inicial con SHA/base/rojo estaba guardado en la tarea; el reemplazo ampliado previo al gate falló por sintaxis de comillas antes de escribir. Runner, huella y comprobaciones de ausencia sí se guardaron antes de las suites. El registro ampliado se persistió con el gate ya iniciado; no se presenta como checkpoint documental previo completo.

**Resultado STARTER propio:** `bash .orchestrator/t018/run-gate.sh` exit0, comando interno `bash scripts/verify.sh --starter`: docs3s/server231s/client43s/tooling1768s/E2E414s, todos exit0 (suma2459s). Backend91 unitarios/slices+75 IT PostgreSQL con JaCoCo; frontend133 tests+typecheck/lint/formato/cobertura/build; copia compilable también91+75/133 y207 fuentes inmutables idénticas. Tooling completo: sondas/inicializador/copia compilable/guardias/nginx/Vite/fallos-rollback/copia sin Git-kit/señales/proxies. Playwright real15/15 desktop/móvil; export final tests15/failures0/action-traces0. Canario negativo tests1/failures1 separado, saneador fail-closed pasa; no se confunde con suite de producto.

`gate-result.txt`: gate_exit=0 cleanup_exit=0 fingerprint_exit=0; fuentes-before/after y fingerprint-before/after.json coinciden236/236, manifiesto `41a9d849c34862d5b95d46efc768d3e6ff2f6249b30932fcb248b65cbe3de98d`. Sin edición del agente durante el gate; HMR del ensayo restaurado, confirmado por huellas. `node .orchestrator/t018/audit-resources.mjs` exit0: nueve namespaces exactos de logs,27 consultas container -a/network/volume exit0 y vacías; resources-final.json/log. Centinelas propios de lifecycle comprobados/limpiados por sus traps exitosos. Cleanup solo propio, sin prune. Conector GitHub consultado devuelve404 para DevNotes; alternativa gh host autorizada confirma PR1/PR2 MERGED con SHA/fecha históricos. Base sigue b52b1fd. docs-check/diff-check posteriores exit0. Código publicado en `f79f6554a0db5e91003fd382886154114d4b391d`; único [PR3](https://github.com/MatiasNicolasAcevedo/devnotes/pull/3) contra main, adjunto al chat. Política propia sobre commits publicados: FULL/profile STARTER,28 rutas,27 Markdown y un test técnico. Este cierre cambia solo tarea/STATUS a in_review/rol reviewer; mismas fuentes/base conservan gate según TESTING. Próximo paso: publicar cierre, comprobar docs-check/dirigidos/huellas/policy/CI verify-required del HEAD final y PR ready. El SHA final/CI se obtiene de Git/PR, sin commit para autorreferenciarlo. Revisión independiente pendiente, cero rondas de T-018 consumidas; sin veredicto del autor ni merge.

## Correcciones significativas

Validación del cierre solo Markdown: docs-check exit0 (65 Markdown/19 tareas/HANDOFF22/22), diff-check exit0; `node --test --test-reporter=tap scripts/ci/docs-check.test.mjs` exit0,35/35,0 fail/cancelled/skipped,13.98s (`docs-final.log/.exit`). `node .orchestrator/t018/fingerprint.mjs final` confirma236/236 y el mismo manifiesto/base. CI de código f79f655: [verify-required SUCCESS](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/39708657618/job/119594515826); el cierre cambia HEAD y exige comprobar su propia CI antes de entregar. SHA final y enlace de CI vigente se consultan en PR3/Git, sin commit para autorreferenciarlos. Siguiente responsable: FRONTERA reviewer en sesión nueva con el único prompt de STATUS; fuentes no cambian después del gate, sin revisión propia ni inicio de T-001.

| Hallazgo | Causa / salida | Estado |
|---|---|---|
| Seis regresiones al pasar adopción21→22/22 | arrangeBoard posee HANDOFF/veredicto/criterios/conteo; completeHandoff usa contenido actual; negativos afirman desacuerdo creado | Rojo propio35/29/6; verde35/35 en22/22 y21/22 ficticio; suite98/98; STARTER propio exit0 |

## Cierre y siguiente tarea

Corrección y gate propios publicados en [PR3](https://github.com/MatiasNicolasAcevedo/devnotes/pull/3) contra main; in_review, pendiente revisión independiente sobre HEAD/base exactos y CI propia final verde antes de la entrega. El primer commit de preparación Markdown se conserva en ese PR. Implementer deja in_review; FRONTERA reviewer en sesión nueva verifica HEAD/base publicados, diff completo, gate/CI y puede mergear solo por AUTONOMY. Autor no aprueba ni mergea. Próxima [T-001](T-001-document-contract.md), draft por T-018, se habilita únicamente tras MERGED comprobado: sesión nueva Junie crea codex/t-001-document-contract desde main actualizado y concilia T-018 done en su primer avance, sin editar rama mergeada. Quince contratos I1 de BACKLOG, S-101/S-104 v2 y T-016 entre T-006/T-007 se conservan; S-105/T-017 voz I2 sigue posterior draft. HANDOFF22/22/E-01 conserva adopción histórica T-000/T-015, sin aceptar mantenimiento/producto/voz por herencia.
