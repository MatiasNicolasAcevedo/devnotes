# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-095](tasks/T-095-trailer-v2.md) |
| Estado | `in_progress` |
| Siguiente acción | Implementer produce el corte de escritorio ([checkpoint](tasks/T-095-trailer-v2.md#checkpoint-vigente)) |
| Rama / PR | `codex/t-095-trailer-v2` · PR pendiente |

Modo `FRONTERA_CONTINUA`. T-094 conciliada ([PR #90](https://github.com/MatiasNicolasAcevedo/devnotes/pull/90) MERGED, `076e4ed`). La [cola](BACKLOG.md#lote-imagen-libres-e-ia) continúa con el tráiler v2 y la demo narrada. [Cron externo configurado](DEPLOYMENT.md#despertador-externo-de-devnotes).

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
Frontera implementer de T-095 en MatiasNicolasAcevedo/devnotes. Leé AGENTS.md, STATUS, docs/agents/implementer.md y docs/tasks/T-095-trailer-v2.md. Precondición: PR 90 MERGED, comprobado con gh pr view 90 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit (state MERGED, mergedAt y mergeCommit.oid válidos) y la ascendencia del squash en origin/main; si no, devolvé el paso vigente. Conciliá T-094 a done en codex/t-095-trailer-v2 en el primer commit. Partí del tráiler local y del producto probado, entregá los dos cortes con música, sus fuentes y el gate de T-095 en un PR. Cerrá con el prompt completo de reviewer independiente.
```
