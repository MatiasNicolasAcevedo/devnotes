---
id: T-009
status: mergeable
priority: P1
size: S
executor: junie
role: implementer
milestone: M1
product_cycle: I1
spec: S-102
spec_version: 1
branch: codex/t-009-text-links
pr: 14
depends_on: [T-008]
---
# T-009 · Enlaces sobre texto seleccionado

## Objetivo

Enlaces sobre texto seleccionado, capacidad S-102 de I1. Resultado comprobable descrito abajo; ninguna implementación de otra tarea en esta sesión. Siguiente: [T-010](T-010-version-storage.md), habilitada solo tras MERGED de esta tarea y su conciliación en una nueva sesión. Salida a frontera: T-014 mergeada con los seis CA o decisión/bloqueo fuera del contrato.

## Alcance y decisiones resueltas

Habilitar extensión Link ya instalada, sin autolink/linkOnPaste/openOnClick editable. Shortcut Mod-k y bookmark; diálogo MUI/RHF/Zod con Guardar/Cancelar/Quitar/Abrir. Validar S-101 y casos de selección S-102; render seguro readonly y foco.

Impacto previsto: URLs externas como enlaces nativos, sin integración Jira ni llamadas de preview. Contrato completo; estado draft **únicamente por dependencia T-008 no mergeada/conciliada**. Al comprobarla, Junie puede habilitar ready sin otra planificación. En T-001 comprobar además la evidencia Junie y adopción T-000; si no existen, no comenzar negocio.

## Leer antes

1. [AGENTS client](../../client/AGENTS.md).
2. [S-102 v1](../specs/S-102-text-links.md).
3. [S-101: JSON/editor/guardado](../specs/S-101-daily-notes.md).
4. [TESTING](../TESTING.md).
5. [T-008](T-008-separator-editing.md), solo cierre/MERGED y evidencia necesaria. AGENTS raíz, STATUS y protocolo implementer son la entrada común.

## Archivos y pasos

Rutas previstas: client/src/features/daily/editor/link.ts, LinkDialog.tsx y LinkDialog.test.tsx; DailyEditor.tsx y DailyEditor.test.tsx.
Los nombres sin prefijo de backend son relativos a server/src/main/java/com/example/devnotes/; sus tests conservan paquete bajo server/src/test/java/com/example/devnotes/. Frontend relativo indicado explícitamente o bajo client/src/features/daily/.

1. Comprobar Git/PR/base, dependencia MERGED, capacidades mínimas y crear la rama exacta desde main actualizado; preservar cambios ajenos. Conciliar done de T-008 en primer avance útil.
2. Implementar solo este resultado siguiendo spec v1; pruebas de riesgo y negativos abajo, sin reducir suites/assertions/coverage/retries.
3. Dirigidos durante iteración; fijar huella/SHA/base antes del gate, publicar al pasar gate. No cambiar fuentes mientras corre.
4. Documentar resultado y preparar revisión independiente en STATUS; no autoaprobar ni comenzar siguiente tarea.

## Aceptación y pruebas

1279 conserva texto al crear, editar o quitar href. URL javascript/data/relativa inválida y selección cruzada no mutan ni disparan onChange. Cursor dentro de enlace permite quitar completo; Escape/cancelar restaura foco. Readonly abre con rel seguro sin editar ni preview.

Capa elegida y motivo: Componente con selección/transacciones reales, no mocks de editor; navegador final prueba teclado y apertura.
Comandos ejecutables desde raíz con Git Bash/Docker Desktop Linux/Node>=24 (npm ci instala del lock; no actualiza versiones). Antes de dirigidos Docker y gate, crear namespaces propios y comprobar ausencia:

```bash
export COMPOSE_ENV_FILES=.env.example STARTER_SERVER_TESTS=container
export COMPOSE_PROJECT_NAME="starter-verify-devnotes-t009-$(date +%s)-$$"
export STARTER_E2E_PROJECT="starter-e2e-devnotes-t009-$(date +%s)-$$"
for project in "$COMPOSE_PROJECT_NAME" "$STARTER_E2E_PROJECT"; do
  for kind in container network volume; do
    if [ "$kind" = container ]; then ids=$(docker container ls -aq --filter "label=com.docker.compose.project=$project") || exit 2
    else ids=$(docker "$kind" ls -q --filter "label=com.docker.compose.project=$project") || exit 2; fi
    [ -z "$ids" ] || exit 2
  done
done
npm --prefix client ci
npm --prefix client test -- --run src/features/daily/editor/LinkDialog.test.tsx src/features/daily/editor/DailyEditor.test.tsx
npm --prefix client run typecheck
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

Implementación en progreso. Rama codex/t-009-text-links desde main fcd3b12. LinkDialog.tsx con validación Zod (HTTP/HTTPS absoluto, sin credenciales, host no vacío, máx 2048 chars). DailyEditor.tsx integrado con shortcut Mod-k y callbacks onSave/onRemove/onOpen. link.ts simplificado (sin addCommands, usa setMark/unsetMark nativos de TipTap). 14 tests LinkDialog.test.tsx OK, 9 tests DailyEditor.test.tsx OK, typecheck OK. T-008 MERGED 5d2a70f, dependencia satisfecha.

## Correcciones significativas

Corrección durante implementación: editorRef usaba editor antes de su declaración en DailyEditor.tsx. Se reordenó: ref tipada con ReturnType<typeof useEditor>(null) antes de useEditor, sincronizada en useEffect después. Los commands setLink/unsetLink personalizados en link.ts causaban errores de tipo; se eliminaron y se usa chain().setMark/unsetMark nativo de TipTap.

## Cierre y siguiente tarea

Publicar PR y evidencia según TESTING; pasar a in_review con prompt reviewer en sesión nueva. Reviewer comprueba HEAD/base, gate, CI y arquitectura/propiedad, publica veredicto del SHA final y puede squash merge por AUTONOMY. Sin done hasta MERGED comprobado. El siguiente implementer concilia done al primer avance de su rama nueva; no editar la rama ya mergeada. Próxima: [T-010](T-010-version-storage.md).

Antes de preparar la siguiente sesión, controlar avance de las últimas cinco tareas I1 mergeadas: contratos/evidencia/dependencias vigentes, costo de pruebas medido y cola consistente. Registrar hallazgos en esta tarea; fuera de alcance a BACKLOG. No regresar a frontera si la ruta sigue completa. Esta es la décima tarea I1 tras insertar T-016 antes de T-007.
