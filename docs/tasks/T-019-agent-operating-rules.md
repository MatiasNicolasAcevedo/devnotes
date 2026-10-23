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

Aplicar las tres observaciones del dueño antes de T-003: prompt de continuación obligatorio, entrada de verificación reproducible desde PowerShell y confirmación explícita de hechos en GitHub. Mantenimiento previo autorizado por el dueño el 2026-10-22; no cuenta como tarea de producto I1. Después de revisión independiente y MERGED, retomar T-003 en sesión nueva.

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

## Pasos y pruebas

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

4. Publicar un PR con los cambios y evidencia. Cerrar en in_review y entregar el prompt reviewer completo en STATUS y respuesta final. Sin aprobar/mergear trabajo propio ni implementar T-003 aquí. Después del MERGED confirmado, el prompt de T-003 exige verificar PR de T-019 y PR5, conciliar T-019 done en su nueva rama, habilitar T-003 y ejecutar solo ese contrato.

## Aceptación

- Las tres observaciones tienen reglas operativas explícitas en documentos leídos por los roles, sin copiar la bitácora en cada guía.
- Respuesta final y STATUS entregan el mismo prompt ejecutable antes del merge; el cierre de merge respeta la conciliación en rama nueva.
- Publicación/MERGED se basan en respuestas de GitHub, con tratamiento explícito de errores y estados negativos.
- Entrada Windows comprobada por Junie con Node existente y mismo verificador; salida conservada y ningún gate parcial anunciado como FULL.
- docs-check y diff-check correctos; PR entregado a revisión independiente antes de continuar T-003.

## Checkpoint vigente

Implementer Junie, sesión 2026-10-23. PR6 publicado en codex/t-019-agent-operating-rules, SHA 54edcc1 contra main 89cbb87. docs-check OK, diff-check OK. Las tres reglas incorporadas y enlazadas desde AGENTS.md. T-002 conciliada done tras confirmación remota de PR5 MERGED (89cbb87). Pendiente: revisión independiente y merge. Impacto: instrucciones de agentes y operación de pruebas; sin API/permisos/datos/UI de aplicación.
