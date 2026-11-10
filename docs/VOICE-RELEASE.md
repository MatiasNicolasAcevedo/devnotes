# M2-RC1 · Entrega local y pruebas de voz

Estado al 2026-11-10: **RC técnica en revisión** ([PR44](https://github.com/MatiasNicolasAcevedo/devnotes/pull/44)), **activación externa pendiente**. Planificada el 2026-10-31. Contrato canónico [S-105 v2](specs/S-105-voice-notes.md); ejecución/evidencia [T-037](tasks/T-037-voice-release.md). Esta guía diferencia planificación, verificación técnica y aceptación del dueño.

## Qué recibirá el dueño

Un SHA de main con las doce tareas I2 MERGED, ruta Voz integrada con daily/referencias/historial, captura al detener, texto editable/copiable y colección privada con varias notas. La entrega incluye comandos de retoma del stack propio y resultados VO-01…07 por capa/viewport. No se publica un tag ni se cambia la versión Maven/npm por esta planificación.

| Estado de entrega | Evidencia requerida | Qué permite afirmar |
| --- | --- | --- |
| Contrato preparado | S-105/tareas y docs-check | Plan ejecutable; sin función implementada |
| RC técnica | T-017 y T-027…T-037 MERGED, FULL válido, VO-01…07 con dobles externos | Integración local demostrada con datos ficticios |
| Activación externa pendiente | RC técnica sin cuenta/ensayo Groq comprobados | Edición/colección disponibles; transcripción real pendiente |
| Voz real verificada | Ensayo ficticio externo satisfactorio en la configuración del dueño | Protocolo/formato/modelo/calidad mínima demostrados en ese entorno/fecha |
| Aceptada por el dueño | Pruebas personales y veredicto explícito, con SHA | Versión aceptada para su uso local; mejoras posteriores en BACKLOG |

No convertir «RC técnica» en aceptación externa ni atribuir al dueño un veredicto por tener CI verde. M2 vuelve a frontera con la entrega técnica; si el dueño aún no configuró Groq, el pendiente externo queda visible sin replanificar el software.

## Habilitación segura del proveedor

Antes de cualquier envío, el dueño debe confirmar expresamente: organización/cuenta propia disponible en nivel permitido, permiso para un ensayo con audio sintético no personal, controles de retención aceptados y ausencia de contratación/pago nuevo. No se solicita una clave en el chat. El dueño configura el secreto por su canal privado hacia el backend; el agente no abre .env real, panel de secretos, cookies ni headers.

Variables implementadas por T-017/T-030: DEVNOTES_VOICE_ENABLED y GROQ_API_KEY, solo server. Estado por GET privado /api/v1/voice/capabilities: disabled/not_configured/disponible por configuración. No probar validez por presencia de clave ni imprimirla con env, docker inspect/config, comandos de diagnóstico o logs. El gate parte siempre de fixtures versionadas y no hereda la clave real.

Revalidar en ese momento [modelos/formato](https://console.groq.com/docs/speech-to-text), [cuota de organización](https://console.groq.com/docs/rate-limits) y [retención/ZDR](https://console.groq.com/docs/your-data). Registrar solo plan declarado, modelo, límites numéricos y controles efectivos sin identificadores privados. No cambiar plan/controles/permisos por inferencia. Si cambia un límite/modelo/política materialmente, checkpoint al dueño/frontera antes de activación, sin fallback.

El inicio local existente es:

```bash
bash scripts/dev.sh up --mode local --proxy nginx --project starter-dev-local-nginx
```

Es el stack **persistente del dueño**: no se usa como namespace de pruebas ni se ejecuta down para limpiar un gate. Conservar datos y labels. dev.sh borra COMPOSE_ENV_FILES y su --env-file acepta solo puertos/interruptor Swagger, no secretos. Las dos variables de voz se heredan del entorno privado del proceso del dueño hacia server por Compose; no se agregan al archivo de parámetros ni se imprimen. T-030 debe demostrarlo con clave ficticia.

Un up repetido no recrea contenedores: cambiar variables no actualiza un server ya activo. Cuando el dueño autorice la activación y haya cargado las variables de forma privada, detener y volver a levantar **su mismo proyecto**, con el mismo --env-file de parámetros que usó al crearlo. Para el comando por defecto mostrado arriba, la secuencia será:

```bash
bash scripts/dev.sh down --mode local --proxy nginx --project starter-dev-local-nginx
bash scripts/dev.sh up --mode local --proxy nginx --project starter-dev-local-nginx
bash scripts/dev.sh check --mode local --proxy nginx --project starter-dev-local-nginx
```

down conserva el volumen; esta secuencia interrumpe la sesión local y se hace solo en la activación autorizada por el dueño, nunca como cleanup de pruebas. Si su proyecto/puertos/proxy difieren, usar exactamente sus parámetros/labels comprobados; no adoptar un stack por nombre. No inventar --voice, extender el archivo de puertos para claves ni usar dev-auth.sh para persistencia. Volver a enabled=false exige igualmente recreación; si se retira la clave, no mostrarla en diagnósticos.

## Ensayo externo acotado

Se ejecuta solo después de autorización/configuración efectiva; hoy **no realizado**. Usar la UI y la API reales de DevNotes con OIDC local ficticio; no una llamada directa al proveedor que saltee el backend. Entrada de audio sintético o TTS no personal reproducida hacia una entrada virtual elegida por el dueño, sin instalar herramientas por inferencia. Si no hay fuente sintética/entrada virtual disponible, registrar ese dato pendiente; no sustituirlo por voz personal sin autorización específica.

| Muestra | Qué comprobar | Registro permitido |
| --- | --- | --- |
| Español breve, 10–20 s | Texto útil, números y puntuación; corregir/copiar sin guardado implícito | Duración, éxito/fallo, latencia aproximada y observaciones sin contenido privado |
| Español técnico, 20–40 s | Pronunciar PostgreSQL, Spring Boot, CSRF y un identificador ficticio; sin resumir instrucciones | Palabras técnicas acertadas/errores y necesidad de edición; sin prometer precisión porcentual no medida |
| Silencio sintético, 3–5 s | No presentar texto inventado como resultado válido | Sin voz/error observable; si alucina, registrar como defecto externo de VO-02 y no dar aceptación |
| Segunda nota breve | Dos notas separadas, editar/copiar/guardar/reabrir/borrar | Resultado por pasos y SHA |

Máximo cuatro inferencias, máximo 120 s de audio total, intento único por muestra. No forzar429 agotando cuota, no probar un archivo grande contra la cuenta ni repetir por rutina. 429, key inválida o timeout se prueban con el doble externo; si ocurren aquí registrar estado y detener el ensayo, sin bucles. La autorización de envío no autoriza un costo nuevo; verificar que la cuenta y su política de gasto cumplen el límite del dueño antes de enviar.

La fuente sintética controlada acredita formato/calidad mínima, no la acústica de un micrófono personal. Las pruebas posteriores del dueño cubren su dispositivo y uso cotidiano. No publicar audio, texto privado, secretos ni trazas crudas; borrar solo los ficheros ficticios propios según su ubicación comprobada.

## Matriz de prueba personal

Sobre el SHA de entrega, Chromium de escritorio y localhost/HTTPS. El ancho375 es una prueba visual; no acredita Safari/iOS.

| Caso | Resultado esperado |
| --- | --- |
| Abrir Voz sin configurar Groq | Mensaje útil; escribir, guardar y consultar texto siguen disponibles |
| Negar permiso y reintentar por gesto | Mensaje claro, no indicador rojo ni micrófono huérfano |
| Grabar/detener una idea | Rojo+Grabando solo durante captura; texto al terminar, aún sin guardar |
| Corregir y copiar antes de guardar | Portapapeles contiene exactamente la corrección; no envío a CLI/web |
| Guardar dos notas, recargar/reabrir | Ambas independientes, fechas/horas locales, texto exacto |
| Editar desde dos pestañas | Segundo guardado obsoleto409; se conserva borrador para copiar/recargar |
| Borrar/cancelar/error | Confirmación; cancelar no borra; fallo no anuncia éxito |
| Cambiar ruta o Atrás con cambios | Guardia conserva texto; guardar espera ACK; descarte explícito |
| Ocultar pestaña/cancelar/cerrar sesión | Micrófono se detiene; no sigue grabando ni mezcla datos |
| Volver a notas diarias/historial/referencias | Se conservan edición, autosave, versiones y vista previa |
| Reducir ventana a375 px | Acciones alcanzables, teclado/foco, sin overflow horizontal |

No requerir al dueño que repita todas las pruebas de seguridad/carga automatizadas; su ronda evalúa utilidad, dispositivo y defectos observables.

## Evidencia final a completar por T-037

La tarea conserva logs y comandos. Aquí solo figuran el enlace a la evidencia y el estado de entrega. La «RC técnica» exige además T-037 MERGED. Hasta entonces la entrega está **en revisión**.

| Dato | Estado al 2026-11-10 |
| --- | --- |
| SHA/base integrados y PR finales | Fuentes `8775ac9` sobre main `289dd66` (T-017, T-027…T-036 y T-038 MERGED), [PR44](https://github.com/MatiasNicolasAcevedo/devnotes/pull/44). SHA de entrega: el squash de PR44, a registrar tras MERGED |
| VO-01…07 por capa y dos viewports | Matriz siguiente; Playwright `voice:` 2/2 en desktop 1280 y 2/2 en mobile 375 |
| FULL local / CI / revisión independiente | Gate STARTER (`verify.sh --starter`) exit 0 sobre `8775ac9`; CI `verify-required` verde en ese HEAD; revisión independiente pendiente. [Evidencia](tasks/T-037-voice-release.md#gate-de-cierre) |
| Cleanup de recursos de pruebas | Proyectos `starter-verify-t037`, `starter-e2e-t037` y `starter-e2e-t037-iter` sin contenedores, volúmenes ni redes; stack persistente del dueño intacto |
| Ensayo Groq, fecha/modelo/formato/retención/cuota | No realizado: no hay configuración ni autorización del dueño. Activación externa pendiente, sin bloquear la RC técnica |
| Aceptación personal del dueño | Pendiente de sus pruebas sobre el SHA de entrega |

Matriz VO por capa. Las capas anteriores son las pruebas de las tareas citadas, todas dentro del gate de cierre. El recorrido integrado usa Chromium real con micrófono sintético, la API, la base y el OIDC propios, y el doble de Groq en la red privada, sin interceptar la API propia. Corre en `e2e/tests/voice.spec.ts`, en ambos viewports.

| ID | Capas previas | Recorrido integrado (T-037) |
| --- | --- | --- |
| VO-01 | T-033 `recorder.test.ts` y `useVoiceRecorder.test.tsx` | «Grabar» muestra rojo, «Grabando» y contador. El track está activo durante la captura y terminado tras «Detener y transcribir». Cerrar sesión con captura activa termina el track sin subir audio |
| VO-02 | T-029 `GroqTranscriptionClientTest` y `VoiceTranscriptionApiIT`; T-030 doble y proxies | El WebM real de MediaRecorder se transcribe: 200 `{text, language: "es"}` con texto en el editor, sin fila antes de Guardar. Un 429 del proveedor por nginx y backend da `VOICE_RATE_LIMITED` con `retryAfterSeconds` 30, sin texto ni reintento automático; el reintento explícito funciona. Silencio, timeout y apagado se cubren en backend y en el doble |
| VO-03 | T-034 `VoiceComposer.test.tsx` | La corrección con espacios y salto final se copia exacta: lectura del portapapeles idéntica y aviso tras resolver Clipboard API |
| VO-04 | T-027 `VoiceNoteServiceIT`; T-028 `VoiceNoteApiIT`; T-035 `VoiceLibrary`/`VoicePage` | Dos notas sobreviven a la recarga, con la más nueva primero. La corrección usa `expectedRevision` 1→2 y la recarga conserva el texto exacto |
| VO-05 | T-027/T-028 negativos; T-035 componente | Cancelar no borra. Confirmar envía DELETE con `expectedRevision` 2 y recibe 204; luego GET da 404 y queda una nota |
| VO-06 | T-028/T-029 OIDC real; T-032/T-036 componentes | Una segunda identidad OIDC simultánea recibe el mismo 404 en GET, PUT y DELETE sobre la nota ajena y ve solo la suya. Una transcripción descartada durante la navegación no escribe estado al llegar tarde. Tras logout, A recibe 401 y B sigue con 200 |
| VO-07 | T-033/T-036 unitarias y de componente | La guardia conserva el borrador al ir a Notas y no renderiza el destino debajo. «Volver a voz» y «Descartar y continuar» funcionan. Daily, historial y referencia siguen operativos. A 375 px no hay overflow y «Nueva nota» se activa por teclado |

El recorrido encontró tres defectos, corregidos en T-037 con prueba roja previa. El doble nunca arrancaba en `scripts/e2e.sh`. El backend rechazaba todo WebM real. Las marcas de tiempo de voz se adelantaban y desordenaban la lista. Los casos de micrófono sintético y el doble acreditan captura, transporte e integración, **no** la precisión ni la latencia de Whisper.

## Congelación y siguientes mejoras

Tras T-037 MERGED, congelar el SHA entregable en esta guía/tarea y dejar un prompt de pruebas del dueño, sin comenzar otra capacidad en esa sesión. Sin tag/despliegue automático. Si falta activación, prompt concreto para esa configuración/ensayo; si ya pasó, pruebas personales y reporte.

Cada hallazgo del dueño registra pasos, esperado/observado, navegador y SHA; datos ficticios o descripción saneada. Bugs de pérdida de texto, fuga de datos, micrófono activo o guardado falso impiden aceptar la versión y se priorizan. Otras mejoras se agrupan en la siguiente iteración por frontera. No cambiar silenciosamente modelo, esquema, permisos ni alcance para mejorar una demo.
