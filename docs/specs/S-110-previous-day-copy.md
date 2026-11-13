---
id: S-110
status: draft
version: 1
milestone: M5
tasks: [T-066, T-067]
---

# S-110 · Empezar con la última nota anterior

## Objetivo y alcance

El dueño abre una fecha vacía y puede comenzar copiando la última nota anterior **del espacio activo**, con un botón claro. Después modifica la copia para registrar las novedades del día. Decisión expresa del 2026-11-12: si ayer no tiene nota, sugerir la última anterior con su fecha; por ejemplo, el lunes ofrece el viernes. Depende de [S-109](S-109-private-spaces.md). El contrato se revisa en T-052; no es implementación.

Incluye copia del documento de trabajo guardado, conservando texto, enlaces, separadores y átomos de referencia. No copia la versión manual, voz, timestamps, revisión, IDs de nota ni la fecha del origen. No copia automáticamente al abrir, no enlaza las ediciones posteriores de ambas notas y no sobrescribe contenido existente. No agrega categorías ni plantillas.

## Regla de selección y documento vacío

- Fecha destino = la que se está viendo, incluso pasada o futura; comparación de fechas calendario, sin conversiones UTC. «Hoy» conserva la zona local del navegador. Origen debe cumplir `sourceDate < targetDate`.
- Buscar por owner+space y fecha descendente, sin ventana artificial de siete/treinta días y sin incluir otros espacios. Elegir la última nota guardada con contenido significativo.
- Vacío significa todos los bloques párrafo, sin referencias y sin texto fuera de Unicode White_Space. Un separador, una referencia (aunque hoy no esté disponible), o texto no blanco hacen que el documento tenga contenido. Usar la misma regla en Java/TS; NUL y sustitutos aislados siguen inválidos por el esquema vigente. Saltar notas guardadas vacías para no ofrecer una copia inútil.
- Para evitar discrepancias entre trim de Java/JavaScript, fijar White_Space a U+0009–000D, U+0020, U+0085, U+00A0, U+1680, U+2000–200A, U+2028–2029, U+202F, U+205F y U+3000. U+FEFF no cuenta como vacío en esta regla. Probar los mismos ejemplos en ambos lenguajes.
- Sin candidato: no hay botón muerto; texto discreto «Todavía no hay una nota anterior en Trabajo» o «… en Personal». El editor vacío queda utilizable.
- Origen = documento guardado en servidor. Si quedó una edición pendiente en otro dispositivo, no se afirma que se copió esa edición. Referencias continúan apuntando al original de su mismo espacio y muestran el contenido vigente según S-106.

## Interacción

Cuando la fecha actual está vacía y sin cambios locales pendientes, mostrar una franja dentro del área de la nota, debajo de la barra y antes del editor:

```text
Empezar con tu última nota de Trabajo
Copiar del 11/11/2026                       [Copiar nota anterior]
```

Si el origen es ayer, puede añadir «Ayer» manteniendo fecha completa. Siempre mostrar espacio y fecha antes del click. No usar el ícono de portapapeles de «Copiar nota», que copia al portapapeles y ya existe. Esta acción crea contenido en la fecha actual; label accesible «Copiar nota del 11/11/2026 a 12/11/2026 en Trabajo». En móvil la franja ocupa dos líneas y botón >=44 px; nunca comprimirla entre los íconos pequeños de la barra. Respetar diseño S-109.

GET de sugerencia es lectura: no crea fila. Mientras carga, estado discreto; en error, «No se pudo buscar la nota anterior» + Reintentar, con editor habilitado. Al empezar a escribir localmente, ocultar la oferta y abortar/ignorar respuesta obsoleta. No perder lo escrito por una sugerencia que llega tarde.

Al pulsar, capturar contexto/revisiones y bloquear temporalmente edición/cambio de fecha/espacio para impedir competir con la escritura. Botón «Copiando…», sin doble POST. Éxito tras ACK: cargar respuesta como documento confirmado del coordinador, mostrar «Copiada del 11/11/2026» y «Guardado» y devolver foco al editor sin abrir el teclado móvil por sorpresa cuando la plataforma lo impida. No disparar un segundo autosave de la misma copia. Guardar versión sigue siendo otra acción manual.

Permitir deshacer la copia como una sola operación del editor hasta que se pierda el historial local; deshacer vuelve al documento previo vacío y usa autosave con la nueva revisión. No borra una versión ni altera el origen. Recarga no ofrece undo persistente. Tras copiar, se oculta la sugerencia porque ya hay contenido.

## API

Extender SecurityConfig y OpenAPI con los dos endpoints exactos, bajo sesión y no-store; POST requiere CSRF. `space` se valida igual que S-109, ausente=work. DTOs estrictos; ningún owner se recibe del cliente.

### GET `/api/v1/daily-notes/{targetDate}/previous?space=work`

