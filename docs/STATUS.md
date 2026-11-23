# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-094](tasks/T-094-ai-workspace.md) · [S-116](specs/S-116-ai-workspace.md) |
| Estado | `changes_requested` |
| Siguiente acción | Frontera implementer corrige los dos hallazgos del PR #90 en una sesión nueva |
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
Actuá como frontera implementer de corrección extraordinaria de T-094 en MatiasNicolasAcevedo/devnotes. Sesión nueva, PR #90, rama codex/t-094-ai-workspace.

LEER: AGENTS.md, docs/STATUS.md, docs/AUTONOMY.md, docs/agents/implementer.md, docs/tasks/T-094-ai-workspace.md (checkpoint y segunda revisión), docs/specs/S-116-ai-workspace.md, server/AGENTS.md y client/AGENTS.md.

PRECONDICIÓN: ejecutá gh pr view 90 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup y git fetch origin main codex/t-094-ai-workspace. Confirmá PR OPEN, isDraft=false, base dee843c8b5dfa7f1e9c12ed50a2e305b0b9cc795 y refs iguales a GitHub. Verificá con git rev-parse origin/codex/t-094-ai-workspace^ que el padre es e19dc465d72073f0a0d3af15c2ffe8d4587f7834 y que el HEAD publicado solo registra esta decisión en STATUS y T-094. Si cambió la precondición, informá el estado real y entregá el prompt corregido.

ACCIÓN: resolvé solo los dos hallazgos en el mismo PR. En OpenRouter, exigí evidencia positiva de la política completa de S-116 y un identificador que restrinja la inferencia a la ruta exacta de la variante :free. Metadatos ausentes, indeterminados o ruta ambigua implican indisponibilidad y cero POST de inferencia. Cubrí esos negativos y el positivo con dobles. Para 429 remoto, usá «Límite temporal del proveedor» si el motivo es incierto y reservá «Cuota agotada» para una señal inequívoca comprobada. Separá la concurrencia local. Conservá borrador y fragmento, respetá Retry-After válido y permití rehabilitar el intento explícitamente si falta una espera válida. Solo Enviar con el destino confirmado hace una consulta. Reusá los flujos existentes y documentá las señales que siguen siendo inciertas.

GATE: reproducí los dos rojos y aplicá el gate diario de T-094 con pruebas dirigidas, E2E filtrado, docs-check y verify-required verde sobre el HEAD publicado. Usá dobles externos y muestras ficticias. Conservá la evidencia real ya registrada para los cinco destinos, los dos diferimientos y Render Auto-Deploy On Commit. FULL/STARTER: DIFERIDO POR EL DUEÑO.

SALIDA: publicá la corrección y su checkpoint en el PR #90. Dejá el prompt completo para un reviewer independiente centrado en ambos hallazgos y el gate. Si queda un hallazgo abierto, devolvé la evidencia a dueño o frontera. T-095 sigue condicionada a MERGED verificado según AUTONOMY.
```
