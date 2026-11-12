# Expansión seleccionada después de I5

Pedido del dueño del 2026-11-12, añadido al mismo PR55/T-052. Estas siete ideas del catálogo de 50 quedan **seleccionadas para más adelante**, después de T-067 y del cierre de la iteración actual. No son tareas ready ni amplían S-109…S-111. Frontera deberá convertirlas en specs y tareas pequeñas en una sesión posterior; no iniciar implementación automáticamente. El orden de abajo agrupa capacidades, no fija una fecha de entrega.

## 2 · Notas libres con título

Crear documentos como «Ideas para DevNotes», «Lista de compras» o «Viaje», sin fecha diaria obligatoria. Cada nota pertenece a Trabajo o Personal y tiene título editable, contenido y fechas de creación/actualización. Propuesta: listado sencillo por última modificación con acción «Nueva nota», sin categorías ni carpetas inicialmente. Complementa al diario, que conserva su funcionamiento.

## 16 · Listas simples dentro de las notas libres

Menú «Lista» con tres opciones: viñetas, casillas y numerada. La numerada sirve para pasos con orden; es una propuesta adicional a las dos pedidas. Aplicar a la línea o selección, cambiar de tipo o elegir «Sin lista» conservando el texto. Enter continúa la lista y Enter sobre un elemento vacío vuelve al párrafo; casillas operables también con teclado y táctil. Al quitar casillas se conserva el texto y se elimina el estado marcado, con deshacer disponible. Primera entrega sin listas anidadas ni gestor de tareas separado.

## 21 · Bloques de código JSON, SQL y TXT

Un botón «Bloque de código» abre la selección JSON / SQL / TXT. Bloque monoespaciado con etiqueta de lenguaje y «Copiar código», que copia únicamente su contenido. JSON y SQL ofrecen resaltado; TXT conserva texto sin coloreado. Cambiar el lenguaje no modifica el contenido, tampoco formatea ni ejecuta comandos. Conservar espacios y saltos, permitir salir del bloque y volver a párrafo. Propuesta inicial dentro de notas libres; extensión al diario requiere revisar su contrato de editor y respaldos.

## 22 · Formato compacto de escritura

Tres niveles de título discretos, negrita y listas compartidas con la idea 16. Propuesta visual para texto base de 16 px: títulos de 20, 18 y 16 px con peso diferenciado, sin grandes márgenes. Los niveles mantienen semántica accesible aunque sean pequeños. Recomendar tachado en la primera versión para contenido descartado; subrayado queda opcional por decidir al especificar, evitando confundirlo con enlaces. Un menú compacto «Formato» permite volver a párrafo y quitar formato sin borrar texto. Validar tamaños reales en Android y Windows antes de fijar tokens finales.

## 9 · Búsqueda unificada con resultados por tipo

Un campo «Buscar» consulta notas diarias, notas libres, texto transcrito y referencias. Debajo, mostrar un resumen de coincidencias por tipo y grupos de resultados: título o fecha, fragmento coincidente resaltado, tipo y espacio. Ejemplo ilustrativo para «deploy»:

```text
Buscar: deploy                   Espacio: Trabajo
Todos (8)  Diarias (3)  Libres (2)  Voz (2)  Referencias (1)
Notas diarias · 3 resultados
  12/11/2026 — Revisar el deploy antes de…
Notas libres · 2 resultados
  Checklist del servicio — Pasos del deploy…
Voz · 2 resultados
  Reunión del jueves — Acordamos el deploy…
Referencias · 1 resultado
  Guía de despliegue — …
```

Recomendación: hasta tres resultados iniciales por grupo y «Ver todos» para ese tipo; los contadores cuentan documentos, no ocurrencias de la palabra. Pulsar un tipo filtra sin perder la consulta. Filtros de fecha y espacio secundarios; búsqueda inicial en el espacio activo, con alcance siempre visible y opción explícita «Ambos espacios». Nunca mezclar silenciosamente Trabajo y Personal. Mostrar espacio en cada resultado al buscar ambos; abrir otro espacio respeta la guardia de cambios pendientes. Volver conserva consulta/filtros/posición. Estados de carga, error y cero resultados deben distinguirse; una búsqueda incompleta no debe parecer un cero definitivo.

La visibilidad del campo y del alcance se apoya en [NN/g: Search, Visible and Simple](https://www.nngroup.com/articles/search-visible-and-simple/) (consulta 2026-11-12). Agrupación, contadores y alcance inicial por espacio son propuestas específicas de DevNotes, pendientes de validar con el dueño. No incluir versiones históricas duplicadas, audio sin transcribir ni búsqueda semántica/IA inicialmente.

## 24 · Panel de consulta en paralelo para Windows

Recomendación: botón **«Abrir al lado»** que activa un panel secundario dentro de la misma aplicación. La nota actual permanece editable a la izquierda; a la derecha se consulta otra fecha, nota libre, transcripción o referencia del mismo espacio. Una sola barra global evita duplicar navegación y estados. Primera versión con derecha de solo lectura, scroll independiente y encabezado que identifica tipo/título/fecha.

```text
Trabajo                navegación habitual
Nota actual · editable       | Consulta · 11/11/2026  [Cambiar] [Cerrar]
                             | Nota / Voz / Referencia
```

Divisor ajustable; propuesta inicial 60/40 y ancho útil mínimo de 1100 px, a validar. Se aprovecha la ventana maximizada sin forzar pantalla completa del navegador. «Cerrar consulta» devuelve el editor a todo el ancho conservando cursor, scroll y borrador. Cambiar de espacio limpia el panel tras resolver el guardado; no presenta contenido del espacio anterior. En móvil o al estrechar la ventana, suspender la vista paralela, conservar el destino de consulta en memoria y permitir abrirlo con navegación habitual; no comprimir dos columnas. Edición simultánea, paneles entre espacios y sincronización entre ventanas quedan fuera de la primera versión.

## 34 · Reutilizar una transcripción

Después de transcribir o al abrir una transcripción guardada: «Añadir al diario», «Crear nota libre» o «Agregar a una nota existente». Elegir destino dentro del espacio activo, previsualizar texto y ubicación y confirmar. Diario permite elegir fecha; nota existente identifica título/fecha. Añadir al final con separación clara, conservando texto previo y transcripción original. Primera versión reutiliza texto sin resumirlo ni transformarlo con IA. Evitar doble envío y duplicados ante respuesta perdida; un conflicto obliga a revisar el destino antes de reintentar. Las reglas exactas de concurrencia y recuperación se fijan en la spec futura.

## Secuencia sugerida y trabajo previo

Después de I5: notas libres → listas/formato/bloques → búsqueda unificada → panel de consulta → reutilización de transcripciones. Es una recomendación de planificación, modificable con el dueño; la reutilización puede adelantarse una vez existan los destinos. No hay nueva tarea ni dependencia que bloquee T-053…T-067.

Antes de implementar: concretar ubicación de Notas libres en la navegación sin sumar botones pequeños, esquema de contenido y migración, exportación/importación compatible, búsqueda e índices, guardado seguro, autorización por propietario/espacio y pruebas dirigidas. Conservar documentos y respaldos anteriores. No asumir que los nodos de listas/títulos/código ya están admitidos por el editor actual. La excepción de FULL/STARTER de I5 no se extiende automáticamente a una iteración futura: aplicar la política vigente y las instrucciones del dueño al planificarla.
