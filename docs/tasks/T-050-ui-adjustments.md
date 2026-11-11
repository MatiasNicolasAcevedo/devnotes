---
id: T-050
status: draft
priority: P1
size: S
executor: junie
role: implementer
milestone: M3
product_cycle: I3
spec: null
branch: codex/t-050-ui-adjustments
pr: null
depends_on: [T-044]
---
# T-050 · Ajustes mínimos de UI previos al piloto en Render

## Objetivo

Aplicar en el frontend un conjunto acotado de retoques visuales elegidos por el dueño, para que el piloto en Render salga con la interfaz que él quiere usar. Es una sola tarea, pedida por el dueño el 2026-11-11, que se antepone a [T-046](T-046-render-image.md). La siguiente tarea es T-046; si un ajuste exige cambiar comportamiento, API, permisos o datos, vuelve a frontera.

## Alcance y decisiones resueltas

**Pendiente de definir con el dueño.** Está en `draft` porque el contrato no está completo, no por una dependencia. Pasos acordados para completarlo, todos de frontera y en la rama `codex/docs-s107-reconcile-ui-plan`:

1. El dueño revisa la aplicación en su stack local y enumera lo que quiere ajustar.
2. Frontera presenta 2 o 3 propuestas visuales comparables.
3. El dueño elige una y frontera escribe aquí el alcance, los archivos, los pasos y la aceptación con comandos exactos. Recién entonces pasa a `ready`.

Límites ya fijados: solo `client/`, sin dependencias nuevas, sin cambios de API, permisos, esquema ni datos; se conservan MUI, el tema oscuro y Roboto Mono del editor.

## Leer antes

1. [client/AGENTS](../../client/AGENTS.md).
2. [TESTING · Tiempos de E2E](../TESTING.md#tiempos-de-e2e---advertencia-critica).

## Archivos y pasos

Por completar junto con el alcance.

## Aceptación y pruebas

Por completar junto con el alcance. Como mínimo llevará el gate de cliente y las pruebas de componente de las pantallas tocadas, en 1280 y 375 px.

## Checkpoint vigente

2026-11-11. Frontera en Claude Code de escritorio (Claude Fable 5.2, `claude-fable-5-2`, esfuerzo no expuesto), con Git Bash, Git, `gh`, Docker y Node. Tarea creada como marcador de la cola a pedido del dueño; sin cambios de comportamiento, API, permisos, datos ni UI todavía. Falta el paso 1: la revisión del dueño.

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|

## Cierre y siguiente tarea

PR propio y revisión independiente. Tras MERGED, conciliar y tomar [T-046](T-046-render-image.md) si T-045 ya tiene el veredicto del dueño.
