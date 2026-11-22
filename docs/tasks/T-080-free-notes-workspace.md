---
id: T-080
status: changes_requested
priority: P1
size: M
milestone: M7
spec: S-113
depends_on: [T-079]
branch: codex/t-080-free-notes-workspace
role: implementer
executor: frontier
pr: 83
---

# T-080 · Libres desde Notas

## Objetivo

Libres desde Notas con el recorrido observable descrito en la aceptación.

## Alcance

Publicar REST sobre el servicio probado y entrada Libres, lista y editor de título/párrafos en rutas privadas. Reusar HTTP, espacio y guardias. Conservar fecha al volver al diario. [Contrato S-113](../specs/S-113-free-notes.md) · [Diseño y previsualización](../design/WRITING-WORKSPACES.md).

## Aceptación y pruebas

Crear, renombrar, recargar y borrar a 320/768. POST/PUT inválidos, revisión stale, CSRF y ajeno preservan datos. Navegación limpia el caché privado; guardar o descartar afecta solo al borrador correcto.

- Desde `server/` con Git Bash y JDK 21, con PostgreSQL Testcontainers. `./mvnw -q verify -Dtest=FreeNoteDocumentTest -Dit.test=FreeNoteApiIT,FreeNoteServiceIT -Djacoco.skip=true`. Registrar las fases y cantidad ejecutada. El comando dirigido no acredita la cobertura agregada.
- Desde `client/`. `npm test -- --run src/app/AppRoutes.test.tsx src/features/free-notes` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t080-desktop bash scripts/e2e.sh --grep 'free-notes: lifecycle' --project desktop`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t080-mobile bash scripts/e2e.sh --grep 'free-notes: lifecycle' --project mobile`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

2026-11-22. Ronda 1 de revisión independiente por frontera reviewer en Codex Desktop con GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git, gh, Git Bash, JDK 21, Node 24 y Docker Desktop. Veredicto **CAMBIOS REQUERIDOS** en [PR #83](https://github.com/MatiasNicolasAcevedo/devnotes/pull/83). HEAD revisado `9839bf9ce2760b1585e2639ae3921c63cccd0067`, base `main@7a700175b98669c3a1d9457150df4230279f2c62`. Impacto de la corrección acotado al estado del editor de Libres y a la revisión que envía al guardar.

- Precondición. `gh pr view 83 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup` (exit 0) confirmó OPEN, listo y `verify-required` SUCCESS en la corrida vigente `44982782617`, con una corrida anterior cancelada. `git log -1 --format=%H -- docs/STATUS.md` coincidió con el HEAD remoto. `git rev-parse HEAD^` devolvió `1e1c24509bcc0abeaf10b7565eb085428ec5da3c`. También se verificó PR 82 MERGED en la base declarada.
- Evidencia del candidato. El diff `HEAD^..HEAD` solo modificó STATUS y esta tarea. `git diff --exit-code HEAD^ HEAD -- server client e2e` y `git diff --exit-code 89d1c882eb187bced730e7df24cde898c1061e7b HEAD -- server` devolvieron 0. La evidencia del implementer está en el checkpoint de `9839bf9`.
- PostgreSQL 18.6. En `server/`, `./mvnw -q verify -Dtest=FreeNoteDocumentTest -Dit.test=FreeNoteApiIT,FreeNoteServiceIT -Djacoco.skip=true` (exit 0), 16 Surefire y 11 Failsafe (4 API, 7 servicio). Incluye aislamiento por cuenta y espacio, CSRF, cursores, recibo idempotente, revisiones y negativos de entrada.
- Cliente. `npm test -- --run src/app/AppRoutes.test.tsx src/features/free-notes` (exit 0, 26 pruebas), `npm run typecheck` (exit 0). Pasaron la guardia de cambio de espacio y cierre de sesión, la limpieza de caché privada y la confirmación para abrir una revisión reciente.
- Playwright. `STARTER_E2E_PROJECT=starter-e2e-t080-review-9839-desktop bash scripts/e2e.sh --grep 'free-notes: lifecycle' --project desktop` y `STARTER_E2E_PROJECT=starter-e2e-t080-review-9839-mobile bash scripts/e2e.sh --grep 'free-notes: lifecycle' --project mobile` (exit 0 cada uno, 2/2 por proyecto). Incluyen ciclo privado a 768/320 CSS px, guardia, foco en Nueva nota tras borrar la última fila y retorno al Diario con su fecha tras recargar. El control por etiqueta exacta dio cero contenedores, volúmenes y redes en ambos proyectos.
- Documentos. `node scripts/docs-check.mjs` (exit 0, checkout aislado), `git diff --check 7a700175..HEAD` (exit 0) y `bash scripts/verify.sh --policy origin/main` (exit 0, APPLICATION / FULL, solo clasificación).

### Hallazgo y condición de cierre

[P2] Al reabrir una nota guardada, el editor usa una revisión anterior. Tras un PUT exitoso, `useFreeNotesScope.ts:29` invalida el detalle sin refrescarlo. `FreeNotesPage.tsx:35` monta el editor con los datos anteriores de la caché, y el formulario, TipTap y la revisión de `FreeNoteEditor.tsx:58` se inicializan con esa respuesta. El GET posterior actualiza la consulta, pero el editor permanece con el estado anterior. La regresión observó «Original» después de que el directorio y el GET ya tenían «Renombrada», revisión 2. El siguiente PUT envió 1 y recibió 409. El E2E publicado recarga el navegador tras renombrar y no recorre esta transición.

**Condición de cierre.** Al guardar un cambio de título y cuerpo, volver a Libres y reabrir sin recargar, mostrar ambos valores confirmados y guardar una segunda edición con la revisión del primer PUT. Un refetch durante la edición debe preservar el borrador y un 409 auténtico debe seguir ofreciendo recuperación con confirmación. Incorporar una prueba que falle sobre el candidato revisado y pase con la corrección.

Evidencia roja independiente. `npm test -- --run src/features/free-notes/ReviewerReopen.probe.test.tsx` (exit 1, una prueba). La prueba temporal usó rutas y providers reales con MSW, y comprobó que la caché había recibido la revisión 2 antes de observar título anterior y revisiones enviadas `[1, 1]` en vez de `[1, 2]`. Se retiró el archivo temporal tras la ejecución.

Pendiente: implementer independiente sobre el mismo PR. FULL/STARTER: DIFERIDO POR EL DUEÑO. Render Auto-Deploy On Commit.
