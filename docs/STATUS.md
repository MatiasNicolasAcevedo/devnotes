# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-016](tasks/T-016-daily-draft-coordinator.md) |
| Estado | in_review |
| Acción actual | Corrección de revisión publicada, pendiente revisión independiente |
| Rama / PR | codex/t-016-daily-draft-coordinator, PR #11

T-006: conciliada como MERGED (6eb2c42). Junie reviewer + merger, Qwen3.6-27B-FP8. Client gate 218 tests OK, 100% líneas daily, 90.47% branches. Revisión APROBADA sin observaciones, CI verify-required pass.

T-016: corrección de revisión publicada (f392d98). Bloqueante resuelto: debounce se reinicia en cada edición (`timerRef.current === null` eliminado de la condición). `flush({ force })` implementado para saltar validación. Tests añadidos: debounce timing (3 ediciones → 1 PUT a t=1500), error de red + 409 conserva borrador, desmontar/remontar. Se fixearon 3 errores de lint preexistentes (react-refresh, react-hooks/refs, useCallback self-reference). Client gate OK: 232 tests, 91.24% statements, 86.25% branches. Pendiente: revisión independiente.

### Checkpoint vigente

2026-10-24, corrección de revisión implementada y publicada (f392d98). Client gate OK: 232 tests, 91.24% statements. Pendiente: revisión independiente sobre HEAD f392d98 vs base main.

### Prompt de la siguiente sesión

```text
Sesión nueva Junie reviewer para T-016, revisión independiente. PR #11 (HEAD f392d98) corrección de revisión publicada. Verificar: debounce se reinicia en cada edición, flush force implementado, tests nuevos pasan. Base main actualizado.
```
