# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-101](tasks/T-101-unified-note-document.md) · primera de [S-118](specs/S-118-notes-tabs.md) |
| Estado | `ready` |
| Siguiente acción | Frontera implementer de T-101: el servidor acepta en las notas separadores, enlaces, referencias y negrita |
| Rama / PR | `codex/t-101-unified-note-document` desde `main`; sin PR |

Modo `FRONTERA_CONTINUA`. [T-099](tasks/T-099-persistent-google-session.md#conciliación) done tras el [PR #101](https://github.com/MatiasNicolasAcevedo/devnotes/pull/101) MERGED (squash `bfd76c2`): la sesión de Google vive en PostgreSQL, 7 días sin actividad o 30 desde cada login. El 2026-11-28 el dueño aprobó el rediseño de Notas en pestañas ([S-118](specs/S-118-notes-tabs.md), [referencia visual](../media/design/notes-tabs/README.md)): ocho tareas, de T-101 a T-108, en [BACKLOG](BACKLOG.md#siguientes--notas-en-pestañas-s-118-i9--m10). [Configuración y evidencia del cron externo](DEPLOYMENT.md#despertador-externo-de-devnotes).

Piloto aprobado con cinco destinos: Groq 20B/120B, Workers AI 20B/120B y Gemini 3.1 Flash-Lite. Gemini 3.8 Flash y OpenRouter Free quedan diferidos. El selector y el compositor muestran disponibilidad, fallos y cuota. El usuario elige y confirma otro destino. [Decisión y cierre observable](tasks/T-094-ai-workspace.md#decisión-de-alcance-del-dueño). FULL/STARTER: DIFERIDO POR EL DUEÑO.

## Pendientes del dueño

| Tema | Qué falta |
|---|---|
| PostgreSQL Free de Render | El 2026-11-23 el dueño borra `devnotes-pilot-db` (sin datos de producción, sin respaldo) y crea una base PostgreSQL 18 Free nueva en Virginia; actualiza `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` y `SPRING_DATASOURCE_PASSWORD`. Falta registrar el vencimiento exacto del panel (30 días, alrededor del 2026-12-23), readiness `UP` y login. Desde ahí hay datos reales: antes del vencimiento rige el [procedimiento de respaldo y reemplazo](DEPLOYMENT.md#respaldo-y-reemplazo-de-postgresql-free) |
| Sonda interna en Render | Ensayo pendiente de autorización expresa sobre SHA y ventana. [Receta](DEPLOYMENT.md#ensayo-de-la-sonda-interna-en-render-free) |
| Exportación antes del corte de Notas | Antes de que se mergee T-104 (migración del Diario a notas), el dueño exporta un XLSX de producción y lo confirma en la sesión de T-104 |
| Sesión persistente (T-099) | Verificar en sus dispositivos, con Google real, que la sesión se conserva tras cerrar el navegador y tras un despliegue |
| SP-06 | Prueba en Android físico con teclado real y zoom nativo; en S-118 incluye la barra pegada al teclado de T-107 |
| Limpieza local | Hay decenas de worktrees en `.orchestrator/`, ramas locales ya mergeadas y siete stashes viejos. Listarlos y decidir cuáles se borran; ningún agente los elimina sin esa decisión |

Render: Auto-Deploy **On Commit** para `main`; cada merge despliega, también los documentales.

## Gates diferidos

| Dato | Valor |
|---|---|
| Último integrado válido | FULL local del 2026-11-15 sobre `398801f` ([T-069](tasks/T-069-ocr-workspace.md#evidencia-del-full-de-cierre)); STARTER de T-068 conservado |
| Mergeado desde entonces | T-070 (recorrido E2E de OCR), T-074 (navegación de Imagen), T-071 y T-092 (documentales), la adopción documental del flujo, el encadenamiento del lote hasta T-085 y T-093 a T-096 (IA Free, tráiler y demo narrada) |
| Corte acumulado | Desde `7aa8946` hasta el HEAD de `main` que indique el dueño ([TESTING](TESTING.md#corte-acumulado-vigente)). El FULL/STARTER de I5 sigue diferido |
| Recomendación | Ejecutar el integrado del corte acumulado con V8 y V9 cuando el dueño lo ordene. T-094 incorpora rutas privadas y cambia Compose; T-099 agrega Spring Session JDBC, cambia autenticación y suma la migración V10. S-118 suma V11 y V12: recomendar el integrado después de T-104 y al cerrar T-108 |

### Prompt de la siguiente sesión

```text
Frontera implementer de T-101 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, server/AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/specs/S-118-notes-tabs.md (Documento de nota) y docs/tasks/T-101-unified-note-document.md. PRECONDICIÓN: gh pr view codex/s-118-notes-tabs-plan --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit confirma MERGED y git merge-base --is-ancestor con ese oid y origin/main sale 0. ACCIÓN: en codex/t-101-unified-note-document desde main, pasá T-101 a in_progress en el primer commit. Escribí primero las pruebas rojas de AC-01 y AC-02, extraé NoteInlineRules de DailyContent sin cambiar su comportamiento, ampliá FreeNoteDocument y el documentSchema del cliente con los límites de S-118, corré el gate diario de la tarea y publicá el PR. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: PR publicado, checkpoint en la tarea y prompt del reviewer en STATUS.
```
