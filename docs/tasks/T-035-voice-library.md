---
id: T-035
status: in_progress
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

2026-11-09: PR40 publicado (467184c), in_review. Junie implementer, Qwen3.6-27B-FP8. Client gate OK: typecheck, lint, format, 456/456 tests (78.18% statements, 71.85% branches), build OK. VoiceLibrary.test.tsx 8/8, VoiceComposer.test.tsx 5/5. Siguiente: revisión independiente.

## Correcciones significativas

Sin correcciones de implementación. Registrar aquí únicamente problema/causa, arreglo y prueba/SHA cuando ocurran.

## Cierre y siguiente tarea

Un PR de esta tarea con staging de rutas explícitas, sin plantilla/ ni ficheros de trabajo ajenos. No done hasta GitHub MERGED confirmado, revisión independiente y gate/CI vigentes. Tras MERGED, nueva sesión concilia done y toma T-036 tras MERGED; no comenzar otra implementación en la sesión de cierre. Si falta decisión fuera del contrato, checkpoint con evidencia/dato necesario; no rediseñar ni repetir intentos equivalentes.
