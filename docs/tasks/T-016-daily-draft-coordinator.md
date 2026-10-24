---
id: T-016
status: in_review
priority: P1
size: S
executor: junie
role: implementer
milestone: M1
product_cycle: I1
spec: S-101
spec_version: 2
branch: codex/t-016-daily-draft-coordinator
pr: 11
depends_on: [T-006]
---
# T-016 · Borrador y cola de guardado por identidad

## Objetivo

Conservar la última edición al guardar, navegar o recibir respuestas tardías. Separada de T-006 para limitar el trabajo de Junie; se ejecuta **entre T-006 y T-007**, aunque su ID sea mayor. Siguiente T-007 tras MERGED/conciliación; salida a frontera tras T-014 y CA-01…06, o decisión fuera del contrato.

## Alcance y decisiones resueltas

Solo useDailyNote.ts y DailyDraftProvider.tsx con sus tests bajo client/src/features/daily/. Reutilizar transporte/Query/keys/invalidation de T-006; sin cambiar API, dependencias, Vite, rutas o tema. Provider de memoria, bajo identidad, por encima de Outlet al montarlo en T-007. Una sola fecha activa con edición pendiente, sin cache remota duplicada ni almacenamiento persistente.

Exponer mediante useDailyNote(owner, date) documento/revisión/estado/error, edit(content), retry(), flush({force?: boolean}), discard() y bloqueo de edición/acción para guardar versión en T-013. force permite persistir el vacío explícito; GET404 no genera PUT por sí solo. Provider expone navegación awaitable guardedNavigate(action): flush primero, una sola navegación pendiente, ejecutar action solo si la misma identidad sigue vigente; error mantiene la ruta controlada. T-007 conecta navegación/aviso, no implementa otra cola.

Debounce 700 ms después de última edición válida; snapshot y generación, una escritura en vuelo. ACK actualiza revisión confirmada sin reemplazar texto; si hay otra generación, enviar la más reciente con esa revisión. Refetch no pisa dirty. Error/409 detiene cola y retiene texto. Reintento explícito; CSRF no repite mutación automáticamente. Un error de red puede ocurrir después del commit: conservar borrador, mostrar resultado desconocido y manejar 409 posterior sin overwrite. discard exige confirmación en la UI, espera toda escritura en vuelo y recarga estado remoto antes de liberar la fecha; no supone rollback por abortar fetch. Tras descarte, una respuesta vieja no recrea dirty. Cambio de identidad/logout limpia memoria e invalida todas las finalizaciones, sin abortar una mutación como supuesta garantía de rollback.

Contrato completo; draft **solo por T-006 no mergeada/conciliada**. Ninguna capacidad de voz incluida.

## Leer antes

1. [AGENTS client](../../client/AGENTS.md).
2. [S-101 v2, guardado y estados](../specs/S-101-daily-notes.md#guardado-y-estados).
3. [T-006, interfaz de transporte/Query](T-006-daily-client.md).
4. [S-104 v2, flush para copia manual](../specs/S-104-daily-versions.md#frontend).
5. [TESTING](../TESTING.md).

## Archivos y pasos

1. Comprobar dependencia MERGED, conciliar T-006 done en rama exacta desde main actualizado y registrar capacidades propias pertinentes.
2. Crear useDailyNote.ts y DailyDraftProvider.tsx; probar en useDailyNote.test.tsx con providers/Query reales y MSW. No montar pantalla todavía.
3. Dirigidos y gate APPLICATION; checkpoint previo con SHA/base/huellas/logs/recursos/cleanup; publicar una tarea/PR y dejar revisión independiente en STATUS.

## Aceptación y pruebas

GET404 sin escritura; debounce agrupa teclas; edición durante PUT produce un segundo PUT con revisión nueva y contenido más reciente. ACK viejo nunca marca guardada una generación pendiente. flush espera última generación, falla conservando borrador y no ejecuta navegación. Edición inválida conserva texto y bloquea envío/versión. Desmontar/remontar la página retiene dirty en provider. discard durante PUT espera, no crea otra escritura y no revive borrador por ACK tardío. Error de red con commit remoto seguido de 409 conserva edición. Logout/expiración/cambio de identidad durante PUT no mezclan cache ni mensajes; conservar pruebas de regresión de T-006.

Capa: hooks/coordinador con Query/providers reales, MSW y respuestas retenidas; fake timers solo para debounce, sin mockear reglas internas. No E2E adicional en esta tarea. Desde raíz en Git Bash, Node>=24 y Docker Desktop Linux:

```bash
export COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container
export COMPOSE_PROJECT_NAME="starter-verify-devnotes-t016-$(date +%s)-$$"
export STARTER_E2E_PROJECT="starter-e2e-devnotes-t016-$(date +%s)-$$"
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  for kind in container network volume; do
    if [ "$kind" = container ]; then ids=$(docker container ls -aq --filter "label=com.docker.compose.project=$project") || exit 2
    else ids=$(docker "$kind" ls -q --filter "label=com.docker.compose.project=$project") || exit 2; fi
    [ -z "$ids" ] || exit 2
  done
done
npm --prefix client ci
npm --prefix client test -- --run src/features/daily/api.test.ts src/features/daily/useDailyNoteQuery.test.tsx src/features/daily/useDailyNote.test.tsx
npm --prefix client run typecheck
bash scripts/verify.sh
```

El cierre previsto es APPLICATION; si el diff exige STARTER, usar --starter. Conservar exit original del gate durante cleanup y no anunciar verde si cleanup falla:

```bash
docker compose --env-file .env.example -p "$COMPOSE_PROJECT_NAME" --profile verify down --volumes --remove-orphans
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  docker container ls -aq --filter "label=com.docker.compose.project=$project"
  docker network ls -q --filter "label=com.docker.compose.project=$project"
  docker volume ls -q --filter "label=com.docker.compose.project=$project"
done
node scripts/docs-check.mjs
bash scripts/verify.sh --policy origin/main
```

Labels exactos vacíos, logs saneados y huellas sin cambio durante gate; nunca prune. No reducir tests, cobertura 80/70, retries o deadlines. Bugfix ordinario primero rojo; nueva capacidad con negativos no necesita rojo artificial.

## Checkpoint vigente

2026-10-21, preparada por frontera planner/Codex durante revisión previa a Junie. Sin implementación, PR ni pruebas de runtime. Dependencia T-006; sigue siendo I1 y cuenta para ciclo. Impacto previsto: memoria transitoria y secuencia de guardado, sin nuevas rutas/datos/permisos.

## Correcciones significativas

La planificación inicial reunía HTTP/Query, cobertura, borrador, cola y navegación en T-006. Se separa este contrato conservando sus negativos y perfil de gate; T-007 depende ahora de T-016. No se retira aceptación.

## Cierre y siguiente tarea

in_review tras publicar; revisión en sesión nueva y merge por AUTONOMY, sin autoaprobación. El siguiente implementer concilia done e inicia T-007 en su rama nueva. No ejecutar T-007 en la sesión que cierra este PR.
