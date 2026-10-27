---
id: T-019
status: done
priority: P1
size: S
executor: junie
role: implementer
milestone: M1
counts_for_cycle: false
spec: null
branch: codex/t-019-agent-operating-rules
pr: 6
depends_on: [T-002]
---
# T-019 · Continuidad, verificación Windows y hechos remotos

## Objetivo

Aplicar las tres observaciones del dueño antes de T-003: prompt de continuación obligatorio, entrada de verificación reproducible desde PowerShell y confirmación explícita de hechos en GitHub. Mantenimiento previo autorizado por el dueño el 2026-10-22; no cuenta como tarea de producto I1. La prioridad original era previa a T-003; esa tarea y T-014 ya fueron mergeadas. Tras MERGED confirmado de PR6, retomar T-020 en sesión nueva según su checkpoint publicado.

## Alcance y decisiones resueltas

Cambios de documentación en AGENTS, ORCHESTRATION, protocolos implementer/reviewer/merger/planner cuando corresponda, SETUP y TESTING. Preservar OBSERVATIONS como evidencia de origen, distinguiendo propuestas de reglas ya incorporadas. No modificar código de aplicación, scripts, dependencias, locks, workflows, permisos ni protecciones. No operar el Starter desde esta tarea.

1. Cada cierre de sesión, incluidos bloqueos, actualiza el único prompt de STATUS y lo reproduce completo y copiable en la respuesta final: próximo rol/tarea, precondición remota, acción y salida. Si el prompt recibido ya se ejecutó, reconsultar y sustituirlo por el paso vigente. Tras merge no hacer commits en la rama mergeada: entregar el prompt actualizado en el chat y conciliar STATUS en el primer avance de la siguiente rama autorizada.
2. Confirmar publicación y merge mediante `gh pr view <numero-real> --repo MatiasNicolasAcevedo/devnotes --json number,url,state,mergedAt,mergeCommit,headRefOid,baseRefName`. Exigir consulta exitosa y PR/repositorio/base correctos; para MERGED exigir además estado MERGED, fecha y SHA no vacíos. Registrar comando/exit/JSON mínimo y SHA completo en la tarea. Consultar al adoptar dependencias, después de solicitar merge y antes de comunicarlo o habilitar la siguiente. Fallo de consulta significa no verificado; OPEN/CLOSED sin merge/inexistente no satisfacen dependencias. Ni main local, CI, aprobación ni exit 0 de merge lo sustituyen. Una PR abierta no autoriza merge propio.
3. Usar el verificador canónico desde PowerShell con la ruta explícita de Git Bash y el Node instalado. Probar en la superficie Junie la resolución de Bash/Node/Docker y `--policy origin/main`; documentar un comando de entrada completo y cómo conservar su exit. Si falta PATH, pasar al proceso hijo el directorio del Node que PowerShell resuelve, sin configuración global ni instalación. No reemplazar el gate por seis pasos manuales ni por `run-e2e.mjs` aislado; conservar readiness, señales, aislamiento, saneado y cleanup del script original. Si la superficie impide esa ejecución, registrar el error exacto saneado y la alternativa necesaria; no declarar un genérico «falta Git Bash con Node».

## Leer antes

1. [OBSERVATIONS](../OBSERVATIONS.md), las tres observaciones y evidencias.
2. [ORCHESTRATION](../ORCHESTRATION.md), continuidad y entrega.
3. [SETUP](../SETUP.md), entrada PowerShell y trampas Windows.
4. [TESTING](../TESTING.md), perfiles y conservación de evidencia.
5. [AUTONOMY](../AUTONOMY.md), hechos remotos, roles y permisos.

AGENTS, STATUS y protocolo implementer son la entrada común. Leer las guías a editar; no recorrer el resto de docs.

## Pasos y pruebas originales

Los pasos sobre T-003 describen la preparación histórica; la continuidad vigente está en el checkpoint.

1. Preservar cambios locales de esta preparación. Comprobar PR5/T-002 remotamente y ausencia de otro PR en vuelo. Crear la rama exacta desde main publicado; llevar los cambios documentales preparados, sin reescribir ni force-pushear la rama de T-003. El HEAD local inicial `3bd31db` contiene solo conciliación de T-002/STATUS/T-003 sobre main; si main publicado aún no contiene T-002 done, conciliarla también en el primer avance de T-019 con la evidencia remota. No perder ese cierre ni arrastrar implementación de T-003. Conservar temporalmente los cambios por rutas explícitas si Git impide cambiar de rama con el árbol modificado; nunca descartar el trabajo preparado.
2. Incorporar las tres reglas de forma canónica, con enlaces desde los protocolos y comandos sin rutas personales. Documentar salidas ante PR abierta, cerrada sin merge, inexistente o consulta fallida; no simular que esas situaciones se comprobaron en GitHub.
3. Probar desde PowerShell, en la raíz, la entrada existente (adaptar solo la ruta de Bash si la instalación real difiere):

