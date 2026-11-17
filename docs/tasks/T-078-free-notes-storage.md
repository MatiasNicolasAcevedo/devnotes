---
id: T-078
status: draft
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

Habilitar en sesión nueva tras confirmar [T-077](T-077-image-text-library-ui.md) MERGED y conciliarla. Registrar el SHA/base y la evidencia efectivamente ejecutada.
