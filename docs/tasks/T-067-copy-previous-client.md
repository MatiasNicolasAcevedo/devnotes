---
id: T-067
status: in_progress
priority: P1
size: M
milestone: M5
spec: S-110
depends_on: [T-066]
branch: codex/t-067-copy-previous-client
role: implementer
executor: frontier
pr: null
---

# T-067 · Empezar el día desde una nota anterior

## Objetivo

Ofrecer copia explícita con fecha/espacio visibles y dejar la nota lista para editar con un gesto.

Habilitada con [T-066 MERGED y conciliada](T-066-copy-previous-api.md#conciliación). Contrato completo en S-110. Cada tarea y revisión usa una sesión independiente.

## Alcance y decisiones resueltas

Franja contextual vacía, sugerencia/carga/ausencia/error, POST único y ACK coordinado. Ignorar GET obsoleto por typing/contexto; bloquear durante copia. Undo como operación del editor, sin autosave duplicado. Diferenciar portapapeles.

El contrato autoriza desarrollo local con fixtures. Deploys, variables/sonda en Render y ensayo remoto requieren autorización del dueño sobre SHA y ventana concretos.

## Leer antes

1. [Contrato S-110](../specs/S-110-previous-day-copy.md).
2. [server/AGENTS](../../server/AGENTS.md).
3. [client/AGENTS](../../client/AGENTS.md).
4. [Pruebas y excepción I5](../TESTING.md#excepción-i5-del-2026-11-12).
5. [Entorno Windows/Git Bash](../SETUP.md#requisitos-del-host).

## Archivos y pasos

Nuevo `client/src/features/daily/CopyPreviousNote.tsx`/test; `daily/api.ts`, `DailyNotesPage.tsx`, coordinador/editor ACK/undo; `e2e/tests/copy-previous.spec.ts` prefijo `copy previous:`.

1. Confirmar dependencias remotas, main/HEAD/base y cambios locales; registrar rol/modelo/herramienta/esfuerzo expuestos e impacto sobre comportamiento/API/permisos/datos/UI.
2. Añadir los casos de abajo: reglas críticas con negativos, bugfix primero rojo. Implementar solo este resultado, conservando contratos compatibles.
3. Ejecutar pruebas seleccionadas y checks de cierre; guardar comandos/exit y evidencia saneada. Resolver correcciones ordinarias; decisiones fuera del contrato vuelven a frontera.
4. Publicar commit/PR con rutas explícitas y footer Refs; actualizar STATUS para revisión independiente. No ejecutar la tarea siguiente en esta sesión.

## Aceptación y pruebas

CP-01…08: teclado/táctil, fecha, ausencia/error, fuente cambiada, destino remoto no vacío, typing durante GET, red perdida, logout/espacio, undo/reload. Android sin comprimir toolbar; origen/versión intactos.

Desde `client/`, Node >=24/npm del proyecto:

```bash
npm test -- --run src/features/daily/CopyPreviousNote.test.tsx src/features/daily/api.test.ts src/features/daily/useDailyNote.test.tsx
```

Raíz, Git Bash: `STARTER_E2E_PROJECT=starter-e2e-t067-desktop bash scripts/e2e.sh --grep 'copy previous:' --project desktop` y luego `STARTER_E2E_PROJECT=starter-e2e-t067-mobile bash scripts/e2e.sh --grep 'copy previous:' --project mobile`.

Para cambios client, desde `client/`: `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build`. Son verificaciones estáticas/dirigidas; no ejecutar `npm run verify` como sustitución del gate aplazado.

Los nombres nuevos de tests son archivos/clases que esta tarea debe crear. Confirmar cantidad ejecutada distinta de cero; no usar failIfNoTests=false. IT usa PostgreSQL real; unitarios no acreditan integración. `-Djacoco.skip=true` evita evaluar cobertura global con una selección parcial sin modificar umbrales/configuración; no afirmar cobertura total.

Cierre desde raíz: `node scripts/docs-check.mjs`, `git diff --check` y `node scripts/ci/classify-diff.mjs --base origin/main --head HEAD --phase FULL`. Registrar **FULL/STARTER DIFERIDO POR EL DUEÑO**. No ejecutar FULL, STARTER, tooling completo ni E2E completo hasta solicitud expresa, aunque el clasificador dé FULL/STARTER. CI liviana/revisión independiente siguen obligatorias.

## Checkpoint vigente

Frontera en rol implementer, Codex Desktop (GPT-6, variante y esfuerzo sin exponer), PowerShell, Git, `gh`, Node y Git Bash. La entrega habilita sugerencia y copia explícita en la UI diaria con la API, permisos y datos de S-110. El ACK confirma la copia y el historial local permite deshacerla con autosave.

`gh pr view 69` confirmó MERGED y `git ls-remote origin refs/heads/main` confirmó `efd02e5e7a4016c9c8fee11ce80fbd7a54aa00fb`. `gh pr list --state open` informó cero PR al iniciar. Worktree propio `.orchestrator/t-067`. La implementación y las verificaciones dirigidas están completas. Próximo paso: publicar el código y cerrar el traspaso documental. **FULL/STARTER DIFERIDO POR EL DUEÑO.**

## Evidencia dirigida

- `npm ci --no-audit --no-fund`, exit 0, lockfile sin cambios. Los tres archivos Vitest del contrato pasaron **75/75**, exit 0. Regresión complementaria, **85/85**, exit 0: `npm test -- --run src/features/daily/editor/DailyEditor.test.tsx src/features/daily/DailyNotesPage.test.tsx src/features/daily/DailyDraftNavigation.test.tsx src/features/daily/SaveDailyVersion.test.tsx src/features/spaces/SpaceSelector.test.tsx src/services/http.test.ts`.
- `npm run typecheck`, `npm run lint`, `npm run format:check` y `npm run build`, exit 0. Vite informó el aviso de tamaño del chunk.
- Los dos comandos `copy previous:` de esta tarea pasaron **2/2 desktop y 2/2 mobile**, exit 0 en cada proyecto, con PostgreSQL 18.6 y OIDC ficticio. El harness confirmó ausencia previa y eliminó sus contenedores, redes y volúmenes. Reportes saneados en `e2e/artifacts/starter-e2e-t067-{desktop,mobile}/sanitized/junit.xml` en el worktree propio. Los builds de ambos recorridos produjeron el mismo bundle de cliente. El ajuste posterior de espera en Vitest solo afecta el test de componente.
- CP-01/02/05/07/08: Playwright comprobó selección del viernes, límites de fecha y espacio, preservación del enlace/separador/referencia, revisión y persistencia, origen y versiones intactos, undo, recarga, teclado desktop y toque mobile a 375 px. CP-04: 409 reales por fuente modificada y destino remoto, además de POST único y texto local en Vitest. CP-03/06/07: Vitest comprobó ausencia, error, cambio de fecha/espacio, logout durante POST y respuesta perdida con relectura antes de repetir.

## Correcciones durante la implementación

| Problema | Arreglo y evidencia |
|---|---|
| jsdom no implementa la geometría de `Range` y el click sintético dentro del editor disparó una excepción de `elementFromPoint`. | Geometría de prueba como en DailyEditor.test y foco DOM para la escritura del test. Playwright valida foco mediante teclado y toque reales del navegador. Selección Vitest final 75/75. |
| Al perder el ACK, un destino aún no confirmado podía quedar editable antes de la relectura. | El coordinador conserva la necesidad de recargar por nota y la UI suspende edición y guardado manual hasta recuperar el destino. Negativos de red/409 en Vitest y recarga tras 409 en ambos proyectos Playwright. |

## Cierre y siguiente tarea

Control de cinco tareas de I5: revisar dependencias, evidencia dirigida, integrado diferido y hallazgos en esta tarea; volver a frontera solo por decisión fuera del contrato. No done hasta MERGED comprobado. Tras MERGED confirmado, una nueva sesión concilia esta tarea y vuelve a frontera/dueño para elegir otras propuestas. No inventar la siguiente implementación. No modificar protecciones, incorporar otras propuestas ni desplegar por pasar tests locales.
