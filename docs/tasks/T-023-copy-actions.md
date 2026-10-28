---
id: T-023
status: draft
priority: P1
size: S
milestone: M1
spec: S-106
depends_on: [T-022]
branch: codex/t-023-copy-actions
role: implementer
executor: junie
pr: null
---
# T-023 · Copiar referencias y nota

## Objetivo

Desde la lista privada copiar con botones accesibles el título o descripción mostrados; desde la nota de trabajo copiar el texto actual, incluso con edición pendiente. Draft solo por dependencia T-022; al verificar su MERGED Junie puede habilitarla. No habilita aún vinculación ni voz.

## Alcance

Texto plano exacto de cada campo visible. Para nota aplicar `documentToPlainText`: LF entre bloques, marcas de enlace como texto visible, cada separador una línea vacía, espacios y líneas vacías conservados. No incluir URL ni HTML ocultos. No añadir botón al historial en esta tarea. No cambiar selección o Ctrl+C. Botones con icono y nombre accesible distinto, sin enviar texto a terceros; API Clipboard solo por acción de usuario. Informar éxito solo después de resolución; rechazo o API ausente muestra error y ofrece selección/copia manual, sin fingir éxito. Evitar que respuesta tardía muestre datos o avisos de otra identidad tras logout/cambio.

## Leer antes

[S-106](../specs/S-106-reference-links.md), [S-003](../specs/S-003-reference-security.md), [client/AGENTS](../../client/AGENTS.md), [TESTING](../TESTING.md), [implementer](../agents/implementer.md).

## Archivos y pasos

Editar ReferencePage y DailyNotesPage, compartir solo lo necesario para portapapeles y pruebas pertinentes. Tomar el estado actual del editor, no una respuesta guardada obsoleta. Mantener foco y navegación de teclado, etiquetas y presentación usable a 375 px.

## Aceptación y pruebas

- Componentes prueban valor exacto actual, Unicode, espacios, LF, enlace y separador; campo vacío, éxito diferido, rechazo/API ausente, teclado y cambio de identidad en vuelo. Desde `client`: `npm test -- --run src/features/reference/ReferencePage.test.tsx src/features/daily/DailyNotesPage.test.tsx src/features/daily/editor/dailyDocument.test.ts`.
- Gate desde raíz Git Bash: `COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t023 STARTER_E2E_PROJECT=starter-e2e-t023 STARTER_SERVER_TESTS=container bash scripts/verify.sh`. Antes comprobar nombres libres y registrar SHA/base, huellas, log saneado y cleanup solo propio; conservar stack persistente. docs-check/policy según TESTING.

## Checkpoint vigente

Contrato de frontera; no ejecutado. Depende de T-022 MERGED. T-025 extiende serialización para la referencia vigente conforme S-106.

## Cierre y siguiente tarea

Un PR y revisión independiente; comprobar MERGED antes de la siguiente tarea. Tras comprobar MERGED, continuar con T-024 predefinida; no iniciar voz.
