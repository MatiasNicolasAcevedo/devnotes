---
id: S-105
status: draft
version: 1
milestone: M2
tasks: [T-017]
---
# S-105 · I2 posterior: notas por voz

## Iteración y objetivo de salida

Extra solicitado el 2026-10-21, después de I1/T-014 MERGED y su conciliación por frontera. Resultado: grabar una idea, transcribirla, corregir/copiar el texto, conservar varias notas privadas y borrarlas cuando dejen de ser útiles. No bloquea ni amplía CA-01…06 del MVP. Estado draft: intención de producto confirmada; proveedor/configuración y contratos de ejecución posteriores aún por cerrar en T-017. Junie no incorpora voz durante I1.

## Confirmado y propuesto

Confirmado por el dueño: botón para iniciar/detener, señal roja mientras graba, transcripción durante o después de grabar, texto editable, botón Copiar, Guardar, consulta posterior y Borrar. La captura de referencia es una demo visual; implementar audio real en I2, sin conservar los textos «no captura audio» o «Simular guardado» como comportamiento.

Propuesta inicial de frontera: transcripción **al detener**, español con términos técnicos, colección independiente de notas de voz (varias por día, sin relación obligatoria con NotaDiaria), guardado manual de texto plano editable. Reabrir una guardada permite corregir y guardar cambios; copiar funciona antes y después del guardado. Lista reciente con fecha/hora y extracto, paginación simple, sin carpetas/búsqueda/etiquetas. Fecha/hora de creación y actualización UTC, presentadas localmente. Solo texto en PostgreSQL; no conservar audio, reproducción ni historial de versiones de transcripción. Confirmar límites/modelo e interfaces definitivos al habilitar I2.

## Flujo mínimo y estados

1. Abrir Notas de voz y Nueva nota. Botón Grabar con label accesible, textarea Transcripción editable y contador de caracteres. Guardar deshabilitado mientras está vacío o hay operación pendiente; Copiar habilitado con texto, incluso no guardado.
2. Pedir micrófono al pulsar Grabar, solo mediante gesto del usuario. Al capturar, botón/indicador rojo y texto «Grabando», contador de duración y acción Detener. El color no es la única señal; foco y estado anunciados con accesibilidad. No empezar otra captura en paralelo.
3. Detener libera tracks de micrófono, muestra «Transcribiendo» y envía audio al backend. Al obtener respuesta, llenar texto y permitir edición. Deshabilitar edición durante esa petición para que una respuesta tardía no borre cambios; cancelar/otra nota/otra identidad invalida esa respuesta.
4. Copiar copia el texto **editado actual**; éxito solo tras resolver Clipboard API, fallo visible con selección manual como alternativa. No enviar a otras personas, agentes o CLI desde la app.
5. Guardar persiste texto para el propietario; ACK real antes de «Guardado». Reabrir/listar/recargar conserva correcciones. Nuevas grabaciones generan notas independientes; no reemplazan una guardada sin acción explícita. Navegar con cambios sin guardar exige confirmación, sin autosave de audio ni texto en navegador.
6. Borrar una nota guardada pide confirmación y elimina solo esa nota propia; cancelar no modifica, error no la oculta como si hubiera sido borrada. Eliminar no deja audio porque la app no lo conserva. No se promete borrado de datos eventualmente retenidos por el proveedor.

Estados previstos: listo, solicitando permiso, grabando, transcribiendo, texto sin guardar, guardando, guardado, borrando y error recuperable. Tratar permiso denegado, micrófono ausente/ocupado/interrumpido, navegador/formato incompatible, límite de duración/tamaño, audio sin voz, desconexión/timeout, cuota429, proveedor no configurado/no disponible, CSRF y sesión expirada. No fabricar transcripción o éxito. Error de proveedor retiene el audio solo en memoria para reintentar explícitamente; nueva captura/cancelación/logout lo descarta con aviso cuando corresponda. Al desmontar, navegar o cerrar sesión detener tracks y limpiar blobs/URLs; no grabar en segundo plano. beforeunload para borrador/captura en curso.

## Candidato investigado: Groq + Whisper

Consulta de documentación oficial el **2026-10-21**; sin cuenta autenticada ni llamadas de inferencia:

