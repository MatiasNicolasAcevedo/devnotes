# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-000](tasks/T-000-adoption.md) |
| Estado | changes_requested |
| Acción actual | Dueño resolvió checkpoint R2: una corrección documental propia Junie de E-01; después volver al dueño, sin R3 automática |
| Rama / PR | chore/t-000-adoption · [PR #1](https://github.com/MatiasNicolasAcevedo/devnotes/pull/1) |

Decisión del dueño y contrato acotado en el checkpoint vigente de T-000. Próximo agente: Junie implementer en sesión nueva, solo documentación; después frontera planner con el dueño decide cierre. Sondas mínimas Junie acreditadas; G-02 verificado. STARTER conservado sobre mismas fuentes/base. [HANDOFF](HANDOFF.md) mantiene NO_LISTO por E-01/G-03, sin aceptación anticipada. PR abierto, sin aprobación ni merge; T-001 sigue draft.

### Prompt de la siguiente sesión
```text
Continuar T-000 en una sesión nueva propia de JUNIE, rol implementer, solo para la corrección documental autorizada por el dueño tras R2. Repositorio C:\D\matias\proyectos-ia\devnotes; misma rama chore/t-000-adoption y PR #1. Leer AGENTS.md, docs/STATUS.md, docs/tasks/T-000-adoption.md (checkpoint vigente frontera planner, contrato de corrección y evidencia Junie/R2), docs/AUTONOMY.md, docs/TESTING.md, docs/HANDOFF.md y .junie/TOOLS.md. Primero comprobar git status, HEAD/base publicados, PR/CI y último veredicto; base esperada main fa52e546d24a412fd5729f4b15b8a4103cb3071a. Preservar y conciliar la edición local sin commit de TOOLS sobre Context7, distinguiéndola del contenido publicado y de evidencia propia. El dueño eligió limitar estados a exposición demostrada, no nuevas sondas MCP: separar cuatro MCP expuestos, agente integrado junie-cli-docs y siete skills listadas; retirar activo verificado/conclusiones globales donde solo hay exposición. gh acredita CLI, no MCP. Conservar sondas mínimas y G-02, sin repetirlas; rectificar la conclusión previa E-01 completado sin borrar evidencia válida. Registrar raíz/checkout, rutas de instrucciones realmente leídas, superficie/modelo/herramienta y esfuerzo expuesto o no expuesto. Seguir el contrato de T-000: solo TOOLS/T-000/STATUS, docs-check y diff-check; conservar STARTER solo con mismas fuentes técnicas/base. Publicar con staging explícito, commit con Refs: T-000 y push normal; esperar verify-required SUCCESS del HEAD final y comprobar SHA/base. No leer configuración privada, instalar, autenticar, delegar, modificar configuración ni implementar negocio. Dejar changes_requested, E-01 pendiente de aceptación y G-03 pendiente, sin aprobar/mergear/done. Terminar con checkpoint y único prompt para sesión nueva frontera planner con el dueño que decida el cierre tras esta corrección; no programar reviewer/R3. T-001 permanece draft hasta cierre elegible, MERGED y conciliación de T-000.
```
