# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-040](tasks/T-040-daily-timestamps.md) · S-107 / tarea portadora de la rama compartida y del PR único |
| Estado | `in_progress` |
| Acción actual | T-040 cerrada en la rama compartida con XL-01 verde (`f10529f`); sigue como portadora. [T-041](tasks/T-041-xlsx-codec.md) cerrada con XL-02 verde (`900913b`), [T-042](tasks/T-042-xlsx-export-api.md) cerrada con XL-03 verde (`345514c`), [T-043](tasks/T-043-xlsx-import-api.md) cerrada con XL-04 verde y proxies probados (`2095b1e`) y [T-044](tasks/T-044-xlsx-client.md) cerrada con XL-05 verde y gate de cliente (`b18bd04`). Tarea en curso: [T-045](tasks/T-045-xlsx-journey.md), con XL-06 verde en desktop y mobile (`6980805`) y el gate integrado `--starter` en ejecución sobre el HEAD de la rama. Faltan el control de avance, el paso del PR a revisión y la prueba del dueño. [Checkpoint](tasks/T-045-xlsx-journey.md#checkpoint-vigente) |
| Rama / PR | `codex/s-107-xlsx-portability` · [PR49](https://github.com/MatiasNicolasAcevedo/devnotes/pull/49), draft, único de S-107 |

Por decisión del dueño del 2026-11-10, T-040…T-045 comparten la rama `codex/s-107-xlsx-portability` y un único PR; FULL integrado sobre su HEAD final. Mientras dura la rama, esta tabla mantiene a T-040 como tarea portadora y nombra la tarea en curso en «Acción actual» y en el prompt. [Regla](specs/S-107-xlsx-portability.md#tareas-y-dependencias)

T-049: PR48 MERGED, squash `fc8fda5b20946e595c153144e99d9a3d3346ac5d`, confirmado en GitHub el 2026-11-10 (mergedAt 2026-11-10T21:31:31Z), HEAD `5bc1e98`, `verify-required` SUCCESS. [Conciliada como done](tasks/T-049-voice-retest.md#conciliación), con las observaciones no bloqueantes del veredicto resueltas o en BACKLOG. El cleanup de T-049 espera autorización del dueño.

T-048: [PR47 MERGED y conciliada como done](tasks/T-048-groq-multipart-fix.md#checkpoint-vigente).

T-039: [PR46 MERGED y conciliada como done](tasks/T-039-voice-activation.md#checkpoint-vigente).

T-037: PR44 MERGED, squash `aef4213db2fe7f676591811b7ee67a22757b64b0`, confirmado en GitHub el 2026-11-10 (mergedAt 2026-11-10T16:37:31Z). Conciliada como done; SHA de entrega congelado en [VOICE-RELEASE](VOICE-RELEASE.md). Plan posterior del dueño (2026-11-10) en [S-107](specs/S-107-xlsx-portability.md) y [S-108](specs/S-108-render-pilot.md).

T-036: PR42 MERGED, squash `289dd66acfad5bb632ad3270a90963c17d239f96`, confirmado en GitHub el 2026-11-10 (mergedAt 2026-11-10T06:39:13Z). Conciliada como done en [T-036](tasks/T-036-voice-navigation.md#checkpoint-vigente).

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
Actuá como implementer de T-045 en MatiasNicolasAcevedo/devnotes, siguiendo AGENTS.md, docs/agents/implementer.md y docs/AUTONOMY.md. Sesión nueva: no implementaste T-040, T-041, T-042, T-043 ni T-044.

Precondición, a comprobar sin dar nada por supuesto:
gh pr view 49 --repo MatiasNicolasAcevedo/devnotes --json number,url,state,isDraft,headRefName,headRefOid,baseRefName
Debe devolver state OPEN, isDraft true, headRefName codex/s-107-xlsx-portability y baseRefName main. El HEAD remoto debe contener b18bd04 (pantalla «Datos» de T-044) y docs/tasks/T-044-xlsx-client.md debe registrar T-044 cerrada en la rama con XL-05 verde. Si no coincide, o el árbol local tiene cambios ajenos, detenete e informá el estado real.

Luego:
1. Continuá en la rama compartida codex/s-107-xlsx-portability, sin crear otra rama ni otro PR. T-040…T-045 van en esa rama y en el PR49, según «Tareas y dependencias» de docs/specs/S-107-xlsx-portability.md.
2. Tomá T-045 (docs/tasks/T-045-xlsx-journey.md) y ejecutá su contrato: e2e/tests/portability.spec.ts con títulos «portability:», iterando con --grep "portability:" --project desktop y luego mobile (XL-06), sin page.route ni interceptores sobre la API propia. Leé docs/TESTING.md (tiempos de E2E), docs/E2E-ITERATION.md y las decisiones de implementación del checkpoint de T-044: textos visibles de la pantalla, vista previa con accountEmpty false al reimportar (sin botón «Importar») y medición real de overflow a 375 px pendiente para el proyecto mobile.
3. T-040 sigue siendo la tarea portadora: docs/STATUS.md la mantiene en «Tarea y contrato» con in_progress hasta el cierre de T-045, y T-045 se nombra en «Acción actual» y en el prompt. El frontmatter de T-045 no pasa a in_progress; su avance y cierre van en su «Checkpoint vigente».
4. Con XL-06 verde y las fuentes sin cambios, corré una sola vez el FULL integrado sobre el HEAD final del PR único, con el comando único de la tabla de T-045 más --tooling (perfil STARTER: T-041 cambió el POM; confirmalo con bash scripts/verify.sh --policy desde c5e37cc4b73ad038ac35edf29c66131416bb4a34). Antes de la corrida larga guardá el checkpoint con SHA/base, comando, logs, recursos propios y cleanup.
5. Con el gate en verde, hacé el control de avance de T-040…T-045 (contratos, evidencia y hallazgos a BACKLOG), pasá el PR49 a ready con descripción de problema/cambio/pruebas/limitaciones y dejá el prompt del revisor independiente. La prueba del dueño la hace el dueño sobre sus datos: registrá solo OK/observaciones, conteos y SHA, sin abrir ni copiar su archivo.

No borres ramas, worktrees ni archivos de .orchestrator; el cleanup pendiente de T-049 requiere autorización del dueño. No revises ni mergees el PR: la revisión es de otra sesión.
```
