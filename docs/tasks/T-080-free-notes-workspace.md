---
id: T-080
status: in_review
priority: P1
size: M
milestone: M7
spec: S-113
depends_on: [T-079]
branch: codex/t-080-free-notes-workspace
role: reviewer
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

2026-11-22. Frontera implementer en Codex Desktop con GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git, gh, Git Bash, JDK 21 y Node 24. Base `main@7a700175b98669c3a1d9457150df4230279f2c62`. Fuentes y pruebas `1e1c24509bcc0abeaf10b7565eb085428ec5da3c`. El commit documental de cierre identifica el HEAD completo con `git log -1 --format=%H -- docs/STATUS.md`.

- Entrada. `gh pr view 82 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit,baseRefName` confirmó MERGED contra main el 2026-11-22T03:30:36Z. `git merge-base --is-ancestor 7a700175b98669c3a1d9457150df4230279f2c62 origin/main` devolvió 0 antes de abrir la rama. `bc5ab11` concilió T-079 y habilitó T-080.
- Impacto. REST privado en `/api/spaces/{space}/free-notes` con GET de página y detalle, POST idempotente y PUT/DELETE con `expectedRevision`. POST recibe `attemptId`, `title` y `document`; PUT recibe título, documento y revisión en JSON; DELETE recibe la revisión por query. Se usa la identidad OIDC, CSRF y el servicio de T-078. La UI incorpora directorio, editor TipTap de párrafos, guardia y retorno a la fecha del Diario. El retorno combina memoria por cuenta y espacio con el parámetro de fecha `from` para conservarla al recargar. Se mantiene el formato XLSX v4 vigente.
- Backend desde `server/`. `./mvnw -q verify -Dtest=FreeNoteDocumentTest -Dit.test=FreeNoteApiIT,FreeNoteServiceIT -Djacoco.skip=true` (exit 0). Surefire 16 y Failsafe 11 (API 4, servicio 7) con PostgreSQL 18.6. Sin fallos, errores ni omisiones.
- Cliente desde `client/`. `npm test -- --run src/app/AppRoutes.test.tsx src/features/free-notes` (exit 0, 26 pruebas); `npm run typecheck` (exit 0) y ESLint dirigido a las rutas modificadas (exit 0).
- Playwright desde raíz. `STARTER_E2E_PROJECT=starter-e2e-t080-desktop bash scripts/e2e.sh --grep 'free-notes: lifecycle' --project desktop` y `STARTER_E2E_PROJECT=starter-e2e-t080-mobile bash scripts/e2e.sh --grep 'free-notes: lifecycle' --project mobile` (exit 0 cada uno, 2/2 por proyecto). Recorrido a 768 y 320 CSS px, con OIDC, API y PostgreSQL del stack. Cleanup por etiqueta exacta con cero contenedores, volúmenes y redes en ambos.
- Gate documental. `node scripts/docs-check.mjs` (exit 0, checkout aislado del candidato publicado). El checkout principal devolvió 1 por el `trailer/CLAUDE.md` preexistente ajeno al PR. `git diff --check origin/main HEAD` (exit 0). `bash scripts/verify.sh --policy origin/main` (exit 0) informó APPLICATION / FULL. `git diff --exit-code 89d1c882eb187bced730e7df24cde898c1061e7b HEAD -- server` (exit 0) conserva los insumos del gate PostgreSQL, y el cierre documental conserva todas las fuentes técnicas.
- CI. Consultar el estado del HEAD publicado y su base con `gh pr view 83 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup`.

| Observación | Corrección | Verificación |
|---|---|---|
| Al borrar la última fila quedaba el foco en una fila anterior. | `07fe28e` enfoca Nueva nota cuando no queda una fila siguiente. | El recorrido real comprueba el foco con otra nota en el directorio. |
| Al guardar una nota nueva explícitamente, la guardia podía bloquear el reemplazo de la URL tras el ACK. | `1e1c245` permite el reemplazo confirmado dentro del mismo espacio. | Rojo en Playwright desktop/mobile sobre `07fe28e`. Regresión de cliente y ambos proyectos en verde sobre el candidato final. |

Pendiente: revisión independiente de [PR #83](https://github.com/MatiasNicolasAcevedo/devnotes/pull/83). FULL/STARTER: DIFERIDO POR EL DUEÑO. Render Auto-Deploy On Commit.
