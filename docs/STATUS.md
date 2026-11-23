# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-094](tasks/T-094-ai-workspace.md) · [S-116](specs/S-116-ai-workspace.md) |
| Estado | `changes_requested` |
| Siguiente acción | Dueño o frontera decide el cierre tras dos rondas del PR #90 |
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
Actuá como dueño o frontera para decidir el cierre de T-094 en MatiasNicolasAcevedo/devnotes. Sesión nueva, PR #90, rama codex/t-094-ai-workspace.

LEER: AGENTS.md, docs/STATUS.md, docs/AUTONOMY.md, docs/agents/reviewer.md, docs/tasks/T-094-ai-workspace.md (checkpoint vigente) y docs/specs/S-116-ai-workspace.md.

PRECONDICIÓN: ejecutá gh pr view 90 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup y git fetch origin main codex/t-094-ai-workspace. Confirmá PR OPEN, isDraft=false, base dee843c8b5dfa7f1e9c12ed50a2e305b0b9cc795 y refs iguales a GitHub. Confirmá con git rev-parse origin/codex/t-094-ai-workspace^ que el padre del cierre documental es 4eaf719ae2023f0a6e05be1bee958567cae07e3c y con git diff --name-only 4eaf719ae2023f0a6e05be1bee958567cae07e3c..origin/codex/t-094-ai-workspace que el cierre solo cambia docs/STATUS.md y docs/tasks/T-094-ai-workspace.md. Si cambió la precondición, informá el estado real y entregá el prompt corregido.

ACCIÓN: se agotaron dos rondas. El catálogo de OpenRouter ofrece una ruta exacta con evidencia incompleta de privacidad y la UI informa cuota agotada para todo 429 externo. Leé los dos rojos y las condiciones de cierre en T-094. Decidí si autorizás una única corrección extraordinaria en el mismo PR, limitada a los dos hallazgos, con revisión independiente posterior, o si dejás el PR abierto con la tarea en espera. La propuesta de corrección exige evidencia positiva para la ruta exacta, cero despacho para evidencia insuficiente y una distinción verificable entre cuota, límite temporal y concurrencia local. Conservá los cinco destinos, los dos diferimientos, las muestras ficticias y Render Auto-Deploy On Commit. No habilites T-095 hasta confirmar MERGED de T-094 según AUTONOMY.

GATE: si autorizás corregir, exigir los negativos y el positivo con dobles, pruebas dirigidas, E2E filtrado, docs-check y verify-required sobre el HEAD publicado. FULL/STARTER: DIFERIDO POR EL DUEÑO.

SALIDA: registrá la decisión, el alcance y el responsable del próximo paso en T-094 y STATUS. Terminá con el prompt vigente completo.
```
