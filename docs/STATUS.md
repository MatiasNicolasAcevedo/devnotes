# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-004](tasks/T-004-daily-api.md) |
| Estado | in_progress |
| Acción actual | PR8 abierto, 6/6 IT tests verdes (DailyNoteApiIT), pendiente revisión independiente |
| Rama / PR | codex/t-004-daily-api · PR8 contra main |

T-004: PR8 abierto (ca92590) contra main 306fd68. DailyNoteController (GET colección/recurso, PUT recurso), DailyNoteExceptionHandler (400/404/409), DailyNoteOpenApi (sesión+CSRF), SecurityConfig actualizado. 6/6 tests dirigidos DailyNoteApiIT: CRUD dos dueños, 401/403/CSRF, vecinos denegados, 400 fecha/body/revisión inválida, 409 conserva DB, paginación. Pendiente revisión independiente y gate FULL.

### Prompt de la siguiente sesión

```text
Sesión nueva Junie reviewer para PR8 (T-004). Revisar HEAD ca92590 contra base main 306fd68: gate, CI, arquitectura y propiedad. Veredicto y squash merge si aprueba.
```
