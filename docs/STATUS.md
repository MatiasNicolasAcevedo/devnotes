# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-098](tasks/T-098-compact-writing-header.md) · [S-117](specs/S-117-compact-writing-header.md) |
| Estado | `ready` |
| Siguiente acción | El dueño revisa el plan de la barra compacta. Tras su conformidad y el merge documental, frontera implementer aplica T-098 en sesión nueva. |
| Rama / PR | Plan `codex/t-098-compact-window-plan` · implementación `codex/t-098-compact-writing-header` |

Modo `FRONTERA_CONTINUA`. T-097 conciliada ([PR #94](https://github.com/MatiasNicolasAcevedo/devnotes/pull/94) MERGED, `8b0ddd5`): con ella cierran el M9 y el [lote Imagen, Libres e IA](BACKLOG.md#lote-imagen-libres-e-ia). El dueño decidió el 2026-11-23 borrar la base Free actual y crear una nueva, sin respaldo: el proyecto todavía no se usa en producción y empieza a usarse con la base nueva. Los demás pendientes siguen abajo. [Cron externo configurado](DEPLOYMENT.md#despertador-externo-de-devnotes).

Piloto aprobado con cinco destinos: Groq 20B/120B, Workers AI 20B/120B y Gemini 3.1 Flash-Lite. Gemini 3.8 Flash y OpenRouter Free quedan diferidos. El selector y el compositor muestran disponibilidad, fallos y cuota. El usuario elige y confirma otro destino. [Decisión y cierre observable](tasks/T-094-ai-workspace.md#decisión-de-alcance-del-dueño). FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Pendientes del dueño

| Tema | Qué falta |
|---|---|
| PostgreSQL Free de Render | El 2026-11-23 el dueño borra `devnotes-pilot-db` (sin datos de producción, sin respaldo) y crea una base PostgreSQL 18 Free nueva en Virginia; actualiza `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` y `SPRING_DATASOURCE_PASSWORD`. Falta registrar el vencimiento exacto del panel (30 días, alrededor del 2026-12-23), readiness `UP` y login. Desde ahí hay datos reales: antes del vencimiento rige el [procedimiento de respaldo y reemplazo](DEPLOYMENT.md#respaldo-y-reemplazo-de-postgresql-free) |
| Sonda interna en Render | Ensayo pendiente de autorización expresa sobre SHA y ventana. [Receta](DEPLOYMENT.md#ensayo-de-la-sonda-interna-en-render-free) |
| SP-06 | Prueba en Android físico con teclado real y zoom nativo |
| Limpieza local | Hay decenas de worktrees en `.orchestrator/`, ramas locales ya mergeadas y siete stashes viejos. Listarlos y decidir cuáles se borran; ningún agente los elimina sin esa decisión |

Render: Auto-Deploy **On Commit** para `main`; cada merge despliega, también los documentales.

## Gates diferidos

| Dato | Valor |
|---|---|
| Último integrado válido | FULL local del 2026-11-15 sobre `398801f` ([T-069](tasks/T-069-ocr-workspace.md#evidencia-del-full-de-cierre)); STARTER de T-068 conservado |
| Mergeado desde entonces | T-070 (recorrido E2E de OCR), T-074 (navegación de Imagen), T-071 y T-092 (documentales), la adopción documental del flujo, el encadenamiento del lote hasta T-085 y T-093 a T-096 (IA Free, tráiler y demo narrada) |
| Corte acumulado | Desde `7aa8946` hasta el HEAD de `main` que indique el dueño ([TESTING](TESTING.md#corte-acumulado-vigente)). El FULL/STARTER de I5 sigue diferido |
| Recomendación | Ejecutar el integrado del corte acumulado con V8 y V9 cuando el dueño lo ordene. T-094 incorpora rutas privadas y cambia Compose |

### Prompt de la siguiente sesión

```text
Frontera implementer de T-098 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/specs/S-117-compact-writing-header.md y docs/tasks/T-098-compact-writing-header.md. PRECONDICIÓN: gh pr view codex/t-098-compact-window-plan --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit devuelve MERGED con fecha y oid válidos, y git merge-base --is-ancestor con ese oid y origin/main sale con exit 0. Si el plan está abierto, devolvé el estado y dejá la implementación pendiente de la conformidad del dueño y el merge documental. ACCIÓN: en codex/t-098-compact-writing-header desde origin/main, registrá el rojo y las medidas base a 640×480 CSS px. Implementá la fila superior de 32 px para Diario y Libres autenticados en ventana angosta con puntero fino, preservando el tamaño táctil y verificando que el espacio llegue al editor. Ejecutá el gate dirigido de T-098 y registrá medidas antes y después, comandos y exits. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: un PR de T-098 con verify-required verde y el prompt de reviewer independiente.
```
