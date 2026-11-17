---
id: T-079
status: draft
priority: P1
size: M
milestone: M7
spec: S-113
depends_on: [T-078]
branch: codex/t-079-free-notes-xlsx
role: implementer
executor: frontier
pr: null
---

# T-079 · Recuperar notas libres en XLSX v4

## Objetivo

Recuperar notas libres en XLSX v4 con el recorrido observable descrito en la aceptación.

## Alcance

Ampliar codec, servicios y vista previa para v4 y hoja notas_libres. Usar el validador común. Incluir contador de Libres en ambos espacios. [Contrato S-113](../specs/S-113-free-notes.md) · [Diseño y previsualización](../design/WRITING-WORKSPACES.md).

## Aceptación y pruebas

Restaurar v1/v2/v3 sin inventar Libres. Ida y vuelta v4 conserva título, saltos, ambos espacios y OCR. Cuenta con solo Libres deja de estar vacía. Un documento inválido revierte toda la importación.

- Desde `server/` con Git Bash y JDK 21, con PostgreSQL Testcontainers. `./mvnw -q verify -Dtest=XlsxFreeNotesRoundTripTest,XlsxImageTextsRoundTripTest,XlsxWorkbookReaderTest -Dit.test=PortabilityFreeNotesApiIT,PortabilityImageTextsApiIT,PortabilityImportServiceIT -Djacoco.skip=true`. Registrar las fases y cantidad ejecutada. El comando dirigido no acredita la cobertura agregada.
- Desde `client/`. `npm test -- --run src/features/portability` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t079-desktop bash scripts/e2e.sh --grep 'portability:' --project=desktop`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

Habilitar en sesión nueva tras confirmar [T-078](T-078-free-notes-storage.md) MERGED y conciliarla. Registrar el SHA/base y la evidencia efectivamente ejecutada.
