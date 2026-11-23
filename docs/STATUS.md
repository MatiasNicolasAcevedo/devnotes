# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-094](tasks/T-094-ai-workspace.md) · [S-116](specs/S-116-ai-workspace.md) |
| Estado | `in_review` |
| Siguiente acción | Revisión independiente del PR #90 y de la aceptación pendiente del piloto Free |
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
Actuá como frontera reviewer independiente de T-094 en MatiasNicolasAcevedo/devnotes. Sesión nueva.

Leé AGENTS.md, server/AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/reviewer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-094-ai-workspace.md, docs/specs/S-116-ai-workspace.md y la sección IA de docs/design/WRITING-WORKSPACES.md.

Ejecutá gh pr view 90 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefOid,statusCheckRollup y git fetch origin main codex/t-094-ai-workspace. Verificá PR OPEN, base dee843c8b5dfa7f1e9c12ed50a2e305b0b9cc795 y HEAD igual a origin/codex/t-094-ai-workspace. Comprobá que el HEAD contiene cd0076b70fc81f75bc126800747b14fb016ca677 y que los commits posteriores solo actualizan el checkpoint. Si la precondición falla, informá el estado real y entregá el prompt corregido.

Revisá el diff publicado, los cuatro adaptadores, la selección y el consentimiento, el acceso a los fragmentos y la evidencia por modelo y por fase del gate. Contrastá el fallo remoto de Gemini 3.8 Flash y la falta de ruta OpenRouter Free compatible con ZDR contra la aceptación de S-116. Si sigue faltando evidencia, registrá el hallazgo y devolvé al dueño o a un implementer nuevo el mismo PR con la condición de cierre. Conservá las restricciones de privacidad y precio.

FULL/STARTER: DIFERIDO POR EL DUEÑO. Conservá Render Auto-Deploy On Commit. Si se satisface la aceptación y aprobás de forma independiente con verify-required verde, hacé el squash ligado al SHA revisado y confirmá MERGED, mergedAt y mergeCommit.oid. Cerrá con el prompt completo de la sesión siguiente.
```
