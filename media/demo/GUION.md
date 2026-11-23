# Guion · DevNotes · recorrido completo

Generado con `node scripts/guion.mjs` desde [`script.json`](script.json), que es la fuente editable. Voz: Sofía (ElevenLabs, `h60rOzgfLmYsntfqgGu2`). Cada escena arranca con 0.6 s de acción antes de la voz y termina con su pausa. El tiempo previsto estima 14,5 caracteres por segundo. Las columnas finales salen del último montaje.

## C1 · Ingreso

Cuenta ficticia y espacios.

| ID | Ruta / estado inicial | Gesto | Diálogo | Resultado visible | Pausa | Previsto | Inicio final | Voz final |
|---|---|---|---|---|---|---|---|---|
| S01-bienvenida | /login sin sesión | Pantalla de ingreso quieta | Esto es DevNotes, un cuaderno de trabajo diario para quien programa. En esta demostración usamos una cuenta ficticia, con datos y proveedores de prueba. | Título «Ingresar a DevNotes» y botón «Continuar con Google» | 0.6 s | 11.7 s | 0:06 | 9.8 s |
| S02-ingreso | /login | Clic en «Continuar con Google»; el formulario del proveedor de prueba se corta del montaje | Tocás «Continuar con Google» y entrás. DevNotes no recibe tu contraseña y abre directo en Notas, en el día de hoy. | Notas diarias de hoy, vacía, con «Guardado» en la barra | 0.5 s | 9.0 s | 0:17 | 7.0 s |
| S03-navegacion | /notes de hoy | El cursor recorre Voz, Notas, Referencias, Imagen, Historial, el estado del servidor, IA y la cuenta | Arriba están los destinos: Voz, Notas, Referencias, Imagen e Historial. A la derecha, el estado del servidor, la IA y tu cuenta. | Cada destino resaltado al pasar | 0.4 s | 9.8 s | 0:25 | 9.7 s |
| S04-espacios | /notes de hoy en Trabajo | Abre «Espacio: Trabajo», elige Personal y vuelve a Trabajo | Todo vive en dos espacios: Trabajo y Personal. Cambiás con este selector, y cada espacio guarda sus propias notas. | El selector muestra Personal y luego Trabajo | 0.6 s | 9.1 s | 0:36 | 8.1 s |

## C2 · Diario

Escribir, enlazar, separar y versionar.

| ID | Ruta / estado inicial | Gesto | Diálogo | Resultado visible | Pausa | Previsto | Inicio final | Voz final |
|---|---|---|---|---|---|---|---|---|
| S05-fecha | /notes de hoy | Clic en el calendario y elección del día anterior | Empecemos por ayer. Con el calendario elegís cualquier día, y cada fecha tiene su propia nota diaria. | La barra muestra la fecha de ayer y el editor vacío | 0.4 s | 8.0 s | 0:50 | 6.2 s |
| S06-escribir | /notes de ayer | Escribe tres líneas | Escribís como en un editor de código: cada línea lleva su número, y el texto se guarda solo. Mirá el indicador: «Guardado». | Tres líneas numeradas y «Guardado» | 0.5 s | 9.6 s | 0:57 | 7.4 s |
| S07-enlace | /notes de ayer | Selecciona «1279», clic en «Enlace», escribe la URL y guarda | Para enlazar, seleccionás el texto y tocás «Enlace», o Control K. Pegás la dirección, y queda un enlace que se abre aparte. | «1279» subrayado como enlace | 0.5 s | 9.6 s | 1:07 | 8.4 s |
| S08-separador | /notes de ayer | Escribe --50 y Enter, luego --- y Enter | Para separar bloques, escribís dos guiones y un ancho, por ejemplo cincuenta, y al dar Enter aparece un separador. Con tres guiones ocupa todo el ancho. | Separador al 50 % y separador completo | 0.5 s | 11.6 s | 1:17 | 9.9 s |
| S09-version | /notes de ayer | Clic en «Guardar versión» | Al cerrar el día, «Guardar versión» deja una copia fija de la nota en el historial. | Aviso «Versión guardada correctamente.» | 0.6 s | 6.9 s | 1:28 | 5.0 s |
| S10-copiar-anterior | /notes de ayer | Clic en «Hoy» y luego en «Copiar nota anterior» | Volvés a hoy con «Hoy». La nota está vacía, y DevNotes ofrece copiar la nota anterior: un toque y tenés la base del día. | La nota de hoy con el contenido de ayer y «Guardado» | 0.5 s | 9.4 s | 1:34 | 8.0 s |
| S11-ajustar | /notes de hoy | Agrega una línea nueva y clic en «Copiar nota» | Ajustás lo que cambió, y con el botón de copiar llevás la nota entera al portapapeles, para pegarla en el chat del equipo. | Línea nueva numerada y aviso de copia | 0.5 s | 9.5 s | 1:43 | 6.6 s |
| S12-historial | /history | Clic en «Historial» y en la versión de ayer | En Historial están las versiones guardadas. Abrís una y la leés en modo de solo lectura, sin riesgo de cambiarla. | «Versión de solo lectura» con las líneas de ayer | 0.6 s | 9.0 s | 1:51 | 7.2 s |

