---
id: T-050
status: in_progress
priority: P1
size: M
executor: junie
role: implementer
milestone: M3
product_cycle: I3
spec: null
branch: codex/t-050-ui-adjustments
pr: null
depends_on: [T-044]
---
# T-050 · Interfaz compacta para usar DevNotes como app de escritorio

## Objetivo

El dueño usa DevNotes instalada desde Chrome como una ventana chica (un tercio o un cuarto de la pantalla, unos 830 px de ancho) y también en el teléfono, como si fuera un bloc de notas nativo. Hoy la barra superior, el título y los controles de fecha le quitan alto útil, la pantalla de inicio no le sirve y la de voz se rompe con notas largas. Esta tarea compacta la interfaz sin cambiar lo que la aplicación hace.

Tarea única pedida por el dueño el 2026-11-11, antepuesta a [T-046](T-046-render-image.md). Las decisiones de abajo las acordó el dueño ese día sobre capturas y una maqueta; no queda ninguna abierta. La siguiente tarea es T-046. Si un ajuste exige tocar `server/`, la API, permisos o datos, vuelve a frontera.

## Alcance y decisiones resueltas

Solo `client/` y `e2e/`. Sin dependencias nuevas: el proyecto no tiene paquete de iconos, así que los iconos son SVG propios con `SvgIcon` de MUI en `client/src/shared/ui/icons.tsx`. Se conservan MUI, el tema oscuro, Roboto Mono en el editor, el cliente HTTP único y todas las reglas de sesión, borradores y guardado. Punto de corte único: `sm` de MUI (600 px). «Angosto» es menos de 600 px y «ancho» es 600 px o más.

Color nuevo: ámbar `#ffb74d`, definido una sola vez en `client/src/app/theme.ts`.

### UI-01 · Sin pantalla de inicio

- La ruta índice `/` redirige con `replace` a `/notes`, también para un visitante: ve el aviso existente de `DailyNotesPage` y el botón «Ingresar».
- Se eliminan `HomePage.tsx`, `SystemInfoPanel.tsx` y sus pruebas. `useReadiness` se conserva para UI-03; `useSystemInfo` y su API se eliminan solo si quedan sin uso.
- El nombre «DevNotes» de la barra enlaza a `/notes`.

### UI-02 · Barra superior compacta (variante A)

- Una sola fila, sin salto de línea, en 375 px y en 1280 px. Alto máximo de 48 px.
- Pestañas en este orden: **Voz, Notas, Referencia, Historial, Datos**. Ya no existe «Inicio».
- Sin subrayado. Al pasar el puntero el texto pasa a ámbar. La pestaña activa lleva texto ámbar sobre una píldora `rgba(255, 183, 77, 0.16)` con radio 6 px y `aria-current="page"`. «Notas» está activa en `/notes` y `/notes/:date`; «Historial», en `/history` y `/history/:date`. El foco por teclado conserva un anillo visible.
- Ancho: solo texto. Angosto: solo icono (micrófono, nota, marcador, reloj de historial, base de datos), cada uno con `aria-label` igual al texto y `Tooltip`. En angosto se oculta el nombre «DevNotes».
- Se conserva `aria-label="Navegación principal"` y los `Link` de router, para que sigan funcionando las guardas de navegación de borradores.

### UI-03 · Estado del servidor en la barra

- A la derecha de las pestañas, un indicador con `role="status"` alimentado por `useReadiness` (ya consulta cada 5 s).
- Tres estados: punto verde y «Online» con nombre accesible «Servidor conectado»; punto rojo y «Offline» con nombre accesible «Servidor sin conexión»; punto gris y «Conectando» mientras no hay primera respuesta.
- En angosto se muestra solo el punto, con `Tooltip` y el mismo nombre accesible.

### UI-04 · Menú de usuario

- Con sesión, `SessionControls` muestra un botón redondo con icono de persona y `aria-label="Cuenta de {nombre}"`, en lugar del nombre y el botón «Cerrar sesión».
- Al pulsarlo abre un `Menu` con el nombre como primera línea no interactiva y la opción «Cerrar sesión», con las mismas condiciones de deshabilitado (`logoutPending || !csrfReady`) y el texto «Cerrando sesión…» mientras está en curso.
- Sin sesión, el botón «Ingresar» queda igual.

