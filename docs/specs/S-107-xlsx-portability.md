---
id: S-107
status: approved
version: 1
milestone: M3
tasks: [T-040, T-041, T-042, T-043, T-044, T-045]
---
# S-107 · Exportar e importar la cuenta en `.xlsx`

## Iteración y objetivo de salida

I3 / M3 · Portabilidad. Sigue a la activación y las pruebas de M2-RC1, con [T-049](../tasks/T-049-voice-retest.md) MERGED. Precede al piloto en Render ([S-108](S-108-render-pilot.md)), según el orden acordado por el dueño el 2026-11-10.

El usuario autenticado descarga un `.xlsx` con todos los datos de su cuenta y lo importa en una cuenta **vacía** de la misma instancia o de otra, por ejemplo de su entorno local a Render. Tras la importación ve las mismas notas diarias con sus enlaces, separadores y referencias, la misma versión guardada de cada día, las mismas notas de voz y las mismas referencias.

Criterio de salida: el recorrido de ida y vuelta de [T-045](../tasks/T-045-xlsx-journey.md) pasa con API, DB, OIDC y navegador reales en 1280 y 375 px, con datos ficticios y dos identidades. Además el dueño prueba exportar e importar con sus datos locales en su propio entorno, sin que un agente lea el archivo. Frontera no necesita intervenir entre tareas: vuelve solo ante una decisión fuera de este contrato. Tras el PR único de S-107 MERGED, Junie continúa con [T-046](../tasks/T-046-render-image.md).

## Problema y usuario

