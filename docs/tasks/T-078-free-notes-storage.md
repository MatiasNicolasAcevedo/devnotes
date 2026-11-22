---
id: T-078
status: in_review
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

2026-11-21. Frontera implementer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git/gh, Git Bash, Java Corretto 21.0.9, Node 24.21.0 y Docker Desktop. [PR #81](https://github.com/MatiasNicolasAcevedo/devnotes/pull/81) contra `main@84151b0a782760e278280abd344ce9ad3e0a285f`. Fuentes probadas en `e6e9c3744d3e956f00d9581a17df88b57e972992`. El HEAD de entrega agrega este checkpoint y el prompt en STATUS.

- Entrada (exit 0). `gh pr view 80 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit,baseRefName`, `git fetch origin main`, `git merge-base --is-ancestor 84151b0a782760e278280abd344ce9ad3e0a285f origin/main` y `gh pr list --repo MatiasNicolasAcevedo/devnotes --state open --json number,headRefName`. PR #80 MERGED, squash incluido en main, sin PR abiertos.

- Conciliación (exit 0). Primer commit `617c2213c8d1fdcbcaa56094530d5bcbd1e31602`: T-077 a `done` y T-078 a `in_progress`.
- Impacto. V9 agrega notas y recibos privados por cuenta y espacio. El servicio valida títulos y documentos, lista por fecha de actualización e ID, y compara la revisión bajo lock de fila. Creación y borrado comparten el lock de cuenta de importación. El recibo conserva identificador, fecha y digest durante 24 h y permite reconstruir el resultado original aun después de editar o borrar. La API HTTP queda para T-080 y la portabilidad para T-079.
- Backend desde `server/` (exit 0). `./mvnw -q spotless:apply` y `./mvnw -q verify -Dtest=FreeNoteDocumentTest -Dit.test=FreeNoteServiceIT,FreeNoteMigrationIT,PrivateSpaceMigrationIT -Djacoco.skip=true`. Surefire: `FreeNoteDocumentTest` 16/16. Failsafe en PostgreSQL 18.6: `FreeNoteServiceIT` 7/7, `FreeNoteMigrationIT` 1/1, `PrivateSpaceMigrationIT` 1/1. Sin fallos ni omitidos. Se verificó que los tres PostgreSQL propios y su Ryuk se retiraron.
- Documentos y diff (exit 0). `node scripts/docs-check.mjs` en checkout aislado para preservar `trailer/` del dueño, `git diff --check origin/main HEAD` y `bash scripts/verify.sh --policy origin/main` (perfil informativo APPLICATION / FULL). El PR vincula `verify-required` al HEAD/base publicados.

| Causa o evidencia | Ajuste | Comprobación |
|---|---|---|
| La consulta inicial de GitHub en sandbox devolvió exit 1, y Git Bash del clasificador en sandbox devolvió `-1073741502`. | Usar la ejecución autorizada de gh y la ruta explícita del Git Bash instalado en la ejecución autorizada. | Consulta de PR 80 y clasificador (exit 0). |

Pendiente: revisión independiente. FULL/STARTER: DIFERIDO POR EL DUEÑO. Render conserva Auto-Deploy On Commit.
