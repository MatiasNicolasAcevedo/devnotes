# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-097](tasks/T-097-demo-page.md#conciliación); sin tarea siguiente |
| Estado | `done` |
| Siguiente acción | El dueño revisa y, con su conformidad expresa, se mergea el PR de planificación de `codex/m9-close-plan`. Hoy el dueño borra `devnotes-pilot-db` y crea una base nueva ([decisión](AUTONOMY.md#modo-y-decisiones-vigentes)); después, frontera planner registra la base nueva y elige con el dueño lo siguiente |
| Rama / PR | `codex/m9-close-plan` · PR de planificación |

Modo `FRONTERA_CONTINUA`. T-097 conciliada ([PR #94](https://github.com/MatiasNicolasAcevedo/devnotes/pull/94) MERGED, `8b0ddd5`): con ella cierran el M9 y el [lote Imagen, Libres e IA](BACKLOG.md#lote-imagen-libres-e-ia). No hay tarea predefinida. El dueño decidió el 2026-11-23 borrar la base Free actual y crear una nueva, sin respaldo: el proyecto todavía no se usa en producción y empieza a usarse con la base nueva. Los demás pendientes siguen abajo. [Cron externo configurado](DEPLOYMENT.md#despertador-externo-de-devnotes).

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
Frontera planner de seguimiento tras el cierre del M9 (T-097 done) en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, docs/STATUS.md, docs/agents/planner.md, docs/AUTONOMY.md (decisión del 2026-11-23 sobre la base) y docs/DEPLOYMENT.md («Avance del piloto» y «Respaldo y reemplazo de PostgreSQL Free»). PRECONDICIÓN: gh pr view codex/m9-close-plan --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit devuelve MERGED con mergedAt y mergeCommit.oid válidos, y git merge-base --is-ancestor con ese oid y origin/main sale con exit 0; si no, devolvé el paso vigente. ACCIÓN: preguntá al dueño si ya borró devnotes-pilot-db y creó la base PostgreSQL 18 Free nueva, y pedile solo datos no secretos del panel: nombre, región, fecha de creación y vencimiento, y SHA activo del Web Service. Comprobá readiness con curl.exe a https://devnotes-pilot.onrender.com/actuator/health/readiness (HTTP 200 y status UP) y pedile que confirme el login. No leas credenciales, el .env real ni datos de la base y no cambies variables ni planes. En una rama de planificación actualizá DEPLOYMENT (base vigente, vencimiento nuevo y que desde ella hay datos reales), la fila de PostgreSQL en STATUS y la decisión en AUTONOMY. Después presentá los pendientes restantes (sonda interna, SP-06, limpieza local, integrado del corte acumulado) y preguntá qué sigue; sin decisión del dueño no escribas tareas nuevas. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: PR de planificación con el registro de la base nueva y el prompt completo de la sesión que el dueño elija.
```
