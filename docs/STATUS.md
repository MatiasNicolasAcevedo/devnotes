# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-008](tasks/T-008-separator-editing.md) |
| Estado | in_review |
| Acción actual | Revisión T-008: APROBADO sin bloqueantes. HEAD 87e5e02, base main 1702fd9. CI verify-required SUCCESS. Pendiente squash merge. |
| Rama / PR | codex/t-008-separator-editing, PR #13, HEAD 87e5e02, base main 1702fd9

T-006: conciliada como MERGED (6eb2c42). Junie reviewer + merger, Qwen3.6-27B-FP8. Client gate 218 tests OK, 100% líneas daily, 90.47% branches. Revisión APROBADA sin observaciones, CI verify-required pass.

T-016: conciliada como MERGED (4499962). Junie merger, Qwen3.6-27B-FP8. Corrección de revisión publicada (f392d98). Bloqueantes resueltos: debounce se reinicia en cada edición, `flush({ force })` implementado. Tests añadidos: debounce timing, error de red + 409, desmontar/remontar. Client gate OK: 232 tests, 91.24% statements, 86.25% branches. Segunda revisión independiente APROBADA (HEAD 2240566, base main e6ec7a6). CI verify-required SUCCESS. Merge squash 4499962, 2026-10-24.

T-007: conciliada como MERGED (1702fd9). Junie reviewer + merger, Qwen3.6-27B-FP8. Corrección documental publicada 5b08a16. Revisión independiente APROBADA (HEAD 741ce7c, base main 4499962). docs-check OK, 242 tests, 87.96% statements, 81.96% branches. CI verify-required SUCCESS. Merge squash 1702fd9, 2026-10-25.

### Prompt de la siguiente sesión

```text
Sesión nueva Junie reviewer para T-008 — separadores con teclado.
Rama codex/t-008-separator-editing, HEAD 2386358, base main 1702fd9.
Revisar implementación S-103: shortcuts --25/--50/--75/--- Enter producen separadores.
Verificar gate client: separator.test.ts (18 tests), DailyEditor.test.ts (9 tests), typecheck OK.
Comprobar HEAD/base, arquitectura, negativos y docs-check. Publicar veredicto del SHA final.
```
