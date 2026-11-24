# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-100](tasks/T-100-flexible-links-nav-order.md) |
| Estado | `ready` |
| Siguiente acción | El dueño revisa el PR de planificación de `codex/t-100-ui-adjustments-plan` y, con su conformidad expresa, se hace el squash. Después, frontera implementer toma T-100 en sesión nueva. [T-099](tasks/T-099-persistent-google-session.md) sigue tras el MERGED de T-100 |
| Rama / PR | `codex/t-100-flexible-links-nav-order` · PR de implementación pendiente |

Modo `FRONTERA_CONTINUA`. [PR documental #98](https://github.com/MatiasNicolasAcevedo/devnotes/pull/98) MERGED (`190e105`) con T-099 planificada. El 2026-11-24 el dueño pidió antes dos ajustes de UI: enlaces sin `https://` y un orden único de navegación. T-099 queda en `draft` solo por ese orden. [Configuración y evidencia del cron externo](DEPLOYMENT.md#despertador-externo-de-devnotes).

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
Frontera implementer de T-100 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md y docs/tasks/T-100-flexible-links-nav-order.md con sus referencias. PRECONDICIÓN: gh pr view codex/t-100-ui-adjustments-plan --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit confirma MERGED con fecha y oid. Actualizá origin/main con git fetch origin main y comprobá que git merge-base --is-ancestor con el oid confirmado y origin/main sale 0. Si no se cumple, devolvé el estado vigente. ACCIÓN: desde origin/main usá la rama codex/t-100-flexible-links-nav-order. Demostrá primero en rojo la tabla de enlaces, el E2E flexible link: y el orden nuevo de navegación. Después implementá normalizeLinkHref en el cliente sin relajar DailyContent ni dailyDocument.ts, y la lista única Notas · Referencias · Voz · Imagen · Historial en AppShell. Ejecutá los unitarios de cliente, DailyContentTest y los E2E dirigidos de escritorio y móvil de T-100 con datos ficticios. Corré el gate diario y publicá un único PR para revisión independiente. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: PR con la evidencia roja y verde, la tabla de hrefs comprobada y el prompt completo de reviewer.
```
