---
id: T-038
status: done
priority: P1
size: S
executor: junie
role: merger
milestone: M2
product_cycle: I2
spec: S-106
branch: codex/t-038-reference-preview-fix
pr: 41
depends_on: [T-035]
---
# T-038 · Reparar inserción de referencia con @ (E2E reference-preview)

## Objetivo

Bugfix preexistente decidido por el dueño el 2026-11-09 al mergear T-035 con excepción: `e2e/tests/reference-preview.spec.ts` (T-026) falla en desktop y mobile también sobre main `085dc76`/`e1fbaea`; tras elegir el primer resultado del picker, `[data-reference-picker]` sigue visible (`:53`). Diagnosticar, corregir sin rebajar la prueba y dejar el FULL verde antes de T-036. Siguiente: T-036 tras MERGED.

## Alcance y decisiones resueltas

- Diagnóstico de causa (producto o prueba) con evidencia; si es producto, prueba de cliente roja primero y arreglo mínimo. Sin cambios de API, permisos, datos ni dependencias.
- No rebajar aserciones, timeouts, retries ni deadlines; no usar `force: true` para tapar un problema real de interacción.
- En la misma tarea: TESTING «Tiempos de E2E» mostraba `node scripts/run-e2e.mjs … --grep`, que falla por `STARTER_E2E_ARTIFACTS` ausente; documentar `bash scripts/e2e.sh --grep … --project desktop|mobile`.
- Fuera de alcance: bucle de transcripción de VoiceComposer (asignado a T-036) y prueba de la guarda `prev.conflict` de T-035 (BACKLOG).

## Leer antes

1. [S-106](../specs/S-106-reference-links.md) y [T-025](T-025-reference-insertion.md)/[T-026](T-026-reference-preview.md) solo para el contrato de inserción.
2. [client/AGENTS](../../client/AGENTS.md), [TESTING](../TESTING.md), [Implementer](../agents/implementer.md).

## Archivos y pasos

`client/src/features/daily/editor/DailyEditor.tsx` (`handleReferenceSelect`), nuevo `client/src/features/daily/editor/ReferenceInsertion.test.tsx`, `e2e/tests/reference-preview.spec.ts`, `docs/TESTING.md`.

1. Reproducir con `scripts/e2e.sh` e inspeccionar trace/captura en `e2e/artifacts/<proyecto>/`.
2. Prueba de componente roja (Testing Library + MSW, providers reales): `@consulta` al final del documento y `@consulta` con texto posterior.
3. Arreglo mínimo; quitar el `force: true` del clic del spec para que el E2E exija accionabilidad real.
4. Corregir el ejemplo de iteración de TESTING.

## Aceptación y pruebas

- Elegir un resultado (mouse o Enter) reemplaza exactamente `@consulta` por el átomo, cierra el picker y conserva el texto anterior/posterior; sin excepciones en consola.
- Rojo → verde desde `client/`: `npx vitest run src/features/daily/editor/ReferenceInsertion.test.tsx`.
- Dirigidas desde `client/`: `npx vitest run src/features/daily/editor/ReferenceInsertion.test.tsx src/features/daily/editor/DailyEditor.test.tsx src/features/daily/ReferencePreview.test.tsx src/features/daily/DailyNotesPage.test.tsx`.
- E2E dirigido desde raíz/Git Bash, ambos proyectos: `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example STARTER_E2E_PROJECT=starter-e2e-t038 bash scripts/e2e.sh --grep "reference preview:" --project desktop` (y `--project mobile`).
- Gate client: `npm run verify` en `client/`.
- Gate de cierre **APPLICATION** (según `bash scripts/verify.sh --policy origin/main`): `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t038 STARTER_E2E_PROJECT=starter-e2e-t038 STARTER_SERVER_TESTS=container bash scripts/verify.sh`. Una vez, sin editar fuentes durante la corrida.
- Antes de publicar: `node scripts/docs-check.mjs`, `git diff --check`.

## Evidencia de implementación

2026-11-09, Claude Opus 5.5 (implementer, sesión iniciada por la sesión de merge de T-035), Claude Code desktop. Rama `codex/t-038-reference-preview-fix`, base main `e1fbaea`. Impacto: solo UI del editor diario (inserción de referencia); sin cambios de API, permisos ni datos. T-035 conciliada done (PR40 MERGED comprobado con `gh pr view 40`).

