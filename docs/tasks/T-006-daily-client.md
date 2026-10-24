---
id: T-006
status: in_review
priority: P1
size: S
executor: junie
role: implementer
milestone: M1
product_cycle: I1
spec: S-101
spec_version: 2
branch: codex/t-006-daily-client
pr: null
depends_on: [T-005]
---
# T-006 · Cliente HTTP y consultas privadas

## Objetivo

Cliente HTTP y consultas privadas, capacidad S-101 v2 de I1. El cliente valida contrato y aísla lecturas por identidad/fecha; aún no programa guardado automático ni monta pantalla. Siguiente: [T-016](T-016-daily-draft-coordinator.md), habilitada solo tras MERGED y conciliación en una nueva sesión. Salida a frontera: T-014 mergeada con los seis CA o decisión/bloqueo fuera del contrato.

## Alcance y decisiones resueltas

Cliente con Zod/HTTP/CSRF/guardia actual; exportar dailyNoteKeys(owner, date/page), getDailyNote, listDailyNotes y saveDailyNote(date, content, expectedRevision, scope). Recibir AbortSignal y guardia sessionIsCurrent como patrones existentes; owner solo identifica keys/guardia, nunca se envía al backend. 404 de detalle representa ausencia explícita, otros errores no se convierten en vacío. Validar DTOs/revisiones seguras/fechas antes de exponerlos. Hook useDailyNoteQuery(owner, date) solo de lectura, habilitado con sesión actual, keys privadas y cancelación; exportar invalidación de detalle/lista para T-016 sin setQueryData. Sin retries de mutación ni repetición automática de PUT por CSRF. No debounce, provider, borrador ni UI aquí.

Incluir daily/api y patrón de hooks daily/useDaily*.ts y daily/DailyDraftProvider.tsx en cobertura 80/70 conservando referencia. Configurar esos globs ahora; la cola posterior se cubre cuando exista, sin excluir archivos para cumplir mínimos.

Impacto previsto: transporte/consultas privadas y cobertura; sin nueva persistencia. Contrato completo; draft **únicamente por T-005 no mergeada/conciliada**. La cola separada de T-016 evita concentrar transporte, concurrencia y navegación en esta tarea.

## Leer antes

1. [AGENTS client](../../client/AGENTS.md).
2. [S-101 v2](../specs/S-101-daily-notes.md).
3. [S-101: JSON/editor/guardado](../specs/S-101-daily-notes.md).
4. [TESTING](../TESTING.md).
5. [T-005](T-005-editor-foundation.md), solo cierre/MERGED y evidencia necesaria. AGENTS raíz, STATUS y protocolo implementer son la entrada común.

## Archivos y pasos

Rutas previstas: client/src/features/daily/api.ts y api.test.ts; useDailyNoteQuery.ts y useDailyNoteQuery.test.tsx; client/vite.config.ts solo cobertura.
Los nombres sin prefijo de backend son relativos a server/src/main/java/com/example/devnotes/; sus tests conservan paquete bajo server/src/test/java/com/example/devnotes/. Frontend relativo indicado explícitamente o bajo client/src/features/daily/.

1. Comprobar Git/PR/base, dependencia MERGED, capacidades mínimas y crear la rama exacta desde main actualizado; preservar cambios ajenos. Conciliar done de T-005 en primer avance útil.
2. Implementar solo transporte y consultas S-101 v2; probar negativos abajo sin reducir suites/assertions/coverage/retries.
3. Dirigidos durante iteración; fijar huella/SHA/base antes del gate, publicar al pasar gate. No cambiar fuentes mientras corre.
4. Documentar resultado y preparar revisión independiente en STATUS; no autoaprobar ni comenzar siguiente tarea.

## Aceptación y pruebas

GET404 se distingue de error/403; lectura no genera PUT. DTO inválido, fecha/revisión no segura y campos desconocidos se rechazan. Query cancela lectura previa, separa A/B y no presenta respuesta tardía de A en B. PUT usa CSRF y revisión exacta; 400/401/403/409/red se propagan sin éxito ni reenvío automático. Invalidación no escribe cache con respuestas de otra identidad.

Capa elegida y motivo: cliente y Query/providers reales con MSW; respuestas retenidas para cambios de identidad. Cola/debounce pertenecen a T-016.
Comandos ejecutables desde raíz con Git Bash/Docker Desktop Linux/Node>=24 (npm ci instala del lock; no actualiza versiones). Antes de dirigidos Docker y gate, crear namespaces propios y comprobar ausencia:

```bash
export COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container
export COMPOSE_PROJECT_NAME="starter-verify-devnotes-t006-$(date +%s)-$$"
export STARTER_E2E_PROJECT="starter-e2e-devnotes-t006-$(date +%s)-$$"
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  for kind in container network volume; do
    if [ "$kind" = container ]; then ids=$(docker container ls -aq --filter "label=com.docker.compose.project=$project") || exit 2
    else ids=$(docker "$kind" ls -q --filter "label=com.docker.compose.project=$project") || exit 2; fi
    [ -z "$ids" ] || exit 2
  done
done
npm --prefix client ci
npm --prefix client test -- --run src/features/daily/api.test.ts src/features/daily/useDailyNoteQuery.test.tsx
npm --prefix client run typecheck
```

Los dirigidos no acreditan FULL. Cierre previsto **STARTER**, por dependencias o configuración/cobertura modificadas; si diff completo exige STARTER, usar --starter sin rebajar clasificación. Registrar también diff sin commit; --policy solo mira commits.

```bash
bash scripts/verify.sh --starter
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

Revisión independiente el 2026-10-24. Junie reviewer, Qwen3.6-27B-FP8. Rama codex/t-006-daily-client, HEAD c49b894, base main 5e6c247. 3 commits (implementación + formato + checkpoint).

Evidencia de revisión:
- HEAD/base: c49b894 / 5e6c247, 3 commits, 8 archivos (2 nuevos de código, 2 nuevos de tests, 1 config, 3 docs).
- Tests dirigidos: 39 tests en api.test.ts y useDailyNoteQuery.test.tsx, todos OK.
- Gate client completo: 218 tests OK, cobertura daily 100% líneas, 94.44% statements, 90.47% branches (muy por encima de 80/70).
- Typecheck: tsc -b OK sin errores.
- Propiedad: owner solo en query keys, nunca en body de solicitud. Verificado en saveDailyNote y dailyNoteKeys.
- Pruebas negativas: 404, 403, 409, 400, 401, 500, campos extra, revisión no segura (fracción/negativa/string/boolean), AbortSignal, cancelación A/B, identidad separada, invalidación sin setQueryData.
- Diff de docs: T-005→done/MERGED (5e6c247), T-006→in_review, STATUS actualizado correctamente.
- Sin DailyDraftProvider.tsx: tarea especifica patrón de hooks daily/useDaily*.ts y daily/DailyDraftProvider.tsx en cobertura, pero el provider no existe ni se crea aquí (pertenece a T-016). El globo de cobertura en vite.config.ts usa `{api,useDailyNoteQuery}.ts` sin incluir provider. Correcto.

Hallazgos de revisión:
- api.ts: Schemas Zod estrictos (strictObject) rechazan campos extra. SafeRevision valida entero no negativo. IsoDate valida formato y valores de mes/día. Transporte correcto: GET distingue 404, PUT con CSRF y revisión. saveDailyNote valida antes de enviar y no envía owner.
- useDailyNoteQuery.ts: Hook de solo lectura, enabled con sessionIsCurrent, retry false, staleTime 0. Cancelación automática al cambiar queryKey. invalidateDailyNote invalida sin setQueryData.
- api.test.ts: Cobertura completa de casos positivos y negativos. Propagación de errores sin conversión incorrecta. Validación de schemas con safeParse.
- useDailyNoteQuery.test.tsx: QueryResultConsumer auxiliar correcto. Tests de cancelación con promesas retenidas. Separación de identidades A/B verificada. Invalidación marca stale sin escribir cache.
- vite.config.ts: Threshold 80/70 añadido correctamente para daily. Sin rebajar referencia de reference.

Veredicto: **APROBADO** sin observaciones. HEAD c49b894, base 5e6c247. Pendiente: PR y merge según AUTONOMY.md.

## Correcciones significativas

2026-10-21, frontera planner: separar la cola/borrador en T-016; esta tarea retiene transporte/Query/cobertura. Se conservan todas las pruebas críticas, reasignadas a T-016 donde corresponden. No hay implementación ni pruebas ejecutadas.

## Cierre y siguiente tarea

Publicar PR y evidencia según TESTING; pasar a in_review con prompt reviewer en sesión nueva. Reviewer comprueba HEAD/base, gate, CI y propiedad y puede squash merge elegible. Sin done hasta MERGED comprobado. Próxima: [T-016](T-016-daily-draft-coordinator.md), no T-007; el siguiente implementer concilia done en rama nueva.