| Hallazgo publicado | Fuente |
|---|---|
| Groq ofrece whisper-large-v3 y whisper-large-v3-turbo, multilingües, endpoint de transcripción de archivos; candidato inicial turbo y language=es | [Speech to Text](https://console.groq.com/docs/speech-to-text) |
| Free tier: hasta 25 MB por archivo; admite webm, mp4, wav y otros formatos | [Límites de audio](https://console.groq.com/docs/speech-to-text) |
| Tabla gratuita de ambos Whisper: 20 solicitudes/minuto, 2000/día, 7200 segundos de audio/hora y 28800/día; límites compartidos por organización, sujetos al primero agotado y a la cuenta efectiva; exceso429 | [Rate Limits](https://console.groq.com/docs/rate-limits) |
| Por defecto no retiene entradas/salidas de inferencia; existen excepciones de fiabilidad/abuso y controles de datos. No equivale a promesa absoluta de retención cero | [Your Data](https://console.groq.com/docs/your-data) |

Groq (q) y Grok/xAI (k) son servicios distintos. [La oferta de voz de xAI](https://docs.x.ai/developers/model-capabilities/audio/voice) publica transcripción con precio; el acceso gratuito a su chat no demuestra API gratuita. Groq es la recomendación inicial por la referencia del dueño a Whisper/capa gratuita, no una prueba de calidad ejecutada ni garantía futura de cuota.

## Propuesta técnica acotada para refinar

- Mantener OIDC/sesión/CSRF y propietario derivado de sesión. Nueva feature voice, sin cambiar el esquema de daily ni su unicidad por fecha. Cada nota de voz tendría UUIDv7, owner, texto, revisión técnica y timestamps; tabla aditiva posterior a V4, nombre/número según el main real al habilitarla. Guardado y borrado con revisión esperada para evitar sobrescribir cambios de otra pestaña.
- Browser [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)/[getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), HTTPS o localhost y detección [isTypeSupported](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static). Probar primero Chromium con audio/webm; verificar alternativa MP4 en navegador soportado antes de prometerla. Propuesta de límite local: 10 minutos y 20 MiB, lo primero que ocurra; validar cliente/servidor y no recortar audio silenciosamente. Sin streaming, WebSocket, ffmpeg, subida por URL, workers/colas ni almacenamiento de objetos en esta primera versión.
- Backend recibe multipart acotado y llama solo al host HTTPS fijo del proveedor con clave de entorno **solo servidor**, sin VITE_* ni preferencias con clave en navegador. Configuración deshabilitada por defecto, sin clave real en Git/logs; operación externa no mantiene transacción DB abierta. Transcribir devuelve texto, no crea una nota hasta Guardar. No logs de audio/texto/credenciales ni eco del error crudo del proveedor.
- Definir en T-017 DTOs/rutas exactos de transcripción y CRUD/listado privado, validación de texto/revisiones, códigos/ProblemDetail, límites de upload/proxy, timeout finito y respuesta429/reintento explícito. Deshabilitado/no configurado se muestra como estado útil. No fallback pago ni cambio de proveedor automático.
- Pruebas del adaptador con servidor externo ficticio, audio sintético sin personas/datos reales y casos de cuota/error; API/DB/OIDC propios reales en integración/E2E. Fixtures de micrófono de navegador prueban captura, no precisión de Whisper. Smoke externo ficticio con dueño/configuración disponible acredita formato/idioma/calidad y se registra separado; ningún gate llama a la cuenta externa por defecto.

## Aceptación de I2 a concretar en tareas

| ID | Resultado observable | Prueba futura prevista |
|---|---|---|
| VO-01 | Iniciar/detener funciona; rojo + texto solo durante captura; tracks liberados incluso ante error/logout | recorder unitario + navegador con micrófono ficticio |
| VO-02 | Detener obtiene texto en español; transcribir no guarda; sin voz/error429/timeout no inventan texto ni éxito | adaptador con proveedor ficticio + smoke externo separado |
| VO-03 | Corregir/borrar palabras y Copiar entrega exactamente el texto actual; fallo clipboard visible | componente + navegador |
| VO-04 | Guardar, listar, reabrir/corregir y recargar conservan varias notas independientes | PostgreSQL/HTTP + recorrido real |
| VO-05 | Borrar requiere confirmación, elimina solo nota propia; cancelar/error conserva estado correcto | HTTP negativo + componente |
| VO-06 | Sin sesión/CSRF o con ID de otro dueño no se lee/actualiza/borra; cambio identidad no mezcla texto/audio | HTTP dos actores + navegador |
| VO-07 | Permiso negado, formatos/límites, respuesta tardía y navegación dirty no pierden texto ni dejan micrófono activo | unitario/componente + navegador |

## Desglose posterior y condición de habilitación

[T-017](../tasks/T-017-voice-readiness.md) es la tarea de frontera posterior a I1: comprobar proveedor/cuenta/permiso de prueba, validar audio ficticio y fijar los contratos ejecutables. Todavía no están listos para ejecución los paquetes siguientes; se convertirán en tareas Junie con IDs/ramas/archivos/comandos exactos en T-017, sobre las fuentes reales de I1:

| Orden | Paquete pequeño | Dependencia / salida |
|---|---|---|
| A | Persistencia/servicio de notas de voz | T-017; migración aditiva, propiedad, revisión y borrado probados en PostgreSQL |
| B | API privada CRUD/listado | A MERGED; HTTP/CSRF/dos actores, sin audio aún |
| C | Adaptador y endpoint de transcripción | B MERGED; multipart/límites/cuota/timeout contra proveedor ficticio |
| D | Captura y ciclo de vida de micrófono | C MERGED; estados, rojo/stop/cleanup/formatos probados sin UI de colección |
| E | Pantalla editable, copia y colección | D MERGED; guardar/reabrir/borrar/navegación y errores de clipboard |
| F | Recorrido integrado y evidencia de I2 | E MERGED; API/DB/OIDC reales, micrófono ficticio, evidencia externa separada |

WIP1, sesiones distintas por tarea/revisión, sin cambios de pagos/permisos. Si E resulta demasiado amplia, T-017 la divide antes de ready. Retorno a frontera al demostrar VO-01…07 y mergear F, o ante decisión fuera del contrato. No crear infraestructura ni instalar SDKs por esta spec.

## Fuera de alcance

Traducción, resumen por IA, dictado continuo/streaming, diarización, reproducción/archivo del audio, adjuntar archivos externos, envío a terceros, integración con agentes/CLI, facturación, modo offline, múltiples versiones y transcripción automática en notas diarias. La copia manual a CLI/web cubre el uso inicial solicitado.
