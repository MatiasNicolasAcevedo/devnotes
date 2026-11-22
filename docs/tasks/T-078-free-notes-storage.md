---
id: T-078
status: in_progress
priority: P1
size: S
milestone: M7
spec: S-113
depends_on: [T-077]
branch: codex/t-078-free-notes-storage
role: implementer
executor: frontier
pr: null
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

2026-11-21. Frontera implementer en Codex Desktop, GPT-6 (variante y esfuerzo sin dato expuesto), PowerShell, Git y gh. Base `84151b0a782760e278280abd344ce9ad3e0a285f`. Impacto previsto: almacenamiento privado nuevo, sin cambios de API HTTP, permisos ni UI.

- Entrada (exit 0). `gh pr view 80 --repo MatiasNicolasAcevedo/devnotes --json state,mergedAt,mergeCommit,baseRefName`, `git fetch origin main`, `git merge-base --is-ancestor 84151b0a782760e278280abd344ce9ad3e0a285f origin/main` y `gh pr list --repo MatiasNicolasAcevedo/devnotes --state open --json number,headRefName`. PR #80 MERGED, squash incluido en main, sin PR abiertos.

Pendiente: implementación, gate dirigido y publicación. FULL/STARTER: DIFERIDO POR EL DUEÑO.
