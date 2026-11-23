---
id: S-109
status: draft
version: 1
milestone: M5
tasks: [T-057, T-058, T-059, T-060, T-061, T-062, T-063, T-064, T-065]
---

# S-109 · Trabajo y Personal dentro de una cuenta

## Iteración y objetivo de salida

I5, alcance solicitado el 2026-11-12. El dueño cambia entre **Trabajo** y **Personal** sin cambiar de cuenta; cada espacio contiene sus propias notas diarias, versiones, referencias y transcripciones. En Windows el selector ocupa el lugar del nombre DevNotes repetido de la barra interna. En Android el contexto y la navegación son legibles y operables con el pulgar.

El alcance de producto está confirmado; este contrato técnico queda para revisión independiente en el PR de [T-052](../tasks/T-052-scope-expansion-plan.md). No acredita implementación ni aceptación visual. Conserva S-101…S-107 salvo las modificaciones explícitas de este documento. Retorno a frontera al completar I5/S-110, o ante decisión fuera de contrato. La comprobación externa de S-111 puede seguir pendiente sin impedir los espacios.

Incluye dos espacios fijos, migración de datos existentes a Trabajo, aislamiento en API/cache, portabilidad v2 y navegación. Excluye categorías, carpetas, etiquetas, notas libres, mover contenido entre espacios, colaboración, roles de negocio nuevos, offline, IA, cambios de editor y las otras propuestas del catálogo. Sigue habiendo una nota diaria por espacio y fecha y una versión manual reemplazable por nota.

## Decisiones de experiencia

1. Nombres exactos **Trabajo** (`work`) y **Personal** (`personal`). Sin renombrar/crear/borrar espacios. No se crean registros de notas al elegir un espacio vacío.
2. Primera entrada de una cuenta: Trabajo. Una ruta con `space` válido prevalece sobre la preferencia. Cada dispositivo conserva su último espacio por cuenta; no cambia las otras pestañas ni el teléfono al usar Windows.
3. Nuevos enlaces internos incluyen `?space=work` o `?space=personal`; `date` continúa ISO, con la semántica local de S-101. Mismo día en ambos espacios = documentos independientes. Al cambiar en Notas/Historial se conserva la fecha; en Referencias se limpia consulta/página/selección; en Voz se abre el listado del destino sin seleccionar un ID del origen.
4. Para URL sin espacio, resolver preferencia después de conocer la sesión y canonicalizar con replace. Valor desconocido o parámetro repetido = pantalla «Espacio no válido» y acciones explícitas para elegir; no cargar/escribir silenciosamente en Trabajo. Visitante ve login y ninguna preferencia de otra cuenta.
5. Preferencia local permitida **solo** como enum: clave `devnotes:last-space:<UUID local de la cuenta>`, valor `work|personal`. No texto, correo, tokens, audio, cachés ni fechas de notas. Guardar después de completar la transición; storage denegado usa memoria y sigue funcionando. Al cerrar sesión/expirar, borrar la clave de esa identidad y sus estados privados. No reaccionar al evento storage de otra pestaña. Esto es una preferencia de interfaz, no habilita persistencia offline.
6. El selector siempre muestra texto e ícono, más color secundario. Nunca usar solo color para señalar el espacio. «Trabajo» + maletín, «Personal» + persona/casa. No confundir con el punto de conexión.
7. Datos sigue siendo de toda la cuenta: título «Datos de la cuenta», texto «Incluye Trabajo y Personal». Exportar/importar no cambia el espacio activo. No presentar un respaldo global como si correspondiese solo al espacio visible.

### Cambio seguro de espacio

Usar un único coordinador de navegación que también cubra enlaces, selector, Atrás/Adelante y rutas directas dentro de la SPA; no duplicar guardias con decisiones contradictorias.

