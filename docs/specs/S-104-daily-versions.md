---
id: S-104
status: approved
version: 2
milestone: M1
tasks: [T-010, T-011, T-012, T-013, T-014]
---
# S-104 · Copia manual por fecha y salida del MVP

## Iteración y objetivo de salida

I1 termina con CA-01…06 del contexto comprobados de punta a punta: trabajo por fecha, enlaces, separadores y copia manual independiente de solo lectura. T-010…014 siguen a T-009, cada una mergeada antes de iniciar la siguiente. Frontera vuelve tras T-014 mergeada y evidencia de todo el objetivo; no al terminar una tarea individual ni automáticamente a las cinco.

## Datos y reglas

Nueva V4__create_daily_version.sql, V1…V3 inmutables. `daily_version(id UUID PK, note_id UUID NOT NULL UNIQUE REFERENCES daily_note(id), content JSONB NOT NULL, source_revision BIGINT NOT NULL CHECK(source_revision>=1), saved_at TIMESTAMPTZ NOT NULL)`; sin cascada. La fecha/propietario derivan de la nota, no se duplican desde el cliente. UUIDv7 al crear, conserva id en reemplazos; Clock UTC micros. Proyección para API incluye date y sourceRevision.

Crear/reemplazar solo con acción explícita. POST transaccional toma fila de nota propia con lock, compara revisión esperada y copia contenido de esa misma fila; mismatch 409 sin alterar versión. Actualizar/insertar copia una sola fila (ON CONFLICT note_id o lock equivalente probado). Editar nota no altera copia. Dos guardados concurrentes no duplican fila ni mezclan revisiones; lecturas siempre filtran dueño mediante join/consulta, sin probar primero ID global. No endpoint por ID en I1; conocer ID no abre rutas. Mantener todo en feature daily para no cruzar repositorios de features.

## API

| Método/ruta | Entrada | Salida |
|---|---|---|
| POST /api/v1/daily-notes/{date}/version | {expectedRevision: entero >=1} exacto | 200 {id,date,content,sourceRevision,savedAt}, crea/reemplaza manualmente; sin body content/owner |
| GET /api/v1/daily-versions | page >=0 default0; size=20 fijo | 200 {content:[{date,savedAt,sourceRevision}],page,size,totalElements,totalPages}, solo propias date DESC |
| GET /api/v1/daily-versions/{date} | fecha estricta | 200 copia propia; 404 si no hay copia propia |

400 fecha/body/query inválidos, 401 sin sesión, 403 sin CSRF para POST, 404 nota/copia propia ausente, 409 revisión de trabajo distinta. Sin PUT/DELETE/PATCH de versiones ni POST genérico. GET copia no crea nada. SecurityConfig abre solo métodos/rutas exactos; IDs/vecinos continúan denegados, incluso autenticados. ProblemDetail sin contenido/atributos de otras cuentas. OpenAPI con esquemas sesión/CSRF y documentación apagada por defecto.

## Frontend

Historial en /history y /history/YYYY-MM-DD con listado paginado; fecha local presentada dd/MM/yyyy. Readonly reutiliza DailyEditor editable=false: texto/links/separadores/números iguales, sin Ctrl+K, comandos, botones de edición ni autosave. Botón Volver a mi nota lleva a /notes/{misma fecha}; home tiene ruta a notas y shell a Historial. Si se entra desde borrador dirty, la navegación pasa por el mismo flush que S-101. Acceso directo sin sesión muestra login sin peticiones privadas. 404 Sin versión guardada con volver; cargando/vacío/error/reintento/401/403 explícitos.

Guardar versión de este día se habilita cuando editor válido y usuario activo; al pulsar, bloquear otras acciones de guardado/navegación, hacer flush de **la última generación del trabajo** y POST con la revisión confirmada. Durante flush y POST bloquear edición para fijar snapshot; al terminar reabrir editor. No enviar el contenido desde UI como copia ni reutilizar una revisión anterior. Si el trabajo está vacío sin nota, la acción manual puede persistir el vacío con expectedRevision0 y luego guardar versión. No guardar versión automáticamente desde debounce/login/cambio de fecha. Si ya hay versión, confirmación accesible «Reemplazar la versión del dd/MM/yyyy» antes de hacer POST; cancelar no modifica la copia.

Éxito solo después de ACK POST; invalidar listas/detalle de la identidad iniciadora sin escribir respuesta tardía en otra sesión. 409 informa conflicto, conserva borrador y no reintenta; error/CSRF pide acción explícita. Guardar trabajo después no cambia copia. No restaurar ni editar historial.

Antes de decidir crear/reemplazar, consultar el detalle actual de la versión propia: 200 exige confirmación, 404 habilita crear, otros errores bloquean la acción con reintento explícito. No interpretar loading/error o cache ausente como «sin versión». Esto evita omitir la confirmación por un estado todavía desconocido; no promete arbitraje entre dos pestañas que confirmen al mismo tiempo. El lock y sourceRevision del backend siguen garantizando copia coherente y una sola fila. Una respuesta perdida del POST deja resultado desconocido: no anunciar fallo sin efecto ni éxito; permitir consultar historial antes de repetir la acción. La UI solo habilita mutaciones con sesión y CSRF listos.

## Aceptación y trazabilidad

| ID | Caso | CA | Archivo/capa | Tarea |
|---|---|---|---|---|
| V-01 | V4 desde vacío/V3; una fila por nota, copia independiente, carrera/lock y dueño | 04/06 | DailyVersionServiceIT.java | T-010 |
| V-02 | HTTP crear/reemplazar/listar/consultar, negativos de propietario/CSRF/body/rutas | 04/05/06 | DailyVersionApiIT.java | T-011 |
| V-03 | Historial readonly preserva JSON y no dispara mutaciones, cambio identidad limpia | 02/03/05/06 | DailyHistoryPage.test.tsx | T-012 |
| V-04 | Consulta previa/confirmación, flush antes de POST; cancelación/errores previos no alteran copia, POST sin ACK informa incertidumbre; vacío explícito y respuesta tardía | 04/05 | SaveDailyVersion.test.tsx | T-013 |
| V-05 | Notas 19/10 y 20/10 independientes; reemplazar mantiene una versión; editar trabajo no cambia copia | 04/05 | daily-versions.spec.ts, API/DB/OIDC reales | T-014 |
| V-06 | Texto/link/separadores/empty/wrap/recarga/nuevo login/dos identidades | 01…06 | daily-notes.spec.ts + daily-versions.spec.ts | T-014 |

## Ruta y salida

T-010 storage/servicio → T-011 API → T-012 lectura/historial → T-013 acción manual → T-014 recorrido navegador y evidencia I1. Cada tarea tiene comandos y criterios propios; draft solo por dependencia. No llamar producto validado al pasar suites parciales ni marcar done con PR abierto.

T-014 no es otra épica de implementación: consolida los flujos reales, corrige solo defectos ordinarios de esos contratos, mantiene todos los negativos del starter y recoge evidencia contra CA. Una decisión nueva o defecto que exija ampliar arquitectura vuelve a frontera. Regreso final entrega evidencia y pendientes futuros del contexto sin iniciar la siguiente iteración.

## Validación de planificación

Frontera/Codex, 2026-10-20, v1 alineada al contexto aceptado y AUTONOMY confirmada. Revisión independiente de estos contratos junto a T-000; aceptación técnica solo después de ejecutar y revisar las tareas. Google real/despliegue/pagos/datos reales siguen fuera.

2026-10-21, v2: explicita consulta previa, estado incierto tras POST sin ACK y límites comunes S-101 v2. No añade restauración, historial múltiple ni aceptación de runtime.
