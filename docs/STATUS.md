# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-099](tasks/T-099-persistent-google-session.md) |
| Estado | `ready` |
| Siguiente acción | Frontera planner verifica el PR documental de T-099 y confirma su squash con la conformidad expresa del dueño. Después frontera implementer de T-099, en sesión nueva. |
| Rama / PR | `codex/t-099-session-continuity-plan` · PR de planificación |

Modo `FRONTERA_CONTINUA`. [T-098 conciliada](tasks/T-098-compact-writing-header.md#conciliación) tras PR #97 MERGED. El dueño priorizó disponibilidad y continuidad de sesión. [Configuración y evidencia del cron externo](DEPLOYMENT.md#despertador-externo-de-devnotes).

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
Frontera planner de T-099 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, docs/STATUS.md, docs/agents/planner.md, docs/tasks/T-099-persistent-google-session.md y docs/DEPLOYMENT.md («Despertador externo de DevNotes»). PRECONDICIÓN: gh pr view codex/t-099-session-continuity-plan --repo MatiasNicolasAcevedo/devnotes --json state,headRefOid,statusCheckRollup,mergedAt,mergeCommit devuelve el PR documental. ACCIÓN: si está abierto, acreditá verify-required verde en el HEAD vigente y confirmá el squash solo con la conformidad expresa del dueño para el plan de siete días de inactividad y 30 días desde el login. Si ya está mergeado, verificá mergedAt y mergeCommit.oid y que ese oid sea ancestro de origin/main. Prepará el prompt para una sesión nueva de frontera implementer de T-099, con sus pruebas dirigidas. Consultá el último resultado documentado del cron y rescatá incidencias posteriores si las hay. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: estado confirmado del PR, evidencia operativa que falte y prompt vigente.
```
