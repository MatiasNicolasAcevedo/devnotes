---
id: T-015
status: in_review
priority: P1
size: S
executor: frontier
role: reviewer
milestone: M0
counts_for_cycle: false
spec: null
spec_version: null
branch: codex/t-015-adoption-checks
pr: 2
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

## Checkpoint vigente · implementación publicada para revisión

2026-10-21, sesión nueva FRONTERA implementer pedida por el dueño. Codex desktop/API, GPT-6 expuesto; variante/esfuerzo efectivos no expuestos. PowerShell, Node24.21.0, Git/gh, Git Bash y Docker host autorizados; conector GitHub consultado para starter, 404 para DevNotes y alternativa gh autorizada. Sin instalación, autenticación, delegación ni ejecución Junie. Leídos AGENTS/STATUS/PROJECT_CONTEXT, esta tarea/protocolo implementer, AUTONOMY y referencias concretas de código, TESTING/ORCHESTRATION/HANDOFF/TOOLS y T-000/T-001. Impacto: checker, regresiones y aclaraciones documentales; sin aplicación/API/permisos/auth/datos/UI/dependencias.

Recibido árbol limpio en HEAD local/remoto `805a80540478b51923fa362a3b879cf6cb671f0d`, base main publicada `cbbe1c9075a41edf2ceffd35eedf1e05dedd6870`. PR2 OPEN/draft contra main, verify-required SUCCESS run39694421081. PR1 MERGED18:37:39Z/squashcbbe1c9 y conciliada; E-01 no se reabre. Starter PR7 reconsultado MERGED23:18:44Z, squash `8d2fafecb0cfbd617998a41388c0855c676b3848`, HEAD aprobado2ac3767/baseacbc2c3. Se releyeron objetos Git de esos SHA: ambos scripts fuente idénticos al HEAD aprobado y versión local previa idéntica a base fuente (source-comparison.json). Solo esos dos scripts portados; inicializador/manifiesto y T-006 de producto intactos.

Rojo renovado sobre fuentes actuales antes del port: `node .orchestrator/t015/planning-probes.mjs` exit0 de auditoría; baseline/coherente blocked exit0; H01 real1 test/1 fallo esperado/exit1 y H02 real10 tests/2 fallos esperados/exit1. Fixture propia sin Git/kit/.env real, NODE_TEST_CONTEXT retirado del hijo, conteos/exit afirmados. Logs h01-red.log/h02-red.log/planning-probes.json. Compatibilidad en fixture35/35 no se toma como gate. Tras port: `node --test scripts/ci/docs-check.test.mjs` exit0,35/35; `node --test "scripts/ci/*.test.mjs"` exit0,98/98, sin fallos/cancelled/skipped; logs docs-check-green.log/ci-local.log. `node scripts/docs-check.mjs` exit0,61 Markdown/16 tareas/HANDOFF21/22; `git diff --check` exit0.

**Checkpoint previo a operación larga:** fuentes técnicas cerradas en el árbol sobre HEAD805a805/basecbbe1c9, diff sin commit limitado a dos scripts y Markdown del contrato. `node .orchestrator/t015/fingerprint.mjs before` exit0:237 archivos versionados no Markdown, manifiesto SHA256 `8332922279d570ee83af9e19af02abbec0cef844d1231cbdd9628f3afd4c0c76`; technical-before.json/fingerprint-before.log ignorados. No editar fuentes durante el gate. Comando ejecutable desde raíz: Git Bash `bash .orchestrator/t015/run-gate.sh`, que ejecuta exactamente `COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container bash scripts/verify.sh --starter` con dos namespaces únicos starter-verify-devnotes-t015-época-pid y starter-e2e-devnotes-t015-época-pid. Registrar nombres exactos en gate-projects.txt, comprobar labels container-a/network/volume vacíos antes (resources-before.log); abortar ante error/recursos existentes. Logs saneados starter.log/starter.exit y gate-result.log bajo .orchestrator/t015, con exit original preservado.

Cleanup: Compose down --volumes --remove-orphans solo del proyecto verify propio con --env-file .env.example; runner E2E/tooling limpia sus namespaces internos. resources-after.log audita los dos namespaces exactos; al terminar auditar también nombres internos extraídos de logs, sin prune ni recursos ajenos. Huellas después deben coincidir en technical-after.json; cleanup/consultas/huellas fallidas impiden verde. Código publicado en PR2 en `b95a9b03b0d37b08f65f58af92c65b4463e5a9ae`; cierre posterior solo Markdown, con huellas/base conservadas, docs-check y regresiones afectadas. Siguiente responsable: sesión nueva FRONTERA reviewer sobre HEAD/base finales publicados; CI exacta y árbol limpio se comprueban antes de entregar. STATUS contiene su único prompt. Esta entrega no emite APROBADO ni realiza merge. Ningún gate de T-000/starter acredita este port.

