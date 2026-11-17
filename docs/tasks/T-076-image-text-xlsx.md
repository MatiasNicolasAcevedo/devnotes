---
id: T-076
status: draft
priority: P1
size: M
milestone: M6
spec: S-112
depends_on: [T-075]
branch: codex/t-076-image-text-xlsx
role: implementer
executor: frontier
pr: null
---

# T-076 · Recuperar textos de Imagen en XLSX v3

## Objetivo

Recuperar textos de Imagen en XLSX v3 con el recorrido observable descrito en la aceptación.

## Alcance

Implementar codec v3, importación, exportación, conteos por espacio, lock de cuenta y cliente de respaldo. Ampliar guía de recuperación. [Contrato S-112](../specs/S-112-screenshot-ocr.md) · [Diseño y previsualización](../design/WRITING-WORKSPACES.md).

## Aceptación y pruebas

Ida y vuelta v1/v2/v3, texto y fechas intactos, fragmentación y Unicode. Duplicado, dueño falsificado y archivo inválido no escriben. Cuenta con solo OCR bloquea importación. Capturas ausentes del respaldo.

- Desde `server/` con Git Bash y JDK 21, con PostgreSQL Testcontainers. `./mvnw -q verify -Dtest=XlsxImageTextsRoundTripTest,XlsxSpacesRoundTripTest,XlsxWorkbookReaderTest -Dit.test=PortabilityImageTextsApiIT,PortabilitySpacesApiIT,PortabilityImportServiceIT -Djacoco.skip=true`. Registrar las fases y cantidad ejecutada. El comando dirigido no acredita la cobertura agregada.
- Desde `client/`. `npm test -- --run src/features/portability` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

Habilitar en sesión nueva tras confirmar [T-075](T-075-image-text-library.md) MERGED y conciliarla. Registrar el SHA/base y la evidencia efectivamente ejecutada.
