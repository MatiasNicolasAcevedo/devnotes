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
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t081-mobile bash scripts/e2e.sh --grep 'multiline clipboard, persistence, scroll focus and compact layout|CA-04:|T-020:' --project mobile`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

2026-11-22. Frontera reviewer independiente, Codex Desktop con GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git Bash, gh, Node 24 y Docker Desktop. [PR #84](https://github.com/MatiasNicolasAcevedo/devnotes/pull/84). **CAMBIOS REQUERIDOS**, primera ronda, sobre el HEAD publicado `a3cd8aa26d956a21c63c6222a6a41640ffbb2600`, padre técnico `7011d41cf6a36e90f936eff57e6b602e3fb8e672` y base `main@8f4ea2c3f32cff823b5a9e3d3ffd17b5217d4b6e`. Impacto en UI y foco del editor al cambiar de ancho. El diff conserva API, permisos, persistencia y formato de documento.

| Hallazgo | Evidencia | Condición de cierre |
|---|---|---|
| Herramientas se reabre solo al volver a ancho estrecho. | Con el editor listo, abrir Herramientas a 375×559, cambiar a 1280×559, enfocar el editor y volver a 320×559. Playwright esperó cero diálogos y encontró uno. `DailyEditor.tsx` conserva `toolsAnchor` cuando desmonta el botón a ancho amplio y reaplica el ancla anterior al remontarlo. | Agregar regresión primero roja. Debe haber cero diálogos y conservarse el foco del editor al volver a 320. La apertura deliberada, Escape con retorno de foco, enlace con selección y Copiar nota deben seguir funcionando. |
| Tres comentarios de `dailyEditor.css` quedan con codificación dañada. | El diff publicado transforma «numeración», «área», «página», «versión» y «números» en texto mal decodificado. Lectura explícita del archivo como UTF-8 (exit 0). | Restaurar el texto de los tres comentarios de la base y conservar las reglas CSS del diario compacto. |

- Precondición. `gh pr view 84 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup` y `git fetch origin main codex/t-081-compact-daily-notes` (exit 0) confirmaron PR abierto, listo, HEAD/base y padre esperados. [`verify-required` en SUCCESS para el SHA exacto](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/45032111093/job/137237763746), posterior a una corrida cancelada. Consulta de conversaciones (exit 0), cero.
- Escritorio. `STARTER_E2E_PROJECT=starter-e2e-t081-review-desktop bash scripts/e2e.sh --grep 'multiline clipboard, persistence, scroll focus and compact layout|CA-04:|T-020:|copy previous: preserves|remove a link only' --project desktop` (exit 0, 7/7). Primera línea a 100,75 px en 768×559 y 1280×800. A 768×559 supera en 59,015625 px la medición de base documentada por el implementer (159,765625 px), y cumple el máximo de 110 px.
- Móvil. `STARTER_E2E_PROJECT=starter-e2e-t081-review-mobile bash scripts/e2e.sh --grep 'multiline clipboard, persistence, scroll focus and compact layout|CA-04:|T-020:|free-notes: lifecycle returns to|T081 reviewer: tools reopen' --project mobile` (exit 1, 6/7). Primera línea a 116 px en 320×559 y 375×559, reflujo sin solapamiento y foco inicial comprobado a 320/375/1280. Pasaron Libres y vuelta a la fecha original, Hoy, enlace, copia, Guardar versión, borrador por calendario y URL, e Historial solo con versiones manuales. Falló exclusivamente la sonda temporal de cruce de ancho, en la comprobación de cero diálogos. La comprobación de foco posterior a ese cruce quedó sin ejecutar. Verificación por label exacto (exit 0): cero contenedores, redes y volúmenes en ambos proyectos.
- `node scripts/docs-check.mjs` y `git diff --check 8f4ea2c...HEAD` (exit 0) en el checkout aislado. `bash scripts/verify.sh --policy origin/main` (exit 0, APPLICATION / FULL informativo). FULL/STARTER: DIFERIDO POR EL DUEÑO. PR abierto para corrección. Render Auto-Deploy On Commit.

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
