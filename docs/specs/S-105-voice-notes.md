---
id: S-105
status: ready
version: 2
milestone: M2
tasks: [T-017, T-027, T-028, T-029, T-030, T-031, T-032, T-033, T-034, T-035, T-036, T-037, T-048, T-049]
---
# S-105 · I2 notas de voz · contrato M2-RC1

## Objetivo y decisión

El dueño prioriza voz el 2026-10-31 y solicita planificación completa para implementar una versión y luego probarla personalmente. Esta revisión sustituye los paquetes A…F del draft por doce tareas sobre main `0d976dc2187cb2a07061c3db48130c334b1e471b`. I1/PR19 y S-106/PR29 están MERGED; no se reabre su aceptación.

**M2-RC1** identifica el hito local entregable, no una versión Maven/npm ya publicada ni un despliegue. Recorrido: grabar → detener/transcribir → editar/copiar → guardar → consultar/corregir/borrar varias notas privadas. T-037 entrega un SHA integrado, VO-01…07 y guía de pruebas del dueño. Si falta ensayo externo se declara «RC técnica, activación externa pendiente», nunca «voz real validada».

Decisiones cerradas por frontera: transcribir al detener, español, texto plano, colección independiente de daily, guardado manual y copia manual hacia otros destinos. Cuenta, controles de datos y autorización/ensayo externo son pendientes de activación, no bloquean construir con proveedor ficticio. La solicitud de planificación no autoriza audio personal, pagos ni Google real.

## Investigación fechada y límites de la evidencia

Revalidación pública **2026-10-31**, sin login Groq, claves inspeccionadas, audio enviado ni medición de calidad/latencia:

