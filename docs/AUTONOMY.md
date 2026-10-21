# Autonomía del producto

Decisión propia del dueño, **2026-10-20**, respuesta «Apruebo la política propuesta» en la sesión de T-000. No proviene de la plantilla ni del adjunto de producto.

## Repositorio y operaciones

`MatiasNicolasAcevedo/devnotes`, privado, MIT, titular Matias Nicolas Acevedo, base `main`. Remoto `https://github.com/MatiasNicolasAcevedo/devnotes.git`. Sin cambios de visibilidad/licencia/plan/settings/protecciones autorizados. Rama T-000 existente: `chore/t-000-adoption`; siguientes ramas exactas en tareas, prefijo `codex/`.

Frontera y Junie pueden leer Git/PR/CI, crear ramas, editar dentro del contrato, hacer staging explícito, commits, push normal y abrir/actualizar **un PR por tarea** en este repo. Pueden ejecutar pruebas y stacks Docker propios con datos ficticios y cleanup por labels exactos. Sin push directo a main, force push, bypass, `--admin`, cambios de protecciones ni recursos ajenos. Kit `plantilla/` nunca se versiona, publica, exporta ni borra.

## Ejecutores y continuidad

- Frontera define producto, arquitectura, contratos y adopción M0. Modelo/herramienta/esfuerzo solo según lo realmente expuesto, sin inventar versión.
- Junie implementa tareas I1 predefinidas. Otra **sesión nueva** de Junie revisa y puede hacer merge elegible; la sesión autora no revisa ni mergea su trabajo. Excepción inicial confirmada expresamente por el dueño en esta sesión: **la primera revisión de T-000 será de frontera en sesión nueva**, con la misma política de merge elegible y sin aprobar su implementación propia. Capacidades Junie sin comprobar continúan pendientes, no se acreditan por esa revisión.
- `POR_SESION`: el dueño abre cada sesión con el único prompt de STATUS. Sin dispatcher, instalación, autenticación, delegación o lanzamiento automático de otro agente. Cada tarea y revisión usa sesión nueva; correcciones vuelven al implementer en otra sesión.
- Una tarea/PR en vuelo; máximo cinco ready. Draft solo por dependencia se habilita al comprobar MERGED y conciliar la anterior. No comenzar otra implementación en la sesión que cierra la anterior.
- Junie controla avance tras cinco y diez tareas I1 mergeadas. Frontera vuelve al MVP completo (T-014 mergeada y CA-01…06), intención nueva o decisión/bloqueo fuera de contrato.
- Máximo dos rondas de revisión y tres correcciones distintas por bloqueo; después checkpoint al dueño/frontera. Herramienta no expuesta: alternativa local autorizada si demuestra lo mismo; si es indispensable, bloquear sin instalar/autenticar.

## Revisión y merge

`AUTOMATICO_ELEGIBLE`: sesión revisora independiente, nunca autora. Exige PR contra main, diff conforme, HEAD/base publicados, veredicto `APROBADO` ligado a ambos SHA, docs-check, CI `verify-required` success del HEAD vigente, gate local válido para mismas fuentes/base y conversaciones bloqueantes resueltas. Ausente/pending/cancelled/skipped no son verde. FULL remoto manual no se requiere por rutina ni está autorizado lanzarlo automáticamente.

Squash ligado al SHA revisado; borrar solo la rama de tarea mergeada. Confirmar `MERGED`, merge SHA y fecha antes de habilitar la siguiente. Cambiar HEAD/base invalida aprobación. Reviewer publica transición documental, espera CI del nuevo HEAD y después comenta veredicto; no commitea tras aprobar. El siguiente implementer concilia done en su rama nueva. Detalle: [reviewer](agents/reviewer.md), [merger](agents/merger.md) y [TESTING](TESTING.md).

## Configuración efectiva y límites

Consulta propia de frontera 2026-10-20 con gh: privado/MIT/main, permiso push y squash habilitados, sin PR abiertos. Consultar rulesets y protección de main devuelve **HTTP 403**, mensaje de GitHub que exige Pro o repo público para esa función. No hay protección del servidor acreditada ni settings modificados. Las condiciones anteriores son controles obligatorios de agentes; no se anuncian como enforcement de GitHub. Un actor con escritura podría eludirlos; protección futura requiere decisión específica del dueño. La política permite continuar con comprobación explícita, sin reglas heredadas.

El gh y Docker/Git Bash de frontera se comprueban en T-000; no acreditan MCP, shell o permisos Junie. Su siguiente sesión registra modelo/herramienta/esfuerzo expuestos, `/mcp`, `/skills` y sondas saneadas en TOOLS/T-000. No necesita instalar todo el catálogo para comenzar.

## Reservado al dueño

Despliegue/producción, datos reales, Google real, pagos/costos, nuevos permisos, configuración GitHub y herramientas globales requieren decisión específica. Google pendiente externo permite desarrollo local ficticio; no significa Google validado. Nunca leer/imprimir `.env` real, tokens, cookies, claims completos ni datos personales. [ORCHESTRATION](ORCHESTRATION.md) completa la continuidad.
