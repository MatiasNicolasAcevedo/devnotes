# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-015](tasks/T-015-adoption-checks.md) |
| Estado | in_progress |
| Acción actual | FRONTERA implementer porta los dos checks fijados, renueva el rojo propio y verifica STARTER antes de publicar para revisión |
| Rama / PR | codex/t-015-adoption-checks · [PR #2 draft](https://github.com/MatiasNicolasAcevedo/devnotes/pull/2) |

T-000 MERGED y conciliada; aceptación E-01 y evidencia propia conservadas. T-015 tiene port/gate/revisión/merge pendientes: pruebas del starter no acreditan DevNotes. HANDOFF sigue NO_LISTO21/22 hasta cierre propio. T-001 continúa draft dependiente de T-015; producto todavía no iniciado. El reviewer de T-015 preparará el prompt final Junie T-001 antes de aprobar, condicionado a MERGED/conciliación.

### Prompt de la siguiente sesión
```text
Sesión nueva de FRONTERA, rol implementer, para T-015 · Traslado acotado de controles de adopción. Repositorio C:\D\matias\proyectos-ia\devnotes; rama exacta codex/t-015-adoption-checks, continuar PR #2 draft contra main. Leer AGENTS.md, docs/STATUS.md, docs/tasks/T-015-adoption-checks.md, docs/agents/implementer.md, AUTONOMY y las referencias concretas de la tarea. Comprobar árbol/último commit, HEAD/base publicados, PR/CI y starter PR7 MERGED en 8d2fafecb0cfbd617998a41388c0855c676b3848; usar ese commit como fuente, no el checkout mutable del hermano. T-000 PR1 ya MERGED en cbbe1c9075a41edf2ceffd35eedf1e05dedd6870 y conciliada: no reabrirla ni pedir otra aceptación E-01. Pasar T-015 a in_progress y portar solo scripts/docs-check.mjs y scripts/ci/docs-check.test.mjs, con H01/H02, negativos y coherencia del tablero. Conservar rojo propio verificable de .orchestrator/t015 y renovarlo si cambiaron sus fuentes; conteos/exit reales, NODE_TEST_CONTEXT aislado si hay runner hijo. Ajustar README/SETUP y definiciones canónicas necesarias según contrato, preservando inventario y sondas CLI Junie aceptados. No copiar inicializador/manifiesto del starter, que retiraría su T-006 de mantenimiento: aquí T-006 es producto. Sin cambios de aplicación, dependencias, permisos, auth, datos o UI. Gate STARTER propio por los scripts, checkpoint antes con SHA/base/huellas/logs/recursos propios/cleanup, sin usar gate del starter o T-000 como evidencia del port. Publicar en este mismo PR con staging explícito, Conventional Commits en inglés y Refs: T-015; docs-check, CI del HEAD exacto y árbol limpio. Al cerrar, dejar in_review y único prompt para otra sesión nueva FRONTERA reviewer, que podrá aprobar/mergear si elegible y preparará STATUS para Junie T-001 con precondición MERGED/conciliación de T-015. No autoaprobar/mergear ni implementar T-001 aquí. Conservar WIP1, límites de rondas y decisiones propias; ante bloqueo fuera de contrato dejar causa/evidencia/dato necesario al dueño, sin instalar/autenticar/delegar ni modificar protecciones.
```