### UI-05 · Notas: una sola barra de herramientas

- El `h1` «Notas diarias» deja de verse pero se conserva visualmente oculto, por accesibilidad.
- Desaparece la fila de fecha de la página. `DailyEditor` gana dos ranuras, `toolbarStart` y `toolbarEnd`, y `DailyNotesPage` coloca ahí los controles. Orden de la barra, de izquierda a derecha:
  1. **Fecha**: botón con icono de calendario y la fecha activa en formato `DD/MM`, que abre el selector nativo con `showPicker()` sobre el `input type="date"` existente. El input queda visualmente oculto pero operable (no `display: none`) y conserva la etiqueta «Fecha».
  2. **Hoy**: botón «Hoy» en ancho; en angosto, icono con `aria-label="Ir a hoy"`.
  3. **Enlace**: el botón actual. En ancho dice «Enlace» o «Editar enlace»; en angosto, solo icono con el `aria-label` actual («Agregar enlace» o «Editar enlace»).
  4. Espacio flexible.
  5. **Estado de guardado**: en ancho, icono y texto («Guardando…», «Guardado», «Sin guardar»); en angosto, solo icono con nombre accesible. Región `aria-live="polite"`.
  6. **Copiar nota**: botón de icono con `aria-label="Copiar nota"`.
  7. **Guardar versión**: botón de icono de disquete en ámbar con `aria-label="Guardar versión"`. Reemplaza al botón ancho de abajo y conserva su lógica: mismas condiciones de deshabilitado, un `CircularProgress` mientras guarda y el mismo diálogo de confirmación.
- La barra es `position: sticky; top: 0`, así el disquete queda siempre visible al desplazarse.
- Los avisos largos no entran en la barra y se muestran en una fila propia justo debajo: error y conflicto de guardado, y éxito, conflicto, error y resultado desconocido de «Guardar versión». Sus textos no cambian.
- Se elimina el texto «Seleccioná texto y agregá un enlace (Ctrl+K).»; pasa a ser el `Tooltip` del botón de enlace. Se elimina «Arrastrá la esquina inferior derecha para cambiar la altura.» junto con el redimensionado manual (ver UI-06).
- La lista «Notas guardadas» queda como está, debajo del editor.

### UI-06 · Editor a todo el alto y con menos margen

- El área de escritura ocupa el alto libre de la ventana: la página es una columna flexible de `100dvh` y el editor crece (`flex: 1`), con un mínimo de 240 px. Se quita `resize: vertical`.
- El contenedor principal usa 8 px de margen lateral en angosto y 16 px en ancho.
- En angosto la columna de números de línea se angosta: `padding-left` del contenido de 56 px a 40 px y ancho del número de 32 px a 24 px. En ancho no cambia.

### UI-07 · Voz en dos mitades

- En ancho, dos columnas iguales con `grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)`: **izquierda, nueva nota; derecha, notas guardadas**. Ninguna columna se ensancha por su contenido y no hay desplazamiento horizontal; las dos crecen hacia abajo. En angosto se apilan, con la nueva nota primero.
- El `h1` «Notas de voz» se conserva visualmente oculto.
- En la columna izquierda, de arriba abajo: fila con **Grabar** (botón grande, alto mínimo 44 px) y «Nueva nota» al lado; el campo de texto; «Guardar»; el aviso de Groq.
- En la lista, el texto de cada nota ocupa una sola línea con puntos suspensivos (`text-overflow: ellipsis`) y el texto completo en `title`. La fecha no se corta.
- El aviso de Groq pasa a una línea de texto secundario, sin caja: «Al detener, el audio se envía a Groq. Ver política de Groq», donde «Ver política de Groq» es el mismo enlace de hoy. Sigue mostrándose antes de la primera grabación, con las mismas condiciones. Cambia la regla 2 de [S-105](../specs/S-105-voice-notes.md), actualizada a la versión 3 con esta decisión.

### UI-08 · Señales de que está grabando

Mientras el estado es de grabación, y solo entonces:

