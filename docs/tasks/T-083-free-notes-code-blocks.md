---
id: T-083
status: in_progress
priority: P1
size: S
milestone: M7
spec: S-114
depends_on: [T-082]
branch: codex/t-083-free-notes-code-blocks
role: implementer
executor: frontier
pr: null
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
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t083-desktop bash scripts/e2e.sh --grep 'free-notes: code blocks' --project=desktop`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t083-mobile bash scripts/e2e.sh --grep 'free-notes: code blocks' --project=mobile`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

2026-11-22. Frontera implementer en Codex Desktop con GPT-6 (variante y esfuerzo sin dato expuesto). Base `1b6ee91b2c5276e170da00aa0204d222892096c0`. PR #85 MERGED. `gh pr view 85 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit`, `git fetch origin main` y `git merge-base --is-ancestor $mergeOid origin/main` (exit 0). Pendiente implementar y correr el gate. **FULL/STARTER: DIFERIDO POR EL DUEÑO**.