El dueño quiere un respaldo legible de sus datos y una forma de llevarlos de una instancia a otra. Render Free borra la base a los 30 días ([DEPLOYMENT](../DEPLOYMENT.md#piloto-de-devnotes-en-render-free)), y la exportación sirve como respaldo y la importación para recrear la cuenta. PROJECT_CONTEXT dejaba la importación y la exportación fuera de I1; esta spec las incorpora como iteración posterior por decisión del dueño.

## Decisiones del dueño (2026-11-10)

| Tema | Decisión |
|---|---|
| Alcance | Todos los datos de la cuenta: notas diarias, la versión guardada de cada una, notas de voz y referencias. Las notas diarias enlazan referencias con `@`; sin ellas quedarían como «Referencia no disponible» |
| Conflictos | Se importa **solo en una cuenta vacía**, sin notas diarias, notas de voz ni referencias. Si hay cualquier dato, se rechaza sin escribir nada. No hay fusión ni reemplazo |
| Uso del archivo | Sirve de respaldo y migración, no de editor. Las columnas legibles son informativas. La importación usa solo `dato_json`, y editar el libro en Excel no está soportado |

## Historias y reglas

- Como dueño de una cuenta, quiero descargar mis datos en Excel para tener un respaldo que pueda abrir y leer.
- Como dueño de una cuenta nueva y vacía, quiero subir ese archivo para recuperar todo y seguir trabajando.
- Solo el usuario autenticado exporta o importa, y siempre **sobre su propia cuenta**. El propietario sale de la sesión, nunca del archivo ni del request. El archivo no contiene `owner_id`, email, nombre, `issuer` ni `subject`. Exportar no incluye datos de otra cuenta, aunque compartan la instancia.
- La importación es todo o nada. Primero valida el libro completo y después escribe todo en una sola transacción. Cualquier error deja la cuenta sin cambios.
- Los IDs del archivo no autorizan nada. La importación genera UUIDv7 nuevos para cada fila y reescribe los átomos `reference` cuyo ID original esté en la hoja `referencias`. Los átomos que apuntan a referencias ausentes del archivo conservan su ID y se ven como «Referencia no disponible», igual que en el origen. Así se evitan colisiones con otras cuentas de la misma instancia.
- Se conservan del archivo la fecha de cada nota, `createdAt`, `updatedAt` y `savedAt`. Las revisiones técnicas se reinician: la nota diaria y la de voz quedan en `revision = 1`, y la versión en `source_revision = 1`.
- El audio no existe en la base (S-105), por lo que no se exporta. Tampoco se exportan `app_user` ni la sesión.

## Formato `devnotes-xlsx` versión 1

Un libro OOXML `.xlsx` sin macros, fórmulas, vínculos externos ni objetos incrustados. Todas las celdas de datos son texto, salvo `parte` y `partes`, que son enteros. Las fechas e instantes se escriben como texto ISO, no como fechas de Excel, para que la zona horaria o el formato regional no los alteren. La fila 1 de cada hoja de datos es la cabecera exacta y los datos empiezan en la fila 2. Las hojas aparecen en este orden:

| Hoja | Contenido |
|---|---|
| `devnotes` | Pares clave/valor en A/B: `formato` = `devnotes-xlsx`, `version` = `1`, `exportado_utc` = instante ISO, conteos `referencias`, `diarias`, `versiones` y `voz`, y una fila `aviso` = «Respaldo de DevNotes. La importación usa solo la columna dato_json; no editar.» |
| `referencias` | `clave` (UUID original), `parte`, `partes`, `dato_json`, `titulo`, `descripcion`, `creada_utc`, `actualizada_utc` |
| `diarias` | `clave` (fecha `YYYY-MM-DD`), `parte`, `partes`, `dato_json`, `texto`, `creada_utc`, `actualizada_utc` |
| `versiones` | `clave` (fecha de la nota), `parte`, `partes`, `dato_json`, `texto`, `guardada_utc` |
| `voz` | `clave` (UUID original), `parte`, `partes`, `dato_json`, `texto`, `creada_utc`, `actualizada_utc` |

`dato_json` es el registro autoritativo, en JSON compacto con campos exactos:

```json
{"id":"01900000-0000-7000-8000-000000000101","title":"Runbook","description":"Pasos ficticios","createdAt":"2026-10-19T12:00:00.123456Z","updatedAt":"2026-10-19T12:00:00.123456Z"}
{"date":"2026-10-19","content":{"type":"doc","content":[{"type":"paragraph"}]},"createdAt":"2026-10-19T12:00:00Z","updatedAt":"2026-10-19T12:00:00Z"}
{"date":"2026-10-19","content":{"type":"doc","content":[{"type":"paragraph"}]},"savedAt":"2026-10-19T13:00:00Z"}
{"id":"01900000-0000-7000-8000-000000000201","text":"Idea ficticia\n","createdAt":"2026-11-01T09:00:00Z","updatedAt":"2026-11-01T09:05:00Z"}
```

Las líneas corresponden, en orden, a `referencias`, `diarias`, `versiones` y `voz`.

- **Límite de celda.** Excel admite como máximo 32 767 caracteres por celda, y una nota diaria (S-101) o de voz (S-105) puede superarlo. Cada `dato_json` se divide en fragmentos consecutivos de hasta 30 000 unidades UTF-16, sin partir un par sustituto, uno por fila: `parte` va de 1 a `partes` y la clave se repite. Las columnas legibles van solo en la parte 1.
- **Caracteres.** El JSON escapa los caracteres de control, así que `dato_json` siempre es XML válido. En las columnas legibles, los caracteres que XML 1.0 no admite se sustituyen por U+FFFD, y `texto` se trunca a 30 000 unidades con «…». `texto` de diarias y versiones es el texto plano visible del documento (S-106 §Copiado, sin resolver referencias). Las columnas legibles nunca se leen al importar.
- **Orden.** Referencias y voz por `createdAt` y `id`; diarias y versiones por fecha. Ordenar hace que el archivo sea determinista para un mismo estado.
- **Seguridad del contenido.** Las celdas de texto nunca se escriben como fórmula, ni siquiera si empiezan con `=`, `+`, `-` o `@`. Al leer, una celda de fórmula invalida el archivo.

## Validación al importar

Se valida todo antes de escribir, en este orden, y se detiene en el primer error:

1. **Transporte.** Multipart con exactamente una parte `file`. Partes duplicadas o desconocidas devuelven 400. El tamaño debe estar entre 1 y 10 485 760 bytes; si lo supera, 413. La firma ZIP es obligatoria, y la extensión o el MIME no bastan.
2. **ZIP.** Antes de parsear, recorrer las entradas contando los bytes reales descomprimidos. Límites: 64 entradas como máximo, 64 MiB descomprimidos en total y nombres sin `..` ni rutas absolutas. Se rechazan `vbaProject.bin`, `externalLinks/` y `embeddings/`.
3. **Libro.** `formato` y `version` exactos, las cinco hojas en el orden indicado sin hojas extra, cabeceras exactas, `parte`/`partes` enteros positivos (como número o como texto entero), fragmentos contiguos de 1 a `partes` y claves únicas. Como máximo 10 000 registros por colección.
4. **Registros.** JSON estricto, con campos exactos y sin desconocidos ni `null`. El documento diario se valida con las reglas vigentes de S-101/S-102/S-103/S-106, usando el mismo validador de dominio que el guardado. El texto de voz sigue S-105 y la referencia sigue S-003/S-106 (título recortado de 1 a 120 caracteres y descripción de hasta 2000). Las fechas son ISO estrictas dentro del rango de S-101. Los instantes son ISO UTC con `Z` y hasta 6 decimales, con `updatedAt ≥ createdAt`. Los UUID van en forma canónica minúscula. La clave debe coincidir con `id` o `date`, cada versión necesita una nota diaria de la misma fecha en el archivo, y cada fecha admite una sola versión.

Los errores son ProblemDetail privados con `no-store`, `code` y, si corresponde, `sheet` y `row`. **Nunca** devuelven el contenido de la celda. Códigos: `IMPORT_INVALID_FILE` (transporte o ZIP), `IMPORT_UNSUPPORTED_FORMAT` (formato o versión), `IMPORT_INVALID_RECORD` (hoja, cabecera, fragmento o registro), `IMPORT_TOO_LARGE` (413) e `IMPORT_ACCOUNT_NOT_EMPTY` (409). No registrar contenido en logs.

## Contrato backend

Feature nueva `portability/` bajo `com.example.devnotes`, con `application`, `xlsx` (codec) y `web`. La feature lee y escribe las tablas existentes a través de servicios o repositorios de cada feature, sin migraciones nuevas: los datos ya existen en V2–V5.

| Método/ruta | Entrada | Respuesta |
|---|---|---|
| GET `/api/v1/portability/export` | Ninguna | 200 `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition: attachment; filename="devnotes-YYYY-MM-DD.xlsx"` (fecha UTC de exportación), `Cache-Control: no-store` y `X-Content-Type-Options: nosniff`. Una cuenta vacía produce un libro válido sin filas de datos |
| POST `/api/v1/portability/import-preview` | Multipart `file` | 200 `{format:"devnotes-xlsx", version:1, exportedAt, counts:{references, dailyNotes, dailyVersions, voiceNotes}, accountEmpty}`. **Cero escrituras**. Errores de validación según la sección anterior |
| POST `/api/v1/portability/imports` | Multipart `file` | 201 `{counts:{…}}`. 409 `IMPORT_ACCOUNT_NOT_EMPTY` si la cuenta tiene datos, sin escrituras |

- **Lectura consistente.** La exportación lee en una transacción de solo lectura `REPEATABLE READ`, filtrando siempre por el dueño. Escribe en streaming hacia la respuesta, sin cargar el libro completo en memoria, por el límite de 512 MB de Render.
- **Importación.** Revalida el archivo, como hace `import-preview`, y abre una transacción. Primero bloquea la fila del usuario (`SELECT … FROM app_user WHERE id = :owner FOR UPDATE`) para serializar importaciones de la misma cuenta. Después comprueba que la cuenta esté vacía en `daily_note`, `voice_note` y `reference_item` (las versiones dependen de las notas). Inserta referencias, notas diarias, versiones y notas de voz con los IDs nuevos y los átomos reescritos. Si una escritura concurrente del mismo usuario genera un conflicto único, se revierte todo y se responde 409. No hay reintento automático.
- **Seguridad.** `SecurityConfig` agrega una allowlist exacta para estas tres rutas y métodos, antes del `denyAll` final. Los POST exigen CSRF; sin sesión, 401. Sin endpoint por ID: el dueño no se pasa como parámetro.
- **Proxies.** El `location /api/` genérico de nginx tiene el límite de body por defecto (1 MB). Agregar `location` exactas para los dos POST con `client_max_body_size 11m`, con los mismos encabezados reenviados que el `location` de transcripción y con buffering normal. Ajustar también el proxy de Vite. Spring ya admite 20 MB de multipart, y el controlador aplica el límite de 10 MiB.
- **Dependencia.** `org.dhatim:fastexcel` (escritura en streaming) y `org.dhatim:fastexcel-reader` (lectura StAX), ambas Apache-2.0. Fijar en el POM la última versión estable disponible al implementar y registrarla en DEPENDENCIES junto con las transitivas relevantes. Si la verificación de licencia, mantenimiento o XXE no es satisfactoria, hacer checkpoint a frontera antes de cambiar a Apache POI; no cambiar por inferencia.
- **OpenAPI.** Detrás del interruptor actual.

## Frontend

Ruta nueva `/data` con el enlace «Datos» en `AppShell`. La feature va en `client/src/features/portability/`.

- **Exportar.** Botón «Descargar Excel». Hace `fetch` con credenciales y crea un blob con el nombre del `Content-Disposition`, que se descarga mediante un `<a download>` temporal; después se revoca la URL. El botón se deshabilita mientras descarga. Un error muestra un mensaje con reintento, y nunca se anuncia éxito sin un blob completo.
- **Importar.** Un `input` de archivo con `accept=".xlsx"`. Al elegir un archivo se llama a `import-preview` y se muestran la fecha de exportación y los cuatro conteos.
  - Si `accountEmpty` es falso, se explica «Solo se puede importar en una cuenta sin datos» y no hay botón para confirmar.
  - Si es verdadero, el botón «Importar» abre una confirmación que repite los conteos. Al confirmar se envía el mismo `File` a `imports`. Si sale bien, se muestran los conteos con enlaces a Notas, Voz y Referencias, y se invalidan todas las queries privadas.
  - Los errores muestran el mensaje del código, con hoja y fila si existen, sin contenido.
- **Estados y sesión.** Hay estados distintos para carga, vacío, error, vista previa, importando y éxito. Un cambio de identidad aborta las peticiones y descarta respuestas tardías. No se guarda nada en el almacenamiento del navegador.
- **Accesibilidad.** Teclado y foco visibles, mensajes con `role=status`/`alert` y, a 375 px, acciones alcanzables sin overflow horizontal.

## Criterios de aceptación

| ID | Dado / cuando / entonces | Nivel | Tarea |
|---|---|---|---|
| XL-01 | Un reloj con fracción no nula hace que daily y versiones registren el instante truncado a microsegundos, no adelantado | unit | T-040 |
| XL-02 | El codec escribe y relee un libro con registros grandes (más de 30 000 unidades, pares sustitutos en el borde y caracteres de control) sin pérdida, y rechaza cabeceras, hojas, fragmentos, fórmulas, macros, ZIP bomba y límites +1 | unit | T-041 |
| XL-03 | La exportación de A contiene solo datos de A, con orden determinista, cabeceras HTTP exactas y libro válido para una cuenta vacía. Sin sesión, 401 | IT PostgreSQL/HTTP | T-042 |
| XL-04 | `import-preview` no escribe. Una importación válida en una cuenta vacía recrea todo con IDs nuevos y átomos reescritos. Una cuenta con datos, un archivo inválido o una importación concurrente dejan cero escrituras y el código esperado. CSRF, 401 y 413 | IT PostgreSQL/HTTP | T-043 |
| XL-05 | La UI exporta, previsualiza, rechaza una cuenta no vacía, confirma, importa y muestra errores por código, en 1280 y 375 px | componente | T-044 |
| XL-06 | En navegador real, A exporta e importa en B vacía. B ve la misma nota diaria (texto, enlace, separador y referencia resuelta a su copia), el historial, la voz y las referencias. Reimportar en B da 409, y A queda intacta | E2E | T-045 |

## Fuera de alcance

Fusión, reemplazo o importación parcial; editar en Excel; CSV u otros formatos; exportación programada o automática; audio; datos de identidad o de sesión; importación entre cuentas sin iniciar sesión en la cuenta destino; borrar una cuenta para dejarla vacía (si se necesita, es otra decisión del dueño).

## Tareas y dependencias

| Tarea | Resultado observable | Depende de | Salida para continuar |
|---|---|---|---|
| [T-040](../tasks/T-040-daily-timestamps.md) | Marcas de tiempo de daily y versiones truncadas a microsegundos, para exportar instantes fieles | T-049 MERGED | XL-01 verde en la rama |
| [T-041](../tasks/T-041-xlsx-codec.md) | Codec `devnotes-xlsx` v1 con límites y negativos | T-040 | XL-02 verde en la rama |
| [T-042](../tasks/T-042-xlsx-export-api.md) | GET de exportación privada | T-041 | XL-03 verde en la rama |
| [T-043](../tasks/T-043-xlsx-import-api.md) | Vista previa e importación atómica en una cuenta vacía, y proxies | T-042 | XL-04 verde en la rama |
| [T-044](../tasks/T-044-xlsx-client.md) | Pantalla Datos | T-043 | XL-05 verde en la rama |
| [T-045](../tasks/T-045-xlsx-journey.md) | Recorrido real de ida y vuelta, y prueba del dueño | T-044 | XL-06, FULL integrado, PR único MERGED y veredicto del dueño |

Todas son `draft` solo por su dependencia anterior: el contrato está completo.

**Una rama y un PR para toda la spec (decisión del dueño, 2026-11-10).** T-040…T-045 comparten la rama `codex/s-107-xlsx-portability`, creada desde `main` tras T-049 MERGED, y un único PR contra `main`. Es una excepción a «una tarea, un PR» y a «rama exacta de tarea», limitada a esta spec.

- Cada tarea se habilita cuando la anterior quedó cerrada en la rama: sus pruebas dirigidas y negativas en verde, `docs-check` OK, commit publicado y checkpoint en su archivo. No espera un MERGED intermedio. Sigue rigiendo una sesión nueva por tarea.
- T-040 es la tarea portadora: lleva el estado en vuelo y el número de PR mientras dura la rama, para cumplir el WIP 1 de `docs-check`. Las demás conservan `draft` y registran su avance y cierre en su archivo. Las seis se concilian `done` juntas tras el MERGED del PR.
- El PR se abre como draft con el primer avance y pasa a revisión al cerrar T-045. Hay una sola revisión independiente, sobre el HEAD final, y el control de avance de Junie cubre las seis tareas en ese momento. El máximo de dos rondas de revisión aplica al PR completo.
- El FULL integrado se ejecuta una vez, sobre el HEAD final de la rama, antes de pedir la revisión. Reemplaza los gates FULL por tarea y el que estaba previsto tras T-044 MERGED. [Regla](../TESTING.md#aplazamiento-de-full-hasta-t-044)
- Riesgo aceptado: un diff grande en una sola revisión. Si un hallazgo exige una decisión fuera de contrato, la rama se detiene y vuelve a frontera.

## Validación de planificación

Frontera: Claude Code (Claude Opus 5.5, `claude-opus-5-5`; esfuerzo no expuesto), 2026-11-10. Las decisiones del dueño sobre alcance, conflictos y uso del archivo se tomaron en esta sesión. La librería, los límites, el formato y las rutas son decisiones de frontera para ese comportamiento. `approved` significa que el contrato está alineado, no que esté implementado.
