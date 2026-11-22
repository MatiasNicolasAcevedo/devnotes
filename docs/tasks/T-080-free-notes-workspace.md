---
id: T-080
status: in_review
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

2026-11-22. Frontera implementer de corrección en Codex Desktop con GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git, gh, Git Bash, Node 24.21.0 y Docker Desktop. [PR #83](https://github.com/MatiasNicolasAcevedo/devnotes/pull/83), base `main@7a700175b98669c3a1d9457150df4230279f2c62`. Fuentes probadas en `92a7962002f3cb5b351fd2430ba77eb0bebb5c05`. El commit que actualiza STATUS lleva solo el cierre documental.

- Precondición. `gh pr view 83 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid` (exit 0) confirmó OPEN y listo. HEAD publicado, upstream y `git log -1 --format=%H -- docs/STATUS.md` coincidieron en `7c2f2fbfee253b3577341e8a8ab09e5a21ba6ac3`, con T-080 en `changes_requested`. Ese commit conserva el hallazgo y su evidencia de revisión.
- Rojo y verde. En `client/`, `npm test -- --run src/features/free-notes/FreeNotesPage.test.tsx -t 'reabre el título'` falló (exit 1) sobre el candidato recibido. El primer PUT había guardado título y cuerpo en revisión 2, pero el editor mostraba «Original». El caso con un GET de revisión 1 retenido también falló antes de cancelar esa lectura. La regresión final pasó (exit 0, 1/1) y comprobó las revisiones enviadas 1 y 2 y la persistencia final en revisión 3.
- Cliente. `npm test -- --run src/app/AppRoutes.test.tsx src/features/free-notes` (exit 0, 27 pruebas) y `npm run typecheck` (exit 0). El caso de 409 verifica título, cuerpo y revisión local tras refetch, y la carga de la versión remota luego de confirmar. Se conservaron los casos de guardia, cambio de espacio y cierre de sesión. ESLint y Prettier sobre los tres archivos cliente modificados (exit 0).
- Playwright. `STARTER_E2E_PROJECT=starter-e2e-t080-fix-r1-final-desktop bash scripts/e2e.sh --grep 'free-notes: lifecycle' --project desktop` y `STARTER_E2E_PROJECT=starter-e2e-t080-fix-r1-final-mobile bash scripts/e2e.sh --grep 'free-notes: lifecycle' --project mobile` (exit 0, 2/2 por proyecto). API y PostgreSQL reales, OIDC de prueba propio. El ciclo verifica reapertura sin recarga y persistencia de la segunda edición tras recargar. Cleanup comprobado por etiqueta exacta, sin contenedores, volúmenes ni redes de los proyectos.
- PostgreSQL dirigido. `git diff --exit-code 7c2f2fb HEAD -- server docker-compose.yml compose.auth-test.yml docker-compose.e2e.yml scripts` (exit 0). Los insumos quedaron iguales, por lo que se conserva la evidencia del checkpoint anterior (16 Surefire, 11 Failsafe en PostgreSQL 18.6).
- Documentos. `node scripts/docs-check.mjs` (exit 0 sobre copia de archivos versionados). La ejecución en el árbol general detectó un `trailer/CLAUDE.md` preexistente sin seguimiento (exit 1), preservado. `git diff --check 7a700175..HEAD` (exit 0). `bash scripts/verify.sh --policy origin/main` (exit 0, APPLICATION / FULL, solo clasificación).

### Correcciones de la ronda 1

| Causa | Arreglo | Prueba |
|---|---|---|
| La reapertura inicializaba el editor desde el detalle invalidado. Un GET iniciado antes del PUT podía volver a publicar esa revisión. | Cancelar la lectura anterior al invalidar el detalle y esperar los datos vigentes antes de inicializar una nueva instancia del editor. El editor montado conserva su borrador y su revisión hasta guardar o confirmar que abre la versión reciente. | Regresión roja y verde, refetch y 409 en Vitest, ciclo de dos guardados en Playwright desktop/mobile. SHA `92a7962002f3cb5b351fd2430ba77eb0bebb5c05`. |

Impacto acotado a la reapertura y revisión de guardado de Libres. Pendiente la revisión independiente de ronda 2 con el HEAD/base publicados y `verify-required` vigente. FULL/STARTER: DIFERIDO POR EL DUEÑO. Render Auto-Deploy On Commit.
