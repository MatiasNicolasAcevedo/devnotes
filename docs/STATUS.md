# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-076](tasks/T-076-image-text-xlsx.md) · Recuperar textos de Imagen en XLSX v3 · [S-112](specs/S-112-screenshot-ocr.md) |
| Estado | `in_progress` |
| Acción actual | Frontera implementer implementa y verifica XLSX v3 |
| Rama / PR | `codex/t-076-image-text-xlsx` · [PR #79](https://github.com/MatiasNicolasAcevedo/devnotes/pull/79) |

Modo `FRONTERA_CONTINUA`. El 2026-11-16 el dueño adoptó el [flujo de trabajo](WORKFLOW.md): planner, implementer y reviewer que mergea; gate diario con pruebas dirigidas; gates largos diferidos. Las decisiones vigentes están en [AUTONOMY](AUTONOMY.md#modo-y-decisiones-vigentes).

El [lote Imagen, Libres e IA](BACKLOG.md#lote-imagen-libres-e-ia) encadena T-073 a T-091, una tarea y un PR por vez. T-075 quedó mergeada y conciliada.

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
| Mergeado desde entonces | T-070 (recorrido E2E de OCR), T-074 (navegación de Imagen), T-071 y T-092 (documentales) y la adopción documental del flujo |
| Corte acumulado | Desde `7aa8946` hasta el HEAD de `main` que indique el dueño ([TESTING](TESTING.md#corte-acumulado-vigente)). El FULL/STARTER de I5 sigue diferido |
| Recomendación | Evaluar el corte acumulado por la migración V8 cuando el dueño ordene el integrado. Reevaluar al mergear T-077 (cierra Imagen) |

### Prompt de la siguiente sesión

```text
Actuá como frontera implementer de T-076 en MatiasNicolasAcevedo/devnotes. Sesión nueva.

LEER: AGENTS.md, server/AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/AUTONOMY.md y docs/tasks/T-076-image-text-xlsx.md.
PRECONDICIÓN: gh pr view 79 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefName,headRefOid,baseRefName,baseRefOid debe confirmar OPEN en codex/t-076-image-text-xlsx contra main.
ACCIÓN: Retomá la evidencia del checkpoint de T-076 y cerrá el gate diario y la publicación del mismo PR.
GATE: diario. FULL/STARTER: DIFERIDO POR EL DUEÑO.
SALIDA: T-076 in_review y prompt de frontera reviewer. Conservá Render Auto-Deploy On Commit.
```
