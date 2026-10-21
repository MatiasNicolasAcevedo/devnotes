---
id: S-101
status: approved
version: 1
milestone: M1
tasks: [T-001, T-002, T-003, T-004, T-005, T-006, T-007]
---
# S-101 · Notas diarias privadas y editor

## Iteración y objetivo de salida

I1 / MVP local completo. Esta capacidad permite editar y recuperar una nota por propietario/fecha. Se integra con S-102, S-103 y S-104; el retorno a frontera ocurre tras T-014 mergeada con CA-01…06 demostrados o ante decisión fuera de contrato. Approved significa contrato técnico alineado al contexto aceptado, no implementación ni aceptación técnica.

## Reglas del documento v1

JSON persistido y transmitido, sin HTML ni contenido arbitrario:
```json
{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"1279","marks":[{"type":"link","attrs":{"href":"https://jira.ejemplo.test/browse/ABC-1279"}}]}]},{"type":"separator","attrs":{"width":50}},{"type":"paragraph"}]}
```

- Raíz exacta type=doc y content: 1…2000 bloques. Solo paragraph o separator en nivel superior. El vacío canónico es `{"type":"doc","content":[{"type":"paragraph"}]}`.
- Paragraph sin attrs/marks; content omitido, [] o lista de text. Text no vacío, sin CR/LF; campos type/text y marks opcional. Texto conserva espacios; cada salto es otro paragraph, incluso vacío. No hardBreak, listas, imágenes, estilos ni HTML.
- Marks omitido/[] o exactamente un link con attrs.href string; sin otros atributos. Separator tiene solo type y attrs.width numérico entero 25/50/75/100; sin hijos ni marcas.
- Rechazar campos/nodos/marcas desconocidos, null, estructura anidada, versión de formato incompatible. Máximo 100000 unidades UTF-16 de texto agregado y 2048 por href; cada href HTTP/HTTPS absoluto, host no vacío, sin espacios/controles ni credenciales. Misma validación en Java y TS con fixtures equivalentes. No convertir URL a otra ni consultar destino.
- Validar el árbol antes de guardar; error no muta DB/documento. Server es autoridad; serializar JSON estructurado, nunca renderizar HTML del servidor. PostgreSQL JSONB, DTOs separados de entidades.
- Por línea lógica se entiende cada bloque superior. Enter divide paragraph; Shift+Enter también crea paragraph, sin hardBreak. Pegar texto plano conserva líneas vacías y espacios; pegar HTML lo trata como texto, sin importar marcas/nodos.
- Documento vacío sigue teniendo una línea. Borrar todo produce el vacío canónico. Undo/redo dentro del editor; sin historial remoto adicional. Límites muestran error y conservan la última edición para corregir, sin enviar contenido inválido.

## Datos y concurrencia

Feature `daily/` bajo com.example.devnotes, separando domain/application/persistence/web. V1 y V2 inmutables, se conserva referencia y su tabla en I1; no ejecutar migración destructiva. Nueva `V3__create_daily_note.sql`:

`daily_note(id UUID PK, owner_id UUID NOT NULL REFERENCES app_user(id), note_date DATE NOT NULL, content JSONB NOT NULL, revision BIGINT NOT NULL CHECK(revision>=1), created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL, UNIQUE(owner_id,note_date))`. Índice único soporta consultas por dueño/fecha; FK sin cascada, check jsonb_typeof(content)='object'. UUIDv7, Clock UTC truncado a micros. Fecha de API ISO estricta 0001-01-01…9999-12-31; nunca timestamp ni conversión timezone.

Guardar con revisión esperada: primera escritura expectedRevision=0 inserta revision=1; siguientes usan compare-and-set atómico por dueño/fecha/revisión e incrementan en uno. Una carrera de creación o CAS=0 devuelve 409 sin sobrescribir. No capturar constraint y continuar una transacción PostgreSQL abortada: insert on conflict do nothing + lectura/operación acotada, o transacción separada; probar carrera con dos transacciones reales. No tomar propietario del body ni consultar existencia global.

## API

Prefijo `/api/v1/daily-notes`; no endpoints por ID ni delete en I1.

| Método/ruta | Entrada | Respuesta |
|---|---|---|
| GET colección | page entero >=0 por defecto 0, size fijo 20 (otro valor 400); offset long | 200 {content:[{date,updatedAt,revision}],page,size,totalElements,totalPages}, solo propias, orden date DESC |
| GET /{date} | fecha estricta | 200 {id,date,content,revision,updatedAt}; propia ausente 404 |
| PUT /{date} | {content,expectedRevision} exacto, revisión entera >=0 | 200 representación guardada; crea solo con revisión 0, actualiza con revisión vigente |

401 sin sesión; mutaciones 403 sin CSRF; fecha/body inválido 400 ProblemDetail; conflicto 409 con mensaje seguro y sin contenido ajeno; ajeno/ausente indistinguibles en consultas por dueño. En el recurso por fecha cada cuenta ve su propio espacio: A no puede seleccionar dueño B. Campos owner/id/date del body y claves extra rechazados. SecurityConfig abre solo GET colección/recurso y PUT recurso exactos. PATCH/POST/DELETE y rutas vecinas siguen denegadas. OpenAPI documenta DTOs y sesión+CSRF para PUT; Swagger sigue GET-only.

## Frontend y editor

Ruta `/notes` resuelve hoy local a `/notes/YYYY-MM-DD`; no usar toISOString para calendario. Ruta con fecha inválida muestra error sin petición. Tras T-007, home autenticado ofrece entrada Notas y shell enlaza Notas; se conserva system/readiness, login, logout y referencia accesible como ejemplo técnico en /reference. No retirar suites ni migraciones de referencia en I1.

