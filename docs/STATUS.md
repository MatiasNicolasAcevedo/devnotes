# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-074](tasks/T-074-image-navigation.md) · Imagen en la navegación principal · [S-112](specs/S-112-screenshot-ocr.md) |
| Estado | `in_progress` |
| Acción actual | Frontera implementer completa el arrastre y pegado nativos con asistencia del dueño |
| Rama / PR | `codex/t-074-image-navigation` · [PR #77 en borrador](https://github.com/MatiasNicolasAcevedo/devnotes/pull/77) |

Modo `FRONTERA_CONTINUA`. El 2026-11-16 el dueño adoptó el [flujo de trabajo](WORKFLOW.md): planner, implementer y reviewer que mergea; gate diario con pruebas dirigidas; gates largos diferidos. Las decisiones vigentes están en [AUTONOMY](AUTONOMY.md#modo-y-decisiones-vigentes).

El [lote Imagen, Libres e IA](BACKLOG.md#lote-imagen-libres-e-ia) encadena T-073 a T-091, una tarea y un PR por vez. T-073 quedó mergeada y conciliada.

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
| Mergeado desde entonces | T-070 (recorrido E2E de OCR), T-071 y T-092 (documentales) y la adopción documental del flujo |
| Corte acumulado | Desde `7aa8946` hasta el HEAD de `main` que indique el dueño ([TESTING](TESTING.md#corte-acumulado-vigente)). El FULL/STARTER de I5 sigue diferido |
| Recomendación | Ninguna por ahora. Reevaluar al mergear T-077 (cierra Imagen) o antes si un PR toca dependencias, Docker o migraciones |

### Prompt de la siguiente sesión

```text
Actuá como frontera implementer de T-074 en MatiasNicolasAcevedo/devnotes. Sesión nueva.

LEER: AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/AUTONOMY.md, docs/tasks/T-074-image-navigation.md, S-112 y la sección Imagen de docs/design/WRITING-WORKSPACES.md.
PRECONDICIÓN: gh pr view 77 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid debe confirmar OPEN en borrador contra main@74d987d1cd7f1d4e0d1f2a8994fe7d656cc47e30. Verificá que el HEAD publicado descienda de 3fbf34989ac9f3259751f23ef16db733791d3aa4 y que git diff --exit-code 3fbf34989ac9f3259751f23ef16db733791d3aa4 <HEAD> -- client/ e2e/ termine en 0. Si cambia el estado o la base, informá el estado real y recalculá la evidencia que corresponda.
ACCIÓN: 1) Retomá codex/t-074-image-navigation y el mismo PR. 2) Con un perfil Chrome aislado, un proyecto efímero propio y el doble externo, completá con asistencia del dueño el arrastre de un PNG ficticio desde Explorador y Ctrl+V tras volver de Recortes. ¿Puede el dueño realizar los dos gestos en la ventana de ensayo? Registrá tipos, tamaños, foco, dimensiones, cero POST antes de Extraer texto y cleanup. La tarea tiene los comandos locales de retoma. 3) Si se cumplen los dos ensayos, pasá a in_review, publicá el PR listo y verificá HEAD/base, docs-check, diff-check y verify-required. Si falta un gesto, mantené el borrador y registrá la evidencia pendiente.
GATE: diario. FULL/STARTER: DIFERIDO POR EL DUEÑO.
SALIDA: evidencia nativa ligada al PR #77 y, si se cumple el contrato, prompt de frontera reviewer con HEAD/base en STATUS y al final de la respuesta. Conservá Render Auto-Deploy On Commit.
```
