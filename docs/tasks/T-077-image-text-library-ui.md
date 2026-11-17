---
id: T-077
status: draft
priority: P1
size: M
milestone: M6
spec: S-112
depends_on: [T-076]
branch: codex/t-077-image-text-library-ui
role: implementer
executor: frontier
pr: null
---

# T-077 · Guardar, abrir y borrar textos de Imagen

## Objetivo

Guardar, abrir y borrar textos de Imagen con el recorrido observable descrito en la aceptación.

## Alcance

Exponer REST de T-075 y agregar Textos guardados con el patrón de VoiceLibrary. Guardar y abrir operan sobre texto aislado de la captura. Reutilizar guardias, invalidación de caché, confirmación y foco. [Contrato S-112](../specs/S-112-screenshot-ocr.md) · [Diseño y previsualización](../design/WRITING-WORKSPACES.md).

## Aceptación y pruebas

Guardar dos textos, abrir/copy, borrar uno y recargar. Guardado fallido conserva texto, borrado fallido conserva fila, doble clic no duplica. Espacio, otra cuenta, CSRF y cuerpo inválido comprobados. Solo Extraer envía al OCR externo.

- Desde `server/` con Git Bash y JDK 21, con PostgreSQL Testcontainers. `./mvnw -q verify -Dtest=ImageTextServiceTest -Dit.test=ImageTextApiIT,OcrExtractionApiIT -Djacoco.skip=true`. Registrar las fases y cantidad ejecutada. El comando dirigido no acredita la cobertura agregada.
- Desde `client/`. `npm test -- --run src/features/ocr` y `npm run typecheck`. Conservar regresiones y agregar casos en el área indicada.
- Desde raíz con Git Bash. `STARTER_E2E_PROJECT=starter-e2e-t077-desktop bash scripts/e2e.sh --grep 'image-text-library:|screenshot OCR:' --project=desktop`. Añadir o actualizar los casos bajo ese filtro. API propia y sesión reales con doble del tercero cuando corresponda. Registrar cleanup por label.
- Cerrar con [pruebas dirigidas del lote](../TESTING.md#lote-imagen-libres-e-ia-del-2026-11-16), docs-check y evidencia por HEAD/base.

## Checkpoint vigente

Habilitar en sesión nueva tras confirmar [T-076](T-076-image-text-xlsx.md) MERGED y conciliarla. Registrar el SHA/base y la evidencia efectivamente ejecutada.
