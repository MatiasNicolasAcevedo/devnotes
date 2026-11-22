---
id: T-080
status: done
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

## Conciliación

PR #83 confirmado `MERGED` el 2026-11-22T05:09:22Z. Squash `8f4ea2c3f32cff823b5a9e3d3ffd17b5217d4b6e`, comprobado en `origin/main` antes de habilitar T-081.

## Evidencia de cierre

2026-11-22. Frontera reviewer independiente, Codex Desktop con GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git Bash, gh, Node 24 y Docker Desktop. Revisión adicional autorizada por el dueño. [PR #83](https://github.com/MatiasNicolasAcevedo/devnotes/pull/83), HEAD técnico revisado con cierre del implementer `71e2cd57cd6abe67d33a9570a305dad93d1031d1`, padre `4c080d80d2b860a1ed0c29b60a1f44bd8e658dbe` y base `main@7a700175b98669c3a1d9457150df4230279f2c62`. La corrección cambia el momento en que la interfaz de Libres lee el cuerpo para copiar. Se conserva el contrato de API, permisos y persistencia.

- `gh pr view 83 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup` (exit 0 con acceso a GitHub) confirmó OPEN, listo y `verify-required` SUCCESS. La corrida `44987536398` acreditó ese HEAD. La consulta de `main` confirmó la base y la de conversaciones devolvió cero hilos. `git log -1 --format=%H origin/codex/t-080-free-notes-workspace -- docs/STATUS.md` (exit 0) devolvió el HEAD publicado. Se comprobó el padre técnico y el estado `in_review`.
- El rojo del implementer sobre `2754245` con la aserción nueva (exit 1) copiaba «Cuerpo local» aunque el editor mostraba la corrección posterior al 409. En el checkout publicado, `npm test -- --run src/features/free-notes/FreeNotesPage.test.tsx -t 'conserva el borrador ante refetch'` (exit 0, 1 prueba) acreditó el cuerpo corregido exacto y un único PUT. El diff mueve la lectura de TipTap al click, mantiene el separador de bloques y conserva la cadena directa en los otros llamadores.
- `npm test -- --run src/app/AppRoutes.test.tsx src/features/free-notes` (exit 0, 27 pruebas) y `npm run typecheck` (exit 0). La reapertura acredita título y cuerpo, GET anterior retenido, envíos con revisiones 1 y 2 y persistencia en revisión 3. `npm test -- --run src/features/daily/DailyNotesPage.test.tsx src/features/daily/DailyNotesToolbar.test.tsx src/features/reference/ReferencePage.test.tsx` (exit 0, 45 pruebas) confirmó también las copias de Diario y de título/descripción en Referencias y su feedback.
- `STARTER_E2E_PROJECT=starter-e2e-t080-review-final-desktop bash scripts/e2e.sh --grep 'free-notes: lifecycle' --project desktop` (exit 0, 3/3). Dos pestañas, identidad ficticia, OIDC local, API y PostgreSQL reales. Se observó el PUT 409, cancelar conservó título y cuerpo, confirmar cargó la edición remota y el siguiente PUT con revisión esperada 2 obtuvo 200. La edición persistió al recargar. Cleanup por etiqueta exacta con cero contenedores, redes y volúmenes.
- Se conserva la evidencia PostgreSQL y mobile de la ronda 2. `git diff --exit-code 710a225c8a50bca9619cb33bde7f49b5022fef4a HEAD -- server docker-compose.yml compose.auth-test.yml docker-compose.e2e.yml scripts` (exit 0). El caso nuevo de recuperación usa dos pestañas y se ejecuta solo en desktop.
- `node scripts/docs-check.mjs` sobre el HEAD publicado en worktree aislado (exit 0), `git diff --check origin/main...HEAD` (exit 0) y `bash scripts/verify.sh --policy origin/main` (exit 0, APPLICATION / FULL, solo clasificación). El directorio preexistente `trailer/` quedó en el árbol del dueño. FULL/STARTER: DIFERIDO POR EL DUEÑO. Render Auto-Deploy On Commit.
- Hallazgo de ronda 2 cerrado. Transición a `mergeable` solo documental. El veredicto del SHA final y la confirmación del squash se registran en el PR tras comprobar docs-check y `verify-required` sobre el nuevo HEAD.

### Evidencia de revisión independiente, ronda 2

**CAMBIOS REQUERIDOS** en [PR #83](https://github.com/MatiasNicolasAcevedo/devnotes/pull/83). HEAD revisado `710a225c8a50bca9619cb33bde7f49b5022fef4a`, base `main@7a700175b98669c3a1d9457150df4230279f2c62`.

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
| Ronda 2. El botón de copia recibe `editor.getText()` durante el render. Al cambiar el contenido tras el 409 con el formulario ya sucio, el botón conserva el valor anterior. | El botón lee el contenido al pulsarlo y acepta el texto directo de los demás llamadores. Libres conserva el separador de bloques, confirmación y revisión. | Regresión roja sobre `2754245` con la aserción nueva, verde con la corrección `4c080d8`. |

**[P2] «Copiar texto local» omite las ediciones hechas después del 409.** En `FreeNoteEditor.tsx:265`, el botón toma una instantánea del cuerpo al renderizar el aviso. Si la persona corrige el borrador antes de copiarlo y luego confirma que quiere abrir la revisión remota, la copia no permite recuperar la última edición. S-113 requiere ofrecer la copia del texto local como parte de la recuperación.

**Reproducción y condición de cierre.** En el caso existente `conserva el borrador ante refetch y 409`, después de comprobar el PUT conflictivo y antes de abrir la confirmación, llamar `replaceBody(body, 'Cuerpo local corregido después del conflicto')`, afirmar que ese es el texto visible, pulsar por nombre accesible «Copiar texto local» y leer `navigator.clipboard.readText()`. `npm test -- --run src/features/free-notes/FreeNotesPage.test.tsx -t 'conserva el borrador ante refetch'` devolvió 1. El editor mostraba «Cuerpo local corregido después del conflicto» y el portapapeles devolvió «Cuerpo local». La prueba debe copiar exactamente el cuerpo vigente, incluidas las ediciones posteriores al 409, y conservar la recuperación con confirmación. Las sondas de revisión fueron temporales.

## Contrato de corrección autorizado

- En una sesión implementer nueva sobre la rama `codex/t-080-free-notes-workspace` y el PR #83, ampliá el caso existente de `FreeNotesPage.test.tsx` con la secuencia de reproducción anterior y una comparación exacta del portapapeles. Desde `client/`, ejecutá `npm test -- --run src/features/free-notes/FreeNotesPage.test.tsx -t 'conserva el borrador ante refetch'` antes de cambiar el código. Registrá el SHA y el exit 1 por el cuerpo anterior. Conservá las comprobaciones del PUT con revisión 1, borrador local, confirmación y carga de la revisión remota.
- Corregí la fuente del texto en la acción «Copiar texto local». Al pulsarla, se copia el cuerpo vigente del editor en texto plano, con la separación de bloques existente y el feedback accesible de copia. La acción conserva título, cuerpo, posición y revisión del borrador y funciona sin escribir a la API. Acotá el cambio a la copia y conservá guardias de navegación, consulta, reapertura, confirmación de descarte y revisión de guardado. API, permisos y persistencia quedan fuera del alcance. Repetí exactamente el comando rojo y registrá el verde.
- Gate de cliente desde `client/`: `npm test -- --run src/app/AppRoutes.test.tsx src/features/free-notes` y `npm run typecheck`. La prueba existente de reapertura y segundo guardado debe seguir acreditando título y cuerpo, GET anterior retenido, envíos con revisiones 1 y 2 y persistencia en revisión 3.
- Conservá en `e2e/tests/free-notes.spec.ts` un caso desktop bajo `free-notes: lifecycle` para la recuperación con un 409 real. Con dos pestañas de la misma identidad ficticia, la actualización remota debe provocar un PUT local 409. Cancelar la confirmación conserva el borrador. Confirmar abre el contenido remoto. La edición posterior guarda con la revisión recién cargada y persiste al recargar. Ejecutá desde raíz con Git Bash `STARTER_E2E_PROJECT=starter-e2e-t080-copy409-desktop bash scripts/e2e.sh --grep 'free-notes: lifecycle' --project desktop`, con sesión local, API y PostgreSQL reales, y registrá el cleanup por etiqueta exacta.
- Ejecutá `node scripts/docs-check.mjs`, `git diff --check` y `bash scripts/verify.sh --policy origin/main` solo para clasificar. FULL/STARTER: DIFERIDO POR EL DUEÑO. Publicá en la misma rama, registrá comandos, exits, resultados y SHA/base en el checkpoint, y confirmá `verify-required` SUCCESS del HEAD publicado. Dejá T-080 `in_review` y un único prompt para el reviewer independiente del PR #83. El PR queda abierto para su veredicto y se preserva Render Auto-Deploy On Commit.
