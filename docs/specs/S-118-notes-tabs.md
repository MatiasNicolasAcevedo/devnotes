---
id: S-118
status: approved
version: 2
milestone: M10
tasks: [T-101, T-102, T-103, T-104, T-105, T-106, T-107, T-108]
---
# S-118 · Notas en pestañas, editor único e historial con retención

## Iteración y objetivo de salida

I9 / M10. Hoy Notas tiene dos formas de escribir. **Diario** es una nota por fecha, con calendario, «Hoy», copia del día anterior y una versión por día. **Libres** son notas con título, que se abren desde un directorio, tienen otro editor y no tienen versiones. El dueño quiere una sola forma: notas con título, abiertas en pestañas como un editor de texto, con un único editor y un historial general.

Objetivo observable al cerrar la iteración:

1. Notas muestra una tira de pestañas. Cada nota se abre, se cierra (×) y se reabre con un clic, y la sesión siguiente recupera las pestañas abiertas.
2. Todas las notas usan el mismo editor: numeración, separadores, títulos, negrita, listas, casillas, bloques de código, enlaces y referencias, con una barra de íconos compacta y guardado automático.
3. «Guardar versión» funciona en cualquier nota. Historial muestra las versiones de todas las notas del espacio y las borra a los 15 días, salvo la última de cada nota.
4. Desaparecen el calendario, «Hoy», la navegación por fecha y «Copiar del día anterior». Las notas diarias actuales no se migran: la base todavía no tiene datos productivos y sus tablas se eliminan.
5. El teléfono tiene el mismo comportamiento, adaptado al pulgar y al teclado.
6. Exportar e importar llevan solo el contenido actual de cada nota.

