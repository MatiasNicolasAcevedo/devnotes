---
id: S-106
status: approved
version: 1
milestone: M1
tasks: [T-022, T-023, T-024, T-025, T-026]
---
# S-106 · Referencias desde notas y copiado

## Objetivo de iteración

Encontrar referencias privadas con `@` en una nota, insertar y volver a consultar una vinculación persistente, acceder a su vista previa con mouse, teclado y táctil y copiar título, descripción o nota. El recorrido completo debe sobrevivir recarga y preservar privacidad e historial. La lista independiente de referencias y las operaciones de selección/Ctrl+C siguen disponibles. Después del recorrido completo revisado y mergeado, Junie controla el avance y vuelve a frontera; voz queda posterior. La intención registrada en BACKLOG no acredita implementación ni aceptación.

## Búsqueda contratada para T-022

Ampliar únicamente GET `/api/v1/reference-items` con `q` opcional. Ausente o vacío tras trim conserva exactamente el listado existente; si no vacío, máximo 120 unidades UTF-16 tras trim, coincidencia literal de subcadena en título sin distinguir mayúsculas/minúsculas según `lower` de PostgreSQL, sin prometer equivalencia de acentos. `%`, `_` y el carácter de escape son literales, no comodines. Filtrar por `owner_id` en consulta y conteo antes de paginar; mantener orden, DTO, límites y no-store de S-003. Parámetro excesivo devuelve 400 seguro, sin eco. Descripciones no participan en búsqueda; títulos duplicados son resultados distintos por ID. No ampliar métodos ni rutas de seguridad. Los resultados y conteos de otra cuenta nunca se exponen. Las peticiones y respuestas siguen la política de sesión y limpieza de S-003.

## Vinculación y contenido vigente

Decisión del dueño 2026-10-28: tanto la nota como sus versiones históricas muestran los cambios de la referencia original; si se borra indican «Referencia no disponible». Esta decisión reemplaza la respuesta anterior sobre copia inmutable. La versión conserva la vinculación guardada, no el título ni descripción históricos: mostrar contenido actual no modifica el JSON guardado ni su timestamp. Borrar la referencia no borra ni cambia notas/versiones y no bloquea el borrado; borrar el átomo solo desvincula esa aparición. Reinsertar crea otra vinculación; no hay navegación automática al original.

Extensión compatible de S-101: en `paragraph.content` se permite el átomo inline `{"type":"reference","attrs":{"id":"01900000-0000-7000-8000-000000000101"}}`. Solo type y attrs.id: UUID canónico minúsculo, sin hijos, texto, marcas ni campos adicionales. Máximo 100 átomos por documento, que además cuentan para el límite existente de 4000 nodos inline; texto ordinario, href y demás límites siguen iguales. Validar de igual modo en Java y TS; rechazar tipos, UUID, campos y límites inválidos sin mutación ni eco. Documentos previos siguen válidos, sin migración JSONB ni FK.

ID no es autorización: el servidor valida forma y autoriza la nota como antes, sin resolver IDs al guardar. La UI solo inserta ID de resultado propio de la sesión activa. Para presentar cada ID único usar GET existente `/api/v1/reference-items/{id}`, autorizado por dueño; nunca buscar por ID global. Un ID ajeno y uno ausente reciben el mismo 404 y la UI muestra «Referencia no disponible» sin dato previo. Sesión no autenticada sigue el flujo existente; 403 y error de red/5xx muestran error y reintento, no «no disponible». Nunca mostrar un resultado previo de otra identidad; queries privadas por identidad/ID, no-store, cancelación/limpieza al cambio de sesión, sin persistencia en almacenamiento de navegador. Respuestas tardías se descartan. No imprimir ni registrar texto privado.

En trabajo e historial se resuelve el mismo ID; cargar/reabrir y abrir vista previa vuelven a consultar el original; invalidar las queries después de mutaciones propias y al recuperar foco de ventana. Mostrar contenido vigente confirmado por servidor, no prometer actualizaciones instantáneas entre pestañas sin evento. Durante consulta mostrar «Cargando referencia» y, ante fallo, «No se pudo cargar» con reintento; 404 muestra «Referencia no disponible». Nunca sustituir el JSON guardado por los resultados ni disparar autosave por refresco. Guardado manual y reemplazo de versión conservan el JSON según S-104; una versión vieja sin átomos sigue legible. Duplicados del mismo ID comparten consulta. Renderizar texto como texto, nunca HTML.

## Selección y vista previa

En párrafo editable `@` al inicio o tras un espacio, con cursor sin selección, abre búsqueda; el texto posterior, incluidos espacios internos, hasta salto, Escape o selección es consulta (máximo 120 unidades); no activar dentro de enlace, composición IME ni texto pegado. `@` permanece texto normal al cancelar, sin resultados o ante error. Debounce 250 ms, primera página 20 y botón «Más resultados»; ignorar respuestas obsoletas al cerrar, cambiar consulta o identidad. Cargando, vacío y error con reintento son distintos. Mostrar duplicados con descripción y/o fecha. Flechas recorren opciones, Enter selecciona, Escape cierra; mouse y táctil también seleccionan. Insertar reemplaza solo `@consulta` y devuelve foco al editor; rango o sesión cambiados invalidan la selección. Átomo indivisible: borrar/undo/redo como unidad, sin interferir Ctrl+K, enlaces ni pegado de texto plano.

En la nota e historial el átomo disponible muestra `@` y título vigente. La vista previa muestra título y descripción actuales; descripción vacía se indica explícitamente. Hover abre y permite mover puntero al contenido; foco y Enter/Espacio abren; toque abre. Escape o botón Cerrar cierran; no cerrar al mover foco al contenido, devolverlo al disparador al cerrar con teclado. No depender de hover; vista sin desbordes a 375. Átomos indisponibles o fallidos siguen identificables y permiten reintentar cuando corresponda. Sin HTML crudo ni navegación externa.

## Copiado

T-023 copia título o descripción mostrados en la lista y nota actual sin referencias; `documentToPlainText` conserva un LF entre bloques, texto visible de enlace y línea vacía por separador, sin URL ni HTML. T-025 extiende la copia de nota y selección/Ctrl+C: átomo disponible aporta `@` y título vigente confirmado; 404 aporta `[Referencia no disponible]`. Mientras una referencia del documento esté cargando, revalidándose o tenga error de red/403, la acción de copiar toda la nota queda deshabilitada con explicación y reintento; Ctrl+C de selección conserva texto visible de estado, sin sustituirlo por datos anteriores. La nota no se modifica. No agregar botón de copia al historial. Clipboard API solo por acción; éxito tras resolución y error visible con selección manual. Sesiones tardías no filtran avisos o contenido.

## Salida y trazabilidad

T-022 búsqueda → T-023 copiado → T-024 validación backend → T-025 selección y resolución cliente → T-026 vista previa y recorrido real. Cada draft posterior espera únicamente el merge anterior; una tarea/PR a la vez. Tras T-026 MERGED y recorrido completo, control de cinco por Junie y retorno a frontera. Negativos de estructura y dos cuentas, persistencia/versión PostgreSQL/HTTP, componentes y Playwright real escritorio/móvil demuestran el contrato. FULL por cambio de aplicación; sin mockear API propia en E2E. Sin voz, colaboración ni servicio externo.
