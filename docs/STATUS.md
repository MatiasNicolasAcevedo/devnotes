# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-026](tasks/T-026-reference-preview.md) (in_progress) |
| Estado | in_progress |
| Acción actual | Código publicado, PR #29 abierto. Pendiente: revisión independiente y CI verde. |
| Rama / PR | codex/t-026-reference-preview / [#29](https://github.com/MatiasNicolasAcevedo/devnotes/pull/29) |

T-025: PR28 MERGED, squash `9a1404490779e0462e326aefa015e2c4596a0e91`, confirmado en GitHub el 2026-10-29.

T-024: PR27 MERGED, squash `e049e3c2aed6428c2c97153ba1cdee13a640844c`, confirmado en GitHub el 2026-10-28.

T-023: PR24 MERGED, squash `b0ebaae34d58bc14708025c9cbcea0f1976bd2ad`, confirmado en GitHub el 2026-10-28.

T-022: PR23 MERGED, squash `ca9d44de47195c277d386ac5aa61e2a94b096d0e`, confirmado en GitHub el 2026-10-28.

T-021: PR22 MERGED, squash `8e09525e2032ad81aec5e636547860646d97e8a0`, confirmado en GitHub el 2026-10-28.

T-020: PR20 MERGED, merge `cde66f4`, confirmado por GitHub el 2026-10-27.

T-019: conciliada como MERGED (16f6d53). Junie reviewer + merger, Qwen3.6-27B-FP8. Tercera revisión independiente autorizada por el dueño tras dos rondas, APROBADA sin bloqueantes. HEAD 2d72cca, base main 9da4ab4, CI verify-required SUCCESS, docs-check OK, diff-check OK, policy DOCS_ONLY/DOCUMENTATION. Squash merge 16f6d53, 2026-10-27.

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
Junie reviewer, en sesión nueva: T-026 implementación publicada (PR #29). Revisión independiente de HEAD fc9eb59 contra base main 9a14044. Verificar diff, ejecutar CI verify-required y FULL E2E con stack real antes de merge.

Contrato: [T-026](docs/tasks/T-026-reference-preview.md) — vista previa accesible con hover, teclado y tacto.

Leer antes: S-106, client/AGENTS.md, TESTING.md, AGENTS raíz, STATUS y protocolo reviewer.
```
