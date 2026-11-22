# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-078](tasks/T-078-free-notes-storage.md) · Persistencia privada para notas libres · [S-113](specs/S-113-free-notes.md) |
| Estado | `mergeable` |
| Acción actual | Revisión independiente sin hallazgos. Validar la transición, publicar el veredicto y confirmar el squash del PR 81 |
| Rama / PR | `codex/t-078-free-notes-storage` · [PR #81](https://github.com/MatiasNicolasAcevedo/devnotes/pull/81) |

Modo `FRONTERA_CONTINUA`. El 2026-11-16 el dueño adoptó el [flujo de trabajo](WORKFLOW.md): planner, implementer y reviewer que mergea; gate diario con pruebas dirigidas; gates largos diferidos. Las decisiones vigentes están en [AUTONOMY](AUTONOMY.md#modo-y-decisiones-vigentes).

El [lote Imagen, Libres e IA](BACKLOG.md#lote-imagen-libres-e-ia) encadena T-073 a T-091, una tarea y un PR por vez. T-077 quedó mergeada y conciliada.

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
| Recomendación | Ejecutar el integrado del corte acumulado con V8 y V9 cuando el dueño lo ordene |

### Prompt de la siguiente sesión

```text
Actuá como frontera implementer de T-079 en MatiasNicolasAcevedo/devnotes. Sesión nueva.

LEER: AGENTS.md, server/AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/AUTONOMY.md, docs/TESTING.md, docs/tasks/T-078-free-notes-storage.md, docs/tasks/T-079-free-notes-xlsx.md, S-113, el documento de Libres en S-114 y la portabilidad incremental de S-112.
PRECONDICIÓN: gh pr view 81 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit,baseRefName debe confirmar MERGED en main, con mergedAt y mergeCommit.oid válidos. Actualizá origin/main y comprobá con git merge-base --is-ancestor que contiene ese squash. Si una comprobación falla, informá el estado real y entregá el prompt vigente.
ACCIÓN: Abrí codex/t-079-free-notes-xlsx desde origin/main actualizado. En el primer commit conciliá T-078 a done con el squash confirmado y habilitá T-079. Implementá XLSX v4 con la hoja notas_libres y el validador compartido, la vista previa y los contadores por espacio. Conservá la restauración v1/v2/v3 y OCR, y verificá el rollback completo ante un documento inválido. Publicá un solo PR contra main.
GATE: Ejecutá los comandos exactos de T-079 para backend dirigido, pruebas y typecheck de cliente y E2E de portabilidad en desktop. Corré docs-check y comprobá verify-required del HEAD publicado. FULL/STARTER: DIFERIDO POR EL DUEÑO.
SALIDA: PR listo para revisión independiente, con checkpoint y gate ligados a HEAD/base. Dejá el prompt de frontera reviewer en STATUS y completo en el chat. Conservá Render Auto-Deploy On Commit.
```