Hecho: rojo ReferenceInsertion.test.tsx 0/2 (`RangeError: Position 12 out of range` y átomo desplazado a «líne|a») → 2/2 con el arreglo. Dirigidas daily 44/44. Client gate `npm run verify` exit 0: typecheck, lint, format, 499/499 tests (86.1% statements, 80.32% branches), build. E2E dirigido `scripts/e2e.sh --grep "reference preview:"` desktop **passed** y mobile **passed** (exit 0, proyecto `starter-e2e-t038`, limpiado por el script). `docs-check` OK, `git diff --check` OK.

FULL **APPLICATION** (`--policy origin/main` → FULL/APPLICATION) sobre HEAD de código `9e89f8a`, base main `e1fbaea`, 2026-11-10T02:01:37Z–02:29:43Z. Exit 0 en docs (5 s), backend (448 s, Failsafe 210/210 y BUILD SUCCESS), client (108 s) y E2E (1125 s, 21 desktop + 20 mobile, incluido `reference preview:` en ambos). Extracto saneado local en `.orchestrator/t038/full-gate-evidence.log`, recuperado de `full-gate.log` (SHA-256 `cb8ac457908c2ae7ebe0adf5d24ad4cfcd332fd6e65200661c6550883e244d9b`). Cleanup: el script retiró contenedores/volúmenes E2E. El implementer retiró `starter-verify-t038_m2-cache` y `starter-verify-t038_default` por nombre/label exacto y comprobó ambos namespaces vacíos.

Huellas reconstruidas de la corrida original. `git status --short` dio vacío antes del arranque y después del exit 0, antes del cierre documental. El log imprimió al arranque `HEAD 9e89f8a2892f8c8aa9a48648dca8bd827ffc544b`. El reflog de la rama ubica el mismo commit al término de la corrida, antes de `95e686b`, con árbol `7e7c91b4198e084839eb80ffcb733970a1951986` y padre `e1fbaea1ca3ae868dd2ca93569da45eab65aa413`. La comparación con el cierre documental verifica que solo cambió Markdown.

## Primera revisión independiente

2026-11-09. Reviewer independiente, Codex (GPT-6, CLI PowerShell/Git/gh/Vitest, esfuerzo no expuesto). PR41, HEAD revisado `95e686be3cb01e043785b28c1b6f3d406aaa9566`, base `e1fbaea1ca3ae868dd2ca93569da45eab65aa413`. Sin impacto adicional en comportamiento, API, permisos, datos ni UI por la revisión.

`node node_modules/vitest/vitest.mjs run src/features/daily/editor/ReferenceInsertion.test.tsx src/features/daily/editor/DailyEditor.test.tsx src/features/daily/ReferencePreview.test.tsx src/features/daily/DailyNotesPage.test.tsx` desde `client/`: 44/44. En copia aislada de `95e686b`, sustituir solo `DailyEditor.tsx` por el blob de `e1fbaea` y ejecutar `ReferenceInsertion.test.tsx` dio 0/2: `RangeError: Position 12 out of range` con picker abierto, y átomo entre «líne» y «a». La inserción por rango corrige ambas consecuencias. Los pasos 7/13 reabren Notas antes de recargar y conservan las aserciones, los timeouts y el recorrido de historial. `docs-check` y `git diff --check e1fbaea...95e686b` OK. GitHub `verify-required` SUCCESS sobre el HEAD revisado ([run](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/42743282126)). El clasificador dio FULL/APPLICATION. `git diff --name-status 9e89f8a 95e686b` mostró solo Markdown.

