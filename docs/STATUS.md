# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-100](tasks/T-100-flexible-links-nav-order.md) |
| Estado | `mergeable` |
| Siguiente acción | Ronda 2 [APROBADA](tasks/T-100-flexible-links-nav-order.md#revisión-independiente--ronda-2); el reviewer hace el squash del [PR #100](https://github.com/MatiasNicolasAcevedo/devnotes/pull/100). Tras el MERGED, frontera implementer de [T-099](tasks/T-099-persistent-google-session.md) |
| Rama / PR | `codex/t-100-flexible-links-nav-order` · [PR #100](https://github.com/MatiasNicolasAcevedo/devnotes/pull/100), código en `2a122ba`, corrección de H1 en `f9abefe` y cierre documental en el HEAD publicado |

Modo `FRONTERA_CONTINUA`. [PR documental #98](https://github.com/MatiasNicolasAcevedo/devnotes/pull/98) MERGED (`190e105`) con T-099 planificada. El 2026-11-24 el dueño pidió antes dos ajustes de UI: enlaces sin `https://` y un orden único de navegación. [PR de planificación #99](https://github.com/MatiasNicolasAcevedo/devnotes/pull/99) MERGED (`5dcb171`); T-100 implementada; la ronda 1 pidió cambios solo en el E2E nuevo (H1); la ronda 2 lo aprobó con el E2E de escritorio 8/8. T-099 queda en `draft` solo por ese orden. [Configuración y evidencia del cron externo](DEPLOYMENT.md#despertador-externo-de-devnotes).

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
Frontera implementer de T-099 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, server/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md y docs/tasks/T-099-persistent-google-session.md con sus referencias. PRECONDICIÓN: gh pr view codex/t-100-flexible-links-nav-order --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit confirma MERGED con fecha y oid. Actualizá origin/main con git fetch origin main y comprobá que git merge-base --is-ancestor con el oid confirmado y origin/main sale 0. ACCIÓN: desde origin/main usá la rama codex/t-099-persistent-google-session. En el primer commit conciliá T-100 como done y pasá T-099 a ready en la tarea, BACKLOG y STATUS. Reproducí primero la pérdida de sesión al reiniciar y después implementá persistencia en PostgreSQL con siete días de inactividad y un máximo de 30 días desde cada login. Conservá OIDC, CSRF, revocación y privacidad por propietario. Ejecutá los IT y E2E dirigidos de T-099 con datos ficticios, corré el gate diario y publicá un único PR para revisión independiente. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: PR con evidencia de reinicio, expiración y logout, y prompt completo de reviewer.
```
