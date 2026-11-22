# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-093](tasks/T-093-ai-media-plan.md) · Plan de IA y materiales finales |
| Estado | `in_review` |
| Siguiente acción | Tras T-093 MERGED, implementar [T-094](tasks/T-094-ai-workspace.md) según [S-116](specs/S-116-ai-workspace.md) |
| Rama | `codex/t-093-ai-media-plan` |

Modo `FRONTERA_CONTINUA`. T-085 conciliada. La [cola](BACKLOG.md#lote-imagen-libres-e-ia) continúa con IA, tráiler v2 y demo narrada. [Cron externo configurado](DEPLOYMENT.md#despertador-externo-de-devnotes).

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
| Recomendación | Ejecutar el integrado del corte acumulado con V8 y V9 cuando el dueño lo ordene. T-080 incorpora rutas privadas en Spring Security |

### Prompt de la siguiente sesión

```text
Actuá como frontera implementer de T-094 en MatiasNicolasAcevedo/devnotes. Sesión nueva.

Leé AGENTS.md, server/AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-094-ai-workspace.md y docs/specs/S-116-ai-workspace.md. Aplicá frontend-design y la sección IA de docs/design/WRITING-WORKSPACES.md.

Verificá con gh pr view codex/t-093-ai-media-plan --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit que el plan T-093 está MERGED. Ejecutá git fetch origin main y git merge-base --is-ancestor SHA origin/main, reemplazando SHA por el oid devuelto. Si la precondición falla, informá el estado real.

Partí de origin/main en codex/t-094-ai-workspace. Conciliá T-093 en el primer commit. Implementá en un único PR los cuatro proveedores Free, el selector compacto del navbar, los modelos ligeros primero y la consulta explícita de fragmentos. Usá las claves solo desde el backend. Probá cada adaptador con doble y ejecutá la matriz de modelos de T-094 con muestras ficticias en el piloto Free.

Corré los comandos dirigidos de T-094, incluidos Failsafe/PostgreSQL, typecheck, E2E filtrado, docs-check y verify-required del HEAD publicado. FULL/STARTER: DIFERIDO POR EL DUEÑO. Conservá Render Auto-Deploy On Commit.

Registrá resultados por proveedor/modelo, HEAD y base en T-094. Dejá en STATUS y al final de la respuesta el prompt completo para un frontera reviewer independiente.
```