| Estado del origen | Conducta antes del cambio |
|---|---|
| Nota diaria confirmada | Cancelar lecturas del origen y cambiar |
| Diario dirty/guardando | Hacer flush; conservar selector/ruta/editor en origen hasta ACK. Error/conflicto mantiene borrador y espacio, con reintento/copia existentes |
| Versión guardándose | Esperar su resultado; selector bloqueado con explicación, sin otro POST |
| Voz con texto sin guardar | Diálogo «Guardar y cambiar», «Descartar y cambiar», «Seguir aquí». Fallo/409 al guardar mantiene origen |
| Grabación/audio pendiente | Detener captura; explicar que el audio pendiente se perderá si descarta. No transcribir, guardar ni enviar a Groq por cambiar espacio. Permitir quedarse y transcribir explícitamente |
| Transcripción en vuelo | Cancelar/invalidar generación según S-105; no aplicar respuesta en destino. Conservar el estado que permita resolver la guardia en origen |
| Importación en vuelo | Impedir otra importación/transición que desmonte su resultado hasta final; explicar el motivo |
| Sesión terminada | Aplicar limpieza de identidad existente; ninguna respuesta tardía restaura datos |

El contexto de cada operación se captura al iniciarla: `(owner, space, date/id, generation)`. No leer un selector global mutable para construir una respuesta o enviar un guardado ya en cola. Al cambiar, remontar coordinadores diarios/voz por `owner+space`; query keys privadas incluyen ambos. Las queries `auth` y la capacidad global de voz no se mezclan con contenido. Rechazar resultados tardíos aunque la petición no pueda cancelarse.

## Presentación en Windows y Android

Referencias del dueño: dos capturas Windows (ventana compacta y ancha) y una Android aportadas el 2026-11-12. No deducir viewport CSS de los píxeles de la captura. Mantener fondo y editor actuales, sin título grande ni tarjetas de portada.

**Ancho desde 768 px:** barra de 56 px con selector a la izquierda en lugar del enlace DevNotes; después Voz, Notas, Referencias e Historial, y estado/cuenta a la derecha. Datos pasa al menú de cuenta con el nombre «Datos de la cuenta». Ajustar gaps en 768–899; sin scroll horizontal ni texto cortado. La barra nativa instalada mantiene nombre/icono DevNotes y no se altera el manifiesto.

```text
[maletín Trabajo v]   Voz  Notas  Referencias  Historial       [Online] [Cuenta]
[12/11] [Hoy] [Enlace]                              [Guardado] [Copiar] [Versión]
```

**Menos de 768 px:** cabecera de 56 px con selector, estado y cuenta; navegación inferior de cuatro destinos con ícono y etiqueta visible. Notas, Voz, Referencias, Historial. Datos queda en cuenta en todos los tamaños. El orden inferior se fija así por frecuencia y no cambia entre espacios. Barra inferior con espacio seguro del sistema; ninguna parte tapa el editor o sus avisos.

```text
[maletín Trabajo v]                            [Conexión] [Cuenta]
[12/11] [Hoy] [Enlace]                  [Guardado] [Copiar] [Versión]
                  editor y mensajes
[Notas]             [Voz]           [Referencias]        [Historial]
```

Tokens: superficie `#212324`, fondo `#181a1b`, texto `#e1e3e6`; Trabajo `#86efac`, Personal `#c4b5fd` sobre superficie oscura. Usar acento en borde/ícono/etiqueta con fondo tenue, sin teñir toda la página. Conservar ámbar actual de acciones/editor; comprobar contraste real de cada combinación, texto >=4,5:1 y foco/control >=3:1. Selector 44 px mínimo de área interactiva, texto 16 px, menú con filas >=48 px y selección con check. Los destinos móviles tienen área >=48 px, etiquetas >=12 px. Foco visible de 2 px, Escape cierra y devuelve foco, Enter/Espacio abren; flechas recorren opciones del menú accesible de MUI. Sin nueva dependencia.

La altura del editor responde a `100dvh` y al teclado de Android; el cursor y los botones de confirmación siguen visibles. No forzar autofocus en cada cambio de espacio. En móvil, al editar con teclado visible, priorizar el área de escritura y evitar barras superpuestas; no ocultar acciones por una detección de navegador. Verificar con teclado real del dueño además de emulación. Respetar zoom 200 %, nombres accesibles, lector de pantalla y reduced-motion; no animar el contenido entre espacios.

