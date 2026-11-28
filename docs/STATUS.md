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
| Base productiva en Render | La base actual no tiene datos productivos y se descarta ([decisión del 2026-11-28](AUTONOMY.md#modo-y-decisiones-vigentes)). Al cerrar S-118, después del integrado final de T-109, el dueño borra la base de Render, crea una PostgreSQL 18 Free vacía en Virginia y actualiza `SPRING_DATASOURCE_*`. Luego registra el vencimiento del panel (30 días), readiness `UP` y login. Desde ahí rige el [procedimiento de respaldo y reemplazo](DEPLOYMENT.md#respaldo-y-reemplazo-de-postgresql-free). Si la base Free actual vence antes (alrededor del 2026-12-23), se recrea vacía sin respaldo |
| Sonda interna en Render | Ensayo pendiente de autorización expresa sobre SHA y ventana. [Receta](DEPLOYMENT.md#ensayo-de-la-sonda-interna-en-render-free) |
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
| Orden del dueño | El 2026-11-28 el dueño ordenó correr el integrado STARTER (incluye FULL) **una sola vez, al terminar T-108**, sobre el corte acumulado de `main`, y corregir sus fallos en T-109 ([AUTONOMY](AUTONOMY.md#modo-y-decisiones-vigentes)). Cubre V8 a V12, Compose, Spring Session JDBC y el corte de Notas. Ninguna tarea anterior lo ejecuta |

### Prompt de la siguiente sesión

```text
Frontera implementer de T-101 en MatiasNicolasAcevedo/devnotes, sesión nueva. Leé AGENTS.md, server/AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/specs/S-118-notes-tabs.md (Documento de nota) y docs/tasks/T-101-unified-note-document.md. PRECONDICIÓN: gh pr view codex/s-118-plan-adjust --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit confirma MERGED y git merge-base --is-ancestor con ese oid y origin/main sale 0. ACCIÓN: en codex/t-101-unified-note-document desde main, pasá T-101 a in_progress en el primer commit. Escribí primero las pruebas rojas de AC-01 y AC-02, extraé NoteInlineRules de DailyContent sin cambiar su comportamiento, ampliá FreeNoteDocument y el documentSchema del cliente con los límites de S-118, corré el gate diario de la tarea y publicá el PR. FULL/STARTER: DIFERIDO POR EL DUEÑO. SALIDA: PR publicado, checkpoint en la tarea y prompt del reviewer en STATUS.
```