- El botón dice «Detener» y titila en rojo con una animación CSS de 1,2 s. Con `prefers-reduced-motion: reduce` no titila y queda en rojo fijo.
- Al lado corre el cronómetro `mm:ss` que ya expone `useVoiceRecorder`.
- Cinco barras muestran el **nivel real del micrófono**. Se calculan con un `AnalyserNode` conectado al mismo `MediaStream` de la captura (sin un segundo `getUserMedia`), leído con `requestAnimationFrame`. Son decorativas (`aria-hidden`).
- Si el nivel RMS queda por debajo de 0,01 durante 3 s seguidos, aparece el aviso «No se detecta sonido. Revisá el micrófono.» con `role="status"`. Desaparece en cuanto vuelve el sonido. No detiene ni altera la grabación.
- El medidor no cambia qué se graba ni qué se envía. El `AudioContext` se cierra al detener, cancelar, descartar y desmontar, igual que las pistas. La fábrica de `AudioContext` es inyectable, como las demás API del grabador, y si el navegador no la ofrece la grabación funciona sin barras ni aviso.

### UI-09 · Instalable como app

- `client/public/manifest.json` con `name` y `short_name` «DevNotes», `start_url` `/notes`, `scope` `/`, `display` `standalone`, `background_color` `#181a1b`, `theme_color` `#212324` y el icono `favicon.svg` (`sizes: "any"`, `type: "image/svg+xml"`).
- `client/index.html` enlaza el manifiesto y declara `<meta name="theme-color" content="#212324">`.
- Sin service worker ni modo sin conexión: fuera de alcance.
- nginx y Vite ya sirven los archivos de `public/`; no se toca `nginx.conf`. Si Chrome no ofrece instalar con el icono SVG, registrar el dato y devolver a frontera: generar iconos PNG es otra decisión.

### Fuera de alcance

Cambios de API, permisos, esquema o datos; rediseño de Referencia, Historial y Datos más allá de heredar la barra superior; atajos de teclado nuevos; modo claro; service worker.

## Leer antes

