---
id: T-052
status: mergeable
priority: P1
size: M
milestone: M5
spec: null
depends_on: [T-047]
branch: codex/t-052-scope-expansion-plan
role: reviewer
executor: frontier
counts_for_cycle: false
pr: 55
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

Entregables del plan: [S-109 · Espacios y navegación](../specs/S-109-private-spaces.md), [S-110 · Copia anterior](../specs/S-110-previous-day-copy.md) y [S-111 · Disponibilidad diaria](../specs/S-111-render-daily-availability.md). Quince tareas T-053…T-067, todas draft por dependencias y con comandos dirigidos. Ruta ordenada en [BACKLOG](../BACKLOG.md#planificación-i5-autorizada-el-2026-11-12); controles de avance tras T-057/T-062/T-067. No se crean tareas para las propuestas no seleccionadas.

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

Investigación: no existe scheduler interno en las fuentes de main ni en el cambio ejecutable de PR54. `useReadiness` consulta cada 5 s desde el navegador. La consulta acotada de logs de arranque de 22:10–22:30 UTC devolvió error del MCP: no acredita causa ni duración del incidente. La explicación por suspensión es compatible con las reglas Free; falta medición controlada.

Verificación inicial: `node scripts/docs-check.mjs` en la raíz falla por el archivo local no versionado `trailer/CLAUDE.md`. No se modifica ni excluye del validador. Copia aislada de archivos versionados y nuevos Markdown propios a `.orchestrator/t052-docs-check/`, sin `plantilla/`, secretos ni `trailer/`: mismo comando exit 0, 105 Markdown / 53 tareas. `git diff --check`: exit 0. Esta copia es recurso propio de validación, retirado por su ruta exacta al terminar los checks de publicación. Ningún gate de aplicación ejecutado.

Verificación del plan completo: docs-check de la copia aislada exit 0, **123 Markdown / 68 tareas**, grafo acíclico y quince contratos nuevos draft. La revisión del diff indexado detectó líneas vacías finales en las tareas nuevas; se normalizaron antes de publicar. Cálculo sRGB de contraste de los tokens sobre `#212324`: Trabajo `#86efac` 11,24:1, Personal `#c4b5fd` 8,55:1; la implementación todavía debe verificar fondos tenues/estados reales y foco. No se renderizó una UI nueva ni se acredita Android real. Commits de reglas/retoma `b8ff2c6` y contratos `dfbdc35`; siguiente rol reviewer independiente, no aprobación propia.

Publicación: [PR55](https://github.com/MatiasNicolasAcevedo/devnotes/pull/55) OPEN contra main; primer HEAD publicado `510af4989fea0d62f32698a512bd5135411cdcbc`, base `00407ef4a637369d3078d19aceab123be3b13521`. Clasificador: `DOCS_ONLY`, `DOCUMENTATION`, 28 archivos; diff-check exit 0. El commit posterior solo enlaza el PR y actualiza este traspaso. Consultar el HEAD actual del PR y su `verify-required` antes de revisar; no inferir aprobación del HEAD nuevo desde checks anteriores. PR54 sigue OPEN/draft sin cambios. Pendiente: revisión independiente del contrato y merge elegible; producción y tareas de implementación siguen pendientes.

## Cierre y siguiente tarea

No done con PR abierto. Una sesión revisora independiente verifica el PR documental. Antes de comenzar la implementación de la serie, deben estar MERGED y conciliados tanto T-052 como T-051. La primera tarea de la serie investigará la sonda con pruebas locales; la activación/deploy en Render permanece sujeta a autorización del dueño sobre el SHA concreto. No ejecutar FULL por iniciativa del agente.

## Ampliación documental solicitada después de publicar PR55

2026-11-12: el dueño solicita registrar siete ideas para después de I5 en el mismo PR. Se añade [FUTURE-FEATURES](../FUTURE-FEATURES.md), enlazado desde BACKLOG y ROADMAP. Son direcciones de producto pendientes de contrato, no nuevas tareas ni cambios a S-109…S-111. Se recomienda panel secundario de consulta y resultados de búsqueda agrupados. Misma sesión de frontera/planner y herramientas ya registradas; se conserva revisión independiente y prohibición de FULL/STARTER. Validación de esta ampliación: docs-check sobre copia de archivos publicables, diff-check y CI documental del nuevo HEAD.

## Revisión independiente

**2026-11-12 · Reviewer + merger, sesión distinta de la autora.** Claude Opus 5.5 (`claude-opus-5-5`) en Claude Code, app de escritorio; esfuerzo no expuesto. Herramientas: Git, `gh`, Git Bash, PowerShell y Node. Impacto: transición documental; sin cambio de comportamiento/API/permisos/datos/UI.

Hechos remotos antes de la transición: PR55 OPEN, no draft, `MERGEABLE`/`CLEAN`, HEAD `aae71be0c21590b656254cc3671bd8b3b46b5ed8`, base main `00407ef4a637369d3078d19aceab123be3b13521` (= merge-base), [`verify-required` SUCCESS](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/43332360671) con `headSha` igual al HEAD, sin comentarios ni revisiones previas. PR53 MERGED (`00407ef`, 2026-11-12T03:18:19Z, HEAD `c124a40`) coincide con la conciliación de T-047. PR54 OPEN/draft, HEAD `9a2ed719a16be94a2f5a2c0866ff4a0e94371df6`, misma base, sin revisión; T-051 `in_progress` en su rama con aceptación del dueño pendiente.

Verificación en worktree aislado del HEAD publicado (sin `trailer/` ni `plantilla/`): `node scripts/docs-check.mjs` exit 0 (124 Markdown, 68 tareas, HANDOFF 22/22); `git diff --check origin/main...HEAD` exit 0; `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL` → `DOCS_ONLY` / `DOCUMENTATION`, 29 archivos A/M. Sin FULL, STARTER, E2E, stacks, deploys ni sonda. `trailer/` local intacto.

Veredicto del contenido: **favorable, sin bloqueantes.**

- S-109: dos espacios enum fijos, migración de todo lo existente a Trabajo con V7 o siguiente libre, unicidad `(owner, space, date)`, 404 indistinguible entre espacios, `space` ausente = work y 400 sin mutación, guardias de cambio por estado (flush/ACK, voz, grabación, importación), contexto capturado por operación, navegación ≥768 px / inferior móvil, Datos global y respaldo `.xlsx` v2 con lectura exacta v1→Trabajo y rechazo de referencias cruzadas.
- S-110: GET de sugerencia sin escritura (200/204), POST con `sourceRevision`/`expectedRevision`, CAS + vacío atómicos, errores 404/409 explícitos, sin autocopia, sin sobrescritura, fecha y espacio visibles antes del click, undo local y sin reintento automático.
- S-111: flag apagado por defecto, ventana por visita visible del dueño hasta medianoche de Buenos Aires, pausa del día, generación contra callbacks tardíos, tres fallos, destino solo desde `APP_PUBLIC_URL`. Separa explícitamente la aceptación local del ensayo remoto autorizado; declara «inconcluso» sin evidencia y no afirma eficacia en Render.
- T-053…T-067: cadena lineal coherente con BACKLOG/ROADMAP/specs (T-053 requiere T-051 y T-052 MERGED/conciliadas; T-056→T-057; T-065→T-066), controles tras T-057/T-062/T-067. Los tests existentes citados en los comandos dirigidos existen en main.
- FUTURE-FEATURES: ideas 2, 9, 16, 21, 22, 24 y 34 registradas para después de I5, sin tareas ni dependencias sobre T-053…T-067.
- AGENTS/AUTONOMY/TESTING/STATUS/BACKLOG/ROADMAP: excepción documental limitada a PR54 + PR55 y FULL/STARTER diferidos hasta solicitud expresa del dueño, con CI liviana y revisión independiente conservadas.

Observaciones no bloqueantes (cierre en la tarea indicada, sin replanificar):

| ID | Evidencia | Condición de cierre |
|---|---|---|
| O-1 | `client/src/features/auth/SessionControls.test.tsx` (T-055/T-064) y `client/src/app/AppShell.test.tsx` (T-064) no existen en main; Vitest ignora un filtro sin coincidencias si otro filtro sí coincide | La tarea crea esos archivos y registra el número de tests ejecutados por archivo, distinto de cero |
| O-2 | S-111 dice «TaskScheduler existente», pero main no tiene `@EnableScheduling` ni bean `TaskScheduler`; Spring Boot no lo autoconfigura sin scheduling habilitado | T-054 lo provee con Spring (habilitar scheduling o bean explícito) sin dependencia nueva y lo registra |
| O-3 | PR54 y PR55 modifican `docs/STATUS.md`, `docs/BACKLOG.md` y T-047 | Al integrar main en PR54, resolver conservando la evidencia de T-051 y la cola I5; nuevo HEAD exige CI y revisión vigentes |
| O-4 | PROJECT_CONTEXT dice que no se seleccionaron otras propuestas; FUTURE-FEATURES selecciona siete para después de I5 | Aclarar en la próxima planificación de frontera; no afecta I5 |

Transición: `mergeable`. Esta transición cambia HEAD; el veredicto `APROBADO` se publica en PR55 con el SHA nuevo solo después de docs-check y `verify-required` verde sobre ese SHA. El merge sigue [merger](../agents/merger.md); T-052 pasa a done en el primer avance de la siguiente rama autorizada, tras confirmar MERGED.