## C3 · Referencias

Elementos propios y lectura al lado.

| ID | Ruta / estado inicial | Gesto | Diálogo | Resultado visible | Pausa | Previsto | Inicio final | Voz final |
|---|---|---|---|---|---|---|---|---|
| S13-referencia-crear | /reference | Clic en «Referencias», «Crear elemento», completa Título y Descripción y guarda | En Referencias guardás lo que consultás seguido: runbooks, comandos o enlaces. Creás un elemento con título y descripción. | El elemento aparece en la lista | 0.5 s | 9.5 s | 2:04 | 8.6 s |
| S14-referencia-acciones | /reference | El cursor recorre copiar título, copiar descripción, editar y eliminar; copia la descripción | Cada elemento se copia con un toque, y desde acá también lo editás o lo eliminás. | Aviso de copia | 0.4 s | 6.6 s | 2:14 | 4.8 s |
| S15-referencia-insertar | /notes de hoy | Escribe @, busca «Runbook», lo inserta y abre su vista previa | Desde la nota, escribís arroba y buscás la referencia. Queda insertada, y al tocarla ves su contenido sin salir de la nota. | Chip de la referencia y vista previa abierta | 0.5 s | 9.6 s | 2:20 | 7.5 s |
| S16-lectura-al-lado | /notes de hoy | «Herramientas», «Abrir al lado» y elige la versión de ayer | Y si necesitás leer otra nota mientras escribís, «Abrir al lado» la muestra junto al editor, en solo lectura. | La versión de ayer a la derecha y el editor de hoy a la izquierda | 0.6 s | 8.7 s | 2:29 | 7.0 s |

## C4 · Libres

Listas, títulos, negrita y código.

