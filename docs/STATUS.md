# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-016](tasks/T-016-daily-draft-coordinator.md) |
| Estado | changes_requested |
| Acción actual | Revisión APROBADA con observaciones bloqueantes, pendiente corrección |
| Rama / PR | codex/t-016-daily-draft-coordinator, PR #11

T-006: conciliada como MERGED (6eb2c42). Junie reviewer + merger, Qwen3.6-27B-FP8. Client gate 218 tests OK, 100% líneas daily, 90.47% branches. Revisión APROBADA sin observaciones, CI verify-required pass.

T-016: revisión rechazada con cambios requeridos. Junie reviewer, Qwen3.6-27B-FP8. Bloqueante: debounce no se reinicia en cada edición (useDailyNote.ts línea 256: `if (queueRef.current === 'idle' && timerRef.current === null)` omite llamar a `scheduleFlush()` cuando ya hay timer activo; el temporizador original dispara a los 700 ms desde la primera edición, no desde la última). Observación no bloqueante: `flush` acepta `{ force?: boolean }` pero ignora el parámetro. Faltan tests para: error de red con commit seguido de 409, desmontar/remontar retiene dirty. CI verify-required SUCCESS en HEAD 5659f5e.

### Checkpoint vigente

2026-10-24, revisión independiente completada. Veredicto: CAMBIOS REQUERIDOS. HEAD revisado 5659f5e, base main e6ec7a6. Bloqueante: debounce no se reinicia en cada edición. Pendiente: corrección por implementer en nueva sesión.

### Prompt de la siguiente sesión

```text
Sesión nueva Junie implementer para T-016, corrección de revisión. PR #11 (HEAD 5659f5e) tiene un bloqueante: en useDailyNote.ts, edit() no llama a scheduleFlush() cuando ya hay un timer activo (línea 256: la condición `timerRef.current === null` impide reiniciar el debounce). Corregir para que cada edición válida reinicie el temporizador de 700 ms. Añadir test que verifique: tres ediciones a t=0, t=400, t=800 con debounce 700 ms producen un solo PUT a t=1500 (800+700), no a t=700. También implementar `force` en flush() y añadir tests para error de red con commit seguido de 409 y desmontar/remontar retiene dirty. Repetir gate APPLICATION y actualizar PR.
```
