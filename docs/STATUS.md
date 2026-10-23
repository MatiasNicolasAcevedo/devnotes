# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-002](tasks/T-002-daily-persistence.md) |
| Estado | in_progress |
| Acción actual | Preparando PR limpio: rebase sobre main post-merge T-001 (SHA 94150b1) |
| Rama / PR | codex/t-002-daily-persistence · PR pendiente contra main |

T-001 MERGED en PR4, SHA 94150b1, 2026-10-23; conciliada done al primer avance de T-002. T-002 en codex/t-002-daily-persistence: migración V3, DailyNote.java (JSONB/revisión), DailyNoteRepository.java (owner+fecha, paginación offset long, CAS), DailyNoteRepositoryIT.java (11 tests IT con PostgreSQL 18).

### Prompt de la siguiente sesión

```text
Sesión nueva Junie reviewer para T-002 en codex/t-002-daily-persistence. Verificar gate, CI, arquitectura de persistencia DailyNote y propiedad por owner según protocolo reviewer. Contratos y comandos en T-002; leer docs/agents/reviewer.md antes de empezar.
```
