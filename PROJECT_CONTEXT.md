# Contexto de DevNotes

Estado: contexto de producto acordado por el dueño en el formulario aportado el 2026-10-20. Confirmación en esta sesión: nombre visible **DevNotes**, slug `devnotes`, paquete **`com.example.devnotes`** (sustituye `org.demo.devnotes` del adjunto). Titular MIT: Matias Nicolas Acevedo.

## Problema, usuario y resultado

El dueño, desarrollador, escribe notas técnicas en Sublime Text. Necesita la rapidez y apariencia de un editor de código, asociar URLs a identificadores visibles como `1279`, insertar separadores visuales y consultar jornadas. Otras cuentas pueden utilizar la autenticación existente; cada cuenta mantiene datos privados sin colaboración.

Resultado del MVP: encontrar las notas de cada fecha y leer la copia guardada manualmente conservando texto, enlaces y separadores. Una nota por usuario y fecha; los días son documentos independientes.

## Flujo central y MVP

1. Iniciar sesión y abrir una fecha, por defecto hoy en el calendario local del navegador. Una fecha sin nota comienza vacía, sin escribir en DB hasta guardar.
2. Editar con Roboto Mono, tema oscuro y números de líneas lógicas. El trabajo se guarda durante la edición, con estado visible y reintento ante error.
3. Seleccionar `1279`, pulsar Ctrl+K y asociar `https://jira.ejemplo.test/browse/ABC-1279`: se sigue viendo `1279`. Poder editar, abrir y quitar el enlace.
4. En una línea propia escribir `--25`, `--50`, `--75` o `---` y Enter para obtener un separador de 25 %, 50 %, 75 % o 100 %, con número propio y posibilidad de eliminarlo.
5. Pulsar **Guardar versión de este día**. Guardar otra vez en esa fecha reemplaza su copia. Consultar fechas con versión en modo de solo lectura y volver al trabajo.

| Capacidad I1 | Incluido | Spec |
|---|---|---|
| Notas diarias privadas | Abrir/editar/guardar por fecha; navegar fechas existentes; tema oscuro y líneas lógicas | [S-101](docs/specs/S-101-daily-notes.md) |
| Enlaces | Crear/modificar/abrir/quitar mediante selección y Ctrl+K, manteniendo el texto | [S-102](docs/specs/S-102-text-links.md) |
| Separadores | Cuatro comandos exactos al Enter; cuatro anchos; una línea por separador; eliminación | [S-103](docs/specs/S-103-separators.md) |
| Versiones manuales | Una copia reemplazable por nota/fecha; listado e historial de solo lectura | [S-104](docs/specs/S-104-daily-versions.md) |

Objetivo de salida I1: recorrido completo de las cuatro capacidades, CA-01…06 demostrados con datos ficticios, tareas revisadas/mergeadas y evidencia propia. [ROADMAP](docs/ROADMAP.md) y [BACKLOG](docs/BACKLOG.md) fijan la ruta. Frontera vuelve al completar I1 o ante nueva intención/decisión fuera del contrato. Cada tarea y revisión usa sesión nueva; Junie controla el avance cada cinco tareas de producto.

Fuera del MVP: API/sincronización Jira, inferir URLs, importación/exportación, colaboración, carpetas o varios documentos por fecha, búsquedas avanzadas, restauración/comparación/múltiples revisiones de un día, app móvil nativa, notificaciones, servicios externos, personalización de fuente/tema y despliegue. No es un clon completo de Sublime o Notion.

## Datos, reglas y permisos

- **NotaDiaria:** UUID, propietario local, fecha calendario sin hora, contenido estructurado (texto/enlaces/separadores), última modificación UTC y revisión técnica contra escrituras concurrentes. Única por `(propietario, fecha)`.
- **VersionDiaria:** UUID, nota asociada, misma fecha de la nota, copia estructurada y timestamp UTC del guardado manual. Máximo una por nota. Editar el trabajo no cambia la copia; solo otra acción manual la reemplaza.
- Una línea lógica, incluso vacía, ocupa un número. Cada separador ocupa exactamente una línea; el ajuste visual no añade números. Numeración derivada en pantalla, nunca texto editable.
- Enlaces absolutos HTTP/HTTPS válidos; URL inválida rechazada sin cambiar contenido. Abrirlos no integra ni consulta Jira. Comandos de separador reconocidos solo como contenido completo de una línea al Enter.
- Solo el usuario autenticado propietario ve/crea/modifica sus notas y guarda/consulta sus versiones. Conocer IDs o URLs ajenas no habilita acceso. Sin roles extra; propietario derivado de sesión, nunca del request. Versiones sin edición directa.
- Guardado del trabajo independiente de la versión. UI guardando/guardado/error; falla nunca significa éxito. La navegación espera un guardado pendiente o mantiene la fecha actual ante fallo.
- Fecha explícita ISO `YYYY-MM-DD`, mostrada `dd/MM/yyyy`; no convertir por UTC ni limitar pasado/futuro. El cambio de día no mueve texto a otra nota; hoy se calcula al abrir la ruta sin fecha.

Las specs fijan límites técnicos, JSON, HTTP, concurrencia y estados. Son decisiones de frontera para implementar el comportamiento acordado, sin nuevas capacidades comerciales ni aceptación técnica anticipada.

## Aceptación

| ID | Ejemplo observable | Verificación prevista |
|---|---|---|
| CA-01 | Dos textos, separador y línea vacía reciben números consecutivos; wrap conserva un solo número | Editor/componente y navegador real |
| CA-02 | Ctrl+K enlaza `1279`, conserva texto y permite abrir/editar/quitar la URL ficticia | Transformación, componente y E2E |
| CA-03 | Los cuatro comandos exactos se convierten con Enter en su ancho; cada separador se puede borrar | Transformación y navegador real |
| CA-04 | Guardar versión del 19/10/2026, editar y reemplazar deja una sola copia; el 20/10 es independiente | PostgreSQL/HTTP y E2E |
| CA-05 | `javascript:alert(1)` rechazado sin cambios; recarga y nuevo login conservan trabajo y versión | Negativos backend/frontend y E2E real |
| CA-06 | Otra identidad no accede ni modifica notas/versiones, incluso con IDs o URL directa | PostgreSQL/HTTP y E2E con dos actores |

## Base técnica y operación

Conservar Java 21, Spring Boot 4.1.1, React/TypeScript estricto/Vite/MUI, PostgreSQL 18, Flyway, OIDC, sesión backend/CSRF y consultas por propietario. JSONB para documentos. Tiptap OSS con esquema mínimo y extensiones propias se concreta en S-101, sin cloud/IA/colaboración. Nuevas dependencias solo en su tarea mediante npm/lock e inventario. Nada de negocio implementado durante T-000.

Desarrollo/pruebas locales con fixtures ficticias y Docker propio. Catálogo Junie: [.junie/TOOLS.md](.junie/TOOLS.md); solo una comprobación en su superficie acredita capacidades. Ejecuciones de frontera se registran como frontera. Git, ejecutores, continuidad, revisión y merge: [AUTONOMY](docs/AUTONOMY.md), aprobada expresamente en esta sesión. Despliegue, Google real, pagos y datos reales requieren decisión futura específica.

## Procedencia y pendientes

Fuente: respuestas `project-context-devNotes.md` entregadas por el dueño; contexto de producto, no permisos operativos. Autonomía e identidad confirmadas aparte en el chat. No quedan decisiones comerciales bloqueantes para especificar I1. Adopción técnica, revisión, GitHub y capacidad efectiva Junie se acreditan en [T-000](docs/tasks/T-000-adoption.md), sin heredar resultados del starter.