| Fuente oficial | Hallazgo y decisión local |
| --- | --- |
| [Groq Speech to Text](https://console.groq.com/docs/speech-to-text) | Publica turbo multilingüe, español, WebM, metadatos y archivo gratuito hasta 25 MB. Elegimos `whisper-large-v3-turbo`, `language=es`, `temperature=0`, `verbose_json`; límite propio 20 MiB. |
| [Groq Rate Limits](https://console.groq.com/docs/rate-limits) | Free Whisper:20 RPM, 2000 RPD, 7200 segundos/hora, 28800/día. Compartidos por organización; rige el primero agotado y el panel efectivo de la cuenta. Sin garantía de gratuidad ilimitada. |
| [Groq Your Data](https://console.groq.com/docs/your-data) | Sin retención de inferencia por defecto; excepciones de fiabilidad/abuso hasta 30 días o más por obligación legal. ZDR configurable; datos retenidos en EE.UU. No prometer retención cero sin comprobar controles. |
| [MediaStream Recording, borrador W3C](https://w3c.github.io/mediacapture-record/) | Stop/dataavailable asíncronos; reunir fragmentos completos antes de subir. Un fragmento aislado puede no ser reproducible; timeslice no es reloj exacto. |
| [Media Capture and Streams, borrador W3C](https://www.w3.org/TR/mediacapture-streams/) | Permiso y tracks tienen ciclo de vida propio; detener también el stream que llega después de cancelar. |
| [Spring multipart](https://docs.spring.io/spring-boot/api/java/org/springframework/boot/servlet/autoconfigure/MultipartProperties.html) y [RestClient](https://docs.spring.io/spring-framework/reference/integration/rest-clients.html) | Configurar límites/umbral temporal y multipart real. Usar Spring/Java 21 existentes, sin SDK/WebFlux nuevos. Context7 contrastó Framework7.0.5; no actualizar el BOM congelado. |
| [nginx body](https://nginx.org/en/docs/http/ngx_http_core_module.html#client_max_body_size) y [proxy](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_request_buffering) | Los límites/buffering del proxy son independientes de Spring. |
| [Playwright permisos](https://playwright.dev/docs/api/class-browsercontext#browser-context-grant-permissions) y [lanzamiento](https://playwright.dev/docs/api/class-browsertype#browser-type-launch-option-args) | El harness configura permiso/micrófono ficticio; no sustituye MediaRecorder ni API propia. |

Groq (q) es el proveedor elegido; no se integra Grok/xAI ni multiproveedor. Viabilidad documental no demuestra precisión de español/términos técnicos/silencio ni latencia.

## Pantalla y comportamiento

Ruta privada `/voice`, enlace «Voz» en shell. Una columna a375 px; lista/editor adyacentes si caben a1280 px. Textarea Roboto Mono, tema existente, labels/foco/teclado y mensajes en español. Workspace en memoria por propietario sobre el outlet, siguiendo el precedente DailyDraftWorkspace.

1. Nueva nota abre borrador vacío. Permitir escritura manual aunque transcripción esté apagada. Grabar exige sesión/CSRF, capacidades y navegador compatibles y **borrador nuevo vacío**. Para grabar con texto o sobre guardada usar Nueva nota y resolver descarte; no reemplazar ni concatenar implícitamente.
2. Antes de grabar: «Al detener, el audio se envía a Groq para transcribir. DevNotes guarda solo el texto que decidas guardar. La retención de Groq depende de sus controles de datos», con enlace a su política. Solicitar micrófono únicamente por gesto.
3. Solicitando: «Esperando permiso del micrófono» y Cancelar. Capturando: rojo **y** «Grabando», contador mm:ss, «Detener y transcribir» y «Cancelar grabación». Anuncio accesible del estado, sin leer el contador cada segundo.
4. Stop espera el último fragmento y libera tracks antes de «Transcribiendo…». Una sola petición por intento; edición/guardar/nueva captura deshabilitados. Cancelar aborta localmente e invalida resultado; no garantiza cancelar el procesamiento ya enviado al proveedor.
5. Éxito rellena borrador **sin guardar**, enfoca texto y elimina audio. Aplicar respuesta solo si coinciden propietario, generación y operación. Fallo conserva blob solo en memoria para Reintentar transcripción/Descartar audio, sin micrófono. Reintento explícito, nunca automático.
6. Copiar entrega exactamente el texto actual, incluidos espacios/saltos, y anuncia éxito solo tras resolver Clipboard API. Fallo visible y alternativa de seleccionar/copiar manualmente. Guardar exige texto válido y ACK; bloquear doble clic y mostrar guardado solo tras respuesta. Un texto clean no se reenvía.
7. Lista paginada con creación local y extracto, orden por creación. Abrir recupera detalle. Corrección usa revisión;409 conserva borrador y ofrece Copiar, recargar con confirmación o Nueva nota con ese texto. Nunca actualizar automáticamente sobre revisión nueva.
8. Borrar guardada pide Cancelar/Confirmar, usa revisión y espera204. Error/409/404 no oculta el borrador como éxito. Si se vacía una página posterior, retroceder una página.

Captura: `idle → requesting → recording → stopping → transcribing → idle/error`. Documento independiente: `new/clean/dirty/saving/deleting/error`. Captura/transcripción/guardar/borrar no se superponen. Los errores no reemplazan texto.

## Captura, navegación y sesión

Soporte de salida: Chromium de escritorio (Chrome/Edge del dueño) y viewports Chromium 1280/375. El proyecto mobile acredita ancho/tacto, no Safari/iOS/hardware Android. Detectar otros navegadores y explicar incompatibilidad; MP4/Firefox/Safari sin promesa en M2-RC1.

- Contexto seguro, getUserMedia, MediaRecorder e isTypeSupported. Preferir `audio/webm;codecs=opus`, después `audio/webm`; sin conversión ni extensión falsa. Solo audio, mono como preferencia.
- `start(1000)`, reunir blobs, reloj monotónico. Máximo **600 s** o **20971520 bytes (20 MiB)**. En tiempo detener/transcribir audio completo con aviso. Si blob final excede bytes o suspensión excede tiempo, rechazar sin subir/truncar; avisar y descartar audio inválido. Cero bytes no se sube.
- Start/stop dobles idempotentes. Cancelar permiso pendiente invalida generación y detiene tracks si llegan después. Error/track ended/pagehide/desmontaje/expiración/cambio de identidad limpian tracks, listeners, timers, blob y peticiones. Al ocultarse la pestaña detener captura y conservar audio válido en memoria con acción explícita Transcribir; no subir en segundo plano.
- Mantener workspace por dueño sobre outlet sin migrar router declarativo. Enlace, navegación programática y Atrás/Adelante no desmontan el borrador: si cambia URL con pendientes, mostrar guardia «Volver a voz», «Guardar y continuar», «Descartar y continuar» antes de renderizar destino. Guardar solo se habilita con texto válido y espera ACK; con solo audio se puede volver para transcribir o descartar. Al intentar salir de captura detener tracks; cancelar navegación no los reinicia. Durante transcripción se puede cancelar y continuar con descarte explícito.
- beforeunload advierte si texto dirty/audio/captura; pagehide limpia siempre. No se promete recuperar texto después de recarga forzada. No localStorage/sessionStorage/IndexedDB/service worker. Concurrencia entre pestañas en servidor.
- Al iniciar logout (`logoutPending`) detener audio inmediatamente aunque logout falle. En fallo conservar texto del mismo dueño sin reanudar micrófono. 401/cambio de identidad descartan estado privado sin autosave ni diálogo que impida salir. Respuestas de A no escriben estado/cache de B. Conservar guardias de daily.

## Persistencia y reglas de texto

Migración aditiva **V5__create_voice_note.sql**, sobre V1…V4 actuales. Si V5 deja de estar libre reconciliar contrato antes de implementar; nunca editar migraciones aplicadas. Tabla voice_note: id UUID PK v7 generado por aplicación; owner_id UUID NOT NULL FK app_user(id); text TEXT NOT NULL; revision BIGINT1…9007199254740991; created_at/updated_at TIMESTAMPTZ NOT NULL. Índice (owner_id, created_at DESC, id DESC). Sin audio ni relación a daily.

Texto 1…**50000 unidades UTF-16**, normalizar CRLF/CR a LF antes de validar/guardar; conservar espacios/salto final. Al menos un carácter fuera de Unicode White_Space, sin U+0000 ni sustitutos aislados. Misma regla front/back; no transformar con trim. DB respalda NOT NULL, revisión y char_length entre 1 y50000: puntos Unicode como defensa adicional, no equivalencia al límite UTF-16 más estricto. Render siempre texto escapado.

Clock inyectado, UTC truncado a microsegundos; createdAt inmutable y updatedAt del ACK. Todas las consultas/conteos/escrituras filtran owner. Update/delete CAS atómico por (owner, id, expectedRevision); cero filas: lookup **solo del dueño**, 404 si inexistente/ajena y409 si revisión obsoleta. Probar carreras update/update y update/delete en PostgreSQL; lectura+save/delete sin CAS no cumple.

## Contrato HTTP

Sesión y owner derivados del contexto. Mutaciones con CSRF header vigente. Allowlist exacta por método/ruta en SecurityConfig y denyAll final; no ampliar permisos de rutas vecinas. JSON/ProblemDetail privados no-store. Caída/apagado de Groq no altera readiness global ni CRUD.

| Método/ruta | Entrada | Respuesta |
| --- | --- | --- |
| GET /api/v1/voice/capabilities | Ninguna | 200 {recordingEnabled, reason, maxDurationSeconds:600, maxAudioBytes:20971520, maxTextLength:50000, mimeTypes:["audio/webm"], language:"es"}. reason disabled/not_configured/null. Sin ping, clave ni URL interna. |
| POST /api/v1/voice/transcriptions | Multipart exactamente un file; MIME base audio/webm, 1…20971520 bytes | 200 {text, language:"es"}; **cero escrituras DB**. Rechazar partes duplicadas/desconocidas, URL/modelo/idioma del cliente. Nombre externo fijo recording.webm; verificar cabecera/DocType WebM, no confiar solo en extensión/MIME. Decodificación final del proveedor. |
| GET /api/v1/voice-notes?page=0&size=20 | page 0…2147483647, size 1…50 default 20 | 200 {content:[{id, excerpt, revision, createdAt, updatedAt}], page, size, totalElements, totalPages}. Extracto120 puntos Unicode, sin cortar par; createdAt DESC, id DESC; offset long y conteo privado DB. Fuera de rango vacío. |
| POST /api/v1/voice-notes | JSON {text} | 201 detalle, Location relativa /api/v1/voice-notes/{id}, revisión 1; sin upsert. |
| GET /api/v1/voice-notes/{id} | UUID | 200 {id, text, revision, createdAt, updatedAt} o404. |
| PUT /api/v1/voice-notes/{id} | JSON {text, expectedRevision} entero1…9007199254740991 | 200 detalle revisión+1. Revisión tope409 sin mutación; no upsert. |
| DELETE /api/v1/voice-notes/{id}?expectedRevision=1 | Revisión obligatoria, mismo rango | 204 sin cuerpo; inexistente/ajena404, obsoleta409. |

DTO separado de entidad. Campos desconocidos de escritura (owner/id incluidos)400 solo en esta feature, sin cambiar contratos globales. UUID/parámetros/cuerpo inválidos400; no sesión401; CSRF403; ajena e inexistente mismo404. OpenAPI bajo interruptor actual.

Creación POST sin retry automático ni promesa de idempotencia entre solicitudes distintas. Tras ACK perdido conservar texto y ofrecer refrescar/consultar lista antes de volver a crear; explicar que pudo haberse guardado. No anunciar exactamente una vez.

## Adaptador y errores

El POST saliente usa `multipart/form-data` con cinco partes elegidas en el servidor. Envía `file` como `recording.webm` de tipo `audio/webm`, `model=whisper-large-v3-turbo`, `language=es`, `temperature=0` y `response_format=verbose_json`. El formato verboso incluye `no_speech_prob` por segmento. [Contrato de Groq](https://console.groq.com/docs/speech-to-text#using-the-api)

RestClient con transporte JDK21, destino fijo **https://api.groq.com/openai/v1/audio/transcriptions**, sin redirects. Clave solo backend; parámetros elegidos en servidor, sin prompt por defecto, SDK nuevo, shell, ffmpeg, fallback ni modelo alternativo. HttpServer JDK inyectado solo en IT; el harness usa destino fijo http://voice-provider:8091/openai/v1/audio/transcriptions únicamente cuando perfil e2e **y** DEVNOTES_VOICE_TEST_PROVIDER=true. El flag es falso fuera del overlay E2E y se rechaza true fuera de ese perfil. No existe base URL arbitraria configurable ni parámetro de destino desde navegador. El desarrollo persistente también usa perfil e2e para OIDC ficticio: ese perfil por sí solo no habilita el doble.

Conexión 5 s, **deadline total externo 60 s** incluida lectura acotada, respuesta upstream máximo 1 MiB. Con el doble E2E, deadline 2 s para demostrar timeout dentro de los30 s del test, sin ampliar deadlines/retries de Playwright; el valor productivo 60 s se prueba en backend. Texto sujeto al límite 50000. No transacción DB durante IO. Dos inferencias/instancia y una/dueño, admisión sin espera/cola y liberación finally. Aborto del browser no asegura aborto upstream: puede ocupar slot hasta deadline. No confundir este control local con cuotas de organización ni protección de un servicio público.

Validar JSON, texto, duración finita positiva<=600 s y segmentos. Texto vacío o todos los segmentos con no_speech_prob>=0.6 →422 sin aceptar texto. Texto no vacío sin segmentos/metadatos válidos →502. Heurística, no garantía contra alucinaciones; revisión humana y ensayo con silencio obligatorios para aceptación externa. Bytes/admisión se controlan antes de inferencia; duración efectiva se conoce en respuesta del proveedor. No confiar en duración declarada por cliente ni prometer que un audio largo hostil dentro de20 MiB no consume cuota. Antifraude/distribución pública fuera del hito local.

RFC 9457 con extensión code y mensaje fijo en español, sin cuerpos externos, texto/audio/credenciales en logs. UI acepta errores proxy sin JSON.

| HTTP/code | Condición / recuperación |
| --- | --- |
| 400 VOICE_INVALID_REQUEST | Estructura/partes inválidas, sin llamar proveedor |
| 413 VOICE_AUDIO_TOO_LARGE | Bytes/multipart; grabar más corto, no truncar |
| 415 VOICE_UNSUPPORTED_AUDIO | MIME/contenedor no WebM |
| 422 VOICE_NO_SPEECH / VOICE_AUDIO_REJECTED | Sin voz /duración excesiva o audio rechazado; no fabricar texto |
| 429 VOICE_BUSY / VOICE_RATE_LIMITED | Cupo local/proveedor; retryAfterSeconds entero1…3600, local 5, upstream header válido o60; espera visible y retry manual |
| 503 VOICE_DISABLED / VOICE_NOT_CONFIGURED | Apagado/sin clave; CRUD sigue disponible |
| 503 VOICE_PROVIDER_UNAVAILABLE | 401/403 upstream, 5xx/red; **no expirar sesión DevNotes** |
| 504 VOICE_PROVIDER_TIMEOUT | Deadline; tracks apagados y retry manual |
| 502 VOICE_INVALID_RESPONSE | Metadatos/texto inválidos/excesivos, sin éxito |
| 409 VOICE_REVISION_CONFLICT | Conservar borrador y no sobrescribir |

## Configuración/transporte y privacidad

DEVNOTES_VOICE_ENABLED=false por defecto, GROQ_API_KEY ausente/vacía=no configurado sin romper arranque. Propiedades devnotes.voice.*, nunca VITE_*. Enabled+clave significa configuración disponible, no credenciales/cuotas comprobadas. Sin clave en navegador ni preferencias por usuario.

Spring multipart: archivo 20 MiB, request 21 MiB, umbral memoria 21 MiB, cleanup incluso en fallo. nginx: ruta exacta de transcripción 21m, request buffering off/HTTP 1.1 y tiempos envío/lectura 75 s; mantener Host/forwarding/header allowlist y límites de otras rutas. Vite: mismo transporte/75 s, sin persistir body. Cliente deadline 90 s. Sin volúmenes/rutas de audio; temporales técnicos solo efímeros, verificar que solicitudes válidas no escriben audio en disco. Esto no promete borrado remoto Groq.

Compose transmite las dos variables solo al server. Local persistente conserva OIDC ficticio y datos propios; no hereda proveedor ficticio por compartir perfil e2e. Doble externo en red privada, sin puertos host, socket Docker ni logs de bodies; clave ficticia obvia. Gates/CI no llaman Groq: T-030 debe aislar también variables heredadas del proceso del dueño, no solo los archivos de fixtures. Precisión y cuota efectiva se verifican aparte.

Hallazgo de código previo: run-e2e.mjs elimina --grep solo para validar argumentos, pero vuelve a usar args originales en comandos Docker; e2e.sh no acepta filtros ni --project. T-031 corrige este defecto con rojo/verde y una entrada única e2e.sh que conserva arranque, controlador IPC, saneador y cleanup. FULL sin argumentos sigue completo; no sustituir controlador por docker run directo, que pierde IPC de identidades. El ensayo negativo del saneador imprime failures=1 deliberadamente y termina0 si protege el secreto: esa línea sola no demuestra fallo de la suite de producto.

## Ruta cerrada de implementación

T-017 conserva ID/rama: la planificación queda realizada aquí y la próxima sesión **Junie implementer** publica contratos junto con base apagada/capabilities. No PR separado de planificación ni done ficticio. Su cambio de rol queda registrado en la tarea; la activación externa queda en el criterio final.

| Orden | Tarea / salida | Dependencia |
| --- | --- | --- |
| 1 | [T-017](../tasks/T-017-voice-readiness.md) · Disponibilidad privada apagada + contratos | T-026 |
| 2 | [T-027](../tasks/T-027-voice-storage.md) · Tabla y servicio CAS privado | T-017 |
| 3 | [T-028](../tasks/T-028-voice-api.md) · CRUD/listado HTTP | T-027 |
| 4 | [T-029](../tasks/T-029-voice-transcription.md) · Adaptador/endpoint con IT ficticio | T-028 |
| 5 | [T-030](../tasks/T-030-voice-transport.md) · Proxies/Compose/doble externo | T-029; control de cinco |
| 6 | [T-031](../tasks/T-031-voice-harness.md) · Reparar filtros/lifecycle y E2E de transporte | T-030 |
| 7 | [T-032](../tasks/T-032-voice-client.md) · HTTP multipart y Query privada | T-031 |
| 8 | [T-033](../tasks/T-033-voice-recorder.md) · Captura/ciclo de vida | T-032 |
| 9 | [T-034](../tasks/T-034-voice-workspace.md) · Pantalla nueva, edición/copia/guardado | T-033 |
| 10 | [T-035](../tasks/T-035-voice-library.md) · Colección/consulta/corrección/borrado | T-034; control de diez |
| 11 | [T-036](../tasks/T-036-voice-navigation.md) · Guardia navegación/sesión/daily | T-035 |
| 12 | [T-037](../tasks/T-037-voice-release.md) · Recorrido/evidencia/entrega M2-RC1 | T-036 |

Solo T-017 ready. Resto draft exclusivamente por dependencia; Junie los habilita al comprobar MERGED sin planner adicional. WIP1 y sesiones distintas. Controles de cinco/diez tras T-030/T-035 por Junie; frontera vuelve al objetivo o decisión fuera de contrato. No falsear FULL ante fallo preexistente: evidencia y protocolo de bloqueo.

## Aceptación y entrega

| ID | Resultado | Tareas y evidencia principal |
| --- | --- | --- |
| VO-01 | Micrófono real del browser, rojo+texto, stop/cleanup incluso permiso tardío/logout | T-033 unitario;T-037 Playwright micrófono ficticio |
| VO-02 | Stop→texto sin guardar; silencio/429/timeout/apagado explícitos | T-029 HTTP/adaptador;T-030 doble;T-037 integrado + smoke externo separado |
| VO-03 | Editar/copiar exactamente texto actual, fallo visible | T-034 componente;T-037 browser |
| VO-04 | Varias notas, guardar/reabrir/corregir/recargar/paginar | T-027 PostgreSQL;T-028 HTTP;T-035 UI;T-037 integrado |
| VO-05 | Borrado confirmado, concurrente, solo propio; error/cancelar conservan estado | T-027/T-028 negativos;T-035 componente |
| VO-06 | 401/403/404/dos actores y late responses sin mezcla de datos | T-028/T-029 OIDC real;T-032/T-036 componentes;T-037 browser |
| VO-07 | Permiso/formatos/límites/navegación/clipboard/suspensión sin éxito falso | T-033/T-036 unitario/componente;T-037 proxies/browser |

Conservar I1/S-106, cobertura, retries0 y deadlines. Micrófono ficticio + doble externo acreditan captura/transporte/integración, no precisión Whisper. E2E nunca mockea API propia. FULL al cerrar cada tarea según TESTING; STARTER para configuración/tooling, sin repetir por Markdown sobre mismas fuentes/base.

[VOICE-RELEASE](../VOICE-RELEASE.md) fija activación, matriz manual, freeze y evidencia por SHA. No atribuir al dueño aceptación antes de sus pruebas.

## Fuera de alcance

Streaming, pausa/reanudación, dictado continuo, traducción/resumen/diarización, audio persistido/reproducible/importado, envío automático a CLI/agentes, integración diaria, búsqueda/etiquetas de voz, historial/restauración, colaboración, SDK nuevo, ffmpeg, colas/workers/object storage, pagos/despliegue y soporte Safari/iOS. Mejoras de pruebas del dueño irán a BACKLOG sin ampliar silenciosamente M2-RC1.
