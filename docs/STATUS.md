# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-007](tasks/T-007-daily-workspace.md) |
| Estado | changes_requested |
| Acción actual | Segunda revisión: código OK, CI falla por inconsistencia documental. Pendiente corrección frontmatter T-007 y BACKLOG |
| Rama / PR | codex/t-007-daily-workspace, PR #12

T-006: conciliada como MERGED (6eb2c42). Junie reviewer + merger, Qwen3.6-27B-FP8. Client gate 218 tests OK, 100% líneas daily, 90.47% branches. Revisión APROBADA sin observaciones, CI verify-required pass.

T-016: conciliada como MERGED (4499962). Junie merger, Qwen3.6-27B-FP8. Corrección de revisión publicada (f392d98). Bloqueantes resueltos: debounce se reinicia en cada edición, `flush({ force })` implementado. Tests añadidos: debounce timing, error de red + 409, desmontar/remontar. Client gate OK: 232 tests, 91.24% statements, 86.25% branches. Segunda revisión independiente APROBADA (HEAD 2240566, base main e6ec7a6). CI verify-required SUCCESS. Merge squash 4499962, 2026-10-24.

T-007: changes_requested. Segunda revisión independiente (Junie reviewer, Qwen3.6-27B-FP8, HEAD 374f08d, base main 4499962). Código APROBADO: useEffect con `.then()/.catch()/.finally()` invoca `listDailyNotes(0)` al montar correctamente; test nuevo cubre el caso; 10/10 tests DailyNotesPage OK, typecheck OK. Bloqueante documental: CI docs-check falla porque (1) frontmatter T-007 dice `in_progress` pero STATUS.md dice `in_review` — deben coincidir; (2) docs-check reporta T-016 como mergeable pero no figura en BACKLOG. Condición de cierre: alinear frontmatter a `in_review`, resolver referencia T-016 en BACKLOG, y CI verify-required SUCCESS. 2026-10-24.
