# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-019](tasks/T-019-agent-operating-rules.md) |
| Estado | in_review |
| Acción actual | PR6 publicado, revisión independiente pendiente |
| Rama / PR | codex/t-019-agent-operating-rules · [PR6](https://github.com/MatiasNicolasAcevedo/devnotes/pull/6) contra main |

El dueño priorizó [T-019](tasks/T-019-agent-operating-rules.md) a partir de [OBSERVATIONS](OBSERVATIONS.md). T-003 conserva su contrato y espera MERGED/conciliación de este mantenimiento. T-002 fue conciliada done tras confirmación remota de PR5 MERGED (89cbb87).

### Prompt de la siguiente sesión

```text
Sesión nueva Junie reviewer para T-019 en codex/t-019-agent-operating-rules. Verificar PR6 (SHA 54edcc1 contra main 89cbb87): diff conforme con las tres reglas operativas, enlaces canónicos desde AGENTS.md, entrada PowerShell en SETUP, referencia desde TESTING, conciliación T-002 done y tratamiento de estados negativos. Leer docs/agents/reviewer.md antes de empezar. Perfil DOCUMENTATION/DOCS_ONLY: ejecutar node scripts/docs-check.mjs y git diff --check sobre el HEAD publicado.
```
