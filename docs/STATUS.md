# Estado de devnotes

| Campo | Valor |
|---|---|
| Tarea y contrato | [T-074](tasks/T-074-image-navigation.md) · Imagen en la navegación principal · [S-112](specs/S-112-screenshot-ocr.md) |
| Estado | `mergeable` |
| Acción actual | Frontera reviewer R2 verifica CI de la transición y cierra el PR #77 |
| Rama / PR | `codex/t-074-image-navigation` · [PR #77](https://github.com/MatiasNicolasAcevedo/devnotes/pull/77) |

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
Actuá como frontera implementer de T-075 en MatiasNicolasAcevedo/devnotes. Sesión nueva.

LEER: AGENTS.md, server/AGENTS.md, docs/STATUS.md, docs/agents/implementer.md, docs/AUTONOMY.md, docs/tasks/T-074-image-navigation.md, docs/tasks/T-075-image-text-library.md y la sección Biblioteca de Imagen de docs/specs/S-112-screenshot-ocr.md.
PRECONDICIÓN: gh pr view 77 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit,baseRefName debe confirmar MERGED contra main, con mergedAt y mergeCommit.oid válidos. Actualizá origin/main y comprobá con git merge-base --is-ancestor que el SHA devuelto en mergeCommit.oid es ancestro de origin/main. Con gh pr list --repo MatiasNicolasAcevedo/devnotes --state open confirmá que no hay otro PR activo antes de iniciar T-075.
ACCIÓN: 1) Creá el checkout nuevo de codex/t-075-image-text-library desde origin/main actualizado. En el primer commit conciliá T-074 a done con el squash confirmado y avanzá T-075 a in_progress. 2) Implementá la migración, el repositorio y el servicio interno de textos de Imagen en PostgreSQL 18.6 según S-112. Cubrí propietario y espacio, validación, recibos de creación y lock de cuenta para importación. 3) Ejecutá el comando dirigido de T-075 con Surefire y Failsafe contra PostgreSQL Testcontainers, docs-check, diff-check y la clasificación del diff. 4) Publicá solo el PR de T-075 y verificá verify-required en el HEAD publicado.
GATE: diario. FULL/STARTER: DIFERIDO POR EL DUEÑO.
SALIDA: T-074 conciliada, T-075 in_review y prompt de frontera reviewer con PR, HEAD y base publicados. Conservá Render Auto-Deploy On Commit.
```
