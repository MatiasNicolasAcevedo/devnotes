# Storyboard · tráiler v2 de escritorio

Corte único 16:9, 1920×1080, 46 s, 120 BPM (un compás = 2 s). Sin locución. Material ficticio: `jira.ejemplo.test`, ticket `1279` y textos de ejemplo. Contrato en [T-095](../../docs/tasks/T-095-trailer-v2.md).

## Referencia de la v1

Se extrajo de `trailer/landscape/index.html` y `trailer/scripts/make-soundtrack.mjs` (30 s, sin versionar, sin modificar).

| Tiempo v1 | Bloque | Golpe musical | Qué conserva la v2 |
|---|---|---|---|
| 0–4 s | Gancho tipeado «Tus notas técnicas / merecen algo mejor.» | Pad en tensión, riser y redoble de palmas | Igual |
| 4–6 s | Logo y «Notas a velocidad de código.» | Impacto y entrada del drop | Igual |
| 6–18 s | Editor: escritura, Ctrl+K y separadores | Drop Am-F-C-G con platillos en 8, 12 y 16 s | Igual, con la barra real de la app |
| 18–22 s | Voz: grabar, transcribir y copiar | Breakdown, riser y palmas | Igual |
| 22–26 s | Ráfaga de cuatro tarjetas | Compases F-G con platillos e impactos por segundo | Pasa a 38–42 s con otras tarjetas |
| 26–30 s | Cierre con URL y «Pruébalo ahora» | Impactos en 26 y 28 s y acorde final | Pasa a 42–46 s con la URL vigente |

## Montaje v2

| Tiempo | Gesto visible | Función demostrada | Rótulo | Evidencia en el producto |
|---|---|---|---|---|
| 0–4 s | Tipeo en terminal y glitch | Gancho de la v1 | Tus notas técnicas merecen algo mejor. | Identidad v1 |
| 4–6 s | Ícono, anillo y palabra DevNotes | Marca | Notas a velocidad de código. | Ícono de `client/public/favicon.svg` |
| 6–10 s | Se escriben tres líneas. «Guardando…» pasa a «✓ Guardado» | Diario con tema oscuro, Roboto Mono, líneas numeradas y autoguardado | Escribe como en tu editor. | Captura local de Notas. Barra real: espacio «Trabajo», Voz, Notas, Referencias, Imagen, Historial y «✦ IA» |
| 10–14 s | Ctrl+K sobre `1279` abre «Agregar enlace» con «1279» debajo, se carga la URL y queda subrayado | Enlace sin cambiar el texto | Enlaces sin ensuciar el texto. | Captura local con «Editar enlace» y `1279` enlazado. `e2e/tests/daily-notes.spec.ts` |
| 14–18 s | `--50` y `---` con Enter se vuelven separadores | Separadores de 50 % y 100 % | Ordena tu día con un Enter. | Captura local con el separador de la línea 4 |
| 18–22 s | Micrófono, onda, transcripción y Copiar → Copiado | Notas por voz | Habla. DevNotes escribe. | `e2e/tests/voice.spec.ts`. En el stack local la transcripción está deshabilitada sin clave |
| 22–26 s | Ctrl+V pega una captura. Extraer texto barre la imagen y aparece el texto. Copiar texto → «Texto copiado» debajo de los botones | Imagen a texto | Pega una captura. Copia el texto. | Captura local de «Imagen a texto»: «Pegá tu imagen acá», Pegar, Elegir imagen, Extraer texto, Copiar texto y Guardar. `e2e/tests/ocr.spec.ts` |
| 26–30 s | En Libres se escribe un Título 1, dos ítems de lista y un bloque de código. Herramientas → Abrir al lado abre la versión del día a la derecha | Libres con títulos, listas y código. Consulta al lado | Títulos, listas y código. Consulta al lado. | Capturas locales del menú Formato (Título 1–3, Negrita), del menú Herramientas (Bloque de código, Abrir al lado) y del panel «Versión del 23/11/2026». `e2e/tests/free-notes.spec.ts`, `e2e/tests/side-reading.spec.ts` |
| 30–34 s | Se selecciona una línea y aparece «✦ Consultar con IA». Pasa a la pantalla IA con «Fragmento a compartir», Mensaje y «✦ Enviar». Llega la respuesta y Copiar texto → Copiado | IA desde las notas con destino elegido | Pregunta sin salir de tus notas. Chips GroqCloud, Workers AI y Gemini | [T-094](../../docs/tasks/T-094-ai-workspace.md) MERGED con E2E `e2e/tests/ai-workspace.spec.ts` y piloto real de cinco destinos. Rótulos de `AiPage.tsx`, `ConsultAiButton.tsx` y `AiOptions.java` («GroqCloud · GPT OSS 20B»). En el stack local `/api/ai/options` responde 403 `ai-forbidden` |
| 34–36 s | La misma nota pasa de 960 a 440 px. Las pestañas superiores desaparecen y entra la barra inferior de cinco destinos | Diseño adaptable | Achica la ventana. | Capturas locales a 1280, 960, 780, 700, 430 y 390 px. Por debajo de 768 px aparece la barra inferior Notas, Voz, Referencias, Imagen e Historial, sin desborde horizontal |
| 36–38 s | La ventana se convierte en teléfono | Uso en móvil como función | También en tu móvil. Chips Ventana angosta, Barra inferior y Táctil | `AppShell.tsx`: corte en 768 px, objetivos de 48 px y márgenes seguros. Proyecto E2E móvil. La prueba en Android físico (SP-06) sigue pendiente y no se nombra Android |
| 38–42 s | Ráfaga de cuatro tarjetas | Espacios, versiones, respaldo e instalación | Trabajo y Personal · Versiones por día · Respaldo en .xlsx · Instalable como app | Selector Trabajo/Personal, «Guardar versión», pantalla Datos y `client/public/manifest.json` con `display: standalone` |
| 42–46 s | Logo, lema, URL y llamado | Cierre | Tus notas. Tu ritmo. devnotes-v2dx.onrender.com · Pruébalo ahora | Readiness HTTP 200 en `devnotes-v2dx.onrender.com` el 2026-11-23. El host de la v1, `devnotes-pilot.onrender.com`, respondió 404 |

## Cambios de afirmaciones respecto de la v1

| v1 | v2 | Motivo |
|---|---|---|
| Marca «DevNotes» dentro de la barra del editor | Selector «Trabajo ▾» y «✦ IA ▾» | Es la barra actual del producto |
| Primera línea «deploy piloto render» | «deploy del lunes» | Evita nombrar el piloto anterior |
| Tarjeta «100% privado» | «Trabajo y Personal» | Voz, Imagen e IA envían contenido a proveedores externos cuando el usuario lo decide |
| `devnotes-pilot.onrender.com` | `devnotes-v2dx.onrender.com` | URL vigente; la anterior responde 404 |

## Banda sonora

Los mismos instrumentos, la misma armonía y la misma semilla que la v1. De 0 a 22 s el arreglo es idéntico. Después: compases Am-F-C-G-Am-F para Imagen, Libres e IA con platillos en 22, 26 y 30 s. Siguen un breakdown C-G para el tramo adaptable con riser hacia 38 s, la ráfaga F-G y el final en Am con impactos en 42 y 44 s. El fundido final dura 0,9 s. Los efectos (tipeo, pops, whooshes y dings) caen sobre cada gesto del montaje.