**Resultado STARTER propio:** `bash .orchestrator/t015/run-gate.sh` exit0; comando interno `bash scripts/verify.sh --starter`. Docs3s, server229s, client45s, tooling1768s y E2E417s, todos exit0 (suma de etapas2462s). Backend91 unitarios/slices+75 IT PostgreSQL; client133 tests+tipos/lint/formato/cobertura/build; copia personalizada también91+75/133 y203 fuentes inmutables idénticas. Tooling: guards, copia compilable288s, nginx297s/Vite301s, fallos567s, copia sin Git123s, señales26s y proxies136s. Playwright real15/15 desktop/móvil; export final tests15/failures0/action-traces0. El canario negativo intencional tests1/failures1 está separado y no es fallo del gate.

gate-result.log acredita gate_exit=0 cleanup_exit=0 audit_exit=0 fingerprint_exit=0. Las237 huellas antes/después son idénticas, manifiesto8332922279d570ee83af9e19af02abbec0cef844d1231cbdd9628f3afd4c0c76. Namespaces principales exactos: `starter-verify-devnotes-t015-1792626141-1616` y `starter-e2e-devnotes-t015-1792626141-1616`, vacíos antes/después; `node .orchestrator/t015/audit-resources.mjs` exit0 audita nueve namespaces extraídos de logs con27 consultas exit0 y cero recursos (resources-final.json/log). Los centinelas propios de lifecycle son verificados/limpiados por sus traps con exit0, sin recursos ajenos. Logs starter.log/starter.exit=0/cleanup.log, gate-projects.txt y manifests en .orchestrator/t015 ignorado. No se modificaron fuentes durante la corrida; los ensayos que alteran temporalmente HMR restauraron el contenido, confirmado por huellas. Basecbbe1c9 intacta; ninguna evidencia heredada se usa como gate del port.

Preparación anterior conservada: planner dejó contrato/cola/conciliación y sondas propias; sus fuentes previas y resultados1/1 rojo,2/10 rojo,35/35 compatibilidad siguen trazados en esta evidencia renovada. No acreditaban port ni gate. WIP1; T-001 sigue draft dependiente de MERGED/conciliación de T-015. Sin rondas de revisión T-015 consumidas.

## Correcciones significativas

| Problema / causa | Decisión / arreglo | Prueba |
|---|---|---|
| H01: negativo presupone estado vivo distinto de blocked | Port de fixture dueña del tablero, sin cambiar estados reales | Rojo renovado1/1; verde35/35, CI local98/98 y STARTER propio exit0 |
| H02: cierre exige terminar producto futuro y acepta M0 vacía | Predicado22/22+M0 no vacía/completa con negativos | Rojo renovado2/10; verde35/35 y STARTER propio exit0 |
| Manifiesto upstream retira T-006 del starter; aquí es producto | Excluir inicializador/manifiesto y preservar contratos I1 | Diff17 rutas contrastado con dos scripts pertinentes; solo esos dos scripts modificados |
| README/SETUP repetían inventario y comprobación Junie pendiente ya aceptada | Referenciar TOOLS/T-000 y precisar expuesto/listado, conservando filas/sondas/fechas y E-01 | Diff documental; docs-check/35 regresiones; ninguna configuración o sonda Junie reemplazada |

## Cierre y siguiente tarea

Implementación/corrección publicada en el mismo [PR #2](https://github.com/MatiasNicolasAcevedo/devnotes/pull/2) contra main; tarea `in_review`. Código b95a9b0, gate STARTER propio exit0 y evidencia arriba. El cierre documental conserva fuentes/base y exige docs-check/afectados/CI del HEAD final; SHA remoto y enlace de CI se entregan al cerrar sin otro commit solo para autorreferenciarlo. Esta sesión implementer no aprueba ni mergea; no implementa T-001.

Próxima acción única: sesión nueva FRONTERA reviewer según STATUS; revisar diff publicado completo, H01/H02/negativos, documentación e inventario aceptado, huellas/base/gate/cleanup y CI verify-required del HEAD exacto. Si es favorable, publicar transición documental y preparar antes de APROBADO el prompt final Junie T-001 con precondición MERGED/conciliación de T-015; comprobar CI del nuevo HEAD y emitir veredicto ligado a HEAD/base. Puede squash mergear elegiblemente en esa sesión según AUTONOMY, sin --admin ni commits después de aprobar, y confirmar SHA/fecha MERGED. Máximo dos rondas y tres correcciones distintas por bloqueo; sin autorización para ampliar esos límites.

Solo después de MERGED confirmado, una sesión nueva Junie implementer T-001 (rama codex/t-001-document-contract desde main actualizado) concilia T-015 done/G-03/HANDOFF y cola en su primer avance útil, conserva E-01 aceptado y comprueba STARTER_VALIDADO22/22 con todas las M0 done. T-001 sigue draft hasta esa comprobación; T-000/PR1 no se reabre. Ningún CA-01…06 queda aceptado por este mantenimiento.
