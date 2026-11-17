---
id: T-082
status: draft
priority: P1
size: S
milestone: M7
spec: S-114
depends_on: [T-081]
branch: codex/t-082-free-notes-lists
role: implementer
executor: frontier
pr: null
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
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t082-desktop bash scripts/e2e.sh --grep 'free-notes: lists' --project=desktop`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t082-mobile bash scripts/e2e.sh --grep 'free-notes: lists' --project=mobile`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

Habilitar en sesión nueva tras confirmar [T-081](T-081-compact-daily-notes.md) MERGED y conciliarla. Registrar el SHA/base y la evidencia efectivamente ejecutada.
