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

2026-11-22. Frontera reviewer independiente, ronda 2, en Codex Desktop con GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git, gh, Git Bash, Node 24, JDK 21 y Docker Desktop. **CAMBIOS REQUERIDOS** en [PR #83](https://github.com/MatiasNicolasAcevedo/devnotes/pull/83). HEAD revisado `710a225c8a50bca9619cb33bde7f49b5022fef4a`, base `main@7a700175b98669c3a1d9457150df4230279f2c62`. El hallazgo afecta la copia del cuerpo local de Libres después de un conflicto. El cierre cambia documentación operativa.

- Precondición. `gh pr view 83 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup` (exit 0) confirmó OPEN, listo y `verify-required` SUCCESS en la corrida `44986003185`. El HEAD coincidió con `git log -1 --format=%H -- docs/STATUS.md`, su padre fue `92a7962002f3cb5b351fd2430ba77eb0bebb5c05` y T-080 figuraba `in_review`. El diff del padre al HEAD solo contiene el cierre documental del implementer. La consulta de conversaciones devolvió cero pendientes.
- Cliente en checkout aislado. `npm test -- --run src/app/AppRoutes.test.tsx src/features/free-notes` (exit 0, 27 pruebas) y `npm run typecheck` (exit 0). La regresión verificó título y cuerpo al reabrir sin recargar, el GET anterior al guardado retenido, las revisiones enviadas 1 y 2 y la segunda escritura persistida en revisión 3. Pasaron las guardias de navegación, espacio y cuenta, y se conservó el borrador bajo refetch.
- PostgreSQL 18.6. En `server/`, `./mvnw -q verify -Dtest=FreeNoteDocumentTest -Dit.test=FreeNoteApiIT,FreeNoteServiceIT -Djacoco.skip=true` (exit 0), 16 Surefire y 11 Failsafe (4 API, 7 servicio). `git diff --exit-code 7c2f2fb HEAD -- server docker-compose.yml compose.auth-test.yml docker-compose.e2e.yml scripts` (exit 0) confirmó los insumos backend del checkpoint de ronda 1.
- Playwright desktop. `STARTER_E2E_PROJECT=starter-e2e-t080-reviewr2-desktop bash scripts/e2e.sh --grep 'free-notes: lifecycle' --project desktop` (exit 0, 3/3). Dos casos publicados y uno temporal con dos pestañas de la misma cuenta ficticia, OIDC local, API y PostgreSQL reales. Un PUT remoto exitoso provocó un PUT local 409 real. Cancelar la confirmación conservó título y cuerpo locales. Confirmar abrió la versión remota. La edición posterior envió revisión 2, obtuvo 200 y persistió tras recargar.
- Playwright mobile. `STARTER_E2E_PROJECT=starter-e2e-t080-reviewr2-mobile bash scripts/e2e.sh --grep 'free-notes: lifecycle' --project mobile` (exit 0, 2/2). Los dos casos publicados pasaron a 320 CSS px. El control por etiqueta exacta de ambos proyectos devolvió cero contenedores, volúmenes y redes.
- Documentos. `node scripts/docs-check.mjs` en checkout aislado (exit 0 sobre el candidato y la transición documental), `git diff --check 7a700175..HEAD` (exit 0) y `bash scripts/verify.sh --policy origin/main` (exit 0, APPLICATION / FULL, solo clasificación). El `trailer/` preexistente quedó en el árbol del dueño.

### Correcciones y hallazgo de ronda 2

| Causa | Arreglo o acción | Prueba |
|---|---|---|
| Ronda 1. Una reapertura podía inicializarse con el detalle invalidado o con el resultado de un GET anterior al PUT. | Cancelar esa lectura y esperar el detalle vigente al montar. Conservar el borrador mientras el editor siga montado. | Corrección `92a7962002f3cb5b351fd2430ba77eb0bebb5c05`. Regresión y Playwright desktop aprobados. |
| Ronda 2. El botón de copia recibe `editor.getText()` durante el render. Al cambiar el contenido tras el 409 con el formulario ya sucio, el botón conserva el valor anterior. | Pendiente de decisión del dueño. Leer el contenido actual al ejecutar la acción de copia o suscribir esa acción a los cambios de contenido. Conservar confirmación y revisión. | Sonda Vitest roja sobre `710a225c8a50bca9619cb33bde7f49b5022fef4a`. |

**[P2] «Copiar texto local» omite las ediciones hechas después del 409.** En `FreeNoteEditor.tsx:265`, el botón toma una instantánea del cuerpo al renderizar el aviso. Si la persona corrige el borrador antes de copiarlo y luego confirma que quiere abrir la revisión remota, la copia no permite recuperar la última edición. S-113 requiere ofrecer la copia del texto local como parte de la recuperación.

**Reproducción y condición de cierre.** En el caso existente `conserva el borrador ante refetch y 409`, después de comprobar el PUT conflictivo y antes de abrir la confirmación, llamar `replaceBody(body, 'Cuerpo local corregido después del conflicto')`, afirmar que ese es el texto visible, pulsar por nombre accesible «Copiar texto local» y leer `navigator.clipboard.readText()`. `npm test -- --run src/features/free-notes/FreeNotesPage.test.tsx -t 'conserva el borrador ante refetch'` devolvió 1. El editor mostraba «Cuerpo local corregido después del conflicto» y el portapapeles devolvió «Cuerpo local». La prueba debe copiar exactamente el cuerpo vigente, incluidas las ediciones posteriores al 409, y conservar la recuperación con confirmación. Las sondas de revisión fueron temporales.

Pendiente: decisión de frontera o dueño tras la segunda ronda. FULL/STARTER: DIFERIDO POR EL DUEÑO. Render Auto-Deploy On Commit.
