---
id: T-035
status: changes_requested
priority: P1
size: S
executor: junie
role: implementer
milestone: M2
product_cycle: I2
spec: S-105
spec_version: 2
branch: codex/t-035-voice-library
pr: 40
depends_on: [T-034]
---
# T-035 · Colección privada y edición/borrado concurrentes

## Objetivo

Colección privada y edición/borrado concurrentes, dentro de S-105/M2-RC1. Contrato completo; draft **solo por dependencia T-034 no MERGED/conciliada**. Junie puede habilitar ready al comprobarla sin otra planificación. Siguiente: T-036 tras MERGED. Retorno a frontera al objetivo M2-RC1 o decisión fuera de contrato, no por cada tarea.

## Alcance y decisiones resueltas

Añadir lista paginada, detalle editable, corrección con revisión y borrado confirmado a /voice. Sin ruta/deep-link extra, búsqueda/etiquetas/orden nuevos ni autosave. Datos servidor solo Query, borrador local separado. Resolver conflictos sin sobrescribir. Décima tarea I2: control de avance por Junie tras MERGED; continúa T-036 sin retorno rutinario a frontera.

## Leer antes

1. [S-105 v2](../specs/S-105-voice-notes.md).
2. [client/AGENTS](../../client/AGENTS.md).
3. [TESTING](../TESTING.md).
4. [Implementer](../agents/implementer.md).
5. [Arquitectura frontend](../ARCHITECTURE.md).

AGENTS raíz, STATUS y protocolo del rol son entrada común; no recorrer docs por rutina.

## Archivos y pasos

Rutas nuevas de backend bajo server/src/main/java/com/example/devnotes/ y sus tests bajo server/src/test/java/com/example/devnotes/; frontend bajo client/src/. features/voice/VoiceLibrary.tsx y VoiceLibrary.test.tsx; VoicePage.tsx, VoiceComposer.tsx, useVoiceDraft.ts y VoicePage.test.tsx. Reutilizar api/hooks, sin cliente paralelo.

1. Lista20 por página con fecha/hora local, excerpt escapado, orden fijo y carga/vacío/error; selección obtiene detalle, no reconstruye texto desde extracto.
2. PUT con expectedRevision, dirty comparado con ACK y creación inmutable. Seleccionar/Nueva con dirty pide resolver guardado/descarte; nota guardada no se puede reemplazar grabando.
3. DELETE con diálogo y revisión, sin borrado optimista; invalidación y recuperación de última página vacía. 409/404 de detalle no eliminan borrador.

## Aceptación y pruebas

Varias notas del mismo día, reload/reopen preserva texto editado; lista no expone texto completo. Guardar limpio no muta. Conflicto ofrece copiar/recargar con confirmación/nueva copia, no retry automático. Cancelar delete no pide API; error conserva fila/texto;204 invalida y ajusta página. Cargas tardías no cambian selección ni dueño. Teclado y375 px.

- Iteración desde client/, Node 24/npm del lock: `npm test -- --run src/features/voice/VoiceLibrary.test.tsx src/features/voice/VoicePage.test.tsx src/features/voice/VoiceComposer.test.tsx`. Son nombres de pruebas que esta tarea debe crear/conservar; **no** evidencia de ejecución actual. Backend clean verify incluye IT PostgreSQL/Failsafe/JaCoCo; test solo no los acredita.
- Gate esperado **APPLICATION** desde raíz/Git Bash: `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t035 STARTER_E2E_PROJECT=starter-e2e-t035 STARTER_SERVER_TESTS=container bash scripts/verify.sh`. El diff completo manda: si incorpora configuración/tooling/dependencias, STARTER según TESTING. FULL una vez al cierre de fuentes; dirigidos durante iteración, sin rebajar suites/umbrales/retries/deadlines.
- Antes de operación larga: namespaces libres, SHA/base, huellas antes/después, comando/log saneado, recursos y cleanup exacto en checkpoint. No tocar starter-dev-local-nginx, volúmenes ajenos ni secretos; PowerShell usa el verificador canónico de SETUP con PATH Node/exit preservados.
- Antes de publicar: `node scripts/docs-check.mjs`, `git diff --check`, `bash scripts/verify.sh --policy origin/main` y revisar también diff sin commit. Markdown de cierre conserva gate si base/fuentes coinciden.

## Checkpoint vigente