200 con `{sourceDate, sourceRevision, sourceUpdatedAt}` del candidato (fecha ISO, revisión segura positiva, instante UTC). No devuelve contenido en esta sugerencia ni cuenta notas ajenas. 204 sin cuerpo si no existe candidato. Fecha inválida=400, sin sesión=401, error de servidor distinto de «sin nota anterior». Puede sugerir incluso si hay destino no vacío, pero la UI no ofrece la acción y el POST lo vuelve a verificar; no usar el GET como permiso de escritura.

### POST `/api/v1/daily-notes/{targetDate}/copy-previous?space=work`

Body exacto `{sourceDate, sourceRevision, expectedRevision}`. `expectedRevision=0` si destino no existe; positiva si hay fila vacía guardada. Éxito 200 con el DTO DailyNoteDetail actual (`id,date,content,revision,updatedAt`), tanto para creación como para actualización de fila vacía. Primer registro revision=1, UUID nuevo, timestamps de ahora; en fila existente conservar id/createdAt y aumentar revisión una vez. No admite cuerpo `content` ni `force`.

Transacción: autorizar y leer la fuente elegida por owner+space+sourceDate con revisión igual a la mostrada; comprobar fecha anterior y contenido no vacío; tomar una copia profunda de ese JSON; crear destino con constraint única o actualizar con CAS y condición de vacío. Una escritura remota entre la sugerencia y el click nunca se pisa. La copia representa el snapshot del origen leído dentro de la transacción; cambios posteriores en origen no alteran el destino. Si se creó otra nota más reciente después de mostrar la sugerencia, se sigue copiando la fuente explícita que el usuario vio, sin sustituirla silenciosamente.

| Resultado | HTTP / código | Efecto y UI |
|---|---|---|
| Fuente propia ausente, ajena o de otro espacio | 404 `COPY_SOURCE_NOT_AVAILABLE` | Misma respuesta indistinguible; refrescar sugerencia, sin escritura |
| Fuente cambió de revisión o ahora está vacía | 409 `COPY_SOURCE_CHANGED` | «La nota de origen cambió. Volvé a revisar la sugerencia»; requiere nuevo click |
| Destino contiene contenido significativo | 409 `COPY_TARGET_NOT_EMPTY` | No reemplazar; ofrecer recargar y revisar el destino |
| Revisión destino no coincide/carrera de creación | 409 `COPY_TARGET_CHANGED` | Mantener estado y recuperar última versión; nunca reintento automático con otra revisión |
| Fechas/revisiones/space/campos inválidos | 400 | Rechazo antes de mutar, mensajes seguros |
| Sesión/CSRF | 401/403 | Flujo existente, sin éxito ni datos tardíos |
| Respuesta perdida tras commit | error de red; posterior 409 posible | Reconsultar destino antes de ofrecer otra copia. No sobrescribir ni duplicar; permitir seguir con texto confirmado |

El orden de validación no revela notas ajenas. CAS y validación de vacío son atómicos en PostgreSQL, no un if previo seguido de update incondicional. No POST recursivo ni retry automático. Una nota vacía que ya tiene versión manual puede recibir contenido; su versión anterior queda intacta hasta que el usuario la reemplace explícitamente.

## Aceptación

| ID | Caso |
|---|---|
| CP-01 | Hoy vacío, ayer con contenido: una pulsación copia texto/enlace/separador/@ exactamente; origen intacto, IDs/revisión/timestamps correctos |
| CP-02 | Lunes sin domingo/sábado: ofrece viernes con fecha; salta notas vacías; no toma una nota futura ni del otro espacio |
| CP-03 | Sin anterior: editor usable y ninguna mutación al abrir; errores de GET no se presentan como ausencia |
| CP-04 | Texto local, destino remoto no vacío, revisión obsoleta, doble click o fuente cambiada: cero sobrescrituras; negativos primero |
| CP-05 | Versiones manuales no se copian ni reemplazan; referencias conservan vínculo y límites del esquema |
| CP-06 | Cambiar fecha/espacio/logout mientras GET o POST están pendientes no filtra ni aplica texto en destino equivocado |
| CP-07 | Undo de copia y edición posterior; recarga recupera la copia guardada; red perdida no produce duplicado |
| CP-08 | Windows/Android: botón con fecha y espacio, usable por teclado/táctil y sin confundirse con portapapeles |

## Entrega y tareas

[T-066](../tasks/T-066-copy-previous-api.md): selección, transacción y API, después de T-065. [T-067](../tasks/T-067-copy-previous-client.md): sugerencia, coordinador, undo y recorrido `copy previous:` desktop/mobile con backend real. Tareas en sesiones/PR separados, draft solo por dependencia. Tras T-067, control de quince tareas de I5 y retorno a frontera para elegir otras propuestas. No se lanza FULL/STARTER sin la solicitud expresa del dueño; conservar evidencia dirigida y el pendiente del integrado según [TESTING](../TESTING.md#excepción-i5-del-2026-11-12).
