# S-113 · Notas libres

Una persona crea y recupera notas por título dentro de Trabajo o Personal, sin fecha diaria ni carpetas. Diario e Historial conservan su propio flujo. [Diseño compartido](../design/WRITING-WORKSPACES.md).

## Almacenamiento y HTTP

- UUID v7, propietario derivado de sesión, espacio de `/api/spaces/{space}/free-notes`, título plano de 1 a 160 caracteres luego de recortar extremos, documento JSON, revisión desde 1, creación y actualización UTC. Títulos repetidos permitidos. Cambiar título mantiene el ID. Validación y tamaño de documento en servidor y cliente según S-114.
- Listar paginado por `updatedAt DESC, id DESC`, 20 por página, cursor opaco acotado al espacio del request. Fila con ID, título, revisión y fecha. Abrir por UUID. Crear con UUID v7 de operación generado para el intento por el cliente, separado del ID persistente. Repetir misma operación y mismo cuerpo recupera el mismo resultado, incluido tras respuesta perdida. Reusar operación con otro contenido da 409. La garantía de idempotencia se documenta por 24 h y tolera borrado dentro de esa ventana mediante recibo mínimo sin copia del contenido. Usar el lock existente de cuenta para coordinar creación/borrado con la importación y manejar colisiones en DB.
- Actualizar título y documento juntos con revisión esperada. 409 si la revisión cambió, preservando borrador y ofreciendo abrir la versión reciente, con confirmación antes de descartar, y copiar el texto local. Borrar requiere revisión, confirmación y devuelve 204; 404 al consultar un recurso inexistente, ajeno o de otro espacio. Reutilizar OIDC, CSRF y ProblemDetail. Sin escritura por abrir la pantalla, listar o seleccionar una nota.
- El origen de verdad es PostgreSQL. XLSX v4 agrega `notas_libres` a v3. Cada registro conserva título, documento completo y fechas, además del espacio. El identificador se regenera y la revisión importada empieza en 1. El respaldo omite recibos de operación. Véase [portabilidad incremental](S-112-screenshot-ocr.md#portabilidad-incremental-de-imagen-y-libres).

## Interacción

- **Libres** aparece en la cabecera de Notas y comparte su selección en la navegación global. Ruta privada `/free-notes` y `/free-notes/:id`, con las convenciones vigentes de espacio y retorno. En el directorio, **Diario** devuelve a la última fecha del espacio, **Nueva nota** abre un borrador que empieza por el título y la fila entera abre la nota. En el editor, **Libres** vuelve al directorio. El directorio se pliega en estrecho mediante navegación de una columna. En esta entrega conserva una lista en su propia vista también en ancho. Mostrar fecha secundaria y acción de borrar con nombre contextual.
- Guardado explícito con acción visible **Guardar** y estado discreto. Ofrecer **Guardar**, **Descartar** o **Seguir editando** al salir de un borrador sucio por navegación, cuenta o espacio según guardias existentes. En casos de salida que el navegador no puede interceptar, usar la advertencia nativa que corresponda. Durante error o 409 mantener ambos campos, posición y revisión; no cambiar a la nota recién seleccionada hasta resolver la guardia. Al borrar con éxito volver al directorio y enfocar siguiente fila o Nueva nota.
- Vacío «Todavía no hay notas libres» y acción «Nueva nota». Edición con título y cuerpo apilados, sin barra global adicional. Líneas de texto largas se ajustan al ancho. El formato aparece de forma progresiva en [S-114](S-114-writing-editor.md).

## Entrega

T-078 expone el servicio de almacenamiento interno, T-079 integra XLSX v4 y T-080 habilita API y UI. Aceptación completa: crear, guardar, renombrar, reabrir luego de recargar, exportar/importar y borrar; distinguir Trabajo, Personal y dos identidades; mantener diario e historial funcionales, incluidos enlaces directos.
