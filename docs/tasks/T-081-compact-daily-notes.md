---
id: T-081
status: changes_requested
priority: P1
size: S
milestone: M7
spec: S-114
depends_on: [T-080]
branch: codex/t-081-compact-daily-notes
role: implementer
executor: frontier
pr: 84
---

# T-081 · Acercar el diario al comienzo de la ventana

## Objetivo

Acercar el diario al comienzo de la ventana con el recorrido observable descrito en la aceptación.

## Alcance

Compactar DailyNotesPage y espacio contextual del shell. Quitar listado inferior y consulta exclusiva. Mantener Libres, fecha, Hoy, enlaces, copiar y Guardar versión. [Contrato S-114](../specs/S-114-writing-editor.md) · [Diseño y previsualización](../design/WRITING-WORKSPACES.md).

## Aceptación y pruebas

Medidas pre/post a 768×559 en Chromium/PWA según spec, 320/375 y 1280 para reflujo/foco. Fecha con borrador sin versión abre por calendario o URL. Guardar versión alimenta Historial. Conservar feedback en fallo y acceso a enlaces.

- Desde `client/`. `npm test -- --run src/features/daily/DailyNotesPage.test.tsx src/features/daily/DailyNotesToolbar.test.tsx src/features/daily/DailyHistoryPage.test.tsx` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t081-desktop bash scripts/e2e.sh --grep 'multiline clipboard, persistence, scroll focus and compact layout|CA-04:|T-020:' --project desktop`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t081-mobile bash scripts/e2e.sh --grep 'multiline clipboard, persistence, scroll focus and compact layout|CA-04:|T-020:|compact daily notes: tools stay closed' --project mobile`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

