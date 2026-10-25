# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-012](tasks/T-012-version-history.md) |
| Estado | in_review |
| Acción actual | Corrección de bloqueantes commitada y publicada. Pendiente revisión independiente. |
| Rama / PR | codex/t-012-version-history (b34004c)

T-011: conciliada como MERGED (397798e). Junie reviewer + merger, Qwen3.6-27B-FP8. Revisión APROBADA sin bloqueantes. DailyVersionApiIT 23/23 OK (PostgreSQL Testcontainers, OIDC real), docs-check OK, CI verify-required SUCCESS. Squash merge 397798e, 2026-10-25.

T-010: conciliada como MERGED (46d9d9e). Junie reviewer + merger, Qwen3.6-27B-FP8. Revisión APROBADA sin bloqueantes. DailyVersionServiceIT 16/16 OK (PostgreSQL Testcontainers), docs-check OK, CI verify-required SUCCESS. Squash merge 46d9d9e, 2026-10-25.

T-009: conciliada como MERGED (596e385). Junie reviewer + merger, Qwen3.6-27B-FP8. Revisión APROBADA sin bloqueantes. Client gate OK: 23 tests (14 LinkDialog + 9 DailyEditor), 274 tests total, 83.21% statements, 77.01% branches, typecheck OK, docs-check OK. CI verify-required SUCCESS. Squash merge 596e385, 2026-10-25.

T-008: conciliada como MERGED (5d2a70f). Junie reviewer + merger, Qwen3.6-27B-FP8. Revisión APROBADA sin bloqueantes. Client gate OK: 27 tests (18 separator + 9 DailyEditor), typecheck OK, docs-check OK. CI verify-required SUCCESS. Squash merge 5d2a70f, 2026-10-25.

T-006: conciliada como MERGED (6eb2c42). Junie reviewer + merger, Qwen3.6-27B-FP8. Client gate 218 tests OK, 100% líneas daily, 90.47% branches. Revisión APROBADA sin observaciones, CI verify-required pass.

T-016: conciliada como MERGED (4499962). Junie merger, Qwen3.6-27B-FP8. Corrección de revisión publicada (f392d98). Bloqueantes resueltos: debounce se reinicia en cada edición, `flush({ force })` implementado. Tests añadidos: debounce timing, error de red + 409, desmontar/remontar. Client gate OK: 232 tests, 91.24% statements, 86.25% branches. Segunda revisión independiente APROBADA (HEAD 2240566, base main e6ec7a6). CI verify-required SUCCESS. Merge squash 4499962, 2026-10-24.

T-007: conciliada como MERGED (1702fd9). Junie reviewer + merger, Qwen3.6-27B-FP8. Corrección documental publicada 5b08a16. Revisión independiente APROBADA (HEAD 741ce7c, base main 4499962). docs-check OK, 242 tests, 87.96% statements, 81.96% branches. CI verify-required SUCCESS. Merge squash 1702fd9, 2026-10-25.

### Prompt de la siguiente sesión

```text
Sesión nueva Junie reviewer para T-012 — corrección de bloqueantes: historial de versiones (frontend).
Rama codex/t-012-version-history, HEAD 852d285, base main e15abf0.
Leer contrato T-012, spec S-104 v2, y client/AGENTS.md.
Commits a revisar:
  b34004c fix(daily): migrate history page to TanStack Query hooks for cache and logout cleanup
  852d285 docs(t-012): update checkpoint with correction commit SHA and in_review status
Bloqueantes resueltos: (1) Se crearon hooks de TanStack Query (useDailyVersionQuery.ts) siguiendo el patrón de useDailyNoteQuery.ts, y DailyHistoryPage.tsx migrada para usarlos con enabled condicional a sesión activa. (2) Los datos ahora entran en la cache de Query y se limpian automáticamente al logout vía discardPrivateData/removeQueries.
Revisar: useDailyVersionQuery.ts (nuevo), DailyHistoryPage.tsx (modificada), DailyHistoryPage.test.tsx (ajustado).
Gate client: 304 tests passed, 83.41% statements, 77.71% branches, typecheck OK, build OK.
Lint: 5 errores pre-existentes en DailyEditor/separator (T-008/T-009), sin nuevos introducidos.
Backend: SecurityConfigTest falla por OIDC config faltante en entorno (pre-existente, no relacionado con esta tarea).
```
