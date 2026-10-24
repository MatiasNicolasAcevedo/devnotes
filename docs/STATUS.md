# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-007](tasks/T-007-daily-workspace.md) |
| Estado | in_review |
| Acción actual | Corrección publicada 8fdbe17 — loadList se invoca al montar. Pendiente segunda revisión |
| Rama / PR | codex/t-007-daily-workspace, PR #12

T-006: conciliada como MERGED (6eb2c42). Junie reviewer + merger, Qwen3.6-27B-FP8. Client gate 218 tests OK, 100% líneas daily, 90.47% branches. Revisión APROBADA sin observaciones, CI verify-required pass.

T-016: conciliada como MERGED (4499962). Junie merger, Qwen3.6-27B-FP8. Corrección de revisión publicada (f392d98). Bloqueantes resueltos: debounce se reinicia en cada edición, `flush({ force })` implementado. Tests añadidos: debounce timing, error de red + 409, desmontar/remontar. Client gate OK: 232 tests, 91.24% statements, 86.25% branches. Segunda revisión independiente APROBADA (HEAD 2240566, base main e6ec7a6). CI verify-required SUCCESS. Merge squash 4499962, 2026-10-24.

T-007: changes_requested → in_review. Corrección publicada 8fdbe17. Junie implementer, Qwen3.6-27B-FP8. Bloqueante resuelto: useEffect con `.then()/.catch()/.finally()` invoca `listDailyNotes(0)` al montar DailyNotesInner. `listLoading` inicializado a `true` para evitar setState síncrono en efecto (regla react-hooks/set-state-in-effect). Test añadido: "carga la lista Notas guardadas al montar la página" (repro rojo primero, luego verde). Tests existentes actualizados con mock de lista para silenciar advertencias MSW. Client gate OK: 233 tests, 88.36% statements, 81.96% branches. Pendiente segunda revisión independiente. 2026-10-24.
