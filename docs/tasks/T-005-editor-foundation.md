---
id: T-005
status: in_progress
priority: P1
size: S
executor: junie
role: implementer
milestone: M1
product_cycle: I1
spec: S-101
spec_version: 2
branch: codex/t-005-editor-foundation
pr: null
depends_on: [T-004]
---
# T-005 · Editor monoespaciado y líneas lógicas

## Objetivo

Editor monoespaciado y líneas lógicas, capacidad S-101 de I1. Resultado comprobable descrito abajo; ninguna implementación de otra tarea en esta sesión. Siguiente: [T-006](T-006-daily-client.md), habilitada solo tras MERGED de esta tarea y su conciliación en una nueva sesión. Salida a frontera: T-014 mergeada con los seis CA o decisión/bloqueo fuera del contrato.

## Alcance y decisiones resueltas

Instalar paquetes exactos elegidos en S-101 mediante comando debajo; inventario actualizado sin upgrades colaterales. Esquema TS/Zod y Tiptap mínimo: Document/Paragraph/Text/UndoRedo, separator y Link registrados para render/roundtrip completo (shortcuts T-008/T-009); Link sin autolink/linkOnPaste/openOnClick en edición. Editor con pegar plano/Enter/Shift+Enter, gutter CSS por bloque y modo readonly. CSS del editor oscuro/Roboto Mono local sin tocar tema global hasta T-007. No perder marks/separadores válidos de un documento cargado por API.

Impacto previsto: Nuevas dependencias OSS/fuente locales, sin servicio externo ni persistencia de navegador. Contrato completo; estado draft **únicamente por dependencia T-004 no mergeada/conciliada**. Al comprobarla, Junie puede habilitar ready sin otra planificación. En T-001 comprobar además la evidencia Junie y adopción T-000; si no existen, no comenzar negocio.

## Leer antes

1. [AGENTS client](../../client/AGENTS.md).
2. [S-101 v2](../specs/S-101-daily-notes.md).
3. [S-101: JSON/editor/guardado](../specs/S-101-daily-notes.md).
4. [TESTING](../TESTING.md).
5. [T-004](T-004-daily-api.md), solo cierre/MERGED y evidencia necesaria. AGENTS raíz, STATUS y protocolo implementer son la entrada común.

## Archivos y pasos

Rutas previstas: client/src/features/daily/editor/dailyDocument.ts, DailyEditor.tsx, separator.ts, link.ts (mark href-only sin defaults target/rel/class en JSON), dailyEditor.css y sus dailyDocument.test.ts/DailyEditor.test.tsx; client/package.json y package-lock.json; docs/DEPENDENCIES.md.
Los nombres sin prefijo de backend son relativos a server/src/main/java/com/example/devnotes/; sus tests conservan paquete bajo server/src/test/java/com/example/devnotes/. Frontend relativo indicado explícitamente o bajo client/src/features/daily/.

1. Comprobar Git/PR/base, dependencia MERGED, capacidades mínimas y crear la rama exacta desde main actualizado; preservar cambios ajenos. Conciliar done de T-004 en primer avance útil.
2. Implementar solo este resultado siguiendo spec v2; pruebas de riesgo y negativos abajo, sin reducir suites/assertions/coverage/retries.
3. Dirigidos durante iteración; fijar huella/SHA/base antes del gate, publicar al pasar gate. No cambiar fuentes mientras corre.
4. Documentar resultado y preparar revisión independiente en STATUS; no autoaprobar ni comenzar siguiente tarea.

Instalación autorizada únicamente en esta tarea, desde raíz:
```bash
npm --prefix client install --save-exact @tiptap/core@3.32.0 @tiptap/react@3.32.0 @tiptap/pm@3.32.0 @tiptap/extension-document@3.32.0 @tiptap/extension-paragraph@3.32.0 @tiptap/extension-text@3.32.0 @tiptap/extensions@3.32.0 @tiptap/extension-link@3.32.0 @fontsource/roboto-mono@5.3.0
```

## Aceptación y pruebas

Vacío numerado1, líneas vacías, wrap sin números extra, paste multilinea sin importar HTML, undo/redo, JSON inválido rechazado y readonly sin callbacks de edición. Texto HTML literal visible como texto, CRLF/CR normalizado preservando líneas vacías iniciales/finales. TS coincide con fixtures backend y límites/+1 de bloques/texto/fragmentos/href agregado; JSON remoto inválido no se hidrata ni se guarda normalizado. Probar roundtrip semántico sin exigir fragmentos adyacentes idénticos. Roboto Mono empaquetada localmente. Compatibilidad efectiva de deps probada, no inferida de npm.

Capa elegida y motivo: Transformación pura + componente con editor real; geometría/wrap final en navegador T-014. No simular Tiptap con un textarea.
Comandos ejecutables desde raíz con Git Bash/Docker Desktop Linux/Node>=24 (npm ci instala del lock; no actualiza versiones). Antes de dirigidos Docker y gate, crear namespaces propios y comprobar ausencia:

```bash
export COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container
export COMPOSE_PROJECT_NAME="starter-verify-devnotes-t005-$(date +%s)-$$"
export STARTER_E2E_PROJECT="starter-e2e-devnotes-t005-$(date +%s)-$$"
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  for kind in container network volume; do
    if [ "$kind" = container ]; then ids=$(docker container ls -aq --filter "label=com.docker.compose.project=$project") || exit 2
    else ids=$(docker "$kind" ls -q --filter "label=com.docker.compose.project=$project") || exit 2; fi
    [ -z "$ids" ] || exit 2
  done
done
npm --prefix client ci
npm --prefix client test -- --run src/features/daily/editor/dailyDocument.test.ts src/features/daily/editor/DailyEditor.test.tsx
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

Preparada por frontera/Codex el 2026-10-20, no ejecutada por Junie. Junie registra una vez rol/modelo/herramienta/esfuerzo realmente expuestos al tomarla; inventario heredado no acredita capacidades. Sin PR ni pruebas de esta tarea todavía. Dependencia pendiente: T-004. El prompt vigente está solo en STATUS.

## Correcciones significativas

Sin correcciones ni resultados de implementación acreditados.

## Cierre y siguiente tarea

Publicar PR y evidencia según TESTING; pasar a in_review con prompt reviewer en sesión nueva. Reviewer comprueba HEAD/base, gate, CI y arquitectura/propiedad, publica veredicto del SHA final y puede squash merge por AUTONOMY. Sin done hasta MERGED comprobado. El siguiente implementer concilia done al primer avance de su rama nueva; no editar la rama ya mergeada. Próxima: [T-006](T-006-daily-client.md).

Antes de preparar la siguiente sesión, controlar avance de las últimas cinco tareas I1 mergeadas: contratos/evidencia/dependencias vigentes, costo de pruebas medido y cola consistente. Registrar hallazgos en esta tarea; fuera de alcance a BACKLOG. No regresar a frontera si la ruta sigue completa.
