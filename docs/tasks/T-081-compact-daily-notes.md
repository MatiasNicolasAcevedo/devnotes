---
id: T-081
status: in_progress
priority: P1
size: S
milestone: M7
spec: S-114
depends_on: [T-080]
branch: codex/t-081-compact-daily-notes
role: implementer
executor: frontier
pr: null
---

# T-081 · Acercar el diario al comienzo de la ventana

## Objetivo

Acercar el diario al comienzo de la ventana con el recorrido observable descrito en la aceptación.

## Alcance

Compactar DailyNotesPage y espacio contextual del shell. Quitar listado inferior y consulta exclusiva. Mantener Libres, fecha, Hoy, enlaces, copiar y Guardar versión. [Contrato S-114](../specs/S-114-writing-editor.md) · [Diseño y previsualización](../design/WRITING-WORKSPACES.md).

## Aceptación y pruebas

Medidas pre/post a 768×559 en Chromium/PWA según spec, 320/375 y 1280 para reflujo/foco. Fecha con borrador sin versión abre por calendario o URL. Guardar versión alimenta Historial. Conservar feedback en fallo y acceso a enlaces.

- Desde `client/`. `npm test -- --run src/features/daily/DailyNotesPage.test.tsx src/features/daily/DailyNotesToolbar.test.tsx src/features/daily/DailyHistoryPage.test.tsx` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t081-desktop bash scripts/e2e.sh --grep 'multiline clipboard, persistence, scroll focus and compact layout|CA-04:|T-020:' --project=desktop`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t081-mobile bash scripts/e2e.sh --grep 'multiline clipboard, persistence, scroll focus and compact layout|CA-04:|T-020:' --project=mobile`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

2026-11-22. Frontera implementer, Codex Desktop con GPT-6 (variante y esfuerzo sin dato expuesto). Base `main@8f4ea2c3f32cff823b5a9e3d3ffd17b5217d4b6e`. `gh pr view 83 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit` y `git merge-base --is-ancestor 8f4ea2c3f32cff823b5a9e3d3ffd17b5217d4b6e origin/main` (exit 0) habilitaron T-081. Alcance UI del diario y shell contextual. Pendientes medición, implementación, gate y publicación.
