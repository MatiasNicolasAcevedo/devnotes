---
id: T-082
status: in_review
priority: P1
size: S
milestone: M7
spec: S-114
depends_on: [T-081]
branch: codex/t-082-free-notes-lists
role: implementer
executor: frontier
pr: 85
---

# T-082 · Insertar listas simples en Libres

## Objetivo

Insertar listas simples en Libres con el recorrido observable descrito en la aceptación.

## Alcance

Agregar nodos TipTap de viñetas/casillas/números, botón Lista y validación de estructura. Ampliar fixtures de XLSX v4. [Contrato S-114](../specs/S-114-writing-editor.md) · [Diseño y previsualización](../design/WRITING-WORKSPACES.md).

## Aceptación y pruebas

Casilla por teclado/toque, conversión y deshacer. Enter continúa y vacío sale. Recargar/restaurar conserva tipo, orden y marcado. Rechazo de anidación; diario acepta su modelo previo.

- Desde `server/` con Git Bash y JDK 21. `./mvnw -q test -Dtest=FreeNoteDocumentTest,XlsxFreeNotesRoundTripTest`. Registrar las fases y cantidad ejecutada. El comando dirigido no acredita la cobertura agregada.
- Desde `client/`. `npm test -- --run src/features/free-notes src/features/daily/editor/DailyEditor.test.tsx` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t082-desktop-restore-1122 bash scripts/e2e.sh --grep 'free-notes: lists' --project desktop`. API propia y sesión reales con proveedor OIDC ficticio. Registrar cleanup por label.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t082-mobile-restore-1122 bash scripts/e2e.sh --grep 'free-notes: lists' --project mobile`. API propia y sesión reales con proveedor OIDC ficticio. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

2026-11-22. Frontera implementer en Codex Desktop con GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git Bash, gh, Node 24.21.0, JDK 21 y Docker Desktop. [PR #85](https://github.com/MatiasNicolasAcevedo/devnotes/pull/85), base `main@9e545c63a52415568dde2a548c999e1b27bd80ad`, implementación `f86812906032ddc89681398eb98fa84e4ed87ef8`, fuentes probadas `f82041276528bb555449886299191b02f2fca6cb`. El HEAD de entrega es el hijo documental de las fuentes probadas, consultable con `gh pr view 85 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup`. Pendiente: revisión independiente.

- Entrada. `gh pr view 84 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit` (exit 0 con acceso de red, tras exit 1 por conectividad en sandbox) confirmó MERGED y el squash de la base. `git fetch origin main` y `git merge-base --is-ancestor $taskMergeOid origin/main` (exit 0). Primer commit `b8ab3d2874be80251d5976fda58b92067810d1c3` concilió T-081 y habilitó T-082.
- Impacto. Menú de listas en Libres con viñetas, casillas, numeración desde 1 y retiro del formato. Conversión de líneas seleccionadas, teclado, toque, deshacer y copia como texto y HTML. Ampliación de los documentos JSON aceptados por la API de Libres y por XLSX v4, incluida la columna de texto legible. Se conservan rutas, permisos, almacenamiento JSONB y el contrato del diario.
- Backend. Desde `server/`, `./mvnw -q spotless:apply` y `./mvnw -q test -Dtest=FreeNoteDocumentTest,XlsxFreeNotesRoundTripTest` (exit 0). Compilación y Surefire, 24/24 en documento y 16/16 en XLSX. Round trip v4 exacto, lectura de respaldos anteriores, negativos de datos y anidación, y compatibilidad del diario. Surefire dirigido.
- Cliente. Desde `client/`, `npm test -- --run src/features/free-notes src/features/daily/editor/DailyEditor.test.tsx` (34/34, exit 0) y `npm run typecheck` (exit 0). Prettier y ESLint dirigidos a los cuatro archivos modificados de Libres (exit 0).
- E2E. Ambos comandos declarados arriba (exit 0, desktop 1/1 y mobile 1/1), con API y PostgreSQL reales. Conversión parcial y deshacer con marcado, Tab y Espacio en desktop, toque en mobile, Enter, texto y HTML del portapapeles con uno y varios ítems, recarga, anidación rechazada por la API y restauración del Excel exportado en otra cuenta ficticia. Antes y después, `docker container ls -aq`, `docker network ls -q` y `docker volume ls -q` por label exacto `com.docker.compose.project` devolvieron cero recursos en ambos namespaces finales.
- Documentos y política. `node scripts/docs-check.mjs` sobre el árbol versionado (exit 0, excluye el `trailer/` local preexistente), `git diff --check origin/main...HEAD` (exit 0) y `bash scripts/verify.sh --policy origin/main` (exit 0, APPLICATION / FULL informativo). **FULL/STARTER: DIFERIDO POR EL DUEÑO**. Render Auto-Deploy On Commit.

| Causa | Arreglo | Prueba |
|---|---|---|
| El fixture XLSX consultaba una hoja por nombre con una sobrecarga que recibe índice. Falló `testCompile` en Maven y en el primer build E2E desktop (exit 1). | Buscar la hoja por nombre en el stream de hojas de FastExcel. | Surefire 40/40 en `f868129`. |
| El texto copiado de la lista incluía un salto inicial. El E2E de ambos proyectos detectó la línea vacía (exit 1). | Serializar una línea por párrafo seleccionado y conservar el contenedor en el HTML de un solo ítem. | Los dos E2E finales comparan el texto exacto y el marcado del HTML. |
| El login interactivo del proveedor ficticio para la segunda cuenta agotó 30 s en ambos proyectos (exit 1). | Rotar con el control de identidad usado por el E2E de autenticación y esperar readiness. | Ambos proyectos 1/1 en `f820412`, con otra identidad confirmada y restauración v4 completa. |