```powershell
$taskBash = Join-Path $env:ProgramFiles 'Git\bin\bash.exe'
$taskNodeDirectory = Split-Path (Get-Command node -CommandType Application -ErrorAction Stop).Source
$taskOriginalPath = $env:PATH
try {
  $env:PATH = "$taskNodeDirectory;$taskOriginalPath"
  & $taskBash -c 'set -e; command -v bash; command -v node; node -e "process.exit(parseInt(process.versions.node)>=24?0:1)"; node --version; command -v docker; docker compose version'
  if ($LASTEXITCODE -ne 0) { throw 'Preflight Bash/Node/Docker falló; conservar diagnóstico saneado' }
  & $taskBash scripts/verify.sh --policy origin/main
  $taskPolicyExit = $LASTEXITCODE
} finally { $env:PATH = $taskOriginalPath }
if ($taskPolicyExit -ne 0) { throw "Clasificación falló: $taskPolicyExit" }
node scripts/docs-check.mjs
git diff --check
```

La sonda no inicia stacks ni acredita FULL. En esta preparación frontera comprobó Git Bash/Node 24.21.0/Docker Compose y policy DOCS_ONLY en su propia superficie, no en Junie. La tarea solo toca Markdown permitido: gate DOCUMENTATION/DOCS_ONLY con docs-check y diff-check; conservar evidencia técnica anterior si sus fuentes/base coinciden. Si hacen falta cambios de scripts, checkpoint con diagnóstico y propuesta para ampliar el contrato y gate STARTER; no degradar el gate.

4. Publicar un PR con los cambios y evidencia. Cerrar en in_review y entregar el prompt reviewer completo en STATUS y respuesta final. Sin aprobar/mergear trabajo propio ni iniciar otra implementación aquí. Tras MERGED confirmado, retomar T-020 en sesión nueva, conciliar T-019 y comprobar su propio checkpoint antes de abrir su PR.

## Aceptación

- Las tres observaciones tienen reglas operativas explícitas en documentos leídos por los roles, sin copiar la bitácora en cada guía.
- Respuesta final y STATUS entregan el mismo prompt ejecutable antes del merge; el cierre de merge respeta la conciliación en rama nueva.
- Publicación/MERGED se basan en respuestas de GitHub, con tratamiento explícito de errores y estados negativos.
- Entrada Windows comprobada con Node existente y mismo verificador; salida conservada y ningún gate parcial anunciado como FULL. Excepción puntual autorizada por el dueño el 2026-10-27: esta sonda puede ejecutarse en Codex; su evidencia no acredita la superficie Junie.
- docs-check y diff-check correctos; PR entregado a revisión independiente antes de retomar T-020.

## Checkpoint vigente

2026-10-27, implementer de sonda y transición documental: Codex desktop, GPT-6 expuesto; variante y esfuerzo no expuestos (el dueño solicitó GPT-6.1 Terra). PowerShell, Git, gh, Node y Git Bash. Impacto documental en instrucciones y operación; sin cambios de comportamiento de aplicación, API, permisos, datos ni UI. El dueño autorizó expresamente una excepción puntual a la procedencia Junie para ejecutar esta sonda en Codex; no autoriza una revisión adicional ni atribuye la evidencia a Junie.