| ID | Ruta / estado inicial | Gesto | Diálogo | Resultado visible | Pausa | Previsto | Inicio final | Voz final |
|---|---|---|---|---|---|---|---|---|
| S17-libres-crear | /notes de hoy | Cierra la consulta, clic en «Libres» y «Nueva nota»; escribe título y líneas | Para lo que no pertenece a un día en particular están las notas Libres. Creás una nueva con título y contenido. | Editor de nota libre con título y tres líneas | 0.4 s | 8.7 s | 2:42 | 6.8 s |
| S18-libres-listas | /free-notes/new | Selecciona las líneas, «Lista», «Casillas» y tilda la primera | Con «Lista» convertís líneas en viñetas, en una lista numerada o en casillas que podés tildar. | Tres casillas, la primera tildada | 0.4 s | 7.5 s | 2:54 | 5.9 s |
| S19-libres-formato | /free-notes/new | Escribe un encabezado, «Formato», «Título 2» y negrita | «Formato» suma tres niveles de título y negrita, para ordenar las notas largas. | Título de nivel 2 con una palabra en negrita | 0.4 s | 6.4 s | 3:01 | 4.6 s |
| S20-libres-codigo | /free-notes/new | «Herramientas», «Bloque de código», «SQL», pega una consulta y clic en «Copiar código» | En «Herramientas» insertás bloques de código, con colores según el lenguaje, y los copiás con un solo botón. | Bloque SQL resaltado y aviso de copia | 0.5 s | 8.5 s | 3:06 | 5.9 s |
| S21-libres-guardar | /free-notes/new | «Guardar», vuelve a «Libres», abre el borrado y cancela | Guardás, y la nota aparece en la lista de Libres. Desde ahí la abrís, la editás o la borrás, siempre con confirmación. | Lista con la nota y diálogo «¿Borrar la nota libre?» cancelado | 0.5 s | 9.2 s | 3:13 | 7.0 s |

## C5 · Voz

Grabar, revisar y guardar.

| ID | Ruta / estado inicial | Gesto | Diálogo | Resultado visible | Pausa | Previsto | Inicio final | Voz final |
|---|---|---|---|---|---|---|---|---|
| S22-voz-grabar | /voice | Clic en «Voz», «Grabar», espera el contador y «Detener» | En Voz grabás una idea al vuelo. Tocás «Grabar», hablás, y al detener el audio se transcribe. | Contador, barras de nivel y luego el texto transcripto | 0.4 s | 7.4 s | 3:26 | 6.1 s |
| S23-voz-guardar | /voice | Agrega una línea al texto, «Copiar» y «Guardar» | El texto queda editable antes de guardarlo. Lo corregís, lo copiás si lo necesitás en otro lado, y con «Guardar» queda en tus notas de voz. | La nota aparece en «Notas guardadas» | 0.5 s | 10.7 s | 3:34 | 8.4 s |

## C6 · Imagen

De una captura a texto.

| ID | Ruta / estado inicial | Gesto | Diálogo | Resultado visible | Pausa | Previsto | Inicio final | Voz final |
|---|---|---|---|---|---|---|---|---|
| S24-imagen-extraer | /image | Clic en «Imagen», pega una captura y clic en «Extraer texto» | Con Imagen pasás una captura a texto. Pegás la imagen con Control V, revisás la vista previa y tocás «Extraer texto». | Vista previa y texto extraído | 0.4 s | 9.1 s | 3:48 | 8.0 s |
| S25-imagen-guardar | /image | Corrige el texto, «Copiar texto» y «Guardar» | El resultado se puede corregir, copiar y guardar. Los textos guardados quedan debajo, listos para copiar o borrar. | «Texto copiado» y el texto en «Textos guardados» | 0.5 s | 9.0 s | 3:57 | 6.8 s |

## C7 · IA

Proveedor, fragmento y respuesta.

| ID | Ruta / estado inicial | Gesto | Diálogo | Resultado visible | Pausa | Previsto | Inicio final | Voz final |
|---|---|---|---|---|---|---|---|---|
| S26-ia-selector | /image | Abre «Elegir proveedor y modelo», elige Cloudflare Workers AI y GPT OSS 120B y aplica | La IA usa proveedores gratuitos. En este selector elegís proveedor y modelo, ves el estado de cada uno y aplicás tu elección. | Diálogo «Proveedor y modelo» con el estado por modelo | 0.4 s | 9.6 s | 4:10 | 8.3 s |
| S27-ia-fragmento | /notes de hoy | Selecciona una línea de la nota y clic en «Consultar con IA» | Desde una nota, seleccionás un fragmento y tocás «Consultar con IA». Antes de enviar, ves exactamente qué vas a compartir. | Página IA con «Fragmento a compartir» | 0.4 s | 9.4 s | 4:19 | 7.0 s |
| S28-ia-enviar | /ai | Escribe el pedido, «Enviar» y «Copiar texto» sobre la respuesta | Escribís tu pedido, tocás «Enviar», y la respuesta aparece debajo, lista para copiar. Nada sale sin que lo confirmes. | Respuesta del proveedor de prueba y aviso de copia | 0.4 s | 9.1 s | 4:27 | 7.5 s |
| S29-ia-anadir | /ai | «Añadir fragmento», origen Libres, elige la nota y añade la selección | Con «Añadir fragmento» también traés texto de una nota guardada, del diario o de Libres. | El fragmento de la nota libre listo para compartir | 0.6 s | 7.3 s | 4:36 | 5.3 s |

