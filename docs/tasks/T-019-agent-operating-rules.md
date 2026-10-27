---
id: T-019
status: in_review
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
- Entrada Windows comprobada por Junie con Node existente y mismo verificador; salida conservada y ningún gate parcial anunciado como FULL.
- docs-check y diff-check correctos; PR entregado a revisión independiente antes de retomar T-020.

## Checkpoint vigente

2026-10-27, sesión implementer de corrección: Codex desktop (no superficie Junie), modelo GPT-6 expuesto; variante y esfuerzo no expuestos, aunque el dueño solicitó GPT-6.1 Terra. Herramientas efectivas: PowerShell, Git/gh, Node y Git Bash. Impacto documental en instrucciones y operación; sin cambios de API, permisos, datos o UI. `scripts/e2e.sh` ajeno se conserva sin staging; `plantilla/` no se toca.

PR6 OPEN, único PR abierto; `gh pr view 6 --repo MatiasNicolasAcevedo/devnotes --json number,url,state,isDraft,headRefName,headRefOid,baseRefName,baseRefOid,mergeable,statusCheckRollup` exit 0: HEAD `f497a3cce9f83a7e28103444018e850159ff8128`, base `main`, conflictos y checks no informados para ese HEAD. `git ls-remote` exit 0: main `9da4ab4f138bd28753e61d1538003acceb615691`, rama T-019 igual al HEAD de PR6. `gh pr view 7` y `gh pr view 19` con campos de merge exigidos, exit 0: MERGED, base main; PR7 `f87f0cf7c756d852da370d2a61fe40077033c09d`, 2026-10-24T19:04:10Z; PR19 `9da4ab4f138bd28753e61d1538003acceb615691`, 2026-10-25T22:37:44Z. T-014 se concilia con la evidencia ya registrada en la rama T-020. T-020 sigue bloqueada sin PR por PR6.

Sonda de PowerShell en Codex: el preflight Bash/Node/Docker dentro del sandbox no arrancó (exit `-1073741502`); fuera del sandbox, la misma invocación resolvió `/usr/bin/bash`, Node `v24.21.0`, Docker Compose `v2.40.2-desktop.1`, exit 0. No hay una sesión o terminal Junie expuesta en este entorno: no se puede ejecutar ni atribuir la sonda exigida a Junie. Alternativa necesaria: ejecutar el bloque de esta tarea en una sesión propia Junie y registrar salida/exit saneados; el reviewer debe evaluar esta limitación explícita. Ninguna de estas sondas acredita FULL.

Merge local `728124bcb97646ec6497adc5aeb66603afe6dee5`, padres T-019 `f497a3cce9f83a7e28103444018e850159ff8128` y main `9da4ab4f138bd28753e61d1538003acceb615691`. En Codex fuera del sandbox, `bash scripts/verify.sh --policy origin/main` exit 0: `DOCS_ONLY` / `DOCUMENTATION`, 12 archivos regulares Markdown; `node scripts/docs-check.mjs` exit 0 (67 Markdown, 20 tareas); `git diff --check origin/main...HEAD` exit 0. Gate documental sin FULL; el cambio ajeno sin commit en scripts/e2e.sh se excluye del diff y de la entrega. No se usaron stacks ni recursos Docker; cleanup de recursos no aplica, PATH se restaura en `finally`. Pendiente: publicación de este cierre, revisión independiente y sonda propia Junie o decisión del reviewer sobre el diagnóstico; no se afirma aceptación.

## Correcciones significativas

| Hallazgo / causa | Corrección | Prueba |
|---|---|---|
| Main avanzó y el merge conservaba dependencias obsoletas | Resolver STATUS y T-003, conciliar T-014 desde T-020 y actualizar BACKLOG; T-020 sigue bloqueada | Consultas remotas PR7/PR19; docs-check exit 0 |
| Entrada de SETUP omitía FULL y exit | Añadir invocación canónica con PATH temporal y captura de exit | Sonda preflight Codex exit 0 fuera del sandbox; policy DOCS_ONLY exit 0; FULL no ejecutado |
| Falta evidencia propia Windows Junie | Registrar diagnóstico de superficie y alternativa concreta | Preflight Codex no se atribuye a Junie; comprobación propia Junie pendiente |

## Revisión independiente anterior

2026-10-27, Codex reviewer, GPT-6 expuesto, esfuerzo no expuesto, PowerShell/Git/gh. HEAD `06be5364cd6059bf4f1d9e66e8f4dda5dd660036`, base `9da4ab4f138bd28753e61d1538003acceb615691`: tres hallazgos de continuidad/conflictos, evidencia Windows Junie y entrada FULL incompleta; PR6 no aprobada ni fusionada. docs-check exit 0, diff-check exit 0, policy `DOCS_ONLY`/`DOCUMENTATION`; preflight Codex fuera de sandbox exit 0. No acredita Junie ni FULL.
