---
id: S-112
status: draft
version: 1
milestone: M6
tasks: [T-068, T-069, T-070, T-071, T-073, T-074, T-075]
---

# S-112 · Copiar texto de una captura

## Objetivo y decisión de envío

Abrir una captura de navegador, terminal o IDE, convertirla a texto editable y copiarlo. Casos principales: fondo oscuro, letra chica, mezcla español/inglés, URLs, rutas y códigos exactos. Primera versión: una imagen PNG o JPEG por vez. Ampliaciones para evaluar después. insertar explícitamente en una nota, OCR de PDF, tablas y manuscritos con motor 3, resaltado con coordenadas y PDF buscable.

**Decisión del dueño del 2026-11-14.** Se permite enviar la captura completa a OCR.space desde **Trabajo y Personal**. Antes de cada envío, el diálogo muestra el proveedor y avisa que se envía la imagen completa. El nombre del espacio, la nota, el usuario, la fecha y el borrador quedan dentro de DevNotes. La configuración arranca apagada. T-071 usa capturas ficticias autorizadas y una clave cargada por el dueño en el backend local aislado. La activación en Render conserva su autorización separada.

## OCR.space API Free

Fuentes oficiales consultadas el 2026-11-14. La API admite PNG, JPEG, GIF, TIFF, BMP y PDF. DevNotes acepta PNG y JPEG. La API Free publica **1 MB por archivo, 500 solicitudes diarias por IP y 25.000 conversiones mensuales** de cuota base para motores 1/2. La API PRO publica 5 MB por archivo. La herramienta web interactiva gratuita anuncia 5 MB por documento y tiene su propio flujo. Una sola IP de salida de DevNotes puede compartir el límite diario entre usuarios, espacios o servicios detrás de la misma salida. El alta Free pide correo para entregar la clave y carece de SLA. El titular puede consultar conversiones de su clave mediante myAPI. [Planes, formatos y cuota por IP](https://ocr.space/ocrapi) · [OCR web](https://ocr.space/) · [FAQ](https://ocr.space/faq) · [Contador](https://ocr.space/ocrapi/myapi).

Empezar con `OCREngine=2` y `language=auto`. La documentación lo describe como motor general con detección de idiomas mezclados, español e inglés y soporte para caracteres especiales. La precisión con fondos oscuros, tipografía pequeña e identificadores queda por medir. En el ensayo se puede comparar `scale=false` con `scale=true` para letra pequeña. La documentación marca el motor 1 como retirado y redirigido al 2. El motor 3 ofrece detección de tablas y manuscritos con cuota Free separada de 1.000 conversiones mensuales. [Motores y parámetros](https://ocr.space/ocrapi#ocrengine).

El proveedor declara que elimina los archivos después de procesarlos y conserva por un mes la IP de cada llamada. Su OCR web dice que también descarta el texto al terminar. El PDF buscable es una opción distinta y conserva el archivo descargable 60 minutos. La confirmación de borrado y el plazo son declaraciones del proveedor. [Política de privacidad](https://ocr.space/privacypolicy) · [OCR web](https://ocr.space/).

## Entrada, diseño y comportamiento

Este apartado describe la primera entrega. La [entrada Imagen y guardado solicitados después de T-071](#seguimiento--imagen-como-destino-principal) sustituyen el punto de entrada a partir de T-074.

En **Notas**, sumar un único botón **Herramientas** al extremo de acciones de la barra del editor. Su menú contiene **Copiar texto de una captura**. Es una utilidad puntual al redactar y queda a un gesto de la nota en curso. Conserva los cuatro destinos del shell y los accesos directos de copiar nota y guardar versión. En anchos estrechos el disparador ocupa una fila accesible del área de acciones si la barra no admite otro control. La herramienta abre un diálogo sobre el mismo editor, con título, cierre visible y un único cuerpo desplazable. La nota queda montada con su fecha, espacio, selección/cursor, historial de undo y coordenada de scroll. Restaurar foco al disparador de Herramientas al cerrar. Se puede volver al punto de edición con el foco de la nota y pegar a decisión del usuario.

Usar los tokens de [theme.ts](../../client/src/app/theme.ts). Fondo `#181a1b`, superficie `#212324`, texto `#e1e3e6`, texto secundario `#a6adb7`, foco/acción `#8ab4f8` y divisor `#393d42`. Mantener tipografía de interfaz existente y usar Roboto Mono, como en la nota, para el resultado OCR. Alinear todo a la izquierda y conservar saltos de línea con ajuste visual de rutas largas. Una acción principal según el estado, **Extraer texto** antes de procesar, **Copiar texto** al obtener un resultado. El contraste, el foco visible y los mensajes de estado acompañan el color. La sección de captura y el campo editable bastan para estructurar la vista.

```text
Escritorio ancho, diálogo desde Notas > Herramientas
Copiar texto de una captura                           [Cerrar]
Captura                                  Texto extraído
[Previsualización completa]              ┌────────────────────┐
[Elegir otra imagen]                     │ T-055              │
                                         │ ERR_CONNECTION_RESET│
                                         │ /src/api/foo-bar.ts │
                                         └────────────────────┘
Se enviará esta imagen completa a OCR.space.    [Extraer texto]
Con resultado:         Texto listo                [Copiar texto]

Escritorio en el 25 % del monitor, una columna y teclado
Copiar texto de una captura   [Cerrar]
Pegá una captura (Ctrl+V)     [Elegir imagen]
[Previsualización ajustada al ancho]
Se enviará esta imagen completa a OCR.space.
                     [Extraer texto]
Con resultado      [Ver captura] · Texto extraído [campo editable]
                                       [Copiar texto]
```

```text
Android, diálogo de pantalla completa con áreas seguras
Copiar texto de una captura     [Cerrar]
[Elegir imagen]  PNG o JPG, hasta 1 MB
[Previsualización ajustada al ancho]
Se enviará esta imagen completa a OCR.space.
[Extraer texto]
Con resultado
[Ver captura]                  [Elegir otra imagen]
Texto extraído
[Campo editable, letra de al menos 16 px]
[Copiar texto]
```

- Usar el ancho interior disponible. A partir de 880 CSS px de contenido, captura y texto pueden quedar lado a lado con al menos 400 px útiles para el texto. Si el espacio baja de ese umbral, una columna ocupa el ancho disponible. Validar 360/375/390 en móvil, 400/480/640 en ventana de escritorio y 1280 en vista amplia. Son tamaños de ensayo. El 25 % real depende del monitor, escala de Windows, zoom y chrome del navegador.
- En escritorio, iniciar el foco en la zona de pegado. Capturar `paste` con imagen solo en esa zona del diálogo. El texto pegado en el campo editable sigue su comportamiento normal. Tab y Shift+Tab recorren los controles, Enter activa la acción enfocada y Escape cierra con la misma regla de descarte que **Cerrar**. Tras el resultado, enfocar el campo en escritorio si el foco sigue en el flujo de extracción. Mantener el scroll del editor diario y anunciar estados con una región viva. Usar la tecla de pegar habitual del sistema.
- En Android, el botón **Elegir imagen** abre el selector nativo. Si el navegador entrega una imagen al pegar en la zona pertinente, se procesa igual que en escritorio. El selector es el recorrido completo táctil. Tras extraer, anunciar el resultado y mantener el teclado cerrado hasta que la persona toque el campo. Usar acciones de al menos 48 px de alto en móvil y 44 px en escritorio. Con teclado visible y en horizontal, el cuerpo puede desplazarse y permite llegar al campo, a **Copiar texto** y al cierre. La barra de acción sigue el flujo del contenido cuando no cabe fija, y el zoom nativo queda habilitado. Mismos rótulos y orden lógico en los tres tamaños.
- Vacío: **Elegir imagen** y ayuda de formato/pegado. Seleccionada: mostrar el archivo completo ajustado al ancho sin recortarlo, nombre local opcional y **Elegir otra imagen**. Extrayendo: indicar «Extrayendo texto…», admitir cambio o cierre y bloquear duplicados del mismo gesto. Resultado: conservar la captura en memoria para cotejar, plegada por defecto en vistas compactas detrás de **Ver captura**. **Copiar texto** copia la edición vigente y mantiene el diálogo abierto con «Texto copiado». Si el portapapeles falla, mantener el campo y ofrecer «Seleccioná y copiá el texto manualmente». Un cambio válido de imagen limpia resultado y error de la anterior. Si hay edición aún sin copiar, confirmar el descarte al cambiar o cerrar. Un archivo inválido o cancelar el selector conservan el estado previo.
- Cada selección tiene una generación y cada envío pertenece a esa generación, cuenta, espacio y fecha de origen. Cambiar la imagen, cerrar, navegar a otra fecha/espacio o perder la sesión invalida y aborta el request local. Una respuesta tardía nunca reemplaza el resultado actual ni reaparece al reabrir. La cancelación local puede ocurrir después de que el proveedor haya recibido la imagen y consumido cuota. Liberar la URL temporal al reemplazar o cerrar, limpiar captura y resultado al dejar el contexto. Abrir o elegir la imagen no envía bytes.

## Contrato HTTP, datos y errores

- Sesión existente, CSRF para POST y enum explícito de S-109 (`space=work|personal`). `GET /api/v1/ocr/capabilities?space=…` devuelve `{available: boolean}` calculado en el servidor por flag, lista autorizada y presencia de clave. Sin red hacia OCR.space en GET. `POST /api/v1/ocr/extractions?space=…` acepta un multipart con un único campo `file`. Una operación por solicitud, sin ID de nota. Lista de espacios verificada también en POST, rechazo 403 para un espacio denegado. 401 sin sesión y 403 sin CSRF. Espacio inválido/repetido u omitido, o multipart incorrecto, 400. Si flag o clave faltan, POST 503 `OCR_UNAVAILABLE`.
- Solo `image/png` y `image/jpeg`. Verificar tipo efectivo con firma y decodificación, concordancia con tipo declarado, archivo no vacío, un máximo inclusivo de **1.000.000 bytes** y dimensiones de hasta 8.192 px por lado y 20 megapíxeles. Medir antes de decodificar por completo y leer con límite. Las dimensiones son una decisión local de consumo acotado. Rechazar tipo/bytes discordantes o corruptos con 415/400 según corresponda, tamaño o dimensiones excedidos con 413. Limitar el request multipart a 1.100.000 bytes incluyendo envoltura, en esta ruta, sin reducir límites de voz/portabilidad. Cliente prevalidará selección y tamaño; el backend aplica la regla completa.
- POST saliente por HTTPS al host fijo `https://api.ocr.space/parse/image`, multipart binario con los mismos bytes completos, filename neutro con la extensión efectiva y header `apikey` desde `OCR_SPACE_API_KEY`. Configuración `DEVNOTES_OCR_ENABLED=false` y `DEVNOTES_OCR_ALLOWED_SPACES` vacía por defecto. En el ensayo poner solo el espacio aprobado. Sin URLs externas de entrada, redirecciones, envío de nota/identidad, overlay, PDF, reescalado ni reintentos automáticos. Timeout saliente máximo total 20 s incluido cuerpo, conexión como máximo 3 s. Acotar respuesta de proveedor a 1 MB y liberar permiso y buffers en todos los caminos. Aceptar solo una llamada en curso por cuenta y hasta cuatro por instancia; responder 429 `OCR_BUSY` ante saturación. Una acción de reintento debe ser deliberada.
- DevNotes mantiene la imagen temporal en memoria del navegador y en el request del servidor. Si el parser crea archivos temporales, borrar al terminar también ante excepción y desconexión; sin escritura de aplicación a DB, archivos persistentes, historial, cache, telemetría o logs de cuerpos y nombres. Respuesta con `Cache-Control: no-store`, texto plano en JSON y mensajes ProblemDetail fijos y saneados. El secreto existe en el backend. Ausencia de clave deshabilita la extracción sin impedir el arranque.
- HTTP 200 del proveedor exige JSON válido y resultado completo: `OCRExitCode=1`, `IsErroredOnProcessing=false`, un solo elemento en `ParsedResults` con `FileParseExitCode=1` y texto string. Aceptar enteros y representación decimal equivalente como en los ejemplos del proveedor. Devolver `200 {"text":"…"}` preservando espacios y saltos del texto útil. Texto ausente o solo blanco en resultado coherente → 422 `OCR_NO_TEXT`. `OCRExitCode=2` → 502 `OCR_PARTIAL`; descartar fragmentos y mostrar «La extracción quedó incompleta». Timeout local o código de página `-20` coherente → 504 `OCR_TIMEOUT`. 429 o señal inequívoca de cuota de proveedor, incluso en 200 → 429 `OCR_QUOTA_EXHAUSTED`; la UI muestra «Se alcanzó el límite de OCR.space. Probá más tarde». Señales contradictorias, otros errores lógicos en 200 y respuesta inválida → 502 `OCR_PROVIDER_ERROR`. La UI conserva la captura en esos errores y evita copiar texto viejo. Ante tipo, dimensiones o tamaño inválidos, indica qué archivo elegir. Los mensajes/URLs del proveedor jamás se muestran directamente. [Esquema de respuesta OCR.space](https://ocr.space/ocrapi#JSON).

## Ruta y objetivo de salida

[T-068](../tasks/T-068-ocr-api.md) (contrato HTTP y adaptador con doble) → [T-069](../tasks/T-069-ocr-workspace.md) (diálogo y estados) → [T-070](../tasks/T-070-ocr-journey.md) (navegador real, doble de OCR.space) → [T-071](../tasks/T-071-ocr-first-real-test.md) (primera precisión real autorizada, local). El recorrido técnico queda demostrable con fixtures antes de que el dueño tenga que cargar una clave. El cierre de la capacidad acredita el recorrido técnico y registra el veredicto de precisión local con capturas ficticias. Ante un fallo de precisión, Frontera documenta la causa y decide el ajuste con el dueño. Render es una operación posterior separada. El corte de trabajo acordado el 2026-11-16 es el cierre de T-071. La [evaluación de Redactar](../tasks/T-072-writing-provider-evaluation.md) queda en pausa.

## Seguimiento · Imagen como destino principal

Pedido del dueño del 2026-11-16 después del cierre inicial. **Imagen** abre una pantalla propia con título **Imagen a texto**. En escritorio, Voz · Notas · Referencias · Imagen · Historial. En móvil, Notas · Voz · Referencias · Imagen · Historial, con icono de imagen, texto visible en cada destino y cinco celdas de igual ancho. Conservar el tema de DevNotes, foco visible, selección ámbar, 48 CSS px mínimos de alto táctil y áreas seguras. Al mover OCR a Imagen, retirar el acceso en Herramientas y preservar el borrador de Notas al navegar.

La caja de captura recibe `Ctrl+V` y permite abrir el selector local con **Elegir imagen**. **Pegar** lee imágenes del portapapeles por gesto explícito cuando el navegador lo permite. Ante permiso denegado o API ausente, orientar a `Ctrl+V` en la caja o al selector. Pegado y selección muestran la vista previa. **Extraer texto** inicia el envío tras mostrar el aviso de OCR.space. La caja de resultado conserva edición de texto normal y **Copiar texto**. Apertura, pegado, vista previa, copia, selección y guardado no envían una nueva captura.

**Guardar** conserva el texto editado en una lista de **Textos guardados** dentro de Imagen, con fecha, extracto, apertura y eliminación cómoda, siguiendo la interacción de Voz. Colección privada por cuenta y espacio. La captura permanece transitoria. El dueño puede volver a consultar y eliminar cada texto cuando deje de necesitarlo. La decisión de persistencia no cambia el contrato de extracción. Definir recuperación y portabilidad antes de publicar el guardado.

Secuencia: [T-073](../tasks/T-073-ocr-windows-paste.md) corrige el pegado. [T-074](../tasks/T-074-image-navigation.md) mueve el flujo a Imagen. [T-075](../tasks/T-075-image-text-library.md) prepara el contrato de guardado y eliminación. El objetivo de salida es poder pegar un recorte de Windows, extraerlo, guardarlo y borrarlo desde un acceso directo.