## C8 · Respaldo

Exportar e importar en una cuenta vacía.

| ID | Ruta / estado inicial | Gesto | Diálogo | Resultado visible | Pausa | Previsto | Inicio final | Voz final |
|---|---|---|---|---|---|---|---|---|
| S30-exportar | /ai | Menú de la cuenta, «Datos de la cuenta» y «Descargar Excel» | Tus datos son tuyos. En el menú de la cuenta, «Datos de la cuenta» descarga un respaldo en Excel con los dos espacios. | «Descarga lista» con el nombre del archivo | 0.5 s | 9.2 s | 4:48 | 7.3 s |
| S31-otra-cuenta | /data | «Cerrar sesión» y entra otra cuenta ficticia vacía; el proveedor de prueba se corta del montaje | Ahora cerramos la sesión y entramos con otra cuenta ficticia, todavía vacía. | Notas de hoy vacía con la otra cuenta | 0.4 s | 6.2 s | 4:56 | 4.6 s |
| S32-importar-vista | /data de la cuenta vacía | «Datos de la cuenta» y elige el archivo descargado | En la cuenta nueva elegís el archivo, y DevNotes muestra qué contiene antes de escribir nada. | Región «Contenido del archivo» con totales por espacio | 0.5 s | 7.5 s | 5:02 | 5.6 s |
| S33-importar | /data | «Importar» y «Confirmar importación» | Confirmás, y se importa todo o nada: si algo falla, no queda nada a medias. | Importación terminada | 0.5 s | 6.3 s | 5:08 | 4.7 s |
| S34-recuperado | /notes de hoy | Recorre Notas, Libres, Voz, Imagen y Referencias | Y ahí está todo lo que creamos: la nota del día, la nota libre, la voz, el texto de la imagen y la referencia. | Cada pantalla con el contenido restaurado | 0.6 s | 8.8 s | 5:14 | 6.3 s |

## C9 · En el teléfono

La misma nota en pantalla angosta.

| ID | Ruta / estado inicial | Gesto | Diálogo | Resultado visible | Pausa | Previsto | Inicio final | Voz final |
|---|---|---|---|---|---|---|---|---|
| S35-movil | /notes de hoy | La ventana pasa a 390 px; la navegación baja a cinco destinos | DevNotes también funciona en el teléfono. La navegación pasa abajo, con cinco destinos al alcance del pulgar. | La misma nota en vista angosta con la barra inferior | 0.4 s | 8.5 s | 5:28 | 7.5 s |
| S36-movil-herramientas | /notes de hoy en 390 px | Clic en «Herramientas» y luego en «Voz» desde la barra inferior | Las herramientas del editor se agrupan en un menú, y la IA y tu cuenta siguen arriba, siempre a mano. | Diálogo «Herramientas» y luego Voz en móvil | 0.5 s | 8.1 s | 5:36 | 6.6 s |
| S37-creditos | /voice en 390 px | Tarjeta final de créditos | Esto fue DevNotes. Voz de Sofía, generada con ElevenLabs. Música original sintetizada para este recorrido. Gracias por mirar. | Tarjeta final con logo y créditos | 1.5 s | 10.7 s | 5:44 | 7.4 s |

Duración final del video: 5:53 (353.48 s), 85 subtítulos.
