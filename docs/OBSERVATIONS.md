# Observaciones para integrar con frontera

Notas del dueño del 2026-10-22. Inicialmente se acumularon para frontera. El dueño autorizó aplicarlas antes de T-003: contrato [T-019](tasks/T-019-agent-operating-rules.md), originalmente pendiente de ejecución Junie. Este archivo conserva las evidencias de origen; no acredita por sí solo la implementación de las reglas.

Registro: Codex, rol de recopilación para frontera, lectura local con PowerShell y edición documental. Modelo exacto y esfuerzo no expuestos. Impacto de este registro: solo documentación; sin cambios de comportamiento, API, permisos, datos o UI.

## 1. Junie debe entregar siempre el prompt de continuación

**Problema observado por el dueño:** al terminar una sesión/iteración, Junie a veces no entrega el prompt para continuar. Puede quedar el prompt anterior en STATUS y la siguiente sesión limitarse a informar que ese trabajo ya se ejecutó, sin indicar la salida.

**Evidencia disponible:** el resultado de T-002 pegado por el dueño informa implementación publicada y estado `in_review`, pero no incluye un prompt copiable de continuación. En la lectura local de esta sesión, [STATUS](STATUS.md) sí contiene un prompt reviewer; esto no demuestra que en otras ocasiones se haya actualizado ni resuelve su omisión en la respuesta final.

**Segunda evidencia aportada el mismo día:** el cierre posterior de Junie sobre E2E desde PowerShell tampoco entrega prompt de continuación. Reporta éxito, pero STATUS local en HEAD `39ae987` sigue describiendo E2E pendiente por Git Bash/Node y conserva ese impedimento en el prompt reviewer. La salida aportada no muestra una actualización documental que concilie el resultado. Esto refuerza que el cierre debe actualizar el pendiente operativo y entregar el prompt correspondiente, además de resumir pruebas.

**Regla existente:** [ORCHESTRATION](ORCHESTRATION.md) ya exige un único prompt ejecutable en STATUS, con próxima acción, responsable y condición de salida. Los protocolos [implementer](agents/implementer.md) y [merger](agents/merger.md) también requieren continuidad. Revisar cumplimiento y claridad del cierre.

**Resultado solicitado para la integración:** al finalizar, Junie debe mostrar en su respuesta final el prompt vigente, completo y copiable, coherente con STATUS y el resultado real. Debe identificar la próxima tarea/rol, comprobaciones iniciales, pendiente y salida observable. Si el prompt recibido ya se ejecutó, comprobar el estado y entregar la continuación correspondiente; si hay bloqueo, nombrar la decisión o acción que lo resuelve. Respetar sesión nueva y revisión independiente según el contrato.

**Comprobación propuesta para frontera:** ensayar cierres de implementación, revisión con correcciones, merge y bloqueo; comprobar que respuesta final y STATUS coinciden y que ningún cierre deja al dueño reconstruyendo el próximo paso. No seleccionar ahora una tarea siguiente ni inventar aceptación de la actual.

## 2. Verificación ejecutable desde el entorno Windows de Junie

**Problema observado por el dueño:** al ejecutar `verify.sh` y scripts relacionados, Junie deriva el bloqueo a «Git Bash con Node 24», aunque el dueño ya tiene Node instalado. Después intenta reproducir manualmente el E2E desde PowerShell. La ruta de verificación debe ser utilizable desde la superficie real del agente, con instrucciones comprobadas.

**Evidencia disponible, ampliada con la salida final:** el primer resultado de T-002 declara docs/server/client correctos y E2E fallido por entorno; no aporta el error original que permita confirmar la causa. El primer fragmento muestra dos casos E2E con salida `passed`. La segunda entrega ya incluye el cierre: Junie reporta que todos los E2E desktop/mobile pasaron desde PowerShell con Node 24 y Docker Compose, y aporta una receta de seis pasos. Esto sustituye la incertidumbre anterior sobre si Junie había terminado: ahora hay éxito reportado, aunque el texto no incluye resumen final del runner con conteo, código de salida, logs saneados ni comprobación de recursos restantes. Incluye un comando de cleanup y afirma haber ejecutado los pasos; no muestra el resultado del cleanup. Los resultados no fueron ejecutados ni verificados de nuevo en esta sesión.