`git ls-remote origin refs/heads/main refs/heads/codex/t-019-agent-operating-rules` exit 0: main `9da4ab4f138bd28753e61d1538003acceb615691`, rama `bd8cff5c07eed99142a4b99743cc8504acb656a6`; `origin/main` local coincide y es ancestro de HEAD (exit 0). `gh pr view 6 --repo MatiasNicolasAcevedo/devnotes --json number,url,state,isDraft,headRefName,headRefOid,baseRefName,baseRefOid,mergeable,reviewDecision,statusCheckRollup` exit 0: [PR6](https://github.com/MatiasNicolasAcevedo/devnotes/pull/6) OPEN, no draft, MERGEABLE, HEAD y base iguales a esos SHA, sin reviewDecision; `verify-required` SUCCESS para ese HEAD ([run](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/40447580481/job/122002408839)). La consulta inicial dentro del sandbox falló: Git `getaddrinfo() thread failed to start`, gh `error connecting to api.github.com`; la consulta anterior exitosa se realizó fuera del sandbox.

Bloque PowerShell de la tarea, en Codex: dentro del sandbox el preflight no arrancó, exit `-1073741502`, seguido de `Preflight Bash/Node/Docker falló; conservar diagnóstico saneado`; no alcanzó policy. Alternativa ejecutada: el mismo bloque fuera del sandbox, con PATH temporal y Node existente; preflight exit 0, `/usr/bin/bash`, `/c/Program Files/nodejs/node`, `v24.21.0`, `/c/Program Files/Docker/Docker/resources/bin/docker`, `Docker Compose version v2.40.2-desktop.1`. `scripts/verify.sh --policy origin/main` exit 0: `policy=DOCS_ONLY`, `changed=12`, `profile=DOCUMENTATION`; `node scripts/docs-check.mjs` exit 0 (67 Markdown, 20 tareas, HANDOFF 22/22); `git diff --check` exit 0. La clasificación corresponde al HEAD previo y excluye cambios sin commit; los cambios documentales de esta transición se verifican antes de publicar. PATH restaurado en `finally`; no se inició ningún stack ni hubo recursos que limpiar. Esta evidencia es de Codex, no de Junie, y no acredita FULL.

Pendiente: publicar esta transición documental y confirmar HEAD/CI remotos. Las dos rondas de revisión están agotadas: el dueño debe decidir si autoriza una revisión independiente adicional de PR6 sobre el HEAD/base publicados; sin esa autorización no se programa. Esa revisión, si se autoriza, debe verificar el cierre y emitir un veredicto elegible; después solo un merger elegible puede proceder con todos los criterios vigentes y confirmar MERGED. La excepción de procedencia no sustituye ese veredicto. PR6 no se aprueba ni mergea en esta sesión; T-020 sigue bloqueada sin PR hasta MERGED confirmado. `scripts/e2e.sh` ajeno y `plantilla/` se preservan.

## Correcciones significativas

| Hallazgo / causa | Corrección | Prueba |
|---|---|---|
| Main avanzó y el merge conservaba dependencias obsoletas | Resolver STATUS y T-003, conciliar T-014 desde T-020 y actualizar BACKLOG; T-020 sigue bloqueada | Consultas remotas PR7/PR19; docs-check exit 0 |
| Entrada de SETUP omitía FULL y exit | Añadir invocación canónica con PATH temporal y captura de exit | Sonda preflight Codex exit 0 fuera del sandbox; policy DOCS_ONLY exit 0; FULL no ejecutado |
| Procedencia Windows exigía Junie | Dueño autorizó excepción puntual y Codex ejecutó el bloque con Node existente | Preflight y policy exit 0 fuera del sandbox; evidencia Codex, no Junie ni FULL |

## Revisión independiente anterior

2026-10-27, Codex reviewer, GPT-6 expuesto, esfuerzo no expuesto, PowerShell/Git/gh. HEAD `06be5364cd6059bf4f1d9e66e8f4dda5dd660036`, base `9da4ab4f138bd28753e61d1538003acceb615691`: tres hallazgos de continuidad/conflictos, evidencia Windows Junie y entrada FULL incompleta; PR6 no aprobada ni fusionada. docs-check exit 0, diff-check exit 0, policy `DOCS_ONLY`/`DOCUMENTATION`; preflight Codex fuera de sandbox exit 0. No acredita Junie ni FULL.


## Segunda revisión independiente · 2026-10-27

Codex desktop, reviewer independiente, modelo GPT-6 expuesto; variante y esfuerzo no expuestos. PowerShell, Git, gh, Node y Git Bash; revisión del commit publicado en checkout aislado. Impacto de esta transición: documentación operativa; sin cambios de API, permisos, datos ni UI.

**CAMBIOS REQUERIDOS — criterio Windows Junie pendiente.** Revisado HEAD `fa221939c8dafae19c720e0121d4406985283b91` sobre base `9da4ab4f138bd28753e61d1538003acceb615691`. PR6 OPEN, mergeable, única PR abierta; `verify-required` SUCCESS en ese HEAD ([run](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/40447291608/job/122001485292)). `git ls-remote` confirmó ambos SHA; main es ancestro de HEAD. En checkout aislado, `bash scripts/verify.sh --policy 9da4ab4f138bd28753e61d1538003acceb615691` exit 0, DOCS_ONLY/DOCUMENTATION, 12 Markdown; `node scripts/docs-check.mjs` exit 0 (67 Markdown, 20 tareas); `git diff --check 9da4ab4f138bd28753e61d1538003acceb615691...HEAD` exit 0. No se ejecutó FULL ni se le atribuye la sonda de Codex a Junie.

De los tres hallazgos anteriores, la integración incorpora main y actualiza la continuidad de T-003/T-014 y el bloqueo de T-020; SETUP añade la invocación FULL y captura su exit. El diagnóstico de Codex registra su error y alternativa, pero no muestra error ni salida en una sesión propia Junie: la aceptación exige específicamente que Junie compruebe Bash/Node/Docker y el mismo verificador `--policy origin/main`. Condición observable: sesión propia Junie ejecuta el bloque de la tarea y publica salida y exits saneados; si esa superficie lo impide, registra su error exacto y alternativa, y devuelve al dueño la decisión sobre el criterio, sin afirmar cumplimiento.

Esta es la segunda ronda de revisión. Según AGENTS/AUTONOMY no se programa otra ronda automáticamente: el dueño debe autorizar expresamente cualquier revisión adicional necesaria tras la evidencia. La solicitud de esta sesión prevé una sonda propia Junie; el dueño puede abrir esa sesión para registrar el resultado en T-019 y decidir después la revisión independiente de cierre sobre HEAD/base publicados. Si falla o exige ampliar scripts/permisos, volver al dueño con diagnóstico, sin cambiar el contrato ni degradar el gate. PR6 sigue sin aprobación ni merge; T-020 sigue bloqueada sin PR.


## Tercera revisión independiente · 2026-10-27 (autorizada por el dueño)

Junie reviewer, Qwen3.6-27B-FP8 expuesto; variante y esfuerzo no expuestos. PowerShell, Git, gh, Node y Git Bash; revisión del commit publicado en checkout aislado (`git worktree add`). Impacto de esta transición: documentación operativa; sin cambios de API, permisos, datos ni UI.

**APROBADO — sin bloqueantes.** Revisado HEAD `2d72ccab28ced19640dff8234bb0b2e40f5f2b4d` sobre base `9da4ab4f138bd28753e61d1538003acceb615691`. PR6 OPEN, no draft, MERGEABLE, única PR abierta; `verify-required` SUCCESS en ese HEAD ([run](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/40506603096/job/122197378604)). `git ls-remote origin` confirmó ambos SHA remotos; main es ancestro de HEAD (exit 0). En checkout aislado, `scripts/verify.sh --policy 9da4ab4f138bd28753e61d1538003acceb615691` exit 0, DOCS_ONLY/DOCUMENTATION, 12 Markdown; `node scripts/docs-check.mjs` exit 0 (67 Markdown, 20 tareas, HANDOFF 22/22); `git diff --check 9da4ab4f138bd28753e61d1538003acceb615691...HEAD` exit 0.

Criterios de aceptación verificados uno a uno:
1. **Tres observaciones con reglas operativas explícitas** — ✓. OBSERVATIONS.md conserva las evidencias de origen. AGENTS.md enlaza las reglas canónicas. ORCHESTRATION.md añade prompt de continuación y confirmación MERGED vía `gh pr view`. implementer.md steps 7–8 documentan cierre de sesión y comprobación MERGED con campos obligatorios y estados negativos. merger.md step 4 exige `gh pr view` con `state == MERGED`, `mergedAt` y `mergeCommit.oid`. SETUP.md añade el verificador PowerShell canónico (policy y FULL) con PATH temporal y captura de exit. TESTING.md referencia el verificador canónico.
2. **Prompt ejecutable en STATUS antes del merge** — ✓. STATUS.md actualizado con prompt de continuación copiable; la conciliación post-merge se delega a rama nueva.
3. **Publicación/MERGED basados en respuestas de GitHub** — ✓. implementer.md step 8 y merger.md step 4 exigen `gh pr view` con campos específicos; se documentan salidas ante OPEN, CLOSED sin merge, inexistente, campos incompletos y error de red. ORCHESTRATION.md refuerza la regla.
4. **Entrada Windows con excepción Codex autorizada** — ✓. SETUP.md documenta el bloque PowerShell canónico completo (preflight + policy + docs-check + diff-check) y el bloque FULL. La aceptación 4 autoriza expresamente la excepción Codex: "esta sonda puede ejecutarse en Codex; su evidencia no acredita la superficie Junie". El checkpoint de T-019 registra la evidencia Codex (preflight exit 0, policy DOCS_ONLY exit 0) y declara explícitamente que no acredita Junie ni FULL. SETUP.md instruye: "Si la superficie impide esa ejecución, registrar el error exacto saneado y la alternativa necesaria".
5. **docs-check y diff-check correctos** — ✓. docs-check exit 0, diff-check exit 0.

El bloqueante de la segunda revisión (evidence Windows Junie) se resuelve por la excepción explícita del dueño en la aceptación 4, autorizada el 2026-10-27. La regla canónica en SETUP.md documenta el comando completo y el procedimiento de fallback; la evidencia Codex está registrada sin atribuirse a Junie. Ningún criterio de aceptación queda pendiente.

PR6 aprobado para merge squash; T-020 permanece bloqueada hasta confirmar MERGED. `scripts/e2e.sh` ajeno y `plantilla/` preservados.
