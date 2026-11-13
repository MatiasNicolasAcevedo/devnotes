---
id: S-111
status: draft
version: 1
milestone: M5
tasks: [T-053, T-054, T-055, T-056]
---

# S-111 · Ventana diaria de actividad en Render

## Problema y evidencia

El dueño informó el 2026-11-12 que, al entrar aproximadamente a las 19:20 de Buenos Aires, esperó unos dos minutos. Esperaba que después de la primera visita diaria el servidor se mantuviera despierto. Es una observación del dueño, no un cronómetro del agente ni evidencia de un incidente de base de datos.

Comprobado en T-052: la sonda interna de [T-051](../tasks/T-051-render-follow-up.md#sonda-aplazada) quedó aplazada. No hay `@Scheduled`, `TaskScheduler` ni otro keepalive en el backend actual. `client/src/features/system/useReadiness.ts` consulta readiness cada 5 s, incluso en background, mientras el navegador puede ejecutar JavaScript. Esa consulta no sigue funcionando con proceso cerrado y Android puede suspender páginas. Render informó el deploy `f6a23c7` live. La consulta acotada de logs falló; no hay timestamps de ese despertar para atribuir con certeza los dos minutos a una causa única.

Documentación oficial consultada el 2026-11-12 con web y Context7: Free suspende tras 15 minutos sin tráfico entrante y la siguiente petición lo despierta; arranque típico alrededor de un minuto, sin plazo garantizado. Puede reiniciar instancias. El workspace dispone de 750 h Free mensuales compartidas. Los planes de cómputo pagos no se suspenden por inactividad. [Render Free](https://render.com/docs/free#spinning-down-on-idle), [FAQ](https://render.com/docs/faq#why-is-my-free-service-sometimes-slow-to-respond).

**No se encontró garantía oficial de que una petición de la misma instancia a su URL pública reinicie el contador de inactividad.** No confundir GET a localhost con tráfico entrante del edge. Además, una instancia ya suspendida no puede ejecutar su propio scheduler para despertarse. La sonda puede reducir suspensiones por inactividad; no garantiza disponibilidad continua ni resuelve vencimiento de PostgreSQL.

## Alternativas y decisión de esta iteración

| Opción | Ventaja | Límite / estado |
|---|---|---|
| Sonda interna a URL pública | No necesita PC abierto ni otro servicio; encaja en el primer acceso diario | Candidata a ensayo, efecto en Render aún no demostrado; no puede recuperarse sola estando suspendida |
| Consulta desde navegador | Ya existe, mantiene estado de conexión mientras la página corre | No cubre cierres ni suspensión móvil; no anunciarla como keepalive autónomo |
| Disparador externo en Windows | Tráfico realmente externo, sin contratar proveedor | Necesita PC encendido, conectado y sin suspensión; instalar tarea del sistema requiere permiso futuro del dueño |
| Scheduler externo gestionado | Puede despertar una instancia dormida | Requiere elegir servicio, cuenta, permisos y cuotas; no contratado ni instalado con este plan |
| Cómputo sin suspensión por inactividad | Elimina ese mecanismo de cold start | Tiene costo y exige decisión del dueño; no garantiza ausencia de reinicios |

Decisión técnica para preparación: implementar y probar localmente **ventana diaria + sonda interna detrás de un interruptor apagado por defecto**, con estado honesto en UI y protocolo de ensayo de Render. No prometer el resultado remoto antes de medirlo. No desplegar ni activar ahora. Si el ensayo falla, la capacidad permanece apagada y se devuelve una elección concreta entre disparador externo o cómputo sin suspensión; no repetir más de dos ensayos equivalentes ni incorporar otro proveedor por cuenta propia.

## Comportamiento diario

- Zona fija del servicio: `America/Argentina/Buenos_Aires`, independiente de la zona del dispositivo y de los espacios Trabajo/Personal.
- La primera visita necesita despertar el servidor por la vía normal. Una vez autenticado el dueño habilitado y visible la página, el frontend pide activar la ventana **de ese día**, automáticamente una sola vez por día desde esa sesión visible. Un GET de readiness, un bot, una visita anónima o un login de otra cuenta no la activa.
- Ventana termina en la siguiente medianoche local, exclusivo. Mostrar «Activo hasta las 00:00» con fecha y zona en el detalle. Logout/cerrar navegador no desactiva una ventana ya autorizada; botón «Pausar por hoy» sí. Cambiar de espacio no crea otra ventana ni otro scheduler.
- Si se pausa, conservar `pausedDate` para que otra pestaña o reapertura no la active automáticamente ese día. El botón «Reanudar hoy» es explícito. Al siguiente día vuelve a esperar una visita visible del dueño; el servidor no reactiva por arrancar ni por leer un endpoint.
- Primera sonda inmediata tras activar; siguientes cada 10 minutos. Solo una petición en vuelo. Sin intervalo configurable por request, sin frecuencia de 12/14 min ni lazo por sesión/pestaña.
- Antes de cada envío comprobar flag, ventana, pausa y deadline usando Clock; no emitir después de medianoche. Una respuesta de una petición previa puede terminar después, sin reprogramar. Cancelar futuros al pausar/cerrar aplicación backend; no interrumpir el proceso del dueño.
- Capturar revisión/generación de la ventana al programar y enviar; el callback que llega después de pausa, nueva fecha o reanudación no sobrescribe el estado de esa nueva ventana ni agenda otro disparo. La respuesta vieja puede descartarse; nunca reactiva por su cuenta.
- Reinicio antes de vencer: recuperar ventana persistida y reanudar una única secuencia; vencida/pausada no se reanuda. No acumular disparos atrasados. DB no disponible: no enviar y registrar estado degradado sin detalles de conexión.
- Fallo HTTP/timeout: registrar intento y volver a probar en el siguiente intervalo, nunca retry apretado. Tras tres fallos consecutivos, detener y mostrar «No se pudo comprobar la sonda»; reintento explícito reabre la secuencia dentro del mismo día. No reportar éxito al recibir HTML de arranque.

## Configuración, datos y permiso operativo

`DEVNOTES_KEEP_AWAKE_ENABLED=false` por defecto. `DEVNOTES_KEEP_AWAKE_OWNER_ID` contiene el UUID local de la cuenta del dueño habilitada por el operador, nunca un correo/claim ni valor enviado desde el navegador. Si flag está on y falta UUID/origen válido, la capacidad queda no disponible y no hace red; no derribar las notas por una configuración opcional inválida. Sin clave/token nuevo. Documentar solo nombres y ejemplo UUID ficticio en `.env.example`, sin valores de la cuenta real. No crear roles/membresías de negocio.

El control afecta horas compartidas del servicio, por eso otras cuentas autenticadas no pueden activarlo ni consultar su detalle. No usar «primer usuario registrado» como permiso. El despliegue/operador fija la única cuenta permitida; esta planificación no autoriza leer IDs reales de la DB ni cambiar variables de Render.

Migración `V6__create_service_awake_window.sql` (siguiente libre confirmado en implementación). Una fila singleton `id=1`, `active_date DATE`, `active_until TIMESTAMPTZ`, `paused_date DATE`, `revision BIGINT`, `last_attempt_at`, `last_success_at`, `consecutive_failures` y `last_result` enum de resultados seguros. Sin notas, audio, URLs arbitrarias ni datos de identidad. Fechas/instantes de negocio mediante Clock, no hora del cliente. Actualizaciones transaccionales/idempotentes; varios tabs no crean varias filas o secuencias. Alcance de runtime: una instancia, acorde con Free; múltiples réplicas exigirían otro contrato de coordinación.

Origen destino deriva exclusivamente de `APP_PUBLIC_URL` validado; añadir ruta fija `/actuator/health/readiness`. HTTPS público, sin credenciales, query, fragmento, redirects ni destino recibido del usuario. Rechazar localhost, loopback, link-local, direcciones privadas y metadata en configuración real. Transporte inyectable para pruebas locales ficticias sin solicitudes externas. Connect timeout 5 s, respuesta/operación máximo 15 s, cuerpo máximo 1 KiB. Solo HTTP 200 con JSON esperado `status: UP` cuenta como respuesta correcta; 3xx/HTML/5xx/DB down/timeout son fallo. No cookies, Authorization ni CSRF en la sonda saliente; readiness ya es público.

Usar el `TaskScheduler` existente de Spring con programación de un disparo y ScheduledFuture cancelable, sin dependencia nueva ni hilo ocupado esperando. [API de TaskScheduler](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/scheduling/TaskScheduler.html). No tocar versiones ni crear cron job externo.

## API privada y UI

GET `/api/v1/service-activity/capabilities`: autenticado, no-store, unión estricta `{available:false}` o `{available:true,serviceDate:"YYYY-MM-DD"}`. True solo para la cuenta permitida con configuración válida; fecha calculada en zona del servicio. No expone owner UUID ni configuración. GET `/api/v1/service-activity`: misma cuenta, 200 con `{active, activeUntil, pausedToday, lastAttemptAt, lastSuccessAt, consecutiveFailures, lastResult, nextAttemptAt}`; timestamps ISO UTC o null, lastResult `none|up|timeout|http_error|invalid_response|unavailable`. Flag apagado/otra cuenta=404 seguro; sin sesión=401.

POST `/api/v1/service-activity/start` con body exacto `{mode:"visit"|"resume"}`: sesión+CSRF, cuenta permitida. `visit` es idempotente y respeta pausa del día; `resume` solo acción explícita puede levantarla. POST `/api/v1/service-activity/pause` sin body pausa el día. Ambos devuelven estado 200; body inválido=400; CSRF=403. Métodos/rutas exactos en SecurityConfig/OpenAPI. No endpoints públicos activadores, ni GET con efectos de activación. Inicio no extiende la fecha de corte; ningún request recibe URL, intervalo o deadline.

El cliente invoca `visit` después de resolver auth y capabilities y comprobar documento visible, una sola vez por fecha de servicio conocida; errores no generan bucle de renders/reintentos ni detienen escritura. Si permanece abierto al cambiar de día, una interacción real de navegación/foco del dueño puede activar el nuevo día, nunca un timer nocturno. Registrar intentos por fecha/generación en memoria, no tokens en storage. La fecha aplicable proviene del estado/capabilities: añadir `serviceDate: YYYY-MM-DD` a capabilities cuando available=true, calculada por servidor, no por reloj Android.

Conexión Online continúa indicando únicamente última respuesta de readiness. En menú de cuenta, «Actividad del servidor» abre detalle con estado, última respuesta y corte; no agregar otro icono pequeño a la barra. Texto fijo: «La sonda intenta evitar la suspensión por inactividad. Render puede reiniciar el servicio». Pausar/reanudar y errores son accesibles y no interrumpen la nota.

Reducir sondeo de disponibilidad del navegador: al montar/recuperar foco y cada 60 s solo con documento visible; `refetchIntervalInBackground=false`. No llamar cada 5 s por defecto ni asociar Online a contenido guardado. Lecturas de estado de ventana solo al abrir detalle/tras acción, sin polling oculto. Readiness puede seguir recibiendo tráfico de usuarios reales a cualquier hora; no prometer suspensión exacta a medianoche, solo corte de la sonda interna.

## Ensayo y límites de aceptación

**Local obligatorio (T-053…T-056):** Clock simulado, scheduler/transporte inyectados y PostgreSQL real. Probar medianoche exacta, reinicio, pausa, tres fallos, dos tabs, una instancia, expiración, flag off, otro usuario, CSRF, destino inválido/redirect y respuestas HTML. Los tests no esperan diez minutos reales. T-056 usa recorrido HTTP de integración sobre controller/servicio/DB reales con actor ficticio habilitado y otro denegado, más componentes de UI. No se presenta como E2E ni precisa alterar el harness para enviar peticiones externas. No llamadas a Render/Groq; el adaptador HTTP se verifica con servidor de prueba controlado solo en tests.

**Render opcional, después de autorización expresa del dueño sobre SHA y ventana de ensayo:** exportación preventiva por el dueño; confirmar cuota, servicio/origen exactos y que no hay otros pingers. Registrar estado/base/logs saneados antes. Comparar dos ventanas con todas las pestañas cerradas y app Android cerrada: control con sonda apagada y >20 minutos sin tráfico propio; ensayo con sonda activada y al menos 40 minutos cubriendo tres intervalos. No consultar readiness durante los silencios: eso invalidaría la prueba. Consultar metadatos/eventos de plataforma, y hacer una sola petición final midiendo duración total para cada ventana. La primera espera fría se mide aparte de requests calientes; no atribuir al keepalive mejoras de caché.

Registrar horas UTC/local, SHA, flag, plan, intentos emitidos por app, respuestas, reinicios/suspensiones observables, tiempo de petición final y límites de resolución de los eventos. Readiness 200 final solo demuestra que respondió al final; sin evidencia de los intervalos no demuestra continuidad. Si logs/eventos no están disponibles, dictamen «inconcluso», no «funciona». Cerrar con pausa/flag según elección del dueño; nunca dejar un monitor adicional 24/7. No lanzar el ensayo desde T-052.

No se promete cold start cero ni auto-recuperación después de suspensión. Aceptación técnica local y eficacia medida en proveedor son veredictos separados. T-056 puede cerrar la entrega local y habilitar S-109 con la eficacia remota pendiente explícita; no marcar la sonda como validada en Render. Si se pide una garantía de disponibilidad, volver al dueño para opción externa/plan sin suspensión.

Estimación de consumo: activación a las 07:00 hasta 00:00 = 17 h/día, 527 h en 31 días, más cola de inactividad/arranques/tráfico real y otros servicios. 750 h no son cuota exclusiva de DevNotes. La sonda no evita el vencimiento de Postgres Free registrado para el 11/12/2026 22:35 de Buenos Aires. [Límites y vencimiento](https://render.com/docs/free#free-postgres).

## Tareas y salida

| Orden | Tarea | Resultado |
|---|---|---|
| 1 | [T-053](../tasks/T-053-service-activity-window.md) | Ventana persistida, autorización y API, flag off |
| 2 | [T-054](../tasks/T-054-service-activity-scheduler.md) | Sonda cancelable y transporte acotado, sin activación remota |
| 3 | [T-055](../tasks/T-055-service-activity-client.md) | Activación por visita, pausa/detalle, sondeo visible moderado |
| 4 | [T-056](../tasks/T-056-service-activity-journey.md) | Recorrido dirigido local y protocolo/veredicto separado del proveedor |

T-053 depende de T-052 y T-051 MERGED/conciliadas. T-056 habilita T-057. No activar recursos externos ni gates integrados por esta secuencia; rige la [excepción de pruebas](../TESTING.md#excepción-i5-del-2026-11-12).
