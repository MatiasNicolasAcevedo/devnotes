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
branch: codex/s-107-xlsx-portability
pr: null
depends_on: [T-043]
---
# T-044 · Pantalla «Datos»: exportar e importar

## Objetivo

La ruta `/data` permite descargar el Excel de la cuenta y, en una cuenta vacía, previsualizar e importar un archivo, según [S-107 · Frontend](../specs/S-107-xlsx-portability.md#frontend).

Está en `draft` solo porque depende de T-043 cerrada en la rama compartida de [S-107](../specs/S-107-xlsx-portability.md#tareas-y-dependencias). El control de avance de Junie se hace una vez, sobre las seis tareas, al cerrar T-045. La siguiente tarea es [T-045](T-045-xlsx-journey.md).

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
| Gate integrado de S-107 (se ejecuta al cerrar T-045, no aquí) | FULL sobre el HEAD final de la rama compartida | Comando único en [T-045](T-045-xlsx-journey.md#aceptación-y-pruebas); no se ejecuta en esta tarea. | Exit 0, cobertura sin bajar |

## Checkpoint vigente

2026-11-10. Implementer en Claude Code de escritorio (Claude Fable 5.2, esfuerzo no expuesto), sesión distinta de las de T-040…T-043, con Git Bash, Node 24, npm, Git y `gh`. Impacto: ruta de UI nueva `/data` con el enlace «Datos» en la barra; consume las tres rutas de portabilidad ya existentes. El cliente HTTP único gana `requestBlob` para respuestas binarias. Sin cambios de API, permisos, esquema, datos ni dependencias.

**T-044 cerrada en la rama** `codex/s-107-xlsx-portability`, con XL-05 verde. El frontmatter sigue en `draft` por la [regla de la rama compartida](../specs/S-107-xlsx-portability.md#tareas-y-dependencias); la portadora es [T-040](T-040-daily-timestamps.md) y el PR es el [PR49](https://github.com/MatiasNicolasAcevedo/devnotes/pull/49) (draft).

- Precondición: `gh pr view 49` devolvió `OPEN`, draft, `codex/s-107-xlsx-portability` → `main`, HEAD `c753024`, que contiene `2095b1e`; árbol local limpio y T-043 registrada como cerrada con XL-04 verde.
- SHA de la pantalla: `b18bd04`. Crea `client/src/features/portability/` (`api.ts`, `messages.ts`, `DataPage.tsx` y las pruebas `api.test.ts` y `DataPage.test.tsx`); agrega la ruta en `AppRoutes.tsx`, el enlace en `AppShell.tsx` y dos casos en `AppRoutes.test.tsx`; agrega `requestBlob` a `services/http.ts` con tres casos en `http.test.ts`.
- XL-05, desde `client/`: `npm test -- --run src/features/portability src/app/AppRoutes.test.tsx` **exit 0**, 3 archivos y 81 pruebas (41 de API y mensajes, 31 de componente y 9 de rutas).
- Gate del cliente, porque cambia el cliente HTTP compartido: `npm run verify` desde `client/`, **exit 0**: typecheck, ESLint sin warnings, Prettier, 42 archivos y 593 pruebas con cobertura (líneas 91,21 %, ramas 83,06 %) y build. Acredita el cliente, no el gate FULL.
- Cierre temporal: `node scripts/docs-check.mjs` OK y `git diff --check` exit 0.
- No ejecutado: backend, Playwright ni el gate FULL. **FULL diferido** al HEAD final del PR único, con `--tooling`, según [TESTING](../TESTING.md#aplazamiento-de-full-hasta-t-044).
- Sin recursos propios por limpiar: no se levantó ningún stack ni contenedor. No se borraron ramas, worktrees ni archivos de `.orchestrator`.

Casos de componente (MSW en las rutas reales, con sesión, router, Query y cliente HTTP reales):

- **Descarga.** En vuelo el botón queda deshabilitado y no hay éxito; al terminar se crea la URL del blob, se hace clic en un `<a download>` con el nombre del servidor y se revoca la URL. Sin `Content-Disposition` usa `devnotes.xlsx`. Un 500, una caída de red y un cuerpo vacío muestran el error con «Reintentar» y nunca anuncian éxito; el reintento descarga.
- **Vista previa.** Muestra «Revisando el archivo…», la fecha de exportación en UTC y los cuatro conteos. Con `accountEmpty: false` muestra la explicación y no hay botón «Importar» ni diálogo. Elegir otro archivo aborta la revisión en vuelo y su respuesta tardía no habilita la importación.
- **Importación.** El diálogo repite los conteos; confirmar envía una sola vez el mismo `File` de la vista previa, como única parte `file` y con el header CSRF; el éxito muestra los conteos con enlaces, recibe el foco y llama a `invalidateQueries()` una vez. Cancelar no importa y devuelve el foco. Un 409 al importar no anuncia éxito ni invalida, y «Reintentar» vuelve a la vista previa sin reenviar la importación.
- **Errores.** Los cinco códigos `IMPORT_*`, en la vista previa y al importar, muestran su mensaje con hoja y fila y nunca el `detail`. Un 413 con página HTML del proxy se trata como archivo demasiado grande. Un 403 renueva el CSRF sin reenviar y permite reintentar. Un 401 sigue el flujo de sesión y retira la pantalla privada.
- **Identidad.** Con la importación, la vista previa o la descarga de A en vuelo, pasar a B aborta la petición y la respuesta tardía no muestra éxito, error, vista previa ni descarga, ni invalida queries. Un visitante ve la invitación a ingresar sin llamadas a la API. No se escribe en `localStorage` ni `sessionStorage`.
- **Teclado y 375 px.** El recorrido completo (descargar, elegir archivo, abrir, cerrar con Escape, confirmar) se hace con teclado y el foco vuelve o sigue al resultado. La comprobación de 375 px es de reglas de estilo, porque jsdom no calcula layout: sin anchos fijos ni `nowrap`, controles con `max-width: 100 %`, acciones del diálogo con salto de línea y regla `:focus-visible` del input. La medición real de overflow a 375 px queda para el proyecto mobile del E2E de T-045.

Decisiones de implementación dentro del contrato, para T-045:

- **`requestBlob` en el cliente único.** La descarga no es JSON y [client/AGENTS](../../client/AGENTS.md) exige un solo cliente `fetch`, así que `services/http.ts` suma `requestBlob(path, accept, options)`, con las mismas credenciales, errores tipados, 401 y aborto. Envía `Accept` con el tipo del libro más `application/problem+json`. Es el único archivo tocado fuera de la lista del contrato.
- **Nombre de descarga.** Solo se acepta del `Content-Disposition` un nombre simple terminado en `.xlsx`; cualquier otra forma usa `devnotes.xlsx`.
- **Mensajes.** Textos fijos por código en `messages.ts`; el `detail` del servidor no se muestra. La hoja se muestra solo si es una de las cinco del formato y la fila solo si es un entero positivo. Un error sin `code` que no sea 401, 403, 413 o 5xx muestra «No se pudo procesar el archivo.».
- **Textos visibles que usará el E2E.** Título «Datos»; botones «Descargar Excel», «Importar» y «Confirmar importación»; etiqueta del input «Archivo de respaldo (.xlsx)»; estado «Descarga lista: `<nombre>`»; región «Contenido del archivo» con «Notas diarias: N», «Versiones guardadas: N», «Notas de voz: N» y «Referencias: N»; éxito «Importación completa» con enlaces «Ver en Notas», «Ver en Historial», «Ver en Voz» y «Ver en Referencias»; cuenta con datos «Solo se puede importar en una cuenta sin datos.».
- **Cuenta no vacía.** Al reimportar en B, la vista previa ya responde `accountEmpty: false`: el mensaje aparece como estado informativo y no hay botón «Importar», por lo que el 409 de `imports` no se alcanza desde la UI salvo carrera.
- **Reintento.** «Reintentar» tras un error de importación repite la vista previa, nunca la importación: importar siempre exige una confirmación nueva.
- **Input durante la revisión.** El input de archivo queda habilitado mientras se revisa (elegir otro archivo reemplaza la revisión) y se deshabilita solo al importar, sin CSRF o al cerrar sesión.
- **Identidad.** `DataPage` monta la parte privada con `key` del usuario; su `AbortController` se aborta al desmontar y cada respuesta se descarta si la sesión en cache ya no es la del dueño.
- **Multipart en pruebas.** El `File` de jsdom no se serializa como multipart en el `fetch` de Node cuando la respuesta de MSW es asíncrona (`RequestContentLengthMismatchError`). Las pruebas registran el `FormData` real en la frontera de `fetch` y reemplazan solo el cuerpo; ruta, método, cabeceras y señal llegan intactos a MSW. El multipart real lo cubren los IT de T-043 y el E2E de T-045.

Siguiente: sesión nueva para [T-045](T-045-xlsx-journey.md) en la misma rama.

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|

## Cierre y siguiente tarea

Sin PR propio: cerrar en la rama compartida con XL-05 verde, `docs-check` y commit publicado. El gate integrado y el control de avance pasan al cierre de T-045. La siguiente sesión toma [T-045](T-045-xlsx-journey.md) en la misma rama.
