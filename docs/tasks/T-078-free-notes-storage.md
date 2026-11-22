---
id: T-078
status: done
priority: P1
size: S
milestone: M7
spec: S-113
depends_on: [T-077]
branch: codex/t-078-free-notes-storage
role: reviewer
executor: frontier
pr: 81
---

# T-078 · Persistencia privada para notas libres

## Objetivo

Persistencia privada para notas libres con el recorrido observable descrito en la aceptación.

## Alcance

Migración Flyway, repositorio y servicio privados. Esquema de párrafos, idempotencia, revisión y lock de cuenta según S-113 y S-114. Dejar rutas HTTP para T-080. [Contrato S-113](../specs/S-113-free-notes.md).

## Aceptación y pruebas

Migración con tablas previas, títulos repetidos, paginación estable y aislamiento. Dos ediciones en competencia tienen un éxito y un 409. Datos inválidos, reintento perdido y recibo tras borrar conservan invariantes.

- Desde `server/` con Git Bash y JDK 21, con PostgreSQL Testcontainers. `./mvnw -q verify -Dtest=FreeNoteDocumentTest -Dit.test=FreeNoteServiceIT,FreeNoteMigrationIT,PrivateSpaceMigrationIT -Djacoco.skip=true`. Registrar las fases y cantidad ejecutada. El comando dirigido no acredita la cobertura agregada.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

Conciliación T-079. La consulta explícita del PR #81 confirmó MERGED contra main el 2026-11-22T02:46:28Z, squash `311e47c1ca6d64f81c3bc1950ec6687a3d418ea7`. Se comprobó su inclusión en origin/main (exit 0).

2026-11-21 (Buenos Aires). Frontera reviewer independiente en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git/gh y Git Bash. [PR #81](https://github.com/MatiasNicolasAcevedo/devnotes/pull/81), ronda 1. HEAD revisado `dbb6630d6aca7bb2a078b9754cb21174bdefd508` contra `main@84151b0a782760e278280abd344ce9ad3e0a285f`. Evidencia del implementer en el checkpoint de ese HEAD.

- Entrada (exit 0). `gh pr view 81 --repo MatiasNicolasAcevedo/devnotes --json state,isDraft,headRefOid,baseRefName,baseRefOid,statusCheckRollup` confirmó OPEN, listo y `verify-required` SUCCESS. GraphQL confirmó el check en el commit exacto y cero conversaciones. En un worktree aislado, `git diff --exit-code e6e9c3744d3e956f00d9581a17df88b57e972992 HEAD -- server` confirmó fuentes idénticas.
- Revisión. V9 añade tablas e índices y preserva las filas previas a la migración. Las lecturas y escrituras se acotan a cuenta y espacio. La paginación usa fecha e ID, admite títulos repetidos y sigue funcionando al borrar la fila del cursor. Los negativos cubren título, documento y revisión inválidos. El lock de fila produce un éxito y un 409 con dos ediciones competidoras. Creación y borrado toman el lock de cuenta de importación. El recibo recupera el resultado original tras edición o borrado durante 24 h y revierte junto con la nota. La entrega es interna al backend.
- Backend dirigido desde `server/` con Java Corretto 21.0.9 y Testcontainers (exit 0). `./mvnw -q verify -Dtest=FreeNoteDocumentTest -Dit.test=FreeNoteServiceIT,FreeNoteMigrationIT,PrivateSpaceMigrationIT -Djacoco.skip=true`. Surefire: `FreeNoteDocumentTest` 16/16. Failsafe en PostgreSQL 18.6: `FreeNoteServiceIT` 7/7, `FreeNoteMigrationIT` 1/1 y `PrivateSpaceMigrationIT` 1/1. Cero fallos, errores u omitidos.
- Documentos y diff (exit 0). `node scripts/docs-check.mjs`, `git diff --check 84151b0a782760e278280abd344ce9ad3e0a285f HEAD` y `bash scripts/verify.sh --policy origin/main` (APPLICATION / FULL informativo).

| Causa o evidencia | Ajuste | Comprobación |
|---|---|---|
| `gh pr view` inicial en sandbox, exit 1 por conexión a GitHub. | Ejecutar la misma consulta con acceso de red autorizado. | Exit 0, HEAD/base y CI confirmados. |

Resultado de revisión: sin hallazgos. Transición a `mergeable` de solo documentación. La aprobación y el squash se ligan al HEAD publicado de esa transición y quedan sujetos a docs-check, CI verde y base idéntica. FULL/STARTER: DIFERIDO POR EL DUEÑO. Render Auto-Deploy On Commit.
