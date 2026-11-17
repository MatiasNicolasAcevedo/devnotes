---
id: T-085
status: draft
priority: P1
size: M
milestone: M7
spec: S-115
depends_on: [T-084]
branch: codex/t-085-side-reading
role: implementer
executor: frontier
pr: null
---

# T-085 · Leer una nota al lado mientras se escribe

## Objetivo

Leer una nota al lado mientras se escribe con el recorrido observable descrito en la aceptación.

## Alcance

Reusar consultas y lectura de Diario guardado y Libres. Añadir selector, layout 60/40 y flujo angosto. Verificar el ancho interno y foco de retorno. [Contrato S-115](../specs/S-115-side-reading.md) · [Diseño y previsualización](../design/WRITING-WORKSPACES.md).

## Aceptación y pruebas

Editor, scroll y borrador se conservan al cerrar/estrechar. Selector y panel no cruzan cuentas/espacios. Fuente borrada propone cambiarla. E2E cambia ancho y recupera la consulta con teclado.

- Desde `client/`. `npm test -- --run src/features/daily/DailyNotesPage.test.tsx src/features/free-notes src/features/side-reading` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t085-desktop bash scripts/e2e.sh --grep 'side reading:' --project=desktop`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t085-mobile bash scripts/e2e.sh --grep 'side reading:' --project=mobile`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

Habilitar en sesión nueva tras confirmar [T-084](T-084-free-notes-headings.md) MERGED y conciliarla. Registrar el SHA/base y la evidencia efectivamente ejecutada.
