---
id: T-084
status: in_progress
priority: P1
size: S
milestone: M7
spec: S-114
depends_on: [T-083]
branch: codex/t-084-free-notes-headings
role: implementer
executor: frontier
pr: null
---

# T-084 · Tres niveles de título y negrita en Libres

## Objetivo

Tres niveles de título y negrita en Libres con el recorrido observable descrito en la aceptación.

## Alcance

Agregar menú Formato y nodos/marcas acordadas; ampliar validadores/fixtures de v4. Preservar selección y foco. [Contrato S-114](../specs/S-114-writing-editor.md) · [Diseño y previsualización](../design/WRITING-WORKSPACES.md).

## Aceptación y pruebas

Los tres niveles tienen semántica y jerarquía. Negrita desde menú o teclado. Quitar formato conserva texto y rango. Rechazar niveles y marcas desconocidos. Reabrir y restaurar sin pérdida.

- Desde `server/` con Git Bash y JDK 21. `./mvnw -q test -Dtest=FreeNoteDocumentTest,XlsxFreeNotesRoundTripTest`. Registrar las fases y cantidad ejecutada. El comando dirigido no acredita la cobertura agregada.
- Desde `client/`. `npm test -- --run src/features/free-notes` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t084-desktop bash scripts/e2e.sh --grep 'free-notes: headings' --project desktop`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

2026-11-22. Frontera implementer en Codex Desktop con GPT-6 (variante y esfuerzo sin dato expuesto). Base `main@3c7dc999419a2930a881be68fe0cb44d398a2090`. Precondición de T-083 comprobada con gh y ancestry (exit 0). Implementación en curso. Impacto: formato del editor de Libres, validación del documento en su API y respaldo XLSX v4. Sin migraciones ni cambios de autorización. **FULL/STARTER: DIFERIDO POR EL DUEÑO**.
