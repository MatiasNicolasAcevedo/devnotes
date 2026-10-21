# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-000](tasks/T-000-adoption.md) |
| Estado | in_review |
| Acción actual | Dueño autorizó una única sesión nueva FRONTERA reviewer de cierre G-03; aprobar y mergear en esa sesión si elegible |
| Rama / PR | chore/t-000-adoption · [PR #1](https://github.com/MatiasNicolasAcevedo/devnotes/pull/1) |

E-01 aceptado y autorización excepcional de cierre registrados en el checkpoint vigente T-000. [HANDOFF](HANDOFF.md) mantiene NO_LISTO21/22, solo G-03 pendiente. El dueño abre la siguiente sesión FRONTERA reviewer con este prompt; si aprueba, continúa al merge en esa misma sesión. Esta sesión planner no emite veredicto. T-001 sigue draft hasta cierre elegible, MERGED y conciliación.

### Prompt de la siguiente sesión
```text
Sesión nueva de FRONTERA, rol reviewer independiente, para la única revisión adicional de cierre T-000 expresamente autorizada por el dueño tras R1/R2. Repositorio C:\D\matias\proyectos-ia\devnotes; rama chore/t-000-adoption, PR #1 contra main. Leer AGENTS.md, docs/STATUS.md, docs/tasks/T-000-adoption.md (checkpoint vigente y autorización), docs/AUTONOMY.md, docs/agents/reviewer.md y docs/agents/merger.md; consultar HANDOFF, TESTING y ORCHESTRATION para sus criterios. Comprobar árbol local, último commit, HEAD/base publicados, PR/CI, conversaciones y último veredicto; revisar el diff publicado vigente, incluida la corrección Junie y las aclaraciones de traspaso. E-01 ya está aceptado: conservar esa decisión y las sondas CLI válidas, sin pedir otra aceptación ni atribuir uso activo a MCP/skills solo expuestos. Verificar conservación de STARTER sobre f082659d3d24d7a5a1eabd17fe8dc939a3b28b51 y base fa52e546d24a412fd5729f4b15b8a4103cb3071a; no repetir FULL ni sondas sin cambio técnico/base, evidencia insuficiente o riesgo concreto. Ejecutar docs-check/diff-check y checks afectados. Si no hay bloqueantes, publicar transición documental conforme a reviewer y preparar STATUS para sesión nueva Junie implementer T-001 con precondición MERGED/conciliación; comprobar HEAD/base finales y verify-required SUCCESS del HEAD exacto, publicar APROBADO ligado a ambos SHA y continuar al squash merge elegible en esta misma sesión, sin otra confirmación rutinaria. Confirmar MERGED, SHA y fecha; no hacer commits después de aprobar ni del merge. No implementar T-001 aquí; sigue draft hasta MERGED y conciliación en su sesión propia. Si aparece un problema material, dejar checkpoint concreto al dueño sin programar otra ronda. Sin instalar/autenticar/delegar ni modificar protecciones.
```
