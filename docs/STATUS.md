# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-019](tasks/T-019-agent-operating-rules.md) |
| Estado | changes_requested |
| Acción actual | PR6 con conflictos y evidencia Windows pendiente; corrección en sesión implementer nueva. Ver checkpoint T-019. |
| Rama / PR | codex/t-019-agent-operating-rules · [PR6](https://github.com/MatiasNicolasAcevedo/devnotes/pull/6) contra main |

El dueño priorizó [T-019](tasks/T-019-agent-operating-rules.md) a partir de [OBSERVATIONS](OBSERVATIONS.md). T-003 conserva su contrato y espera MERGED/conciliación de este mantenimiento. T-002 fue conciliada done tras confirmación remota de PR5 MERGED (89cbb87).

### Prompt de la siguiente sesión

```text
Sesión nueva Junie implementer para T-019 en codex/t-019-agent-operating-rules. Leer AGENTS, STATUS, T-019 y su checkpoint de revisión. Comprobar PR6, HEAD y main remotos; preservar scripts/e2e.sh ajeno y plantilla/. Integrar main vigente sin force push, resolver conflictos y corregir los tres hallazgos de T-019 conservando los hechos actuales y T-020 bloqueada. Registrar la evidencia Windows propia de Junie o el diagnóstico concreto, clasificar el diff y ejecutar el gate correspondiente y docs-check. Publicar en el mismo PR con checkpoint y prompt para revisión independiente nueva. No aprobar ni mergear trabajo propio; no abrir PR de T-020 ni iniciar otra implementación.
```
