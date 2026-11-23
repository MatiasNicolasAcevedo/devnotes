# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-094](tasks/T-094-ai-workspace.md) · [S-116](specs/S-116-ai-workspace.md) |
| Estado | `in_review` |
| Siguiente acción | Frontera reviewer independiente da el veredicto sobre la corrección limitada del PR #90 ([checkpoint](tasks/T-094-ai-workspace.md#checkpoint-vigente)) |
| Rama / PR | `codex/t-094-ai-workspace` · [PR #90](https://github.com/MatiasNicolasAcevedo/devnotes/pull/90) |

Modo `FRONTERA_CONTINUA`. T-093 conciliada. La [cola](BACKLOG.md#lote-imagen-libres-e-ia) continúa con IA, tráiler v2 y demo narrada. [Cron externo configurado](DEPLOYMENT.md#despertador-externo-de-devnotes).

Piloto aprobado con cinco destinos: Groq 20B/120B, Workers AI 20B/120B y Gemini 3.1 Flash-Lite. Gemini 3.8 Flash y OpenRouter Free quedan diferidos. El selector y el compositor muestran disponibilidad, fallos y cuota. El usuario elige y confirma otro destino. [Decisión y cierre observable](tasks/T-094-ai-workspace.md#decisión-de-alcance-del-dueño). FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Pendientes del dueño

| Tema | Qué falta |
|---|---|
| PostgreSQL Free de Render | Vence el 2026-12-11 a las 22:35 de Buenos Aires si sigue la misma instancia. Antes: exportar, restaurar en local una cuenta vacía, cotejar ambos espacios y recién entonces reemplazar la base. [Procedimiento](DEPLOYMENT.md#respaldo-y-reemplazo-de-postgresql-free) |
| Sonda interna en Render | Ensayo pendiente de autorización expresa sobre SHA y ventana. [Receta](DEPLOYMENT.md#ensayo-de-la-sonda-interna-en-render-free) |
| SP-06 | Prueba en Android físico con teclado real y zoom nativo |
| Limpieza local | Hay decenas de worktrees en `.orchestrator/`, ramas locales ya mergeadas y siete stashes viejos. Listarlos y decidir cuáles se borran; ningún agente los elimina sin esa decisión |

Render: Auto-Deploy **On Commit** para `main`; cada merge despliega, también los documentales.

## Gates diferidos

| Dato | Valor |
|---|---|
| Último integrado válido | FULL local del 2026-11-15 sobre `398801f` ([T-069](tasks/T-069-ocr-workspace.md#evidencia-del-full-de-cierre)); STARTER de T-068 conservado |
| Mergeado desde entonces | T-070 (recorrido E2E de OCR), T-074 (navegación de Imagen), T-071 y T-092 (documentales), la adopción documental del flujo y el encadenamiento del lote hasta T-085 |
| Corte acumulado | Desde `7aa8946` hasta el HEAD de `main` que indique el dueño ([TESTING](TESTING.md#corte-acumulado-vigente)). El FULL/STARTER de I5 sigue diferido |
| Recomendación | Ejecutar el integrado del corte acumulado con V8 y V9 cuando el dueño lo ordene. T-094 incorpora rutas privadas y cambia Compose |

### Prompt de la siguiente sesión

```text
Actuá como frontera reviewer independiente de la corrección limitada de T-094 en MatiasNicolasAcevedo/devnotes. Sesión nueva, distinta de la del implementer, PR #90, rama codex/t-094-ai-workspace. Registrá rol, herramienta y modelo realmente expuestos.

LEER: AGENTS.md, server/AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/TESTING.md#gate-diario, el checkpoint vigente de docs/tasks/T-094-ai-workspace.md y los hallazgos de la revisión de la corrección extraordinaria, y docs/specs/S-116-ai-workspace.md.

PRECONDICIÓN: gh pr view 90 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup,mergedAt,mergeCommit y git fetch origin main codex/t-094-ai-workspace. Exigí OPEN, isDraft=false, base dee843c8b5dfa7f1e9c12ed50a2e305b0b9cc795, HEAD igual a origin/codex/t-094-ai-workspace, el commit técnico 176f66c como ancestro del HEAD y verify-required SUCCESS sobre ese HEAD. Si difiere, registrá el hecho y devolvé el paso vigente sin mergear.

ACCIÓN: 1) Revisá el diff de 239fff8 a HEAD: OpenRouterCatalog.compatibleRoute con bigIntegerValue().signum() == 0, los cuatro casos nuevos de estado en OpenRouterCatalogTest, y en el cliente el flag ready del issue limited (aiContext, AiPage, AiModelStatus) con el caso de Vitest para Retry-After: 0. 2) Corré lo mínimo para el veredicto: ./mvnw -q test -Dtest=OpenRouterCatalogTest,OpenRouterAiClientTest -Djacoco.skip=true en server/, y npm test -- --run src/features/ai más npm run typecheck en client/. Cotejá Failsafe y E2E con la evidencia registrada sin repetirlos, salvo que el diff lo exija. 3) Veredicto sobre los dos P2 y el gate. FULL/STARTER: DIFERIDO POR EL DUEÑO.

SALIDA: si aprobás, gh pr merge 90 --repo MatiasNicolasAcevedo/devnotes --squash --match-head-commit <HEAD revisado>, sin --admin, y confirmá MERGED con gh pr view 90 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit (state, mergedAt y mergeCommit.oid válidos). El prompt de la siguiente sesión es el de T-095 de la tarea, entregado en el chat. Si persiste un hallazgo, dejá el PR abierto, registrá la evidencia en la tarea y entregá un prompt al dueño con la pregunta exacta. T-095 sigue condicionada a MERGED confirmado. Terminá con el prompt completo.
```