1. **B-1 · Comando de iteración contradictorio.** La tabla de [TESTING](../TESTING.md#comandos) todavía presenta `node scripts/run-e2e.mjs ... --grep` como comando de iteración. «Tiempos de E2E» corrige el ejemplo y desaconseja esa invocación, que por sí sola no configura `STARTER_E2E_ARTIFACTS` ni prepara el stack. Cierre: la tabla y la sección apuntan a `bash scripts/e2e.sh --grep "patrón" --project desktop`, con `mobile` como alternativa de proyecto.
2. **B-2 · Trazabilidad del FULL.** El resumen identifica el código, la base, las suites y el cleanup. «Log local fuera del repo» no identifica la salida saneada ni constan las huellas antes/después exigidas por [TESTING](../TESTING.md#cuándo-ejecutar-full). Cierre: referenciar el log saneado localizable y registrar las huellas de la corrida que acrediten las fuentes contra `9e89f8a` y `e1fbaea`. Conservar esa ejecución si se recupera la evidencia y coinciden fuentes/base. Si falta evidencia indispensable, revalidar según TESTING.

## Checkpoint vigente

2026-11-10. Segunda revisión independiente, Codex (GPT-6, PowerShell/Git/gh/Node/Vitest, esfuerzo no expuesto). PR41, HEAD de entrada `9c1bcd9d5c546cb85d5f2888dd917294ec549a86`, base `e1fbaea1ca3ae868dd2ca93569da45eab65aa413`. La revisión modifica solo documentación operativa, sin impacto adicional en comportamiento, API, permisos, datos ni UI.

- B-1 cerrado. La tabla de TESTING y los ejemplos de iteración usan `bash scripts/e2e.sh --grep "patrón" --project desktop`, con `--project mobile` para móvil.
- B-2 cerrado. El SHA-256 calculado sobre `full-gate.log` coincide con la huella registrada. El original confirma el HEAD al arrancar, las cuatro suites con exit 0 y 41 E2E aprobados (21 desktop, 20 mobile, con `reference preview:` en ambos). Las sondas del registro de implementación dieron árbol limpio a las 02:01:30Z y 02:29:56Z. El reflog, el árbol y el padre del commit coinciden con la evidencia de implementación. Se conserva ese FULL/APPLICATION: la base publicada coincide y `git diff --raw 9e89f8a HEAD` solo muestra Markdown de documentación.
- `bash scripts/verify.sh --policy origin/main` devolvió FULL/APPLICATION. Las cuatro suites dirigidas de cliente indicadas en la primera revisión pasaron 44/44. `node scripts/docs-check.mjs` y `git diff --check` pasaron. En el HEAD de entrada, [verify-required](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/42747081032) terminó SUCCESS.

Conciliación en T-036, 2026-11-10: `gh pr view 41 --repo MatiasNicolasAcevedo/devnotes --json number,url,state,mergedAt,mergeCommit,headRefOid,baseRefName` confirmó PR41 MERGED en `main`, HEAD `ea1b96c2601104b9af16f033561008c9df4477a3`, squash `a6210050f0e4c9a8ff98df62c50dbb4aebd995de` a las 03:13:52Z. `gh pr checks 41` confirmó [verify-required SUCCESS](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/42747853848/job/129604151608).

## Correcciones significativas

| Fecha | Problema/causa | Arreglo | Evidencia |
| --- | --- | --- | --- |
| 2026-11-09 | Picker no se cerraba tras elegir resultado. Causa: `handleReferenceSelect` hacía `deleteRange({from,to})` y luego `insertContentAt(to)` con la posición previa al borrado; al final del documento `to` queda fuera de rango (`RangeError: Position 12 out of range`) y la cadena aborta antes de cerrar el picker; con texto posterior el átomo caía desplazado dentro del texto siguiente. Defecto de producto (T-025), no de la prueba. | `insertContentAt({from,to}, átomo)` reemplaza el rango en un paso. Spec sin `force: true` en el clic. | Trace E2E desktop sobre `e1fbaea`: pageError `RangeError: Position 12 out of range` en `insertContentAt` ← `onClick` del picker. ReferenceInsertion.test.tsx 0/2 → 2/2. |
| 2026-11-09 | Con el picker reparado, el spec fallaba en `:89`: los pasos 7 y 13 decían «recargar nota» pero hacían `page.reload()` sobre `/reference` (donde se acababa de editar/borrar), así que `@Referencia Editada`/«Referencia no disponible» no podían aparecer. Pasos nunca ejecutados desde T-026 porque el recorrido moría en `:53`. Defecto de la prueba. | Navegar a Notas (`toHaveURL(/notes/)`) y luego recargar, como pide T-026 («tras reabrir»/«tras recarga»); sin cambiar aserciones ni timeouts. | E2E dirigido desktop: fallo en `:89` con la página en /reference → passed; mobile passed. |

## Cierre y siguiente tarea

Un PR de esta tarea con staging de rutas explícitas, sin plantilla/ ni ficheros de trabajo ajenos. No done hasta GitHub MERGED confirmado, revisión independiente y gate/CI vigentes. Tras MERGED, nueva sesión concilia done y toma T-036; no comenzar otra implementación en la sesión de cierre.
