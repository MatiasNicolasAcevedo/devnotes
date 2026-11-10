# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-036](tasks/T-036-voice-navigation.md) · S-105 / navegación y sesión |
| Estado | `in_progress` |
| Acción actual | Implementer ejecuta FULL/APPLICATION para cerrar las correcciones B-1 y B-2. |
| Rama / PR | codex/t-036-voice-navigation · [PR42](https://github.com/MatiasNicolasAcevedo/devnotes/pull/42) |

T-038: PR41 MERGED y conciliada como done. Evidencia del squash y checks en [T-038](tasks/T-038-reference-preview-fix.md#checkpoint-vigente).

T-035: PR40 MERGED, squash `e1fbaea1ca3ae868dd2ca93569da45eab65aa413`, confirmado en GitHub el 2026-11-09 (mergedAt 2026-11-10T01:39:05Z). Merge con excepción del dueño acotada a `reference-preview.spec.ts` (preexistente), corregido en T-038.

T-034: PR39 MERGED, squash `085dc763918fa63e6de6b89b98ddfc9e87805f3a`, confirmado en GitHub el 2026-11-09. Junie reviewer + merger, Qwen3.6-27B-FP8. Segunda revisión independiente APROBADA sin bloqueantes. HEAD 13d250b, base main e1648a5, CI verify-required SUCCESS, docs-check OK. Client gate OK: lint, typecheck, VoiceComposer.test.tsx 5/5, AppRoutes.test.tsx 7/7, voiceNoteTextSchema.test.ts 7/7, build OK.

T-033: PR37 MERGED, squash `e1648a55b372194e6d61801aaae97ec4bf0c6a0f`, confirmado en GitHub el 2026-11-09. Junie reviewer + merger, Qwen3.6-27B-FP8. Revisión independiente APROBADA sin bloqueantes. HEAD d26b601, base main f3bbaa8, CI verify-required SUCCESS, docs-check OK. Client gate 435/435 tests OK.

T-032: PR36 MERGED, squash `f3bbaa80b9db64f607c953e58ea792c66461d53a`, confirmado en GitHub el 2026-11-02. Junie reviewer + merger, Qwen3.6-27B-FP8. Revisión independiente APROBADA sin bloqueantes. HEAD b9d4192, base main af467de, CI verify-required SUCCESS, docs-check OK. Client gate 408/408 tests OK.

T-031: PR35 MERGED, squash `af467de3a75cef0858f8d65682e2dd6206a6ddb7`, confirmado en GitHub el 2026-11-02.

T-030: PR34 MERGED, squash `2581b17cb19c949dbe7566ac77d830dd9fdcc7c9`, confirmado en GitHub el 2026-11-01. Junie reviewer + merger, Qwen3.6-27B-FP8. Revisión independiente APROBADA sin bloqueantes. HEAD c02b721, base main 3700ad0, CI verify-required SUCCESS (run 41273488514), docs-check OK. Backend clean verify 210/210 OK, JaCoCo OK, Spotless OK. Gate STARTER docs/server/client/tooling OK.

T-029: PR33 MERGED, squash `3700ad0da30efe1ab517c3eb6f686b08bc7e1487`, confirmado en GitHub el 2026-11-01. Junie implementer + reviewer + merger, Qwen3.6-27B-FP8. Revisión independiente APROBADA sin bloqueantes. HEAD c8ac0a4, base main 32e5584, docs-check OK, policy FULL. Backend clean verify 210/210 OK, JaCoCo OK, Spotless OK. Gate STARTER docs/server/client OK; tooling failure (test-init-copy.sh) preexistente.

T-028: PR32 MERGED, squash `32e55845e5dd79f6e0b6276e7620604f20995d8f`, confirmado en GitHub el 2026-11-01. Junie reviewer + merger, Qwen3.6-27B-FP8. Revisión independiente APROBADA sin bloqueantes. HEAD 7d5fb90, base main cf518dc, CI verify-required SUCCESS (run 41259585317), docs-check OK. Backend clean verify 202/202 OK, JaCoCo OK, Spotless OK.

T-027: PR31 MERGED, squash `cf518dc86daf02b66f077acc371184a4beb69280`, confirmado en GitHub el 2026-10-31. Junie reviewer + merger, Qwen3.6-27B-FP8. Revisión independiente APROBADA sin bloqueantes. HEAD 3366c58, base main 6e7ebd0, CI verify-required SUCCESS (run 41252701369), docs-check OK. Backend clean verify 190/190 OK, JaCoCo OK, Spotless OK.

T-017: PR30 MERGED, squash `6e7ebd01851ba1a81c856147d7895449ea97a7fe`, confirmado en GitHub el 2026-10-31.

T-026: PR29 MERGED, squash `0d976dc2187cb2a07061c3db48130c334b1e471b`, confirmado en GitHub el 2026-10-31.

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
Implementer, sesión nueva. Retomar T-036 en PR42 de MatiasNicolasAcevedo/devnotes, rama codex/t-036-voice-navigation contra main. Leer docs/agents/implementer.md y el checkpoint de docs/tasks/T-036-voice-navigation.md. Confirmar la base publicada y el resultado del FULL/APPLICATION de las correcciones B-1 y B-2, incluida la limpieza. Con gate verde, publicar en el mismo PR y dejar la segunda revisión independiente.
```
