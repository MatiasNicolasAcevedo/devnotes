# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-075](tasks/T-075-image-text-library.md) · Persistencia privada para los textos de Imagen · [S-112](specs/S-112-screenshot-ocr.md) |
| Estado | `mergeable` |
| Acción actual | Frontera reviewer verifica CI de la transición y cierra el PR #78 |
| Rama / PR | `codex/t-075-image-text-library` · [PR #78](https://github.com/MatiasNicolasAcevedo/devnotes/pull/78) |

Modo `FRONTERA_CONTINUA`. El 2026-11-16 el dueño adoptó el [flujo de trabajo](WORKFLOW.md): planner, implementer y reviewer que mergea; gate diario con pruebas dirigidas; gates largos diferidos. Las decisiones vigentes están en [AUTONOMY](AUTONOMY.md#modo-y-decisiones-vigentes).

El [lote Imagen, Libres e IA](BACKLOG.md#lote-imagen-libres-e-ia) encadena T-073 a T-091, una tarea y un PR por vez. T-074 quedó mergeada y conciliada.

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

LEER: AGENTS.md, server/AGENTS.md, client/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/AUTONOMY.md, docs/tasks/T-075-image-text-library.md, docs/tasks/T-076-image-text-xlsx.md y la sección Portabilidad incremental de Imagen y Libres de docs/specs/S-112-screenshot-ocr.md.
PRECONDICIÓN: gh pr view 78 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit,baseRefName debe confirmar MERGED contra main, con mergedAt y mergeCommit.oid válidos. Actualizá origin/main y comprobá con git merge-base --is-ancestor, pasando mergeCommit.oid y origin/main en ese orden, que el squash está en la base. Con gh pr list --repo MatiasNicolasAcevedo/devnotes --state open confirmá que no hay otro PR activo.
ACCIÓN: 1) Creá el checkout de codex/t-076-image-text-xlsx desde origin/main actualizado. En el primer commit conciliá T-075 a done con el SHA de squash confirmado y avanzá T-076 a in_progress. 2) Implementá codec XLSX v3, importación/exportación y conteos por espacio, exclusión con el lock de cuenta, cliente de respaldo y guía de recuperación conforme a T-076. Conservá lectura v1/v2 y verificá que una cuenta con solo textos de Imagen bloquee importación. 3) Corré los comandos backend y client de T-076 y el gate diario aplicable. 4) Publicá solo el PR de T-076 y comprobá verify-required en el HEAD publicado.
GATE: diario. FULL/STARTER: DIFERIDO POR EL DUEÑO.
SALIDA: T-075 conciliada, T-076 in_review, evidencia por HEAD y base publicados y prompt de frontera reviewer. Conservá Render Auto-Deploy On Commit.
```
