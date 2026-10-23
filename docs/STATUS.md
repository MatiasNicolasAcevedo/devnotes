# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-019](tasks/T-019-agent-operating-rules.md) |
| Estado | in_progress |
| Acción actual | Incorporar las tres reglas operativas en documentos canónicos |
| Rama / PR | codex/t-019-agent-operating-rules · Sin PR publicado |

El dueño priorizó [T-019](tasks/T-019-agent-operating-rules.md) a partir de [OBSERVATIONS](OBSERVATIONS.md). T-003 conserva su contrato y espera MERGED/conciliación de este mantenimiento. T-002 fue conciliada; su dependencia se vuelve a comprobar en GitHub, sin heredar el estado desde este resumen.

### Prompt de la siguiente sesión

```text
Sesión nueva Junie implementer en DevNotes. Antes de T-003, ejecutar únicamente T-019 en codex/t-019-agent-operating-rules, autorizada por el dueño. Leer AGENTS.md, docs/STATUS.md, docs/tasks/T-019-agent-operating-rules.md, docs/OBSERVATIONS.md y las referencias concretas del contrato. Preservar los cambios documentales locales preparados. Primero consultar PR5 con gh pr view 5 --repo MatiasNicolasAcevedo/devnotes --json number,url,state,mergedAt,mergeCommit,headRefOid,baseRefName y comprobar tareas/PR en vuelo; crear la rama exacta desde main publicado sin force push. Incorporar las tres reglas: prompt de continuación completo en STATUS y respuesta final; comprobación explícita de publicación/MERGED en GitHub con evidencia; verificador canónico invocado desde PowerShell con el Node existente, diagnóstico y exit conservado. Probar la entrada Windows y ejecutar docs-check/diff-check según el contrato. Publicar un único PR y cerrar en in_review con el prompt reviewer completo y copiable. No autoaprobar, mergear trabajo propio ni implementar T-003 en esta sesión. Tras revisión independiente y MERGED remoto de T-019, la siguiente sesión retomará T-003 comprobando las dependencias y conciliando T-019 en su nueva rama. Si el prompt ya fue ejecutado, reconsultar el estado y entregar la continuación real; no repetir el prompt viejo.
```
