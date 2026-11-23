# Autonomía del producto

Decisión propia del dueño, **2026-10-20**, respuesta «Apruebo la política propuesta» en la sesión de T-000. No proviene de la plantilla ni del adjunto de producto.

## Repositorio y operaciones

`MatiasNicolasAcevedo/devnotes`, privado, MIT, titular Matias Nicolas Acevedo, base `main`. Remoto `https://github.com/MatiasNicolasAcevedo/devnotes.git`. Sin cambios de visibilidad/licencia/plan/settings/protecciones autorizados. Rama T-000 existente: `chore/t-000-adoption`; siguientes ramas exactas en tareas, prefijo `codex/`.

Frontera y Junie pueden leer Git/PR/CI, crear ramas, editar dentro del contrato, hacer staging explícito, commits, push normal y abrir/actualizar **un PR por tarea** en este repo, o un PR por spec cuando el dueño lo decide. Pueden ejecutar pruebas y stacks Docker propios con datos ficticios y cleanup por labels exactos. Sin push directo a main, force push, bypass, `--admin`, cambios de protecciones ni recursos ajenos. Kit `plantilla/` nunca se versiona, publica, exporta ni borra.

## Modo y decisiones vigentes

**Modo de trabajo: `FRONTERA_CONTINUA`** desde el 2026-11-13. Frontera planifica, implementa y revisa, siempre en sesiones separadas; Junie queda en pausa. «Frontera» es el modelo de máxima capacidad que el dueño abra en la sesión (Codex, Claude Code u otra superficie), sin marca ni versión fijas; se registra el realmente expuesto. Proceso en [WORKFLOW](WORKFLOW.md).

Único lugar para decisiones operativas con fecha. Al caducar se borran de aquí; Git conserva el historial.

| Fecha | Decisión | Vigencia |
|---|---|---|
| 2026-11-16 | Flujo de tres roles: planner, implementer y reviewer que mergea. Correcciones en sesión implementer nueva sobre el mismo PR | Hasta nueva decisión |
| 2026-11-16 | Gate diario con pruebas unitarias y E2E dirigidas. FULL, suite Playwright completa, STARTER, tooling, workflow remoto y cualquier corrida de más de 20–30 minutos quedan diferidos: permiso previo expreso del dueño en la sesión, también en hitos, cierres de lote y revisiones. Los agentes pueden recomendarlos, no iniciarlos ([TESTING](TESTING.md#gates-diferidos)) | Hasta nueva decisión |
| 2026-11-16 | Toda sesión termina con el prompt de la siguiente en STATUS y completo en la respuesta final | Permanente |
| 2026-11-23 | Tras T-096 MERGED, el dueño encarga una última tarea, [T-097](tasks/T-097-demo-page.md): página Demo pública con el tráiler y la demo de YouTube, destino rojo en la barra superior también en móvil. [Secuencia](BACKLOG.md#lote-imagen-libres-e-ia) | Hasta T-097 MERGED o nueva decisión |
| 2026-11-22 | El cron externo de DevNotes queda autorizado de 07:00 a 01:00 hora argentina | Hasta nueva decisión (confirmado por el dueño el 2026-11-23) |
| 2026-11-16 | Render Auto-Deploy **On Commit** para `main`, incluidos los merges documentales. Los merges no autorizan enviar datos reales, configurar proveedores o secretos, cambiar planes ni disparar deploys manuales | Hasta nueva decisión |
| 2026-11-16 | El plan de un lote se publica en un PR solo documental; el planner lo mergea con la conformidad expresa del dueño en la sesión | Hasta nueva decisión |

### Política general

- Frontera define producto, arquitectura y contratos. Modelo, herramienta y esfuerzo se registran según lo realmente expuesto, sin inventar versión.
- `POR_SESION`: el dueño abre cada sesión con el único prompt de STATUS. Sin dispatcher, instalación, autenticación, delegación ni lanzamiento automático de otro agente. Cada tarea y cada revisión usan sesión nueva; las correcciones vuelven a un implementer en otra sesión.
- Una tarea y un PR en vuelo; máximo cinco ready. Una tarea draft solo por dependencia se habilita al comprobar MERGED y conciliar la anterior. No comenzar otra implementación en la sesión que cierra la anterior.
- Máximo dos rondas de revisión y tres correcciones distintas por bloqueo; después, checkpoint al dueño. Herramienta no expuesta: alternativa local autorizada si demuestra lo mismo; si es indispensable, bloquear sin instalar ni autenticar.
- Si el dueño vuelve a `LOTES_JUNIE`, se registra aquí con fecha y rige el ciclo de lote de WORKFLOW. El proveedor real de voz conserva la habilitación específica de [VOICE-RELEASE](VOICE-RELEASE.md).

## Revisión y merge

`AUTOMATICO_ELEGIBLE`: sesión revisora independiente, nunca autora. Exige PR contra main, diff conforme, HEAD/base publicados, veredicto `APROBADO` ligado a ambos SHA, docs-check, CI `verify-required` success del HEAD vigente, [gate diario](TESTING.md#gate-diario) válido para las mismas fuentes/base y conversaciones bloqueantes resueltas. Ausente/pending/cancelled/skipped no son verde. FULL remoto manual no se requiere por rutina ni está autorizado lanzarlo automáticamente.

Squash ligado al SHA revisado; borrar solo la rama de tarea mergeada. Confirmar `MERGED`, merge SHA y fecha antes de habilitar la siguiente. Cambiar HEAD/base invalida aprobación. Reviewer publica transición documental, espera CI del nuevo HEAD, comenta el veredicto y hace el squash en la misma sesión; no commitea tras aprobar. El siguiente implementer concilia done en su rama nueva. Detalle: [reviewer](agents/reviewer.md), [merger](agents/merger.md) y [TESTING](TESTING.md).

## Configuración efectiva y límites

Consulta propia de frontera 2026-10-20 con gh: privado/MIT/main, permiso push y squash habilitados, sin PR abiertos. Consultar rulesets y protección de main devuelve **HTTP 403**, mensaje de GitHub que exige Pro o repo público para esa función. No hay protección del servidor acreditada ni settings modificados. Las condiciones anteriores son controles obligatorios de agentes; no se anuncian como enforcement de GitHub. Un actor con escritura podría eludirlos; protección futura requiere decisión específica del dueño. La política permite continuar con comprobación explícita, sin reglas heredadas.

El gh y Docker/Git Bash de frontera se comprueban en T-000; no acreditan MCP, shell o permisos Junie. Su siguiente sesión registra modelo/herramienta/esfuerzo expuestos, `/mcp`, `/skills` y sondas saneadas en TOOLS/T-000. No necesita instalar todo el catálogo para comenzar.

## Reservado al dueño

Despliegue/producción, datos reales, Google real, pagos/costos, nuevos permisos, configuración GitHub y herramientas globales requieren decisión específica. Google pendiente externo permite desarrollo local ficticio; no significa Google validado. Nunca leer/imprimir `.env` real, tokens, cookies, claims completos ni datos personales. [ORCHESTRATION](ORCHESTRATION.md) completa la continuidad.
