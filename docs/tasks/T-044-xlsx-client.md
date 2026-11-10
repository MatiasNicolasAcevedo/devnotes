---
id: T-044
status: draft
priority: P1
size: M
executor: junie
role: implementer
milestone: M3
product_cycle: I3
spec: S-107
spec_version: 1
branch: codex/t-044-xlsx-client
pr: null
depends_on: [T-043]
---
# T-044 · Pantalla «Datos»: exportar e importar

## Objetivo

La ruta `/data` permite descargar el Excel de la cuenta y, en una cuenta vacía, previsualizar e importar un archivo, según [S-107 · Frontend](../specs/S-107-xlsx-portability.md#frontend).

Está en `draft` solo porque depende de T-043. Tras su merge corresponde el **control de cinco tareas** (T-040…T-044) por Junie. La siguiente tarea es [T-045](T-045-xlsx-journey.md).

## Alcance y decisiones resueltas

- **Feature.** `client/src/features/portability/`, con:
  - `api.ts`: `downloadExport`, `previewImport(file)` e `importFile(file)`, con Zod para validar las respuestas y la `AbortSignal` de la identidad;
  - `DataPage.tsx`, con secciones Exportar e Importar y el diálogo de confirmación;
  - los textos de S-107.
- **Rutas.** `AppRoutes` añade `data` y `AppShell` el enlace «Datos».
- **Descarga.** `fetch` con credenciales, blob y `<a download>` temporal con el nombre del `Content-Disposition` o un nombre de respaldo `devnotes.xlsx`; después `URL.revokeObjectURL`. El botón se deshabilita durante la descarga, y un error muestra un mensaje con reintento.
- **Importación.** Al elegir un archivo se llama a la vista previa. Si `accountEmpty` es falso, solo se muestra la explicación. Si es verdadero, «Importar» abre la confirmación con los conteos; al confirmar se envía el mismo `File` y, si sale bien, se muestran los conteos con enlaces y se invalidan todas las queries privadas (`queryClient.invalidateQueries()` dentro de la identidad vigente).
- **Errores.** Mensajes por código de S-107 (`IMPORT_*`, 401 y 403 con el flujo existente), con hoja y fila si existen. Al cambiar de identidad se aborta y se descarta lo tardío. No se usa el almacenamiento del navegador.
- **Sin dependencias npm nuevas.**

## Leer antes

1. [S-107 · Frontend](../specs/S-107-xlsx-portability.md#frontend).
2. [client/AGENTS](../../client/AGENTS.md).
3. `client/src/features/voice/api.ts` (multipart, CSRF y Zod) y `client/src/app/AppRoutes.tsx` / `AppShell.tsx`.
4. `client/src/features/voice/VoicePage.test.tsx` (MSW y estados).

## Archivos y pasos

`client/src/features/portability/*` con pruebas `api.test.ts` y `DataPage.test.tsx`, más `AppRoutes.tsx`, `AppShell.tsx` y `AppRoutes.test.tsx`.

1. API y esquemas con sus pruebas.
2. `DataPage`: estados y diálogo, con pruebas de componente usando MSW contra las rutas reales.
3. Ruta y enlace, más la prueba de navegación.

## Aceptación y pruebas

XL-05. Casos mínimos de componente:

- La descarga crea y revoca la URL, y un error muestra el reintento.
- La vista previa muestra los conteos.
- Con `accountEmpty: false` no aparece el botón de confirmar.
- Confirmar envía el mismo archivo una sola vez y el éxito invalida las queries.
- Cada código de error muestra su mensaje con la fila.
- Un cambio de identidad descarta la respuesta tardía.
- Hay foco visible y se opera con teclado.
- A 375 px no hay overflow (comprobación de layout del componente).

| Criterio | Capa | Comando (desde `client/`) | Resultado |
|---|---|---|---|
| XL-05 | Componente | `npm test -- --run src/features/portability src/app/AppRoutes.test.tsx` | Verde |
| Gate integrado después de T-044 MERGED | FULL sobre `main` | Desde la raíz: `DEVNOTES_VOICE_ENABLED=false GROQ_API_KEY= DEVNOTES_VOICE_TEST_PROVIDER=false COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t044 STARTER_E2E_PROJECT=starter-e2e-t044 STARTER_SERVER_TESTS=container bash scripts/verify.sh`. Añadir tooling si el diff acumulado es STARTER, según [TESTING](../TESTING.md#aplazamiento-de-full-hasta-t-044). | Exit 0, cobertura sin bajar |

## Checkpoint vigente

`draft` por dependencia. Contrato completo (frontera, 2026-11-10).

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|

## Cierre y siguiente tarea

PR único y revisión independiente con pruebas dirigidas, docs-check y CI según la regla temporal. Tras MERGED, ejecutar el gate integrado como parte del control de cinco por Junie (contratos, evidencia y hallazgos a BACKLOG). Con el FULL verde, conciliar y tomar [T-045](T-045-xlsx-journey.md).
