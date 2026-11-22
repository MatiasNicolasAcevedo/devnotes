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

2026-11-22. Frontera a cargo de la decisión de cierre en Codex Desktop con GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git, gh y Node. **El dueño autorizó expresamente reabrir el ciclo** en el mismo PR y rama, con el criterio de cierre de esta tarea. Esta sesión actualiza la documentación operativa. La corrección autorizada afecta el contenido copiado desde Libres tras un 409.

- `gh pr view 83 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid` (exit 0 con acceso a GitHub) confirmó OPEN, listo, HEAD `0459d8e538c1d941971e2734fa57d7096ba02add` y base `main@7a700175b98669c3a1d9457150df4230279f2c62`. `git log -1 --format=%H -- docs/STATUS.md` (exit 0) devolvió ese HEAD, donde T-080 figura `changes_requested`. `git diff --name-only 710a225c..0459d8e` (exit 0) mostró solo tarea y STATUS. La consulta del `statusCheckRollup` (exit 0) confirmó `verify-required` SUCCESS en la corrida `44986722103` sobre el HEAD consultado.
- Se corroboró en el código que «Copiar texto local» recibe una instantánea del cuerpo al renderizar. La reproducción roja, reapertura y recuperación se registran en la evidencia de ronda 2. La sesión implementer independiente ejecuta el gate de aplicación del contrato de corrección.
- `node scripts/docs-check.mjs` en el árbol de trabajo (exit 1) detectó `trailer/CLAUDE.md` dentro de `trailer/`, un directorio preexistente sin seguimiento. El mismo script en una copia aislada de los archivos versionados, con esta transición documental (exit 0), pasó. `git diff --check 7a700175..HEAD` y `git diff --check` (exit 0).
- A «¿Autorizás reabrir el ciclo de T-080 en el mismo PR para corregir la copia del borrador tras un 409 con el criterio de cierre documentado?», el dueño respondió «Sí, autorizo reabrir el ciclo». El PR sigue abierto con `changes_requested` hasta que el implementer publique la corrección para revisión independiente. FULL/STARTER: DIFERIDO POR EL DUEÑO. Render Auto-Deploy On Commit.

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
| Ronda 2. El botón de copia recibe `editor.getText()` durante el render. Al cambiar el contenido tras el 409 con el formulario ya sucio, el botón conserva el valor anterior. | Corrección autorizada. Leer el contenido actual al ejecutar la acción de copia o suscribir esa acción a los cambios de contenido. Conservar confirmación y revisión. | Sonda Vitest roja sobre `710a225c8a50bca9619cb33bde7f49b5022fef4a`. |

**[P2] «Copiar texto local» omite las ediciones hechas después del 409.** En `FreeNoteEditor.tsx:265`, el botón toma una instantánea del cuerpo al renderizar el aviso. Si la persona corrige el borrador antes de copiarlo y luego confirma que quiere abrir la revisión remota, la copia no permite recuperar la última edición. S-113 requiere ofrecer la copia del texto local como parte de la recuperación.

**Reproducción y condición de cierre.** En el caso existente `conserva el borrador ante refetch y 409`, después de comprobar el PUT conflictivo y antes de abrir la confirmación, llamar `replaceBody(body, 'Cuerpo local corregido después del conflicto')`, afirmar que ese es el texto visible, pulsar por nombre accesible «Copiar texto local» y leer `navigator.clipboard.readText()`. `npm test -- --run src/features/free-notes/FreeNotesPage.test.tsx -t 'conserva el borrador ante refetch'` devolvió 1. El editor mostraba «Cuerpo local corregido después del conflicto» y el portapapeles devolvió «Cuerpo local». La prueba debe copiar exactamente el cuerpo vigente, incluidas las ediciones posteriores al 409, y conservar la recuperación con confirmación. Las sondas de revisión fueron temporales.

## Contrato de corrección autorizado

- En una sesión implementer nueva sobre la rama `codex/t-080-free-notes-workspace` y el PR #83, ampliá el caso existente de `FreeNotesPage.test.tsx` con la secuencia de reproducción anterior y una comparación exacta del portapapeles. Desde `client/`, ejecutá `npm test -- --run src/features/free-notes/FreeNotesPage.test.tsx -t 'conserva el borrador ante refetch'` antes de cambiar el código. Registrá el SHA y el exit 1 por el cuerpo anterior. Conservá las comprobaciones del PUT con revisión 1, borrador local, confirmación y carga de la revisión remota.
- Corregí la fuente del texto en la acción «Copiar texto local». Al pulsarla, se copia el cuerpo vigente del editor en texto plano, con la separación de bloques existente y el feedback accesible de copia. La acción conserva título, cuerpo, posición y revisión del borrador y funciona sin escribir a la API. Acotá el cambio a la copia y conservá guardias de navegación, consulta, reapertura, confirmación de descarte y revisión de guardado. API, permisos y persistencia quedan fuera del alcance. Repetí exactamente el comando rojo y registrá el verde.
- Gate de cliente desde `client/`: `npm test -- --run src/app/AppRoutes.test.tsx src/features/free-notes` y `npm run typecheck`. La prueba existente de reapertura y segundo guardado debe seguir acreditando título y cuerpo, GET anterior retenido, envíos con revisiones 1 y 2 y persistencia en revisión 3.
- Conservá en `e2e/tests/free-notes.spec.ts` un caso desktop bajo `free-notes: lifecycle` para la recuperación con un 409 real. Con dos pestañas de la misma identidad ficticia, la actualización remota debe provocar un PUT local 409. Cancelar la confirmación conserva el borrador. Confirmar abre el contenido remoto. La edición posterior guarda con la revisión recién cargada y persiste al recargar. Ejecutá desde raíz con Git Bash `STARTER_E2E_PROJECT=starter-e2e-t080-copy409-desktop bash scripts/e2e.sh --grep 'free-notes: lifecycle' --project desktop`, con sesión local, API y PostgreSQL reales, y registrá el cleanup por etiqueta exacta.
- Ejecutá `node scripts/docs-check.mjs`, `git diff --check` y `bash scripts/verify.sh --policy origin/main` solo para clasificar. FULL/STARTER: DIFERIDO POR EL DUEÑO. Publicá en la misma rama, registrá comandos, exits, resultados y SHA/base en el checkpoint, y confirmá `verify-required` SUCCESS del HEAD publicado. Dejá T-080 `in_review` y un único prompt para el reviewer independiente del PR #83. El PR queda abierto para su veredicto y se preserva Render Auto-Deploy On Commit.
