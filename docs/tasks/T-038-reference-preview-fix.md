---
id: T-038
status: in_review
priority: P1
size: S
executor: junie
role: implementer
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

## Checkpoint vigente

2026-11-09, Claude Opus 5.5 (implementer, sesión iniciada por la sesión de merge de T-035), Claude Code desktop. Rama `codex/t-038-reference-preview-fix`, base main `e1fbaea`. Impacto: solo UI del editor diario (inserción de referencia); sin cambios de API, permisos ni datos. T-035 conciliada done (PR40 MERGED comprobado con `gh pr view 40`).

Hecho: rojo ReferenceInsertion.test.tsx 0/2 (`RangeError: Position 12 out of range` y átomo desplazado a «líne|a») → 2/2 con el arreglo. Dirigidas daily 44/44. Client gate `npm run verify` exit 0: typecheck, lint, format, 499/499 tests (86.1% statements, 80.32% branches), build. E2E dirigido `scripts/e2e.sh --grep "reference preview:"` desktop **passed** y mobile **passed** (exit 0, proyecto `starter-e2e-t038`, limpiado por el script). `docs-check` OK, `git diff --check` OK.

FULL **APPLICATION** (`--policy origin/main` → FULL/APPLICATION) sobre HEAD de código `9e89f8a`, base main `e1fbaea`, 2026-11-10T02:01Z–02:29Z: docs OK, server 210/210 OK (BUILD SUCCESS), client OK, e2e OK (41 passed, 0 failed, desktop + mobile, incluido `reference preview:`), exit 0. Log local fuera del repo. Cleanup: el script retiró contenedores/volúmenes E2E; quedaban `starter-verify-t038_m2-cache` y la red `starter-verify-t038_default`, retirados por nombre/label exacto; ambos namespaces quedan vacíos. PR [41](https://github.com/MatiasNicolasAcevedo/devnotes/pull/41) publicado; cierre solo documental posterior conserva el FULL (mismas fuentes/base). Siguiente: revisión independiente en sesión nueva.

## Correcciones significativas

| Fecha | Problema/causa | Arreglo | Evidencia |
| --- | --- | --- | --- |
| 2026-11-09 | Picker no se cerraba tras elegir resultado. Causa: `handleReferenceSelect` hacía `deleteRange({from,to})` y luego `insertContentAt(to)` con la posición previa al borrado; al final del documento `to` queda fuera de rango (`RangeError: Position 12 out of range`) y la cadena aborta antes de cerrar el picker; con texto posterior el átomo caía desplazado dentro del texto siguiente. Defecto de producto (T-025), no de la prueba. | `insertContentAt({from,to}, átomo)` reemplaza el rango en un paso. Spec sin `force: true` en el clic. | Trace E2E desktop sobre `e1fbaea`: pageError `RangeError: Position 12 out of range` en `insertContentAt` ← `onClick` del picker. ReferenceInsertion.test.tsx 0/2 → 2/2. |
| 2026-11-09 | Con el picker reparado, el spec fallaba en `:89`: los pasos 7 y 13 decían «recargar nota» pero hacían `page.reload()` sobre `/reference` (donde se acababa de editar/borrar), así que `@Referencia Editada`/«Referencia no disponible» no podían aparecer. Pasos nunca ejecutados desde T-026 porque el recorrido moría en `:53`. Defecto de la prueba. | Navegar a Notas (`toHaveURL(/notes/)`) y luego recargar, como pide T-026 («tras reabrir»/«tras recarga»); sin cambiar aserciones ni timeouts. | E2E dirigido desktop: fallo en `:89` con la página en /reference → passed; mobile passed. |

## Cierre y siguiente tarea

Un PR de esta tarea con staging de rutas explícitas, sin plantilla/ ni ficheros de trabajo ajenos. No done hasta GitHub MERGED confirmado, revisión independiente y gate/CI vigentes. Tras MERGED, nueva sesión concilia done y toma T-036; no comenzar otra implementación en la sesión de cierre.