1. [client/AGENTS](../../client/AGENTS.md).
2. `client/src/app/AppShell.tsx`, `AppRoutes.tsx` y `theme.ts`.
3. `client/src/features/daily/DailyNotesPage.tsx`, `SaveDailyVersion.tsx`, `editor/DailyEditor.tsx` y `editor/dailyEditor.css`.
4. `client/src/features/voice/VoicePage.tsx`, `VoiceComposer.tsx`, `VoiceLibrary.tsx`, `recorder.ts` y `useVoiceRecorder.ts`.
5. [TESTING · Tiempos de E2E](../TESTING.md#tiempos-de-e2e---advertencia-critica) y [S-105](../specs/S-105-voice-notes.md), reglas 2 y de captura.

## Archivos y pasos

Además de los de «Leer antes»: `client/src/features/auth/SessionControls.tsx`, `client/src/features/system/` (bajas y un `ServerStatus.tsx` nuevo), `client/src/shared/ui/icons.tsx` (nuevo), `client/public/manifest.json` (nuevo), `client/index.html` y las pruebas de componente y E2E que hoy buscan los textos que cambian.

1. **Barra y rutas** (UI-01 a UI-04). Primero ajustar `AppRoutes.test.tsx` y las pruebas de sesión a la conducta nueva y verlas fallar; después implementar.
2. **Notas** (UI-05 y UI-06). Lo mismo con `DailyNotesPage.test.tsx` y `SaveDailyVersion.test.tsx`.
3. **Voz** (UI-07 y UI-08). El medidor de nivel va en `recorder.ts` y `useVoiceRecorder.ts`, con pruebas que usan un `AudioContext` simulado.
4. **Manifiesto** (UI-09) y **E2E**: actualizar selectores en las specs que usan `goto('/')`, «Inicio», «Servidor conectado», el encabezado visible, el botón «Cerrar sesión» o el botón ancho «Guardar versión». No se elimina ni se debilita ningún caso: `system.spec.ts` y `local-stack.spec.ts` comprueban el estado del servidor en el indicador de la barra.

## Aceptación y pruebas

Pruebas de componente porque el riesgo es de presentación e interacción; E2E solo para no romper los recorridos existentes. Todas las de componente se comprueban en 1280 px y en 375 px cuando el criterio distingue anchos.

| Criterio | Capa | Comando | Resultado |
|---|---|---|---|
| UI-01 a UI-04: `/` lleva a `/notes`; orden de pestañas; `aria-current` en la activa, también en `/notes/:date` y `/history/:date`; sin enlace «Inicio»; indicador en sus tres estados; menú con nombre y «Cerrar sesión» que cierra la sesión | Componente | Desde `client/`: `npm test -- --run src/app src/features/auth src/features/system` | Exit 0 |
| UI-05 y UI-06: todos los controles en la barra del editor con sus nombres accesibles; cambiar la fecha y «Hoy» navegan igual que antes; el disquete abre la confirmación y guarda la versión; avisos en la fila inferior; sin textos de ayuda | Componente | Desde `client/`: `npm test -- --run src/features/daily` | Exit 0 |
| UI-07 y UI-08: composición a la izquierda y lista a la derecha; nota larga en una línea con `title` completo; texto exacto del aviso de Groq; barras solo al grabar; «No se detecta sonido» tras 3 s de silencio y su retiro al volver el sonido; `AudioContext` cerrado al detener, cancelar y desmontar; grabación intacta sin `AudioContext`; un solo `getUserMedia` y un solo POST de transcripción por detención | Componente y unitario | Desde `client/`: `npm test -- --run src/features/voice` | Exit 0 |
| UI-09: `manifest.json` válido y enlazado | Unitario | Desde `client/`: `npm test -- --run src/app/manifest.test.ts` (prueba nueva que lee `public/manifest.json` e `index.html`) | Exit 0 |
| Gate de cliente | Cliente | Desde la raíz: `bash scripts/verify.sh --client` | Exit 0, cobertura sin bajar umbrales |
| Recorridos afectados, durante la iteración | E2E dirigido | Desde la raíz en Git Bash, un patrón por corrida, con el título del caso que se esté ajustando: `STARTER_E2E_PROJECT=starter-e2e-t050-iter bash scripts/e2e.sh --grep "CA-01:" --project desktop`. Repetir con `"voice:"`, `"portability:"` y los demás títulos tocados, y con `--project mobile` para los que cambian en angosto | Exit 0 en cada caso ajustado |
| Gate de cierre | FULL de aplicación | Desde la raíz en Git Bash: `COMPOSE_ENV_FILES=.env.example COMPOSE_PROJECT_NAME=starter-verify-t050 STARTER_E2E_PROJECT=starter-e2e-t050 STARTER_SERVER_TESTS=container bash scripts/verify.sh` | Exit 0, una sola vez sobre las fuentes finales |
| Aceptación del dueño | Manual | En `starter-dev-local-nginx`, con Chrome: instalar DevNotes como app, abrirla en una ventana de unos 830 px y en el modo móvil de 375 px | Veredicto del dueño con SHA: abre en Notas, todo entra en una fila, se ve que graba |

Antes del FULL, checkpoint con SHA, base, comando, recursos propios y cleanup. Si el dueño tiene su stack en el puerto 5175, pedirle que lo detenga: ver [BACKLOG](../BACKLOG.md#hallazgos-del-control-de-s-107).

## Checkpoint vigente

2026-11-11. Frontera en Claude Code de escritorio (Claude Fable 5.2, `claude-fable-5-2`, esfuerzo no expuesto), con Git Bash, Git, `gh`, Docker y Node. Contrato completo y `ready`: el dueño revisó la aplicación en su stack local, envió ocho capturas, eligió la variante A de la barra entre tres maquetas y confirmó las decisiones UI-01 a UI-09. Impacto previsto: solo UI del cliente, más un medidor de nivel local del micrófono que no cambia lo que se envía; sin cambios de API, permisos, esquema ni datos. Nada implementado todavía.

## Correcciones significativas

| Fecha / SHA | Problema y causa | Corrección | Prueba |
|---|---|---|---|

## Cierre y siguiente tarea

PR propio y revisión independiente. Tras MERGED, conciliar y tomar [T-046](T-046-render-image.md) si [T-045](T-045-xlsx-journey.md#prueba-del-dueño) ya tiene el veredicto del dueño; si no, STATUS queda esperando esa prueba.
