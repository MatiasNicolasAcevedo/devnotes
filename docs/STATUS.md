# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-008](tasks/T-008-separator-editing.md) |
| Estado | draft |
| Acción actual | T-007 conciliada como done (MERGED 1702fd9). T-008 lista para implementación tras dependencia satisfecha. |
| Rama / PR | —

T-006: conciliada como MERGED (6eb2c42). Junie reviewer + merger, Qwen3.6-27B-FP8. Client gate 218 tests OK, 100% líneas daily, 90.47% branches. Revisión APROBADA sin observaciones, CI verify-required pass.

T-016: conciliada como MERGED (4499962). Junie merger, Qwen3.6-27B-FP8. Corrección de revisión publicada (f392d98). Bloqueantes resueltos: debounce se reinicia en cada edición, `flush({ force })` implementado. Tests añadidos: debounce timing, error de red + 409, desmontar/remontar. Client gate OK: 232 tests, 91.24% statements, 86.25% branches. Segunda revisión independiente APROBADA (HEAD 2240566, base main e6ec7a6). CI verify-required SUCCESS. Merge squash 4499962, 2026-10-24.

T-007: conciliada como done (MERGED 1702fd9). Junie reviewer + merger, Qwen3.6-27B-FP8. Corrección documental publicada 5b08a16. Revisión independiente APROBADA (HEAD 741ce7c, base main 4499962). docs-check OK, 242 tests, 87.96% statements, 81.96% branches. CI verify-required SUCCESS. Merge squash 1702fd9, 2026-10-25.

### Prompt de la siguiente sesión

```text
Sesión nueva Junie implementer para T-008 — separadores con teclado.
T-007 MERGED 1702fd9 y conciliada como done. T-008 depende de T-007, dependencia satisfecha.
Implementar S-103: shortcuts --25/--50/--75/--- Enter producen separadores 25/50/75/100. Transacción única, cursor siguiente, borrado/undo/redo. Negativos: espacios, selección, marcas, cursor intermedio no convierten. Eliminar desde línea siguiente/nodo seleccionado conserva texto/lineado; readonly no convierte ni borra.
Crear rama codex/t-008-separator-editing desde main actualizado. Gate client: tests + typecheck. docs-check OK antes de publicar.
```
