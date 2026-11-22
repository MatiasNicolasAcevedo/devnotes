---
id: T-083
status: in_review
priority: P1
size: S
milestone: M7
spec: S-114
depends_on: [T-082]
branch: codex/t-083-free-notes-code-blocks
role: implementer
executor: frontier
pr: 86
---

# T-083 · Bloques de código discretos para Libres

## Objetivo

Bloques de código discretos para Libres con el recorrido observable descrito en la aceptación.

## Alcance

Agregar Bloque de código bajo Herramientas, tres lenguajes, resaltado JSON/SQL y copia. Ampliar validación y fixtures. Mantener las versiones del repo cuando se pueda reutilizar. [Contrato S-114](../specs/S-114-writing-editor.md) · [Diseño y previsualización](../design/WRITING-WORKSPACES.md).

## Aceptación y pruebas

Cambiar lenguaje y copiar conserva sangría/saltos. Salir y deshacer vuelve al punto esperado. Texto inválido se muestra sin transformación. Rechazo de lenguaje ajeno. Scroll horizontal se limita al bloque. Recarga y restauración preservan lenguaje y texto.

- Desde `server/` con Git Bash y JDK 21. `./mvnw -q test -Dtest=FreeNoteDocumentTest,XlsxFreeNotesRoundTripTest`. Registrar las fases y cantidad ejecutada. El comando dirigido no acredita la cobertura agregada.
- Desde `client/`. `npm test -- --run src/features/free-notes` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t083-desktop bash scripts/e2e.sh --grep 'free-notes: code blocks' --project desktop`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t083-mobile bash scripts/e2e.sh --grep 'free-notes: code blocks' --project mobile`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

2026-11-22. Frontera implementer en Codex Desktop con GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git Bash, gh, Node 24.21.0, JDK 21 y Docker Desktop. [PR #86](https://github.com/MatiasNicolasAcevedo/devnotes/pull/86), base `main@1b6ee91b2c5276e170da00aa0204d222892096c0` y fuentes probadas `31b2d2ff3261858416f172c4ae724c8ac9bf19b9`. El HEAD de entrega es el hijo documental de esas fuentes. La consulta `gh pr view 86 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup` identifica el HEAD publicado y su `verify-required`. Pendiente: revisión independiente.

- Entrada. `gh pr view 85 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit` confirmó MERGED, `2026-11-22T16:32:13Z` y squash `1b6ee91b2c5276e170da00aa0204d222892096c0` (exit 0 con acceso de red). `git fetch origin main` y `git merge-base --is-ancestor $mergeOid origin/main` (exit 0). El primer commit `1635c89` concilió T-082 y habilitó T-083.
- Impacto. Libres agrega JSON, SQL y TXT bajo Herramientas, resaltado léxico de JSON/SQL, copia exacta, scroll horizontal local y salida con deshacer incluso si ya existe el párrafo siguiente. API de Libres y respaldo XLSX v4 aceptan `codeBlock` con lenguaje permitido y texto sin marcas. El diario conserva su esquema. Sin migraciones, cambios de permisos ni dependencias nuevas.
- Backend. Con JDK 21 y Git Bash, `./mvnw -q spotless:apply` y `./mvnw -q test -Dtest=FreeNoteDocumentTest,XlsxFreeNotesRoundTripTest` (exit 0). Compilación y Surefire, 34/34 en documento y 17/17 en XLSX. Incluye preservación de texto, negativos de lenguaje, estructura y diario, restauración exacta v4 y texto legible.
- Cliente. `npm test -- --run src/features/free-notes` (22/22, exit 0), `npm test -- --run src/features/free-notes src/features/daily/editor/DailyEditor.test.tsx` (44/44, exit 0) y `npm run typecheck` (exit 0). Prettier y ESLint dirigidos (exit 0).
- E2E. `bash scripts/e2e.sh --grep 'free-notes: code blocks' --project desktop` con `starter-e2e-t083-desktop-caret` y el filtro equivalente `--project mobile` con `starter-e2e-t083-mobile` (exit 0, 1/1 cada uno). API y PostgreSQL reales con OIDC ficticio. Comprueba sintaxis inválida como texto, cambio de lenguaje, clipboard real, scroll interno a 768 y 320 px, deshacer con cursor en el mismo punto, recarga, rechazo desde API y restauración en otra cuenta ficticia. Cero contenedores, redes y volúmenes antes y después por label exacto en los tres namespaces usados.
- Documentos y política. `node scripts/docs-check.mjs` sobre el árbol versionado (exit 0, excluye `trailer/` local preexistente), `git diff --check origin/main...HEAD` y `bash scripts/verify.sh --policy origin/main` (exit 0, APPLICATION / FULL informativo). El avance técnico tuvo `verify-required` exitoso en el [run 45045452143](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/45045452143). `git diff --exit-code 31b2d2f HEAD -- client server e2e scripts` vincula las pruebas al commit de entrega. **FULL/STARTER: DIFERIDO POR EL DUEÑO**. Render Auto-Deploy On Commit.

| Causa | Arreglo | Prueba |
|---|---|---|
| El runner rechaza `--project=desktop` (exit 2). | Usar `--project desktop` y `--project mobile`, como indica la ayuda del script. | Los dos E2E finales usan esa sintaxis. |
| La primera corrida desktop (exit 1) usaba Ctrl+Inicio para colocar el cursor dentro del código. Chromium colocó el ancla en el contenedor exterior. | Colocar el cursor con un clic en una palabra del bloque y medir su desplazamiento antes y después de deshacer. | Los E2E finales prueban el desplazamiento exacto tanto al crear un párrafo como al reutilizarlo. |
| ESLint detectó la vista React en el módulo que exportaba la extensión (exit 1). | Separar la vista y la extensión, y reutilizar el límite de historial de las listas. | Prettier, ESLint, Vitest, typecheck y E2E sobre `31b2d2f`. |
