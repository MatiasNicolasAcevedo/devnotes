# Orquestación y estados

Estados, campos y hechos verificables. El proceso diario (roles, modos, gates y prompt de cierre) está en [WORKFLOW](WORKFLOW.md). **No hay dispatcher instalado:** la continuidad es `POR_SESION` y el dueño abre cada sesión pegando el prompt de [STATUS.md](STATUS.md#prompt-de-la-siguiente-sesión). Este documento fija los valores que validan las tareas y docs-check; no presume un modelo/superficie Junie heredado.

## Estados de tarea
| Estado | Significado | Próximo rol |
|---|---|---|
| `draft` | Falta refinar contrato o dependencias | planner |
| `ready` | Contrato completo, dependencias cumplidas, puede tomarse | implementer |
| `in_progress` | Misma tarea, rama y PR activos | implementer |
| `in_review` | Implementación publicada; revisión pendiente | reviewer |
| `changes_requested` | Hallazgos concretos; conserva rama y PR | implementer |
| `mergeable` | Veredicto vigente y checks verdes; merge pendiente | la misma sesión reviewer; merger solo si hay que retomarlo |
| `done` | GitHub confirma MERGED y el cierre documental está reconciliado | siguiente tarea predefinida / frontera al objetivo |
| `blocked` | Falta dato, permiso, dependencia o solución tras intentos acotados | rol indicado por el bloqueo |

- **En vuelo:** `in_progress`, `in_review`, `changes_requested`, `mergeable`, o `blocked` con `pr` asignado. Máximo una tarea en vuelo (WIP 1 tarea / 1 PR de tarea). En el PR único de S-107, la tarea portadora T-040 lleva ese estado y el número de PR.
- `blocked` sin PR describe una tarea que espera una dependencia; no está en vuelo.
- Máximo cinco tareas `ready`. `done` nunca se usa para un PR abierto o simplemente cerrado.

El cierre de adopción `STARTER_VALIDADO` exige 22/22 criterios con evidencia propia, al menos una tarea de alcance `M0` y todas las M0 `done`, con MERGED confirmado y conciliado. Las tareas de producto futuro M1 pueden seguir `draft`: tienen su propio objetivo y aceptación. Ninguna M0 abierta permite ese veredicto, aunque pasen sus pruebas; mientras T-015 siga abierta, HANDOFF conserva `NO_LISTO`.

## Campos de frontmatter validados
| Campo | Valores |
|---|---|
| `id` | `T-NNN` único; coincide con el nombre del archivo `docs/tasks/T-NNN-slug.md` |
| `status` | uno de los estados anteriores |
| `executor` | `frontier` o `junie`; checkpoint registra herramienta/modelo/esfuerzo realmente expuestos en esa sesión, sin inferirlos del starter. M0 tiene executor frontier; su revisión independiente puede ser Junie por AUTONOMY |
| `role` | `planner`, `implementer`, `reviewer`, `merger` |
| `depends_on` | lista de IDs existentes, sin ciclos |
| `product_cycle` | Opcional, solo si ayuda a agrupar un objetivo; no bloquea una tarea pequeña ready |
| `counts_for_cycle` | Opcional/legado, booleano si existe; nunca true en M0. No requiere otro contador diario |
| `pr` | `null` o número de PR real |

## Responsabilidad de cada documento

| Documento | Función y cuándo cambia |
|---|---|
| PROJECT_CONTEXT | Problema, MVP, reglas/permisos y aceptación del dueño; cambia con intención de producto |
| STATUS | Enlace a tarea actual, estado resumido, registro de gates diferidos y único prompt; cambia al cambiar acción/rol/bloqueo. Corto y sin historial |
| WORKFLOW | Proceso diario; cambia solo con una decisión del dueño sobre cómo se trabaja |
| Tarea | Estado canónico, decisiones, archivos/comandos, checkpoint y evidencia; progreso ordinario aquí |
| BACKLOG | Orden y dependencia de la siguiente tarea; índice sin estados repetidos. Tablas históricas con estado, si existen, deben concordar |
| HANDOFF | Aceptación/traspaso; cambia al aportar evidencia o invalidar un criterio, no con cada fix |
| ROADMAP | Objetivos e hitos; se revisa en la revisión de lote, al cumplir un hito o ante un cambio relevante |

La cadencia se consulta en tareas mergeadas; no exige mantener contadores duplicados. Las tareas autosuficientes pueden usar spec null. PROJECT es un índice del contexto, sin otro brief que mantener. Las tareas de mantenimiento no se copian al producto.

## Continuidad mínima vigente
Frontera deja ROADMAP por versiones/iteraciones, specs agrupadas por capacidad/épica y sus tareas pequeñas con decisiones resueltas. Puede haber muchas tareas definidas, aunque solo cinco ready y una en vuelo. Una tarea draft puede estar completa y esperar únicamente la dependencia indicada; Junie la habilita al comprobarla sin pedir otro planner. Si falta una decisión de verdad, no la trata como ready.

Secuencia diaria: implementer → reviewer en sesión distinta, que aprueba y mergea → implementer de la siguiente tarea predefinida. El dueño copia el único prompt vigente y abre la sesión del rol y nivel indicados. En modo `LOTES_JUNIE` no hay alternancia con frontera dentro del lote: el regreso ocurre en la revisión de lote (unas diez tareas), o antes por una decisión o bloqueo que exceda el contrato.

El tablero agrupa En curso, Siguientes y Hechas, o una cola equivalente que identifique la actual y la siguiente con su dependencia, enlazando contratos. El inicializador entrega la cola mínima de T-000; al empezar producto se organiza la iteración propia. Los estados exactos se marcan en las tareas y STATUS refleja solo la actual. Pasar una entrada a Hechas exige MERGED comprobado y reconciliación, nunca solo tests verdes. La sesión revisora confirma el merge en el PR; el siguiente implementer concilia done en su nueva rama sin editar la ya mergeada. El prompt de continuación indica cuál sigue y esa comprobación inicial.

Checkpoint vigente para retoma; tabla breve por tarea para correcciones significativas; evidencia y PR/Git para trabajo anterior. No convertir el tablero en diario ni crear copias de cada estado. Esto deja trazabilidad sin una bitácora de cada edición.

STATUS contiene un único prompt ejecutable; la tarea guarda evidencia y siguiente experimento. Un bloqueo incluye causa concreta y salida propuesta; si falta autorización, preguntar la decisión necesaria en vez de repetir el prompt condicionado. Una decisión nueva se registra y sustituye la precondición anterior.

## Prompt obligatorio al cierre

Plantilla del prompt y tabla de qué prompt corresponde a cada cierre: [WORKFLOW](WORKFLOW.md#cierre-de-sesión-el-prompt-siguiente). Cada cierre de sesión —incluidos bloqueos— actualiza el único prompt de STATUS y lo reproduce completo y copiable en la respuesta final: próximo rol/tarea, precondición remota, acción y salida. Si el prompt recibido ya se ejecutó, reconsultar el estado y sustituirlo por el paso vigente. Tras merge no hacer commits en la rama mergeada: entregar el prompt actualizado en el chat y conciliar STATUS en el primer avance de la siguiente rama autorizada.

## Confirmación de hechos en GitHub

Confirmar publicación y merge mediante `gh pr view <número> --repo MatiasNicolasAcevedo/devnotes --json number,url,state,mergedAt,mergeCommit,headRefOid,baseRefName`. Exigir consulta exitosa, PR/repositorio/base correctos, `state == MERGED`, `mergedAt` no nulo y `mergeCommit.oid` no vacío. Conservar comando, resultado mínimo, enlace y SHA completo en la evidencia de la tarea. Si GitHub devuelve OPEN, CLOSED sin merge, PR inexistente, campos incompletos o error de red/autenticación, no anunciar MERGED ni dar por satisfecha la dependencia. Informar el estado real o «merge no verificado» y la siguiente acción concreta. No usar como sustituto `git merge`, rebase/cherry-pick, contenido presente en main local, fetch/pull, CI verde, aprobación, solicitud de auto-merge ni exit 0 de `gh pr merge`.

## Entrega, aceptación y aprobación del PR

Cada cierre de sesión distingue estas evidencias y nombra su emisor:

| Evidencia | Quién la emite | Qué acredita |
|---|---|---|
| Implementación o corrección publicada | implementer | Cambios entregados y pruebas ejecutadas; resultado «listo para revisión» cuando corresponde |
| Gate local y CI verde | comandos y checks del SHA indicado | Verificación técnica en su alcance; no es un veredicto de revisión |
| Aceptación de una decisión o criterio | dueño | La decisión o criterio concreto aceptado, registrado en la tarea; no sustituye la revisión independiente del PR |
| `APROBADO` del PR | reviewer en sesión independiente | Veredicto canónico publicado en el PR con HEAD/base exactos; habilita merge si se cumplen las demás condiciones de AUTONOMY |
| `MERGED` | GitHub, comprobado por merger | Merge confirmado con SHA/fecha; permite conciliación por la siguiente tarea |

El implementer no presenta su entrega como `APROBADO` del PR. Si un resumen o chat usa «aprobado», comprobar emisor, alcance, enlace y SHA antes de atribuirle ese efecto. El estado `mergeable` requiere el veredicto y los checks vigentes; CI verde o aceptación del dueño por sí solas no lo acreditan.

Cada traspaso deja en la tarea el resultado, el pendiente exacto, el próximo responsable y la condición de salida; STATUS ofrece una sola acción ejecutable. Evitar «volver al dueño» o «falta aprobación» sin nombrar la decisión o el veredicto que falta y quién debe emitirlo. El reviewer define la salida observable de cada hallazgo para que el implementer pueda corregirlo sin reinterpretar la aceptación. Tras una corrección ordinaria, continuar con revisión independiente dentro de las rondas permitidas, sin paso rutinario por planner.

Al agotar las rondas, el checkpoint al dueño debe proponer una salida completa: corrección necesaria, evidencia que se conservará, quién verificará su cierre y cómo se llegará a aprobación/merge. Si esa salida exige otra revisión, pedir su autorización explícita antes de programarla. La aceptación del criterio por el dueño cierra ese pendiente y no se vuelve a pedir; cualquier condición de merge restante se identifica por separado. Estos límites no crean aprobaciones, rondas o permisos automáticos.

Dispatcher, adaptador de resultados JSON, locks y automatizaciones de sesiones quedan fuera del cierre del starter. Reconsiderar esa infraestructura solo con una tarea futura y necesidad observada.
