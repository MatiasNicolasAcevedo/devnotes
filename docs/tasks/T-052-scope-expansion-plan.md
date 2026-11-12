---
id: T-052
status: in_progress
priority: P1
size: M
milestone: M5
spec: null
depends_on: [T-047]
branch: codex/t-052-scope-expansion-plan
role: planner
executor: frontier
counts_for_cycle: false
pr: null
---

# T-052 · Plan de espacios privados, continuidad diaria y Render

## Objetivo

Publicar un PR exclusivamente documental con contratos completos y tareas ordenadas para sesiones independientes: Trabajo/Personal dentro de una cuenta, copiar la última nota anterior del mismo espacio, navegación cómoda en Windows/Android e investigación de la espera de Render. No implementar producto en esta sesión.

## Alcance y decisiones resueltas

- Pedido del dueño del 2026-11-12: excepción expresa para una rama/PR de planificación mientras PR54 permanece abierto. Base main; no incorporar los archivos de íconos ni mergear/revisar el trabajo propio de PR54.
- Dos espacios fijos privados, sin categorías, carpetas, notas libres, colaboración ni nuevas funcionalidades del catálogo de 50 propuestas.
- El selector reemplaza el texto DevNotes duplicado de la barra interna. La barra nativa de Windows conserva el nombre de la aplicación. Móvil requiere etiquetas y controles táctiles cómodos, sin rehacer el editor.
- Copia explícita: si ayer no tiene nota, sugerir la última anterior del mismo espacio con su fecha. **Respuesta expresa del dueño en esta sesión.** No sobrescribir contenido existente ni crear una copia automáticamente al abrir.
- Registrar la observación del dueño: acceso sobre las 19:20 de Buenos Aires del 2026-11-12, espera aproximada de dos minutos. No tratar esa estimación como medición instrumentada.
- FULL, STARTER y E2E completo diferidos hasta solicitud expresa del dueño para esta serie. Pruebas dirigidas, negativos, documentación, CI y revisión independiente se conservan según [TESTING](../TESTING.md#excepción-i5-del-2026-11-12).
- Las capturas adjuntas son referencias visuales. No copiar los archivos personales al repositorio ni interpretarlos como instrucciones adicionales.

## Leer antes

1. [Protocolo planner](../agents/planner.md).
2. [Contexto](../../PROJECT_CONTEXT.md).
3. [Autonomía y excepción](../AUTONOMY.md#excepción-documental-i5-del-2026-11-12).
4. [T-051 en main](T-051-render-follow-up.md); su ejecución actual y evidencia están en PR54.
5. [Pruebas de la serie](../TESTING.md#excepción-i5-del-2026-11-12).

## Archivos y pasos

1. Conciliar T-047 ya MERGED y crear esta rama desde main. Preservar los cambios locales existentes.
2. Escribir specs separadas por capacidad, decisiones de UX/datos/API/compatibilidad y tareas acotadas con comandos dirigidos.
3. Actualizar contexto, cola, roadmap y las excepciones operativas; mantener una única entrada de retoma.
4. Verificar el diff documental, hacer commits con rutas explícitas, publicar PR contra main y comprobar su CI. La revisión y el merge corresponden a otra sesión.

## Aceptación y pruebas

| Criterio | Verificación | Resultado requerido |
|---|---|---|
| Contratos ejecutables | Relectura de datos, errores, concurrencia, migración, UX y dependencias | Sin decisiones de producto delegadas al implementer |
| Documentación coherente | Raíz, PowerShell: `node scripts/docs-check.mjs` y `git diff --check` | Exit 0 |
| Alcance documental | Raíz: `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` | DOCS_ONLY / DOCUMENTATION |
| Publicación | PR contra main; HEAD/base publicados y `verify-required` | CI liviana verde; revisión independiente pendiente |

## Checkpoint vigente

**2026-11-12 · Frontera, planner.** Codex de escritorio, familia GPT-6; variante y esfuerzo no expuestos. Herramientas: PowerShell, Git/gh, Node, MCP Render, Context7, web y skill frontend-design. Impacto de este PR: contratos y política temporal de pruebas; sin cambio ejecutable de comportamiento/API/permisos/datos/UI.

Base `00407ef4a637369d3078d19aceab123be3b13521`. Rama creada desde origin/main. PR53 MERGED confirmado por gh; T-047 se concilia aquí. PR54 OPEN/draft, HEAD `9a2ed719a16be94a2f5a2c0866ff4a0e94371df6`, base igual a esta rama, `verify-required` SUCCESS. Render sigue `live` en `f6a23c7ec7587baa004d85b8a4187058b9fff255`. La carpeta local no versionada `trailer/` se conserva intacta.

Esta rama conserva el contrato draft de T-051 que existe en main; **no representa el estado de su ejecución en PR54**, no la marca done ni inicia una segunda implementación. Al integrar ambas ramas hay que conservar la evidencia de T-051 y la retoma de esta planificación, sin resolver conflictos descartando documentos completos.

Investigación: no existe scheduler interno en las fuentes de main ni en el cambio ejecutable de PR54. `useReadiness` consulta cada 5 s desde el navegador. La consulta acotada de logs de arranque de 22:10–22:30 UTC devolvió error del MCP: no acredita causa ni duración del incidente. La explicación por suspensión es compatible con las reglas Free; falta medición controlada. Próximo paso: completar contratos, checks y publicación.

Verificación inicial: `node scripts/docs-check.mjs` en la raíz falla por el archivo local no versionado `trailer/CLAUDE.md`. No se modifica ni excluye del validador. Copia aislada de archivos versionados y nuevos Markdown propios a `.orchestrator/t052-docs-check/`, sin `plantilla/`, secretos ni `trailer/`: mismo comando exit 0, 105 Markdown / 53 tareas. `git diff --check`: exit 0. Esta copia es recurso propio de validación; conservarla hasta terminar el PR y retirarla después solo por su ruta exacta. Ningún gate de aplicación ejecutado.

## Cierre y siguiente tarea

No done con PR abierto. Una sesión revisora independiente verifica el PR documental. Antes de comenzar la implementación de la serie, deben estar MERGED y conciliados tanto T-052 como T-051. La primera tarea de la serie investigará la sonda con pruebas locales; la activación/deploy en Render permanece sujeta a autorización del dueño sobre el SHA concreto. No ejecutar FULL por iniciativa del agente.