Al mergear T-108 se vuelve a frontera para correr el integrado FULL y STARTER final y corregir sus fallos (orden del dueño en [AUTONOMY](../AUTONOMY.md#modo-y-decisiones-vigentes)). También se vuelve antes ante una decisión que este contrato no resuelve. Después, el dueño crea una base vacía y empieza el uso productivo. Referencia visual: [media/design/notes-tabs](../../media/design/notes-tabs/README.md).

## Problema y usuario

Usuario único: el dueño, en Windows (PWA de escritorio) y en Android, con los espacios Trabajo y Personal. Evidencia, en sus palabras del 2026-11-28: necesita tener varias notas «al alcance de un clic» como en Sublime Text; hoy para llegar a una nota libre tiene que entrar a Libres y elegirla. Las herramientas de formato existen en Libres y no en Diario («necesito que sea una sola hoja de escritura»). Ya no necesita navegar por días ni copiar del día anterior. Quiere versiones guardadas a mano que se borren solas a los 15 días, para no ocupar disco y para que exportar e importar no arrastren historial.

Referencias: [S-101](S-101-daily-notes.md), [S-103](S-103-separators.md), [S-104](S-104-daily-versions.md), [S-106](S-106-reference-links.md), [S-107](S-107-xlsx-portability.md), [S-109](S-109-private-spaces.md), [S-110](S-110-previous-day-copy.md), [S-113](S-113-free-notes.md), [S-114](S-114-writing-editor.md), [S-115](S-115-side-reading.md), [S-116](S-116-ai-workspace.md), [S-117](S-117-compact-writing-header.md) y [guía visual previa](../design/WRITING-WORKSPACES.md).

## Historias y reglas

- Como dueño quiero abrir varias notas en pestañas y pasar de una a otra con un clic.
- Como dueño quiero crear una nota poniéndole un título, sin notas fijas ni nombres obligatorios.
- Como dueño quiero cerrar una pestaña sin perder la nota y borrar una nota solo con una acción aparte y confirmada.
- Como dueño quiero escribir igual en todas las notas, con las mismas herramientas.
- Como dueño quiero guardar versiones de cualquier nota y consultarlas, compararlas, copiarlas o restaurarlas desde un historial único.
- Como dueño quiero que las versiones viejas se borren solas y que el respaldo XLSX no las incluya.

### Decisiones confirmadas por el dueño (2026-11-28)

| ID | Regla |
|---|---|
| D-01 | Se implementa la propuesta A (pestañas tipo editor) con la barra de íconos de la propuesta B. B y C quedan descartadas |
| D-02 | No hay nota fija ni nota «Diario» especial. Todas las notas son iguales y se nombran libremente con un título |
| D-03 | La × cierra la pestaña y no borra. Eliminar es otra acción, desde «Todas las notas», con confirmación, y borra la nota y sus versiones |
| D-04 | Un único editor para todas las notas, con numeración, separadores, P/H1/H2/H3, negrita, viñetas, lista numerada, casillas, bloque de código, enlace y referencia |
| D-05 | La barra superior no muestra logo ni «DevNotes». Orden: selector de espacio, Notas, Referencias, Voz, Imagen, Historial y, después, **Demo** con su estilo rojo actual |
| D-06 | Se eliminan calendario, «Hoy», navegación por fecha y «Copiar del día anterior» |
| D-07 | «Guardar versión» para toda nota. Historial general de todas las notas. Retención de 15 días; la última versión de cada nota se conserva siempre |
| D-08 | Exportar e importar llevan solo el contenido actual de cada nota |
| D-09 | Escritorio y teléfono se diseñan y prueban por separado (maquetas 03 a 07) |

### Decisiones de frontera (propuestas en este contrato, el dueño puede cambiarlas antes de cada tarea)

| ID | Regla | Motivo |
|---|---|---|
| F-01 | El modelo de nota es el actual `free_note` (título, documento JSONB, revisión, espacio). La API conserva la ruta `/api/spaces/{space}/free-notes`; en la interfaz se llaman «notas» | Evita una migración de tabla y de API. El nombre interno no se ve |
| F-02 | Sin migración ni recuperación de datos. Las notas diarias y sus versiones se descartan; T-108 elimina `daily_note` y `daily_version` con V12. Las notas libres existentes siguen siendo notas sin cambios | Confirmado por el dueño el 2026-11-28: la base no tiene datos productivos y se recrea vacía al cerrar S-118 ([AUTONOMY](../AUTONOMY.md#modo-y-decisiones-vigentes)) |
| F-03 | El documento de nota es la unión de los dos formatos actuales; todo documento de Diario o de Libres es válido sin transformarlo | El editor único guarda cualquier formato sin conversiones |
| F-04 | Guardado automático para todas las notas, con el debounce de Diario (700 ms) y sus estados. El título también se guarda solo | El dueño pide escribir en todas como en Diario |
| F-05 | Las pestañas abiertas, su orden y la activa se guardan en `localStorage`, por espacio, en cada dispositivo. Clave `devnotes.notes.tabs.v1.<space>`; se borra al cerrar sesión | Cada dispositivo es una ventana distinta, como un editor. No hace falta API |
| F-06 | Hasta 20 pestañas abiertas. Al abrir la 21.ª se cierra la menos usada, que no es la activa, y se anuncia en la región viva | Límite de memoria y de ancho |
| F-07 | Hasta 30 versiones por nota dentro de los 15 días; al guardar la 31.ª se borra la más vieja | Cota de disco por nota |
| F-08 | «Guardar versión» con el mismo documento que la última versión no crea otra: responde «Sin cambios desde la última versión» | Evita duplicados |
| F-09 | Restaurar guarda antes el contenido actual como versión, si difiere de la última | Restaurar nunca pierde lo actual |
| F-10 | La comparación es por líneas de texto plano (un bloque o ítem de lista por línea), con un LCS propio, sin dependencias nuevas | Alcanza para notas de hasta 2.000 bloques |
| F-11 | «Abrir en pestaña» desde Historial abre la versión en una pestaña de solo lectura, marcada «Versión del …», que no se guarda en `localStorage` | Consulta sin tocar la nota |

## Criterios de aceptación

| ID | Dado / cuando / entonces | Nivel de prueba | Archivo de test | Tarea |
|---|---|---|---|---|
| AC-01 | Dado un documento con separador, enlace, referencia, negrita, títulos, listas, casillas y código, cuando se guarda una nota, entonces se acepta; un nodo o marca desconocidos, un href no HTTP(S) o un exceso de límites devuelven 400 sin cambios | unit + IT | `FreeNoteDocumentTest`, `FreeNoteApiIT` | T-101 |
| AC-02 | Todo documento válido de Diario (fixtures de `DailyContentTest`) y de Libres es válido como nota sin transformarlo | unit | `FreeNoteDocumentTest` | T-101 |
| AC-03 | Guardar versión crea una copia independiente; con el mismo documento que la última, responde sin crear otra; con una revisión vieja, 409 | IT | `NoteVersionApiIT` | T-102 |
| AC-04 | La lista muestra solo versiones del dueño y del espacio; otro dueño o espacio recibe 404 en el detalle y en restaurar | IT | `NoteVersionApiIT` | T-102 |
| AC-05 | Una versión con más de 15 días que no es la última de su nota desaparece de la lista y la limpieza la borra; la última de cada nota se conserva aunque sea vieja; la 31.ª versión borra la más vieja | IT | `NoteVersionRetentionIT` | T-102 |
| AC-06 | Restaurar guarda el contenido actual como versión si difiere de la última, reemplaza el documento y sube la revisión; borrar la nota borra sus versiones | IT | `NoteVersionApiIT` | T-102 |
| AC-07 | En Libres, el editor único numera cada bloque e ítem, y la barra de íconos aplica cada formato con su atajo y su `aria-pressed` | componente + E2E | `NoteEditor.test.tsx`, `notes-editor.spec.ts` | T-103 |
| AC-08 | V12 elimina `daily_version` y `daily_note`; todas las migraciones corren desde una base vacía y las notas, versiones y demás tablas siguen intactas | IT | `DailyTablesDropMigrationIT` | T-108 |
| AC-09 | En escritorio, crear con título, renombrar, cerrar con ×, reabrir desde «Todas las notas», recargar y recuperar las pestañas, eliminar con confirmación y guardar versión con Ctrl+S | componente + E2E | `NotesWorkspace.test.tsx`, `notes-tabs.spec.ts` | T-104 |
| AC-10 | `/notes/2026-11-20` y `/free-notes/:id` redirigen a Notas sin error y la barra superior sigue D-05 | componente | `AppRoutes.test.tsx` | T-104 |
| AC-11 | Historial lista por día, filtra por nota, compara con la actual, copia, abre en pestaña de solo lectura y restaura con confirmación | componente + E2E | `NoteHistoryPage.test.tsx`, `note-history.spec.ts` | T-105 |
| AC-12 | La lectura lateral y la IA usan notas y versiones; ya no existen rutas, botones ni llamadas al Diario por fecha | componente + E2E | `ReadingSelector.test.tsx`, `side-reading.spec.ts`, `ai-workspace.spec.ts` | T-106 |
| AC-13 | Con 375 px: pestañas deslizables, panel «Todas las notas», barra de 44 px abajo y pegada al teclado, navegación inferior oculta mientras se escribe y confirmación de borrado | componente + E2E móvil | `NotesWorkspace.mobile.test.tsx`, `notes-tabs.spec.ts` | T-107 |
| AC-14 | El XLSX v5 exporta notas actuales sin versiones ni diarias e importa v5; un archivo v1–v4 se rechaza con `IMPORT_UNSUPPORTED_FORMAT` y el mensaje «Este respaldo es de una versión anterior. Exportá de nuevo desde DevNotes.» | unit + IT + E2E | `XlsxNotesV5RoundTripTest`, `PortabilityNotesV5ApiIT`, `portability.spec.ts` | T-108 |

## Contrato backend

Todas las rutas exigen sesión y CSRF en las escrituras. `{space}` es `work` o `personal`. Un recurso de otro dueño o de otro espacio responde 404 sin revelar que existe. Los errores siguen el `ProblemDetail` de `FreeNoteController`.

### Documento de nota (T-101)

`FreeNoteDocument` acepta la unión de los formatos actuales:

- Bloques de primer nivel: `paragraph`, `heading` (`level` 1–3), `bulletList`, `orderedList` (`start` ≥ 1), `taskList` (`checked` booleano), `codeBlock` (`language` `json`, `sql` o `text`) y `separator` (`width` 25, 50, 75 o 100).
- En línea, dentro de párrafos, títulos e ítems de lista: `text`, con marcas `bold` y `link` (`href` HTTP o HTTPS absoluto de hasta 2.048 caracteres, con las mismas reglas de `DailyContent`), y el átomo `reference` con los atributos actuales de Diario, solo en párrafos e ítems de lista. El código solo admite texto sin marcas.
- Límites: hasta 2.000 bloques de primer nivel, 100.000 puntos de código de texto, 100 referencias, 100.000 caracteres sumando los href y 1 MiB de JSON. Son los mayores de los dos formatos actuales.
- Las reglas de enlaces y referencias se extraen de `DailyContent` a una clase compartida del paquete `freenote.domain`; `DailyContent` las reutiliza mientras exista.

### Versiones (T-102)

Tabla `note_version` (Flyway V11, aditiva):

```sql
CREATE TABLE note_version (
    id UUID PRIMARY KEY CHECK (uuid_extract_version(id) IS NOT DISTINCT FROM 7),
    note_id UUID NOT NULL REFERENCES free_note(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES app_user(id),
    space VARCHAR(8) NOT NULL CHECK (space IN ('work', 'personal')),
    document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
    preview VARCHAR(120) NOT NULL,
    source_revision BIGINT NOT NULL CHECK (source_revision > 0),
    saved_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_note_version_owner_space_saved ON note_version (owner_id, space, saved_at DESC, id DESC);
CREATE INDEX idx_note_version_note_saved ON note_version (note_id, saved_at DESC, id DESC);
```

`preview` es el primer texto no vacío del documento, recortado a 120 caracteres, o «(vacía)».

| Método y ruta | Entrada | Respuesta |
|---|---|---|
| `POST /api/spaces/{space}/free-notes/{id}/versions` | `{"expectedRevision": 7}` | 201 con la versión creada; 200 con la última y `"created": false` si el documento es igual (F-08); 409 si la revisión no coincide; 404 si la nota no existe para ese dueño y espacio |
| `GET /api/spaces/{space}/note-versions?noteId=&cursor=&limit=` | `limit` 1–100, por defecto 50; `cursor` opaco | 200 `{"items": [...], "nextCursor": null}`, por `saved_at` y `id` descendentes, sin versiones vencidas |
| `GET /api/spaces/{space}/note-versions/{versionId}` | — | 200 con `document`; 404 si está vencida o es ajena |
| `POST /api/spaces/{space}/note-versions/{versionId}/restore` | `{"expectedRevision": 9}` | 200 con la nota actualizada (`revision` + 1); 409 si la revisión no coincide |

Ítem de la lista (ejemplo ficticio):

```json
{
  "id": "0193a0f2-7c1e-7b3a-9d2f-1a2b3c4d5e6f",
  "noteId": "0193a0f2-0000-7aaa-8bbb-000000000001",
  "noteTitle": "Comandos",
  "savedAt": "2026-11-27T21:05:00Z",
  "expiresAt": "2026-12-12T21:05:00Z",
  "latest": false,
  "preview": "Comandos frecuentes"
}
```

`latest` es la última versión de su nota y, en ese caso, `expiresAt` vale `null`. Las demás vencen a `savedAt + 15 días`. Una versión vencida no se muestra aunque la limpieza todavía no haya corrido.

Retención: `NoteVersionRetention` borra en una sentencia las versiones con `saved_at < now() - 15 días` que no son la última de su nota. Corre con `@Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT2M")` y además, para esa nota, al guardar una versión. Render Free duerme, así que la limpieza no depende de una hora fija. Al guardar la 31.ª versión de una nota se borra la más vieja (F-07).

Restaurar (F-09), en una transacción: bloquea la nota; si la revisión no coincide, 409; si el documento actual difiere de la última versión, lo guarda como versión; copia el documento de la versión a la nota y sube la revisión. Borrar una nota borra sus versiones por `ON DELETE CASCADE`.

### Sin migración del Diario (F-02)

No hay conversión de datos. Desde el corte de T-104 la interfaz deja de leer y escribir notas diarias; las filas que existan quedan sin uso hasta que T-108 elimina las tablas.

### Retiro del Diario (T-106 y T-108)

T-106 elimina `DailyNoteController`, `DailyVersionController`, `CopyPreviousDailyNoteService`, sus servicios y sus pruebas. `/api/v1/daily-notes/**` y `/api/v1/daily-versions/**` pasan a responder 404. Las entidades y repositorios quedan mientras la exportación los lea.

T-108 retira la lectura de Diario en la portabilidad. Borra `DailyNote`, `DailyVersion`, sus repositorios y `DailyContent` (las reglas compartidas viven en `NoteInlineRules`). Agrega Flyway `V12__drop_daily_notes.sql`:

```sql
DROP TABLE daily_version;
DROP TABLE daily_note;
```

Es la única migración no aditiva de la iteración, autorizada por F-02. Las pruebas comprueban que V1 a V12 corren desde una base vacía.

### XLSX v5 (T-108)

Hojas `devnotes`, `referencias`, `voz`, `imagen_textos` y `notas`. `notas` usa las columnas actuales de `notas_libres` más `espacio`. No hay hojas `diarias` ni `versiones`. La importación exige, como hoy, una cuenta vacía, y solo acepta v5. Un archivo v1–v4 responde `IMPORT_UNSUPPORTED_FORMAT` con «Este respaldo es de una versión anterior. Exportá de nuevo desde DevNotes.».

## Frontend

### Rutas

| Ruta | Comportamiento |
|---|---|
| `/notes` | Espacio de pestañas. Abre la pestaña activa guardada o, si no hay ninguna, la nota editada más recientemente. Sin notas, ofrece «Crear la primera nota» |
| `/notes/:id` | Abre o activa la pestaña de esa nota. Un id inexistente cierra la pestaña y anuncia «La nota ya no existe» |
| `/notes/:fecha` (formato `AAAA-MM-DD`), `/free-notes`, `/free-notes/:id` | Redirigen con `replace` a `/notes` o a `/notes/:id` |
| `/history` | Historial general. `/history/:fecha` redirige a `/history` |

Las rutas conservan el prefijo de espacio de `useSpaceHref`. Demo sigue en `/demo`.

### Barra superior (D-05)

Se elimina el logo y la palabra DevNotes si aparecen. Escritorio (768 px o más): `SpaceSelector`, la navegación principal (Notas, Referencias, Voz, Imagen, Historial) y `DemoLink` justo después, como hoy. A la derecha siguen sin cambios el estado del servidor, IA y Cuenta. Teléfono: barra superior compacta con espacio, estado, Demo, IA y Cuenta; navegación principal inferior de cinco celdas.

### Pestañas (escritorio)

- Tira de 42 px debajo de la barra superior, con `role="tablist"` y `aria-label="Notas abiertas"`. Cada pestaña tiene `role="tab"`, el título truncado a 24 caracteres con tooltip y un botón × «Cerrar pestaña <título>». La activa lleva borde superior ámbar.
- El foco se mueve con ←/→ e Inicio/Fin; Supr cierra la pestaña con foco. Se puede reordenar arrastrando con el puntero y con Alt+←/→; el orden se guarda.
- Doble clic o F2 renombra en el lugar: un input de hasta 160 caracteres. Enter o perder el foco guardan; Esc cancela; un título vacío vuelve al anterior.
- «+» crea una nota «Sin título» con su pestaña y deja el título en edición. El POST usa el `attemptId` idempotente actual.
- «Todas las notas» (a la derecha de la tira) abre un panel: buscador «Buscar o crear nota…» que filtra por título, lista por última edición con «abierta» para las que tienen pestaña, y una papelera por nota. Enter sin coincidencias crea una nota con ese título. Ctrl+P abre el panel con el foco en el buscador. El panel pagina con el cursor actual («Cargar más»).
- Eliminar abre un `alertdialog`: «¿Eliminar «<título>»? Se borran la nota y sus versiones del historial. No se puede deshacer.», con Cancelar (foco inicial) y Eliminar. Si la nota tenía pestaña, la pestaña se cierra.
- Cerrar una pestaña primero completa el guardado pendiente. Si el guardado falla, pregunta «Hay cambios sin guardar» con Reintentar, Descartar o Cancelar.
- Más de 20 pestañas: F-06. Los títulos no son únicos: el panel muestra además la fecha de edición.

### Editor único (T-103)

Componente `NoteEditor` en `client/src/features/notes/editor/`, que reúne las extensiones de Diario (separador, enlace, referencia, pegado con límites, numeración) y de Libres (títulos, negrita, listas, código).

- **Numeración**: un número por párrafo, título, separador, bloque de código (uno por bloque) e ítem de lista, incluidos los anidados. Usa el contador CSS de `dailyEditor.css`.
- **Barra de íconos** (`role="toolbar"`, `aria-label="Herramientas del editor"`), en este orden:
  1. Grupo «Formato de bloque»: Párrafo (P, Ctrl+Alt+0), Título 1 (H1, Ctrl+Alt+1), Título 2 (H2, Ctrl+Alt+2) y Título 3 (H3, Ctrl+Alt+3).
  2. Negrita (B, Ctrl+B).
  3. Viñetas, Lista numerada y Casillas.
  4. Bloque de código: dentro de uno aparece un selector de lenguaje (`json`, `sql`, `text`).
  5. Enlace (Ctrl+K, con el `LinkDialog` y `normalizeLinkHref` actuales).
  6. Separador: inserta uno de 100 %; los atajos `---` siguen igual.
  7. Referencia (`ReferencePicker`).
  8. «Más herramientas» (⋯): Abrir al lado o Ver consulta (S-115), y las herramientas que hoy viven en el popover de Diario.
  9. A la derecha: estado de guardado, Copiar nota y «Guardar versión» (ámbar; con texto a 768 px o más, solo ícono por debajo).
- Cada botón tiene `aria-label`, tooltip con el nombre y el atajo, y `aria-pressed` cuando aplica. Miden 32 × 32 px con puntero fino y 44 × 44 px por debajo de 600 px o con puntero grueso. La barra pasa a dos líneas entre 600 y 1.099 px si no entra.
- Ctrl+S guarda una versión (`preventDefault`). El botón «Consultar IA» de S-116 se conserva.

### Historial (T-105)

- Aviso: «Las versiones se guardan 15 días y después se borran solas. La última versión de cada nota se conserva siempre. Exportar e importar llevan solo el contenido actual de cada nota.»
- Lista agrupada por día local (Hoy, Ayer, «14 nov»). Cada fila muestra hora, título actual de la nota, `preview` y una etiqueta: «Actual» si `latest`, «Se borra mañana» o «Se borra el 12 dic» según `expiresAt`, en ámbar cuando falta un día o menos.
- Filtro «Todas las notas ▾» (por `noteId`) y un buscador que filtra lo ya cargado por título y vista previa. «Cargar más» pagina.
- Detalle: «Cambios» (comparación F-10 contra el documento actual de la nota: líneas agregadas en verde con «+», quitadas en rojo con «−») o «Solo esta versión» (el editor en solo lectura). Acciones: «Restaurar como actual» (confirmación y luego `restore`), «Abrir en pestaña» (F-11) y «Copiar texto».
- En escritorio, lista y detalle van en dos columnas; por debajo de 768 px, la lista ocupa la pantalla y el detalle se abre en pantalla completa con «Volver».

### Teléfono (T-107; T-104 deja la base usable)

Por debajo de 600 px, según las maquetas 03 a 07:

- Barra superior de 48 px: espacio, estado de guardado, Demo, «Guardar versión» de solo ícono y ⋮ (Renombrar, Copiar nota, Eliminar…).
- Pestañas en una fila deslizable de 44 px, con la × solo en la activa, y a la derecha un botón fijo «☰ n» que abre «Todas las notas» como panel inferior (`role="dialog"`) con buscador, «Nueva» y un ⋮ por nota (Abrir, Renombrar, Ver versiones, Eliminar definitivamente).
- Barra de herramientas abajo, sobre la navegación inferior, deslizable de costado, con objetivos de 44 px y un degradado que indica que hay más.
- Con el teclado abierto (`visualViewport` más bajo que la ventana): se oculta la navegación inferior, la fila de pestañas se resume en «‹ Título · 2 de 4 ›» y la barra de herramientas queda pegada al teclado con un botón «Ocultar teclado». Se conserva la densidad compacta de S-117.
- Sin dos columnas en el teléfono; Historial abre el detalle en pantalla completa.

### Estados comunes

Cargando: esqueleto de la tira y del editor, sin saltos. Vacío: «Todavía no hay notas» con «Crear la primera nota». Error de red: `ErrorAlert` con Reintentar en una región viva y el borrador local intacto. 409: «La nota cambió en otro dispositivo» con «Recargar» y «Copiar mi texto». 404: cierre de la pestaña con aviso. Al cerrar sesión o cambiar de espacio se completan o descartan los guardados pendientes con la guardia actual de `SpaceNavigation` y `SessionControls`.

## Diferencias con las maquetas

- El pie de la maqueta 01 dice «Ctrl+W cierra pestaña» y «Línea 11, columna 1». No se implementan: el navegador reserva Ctrl+W y Ctrl+Tab. El pie muestra solo «Última versión guardada: <fecha>» y la ayuda «Ctrl+S guarda versión · Doble clic en la pestaña: renombrar».
- Las filas del Historial muestran `preview`, no resúmenes como «+3 bloques».
- La confirmación de borrado no cuenta las versiones («sus 4 versiones»).
- «Todas las notas · 9» muestra la cantidad solo cuando la lista está completa.
- En la maqueta 05 la nota de ejemplo se llama «Diario»: es una nota común.

## Datos y compatibilidad

- V11 (T-102) es aditiva. V12 (T-108) borra las tablas del Diario por F-02.
- No se exporta, migra ni recupera nada de la base actual. Al cerrar S-118, después del integrado final, el dueño borra la base de Render y crea una vacía. Desde ahí empieza el uso productivo.
- Las pruebas usan datos ficticios por caso y namespaces E2E propios.
- Reversión: hasta T-108 basta con revertir el merge, porque las tablas del Diario siguen en la base. Después de V12 no hay vuelta atrás para esos datos, y eso es aceptable por F-02.

## Fuera de alcance

- Migrar, exportar o recuperar datos de la base actual, e importar respaldos v1–v4.
- Sincronizar las pestañas abiertas entre dispositivos.
- Búsqueda de texto completo en el servidor sobre versiones.
- Menú `/`, barra flotante de formato y explorador lateral (propuestas B y C).
- Volver a grabar el tráiler y la demo narrada; la página Demo sigue igual.
- Nuevas fuentes de lectura lateral (Voz, Referencias, Imagen).

## Tareas y dependencias

| Tarea | Resultado observable | Depende de | Estado se consulta en | Salida para continuar |
|---|---|---|---|---|
| T-101 | Las notas aceptan separadores, enlaces, referencias y negrita | T-099 | [T-101](../tasks/T-101-unified-note-document.md) | AC-01, AC-02 y MERGED |
| T-102 | API de versiones con retención | T-101 | [T-102](../tasks/T-102-note-versions-api.md) | AC-03 a AC-06 y MERGED |
| T-103 | Editor único con barra de íconos en Libres | T-102 | [T-103](../tasks/T-103-unified-note-editor.md) | AC-07 y MERGED |
| T-104 | Corte: Notas en pestañas y Guardar versión | T-103 | [T-104](../tasks/T-104-notes-tabs-cutover.md) | AC-09, AC-10 y MERGED |
| T-105 | Historial general | T-104 | [T-105](../tasks/T-105-general-history.md) | AC-11 y MERGED |
| T-106 | Lectura lateral e IA sobre notas; retiro del Diario | T-105 | [T-106](../tasks/T-106-retire-daily.md) | AC-12 y MERGED |
| T-107 | Notas en el teléfono | T-106 | [T-107](../tasks/T-107-mobile-notes.md) | AC-13 y MERGED |
| T-108 | XLSX v5 sin historial y tablas del Diario eliminadas | T-107 | [T-108](../tasks/T-108-xlsx-v5.md) | AC-08, AC-14 y MERGED; vuelve a frontera para el integrado final |

WIP1. T-101 queda `ready` y las demás `draft` hasta que se mergee la anterior. T-104 es la única que cambia de golpe lo que ve el dueño: las pestañas, el editor y Guardar versión llegan en un solo despliegue.

Cierre (orden del dueño del 2026-11-28): al mergear T-108, una sesión de frontera corre FULL y STARTER sobre `main` y corrige los fallos en una tarea de ajuste con su PR y revisión independiente. Después, el dueño recrea la base vacía.

## Validación de planificación

Frontera planner, Claude Code (Opus 5.5), 2026-11-28, sobre `origin/main` `bfd76c2`. El dueño aprobó la propuesta A con sus ajustes (D-01 a D-09) en la misma sesión, después de revisar el lienzo. Las decisiones F-01 a F-11 son propuestas de frontera y el dueño puede cambiarlas. Versión 2, del mismo día: el dueño descarta la migración de datos (F-02) y ordena correr FULL/STARTER una sola vez, al terminar T-108. Hasta entonces, cada tarea registra `FULL/STARTER: DIFERIDO POR EL DUEÑO`.