La densidad alternativa propuesta para Diario y Libres en ventanas angostas con puntero fino se especifica en [S-117](S-117-compact-writing-header.md). Los mínimos táctiles de este contrato siguen vigentes.

Fuentes de diseño consultadas 2026-11-12: [NN/g, etiquetas en íconos](https://www.nngroup.com/articles/icon-usability/), [WCAG 2.2, tamaño de objetivo mínimo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). Las áreas de 44/48 px son una decisión de comodidad de esta UI, no una cita del mínimo AA de 24 px.

## Datos y migración

Dos valores enum, sin tabla de membresías ni ACL extra. La privacidad entre cuentas sigue dependiendo de `owner_id`; el espacio es además un filtro obligatorio de negocio en el servidor.

La misma cuenta puede acceder a ambos espacios al elegirlos explícitamente. La separación no añade contraseña, cifrado adicional ni una segunda identidad; evita mezclar contenido por contexto sin cambiar quién es su propietario.

- Nueva migración después de S-111: `V7__add_private_spaces.sql` si V6 sigue ocupado solo por la ventana de actividad. Comprobar secuencia antes de implementar; si main añadió otra migración, usar el siguiente número sin editar las aplicadas y registrar la adaptación.
- Añadir `space VARCHAR(8) NOT NULL DEFAULT 'work'` a `daily_note`, `reference_item`, `voice_note`, con CHECK exacto `IN ('work','personal')`. Mapear con enum Java y Zod/TS estrictos. El default existe para migrar/compatibilidad; código nuevo siempre escribe el espacio explícito.
- Sustituir unicidad diaria por `(owner_id, space, note_date)`. Índices de listados por `(owner_id, space, fecha/created_at DESC, id DESC)` según el orden existente. No reiniciar revisiones ni timestamps ni regenerar IDs.
- `daily_version` hereda espacio y propietario mediante su nota: no duplicar columna. Toda consulta por fecha/listado debe filtrar el join por dueño+espacio; sigue UNIQUE(note_id).
- Todas las filas existentes pasan a Trabajo. Personal inicia vacío. Sin lectura ni reclasificación automática de contenidos reales.
- Probar migración desde esquema anterior con fixtures en PostgreSQL 18: iguales cantidades, IDs, contenido, relaciones, timestamps y revisiones; después dos notas de igual fecha en dos espacios y rechazo de duplicado dentro del mismo.

## Contrato HTTP y compatibilidad

Conservar rutas `/api/v1` y DTO actuales de notas/referencias/voz. Añadir query param opcional `space=work|personal` a **todos** sus métodos de colección y detalle, incluidos POST/PUT/DELETE y versiones. Ausente = Trabajo para clientes previos; valor vacío, inválido, con mayúsculas o repetido = 400, sin mutación ni eco del valor. El frontend nuevo siempre lo envía. Propietario solo desde sesión, jamás desde request. Respuestas privadas siguen no-store y mutaciones CSRF.

| Recurso | Aplicación del espacio |
|---|---|
| `/daily-notes`, `/daily-notes/{date}` | Lista, abrir, crear y CAS por owner+space+date |
| `/daily-notes/{date}/version`, `/daily-versions[/{date}]` | Guardar/listar/abrir a través de la nota de ese owner+space |
| `/reference-items[/{id}]` | Crear con contexto; búsqueda, conteo, detalle, actualización y borrado filtrados por owner+space |
| `/voice-notes[/{id}]` | Igual filtrado en GET de colección/detalle y CRUD POST/PUT/DELETE; no añadir PATCH |
| `/voice/capabilities`, `/voice/transcriptions` | Capacidad y operación sin persistencia conservan API; resultado cliente atado al contexto de inicio. El CRUD posterior lleva space |
| `/portability/*` | Global a la cuenta, sin filtro space ni respaldo parcial |

Un ID válido de otro espacio (incluso de la misma cuenta) recibe el mismo 404 que un inexistente/ajeno para lectura, edición y borrado. Listados/conteos/búsquedas filtran antes de paginar. No existe `all` ni mezcla implícita. Una referencia `@` solo se resuelve en el espacio de la nota; un ID ausente/ajeno/de otro espacio se representa como «Referencia no disponible» sin revelar el motivo. Se conserva la regla S-106 de aceptar átomos estructuralmente válidos aunque su destino no exista; nunca resolverlos globalmente. Las versiones siguen mostrando el contenido vigente de las referencias de su espacio, como S-106.

Las queries, repositorios y proyecciones nunca hacen lookup global seguido de filtrado solo en UI. Las pruebas con dos identidades y dos espacios deben cubrir también tamaños/conteos, 404 indistinguible, 401/403/CSRF, omisión compatible de space y callbacks tardíos.

## Portabilidad `.xlsx` v2

S-107 v1 ya permite migrar una cuenta; I5 mantiene exportación integral e importación solo en cuenta vacía **en ambos espacios**. Una cuenta con datos solo en Personal no está vacía. La comprobación cubre las cuatro colecciones y se conserva la atomicidad/concurrencia existente; crear una nota en cualquier espacio durante la importación no puede terminar en mezcla parcial.

Formato `devnotes-xlsx`, `version = 2`. Conservar hojas, nombres, orden, fragmentación, límites y columnas v1; añadir al final de las cuatro hojas de datos una columna legible `espacio`, y en cada `dato_json` un campo obligatorio `space` con los dos valores. La columna legible es informativa, el JSON es autoridad. La clave de diarias/versiones pasa a `work:YYYY-MM-DD` o `personal:YYYY-MM-DD`; claves UUID de voz/referencias siguen iguales. En filas fragmentadas el espacio visible va solo en la parte 1, como el resto de columnas legibles. Duplicados diarios/versiones se detectan por espacio+fecha.

Versiones v1 se leen con su esquema exacto previo y se importan a Trabajo; no exigirles campo space. Versiones v2 lo exigen, sin default. Versión desconocida o mezcla de esquemas = rechazo seguro, sin escritura. Exportación nueva siempre v2; el importador viejo no podrá leer v2 y la UI lo explica en Datos. Conservar fixture v1 inmutable y pruebas de v1->modelo->v2->modelo.

Regenerar IDs y resolver referencias dentro de su espacio: el importador reescribe un átomo solo si su referencia está incluida en el archivo **y** pertenece al espacio de la nota o versión. Decisión del dueño del 2026-11-13 (opción c, revisión R1 de PR64): un átomo que apunta a una referencia incluida pero de otro espacio se acepta y conserva su UUID original sin reescribir, igual que un átomo a una referencia ausente (semántica «no disponible» de S-107). La API ya guarda esos átomos por la regla S-106, y la app los muestra como «Referencia no disponible», así que el respaldo exportado se restaura sin pérdida ni rechazo y el átomo sigue sin resolverse tras importar. No se neutralizan al exportar ni se rechazan al guardar. Asociar versión a nota por espacio+fecha. No perder el segundo día de igual fecha ni mover datos al espacio activo de quien importa. Vista previa conserva `format,version,exportedAt,counts,accountEmpty` y añade `countsBySpace: {work: {references,dailyNotes,dailyVersions,voiceNotes}, personal: {references,dailyNotes,dailyVersions,voiceNotes}}`. `version` corresponde al libro leído (1 o 2), no a una constante del controller; los cuatro nombres de contadores ya existen en S-107. Respuesta 201 de importación conserva `counts` y añade el mismo `countsBySpace`. Para v1 los conteos de Personal son cero. Probar sumas=total e indicar v1=>Trabajo antes de confirmar.

No aumentar los límites de filas/tamaño para duplicarlos por espacio: siguen siendo por cuenta y por archivo. Datos incluye advertencia de compatibilidad y muestra ambas columnas de conteos; ningún contenido real en logs.

## Despliegue y compatibilidad por etapas

Los PR internos pueden integrarse secuencialmente, pero no habilitar Personal al usuario antes de tener API completa, respaldo v2 y cliente compatible. No desplegar migraciones/etapas intermedias con datos reales en esta serie por iniciativa del agente. Antes del deploy autorizado, exportación v1 del dueño y ensayo local de restauración con fixtures; el agente no lee el respaldo real. La vuelta a un binario anterior tras crear datos personales no se considera rollback seguro: cliente viejo vería solo Trabajo y su exportador desconocería space. Ante fallo, detener escrituras y decidir recuperación con el dueño, sin DOWN destructivo de Flyway.

## Aceptación

| ID | Resultado observable y negativos obligatorios |
|---|---|
| SP-01 | Mismo usuario y fecha con textos distintos en Trabajo/Personal; recarga preserva ambos; abrir vacío no crea fila |
| SP-02 | Migración conserva todos los datos en Trabajo; versión/ref/voz intactos, Personal vacío |
| SP-03 | Referencias y voz aisladas en lista, detalle, búsqueda, edición, borrado y conteos; otra cuenta no accede por IDs/URLs |
| SP-04 | Versión manual de un espacio nunca reemplaza/lee la del otro; `@` no revela destinos fuera del espacio |
| SP-05 | Flush diario o guardia de voz antes del cambio; fallo/409/cancel mantiene origen y borrador; respuesta tardía no aparece en destino |
| SP-06 | Selector sustituye DevNotes interno; texto/ícono/color legibles; navegación sin scroll a 360/375/390/768/1280 CSS px; teclado/foco/200 % y Android real |
| SP-07 | Rutas, Atrás/Adelante, nueva pestaña y preferencia funcionan; inválidos no escriben; logout borra contexto privado |
| SP-08 | Round trip v2 con igual fecha en ambos espacios; v1 entra solo en Trabajo; cuenta con Personal no vacía rechaza importación |
| SP-09 | Carrera de importación contra escritura en ambos espacios conserva atomicidad; errores no producen éxito ni pérdida de datos |
| SP-10 | Cliente anterior sin space usa Trabajo; frontend nuevo envía space en cada operación persistente y key privada |

Pruebas dirigidas por tarea; dos identidades y fixtures ficticias. E2E `spaces:` en desktop y mobile. FULL/STARTER diferidos hasta solicitud expresa según [TESTING](../TESTING.md#excepción-i5-del-2026-11-12).

## Tareas y dependencias

| Orden | Tarea | Resultado |
|---|---|---|
| 1 | [T-057](../tasks/T-057-space-storage.md) | Migración y enum, compatibilidad de datos |
| 2 | [T-058](../tasks/T-058-daily-spaces.md) | Diario/versiones por espacio |
| 3 | [T-059](../tasks/T-059-reference-spaces.md) | Referencias y búsqueda por espacio |
| 4 | [T-060](../tasks/T-060-voice-spaces.md) | CRUD de voz por espacio |
| 5 | [T-061](../tasks/T-061-xlsx-spaces-codec.md) | Lectura v1/v2 y escritura v2 |
| 6 | [T-062](../tasks/T-062-xlsx-spaces-api.md) | Import/export atómico de ambos espacios |
| 7 | [T-063](../tasks/T-063-space-client-context.md) | Transporte/cache/contexto y guardias de navegación |
| 8 | [T-064](../tasks/T-064-space-navigation.md) | Selector, navegación responsiva y Datos |
| 9 | [T-065](../tasks/T-065-spaces-journey.md) | Recorrido integrado dirigido y entrega verificable |

T-057 espera el cierre local de T-056 (S-111). T-065 habilita T-066/S-110. Todos draft solo por dependencias. Una rama y PR por tarea; no continuar implementación en la sesión de cierre de la anterior. Controles de avance de I5 tras T-057 y T-062, sin ejecutar FULL ni volver a planificar rutinariamente.
