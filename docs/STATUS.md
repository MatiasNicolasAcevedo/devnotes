# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-094](tasks/T-094-ai-workspace.md) · [S-116](specs/S-116-ai-workspace.md) |
| Estado | `in_review` |
| Siguiente acción | Frontera reviewer independiente verifica la corrección extraordinaria y el gate del PR #90 |
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
Actuá como frontera reviewer independiente de la corrección extraordinaria de T-094 en MatiasNicolasAcevedo/devnotes. Sesión nueva, PR #90, rama codex/t-094-ai-workspace.

LEER: AGENTS.md, docs/STATUS.md, docs/AUTONOMY.md, docs/agents/reviewer.md, docs/tasks/T-094-ai-workspace.md (checkpoint y segunda revisión), docs/specs/S-116-ai-workspace.md, server/AGENTS.md y client/AGENTS.md.

PRECONDICIÓN: ejecutá gh pr view 90 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup y git fetch origin main codex/t-094-ai-workspace. Confirmá PR OPEN y listo para revisión, base dee843c8b5dfa7f1e9c12ed50a2e305b0b9cc795, refs iguales a GitHub y verify-required SUCCESS sobre el HEAD publicado. Con git rev-parse 'origin/codex/t-094-ai-workspace^' verificá el padre técnico 4a99c87e29fb5477c6313ed47dadfbe2ef3ba1d3. El HEAD agrega el checkpoint de T-094 y STATUS. Si cambió la precondición, informá el estado real y entregá el prompt vigente.

ACCIÓN: revisá ambos hallazgos y sus regresiones. En OpenRouter, cotejá la evidencia de política y precio, el ID :free exacto, la unicidad del slug y las restricciones del POST. Comprobá cero inferencias con metadatos insuficientes y en el piloto diferido. En 429, verificá límite temporal genérico, señal diaria inequívoca de Groq y concurrencia local, borrador y fragmento, Retry-After y rehabilitación manual. Cotejá que solo Enviar con destino confirmado consulta. Conservá la matriz real de cinco destinos, los dos diferimientos y Render Auto-Deploy On Commit.

GATE: cotejá los rojos y el gate diario sobre las fuentes publicadas, incluidos PostgreSQL 18, Vitest y typecheck, E2E filtrados con dobles, docs-check y CI. FULL/STARTER: DIFERIDO POR EL DUEÑO.

SALIDA: emití el veredicto ligado al HEAD/base. Si aprobás, seguí AUTONOMY para el squash y confirmá MERGED, mergedAt y mergeCommit.oid mediante gh pr view con --repo explícito. Si persiste un hallazgo, mantené el PR abierto y devolvé la evidencia a dueño o frontera. T-095 queda condicionada a MERGED verificado. Terminá con el prompt completo que corresponda.
```
