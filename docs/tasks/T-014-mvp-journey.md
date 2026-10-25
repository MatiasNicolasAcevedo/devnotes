---
id: T-014
status: in_review
priority: P1
size: S
executor: junie
role: implementer
milestone: M1
product_cycle: I1
spec: S-104
spec_version: 2
branch: codex/t-014-mvp-journey
pr: 19
depends_on: [T-013]
---
# T-014 · Recorrido completo y salida I1

## Objetivo

Recorrido completo y salida I1, capacidad S-104 de I1. Resultado comprobable descrito abajo; ninguna implementación de otra tarea en esta sesión. Siguiente: frontera para revisar salida I1, habilitada solo tras MERGED de esta tarea y su conciliación en una nueva sesión. Salida a frontera: T-014 mergeada con los seis CA o decisión/bloqueo fuera del contrato.

## Alcance y decisiones resueltas

Implementar recorridos CA-01…06 con fixtures OIDC/DB/API reales de suites existentes, dos identidades y fechas19/10/2026 y20/10/2026. Probar selección/teclado/wrap/ancho con geometría real desktop1280/móvil375; sin mock API propia. Ejecutar FULL final y recoger resultados/cleanup. Correcciones ordinarias de contratos dentro del límite; si exige rediseño o ampliar varias capas, checkpoint a frontera.

Impacto previsto: Evidencia de recorrido del MVP, sin capacidades nuevas. Contrato completo; estado draft **únicamente por dependencia T-013 no mergeada/conciliada**. Al comprobarla, Junie puede habilitar ready sin otra planificación. En T-001 comprobar además la evidencia Junie y adopción T-000; si no existen, no comenzar negocio.

## Leer antes

1. [AGENTS client](../../client/AGENTS.md).
2. [S-104 v2](../specs/S-104-daily-versions.md).
3. [S-101: JSON/editor/guardado](../specs/S-101-daily-notes.md).
4. [TESTING](../TESTING.md).
5. [T-013](T-013-version-save.md), solo cierre/MERGED y evidencia necesaria. AGENTS raíz, STATUS y protocolo implementer son la entrada común.

## Archivos y pasos

Rutas previstas: e2e/tests/daily-notes.spec.ts y daily-versions.spec.ts; helpers ficticios bajo e2e/fixtures solo si necesarios. docs/HANDOFF.md y ROADMAP solo evidencia/hito.
Los nombres sin prefijo de backend son relativos a server/src/main/java/com/example/devnotes/; sus tests conservan paquete bajo server/src/test/java/com/example/devnotes/. Frontend relativo indicado explícitamente o bajo client/src/features/daily/.

1. Comprobar Git/PR/base, dependencia MERGED, capacidades mínimas y crear la rama exacta desde main actualizado; preservar cambios ajenos. Conciliar done de T-013 en primer avance útil.
2. Implementar solo este resultado siguiendo spec v2; pruebas de riesgo y negativos abajo, sin reducir suites/assertions/coverage/retries.
3. Dirigidos durante iteración; fijar huella/SHA/base antes del gate, publicar al pasar gate. No cambiar fuentes mientras corre.
4. Documentar resultado y preparar revisión independiente en STATUS; no autoaprobar ni comenzar siguiente tarea.

## Aceptación y pruebas

Los seis CA pasan: líneas/vacíos/wrap, links seguros y edición/quitar, cuatro anchos/borrado, independencia fechas/copia/reemplazo único, recarga/nuevo login, actorB sin datos/modificaciones deA. Cambiar trabajo no cambia historial. Negativos API por identidades directas conservados y FULL verde sin retries aumentados.

Matriz prevista (no resultados ejecutados):

| CA | Escenario mínimo de navegador real | Suite |
|---|---|---|
| CA-01 | Bloques texto/separador/vacío numerados consecutivos, wrap sin número adicional; 1280/375 | daily-notes.spec.ts |
| CA-02 | Seleccionar1279, Mod-k, crear/abrir/editar/quitar link manteniendo texto; readonly abre seguro | daily-notes.spec.ts |
| CA-03 | Los cuatro comandos al Enter, anchos medidos contra área sin gutter, Backspace/Delete y undo | daily-notes.spec.ts |
| CA-04 | Fechas19/10 y20/10 independientes; crear/reemplazar una sola copia; edición posterior no altera historial | daily-versions.spec.ts |
| CA-05 | javascript rechazado sin cambios; texto literal HTML no ejecuta; recarga y logout/login recuperan trabajo/copia | Ambas suites |
| CA-06 | Dos identidades en la misma fecha solo ven su espacio; IDs/URL no acceden a datos ajenos, cambio identidad limpia | Ambas suites + negativos HTTP ya existentes |

Añadir al recorrido real dos pestañas de la misma identidad que editan la misma revisión: una guarda, la otra muestra409 y retiene texto sin sobrescribir. Atrás/adelante y vuelta al trabajo conservan edición pendiente conforme S-101; no mockear API para fabricar fallos. Errores de red/ACK perdido, descarte y consulta previa a versión ya tienen pruebas deterministas en T-016/T-007/T-013; no duplicarlos como E2E mediante API propia falsa. Cerrar control de quince tareas I1 y trazar cada CA a su evidencia/log de runtime, sin presentar esta matriz como ejecución.

