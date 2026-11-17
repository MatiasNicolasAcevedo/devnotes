# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-073](tasks/T-073-ocr-windows-paste.md) · Pegar recortes de Windows en OCR · [S-112](specs/S-112-screenshot-ocr.md) |
| Estado | `in_progress` |
| Acción actual | Frontera implementa y verifica T-073 |
| Rama / PR | `codex/t-073-ocr-windows-paste-fix` · sin PR |

Modo `FRONTERA_CONTINUA`. El 2026-11-16 el dueño adoptó el [flujo de trabajo](WORKFLOW.md): planner, implementer y reviewer que mergea; gate diario con pruebas dirigidas; gates largos diferidos. Las decisiones vigentes están en [AUTONOMY](AUTONOMY.md#modo-y-decisiones-vigentes).

[T-092](tasks/T-092-writing-workspaces-plan.md#conciliación) conciliada `done` (PR75 MERGED, `77cb710`). El [lote Imagen, Libres e IA](BACKLOG.md#lote-imagen-libres-e-ia) encadena T-073 a T-091, una tarea y un PR por vez. El historial de tareas anteriores vive en cada tarea, en los PR y en Git.

El checkout local `.orchestrator/t073-ocr-windows-paste` (commit `2a2fc56`, con cambios) es la fuente del diagnóstico de T-073: preservarlo.

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
Actuá como frontera implementer de T-073 en MatiasNicolasAcevedo/devnotes. Sesión nueva.

LEER: AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/WORKFLOW.md, docs/tasks/T-073-ocr-windows-paste.md, docs/specs/S-112-screenshot-ocr.md y la sección Imagen de docs/design/WRITING-WORKSPACES.md. Usá frontend-design para cotejar el diálogo en escritorio y móvil.
PRECONDICIÓN: main local igual a origin/main y sin PR abiertos (gh pr list --repo MatiasNicolasAcevedo/devnotes --state open). T-092 ya está conciliada done. Si hay un PR abierto o main difiere, informar el estado real y entregar el prompt corregido.
ACCIÓN: 1) Checkout nuevo desde main con la rama exacta codex/t-073-ocr-windows-paste-fix; T-073 in_progress en tarea y STATUS. Preservar el checkout local .orchestrator/t073-ocr-windows-paste, su commit 2a2fc56 y sus cambios. 2) Reproducir en Windows con Recortes y un PNG ficticio antes de corregir; registrar foco y tipos, y el rojo dirigido. 3) Implementar el pegado y la indicación visual no seleccionable; conservar edición de texto, archivos inválidos, selección previa y envío solo al elegir Extraer texto. 4) Correr las pruebas de componente del contrato, el E2E filtrado «screenshot OCR:» en desktop con API propia y doble externo, docs-check y git diff --check. 5) Publicar el único PR de T-073 con evidencia de HEAD/base y perfil del diff.
GATE: diario. FULL y STARTER están diferidos: no ejecutarlos sin orden expresa del dueño.
SALIDA: PR de T-073 publicado, tarea in_review, Auto-Deploy On Commit sin cambios. Terminar con el prompt de frontera reviewer de ese PR, con número y SHA, en STATUS y completo en la respuesta final; ese reviewer mergea si aprueba y deja el prompt de T-074.
```