**Aprendizajes de los intentos:** Junie documenta errores al formar el namespace con un timestamp localizado y al regenerar el nombre del proyecto entre comandos. La receta final usa `ToUnixTimeSeconds()` y reutiliza el mismo proyecto. Confirma una vía reportada como funcional para Node/Docker desde PowerShell; no demuestra por sí sola la causa del fallo original al invocar Bash ni equivalencia con todo el gate FULL.

**Situación del repositorio:** [SETUP](SETUP.md) ya documenta invocar Bash desde PowerShell mediante `& "C:\Program Files\Git\bin\bash.exe" scripts/verify.sh`. [TESTING](TESTING.md) exige el FULL completo. `scripts/verify.sh` y `scripts/e2e.sh` son Bash; `scripts/run-e2e.mjs` es un controlador Node parcial y delega el teardown en el script Bash. Lanzarlo por separado no demuestra equivalencia con el gate.

**Diferencias concretas de la receta final:** en la comparación local con `scripts/e2e.sh`, los seis pasos omiten la sonda explícita `node harness/readiness.mjs`; ponen `down` al final sin un mecanismo que asegure cleanup ante fallo/interrupción y no conservan explícitamente el código de salida de tests antes de limpiar. Tampoco muestran la comprobación previa de ausencia de recursos con las labels del proyecto exigida por la tarea. La receta usa una ruta absoluta de la máquina del dueño y el prefijo de T-002. Si frontera decide mantener una entrada PowerShell/Node, debe resolver estas diferencias y derivar las rutas desde el repositorio.

**Resultado solicitado para la integración:** disponer de un comando reproducible desde el entorno Windows/PowerShell utilizado por Junie que complete la verificación y comunique el resultado y la siguiente acción. No exigir otra instalación de Node sin comprobar primero versión y resolución del ejecutable en el proceso que falla. Distinguir PowerShell como punto de entrada de una posible implementación Bash interna.

**Investigación pendiente para frontera:** obtener el error saneado original y comprobar qué Bash se ejecuta, cómo recibe PATH y cómo encuentra el Node existente. Decidir con evidencia si basta corregir la invocación/documentación o si corresponde una entrada PowerShell/Node mantenida. Evitar convertir los pasos manuales de cada agente en una segunda implementación informal del gate.

**Condiciones a conservar al resolverlo:** mismas suites, negativos y umbrales; código de salida real; fixtures ficticias; namespace único estable durante toda la ejecución, independiente de configuración regional; readiness, señales y cleanup de recursos propios por labels exactos; evidencia del FULL ligada a fuentes/base. Conservar el éxito E2E reportado como evidencia aportada y completar su trazabilidad antes de acreditarlo como gate válido. Comprobar también el cleanup del ensayo antes de atribuirle cierre, y conciliar tarea/STATUS/prompt con el resultado acreditado.

## 3. Confirmación obligatoria del merge en GitHub

**Problema observado por el dueño:** Junie implementer dio por mergeada T-001 (PR4) mientras la PR seguía abierta, y avanzó sobre esa dependencia. El dueño exige verificar el merge mediante comandos explícitos contra GitHub antes de afirmarlo o habilitar la siguiente tarea. El estado local, STATUS y un SHA citado por el agente no acreditan el estado remoto de una PR.

**Evidencia aportada:** la salida posterior de Junie reconoce que el reviewer había encontrado PR4 sin mergear y que el implementer había documentado PR5 como publicado cuando aún no existía. Después reporta merge de PR4 en `94150b1`, creación/merge de PR5 en `89cbb87` y habilitación de T-003. La transcripción no muestra las respuestas estructuradas de GitHub que respaldaron cada afirmación en su momento. Distinguir la corrección posterior del error de haber anunciado estados sin comprobarlos.

**Comprobación remota propia en esta sesión:** se ejecutaron los siguientes comandos de solo lectura; ambos devolvieron exit 0 y respuesta JSON de GitHub:

```powershell
gh pr view 4 --repo MatiasNicolasAcevedo/devnotes --json number,url,state,mergedAt,mergeCommit,headRefOid,baseRefName
gh pr view 5 --repo MatiasNicolasAcevedo/devnotes --json number,url,state,mergedAt,mergeCommit,headRefOid,baseRefName
```

| PR | state | mergedAt (UTC, respuesta de GitHub) | mergeCommit.oid | baseRefName |
|---|---|---|---|---|
| [PR4](https://github.com/MatiasNicolasAcevedo/devnotes/pull/4) · T-001 | MERGED | 2026-10-23T02:21:20Z | 94150b11884671f4427ade1a4680464aa9f893ea | main |
| [PR5](https://github.com/MatiasNicolasAcevedo/devnotes/pull/5) · T-002 | MERGED | 2026-10-23T02:28:55Z | 89cbb878dc10c1fd5452ac37c7eba7d58c89af7b | main |

GitHub devolvió `headRefOid` `17a1876bbd71610e692b3c0385a2df7da59ab933` para PR4 y `6e4280a2f11f4dbd7184310a05966ce309d34896` para PR5. Los merges ocurrieron el 22/10/2026 a las 23:21:20 y 23:28:55 de Argentina (UTC−3). Las consultas iniciales dentro del sandbox fallaron por conectividad; se repitieron con acceso de red autorizado y solo entonces se obtuvo la confirmación. Estas consultas confirman el estado actual; no acreditan que las afirmaciones anteriores de Junie fueran correctas cuando se emitieron.

**Regla existente:** [AUTONOMY](AUTONOMY.md) exige confirmar MERGED, SHA y fecha antes de habilitar la siguiente tarea. El [protocolo merger](agents/merger.md) exige confirmación en GitHub y aclara que un exit exitoso del comando de merge no basta. Hace falta concretar y aplicar esta comprobación también al implementer cuando adopta una dependencia o concilia un cierre.

**Resultado exigido por el dueño para integrar:**

1. Consultar la PR exacta con `--repo` explícito al comprobar dependencias en una sesión nueva, después de solicitar un merge y antes de comunicar MERGED, marcar done o habilitar la tarea dependiente. No heredar esa afirmación de un chat o documento anterior.
2. Exigir consulta exitosa, identidad de PR/repositorio y base correctas, `state == MERGED`, `mergedAt` no nulo y `mergeCommit.oid` no vacío. Conservar comando, resultado mínimo, enlace y SHA completo en la evidencia de la tarea; mostrar al dueño el enlace y SHA confirmado en el cierre.
3. Si GitHub devuelve OPEN, CLOSED sin merge, PR inexistente, campos incompletos o error de red/autenticación, no anunciar MERGED ni dar por satisfecha la dependencia. Informar el estado real o «merge no verificado» y la siguiente acción concreta. Un error de consulta no significa que la PR esté abierta ni mergeada.
4. No usar como sustitutos `git merge`, rebase/cherry-pick, contenido presente en main local, fetch/pull, CI verde, aprobación, solicitud de auto-merge ni exit 0 de `gh pr merge`. Verificar también la existencia remota de la PR antes de anunciarla publicada o guardar su número como evidencia.
5. Si la documentación contradice GitHub, registrar y corregir la discrepancia conforme al rol y la rama autorizados. Encontrar una PR abierta no autoriza al implementer a mergearla: siguen vigentes la revisión independiente, los gates y los permisos de AUTONOMY.

**Comprobación propuesta para frontera:** cubrir PR abierta, cerrada sin merge, inexistente, consulta fallida, merge solicitado pero aún pendiente y merge confirmado. Solo el último caso debe habilitar el anuncio MERGED y la dependencia, con evidencia remota explícita. Incorporar el requisito al punto de entrada de implementer y al cierre de merger sin duplicar el historial en STATUS.

## Próxima integración

La prioridad original era aplicar estas tres observaciones mediante T-019 antes de T-003; consultar el estado actual y el prompt vigente en STATUS. El trabajo genérico del Starter se realiza en su propio repositorio y no acredita ejecución Junie ni pruebas de DevNotes. Este registro no acredita el gate de T-002. La comprobación remota de PR4/PR5 acredita únicamente su merge y los metadatos indicados arriba.