2026-11-22. Segunda ronda de frontera reviewer independiente, Codex Desktop con GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git Bash, gh, Node 24.21.0 y Docker Desktop. **CAMBIOS REQUERIDOS** en el [PR #84](https://github.com/MatiasNicolasAcevedo/devnotes/pull/84). HEAD revisado `1b0d098cf0c4939109080024785a1a12dd985009`, padre técnico `2e5f37eda23195d923478cc3e21f0d2867c35370` y base `main@8f4ea2c3f32cff823b5a9e3d3ffd17b5217d4b6e`. Impacto observado en reflujo y foco del diario. El diff técnico se limita al cliente y sus E2E. Pendiente de decisión de frontera tras dos rondas. T-082 sigue pendiente del merge.

| Hallazgo | Resultado y condición de cierre |
|---|---|
| Herramientas reaparecía al volver a angosto. | Cerrado en `2e5f37e`. Con Herramientas abierto a 375 px, desaparece a 1280 px. Tras enfocar el editor a 1280, a 320 px el editor conserva el foco y el diálogo sigue cerrado hasta activarlo. Escape devuelve el foco al botón. El enlace sobre la selección y Copiar nota pasaron. |
| Tres comentarios CSS se habían recodificado. | Cerrado en `2e5f37e`. Comparación de los comentarios recuperados con `git show`, decodificación UTF-8 estricta y aserción de igualdad en Node, exit 0. |
| El área de escritura excede el espacio vertical disponible en móvil. | Nuevo bloqueo reproducido. En `e2e/tests/daily-notes.spec.ts:96`, CA-01 midió `fill.bottom = 766` y el inicio de la navegación en `763` CSS px, dos veces en el HEAD. CA-01 pasó en main. Revisar el cálculo de altura de `DailyNotesPage.tsx` junto con el espacio real del shell. Cierre observable: CA-01 móvil verde con sus límites geométricos intactos, además de mantener el reflujo, el foco y la medida de primera línea exigidos por S-114. |

- Precondición. `gh pr view 84 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup` y `git fetch origin main codex/t-081-compact-daily-notes` (exit 0) confirmaron PR abierto y listo, base y HEAD esperados y `verify-required SUCCESS`. `git log -1 --format='%H %P' origin/codex/t-081-compact-daily-notes -- docs/STATUS.md` (exit 0) confirmó el cierre documental y su padre técnico. La consulta de hilos del PR no devolvió conversaciones pendientes.
- Cliente. Desde `client/`, `npm test -- --run --maxWorkers=1 src/features/daily/DailyNotesPage.test.tsx src/features/daily/DailyNotesToolbar.test.tsx src/features/daily/DailyHistoryPage.test.tsx src/features/daily/editor/DailyEditor.test.tsx src/features/daily/CopyPreviousNote.test.tsx` (exit 0, 86/86) y `npm run typecheck` (exit 0). La primera corrida con los mismos archivos sin `--maxWorkers=1` dio 85/86 (exit 1). El caso «descarta el ACK pendiente al cerrar sesión» no encontró la oferta a tiempo, también falló en main (exit 1) y pasó al aislarlo en el HEAD (exit 0).
- Escritorio. `STARTER_E2E_PROJECT=starter-e2e-t081-review-desk-1122 bash scripts/e2e.sh --grep 'multiline clipboard, persistence, scroll focus and compact layout|CA-04:|T-020:' --project desktop` (exit 0, 5/5).
- Móvil. `STARTER_E2E_PROJECT=starter-e2e-t081-review-mob-1122 bash scripts/e2e.sh --grep 'multiline clipboard, persistence, scroll focus and compact layout|CA-04:|T-020:|compact daily notes: tools stay closed' --project mobile` (exit 0, 6/6).
- Complemento móvil. `STARTER_E2E_PROJECT=starter-e2e-t081-review-copy-1122 bash scripts/e2e.sh --grep 'copy previous: preserves|CA-01:' --project mobile` (exit 1, 1/2). Pasó Copiar nota anterior y falló CA-01. `STARTER_E2E_PROJECT=starter-e2e-t081-review-ca01-1122 bash scripts/e2e.sh --grep 'CA-01:' --project mobile` repitió el mismo fallo (exit 1, 0/1). `STARTER_E2E_PROJECT=starter-e2e-t081-review-ca01base-1122 bash scripts/e2e.sh --grep 'CA-01:' --project mobile` en main pasó (exit 0, 1/1).
- E2E con OIDC ficticio, API y PostgreSQL reales. `docker ps -aq`, `docker network ls -q` y `docker volume ls -q`, filtrados por el label exacto `com.docker.compose.project`, devolvieron cero recursos en los cinco namespaces.
- Documentos y política. `node scripts/docs-check.mjs` sobre el árbol versionado del HEAD revisado y `git diff --check 8f4ea2c3f32cff823b5a9e3d3ffd17b5217d4b6e...1b0d098cf0c4939109080024785a1a12dd985009` (exit 0). `bash scripts/verify.sh --policy origin/main` (exit 0, APPLICATION / FULL informativo). **FULL/STARTER: DIFERIDO POR EL DUEÑO**. Render Auto-Deploy On Commit.

## Evidencia de corrección

2026-11-22. Frontera implementer de corrección, Codex Desktop con GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git Bash, gh, Node 24.21.0 y Docker Desktop. [PR #84](https://github.com/MatiasNicolasAcevedo/devnotes/pull/84). Base `main@8f4ea2c3f32cff823b5a9e3d3ffd17b5217d4b6e`, HEAD revisado `a3cd8aa26d956a21c63c6222a6a41640ffbb2600`, entrada documental `5040a0804ea0864fe73a97674bd8d6fdda7df09c` y corrección técnica `2e5f37eda23195d923478cc3e21f0d2867c35370`. El HEAD de entrega es el commit documental hijo que contiene este checkpoint y STATUS. Impacto en UI y foco, con API, permisos, persistencia y formato del documento preservados.

| Causa | Arreglo | Prueba |
|---|---|---|
| El ancla de Herramientas sobrevivía al desmontaje del botón en ancho amplio. | Limpiar el ancla cuando las acciones dejan de agruparse. El próximo montaje empieza con el diálogo cerrado. | Rojo en la entrada documental con la prueba añadida. Verde en `2e5f37e`: 375 → 1280 → 320, cero diálogos y foco del editor al volver, apertura deliberada y Escape con foco en el botón. |
| Tres comentarios de `dailyEditor.css` se habían recodificado mal. | Restaurar los comentarios UTF-8 de la base y preservar las reglas del diario compacto. | Comparación de todos los comentarios CSS con `git show` y una aserción de Node, exit 0 en `2e5f37e`. |

- Precondición. `gh pr view 84 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup` y `git fetch origin main codex/t-081-compact-daily-notes` (ambos exit 0) confirmaron PR abierto y listo, base y HEAD esperados. El HEAD coincidía con el último cambio de STATUS y su padre con el HEAD revisado.
- Rojo. `STARTER_E2E_PROJECT=starter-e2e-t081-fix-red bash scripts/e2e.sh --grep 'compact daily notes: tools stay closed' --project mobile` (exit 1, 0/1). A 320 px se reabrió el diálogo, que ocultó el botón del árbol de accesibilidad. Falló la aserción de visibilidad del botón y la captura de accesibilidad mostró el diálogo abierto.
- Cliente. Desde `client/`, `npm test -- --run src/features/daily/DailyNotesPage.test.tsx src/features/daily/DailyNotesToolbar.test.tsx src/features/daily/DailyHistoryPage.test.tsx src/features/daily/editor/DailyEditor.test.tsx` (exit 0, 70/70) y `npm run typecheck` (exit 0). ESLint de `DailyEditor.tsx` y Prettier de los dos archivos de cliente modificados (exit 0).
- Escritorio. `STARTER_E2E_PROJECT=starter-e2e-t081-fix-desktop bash scripts/e2e.sh --grep 'multiline clipboard, persistence, scroll focus and compact layout|CA-04:|T-020:' --project desktop` (exit 0, 5/5).
- Móvil. `STARTER_E2E_PROJECT=starter-e2e-t081-fix-mobile-recheck bash scripts/e2e.sh --grep 'multiline clipboard, persistence, scroll focus and compact layout|CA-04:|T-020:|compact daily notes: tools stay closed' --project mobile` (exit 0, 6/6). Pasaron el cruce de ancho, la selección y edición de enlace, Escape y Copiar nota. La primera corrida con el mismo filtro y namespace `starter-e2e-t081-fix-mobile` (exit 1, 5/6) pasó el cruce de ancho y conservó la URL anterior tras editar el enlace en T-020. El contraste `STARTER_E2E_PROJECT=starter-e2e-t081-link-before bash scripts/e2e.sh --grep 'T-020: visible link button' --project mobile` sobre `5040a080` pasó (exit 0, 1/1). El fallo de enlace no se repitió en la corrida de cierre.
- E2E con sesión OIDC ficticia, API y PostgreSQL reales. La verificación Docker con el label exacto `com.docker.compose.project` devolvió cero contenedores, redes y volúmenes para los cinco namespaces de la sesión.
- Documentación y Git. `node scripts/docs-check.mjs` sobre el árbol versionado del cierre y `git diff --check 8f4ea2c3f32cff823b5a9e3d3ffd17b5217d4b6e...HEAD` (exit 0). El chequeo de documentos usó una copia del commit para excluir `trailer/`, preexistente y sin rastrear. `bash scripts/verify.sh --policy origin/main` (exit 0, APPLICATION / FULL informativo). La revisión requiere `verify-required SUCCESS` del HEAD de entrega. **FULL/STARTER: DIFERIDO POR EL DUEÑO**. Render Auto-Deploy On Commit.

## Evidencia de implementación

2026-11-22. Frontera implementer, Codex Desktop con GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git Bash, gh, Node 24 y Docker Desktop. [PR #84](https://github.com/MatiasNicolasAcevedo/devnotes/pull/84), rama `codex/t-081-compact-daily-notes`, commit técnico `7011d41cf6a36e90f936eff57e6b602e3fb8e672`, base `main@8f4ea2c3f32cff823b5a9e3d3ffd17b5217d4b6e`. El HEAD de entrega es el commit documental posterior que contiene este checkpoint y STATUS. Se acredita en GitHub con `gh pr view 84 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup`. Próximo paso: revisión independiente.

- Precondición y conciliación. `gh pr view 83 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit` (exit 0) devolvió MERGED, `2026-11-22T05:09:22Z` y el squash `8f4ea2c3f32cff823b5a9e3d3ffd17b5217d4b6e`. `git merge-base --is-ancestor 8f4ea2c3f32cff823b5a9e3d3ffd17b5217d4b6e origin/main` (exit 0) acreditó la base actualizada. El primer commit `a8bfb941cedc1c522941801c5fdad080c9a9ba19` concilió T-080 y habilitó T-081.
- Impacto de UI. Diario con barra web de 48 px, menos margen arriba, y fila de controles integrada al editor. Fecha, Libres, Hoy, estado y Guardar versión a mano. Enlace y Copiar nota en Herramientas por debajo de 600 px. La sugerencia y los avisos de Copiar nota anterior quedan al pie del editor. Se eliminó el listado inferior junto con su GET de la pantalla. Se conservan API, permisos, persistencia y modelo de documento.
- Chromium al zoom base. A 768×559 la primera línea del diario vacío quedó a 159,765625 px en main y a 102,75 px en T-081, una mejora de 57,015625 px. Sonda temporal en checkout de main con `STARTER_E2E_PROJECT=starter-e2e-t081-baseline bash scripts/e2e.sh --grep 'T081 baseline first line' --project desktop` (exit 0, 1/1). En T-081, 116 px a 320×559 y 375×559 y 102,75 px a 1280×800. Se verificaron controles sin solapamiento, acceso con foco y viewport táctil reducido a 320×380 como simulación del teclado. Evidencia del área web de Chromium.
- Cliente. Comando dirigido declarado arriba (exit 0, 48/48 en 3 archivos) y `npm run typecheck` (exit 0). La prueba adicional de `CopyPreviousNote.test.tsx` y `DailyEditor.test.tsx` pasó 38/38. `AppShell.test.tsx` fue rojo en 7/7 en la rama y en el checkout de main (exit 1 en ambos). La prueba de `/data` espera el selector «Espacio: Trabajo», que no está en esa ruta en la base. El cambio de altura del shell aplica a `/notes` y `/notes/:date`.
- E2E. Ambos comandos dirigidos declarados arriba (exit 0, 5/5 en desktop y 5/5 en mobile), sesión OIDC ficticia, API y PostgreSQL reales. Borrador sin versión ausente de Historial y accesible por calendario y URL. Guardar, consultar y reemplazar la versión en Historial pasan. Enlace conserva selección al abrir Herramientas, edición y apertura segura. Copia multilínea exacta, persistencia y foco de regreso al cerrar Herramientas. Verificación Docker por etiqueta exacta `com.docker.compose.project` (exit 0) devolvió cero contenedores, redes y volúmenes para los dos proyectos y la base.
- Documentación. `node scripts/docs-check.mjs` (exit 0 en checkout limpio) y `git diff --check origin/main...HEAD` (exit 0). El checkout del dueño tiene `trailer/` sin rastrear y su `CLAUDE.md` dispara el chequeo local. `bash scripts/verify.sh --policy origin/main` (exit 0, APPLICATION / FULL, solo clasificación). FULL/STARTER: DIFERIDO POR EL DUEÑO. Render Auto-Deploy On Commit.

| Causa | Arreglo | Prueba |
|---|---|---|
| El runner rechaza `--project=desktop` con exit 2. | Usar los dos argumentos `--project desktop` y `--project mobile`. | Ambos proyectos, exit 0. |
| Primer intento E2E con selectores alterados por codificación. En la prueba angosta, Herramientas podía consultarse antes de montar el editor. | Conservar UTF-8 y esperar el editor editable antes de abrir el menú. | Ambos proyectos 5/5 en `7011d41`. |
| La prueba cliente reutilizaba el input previo al volver de Hoy. | Resolver el input activo antes de volver a elegir la fecha. | 48/48 en el gate cliente. |
