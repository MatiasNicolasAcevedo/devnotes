# Autonomía del producto

Decisión propia del dueño, **2026-10-20**, respuesta «Apruebo la política propuesta» en la sesión de T-000. No proviene de la plantilla ni del adjunto de producto.

## Repositorio y operaciones

`MatiasNicolasAcevedo/devnotes`, privado, MIT, titular Matias Nicolas Acevedo, base `main`. Remoto `https://github.com/MatiasNicolasAcevedo/devnotes.git`. Sin cambios de visibilidad/licencia/plan/settings/protecciones autorizados. Rama T-000 existente: `chore/t-000-adoption`; siguientes ramas exactas en tareas, prefijo `codex/`.

Frontera y Junie pueden leer Git/PR/CI, crear ramas, editar dentro del contrato, hacer staging explícito, commits, push normal y abrir/actualizar **un PR por tarea** en este repo, o un PR por spec cuando el dueño lo decide (hoy solo [S-107](specs/S-107-xlsx-portability.md#tareas-y-dependencias)). Pueden ejecutar pruebas y stacks Docker propios con datos ficticios y cleanup por labels exactos. Sin push directo a main, force push, bypass, `--admin`, cambios de protecciones ni recursos ajenos. Kit `plantilla/` nunca se versiona, publica, exporta ni borra.

## Ejecutores y continuidad

### Excepción documental I5 del 2026-11-12

El dueño autorizó expresamente [T-052](tasks/T-052-scope-expansion-plan.md), rama `codex/t-052-scope-expansion-plan` y un PR de planificación contra main aunque PR54 de T-051 siga abierto. Esta excepción prevalece sobre WIP1 y sobre la regla de no abrir un PR separado de planificación, solo para la coexistencia de **PR54 + PR documental T-052**. No habilita dos implementaciones, ramas compartidas futuras ni revisar/mergear trabajo propio. Los estados de las tareas son los de cada rama: T-051 conserva en esta base el contrato draft de main; su ejecución actual sigue en PR54 y debe conciliarse antes de implementar I5. No modificar el validador para esta excepción.

El dueño difirió FULL/STARTER hasta pedirlos expresamente durante esta serie; rige [TESTING](TESTING.md#excepción-i5-del-2026-11-12). Conservar CI liviana, pruebas dirigidas y revisión independiente. Crear contratos no autoriza deploys, planes pagos, herramientas globales ni recursos externos.

### Política general

- Frontera define producto, arquitectura, contratos y adopción M0. Modelo/herramienta/esfuerzo solo según lo realmente expuesto, sin inventar versión.
- Junie implementa tareas predefinidas de las iteraciones acordadas. La planificación I2 solicitada por el dueño el 2026-10-31 concreta T-017 y T-027…T-037 en S-105 v2, con la misma política operativa; no habilita activación externa, pagos ni audio personal. Otra **sesión nueva** de Junie revisa y puede hacer merge elegible; la sesión autora no revisa ni mergea su trabajo. Excepción inicial confirmada expresamente por el dueño en la sesión de adopción: **la primera revisión de T-000 será de frontera en sesión nueva**, con la misma política de merge elegible y sin aprobar su implementación propia. Capacidades Junie sin comprobar continúan pendientes, no se acreditan por esa revisión.
- `POR_SESION`: el dueño abre cada sesión con el único prompt de STATUS. Sin dispatcher, instalación, autenticación, delegación o lanzamiento automático de otro agente. Cada tarea y revisión usa sesión nueva; correcciones vuelven al implementer en otra sesión.
- Una tarea/PR en vuelo; máximo cinco ready. Draft solo por dependencia se habilita al comprobar MERGED y conciliar la anterior; dentro de la rama compartida de S-107, al cerrar la anterior en la rama. No comenzar otra implementación en la sesión que cierra la anterior.
- Junie controla avance cada cinco tareas de producto mergeadas; en S-107 hay un único control sobre sus seis tareas, antes de la revisión del PR único ([regla](specs/S-107-xlsx-portability.md#tareas-y-dependencias)). I1 conservó T-005/T-009/T-014 (5/10/15); S-106 cumplió su control de cinco. En I2 los controles son tras T-030/T-035 (5/10) y frontera vuelve al objetivo M2-RC1/T-037, nueva intención o decisión/bloqueo fuera del contrato. El proveedor real conserva la habilitación específica de VOICE-RELEASE; no hay permisos operativos nuevos por planificarlo.
- Máximo dos rondas de revisión y tres correcciones distintas por bloqueo; después checkpoint al dueño/frontera. Herramienta no expuesta: alternativa local autorizada si demuestra lo mismo; si es indispensable, bloquear sin instalar/autenticar.

## Revisión y merge

`AUTOMATICO_ELEGIBLE`: sesión revisora independiente, nunca autora. Exige PR contra main, diff conforme, HEAD/base publicados, veredicto `APROBADO` ligado a ambos SHA, docs-check, CI `verify-required` success del HEAD vigente, gate local válido para mismas fuentes/base y conversaciones bloqueantes resueltas. Ausente/pending/cancelled/skipped no son verde. FULL remoto manual no se requiere por rutina ni está autorizado lanzarlo automáticamente.

Para el requisito de gate local en la secuencia hasta T-044 inclusive, el dueño autorizó el [cierre temporal definido en TESTING](TESTING.md#aplazamiento-de-full-hasta-t-044). El FULL integrado se ejecuta sobre el HEAD final del PR único de S-107, antes de su revisión.

Squash ligado al SHA revisado; borrar solo la rama de tarea mergeada. Confirmar `MERGED`, merge SHA y fecha antes de habilitar la siguiente. Cambiar HEAD/base invalida aprobación. Reviewer publica transición documental, espera CI del nuevo HEAD y después comenta veredicto; no commitea tras aprobar. El siguiente implementer concilia done en su rama nueva. Detalle: [reviewer](agents/reviewer.md), [merger](agents/merger.md) y [TESTING](TESTING.md).

## Configuración efectiva y límites

Consulta propia de frontera 2026-10-20 con gh: privado/MIT/main, permiso push y squash habilitados, sin PR abiertos. Consultar rulesets y protección de main devuelve **HTTP 403**, mensaje de GitHub que exige Pro o repo público para esa función. No hay protección del servidor acreditada ni settings modificados. Las condiciones anteriores son controles obligatorios de agentes; no se anuncian como enforcement de GitHub. Un actor con escritura podría eludirlos; protección futura requiere decisión específica del dueño. La política permite continuar con comprobación explícita, sin reglas heredadas.

El gh y Docker/Git Bash de frontera se comprueban en T-000; no acreditan MCP, shell o permisos Junie. Su siguiente sesión registra modelo/herramienta/esfuerzo expuestos, `/mcp`, `/skills` y sondas saneadas en TOOLS/T-000. No necesita instalar todo el catálogo para comenzar.

## Reservado al dueño

Despliegue/producción, datos reales, Google real, pagos/costos, nuevos permisos, configuración GitHub y herramientas globales requieren decisión específica. Google pendiente externo permite desarrollo local ficticio; no significa Google validado. Nunca leer/imprimir `.env` real, tokens, cookies, claims completos ni datos personales. [ORCHESTRATION](ORCHESTRATION.md) completa la continuidad.
