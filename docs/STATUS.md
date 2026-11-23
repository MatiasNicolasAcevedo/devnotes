# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-094](tasks/T-094-ai-workspace.md) · [S-116](specs/S-116-ai-workspace.md) |
| Estado | `changes_requested` |
| Siguiente acción | El dueño resuelve el alcance del piloto Free antes de devolver el PR #90 a un implementer nuevo |
| Rama / PR | `codex/t-094-ai-workspace` · [PR #90](https://github.com/MatiasNicolasAcevedo/devnotes/pull/90) |

Modo `FRONTERA_CONTINUA`. T-093 conciliada. La [cola](BACKLOG.md#lote-imagen-libres-e-ia) continúa con IA, tráiler v2 y demo narrada. [Cron externo configurado](DEPLOYMENT.md#despertador-externo-de-devnotes).

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
Actuá como dueño de DevNotes con frontera para resolver T-094 en MatiasNicolasAcevedo/devnotes. Sesión nueva.

Leé AGENTS.md, server/AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-094-ai-workspace.md, docs/specs/S-116-ai-workspace.md y la sección IA de docs/design/WRITING-WORKSPACES.md.

Ejecutá gh pr view 90 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup y git fetch origin main codex/t-094-ai-workspace. Confirmá que el PR sigue OPEN y que HEAD/base coinciden con los refs publicados, con base dee843c8b5dfa7f1e9c12ed50a2e305b0b9cc795 y el checkpoint de cambios requeridos de T-094 en HEAD. Si cambió la precondición, informá el estado real y entregá el prompt corregido.

Resolvé esta decisión de alcance: ¿mantenés la aceptación de los cuatro proveedores con los modelos de S-116 hasta acreditar Gemini 3.8 Flash y OpenRouter Free con una ruta compatible, o autorizás un ajuste explícito de S-116/T-094 que identifique qué modelo o proveedor queda indisponible o diferido y la nueva evidencia exigida? Si mantenés el contrato, el piloto debe devolver texto para Gemini 3.8 Flash y para el OpenRouter ligero y una alternativa Free elegible, con muestras ficticias de T-072 y la matriz completa. Si aún falta una ruta compatible, conservá el bloqueo o resolvé el alcance de forma explícita.

Devolvé el mismo PR #90 a un frontera implementer nuevo con esa decisión y los hallazgos del checkpoint. Exigí que el catálogo y el POST de OpenRouter reconozcan la ausencia de una ruta compatible con negativos sin POST de inferencia, y que la UI muestre la hora y las unidades de la cuota de Groq basadas en cabeceras válidas. Conservá ZDR, rechazo de recolección, precio cero, sin fallback, sin créditos ni BYOK, sin datos reales, y Render Auto-Deploy On Commit. FULL/STARTER: DIFERIDO POR EL DUEÑO.

Dejá una decisión explícita, condiciones de cierre observables y el prompt completo del implementer en STATUS y al final de la respuesta. La eventual aprobación y el squash corresponden a otro reviewer independiente con verify-required verde sobre el SHA revisado.
```