2026-11-09: PR40 publicado (467184c), in_review. Junie implementer, Qwen3.6-27B-FP8. Client gate OK: typecheck, lint, format, 456/456 tests (78.18% statements, 71.85% branches), build OK. VoiceLibrary.test.tsx 8/8, VoiceComposer.test.tsx 5/5.
2026-11-09: Revisión independiente: CAMBIOS REQUERIDOS, 2 bloqueantes. Junie reviewer, Qwen3.6-27B-FP8. HEAD 467184c, base main 085dc76. Client gate verificado: typecheck OK, lint OK, 456/456 tests OK, build OK. Bloqueantes: B-1 diálogo de conflicto 409 nunca se abre (VoiceComposer.tsx setShowConflictDialog(true) ausente), B-2 diálogo de dirty nunca se abre al cambiar de nota (VoicePage.tsx handleSelect sin verificar isDirty, setShowDirtyDialog(true) ausente). Siguiente: corrección de bloqueantes en misma rama/PR, nueva sesión implementer.
2026-11-09: Segunda revisión independiente: CAMBIOS REQUERIDOS, 3 bloqueantes. Junie reviewer, Qwen3.6-27B-FP8. HEAD 467184c, base main 085dc76. Client gate verificado: typecheck OK, lint OK, VoiceLibrary.test.tsx 8/8, VoiceComposer.test.tsx 5/5, build OK. Bloqueantes previos B-1 y B-2 persisten sin corrección (no hay commit de corrección en la rama). B-3 adicional: setUpdateError(true) y setDeleteError(true) nunca se invocan en VoiceComposer.tsx — los mensajes de error de actualización y borrado son invisibles. Además, loadNote() en useVoiceDraft.ts silencia el dirty (return prev) sin notificar al caller que la carga fue rechazada. VoicePage.test.tsx no existe aunque la tarea lo requiere. Siguiente: corrección de los 3 bloqueantes en misma rama/PR, nueva sesión implementer.
2026-11-09: Correcciones publicadas en 48b35c1: B-1 useEffect en VoiceComposer.tsx, B-2 forwardRef + useImperativeHandle, B-3 puente de errores, loadNote devuelve boolean, VoicePage.test.tsx con 6 tests.
2026-11-09: Tercera revisión independiente: CAMBIOS REQUERIDOS, 2 bloqueantes persistentes. Junie reviewer, Qwen3.6-27B-FP8. HEAD 48b35c1, base main 085dc76. Client gate verificado: typecheck OK, lint OK, 19/19 tests OK (VoiceLibrary 8, VoiceComposer 5, VoicePage 6). B-1 NO corregido: useVoiceDraft.ts establece conflictResolution: 'none' en el handler de 409 (líneas 279 y 328), pero el useEffect de VoiceComposer.tsx (línea 134) abre el diálogo solo cuando conflictResolution !== 'none'. Como 409 establece 'none' (el mismo valor inicial), el useEffect no detecta cambio y el diálogo nunca se abre. Corrección necesaria: el handler de 409 debe establecer conflictResolution en un valor distinto de 'none' (p. ej., añadir 'pending' al tipo ConflictResolution) para que el useEffect detecte el cambio y abra el diálogo. B-2 corrección parcial: el diálogo de dirty se abre correctamente al cambiar de nota con cambios sin guardar, y Cancelar/Descartar funcionan. Sin embargo, "Guardar y continuar" en VoicePage.tsx (handleDirtySaveAndContinue, línea 49-54) invoca save() y cierra el diálogo, pero nunca cambia selectedId a pendingSelectId tras completar el guardado. No existe mecanismo (ni useEffect en VoiceComposer ni callback) para notificar a VoicePage que save completó. B-3 corregido: el puente de errores (useEffect líneas 140-147) setea correctamente updateError/deleteError cuando mutaciones fallan con no-409. Límite de dos rondas de revisión alcanzado: checkpoint al dueño con propuesta de corrección.
2026-11-09: Decisión de frontera y corrección local (sin publicar). Claude Opus 5.5 (frontera + implementer por pedido del dueño), Claude Code desktop. Base HEAD c3bb945 / main 085dc76. Ver «Decisiones de frontera (tras 3.ª revisión)». Client gate `npm run verify` OK: typecheck, lint, format, 468/468 tests (81.14% statements, 75.27% branches), build OK. VoicePage.test.tsx 12/12 integrado (composer/hook/library reales + MSW; solo se sustituye el grabador). Impacto: solo UI /voice; sin cambios de API, permisos ni datos. Siguiente: commit + push en PR40 y nueva revisión independiente en otra sesión (supera las dos rondas: requiere autorización del dueño). docs-check OK y `git diff --check` OK. No ejecutado: FULL/E2E ni `--policy origin/main`.