Capa elegida y motivo: Playwright real en los dos proyectos de viewport existentes; dirigir por suite completa portable sin inventar filtros del runner.
Comandos ejecutables desde raíz con Git Bash/Docker Desktop Linux/Node>=24 (npm ci instala del lock; no actualiza versiones). Antes de dirigidos Docker y gate, crear namespaces propios y comprobar ausencia:

```bash
export COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container
export COMPOSE_PROJECT_NAME="starter-verify-devnotes-t014-$(date +%s)-$$"
export STARTER_E2E_PROJECT="starter-e2e-devnotes-t014-$(date +%s)-$$"
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  for kind in container network volume; do
    if [ "$kind" = container ]; then ids=$(docker container ls -aq --filter "label=com.docker.compose.project=$project") || exit 2
    else ids=$(docker "$kind" ls -q --filter "label=com.docker.compose.project=$project") || exit 2; fi
    [ -z "$ids" ] || exit 2
  done
done
bash scripts/verify.sh --e2e
```

Los dirigidos no acreditan FULL. Cierre previsto **APPLICATION**, por código/tests de aplicación; si diff completo exige STARTER, usar --starter sin rebajar clasificación. Registrar también diff sin commit; --policy solo mira commits.

```bash
bash scripts/verify.sh
docker compose --env-file .env.example -p "$COMPOSE_PROJECT_NAME" --profile verify down --volumes --remove-orphans
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  docker container ls -aq --filter "label=com.docker.compose.project=$project"
  docker network ls -q --filter "label=com.docker.compose.project=$project"
  docker volume ls -q --filter "label=com.docker.compose.project=$project"
done
node scripts/docs-check.mjs
bash scripts/verify.sh --policy origin/main
```

Conservar exit original del gate si se ejecuta cleanup después; si falla cleanup no anunciar verde. Labels deben quedar vacíos; namespaces internos de tooling los limpia su runner y se comprueban en sus logs. Checkpoint antes de gate con SHA/base, comando/log saneado, recursos propios y cleanup; huella técnica antes/después. Bugfix nuevo: primero rojo reproducible y después verde. No necesita rojo previo una nueva capacidad, sí negativos útiles.

## Checkpoint vigente

2026-10-25, sesión propia Junie implementer. Raíz/checkout `C:\D\matias\proyectos-ia\devnotes`, rama `codex/t-014-mvp-journey`. Instrucciones efectivamente leídas: `AGENTS.md`, `client/AGENTS.md`, `docs/STATUS.md`, esta tarea, `docs/AUTONOMY.md`, `docs/TESTING.md`, `docs/agents/implementer.md`, `docs/specs/S-104-daily-versions.md` (v2), `docs/specs/S-101-daily-notes.md` (v2). Superficie IDE IntelliJ IDEA/AIR (plugin Junie), terminal PowerShell. Modelo expuesto por entorno: Qwen/Qwen3.6-27B-FP8. Esfuerzo no expuesto. Impacto: dos archivos E2E nuevos (daily-notes.spec.ts y daily-versions.spec.ts) con recorridos CA-01…06; sin cambios de comportamiento, API, permisos o datos.

Dependencia T-013 conciliada como MERGED (dafaecf). T-000 MERGED (cbbe1c9), E-01 aceptado. HEAD `9c66a93`, base `dafaecf`. PR #19 abierto, estado in_review.

Evidencia de gates ejecutados:
- Gate E2E: exit code 0 (namespaces propios con timestamp)
- Gate FULL: exit code 0 (backend + client + E2E)
- docs-check: OK (65 Markdown, 19 tareas, HANDOFF 22/22 verificados)
- Perfil diff: APPLICATION (e2e/tests + docs permitidos)

Pendiente: revisión independiente en sesión nueva, squash merge tras aprobación, y conciliación como MERGED.

## Correcciones significativas

Sin correcciones ni resultados de implementación acreditados.

## Cierre y siguiente tarea

Publicar PR y evidencia según TESTING; pasar a in_review con prompt reviewer en sesión nueva. Reviewer comprueba HEAD/base, gate, CI y arquitectura/propiedad, publica veredicto del SHA final y puede squash merge por AUTONOMY. Sin done hasta MERGED comprobado. El siguiente implementer concilia done al primer avance de su rama nueva; no editar la rama ya mergeada. Próxima: frontera para revisar salida I1.

Salida I1: enlazar evidencia CA-01…06 en esta tarea; HANDOFF solo criterios efectivamente demostrados, nunca afirmar Google real. Prompt tras merge: frontera, primera comprobación MERGED T-014 + trazabilidad/evidencia de I1. No iniciar otra iteración.

En esa sesión nueva de frontera, [T-017](T-017-voice-readiness.md) es la planificación posterior ya registrada: validar candidato/configuración y contratos I2. El cierre de T-014 no habilita implementar voz automáticamente ni instalar un SDK/proveedor.
