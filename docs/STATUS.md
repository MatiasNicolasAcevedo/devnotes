# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-019](tasks/T-019-agent-operating-rules.md) |
| Estado | in_progress |
| Acción actual | Corrección de PR6 en curso; evidencia Windows de Junie pendiente. |
| Rama / PR | codex/t-019-agent-operating-rules · [PR6](https://github.com/MatiasNicolasAcevedo/devnotes/pull/6) contra main |

T-014: PR19 MERGED en `9da4ab4f138bd28753e61d1538003acceb615691`. T-020 está bloqueada sin PR mientras PR6 siga OPEN; su rama publicada es `codex/t-020-editor-usability`.

T-012: conciliada como MERGED (dc6dcbd). Junie reviewer + merger, Qwen3.6-27B-FP8. Revisión APROBADA sin bloqueantes. Client gate OK: 304 tests, 83.41% statements, 77.71% branches, typecheck OK, build OK. CI verify-required SUCCESS. Squash merge dc6dcbd, 2026-10-25.

T-013: conciliada como MERGED (dafaecf). Junie reviewer + merger, Qwen3.6-27B-FP8. Corrección documental B-4 publicada (6342c86). Bloqueantes resueltos: B-1 hook condicional, B-2 executeSave antes de declaración, B-3 react-refresh, B-4 STATUS.md alineado. Segunda revisión independiente APROBADA sin bloqueantes (HEAD 6342c86, base main afe7ccd). Client gate OK: 316 tests, typecheck OK, lint sin errores T-013. CI verify-required SUCCESS. Squash merge dafaecf, 2026-10-25.

T-011: conciliada como MERGED (397798e). Junie reviewer + merger, Qwen3.6-27B-FP8. Revisión APROBADA sin bloqueantes. DailyVersionApiIT 23/23 OK (PostgreSQL Testcontainers, OIDC real), docs-check OK, CI verify-required SUCCESS. Squash merge 397798e, 2026-10-25.

T-010: conciliada como MERGED (46d9d9e). Junie reviewer + merger, Qwen3.6-27B-FP8. Revisión APROBADA sin bloqueantes. DailyVersionServiceIT 16/16 OK (PostgreSQL Testcontainers), docs-check OK, CI verify-required SUCCESS. Squash merge 46d9d9e, 2026-10-25.

T-009: conciliada como MERGED (596e385). Junie reviewer + merger, Qwen3.6-27B-FP8. Revisión APROBADA sin bloqueantes. Client gate OK: 23 tests (14 LinkDialog + 9 DailyEditor), 274 tests total, 83.21% statements, 77.01% branches, typecheck OK, docs-check OK. CI verify-required SUCCESS. Squash merge 596e385, 2026-10-25.

T-008: conciliada como MERGED (5d2a70f). Junie reviewer + merger, Qwen3.6-27B-FP8. Revisión APROBADA sin bloqueantes. Client gate OK: 27 tests (18 separator + 9 DailyEditor), typecheck OK, docs-check OK. CI verify-required SUCCESS. Squash merge 5d2a70f, 2026-10-25.

T-006: conciliada como MERGED (6eb2c42). Junie reviewer + merger, Qwen3.6-27B-FP8. Client gate 218 tests OK, 100% líneas daily, 90.47% branches. Revisión APROBADA sin observaciones, CI verify-required pass.

T-016: conciliada como MERGED (4499962). Junie merger, Qwen3.6-27B-FP8. Corrección de revisión publicada (f392d98). Bloqueantes resueltos: debounce se reinicia en cada edición, `flush({ force })` implementado. Tests añadidos: debounce timing, error de red + 409, desmontar/remontar. Client gate OK: 232 tests, 91.24% statements, 86.25% branches. Segunda revisión independiente APROBADA (HEAD 2240566, base main e6ec7a6). CI verify-required SUCCESS. Merge squash 4499962, 2026-10-24.

T-007: conciliada como MERGED (1702fd9). Junie reviewer + merger, Qwen3.6-27B-FP8. Corrección documental publicada 5b08a16. Revisión independiente APROBADA (HEAD 741ce7c, base main 4499962). docs-check OK, 242 tests, 87.96% statements, 81.96% branches. CI verify-required SUCCESS. Merge squash 1702fd9, 2026-10-25.

### Prompt de la siguiente sesión

```text
Continuar la corrección de T-019 en codex/t-019-agent-operating-rules: comprobar PR6 y main remotos, preservar scripts/e2e.sh ajeno y plantilla/, completar gate y checkpoint, publicar en el mismo PR y entregar a revisión independiente. T-020 permanece bloqueada sin PR mientras PR6 esté abierto. No aprobar ni mergear trabajo propio.
```