## Decisiones de frontera (tras 3.ª revisión)

- **B-1 → opción B (estado explícito), no A.** `conflictResolution` mezclaba el hecho (hay 409) con la acción elegida; añadir `'pending'` dejaba la misma ambigüedad. `useVoiceDraft` expone `conflict: 'update' | 'delete' | null`; el diálogo usa `open={draft.state.conflict != null}`, sin estado espejo ni `useEffect`. Acciones: `dismissConflict`, `detachAsNewNote` (Nueva nota con ese texto → POST) y Recargar con paso de confirmación que hace `fetchQuery` del detalle y `loadNote(detail, { force: true })`. Copiar no cierra el conflicto. Sin reintento automático. 409 de DELETE abre el mismo diálogo.
- **B-2 → opción A (`save(): Promise<SaveOutcome>`).** Guardar y continuar es secuencial; una promesa con resultado (`saved | conflict | error | skipped`) lo expresa sin callbacks ni estado derivado. VoicePage solo cambia de destino con `saved`; 409/error se quedan en la nota actual con el conflicto o error visible. `deleteNote()` devuelve `DeleteOutcome` igual; los errores de UI salen del resultado (sustituye el puente de B-3).
- Destino pendiente unificado (`{ kind: 'note', id } | { kind: 'new' }`) y botón **Nueva nota** en VoicePage con el mismo diálogo (paso 2 del contrato, faltaba).
- 404 al borrar conserva el texto como borrador nuevo sin guardar (paso 3: 404 no elimina borrador).
- VoicePage.test.tsx pasa a integración real: el mock del composer ocultó B-1/B-2 en tres rondas.

## Correcciones significativas

Corrección local 2026-11-09 (Claude Opus 5.5): (1) B-1/B-2 según decisiones anteriores; rojo previo 9/12 en VoicePage.test.tsx, verde 12/12. (2) `useImperativeHandle` con deps `[isDirty, reset]` guardaba un `save` con texto viejo (primera tecla); ahora depende de `handleSave`; cubierto por «Guardar y continuar guarda el texto vigente». (3) Bucle de render infinito heredado de T-034 (también en main): efecto de sincronización de captura dependía de `draft` (objeto nuevo en cada render); ahora depende de `setCaptureState`; detectado al montar el composer real (worker colgado). (4) Mensaje de error no-409 decía «modificada por otra sesión»; ahora «No se pudieron guardar los cambios». (5) Guardado que recibe ACK con texto editado durante el vuelo queda dirty. (6) `useVoiceNotes.test.tsx` intermitente desde T-032 (3/5 fallos aislado): `isSuccess` leído antes de que el observer publique; `waitFor` sin quitar aserciones, 6/6 verde.


Corrección 48b35c1 (no suficiente): B-1 useEffect para conflicto 409 — el handler de 409 en useVoiceDraft.ts establece conflictResolution: 'none' (mismo valor inicial), por lo que el useEffect no detecta cambio. Causa: falta un estado intermedio (p. ej., 'pending') en ConflictResolution para señalar que hay un 409 pendiente de resolver. B-2 forwardRef + useImperativeHandle — el diálogo de dirty se abre, pero "Guardar y continuar" no cambia la nota porque no hay mecanismo para notificar a VoicePage que save completó. B-3 puente de errores — corregido, setUpdateError/setDeleteError se invocan cuando mutaciones fallan con no-409.

## Cierre y siguiente tarea

Un PR de esta tarea con staging de rutas explícitas, sin plantilla/ ni ficheros de trabajo ajenos. No done hasta GitHub MERGED confirmado, revisión independiente y gate/CI vigentes. Tras MERGED, nueva sesión concilia done y toma T-036 tras MERGED; no comenzar otra implementación en la sesión de cierre. Si falta decisión fuera del contrato, checkpoint con evidencia/dato necesario; no rediseñar ni repetir intentos equivalentes.
