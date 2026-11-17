---
id: T-092
status: done
priority: P1
size: M
milestone: M6
spec: null
depends_on: [T-071]
branch: codex/t-092-writing-workspaces-plan
role: planner
executor: frontier
pr: 75
counts_for_cycle: false
---

# T-092 · Plan de Imagen, Libres e IA global

## Objetivo

Entregar un PR documental con el diseño, la secuencia y los contratos de implementación de T-073 a T-091. Objetivos de salida por tramo en [ROADMAP](../ROADMAP.md), dependencias en [BACKLOG](../BACKLOG.md#lote-imagen-libres-e-ia) y especificación visual en [diseño](../design/WRITING-WORKSPACES.md).

## Alcance e inventario

- Base GitHub confirmada el 2026-11-16, `main` `7aa8946e727cfadbd2552588eef31cbe07594f00`, PR #74 MERGED sobre ese squash y cero PR activos antes de crear la rama. Conservar conciliación y hechos de T-071.
- Recuperar del checkout de T-073 el commit local `2a2fc56`, el diagnóstico sintético, evidencia de boceto de cinco destinos, soporte de placeholder y los cuatro archivos modificados. Rama documental parte de ese commit y se verificó la copia de esos archivos por SHA-256 antes de editar. La rama y checkout original siguen preservados.
- Convertir ideas 2, 16, 21, 22 y 24 a ejecución, incorporar compacidad del diario y retirar su lista inferior. Ideas 9 y 34 salen de la cola. T-072 queda como fuente del banco de pruebas, con alcance de producto supersedido por S-116.
- Implementación y pruebas de producto corresponden a las siguientes sesiones. Impacto de este PR solo documental. Los contratos futuros afectan comportamiento y UI, persistencia y respaldo PostgreSQL/XLSX y salida deliberada a proveedores IA con política cerrada por defecto. Las decisiones técnicas que añaden alcance se acotan en las specs, con fixtures para toda prueba de este lote.
- Frontera planner en Codex Desktop. Modelo/esfuerzo específicos sin metadato expuesto. Herramientas usadas PowerShell, Git/gh, fuentes web oficiales y Chromium/Playwright local. Diseño con frontend-design.

## Aceptación y revisión

- `bash scripts/verify.sh --policy origin/main` → DOCS_ONLY, vía Git Bash. `node scripts/docs-check.mjs` y `git diff --check origin/main...HEAD` sobre el commit publicado. Corroborar solo altas o modificaciones Markdown y `verify-required` verde sobre el HEAD exacto.
- Sesión revisora independiente identifica el único PR por rama `codex/t-092-writing-workspaces-plan` y base `main`, revisa decisiones, contratos, grafo, diseño y alcance documental; puede hacer squash si elegible según AUTONOMY. La evidencia remota se registra con su URL y SHA exactos.
- El [primer prompt de implementación](../STATUS.md#prompt-de-la-siguiente-sesión) exige T-092 MERGED. Reanudar luego en una sesión implementer. Permiso previo para cualquier FULL/STARTER, incluyendo el integrado del lote. [Aplazamiento](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16).

## Previsualización

Boceto navegable local con ocho vistas (Diario, directorio y editor de Libres, Imagen vacía y con captura, consulta al lado, IA directa y OpenRouter). Chromium 153 midió 106 CSS px hasta la primera línea a 768×559 en el boceto. Las ocho vistas refluían a 320, 375, 480, 768 y 1.280 CSS px, sin scroll horizontal de página. Se comprobó el indicador no seleccionable de Imagen, cinco celdas móviles y el umbral del lector. Contrato visual y wireframes versionados en la [guía de diseño](../design/WRITING-WORKSPACES.md). El boceto y sus PNG usan texto ficticio y se entregan por fuera del diff DOCS_ONLY. Las mediciones finales y Recortes real se acreditan en las tareas de implementación.

## Checkpoint vigente

Revisión documental independiente favorable en Codex Desktop, Frontera reviewer y merger, con PowerShell, Git Bash, Node y GitHub CLI. Modelo GPT-6 según la identificación de la sesión, sin variante ni esfuerzo expuestos. [PR75](https://github.com/MatiasNicolasAcevedo/devnotes/pull/75) es el único PR abierto, de `codex/t-092-writing-workspaces-plan` a `main`. En checkout aislado, HEAD de planificación `451ad57e0bbd4619b84f04664edade4547ec7d9c` y base `7aa8946e727cfadbd2552588eef31cbe07594f00` dieron `bash scripts/verify.sh --policy 7aa8946e727cfadbd2552588eef31cbe07594f00` → `DOCS_ONLY`, `node scripts/docs-check.mjs` → OK y `git diff --check 7aa8946e727cfadbd2552588eef31cbe07594f00 HEAD` → OK. [CI de ese HEAD](https://github.com/MatiasNicolasAcevedo/devnotes/actions/runs/43995050572/job/133744922712) en `SUCCESS`.

Verificados el orden T-073…T-091, la espera de T-073 por T-092 MERGED, los dos respaldos XLSX previos al guardado y el permiso expreso para FULL/STARTER incluso al cierre del lote. Esta transición actualiza solo task y STATUS. Revalidar el gate documental y `verify-required` sobre el nuevo HEAD antes del veredicto canónico en PR75. Tras el squash, el siguiente implementer concilia PR, veredicto, CI y squash al habilitar T-073. Conservar el checkout original de OCR y Auto-Deploy On Commit.

## Conciliación

[PR75](https://github.com/MatiasNicolasAcevedo/devnotes/pull/75) MERGED, confirmado en GitHub el 2026-11-16 con `gh pr view 75 --repo MatiasNicolasAcevedo/devnotes`: squash `77cb710313e02c8fdd4afd1eea27020bd6e98a0c`, mergedAt `2026-11-17T01:42:51Z` (2026-11-16 en Buenos Aires). Conciliada como `done` junto con la adopción del [flujo de trabajo](../WORKFLOW.md); T-073 queda `ready`.