Tiptap OSS 3.32.0, React19 compatible según peerDependencies consultadas en npm el 2026-10-20. Paquetes exactos @tiptap/core, @tiptap/react, @tiptap/pm, @tiptap/extension-document, @tiptap/extension-paragraph, @tiptap/extension-text, @tiptap/extensions y @tiptap/extension-link todos 3.32.0. @fontsource/roboto-mono 5.3.0, fuente local, sin Google Fonts/red. Instalar solo en T-005 con npm --save-exact; lock e inventario actualizados sin cambiar versiones existentes. No StarterKit con formatos extra ni módulos cloud. Document extiende content a (paragraph|separator)+; UndoRedo de extensions, nodo separator propio, Link en T-009. Antes de T-008 el nodo separator ya puede renderizar roundtrip pero no tiene comandos. Antes de T-009 Link deshabilitado; no generar marcas desconocidas.

Tema oscuro único MUI, Roboto Mono solo área de notas, español, navegación accesible 1280/375. Numeración mediante CSS counter por bloque con gutter no editable aria-hidden y padding; número asociado al bloque, por lo tanto wrap no desalineado. No calcular por altura ni por saltos visuales. Editor con label accesible, foco visible, aria-multiline; no dangerouslySetInnerHTML. Versión readonly reutiliza el mismo renderer sin controles de edición.

## Guardado y estados

Query keys privadas incluyen identidad+fecha, HTTP/CSRF/guardia de sesión existentes; limpiar al logout/cambio de identidad. No localStorage/sessionStorage/IndexedDB ni cache persistente del texto. Borrador transitorio en memoria del editor por identidad/fecha; no duplica cache remota como segundo store.

Debounce 700 ms tras última edición válida, cola serial **una escritura en vuelo por documento**. Capturar snapshot+generación local; confirmación solo marca guardada esa generación. Si hubo ediciones posteriores, enviar la última usando revisión confirmada; respuestas viejas nunca sustituyen texto ni notifican otra identidad. Mutaciones invalidan Query, no setQueryData. Refetch no sobrescribe borrador dirty. Sin retries de mutación automáticos; error retiene borrador y ofrece Reintentar. 409 detiene cola, avisa conflicto y ofrece recargar previa confirmación de descarte; nunca overwrite silencioso. 401 limpia datos por canal existente; 403/CSRF requiere acción nueva.

Fecha sin nota: GET 404 se interpreta vacío+revision0 sin PUT automático; listar no incluye hasta primera escritura. Fecha cambiada/seleccionada: flush del borrador actual antes de navegar; fallo mantiene fecha/editor; doble navegación bloqueada mientras flush. beforeunload advierte dirty/pending (navegador decide texto); una pestaña cerrada a la fuerza no acredita guardado. Indicadores Cargando, Sin notas, Sin guardar, Guardando, Guardado, Error con reintento, Conflicto. Solo Guardado después del ACK de la última generación. Selector fecha y listado paginado de fechas existentes, no búsqueda avanzada.

## Aceptación trazada

| ID | Dado / cuando / entonces | CA | Prueba/archivo | Tarea |
|---|---|---|---|---|
| N-01 | Árbol permitido roundtrip; script/HTML/nodos extras rechazados sin mutación | 05 | DailyContentTest.java | T-001 |
| N-02 | V1+V2→V3 y DB vacía conservan referencia/identidad; unicidad y dueño en PostgreSQL | 06 | DailyNoteRepositoryIT.java | T-002 |
| N-03 | Dos escritores misma revisión: uno guarda, otro 409; otro dueño no altera nota | 05/06 | DailyNoteServiceIT.java | T-003 |
| N-04 | HTTP fechas, paginación, 401/403/CSRF/400/409 y vecinos denegados | 05/06 | DailyNoteApiIT.java | T-004 |
| N-05 | Enter/pegar/vacío/wrap/gutter conservan líneas y JSON | 01 | DailyEditor.test.tsx, dailyDocument.test.ts | T-005 |
| N-06 | ACK tardío/edición en vuelo/cambio identidad no pierden texto ni escriben cache ajena | 05/06 | useDailyNote.test.tsx | T-006 |
| N-07 | Fecha local, navegación con flush, error/409 retienen borrador, recarga recupera nota | 01/05 | DailyNotesPage.test.tsx | T-007 |

## Tareas y dependencias

T-001 → T-002 → T-003 → T-004 → T-005 → T-006 → T-007, cada una con contrato en docs/tasks y MERGED como dependencia de la siguiente. T-001 espera adopción T-000 revisada/mergeada y capacidad Junie comprobada. T-005 agrega dependencias/config y exige perfil STARTER; las demás APPLICATION salvo que el diff completo diga otro perfil. Backend dominio nuevo debe quedar cubierto por mínimos 80/70 sin reducir referencia; ajustar reglas en T-003 y client en T-006, lo cual también exige STARTER cuando cambia POM/Vite.

## Fuentes de la decisión

Planificación frontera/Codex, 2026-10-20, contrato v1 sobre contexto aceptado. Documentación oficial consultada mediante Context7/web: [React](https://tiptap.dev/docs/editor/getting-started/install/react), [schema](https://tiptap.dev/docs/editor/core-concepts/schema), [nodos](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/node). La integración y peerDependencies consultadas orientan la elección; compatibilidad ejecutada se prueba en T-005. No es evidencia de herramientas Junie.
